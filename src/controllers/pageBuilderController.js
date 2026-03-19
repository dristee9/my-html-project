const Campaign = require('../models/Campaign');
const CampaignVersion = require('../models/CampaignVersion');

// Get page builder interface for creating new campaign
exports.getPageBuilder = async (req, res) => {
    try {
        res.render('pages/page-builder', {
            title: 'Create Campaign - Page Builder',
            user: req.user,
            campaign: null,
            fullBleed: true,
            templates: await exports.getTemplates()
        });
    } catch (error) {
        console.error('Error loading page builder:', error);
        res.status(500).render('pages/error', { 
            error: 'Failed to load page builder',
            user: req.user || null
        });
    }
};

// Get page builder for editing existing campaign
exports.editPageBuilder = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('creator', 'username university')
            .lean();

        if (!campaign) {
            return res.status(404).render('pages/404');
        }

        // Check if user owns this campaign
        if (campaign.creator._id.toString() !== req.user._id.toString()) {
            return res.status(403).render('pages/error', { 
                error: 'You can only edit your own campaigns',
                user: req.user || null
            });
        }

        res.render('pages/page-builder', {
            title: `Edit ${campaign.title} - Page Builder`,
            user: req.user,
            campaign: campaign,
            fullBleed: true,
            templates: await exports.getTemplates()
        });
    } catch (error) {
        console.error('Error loading edit page builder:', error);
        res.status(500).render('pages/error', { 
            error: 'Failed to load page builder',
            user: req.user || null
        });
    }
};

// Save page builder content
exports.savePageBuilder = async (req, res) => {
    try {
        const { 
            title, 
            description, 
            category, 
            fundingGoal, 
            deadline,
            pageBuilderData
        } = req.body;

        // Handle pageBuilderData as either object or JSON string
        let pageBuilderObj;
        if (typeof pageBuilderData === 'string') {
            try {
                pageBuilderObj = JSON.parse(pageBuilderData);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid pageBuilderData JSON'
                });
            }
        } else {
            pageBuilderObj = pageBuilderData;
        }

        // Sanitize section content to prevent XSS
        if (pageBuilderObj && pageBuilderObj.sections) {
            pageBuilderObj.sections.forEach(section => {
                // Sanitize custom CSS - remove dangerous patterns
                if (pageBuilderObj.customCSS && typeof pageBuilderObj.customCSS === 'string') {
                    pageBuilderObj.customCSS = pageBuilderObj.customCSS
                        .replace(/url\s*\(/gi, '')  // Remove url()
                        .replace(/expression\s*\(/gi, '')  // Remove expression()
                        .replace(/@import/gi, '');  // Remove @import
                }
                
                // Sanitize text content in sections
                if (section.content) {
                    Object.keys(section.content).forEach(key => {
                        if (typeof section.content[key] === 'string') {
                            // Basic HTML escaping for user-provided strings
                            section.content[key] = section.content[key]
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#x27;');
                        }
                    });
                }
                
                // Sanitize nested arrays (like features, testimonials)
                if (Array.isArray(section.content.features)) {
                    section.content.features.forEach(feature => {
                        Object.keys(feature).forEach(key => {
                            if (typeof feature[key] === 'string') {
                                feature[key] = feature[key]
                                    .replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/"/g, '&quot;')
                                    .replace(/'/g, '&#x27;');
                            }
                        });
                    });
                }
                
                if (Array.isArray(section.content.testimonials)) {
                    section.content.testimonials.forEach(testimonial => {
                        Object.keys(testimonial).forEach(key => {
                            if (typeof testimonial[key] === 'string') {
                                testimonial[key] = testimonial[key]
                                    .replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/"/g, '&quot;')
                                    .replace(/'/g, '&#x27;');
                            }
                        });
                    });
                }
            });
        }

        let campaign;
        
        if (req.params.id) {
            // Update existing campaign - use $set to avoid overwriting sensitive fields
            const updateData = {
                $set: {
                    title,
                    description,
                    category,
                    fundingGoal: parseInt(fundingGoal),
                    deadline: new Date(deadline)
                }
            };
            
            // Add page builder data if provided
            if (pageBuilderObj) {
                updateData.$set['pageBuilder.enabled'] = true;
                updateData.$set['pageBuilder.sections'] = pageBuilderObj.sections || [];
                updateData.$set['pageBuilder.globalStyles'] = pageBuilderObj.globalStyles || {};
                updateData.$set['pageBuilder.customCSS'] = pageBuilderObj.customCSS || '';
            }
            
            // IMPORTANT: Do NOT update status, backers, or currentFunding from page builder
            // These fields are managed by donation and campaign management logic
            campaign = await Campaign.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );
        } else {
            // Create new campaign
            const campaignData = {
                title,
                description,
                category,
                fundingGoal: parseInt(fundingGoal),
                deadline: new Date(deadline),
                creator: req.user._id,
                status: 'draft'
            };
            
            // Add page builder data if provided
            if (pageBuilderObj) {
                campaignData.pageBuilder = {
                    enabled: true,
                    sections: pageBuilderObj.sections || [],
                    globalStyles: pageBuilderObj.globalStyles || {},
                    customCSS: pageBuilderObj.customCSS || ''
                };
            }
            
            campaign = new Campaign(campaignData);
            await campaign.save();
        }

        res.json({
            success: true,
            campaignId: campaign._id,
            message: req.params.id ? 'Campaign updated successfully' : 'Campaign created successfully'
        });
    } catch (error) {
        console.error('Error saving page builder:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Render section preview for page builder (server-side rendering)
exports.renderSectionPreview = async (req, res) => {
    try {
        const { sectionData } = req.body;
        
        if (!sectionData || !sectionData.type || !sectionData.content) {
            return res.status(400).json({
                success: false,
                error: 'Invalid section data'
            });
        }
        
        // Render the section using EJS partial
        const html = await new Promise((resolve, reject) => {
            require('ejs').renderFile(
                require('path').join(__dirname, '../../views/components', `section-${sectionData.type}.ejs`),
                {
                    content: sectionData.content,
                    settings: sectionData.settings || {},
                    campaign: null // Not available in preview
                },
                (err, str) => {
                    if (err) reject(err);
                    else resolve(str);
                }
            );
        });
        
        res.json({
            success: true,
            html: html
        });
    } catch (error) {
        console.error('Error rendering section preview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to render section preview'
        });
    }
};

// Get section templates
exports.getTemplates = async () => {
    return [
        {
            id: 'hero-basic',
            name: 'Basic Hero Section',
            type: 'hero',
            thumbnail: '/images/templates/hero-basic.png',
            content: {
                title: 'Your Campaign Title',
                subtitle: 'A compelling subtitle that explains your mission',
                description: 'Detailed description of your campaign and what you aim to achieve...',
                image: '',
                ctaText: 'Support This Campaign',
                ctaLink: '#donate'
            }
        },
        {
            id: 'features-three-col',
            name: 'Three Column Features',
            type: 'features',
            thumbnail: '/images/templates/features-3col.png',
            content: {
                title: 'Key Features',
                features: [
                    { icon: '💡', title: 'Feature One', description: 'Description of your first feature' },
                    { icon: '🚀', title: 'Feature Two', description: 'Description of your second feature' },
                    { icon: '🎯', title: 'Feature Three', description: 'Description of your third feature' }
                ]
            }
        },
        {
            id: 'testimonial-slider',
            name: 'Testimonial Slider',
            type: 'testimonials',
            thumbnail: '/images/templates/testimonials.png',
            content: {
                title: 'What People Say',
                testimonials: [
                    { name: 'John Doe', role: 'Supporter', quote: 'This is an amazing initiative!', avatar: '' },
                    { name: 'Jane Smith', role: 'Mentor', quote: 'Incredible work being done here.', avatar: '' }
                ]
            }
        },
        {
            id: 'text-basic',
            name: 'Basic Text Section',
            type: 'text',
            thumbnail: '/images/templates/text-basic.png',
            content: {
                heading: 'Text Section Heading',
                body: 'This is a basic text section. You can use this section to add descriptive content about your campaign, mission, or any information you want to share with your audience. Explain your goals, your story, and why people should support your cause.'
            }
        },
        {
            id: 'image-basic',
            name: 'Image with Caption',
            type: 'image',
            thumbnail: '/images/templates/image-basic.png',
            content: {
                src: 'https://via.placeholder.com/800x400',
                alt: 'Campaign image',
                caption: 'Add a meaningful caption to describe your image'
            }
        },
        {
            id: 'gallery-grid',
            name: 'Photo Gallery Grid',
            type: 'gallery',
            thumbnail: '/images/templates/gallery-grid.png',
            content: {
                title: 'Photo Gallery',
                images: [
                    'https://via.placeholder.com/400x300',
                    'https://via.placeholder.com/400x300',
                    'https://via.placeholder.com/400x300',
                    'https://via.placeholder.com/400x300',
                    'https://via.placeholder.com/400x300',
                    'https://via.placeholder.com/400x300'
                ]
            }
        },
        {
            id: 'video-youtube',
            name: 'Video Embed',
            type: 'video',
            thumbnail: '/images/templates/video-youtube.png',
            content: {
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                caption: 'Embed videos from YouTube, Vimeo, or other platforms'
            }
        },
        {
            id: 'cta-basic',
            name: 'Call to Action',
            type: 'cta',
            thumbnail: '/images/templates/cta-basic.png',
            content: {
                heading: 'Take Action Now',
                description: 'Encourage visitors to take the next step and support your cause with a compelling call to action.',
                buttonText: 'Get Involved',
                buttonLink: '#donate'
            }
        },
        {
            id: 'faq-basic',
            name: 'FAQ Section',
            type: 'faq',
            thumbnail: '/images/templates/faq-basic.png',
            content: {
                title: 'Frequently Asked Questions',
                faqs: [
                    { question: 'What is this campaign about?', answer: 'This campaign aims to make a positive impact by addressing an important issue in our community.' },
                    { question: 'How can I contribute?', answer: 'You can contribute by donating, sharing our campaign, or volunteering your time and skills.' },
                    { question: 'When will the funds be used?', answer: 'Funds will be used immediately upon reaching our goal to start implementation of the project.' }
                ]
            }
        },
        {
            id: 'form-contact',
            name: 'Contact Form',
            type: 'form',
            thumbnail: '/images/templates/form-contact.png',
            content: {
                title: 'Get In Touch',
                fields: [
                    { type: 'text', label: 'Name', required: true },
                    { type: 'email', label: 'Email', required: true },
                    { type: 'textarea', label: 'Message', required: true }
                ],
                buttonText: 'Send Message'
            }
        },
        {
            id: 'form-donation',
            name: 'Donation Form',
            type: 'form',
            thumbnail: '/images/templates/form-donation.png',
            content: {
                title: 'Support This Campaign',
                fields: [
                    { type: 'number', label: 'Donation Amount (BDT)', required: true, min: 100 },
                    { type: 'text', label: 'bKash Number', required: true },
                    { type: 'textarea', label: 'Your Message (Optional)', required: false }
                ],
                buttonText: 'Donate Now'
            }
        },
        {
            id: 'divider-simple',
            name: 'Section Divider',
            type: 'divider',
            thumbnail: '/images/templates/divider-simple.png',
            content: {}
        },
        {
            id: 'custom-html',
            name: 'Custom HTML',
            type: 'custom',
            thumbnail: '/images/templates/custom-html.png',
            content: {
                html: '<div class="custom-content"><h3>Custom Content</h3><p>Add your own custom HTML code here</p></div>'
            }
        }
    ];
};

// Preview campaign with custom page builder design
exports.previewCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('creator', 'username university profileImage')
            .populate('backers.user', 'username')
            .lean();

        if (!campaign) {
            return res.status(404).render('pages/404', {
                user: req.user || null
            });
        }

        // Render with custom page builder if enabled
        if (campaign.pageBuilder && campaign.pageBuilder.enabled) {
            res.render('pages/custom-campaign', {
                campaign: campaign,
                user: req.user,
                title: campaign.title + ' - FundMyIdea BD'
            });
        } else {
            // Fall back to traditional campaign view
            res.render('pages/campaign', {
                campaign: campaign,
                user: req.user,
                hasDonated: false,
                title: campaign.title + ' - FundMyIdea BD'
            });
        }
    } catch (error) {
        console.error('Error previewing campaign:', error);
        res.status(500).render('pages/error', { 
            error: 'Failed to preview campaign',
            user: req.user || null
        });
    }
};

// Get campaign version history
exports.getVersionHistory = async (req, res) => {
    try {
        const versions = await CampaignVersion.findByCampaign(req.params.id);
        res.json({ versions });
    } catch (error) {
        console.error('Error fetching version history:', error);
        res.status(500).json({ error: 'Failed to fetch version history' });
    }
};

// Save version to campaign history
exports.saveVersion = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        const { version, timestamp, status, sections, campaignData } = req.body;
        
        // Create new version in separate collection
        const versionDoc = new CampaignVersion({
            campaign: campaign._id,
            version,
            data: { sections, ...campaignData },
            createdBy: req.user._id
        });
        
        await versionDoc.saveVersion(); // Auto-cleanup old versions
        
        // Get updated version list
        const versions = await CampaignVersion.findByCampaign(req.params.id);
        res.json({ success: true, versions });
    } catch (error) {
        console.error('Error saving version:', error);
        res.status(500).json({ error: 'Failed to save version' });
    }
};

// Clear version history
exports.clearVersionHistory = async (req, res) => {
    try {
        await CampaignVersion.deleteMany({ campaign: req.params.id });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing version history:', error);
        res.status(500).json({ error: 'Failed to clear version history' });
    }
};
const Campaign = require('../models/Campaign');
const CampaignVersion = require('../models/CampaignVersion');

// Get page builder interface for creating new campaign
exports.getPageBuilder = async (req, res) => {
    try {
        res.render('pages/page-builder', {
            title: 'Create Campaign - Page Builder',
            user: req.user,
            campaign: null,
            templates: await exports.getTemplates()
        });
    } catch (error) {
        console.error('Error loading page builder:', error);
        res.status(500).render('pages/error', { 
            error: 'Failed to load page builder' 
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
                error: 'You can only edit your own campaigns' 
            });
        }

        res.render('pages/page-builder', {
            title: `Edit ${campaign.title} - Page Builder`,
            user: req.user,
            campaign: campaign,
            templates: await exports.getTemplates()
        });
    } catch (error) {
        console.error('Error loading edit page builder:', error);
        res.status(500).render('pages/error', { 
            error: 'Failed to load page builder' 
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
            pageBuilderData,
            status = 'draft'
        } = req.body;

        const campaignData = {
            title,
            description,
            category,
            fundingGoal: parseInt(fundingGoal),
            deadline: new Date(deadline),
            creator: req.user._id,
            status
        };

        // Add page builder data if provided
        if (pageBuilderData) {
            campaignData.pageBuilder = {
                enabled: true,
                sections: pageBuilderData.sections || [],
                globalStyles: pageBuilderData.globalStyles || {},
                customCSS: pageBuilderData.customCSS || '',
                versionHistory: [{
                    version: 1,
                    data: pageBuilderData,
                    createdBy: req.user._id
                }]
            };
        }

        let campaign;
        if (req.params.id) {
            // Update existing campaign
            campaign = await Campaign.findByIdAndUpdate(
                req.params.id,
                campaignData,
                { new: true, runValidators: true }
            );
        } else {
            // Create new campaign
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
            return res.status(404).render('pages/404');
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
            error: 'Failed to preview campaign' 
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
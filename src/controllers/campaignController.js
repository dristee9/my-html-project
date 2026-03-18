const Campaign = require('../models/Campaign');
const User = require('../models/User');

// Get all active campaigns for explore page
exports.getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ status: 'active' })
            .populate('creator', 'username university')
            .sort({ createdAt: -1 });
        
        res.render('pages/explore', {
            title: 'Explore Campaigns - FundMyIdea BD',
            campaigns: campaigns,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load campaigns',
            user: req.user
        });
    }
};

// Get single campaign by ID
exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('creator', 'username university profileImage')
            .populate('backers.user', 'username');
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Add virtual properties for template usage
        const campaignData = campaign.toObject();
        campaignData.daysLeftText = campaign.daysLeftText;
        campaignData.fundingPercentage = campaign.fundingPercentage;
        
        // Check if user has donated to this campaign
        const hasDonated = req.user && campaign.backers.some(backer => 
            backer.user && backer.user._id.toString() === req.user._id.toString()
        );
        
        // Check for donation success message from redirect
        const donationSuccess = req.query.donated === 'true' ? 
            `Thank you for your generous donation! Your support means everything to ${campaign.creator.username}.` : 
            null;
        
        res.render('pages/campaign', {
            title: `${campaign.title} - FundMyIdea BD`,
            campaign: campaignData,
            hasDonated: hasDonated,
            donationSuccess: donationSuccess,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load campaign',
            user: req.user
        });
    }
};

// Create new campaign
exports.createCampaign = async (req, res) => {
    try {
        const { title, description, category, fundingGoal, deadline } = req.body;
        
        // Validate deadline
        const deadlineDate = new Date(deadline);
        if (deadlineDate <= new Date()) {
            return res.status(400).render('pages/create', {
                title: 'Create Campaign - FundMyIdea BD',
                user: req.user,
                error: 'Deadline must be in the future'
            });
        }
        
        // Create campaign
        const campaign = new Campaign({
            title,
            description,
            category,
            fundingGoal: parseInt(fundingGoal),
            deadline: deadlineDate,
            creator: req.user._id,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
        });
        
        await campaign.save();
        
        console.log('Campaign created successfully:', campaign.title);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).render('pages/create', {
            title: 'Create Campaign - FundMyIdea BD',
            user: req.user,
            error: 'Failed to create campaign'
        });
    }
};

// Process donation
// Get user's campaigns for dashboard
exports.getUserCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ creator: req.user._id })
            .sort({ createdAt: -1 });
        
        // Calculate user statistics
        const userStats = {
            campaignsCount: campaigns.length,
            totalRaised: campaigns.reduce((sum, camp) => sum + camp.currentFunding, 0),
            donationsCount: campaigns.reduce((sum, camp) => sum + camp.backers.length, 0)
        };
        
        res.render('pages/dashboard', {
            title: 'Dashboard - FundMyIdea BD',
            user: req.user,
            campaigns: campaigns,
            userStats: userStats
        });
    } catch (error) {
        console.error('Error fetching user campaigns:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load dashboard',
            user: req.user
        });
    }
};

// Render donation page
exports.getDonationPage = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('creator', 'username university profileImage')
            .populate('backers.user', 'username');
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Add virtual properties for template usage
        const campaignData = campaign.toObject();
        campaignData.daysLeftText = campaign.daysLeftText;
        campaignData.fundingPercentage = campaign.fundingPercentage;
        
        // Check if user has donated to this campaign
        const hasDonated = req.user && campaign.backers.some(backer => 
            backer.user && backer.user._id.toString() === req.user._id.toString()
        );
        
        res.render('pages/donate', {
            title: `Donate to ${campaign.title} - FundMyIdea BD`,
            campaign: campaignData,
            hasDonated: hasDonated,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading donation page:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load donation page',
            user: req.user
        });
    }
};

// Process donation from dedicated donation page
exports.processDonation = async (req, res) => {
    try {
        console.log('Processing donation for campaign:', req.params.id);
        console.log('Request body:', req.body);
        console.log('User:', req.user._id);
        
        const { amount, message, bkashNumber } = req.body;
        const campaignId = req.params.id;
        
        // Fetch campaign first
        const campaign = await Campaign.findById(campaignId)
            .populate('creator', 'username university profileImage')
            .populate('backers.user', 'username');
        
        if (!campaign) {
            console.log('Campaign not found');
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Add virtual properties for template usage
        const campaignData = campaign.toObject();
        campaignData.daysLeftText = campaign.daysLeftText;
        campaignData.fundingPercentage = campaign.fundingPercentage;
        
        // Validate amount
        const donationAmount = parseInt(amount);
        if (donationAmount < 100) {
            console.log('Donation amount too low:', donationAmount);
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'Minimum donation amount is 100 BDT'
            });
        }
        
        // Validate bKash number
        if (!bkashNumber || !bkashNumber.match(/^[0-9]{11}$/)) {
            console.log('Invalid bKash number:', bkashNumber);
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'Please enter a valid 11-digit bKash number'
            });
        }
        
        // Check if campaign is still active
        if (campaign.status !== 'active' || campaign.deadline < new Date()) {
            console.log('Campaign not active or expired');
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'This campaign is no longer accepting donations'
            });
        }
        
        console.log('Adding donation to campaign');
        // Add donation to campaign - store only last 4 digits for privacy
        campaign.backers.push({
            user: req.user._id,
            amount: donationAmount,
            message: message || '',
            bkashNumberLast4: bkashNumber.slice(-4), // Store only last 4 digits
            transactionId: null // Placeholder for future bKash API integration
        });
        
        campaign.currentFunding += donationAmount;
        
        // Check if funding goal is reached
        if (campaign.currentFunding >= campaign.fundingGoal) {
            campaign.status = 'completed';
        }
        
        await campaign.save();
        console.log('Campaign saved successfully');
        
        console.log(`Donation of ${donationAmount} BDT processed for campaign ${campaign.title}`);
        
        // Redirect to campaign page with success flag (POST-Redirect-GET pattern)
        res.redirect(`/campaigns/${campaignId}?donated=true`);
    } catch (error) {
        console.error('Error processing donation:', error);
        res.status(500).render('pages/donate', {
            title: 'Donate - FundMyIdea BD',
            user: req.user,
            error: 'Failed to process donation. Please try again.'
        });
    }
};

// Search campaigns
exports.searchCampaigns = async (req, res) => {
    try {
        const { q, category } = req.query;
        let query = { status: 'active' };
        
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        const campaigns = await Campaign.find(query)
            .populate('creator', 'username university')
            .sort({ createdAt: -1 });
        
        res.render('pages/explore', {
            title: 'Search Results - FundMyIdea BD',
            campaigns: campaigns,
            user: req.user,
            searchQuery: q,
            searchCategory: category
        });
    } catch (error) {
        console.error('Error searching campaigns:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to search campaigns',
            user: req.user
        });
    }
};
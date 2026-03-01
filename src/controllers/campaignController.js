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
        
        res.render('pages/campaign', {
            title: `${campaign.title} - FundMyIdea BD`,
            campaign: campaignData,
            hasDonated: hasDonated,
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
exports.donateToCampaign = async (req, res) => {
    try {
        const { amount, message, bkashNumber } = req.body;
        const campaignId = req.params.id;
        
        // Validate amount
        const donationAmount = parseInt(amount);
        if (donationAmount < 100) {
            return res.status(400).render('pages/campaign', {
                title: 'Donate - FundMyIdea BD',
                user: req.user,
                error: 'Minimum donation amount is 100 BDT'
            });
        }
        
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Check if campaign is still active
        if (campaign.status !== 'active' || campaign.deadline < new Date()) {
            return res.status(400).render('pages/campaign', {
                title: campaign.title + ' - FundMyIdea BD',
                campaign: campaign,
                user: req.user,
                error: 'This campaign is no longer accepting donations'
            });
        }
        
        // Add donation to campaign
        campaign.backers.push({
            user: req.user._id,
            amount: donationAmount,
            message: message || '',
            bkashNumber: bkashNumber
        });
        
        campaign.currentFunding += donationAmount;
        
        // Check if funding goal is reached
        if (campaign.currentFunding >= campaign.fundingGoal) {
            campaign.status = 'completed';
        }
        
        await campaign.save();
        
        console.log(`Donation of ${donationAmount} BDT processed for campaign ${campaign.title}`);
        res.redirect(`/campaigns/${campaignId}`);
    } catch (error) {
        console.error('Error processing donation:', error);
        res.status(500).render('pages/campaign', {
            title: 'Donate - FundMyIdea BD',
            user: req.user,
            error: 'Failed to process donation'
        });
    }
};

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
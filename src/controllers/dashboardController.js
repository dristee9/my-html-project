const Campaign = require('../models/Campaign');
const User = require('../models/User');

// Get user dashboard
exports.getDashboard = async (req, res) => {
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
        console.error('Error fetching user dashboard:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load dashboard',
            user: req.user
        });
    }
};

// Get user profile
exports.getProfile = (req, res) => {
    res.render('pages/profile', {
        title: 'My Profile - FundMyIdea BD',
        user: req.user
    });
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { username, email, university } = req.body;
        
        // Update user
        await User.findByIdAndUpdate(req.user._id, {
            username,
            email,
            university
        });
        
        // Refresh user data
        const updatedUser = await User.findById(req.user._id);
        req.user = updatedUser;
        
        res.redirect('/dashboard/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.render('pages/profile', {
            title: 'My Profile - FundMyIdea BD',
            user: req.user,
            error: 'Failed to update profile'
        });
    }
};

// Get user's campaigns
exports.getMyCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ creator: req.user._id })
            .sort({ createdAt: -1 });
        
        res.render('pages/my-campaigns', {
            title: 'My Campaigns - FundMyIdea BD',
            user: req.user,
            campaigns: campaigns
        });
    } catch (error) {
        console.error('Error fetching user campaigns:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load campaigns',
            user: req.user
        });
    }
};

// Get user's donations
exports.getMyDonations = async (req, res) => {
    try {
        // Find campaigns where user has donated
        const campaigns = await Campaign.find({ 'backers.user': req.user._id })
            .populate('creator', 'username university');
        
        // Extract user's donations
        const donations = [];
        campaigns.forEach(campaign => {
            campaign.backers.forEach(backer => {
                if (backer.user.toString() === req.user._id.toString()) {
                    donations.push({
                        campaignTitle: campaign.title,
                        creatorName: campaign.creator.username,
                        amount: backer.amount,
                        date: backer.donatedAt.toLocaleDateString(),
                        campaignId: campaign._id
                    });
                }
            });
        });
        
        res.render('pages/my-donations', {
            title: 'My Donations - FundMyIdea BD',
            user: req.user,
            donations: donations
        });
    } catch (error) {
        console.error('Error fetching user donations:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load donations',
            user: req.user
        });
    }
};
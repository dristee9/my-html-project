const Campaign = require('../models/Campaign');
const User = require('../models/User');

// Get user dashboard
exports.getDashboard = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ creator: req.user._id })
            .sort({ createdAt: -1 });
        
        // Calculate user statistics
        const activeCampaigns = campaigns.filter(c => c.status === 'active');
        const userStats = {
            campaignsCount: activeCampaigns.length,
            totalRaised: campaigns.reduce((sum, camp) => sum + camp.currentFunding, 0),
            donationsCount: campaigns.reduce((sum, camp) => sum + camp.backers.length, 0)
        };
        
        // Find campaigns expiring in next 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const expiringSoon = activeCampaigns.filter(c => 
            c.deadline <= threeDaysFromNow && c.deadline > new Date()
        ).sort((a, b) => a.deadline - b.deadline);
        
        // Build recent activity feed (last 5 actions)
        const recentActivity = [];
        
        // Add recent donations received
        campaigns.forEach(campaign => {
            campaign.backers.forEach(backer => {
                recentActivity.push({
                    type: 'donation_received',
                    campaignTitle: campaign.title,
                    donorName: backer.user?.username || 'Anonymous',
                    amount: backer.amount,
                    date: backer.donatedAt,
                    icon: '💰'
                });
            });
        });
        
        // Add campaign status changes
        campaigns.forEach(campaign => {
            if (campaign.status === 'completed') {
                recentActivity.push({
                    type: 'campaign_completed',
                    campaignTitle: campaign.title,
                    message: 'Campaign completed successfully',
                    date: campaign.updatedAt,
                    icon: '✅'
                });
            } else if (campaign.status === 'expired') {
                recentActivity.push({
                    type: 'campaign_expired',
                    campaignTitle: campaign.title,
                    message: 'Campaign deadline passed',
                    date: campaign.updatedAt,
                    icon: '⏰'
                });
            }
        });
        
        // Sort by date and take last 5
        recentActivity.sort((a, b) => b.date - a.date);
        const recentActivities = recentActivity.slice(0, 5);
        
        res.render('pages/dashboard', {
            title: 'Dashboard - FundMyIdea BD',
            user: req.user,
            campaigns: campaigns,
            userStats: userStats,
            expiringSoon: expiringSoon,
            recentActivities: recentActivities
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
        
        // Fetch-then-save pattern to ensure pre-save hooks run
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).render('pages/error', {
                title: 'User Not Found - FundMyIdea BD',
                error: 'User not found',
                user: req.user
            });
        }
        
        // Update user fields
        user.username = username;
        user.email = email;
        user.university = university;
        
        // Handle profile image upload if file exists
        if (req.file) {
            user.profileImage = '/uploads/profiles/' + req.file.filename;
        }
        
        // Save to trigger pre-save hooks and validation
        await user.save();
        
        // Refresh user data
        req.user = user;
        
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
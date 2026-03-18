const Campaign = require('../models/Campaign');
const User = require('../models/User');

// Get homepage with real statistics and featured campaigns
exports.getHomePage = async (req, res) => {
    try {
        // Fetch platform statistics
        const stats = await Campaign.aggregate([
            {
                $group: {
                    _id: null,
                    totalCampaigns: { $sum: 1 },
                    totalRaised: { $sum: '$currentFunding' },
                    activeCampaigns: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Fetch unique universities count
        const universitiesCount = await User.distinct('university').count();

        // Format statistics with defaults
        const platformStats = {
            totalCampaigns: stats[0]?.totalCampaigns || 0,
            totalRaised: stats[0]?.totalRaised || 0,
            activeCampaigns: stats[0]?.activeCampaigns || 0,
            universities: universitiesCount || 0
        };

        // Fetch featured campaigns (top funded active campaigns)
        const featuredCampaigns = await Campaign.find({ status: 'active' })
            .sort({ currentFunding: -1 })
            .limit(6)
            .populate('creator', 'username university');

        res.render('pages/index', {
            stats: platformStats,
            featuredCampaigns: featuredCampaigns,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching homepage data:', error);
        // Render page with default values if data fetch fails
        res.render('pages/index', {
            stats: {
                totalCampaigns: 0,
                totalRaised: 0,
                activeCampaigns: 0,
                universities: 0
            },
            featuredCampaigns: [],
            user: req.user
        });
    }
};

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

        // Fetch trending campaigns (by currentFunding descending)
        const trendingCampaigns = await Campaign.find({ status: 'active' })
            .sort({ currentFunding: -1 })
            .limit(6)
            .populate('creator', 'username university');

        // Fetch newest campaigns (by createdAt descending)
        const newestCampaigns = await Campaign.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('creator', 'username university');

        // Fetch recommended campaigns for logged-in users
        let recommendedCampaigns = [];
        if (req.user) {
            // Find campaigns the user has donated to
            const donatedCampaigns = await Campaign.find({ 
                'backers.user': req.user._id,
                status: 'active'
            }).distinct('category');
            
            // Find campaigns the user has created
            const createdCampaigns = await Campaign.find({ 
                creator: req.user._id,
                status: 'active'
            }).distinct('category');
            
            // Combine categories
            const userCategories = [...new Set([...donatedCampaigns, ...createdCampaigns])];
            
            if (userCategories.length > 0) {
                // Fetch campaigns in same categories, excluding user's own campaigns
                recommendedCampaigns = await Campaign.find({ 
                    category: { $in: userCategories },
                    status: 'active',
                    creator: { $ne: req.user._id }
                })
                .sort({ currentFunding: -1 })
                .limit(6)
                .populate('creator', 'username university');
            }
            
            // If no recommendations based on categories, fall back to trending
            if (recommendedCampaigns.length === 0) {
                recommendedCampaigns = trendingCampaigns;
            }
        }

        res.render('pages/index', {
            stats: platformStats,
            trendingCampaigns: trendingCampaigns,
            newestCampaigns: newestCampaigns,
            recommendedCampaigns: recommendedCampaigns,
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
            trendingCampaigns: [],
            newestCampaigns: [],
            recommendedCampaigns: [],
            user: req.user
        });
    }
};

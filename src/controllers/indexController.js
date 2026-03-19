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
        const universityList = await User.distinct('university');
        const universitiesCount = universityList.length;

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
            // Find all campaigns the user has donated to
            const userDonatedCampaigns = await Campaign.find({ 
                'backers.user': req.user._id,
                status: 'active'
            })
            .populate('creator', 'username university')
            .select('category backers');
            
            // Get categories user has supported
            const userCategories = [...new Set(userDonatedCampaigns.map(c => c.category))];
            
            // Get IDs of campaigns user has donated to
            const userDonatedIds = userDonatedCampaigns.map(c => c._id.toString());
            
            if (userCategories.length > 0) {
                // Collaborative filtering: Find other backers who donated to same campaigns
                const similarBackerIds = new Set();
                
                for (const campaign of userDonatedCampaigns) {
                    campaign.backers.forEach(backer => {
                        if (backer.user && backer.user.toString() !== req.user._id.toString()) {
                            similarBackerIds.add(backer.user);
                        }
                    });
                }
                
                // Find campaigns that similar backers have supported
                if (similarBackerIds.size > 0) {
                    const similarBackerArray = Array.from(similarBackerIds);
                    
                    // Find campaigns backed by similar users, excluding user's own donations
                    const collaborativeRecs = await Campaign.find({
                        'backers.user': { $in: similarBackerArray },
                        _id: { $nin: userDonatedIds },
                        creator: { $ne: req.user._id },
                        status: 'active'
                    })
                    .populate('creator', 'username university')
                    .sort({ currentFunding: -1, backers: -1 })
                    .limit(6);
                    
                    // If we have enough collaborative recommendations, use them
                    if (collaborativeRecs.length >= 3) {
                        recommendedCampaigns = collaborativeRecs;
                    } else {
                        // Fall back to category-based recommendations
                        recommendedCampaigns = await Campaign.find({ 
                            category: { $in: userCategories },
                            _id: { $nin: userDonatedIds },
                            creator: { $ne: req.user._id },
                            status: 'active'
                        })
                        .sort({ currentFunding: -1 })
                        .limit(6)
                        .populate('creator', 'username university');
                    }
                } else {
                    // No similar backers found, use category-based
                    recommendedCampaigns = await Campaign.find({ 
                        category: { $in: userCategories },
                        _id: { $nin: userDonatedIds },
                        creator: { $ne: req.user._id },
                        status: 'active'
                    })
                    .sort({ currentFunding: -1 })
                    .limit(6)
                    .populate('creator', 'username university');
                }
            }
            
            // If no recommendations based on donations, fall back to trending
            if (recommendedCampaigns.length === 0) {
                recommendedCampaigns = trendingCampaigns;
            }
        }

        res.render('pages/index', {
            stats: platformStats,
            trendingCampaigns: trendingCampaigns,
            newestCampaigns: newestCampaigns,
            recommendedCampaigns: recommendedCampaigns,
            user: req.user,
            currentPage: 'home'
        });
    } catch (error) {
        console.error('Error fetching homepage data:', error);
        try {
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
                user: req.user,
                currentPage: 'home'
            });
        } catch (renderError) {
            console.error('Error rendering homepage after fallback:', renderError);
            // If render itself fails, use Express error handler
            return res.status(500).render('pages/error', {
                title: 'Error - FundMyIdea BD',
                error: 'Failed to load homepage',
                user: req.user
            });
        }
    }
};

// Get leaderboard page
exports.getLeaderboard = async (req, res) => {
    try {
        const Campaign = require('../models/Campaign');
        
        // Aggregate top creators by total funds raised
        const topCreators = await Campaign.aggregate([
            { $match: { status: { $in: ['active', 'completed'] } } },
            { $group: { 
                _id: '$creator', 
                totalRaised: { $sum: '$currentFunding' }, 
                campaignCount: { $sum: 1 },
                avgFundingPercentage: { $avg: '$fundingPercentage' }
            }},
            { $sort: { totalRaised: -1 } },
            { $limit: 20 },
            { $lookup: { 
                from: 'users', 
                localField: '_id', 
                foreignField: '_id', 
                as: 'creator' 
            }},
            { $unwind: '$creator' },
            { $project: { 
                'creator.password': 0, 
                'creator.resetPasswordToken': 0,
                'creator.emailVerificationToken': 0
            }}
        ]);
        
        // Calculate rising stars (newest campaigns with highest funding %)
        const risingStars = await Campaign.find({
            status: 'active',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        })
        .populate('creator', 'username university')
        .sort({ fundingPercentage: -1 })
        .limit(10);
        
        res.render('pages/leaderboard', {
            title: 'Leaderboard - FundMyIdea BD',
            topCreators,
            risingStars,
            user: req.user,
            currentPage: 'leaderboard'
        });
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load leaderboard',
            user: req.user
        });
    }
};

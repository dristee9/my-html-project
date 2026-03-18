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
        
        // Auto-expire campaign if deadline has passed
        await campaign.checkAndUpdateExpiration();
        
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
        
        // Auto-expire campaign if deadline has passed
        await campaign.checkAndUpdateExpiration();
        
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
        
        // Auto-expire campaign if deadline has passed
        await campaign.checkAndUpdateExpiration();
        
        // Check if campaign is still active after expiration check
        if (campaign.status !== 'active') {
            console.log('Campaign not active or expired');
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'This campaign is no longer accepting donations'
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
        const { q, category, sort, page } = req.query;
        
        // Pagination settings
        const currentPage = parseInt(page) || 1;
        const pageSize = 9; // Show 9 campaigns per page
        const skip = (currentPage - 1) * pageSize;
        
        // Build query
        let query = { status: 'active' };
        
        // Use text search if query exists
        if (q && q.trim() !== '') {
            // Try text search first (requires text index)
            try {
                const textSearch = await Campaign.find(
                    { $text: { $search: q }, status: 'active' },
                    { score: { $meta: 'textScore' } }
                ).sort({ score: { $meta: 'textScore' } });
                
                // If text search returns results, filter by category and use it
                if (textSearch.length > 0) {
                    query = { _id: { $in: textSearch.map(c => c._id) } };
                } else {
                    // Fallback to regex search if text search returns nothing
                    query.$or = [
                        { title: { $regex: q, $options: 'i' } },
                        { description: { $regex: q, $options: 'i' } }
                    ];
                }
            } catch (textError) {
                // Fallback to regex search if text index doesn't exist or fails
                query.$or = [
                    { title: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } }
                ];
            }
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        // Determine sorting
        let sortOptions = {};
        if (sort === 'most-funded') {
            sortOptions = { currentFunding: -1 };
        } else if (sort === 'ending-soon') {
            sortOptions = { deadline: 1 };
        } else if (sort === 'newest' || !sort) {
            sortOptions = { createdAt: -1 }; // Default to newest
        }
        
        // Get total count for pagination
        const totalCount = await Campaign.countDocuments(query);
        const totalPages = Math.ceil(totalCount / pageSize);
        
        // Fetch campaigns with pagination and sorting
        const campaigns = await Campaign.find(query)
            .populate('creator', 'username university')
            .sort(sortOptions)
            .skip(skip)
            .limit(pageSize);
        
        res.render('pages/explore', {
            title: q ? `Search Results - FundMyIdea BD` : 'Explore Campaigns - FundMyIdea BD',
            campaigns: campaigns,
            user: req.user,
            searchQuery: q || '',
            searchCategory: category || 'all',
            sortBy: sort || 'newest',
            currentPage: currentPage,
            totalPages: totalPages,
            hasPrevPage: currentPage > 1,
            hasNextPage: currentPage < totalPages,
            prevPage: currentPage - 1,
            nextPage: currentPage + 1
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
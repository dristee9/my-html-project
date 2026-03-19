const Campaign = require('../models/Campaign');
const User = require('../models/User');
const bkashService = require('../services/bkash');
const emailService = require('../services/emailService');

// Get all active campaigns for explore page
exports.getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ status: 'active' })
            .populate('creator', 'username university')
            .sort({ createdAt: -1 });
        
        res.render('pages/explore', {
            title: 'Explore Campaigns - FundMyIdea BD',
            campaigns: campaigns,
            user: req.user,
            currentPage: 'explore'
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
        
        // Render custom page builder view if enabled
        if (campaign.pageBuilder?.enabled && campaign.pageBuilder?.sections?.length > 0) {
            return res.render('pages/custom-campaign', {
                title: `${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                hasDonated: hasDonated,
                donationSuccess: donationSuccess,
                user: req.user
            });
        }
        
        // Otherwise render traditional campaign view
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

// Get edit campaign page
exports.getEditCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).lean();
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Check if user owns this campaign
        if (campaign.creator.toString() !== req.user._id.toString()) {
            return res.status(403).render('pages/error', {
                title: 'Access Denied - FundMyIdea BD',
                error: 'You can only edit your own campaigns',
                user: req.user
            });
        }
        
        res.render('pages/edit-campaign', {
            title: `Edit ${campaign.title} - FundMyIdea BD`,
            user: req.user,
            campaign: campaign,
            currentPage: 'edit'
        });
    } catch (error) {
        console.error('Error loading edit campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load edit campaign page',
            user: req.user
        });
    }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
    try {
        const { title, description, category, fundingGoal, deadline } = req.body;
        
        // Validate required fields
        if (!title || !description || !category || !fundingGoal || !deadline) {
            return res.status(400).render('pages/error', {
                title: 'Validation Error - FundMyIdea BD',
                error: 'All fields are required',
                user: req.user
            });
        }
        
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Check if user owns this campaign
        if (campaign.creator.toString() !== req.user._id.toString()) {
            return res.status(403).render('pages/error', {
                title: 'Access Denied - FundMyIdea BD',
                error: 'You can only edit your own campaigns',
                user: req.user
            });
        }
        
        // Build update data
        const updateData = {
            title,
            description,
            category,
            fundingGoal: parseInt(fundingGoal),
            deadline: new Date(deadline)
        };
        
        // Handle image update if new image is uploaded
        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }
        
        // Update campaign
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        console.log('Campaign updated successfully:', req.params.id);
        res.redirect(`/campaigns/${req.params.id}`);
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to update campaign',
            user: req.user
        });
    }
};

// Delete campaign
exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Check if user owns this campaign
        if (campaign.creator.toString() !== req.user._id.toString()) {
            return res.status(403).render('pages/error', {
                title: 'Access Denied - FundMyIdea BD',
                error: 'You can only delete your own campaigns',
                user: req.user
            });
        }
        
        await Campaign.findByIdAndDelete(req.params.id);
        console.log('Campaign deleted successfully:', req.params.id);
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to delete campaign',
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
            user: req.user,
            pageStyles: ['donate']
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
        
        // Add virtual properties for template usage
        const campaignData = campaign.toObject();
        campaignData.daysLeftText = campaign.daysLeftText;
        campaignData.fundingPercentage = campaign.fundingPercentage;
        
        // Check if campaign is still active after expiration check
        if (campaign.status !== 'active') {
            console.log('Campaign not active or expired');
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'This campaign is no longer accepting donations',
                pageStyles: ['donate']
            });
        }
        
        // Validate amount
        const donationAmount = parseInt(amount);
        if (donationAmount < 100) {
            console.log('Donation amount too low:', donationAmount);
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'Minimum donation amount is 100 BDT',
                pageStyles: ['donate']
            });
        }
        
        // Validate bKash number
        if (!bkashNumber || !bkashNumber.match(/^[0-9]{11}$/)) {
            console.log('Invalid bKash number:', bkashNumber);
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'Please enter a valid 11-digit bKash number',
                pageStyles: ['donate']
            });
        }
        
        // Check if campaign is still active
        if (campaign.status !== 'active' || campaign.deadline < new Date()) {
            console.log('Campaign not active or expired');
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'This campaign is no longer accepting donations',
                pageStyles: ['donate']
            });
        }
        
        // Prevent self-donation to avoid funding manipulation
        if (campaign.creator._id.toString() === req.user._id.toString()) {
            console.log('Self-donation attempt blocked for campaign:', campaignId);
            return res.status(400).render('pages/donate', {
                title: `Donate to ${campaign.title} - FundMyIdea BD`,
                campaign: campaignData,
                user: req.user,
                error: 'You cannot donate to your own campaign',
                pageStyles: ['donate']
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
        
        // Send donation confirmation email (non-blocking)
        const donor = req.user;
        emailService.sendDonationConfirmation(
            donor, 
            campaign, 
            donationAmount,
            null // No bKash transaction ID for manual donations
        ).catch(err => {
            console.error('Failed to send donation confirmation email:', err);
        });
        
        console.log(`Donation of ${donationAmount} BDT processed for campaign ${campaign.title}`);
        
        // Redirect to campaign page with success flag (POST-Redirect-GET pattern)
        res.redirect(`/campaigns/${campaignId}?donated=true`);
    } catch (error) {
        console.error('Error processing donation:', error);
        res.status(500).render('pages/donate', {
            title: 'Donate - FundMyIdea BD',
            user: req.user,
            error: 'Failed to process donation. Please try again.',
            pageStyles: ['donate']
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
            // Escape special regex characters to prevent ReDoS attacks
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedQ = escapeRegex(q);
            
            // Try text search first (requires text index)
            try {
                const textSearch = await Campaign.find(
                    { $text: { $search: escapedQ }, status: 'active' },
                    { score: { $meta: 'textScore' } }
                ).sort({ score: { $meta: 'textScore' } });
                
                // If text search returns results, filter by category and use it
                if (textSearch.length > 0) {
                    query = { _id: { $in: textSearch.map(c => c._id) } };
                } else {
                    // Fallback to safe regex search with escaped query
                    query.$or = [
                        { title: { $regex: escapedQ, $options: 'i' } },
                        { description: { $regex: escapedQ, $options: 'i' } }
                    ];
                }
            } catch (textError) {
                // Fallback to safe regex search with escaped query if text index fails
                query.$or = [
                    { title: { $regex: escapedQ, $options: 'i' } },
                    { description: { $regex: escapedQ, $options: 'i' } }
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
            currentPage: 'explore',
            searchQuery: q || '',
            searchCategory: category || 'all',
            sortBy: sort || 'newest',
            pageNum: currentPage,
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

// Initiate bKash payment
exports.initiateBkashPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const campaignId = req.params.id;
        
        // Validate amount
        const donationAmount = parseInt(amount);
        if (donationAmount < 100) {
            return res.status(400).json({
                success: false,
                error: 'Minimum donation amount is 100 BDT'
            });
        }
        
        // Verify campaign exists and is active
        const campaign = await Campaign.findById(campaignId);
        if (!campaign || campaign.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Campaign not found or inactive'
            });
        }
        
        // Generate unique invoice number
        const invoiceNumber = `DONATION-${campaignId}-${Date.now()}-${req.user._id}`;
        const callbackURL = `${process.env.APP_URL || 'http://localhost:3000'}/campaigns/${campaignId}/bkash-callback`;
        
        // Create bKash payment
        const paymentData = await bkashService.createPayment(donationAmount, invoiceNumber, callbackURL);
        
        // Store payment ID in session for verification later
        req.session.bkashPayment = {
            paymentID: paymentData.paymentID,
            campaignId: campaignId,
            amount: donationAmount,
            invoiceNumber: invoiceNumber
        };
        
        res.json({
            success: true,
            bkashURL: paymentData.bkashURL
        });
    } catch (error) {
        console.error('Error initiating bKash payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate bKash payment. Please try again.'
        });
    }
};

// Handle bKash payment callback
exports.handleBkashCallback = async (req, res) => {
    try {
        const { paymentID, status } = req.query;
        const campaignId = req.params.id;
        
        // Verify payment status
        if (status !== 'success' || !paymentID) {
            return res.redirect(`/campaigns/${campaignId}?payment=failed`);
        }
        
        // Execute payment to confirm and get transaction details
        const paymentResult = await bkashService.executePayment(paymentID);
        
        if (paymentResult.transactionStatus === 'Completed') {
            // Get campaign and update with donation
            const campaign = await Campaign.findById(campaignId)
                .populate('creator', 'username university profileImage');
            
            if (!campaign || campaign.status !== 'active') {
                return res.redirect(`/campaigns/${campaignId}?payment=failed&error=campaign_inactive`);
            }
            
            // Add backer entry with bKash payment details
            campaign.backers.push({
                user: req.user._id,
                amount: parseFloat(paymentResult.amount),
                message: req.session.bkashPayment?.message || '',
                paymentMethod: 'bkash',
                bkashPaymentID: paymentID,
                bkashTrxID: paymentResult.trxID,
                bkashStatus: paymentResult.transactionStatus
            });
            
            // Update campaign funding
            campaign.currentFunding += parseFloat(paymentResult.amount);
            
            // Check if funding goal reached
            if (campaign.currentFunding >= campaign.fundingGoal) {
                campaign.status = 'completed';
            }
            
            await campaign.save();
            
            // Clear session data
            delete req.session.bkashPayment;
            
            // Send donation confirmation email (non-blocking)
            const donor = req.user;
            emailService.sendDonationConfirmation(
                donor, 
                campaign, 
                parseFloat(paymentResult.amount),
                paymentResult.trxID
            ).catch(err => {
                console.error('Failed to send donation confirmation email:', err);
            });
            
            console.log(`bKash donation of ${paymentResult.amount} BDT processed successfully. TrxID: ${paymentResult.trxID}`);
            
            // Redirect to campaign page with success message
            res.redirect(`/campaigns/${campaignId}?donated=true&bkash=success`);
        } else {
            throw new Error('Payment not completed');
        }
    } catch (error) {
        console.error('Error processing bKash callback:', error);
        const campaignId = req.params.id;
        res.redirect(`/campaigns/${campaignId}?payment=failed&error=verification_failed`);
    }
};
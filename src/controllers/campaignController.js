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
        campaignData.daysRemaining = campaign.daysRemaining;
        
        // Check if user has donated to this campaign
        const hasDonated = req.user && campaign.backers.some(backer => 
            backer.user && backer.user._id.toString() === req.user._id.toString()
        );
        
        // Track page view (fire-and-forget, don't await)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        Campaign.updateOne({ _id: campaign._id, 'viewsByDay.date': today },
            { $inc: { views: 1, 'viewsByDay.$.count': 1 } }
        ).then(result => {
            if (result.modifiedCount === 0) {
                Campaign.updateOne({ _id: campaign._id }, 
                    { $inc: { views: 1 }, $push: { viewsByDay: { date: today, count: 1 } } }
                ).exec();
            }
        }).catch(err => console.error('Failed to track view:', err));
        
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
        campaignData.daysRemaining = campaign.daysRemaining;
        
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
        campaignData.daysRemaining = campaign.daysRemaining;
        
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
        if (isNaN(donationAmount) || donationAmount < 100) {
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
        const backerData = {
            user: req.user._id,
            amount: donationAmount,
            message: message || '',
            bkashNumberLast4: bkashNumber.slice(-4), // Store only last 4 digits
            transactionId: null // Placeholder for future bKash API integration
        };
        
        // Add selected reward if provided
        const { selectedRewardId } = req.body;
        if (selectedRewardId) {
            // Verify reward exists and is available
            const reward = campaign.rewards.id(selectedRewardId);
            if (reward && (!reward.limitedQuantity || reward.claimedCount < reward.limitedQuantity)) {
                backerData.selectedRewardId = selectedRewardId;
                reward.claimedCount += 1;
            }
        }
        
        campaign.backers.push(backerData);
        
        campaign.currentFunding += donationAmount;
        
        // Check if funding goal is reached
        if (campaign.currentFunding >= campaign.fundingGoal) {
            campaign.status = 'completed';
        }
        
        // Check and process milestones
        const prevPct = Math.floor(((campaign.currentFunding - donationAmount) / campaign.fundingGoal) * 100);
        const newPct = Math.floor((campaign.currentFunding / campaign.fundingGoal) * 100);
        
        let milestoneReached = false;
        for (const ms of campaign.milestones) {
            if (!ms.reachedAt && ms.percentage <= newPct && ms.percentage > prevPct) {
                ms.reachedAt = new Date();
                ms.notificationSent = false; // Queue for notification
                milestoneReached = true;
                
                // Send milestone notification to all backers
                const uniqueBackerEmails = [...new Set(
                    campaign.backers
                        .map(b => b.user?.email)
                        .filter(Boolean)
                )];
                
                if (uniqueBackerEmails.length > 0) {
                    const emailPromises = uniqueBackerEmails.map(email => {
                        return emailService.sendMilestoneReached(email, campaign, ms)
                            .catch(err => console.error(`Failed to send milestone email to ${email}:`, err));
                    });
                    
                    Promise.all(emailPromises).then(() => {
                        ms.notificationSent = true;
                        campaign.save().catch(console.error);
                    }).catch(console.error);
                } else {
                    ms.notificationSent = true;
                }
            }
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
        
        // Broadcast live donation update via WebSocket
        try {
            const server = require('../../server');
            if (server.broadcastDonation) {
                server.broadcastDonation(campaignId, {
                    type: 'donation',
                    amount: donationAmount,
                    donor: donor.username || 'Anonymous',
                    newTotal: updatedCampaign.currentFunding,
                    percentage: updatedCampaign.fundingPercentage
                });
            }
        } catch (err) {
            console.error('Failed to broadcast donation:', err);
        }
        
        console.log(`Donation of ${donationAmount} BDT processed for campaign ${campaign.title}`);
        
        // Redirect to campaign page with success flag (POST-Redirect-GET pattern)
        let redirectUrl = `/campaigns/${campaignId}?donated=true`;
        if (milestoneReached) {
            redirectUrl += '&milestone=true';
        }
        res.redirect(redirectUrl);
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
        const { q, category, university, sort, page } = req.query;
        
        // Pagination settings
        const currentPage = parseInt(page) || 1;
        const pageSize = 9; // Show 9 campaigns per page
        const skip = (currentPage - 1) * pageSize;
        
        // Get unique universities for filter dropdown
        const universities = await User.distinct('university');
        
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
                    query = { _id: { $in: textSearch.map(c => c._id) }, status: 'active' };
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
        
        // Filter by university if selected
        if (university && university !== 'all') {
            query['creator.university'] = university;
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
            universities: universities,
            currentPage: 'explore',
            searchQuery: q || '',
            searchCategory: category || 'all',
            searchUniversity: university || '',
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
            
            // Check if this payment was already processed (prevent double-donation)
            const alreadyProcessed = campaign.backers.some(backer => 
                backer.bkashPaymentID === paymentID
            );
            if (alreadyProcessed) {
                console.log('Duplicate bKash callback detected for paymentID:', paymentID);
                return res.redirect(`/campaigns/${campaignId}?donated=true&bkash=duplicate`);
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
            
            // Broadcast live donation update via WebSocket
            try {
                const server = require('../../server');
                if (server.broadcastDonation) {
                    server.broadcastDonation(campaignId, {
                        type: 'donation',
                        amount: parseFloat(paymentResult.amount),
                        donor: donor.username || 'Anonymous',
                        newTotal: campaign.currentFunding,
                        percentage: campaign.fundingPercentage
                    });
                }
            } catch (err) {
                console.error('Failed to broadcast donation:', err);
            }
            
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

// Get campaign analytics
exports.getCampaignAnalytics = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('creator', 'username university profileImage')
            .populate('backers.user', 'username university');
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Check if user owns this campaign
        if (String(campaign.creator._id) !== String(req.user._id)) {
            return res.status(403).render('pages/error', {
                title: 'Access Denied - FundMyIdea BD',
                error: 'You can only view analytics for your own campaigns',
                user: req.user
            });
        }
        
        // Compute analytics for last 30 days
        const last30Days = [...Array(30)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });
        
        const donationsByDay = last30Days.map(day => {
            const next = new Date(day);
            next.setDate(next.getDate() + 1);
            const dayDonations = campaign.backers.filter(b => 
                new Date(b.donatedAt) >= day && new Date(b.donatedAt) < next
            );
            return {
                date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                amount: dayDonations.reduce((sum, b) => sum + b.amount, 0),
                count: dayDonations.length
            };
        });
        
        // University breakdown
        const universityBreakdown = campaign.backers.reduce((acc, b) => {
            const uni = b.user?.university || 'Unknown';
            acc[uni] = (acc[uni] || 0) + b.amount;
            return acc;
        }, {});
        
        // Convert to array for chart
        const universityData = Object.entries(universityBreakdown).map(([name, amount]) => ({
            name,
            amount
        }));
        
        // Calculate conversion rate
        const conversionRate = campaign.views > 0 
            ? ((campaign.backers.length / campaign.views) * 100).toFixed(2) 
            : 0;
        
        // Calculate average donation
        const avgDonation = campaign.backers.length > 0 
            ? Math.round(campaign.currentFunding / campaign.backers.length) 
            : 0;
        
        res.render('pages/campaign-analytics', {
            title: `Analytics - ${campaign.title} - FundMyIdea BD`,
            campaign,
            donationsByDay,
            universityData,
            conversionRate,
            avgDonation,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading analytics:', error);
        res.status(500).render('pages/error', {
            title: 'Error - FundMyIdea BD',
            error: 'Failed to load analytics',
            user: req.user
        });
    }
};

// Post campaign update
exports.postCampaignUpdate = async (req, res) => {
    try {
        const { title, content } = req.body;
        
        // Validate required fields
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const campaign = await Campaign.findById(req.params.id)
            .populate('backers.user', 'email username');
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        // Check if user owns this campaign
        if (String(campaign.creator._id) !== String(req.user._id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        // Add update to campaign
        campaign.updates.push({ title, content });
        await campaign.save();
        
        // Email all unique backers about the update
        const uniqueEmails = [...new Set(
            campaign.backers
                .map(b => b.user?.email)
                .filter(Boolean)
        )];
        
        if (uniqueEmails.length > 0) {
            const emailPromises = uniqueEmails.map(email => {
                return emailService.sendCampaignUpdate(email, campaign, title, content)
                    .catch(err => console.error(`Failed to send update email to ${email}:`, err));
            });
            
            // Don't wait for emails to send (fire-and-forget)
            Promise.all(emailPromises).catch(console.error);
        }
        
        console.log(`Update posted to campaign ${campaign.title}`);
        res.redirect(`/campaigns/${campaign._id}?updated=true`);
    } catch (error) {
        console.error('Error posting campaign update:', error);
        res.status(500).json({ error: 'Failed to post update' });
    }
};

// Get campaign updates
exports.getCampaignUpdates = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).render('pages/404', {
                title: 'Campaign Not Found - FundMyIdea BD',
                user: req.user
            });
        }
        
        // Sort updates by most recent first
        const sortedUpdates = campaign.updates.slice().sort((a, b) => 
            new Date(b.postedAt) - new Date(a.postedAt)
        );
        
        res.json({
            success: true,
            updates: sortedUpdates
        });
    } catch (error) {
        console.error('Error fetching updates:', error);
        res.status(500).json({ error: 'Failed to fetch updates' });
    }
};

// Request campaign deadline extension
exports.requestExtension = async (req, res) => {
    try {
        const { newDeadline, reason } = req.body;
        const campaignId = req.params.id;
        
        // Validate input
        if (!newDeadline || !reason) {
            return res.status(400).json({
                success: false,
                error: 'New deadline and reason are required'
            });
        }
        
        const campaign = await Campaign.findById(campaignId);
        
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }
        
        // Check ownership
        if (String(campaign.creator._id) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                error: 'Only campaign creator can request extension'
            });
        }
        
        // Validation rules
        if (campaign.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Only active campaigns can request extension'
            });
        }
        
        const daysUntilDeadline = (campaign.deadline - new Date()) / (1000 * 60 * 60 * 24);
        if (daysUntilDeadline > 3) {
            return res.status(400).json({
                success: false,
                error: 'Extension can only be requested within 3 days of deadline'
            });
        }
        
        if (campaign.extensionRequest && campaign.extensionRequest.approved) {
            return res.status(400).json({
                success: false,
                error: 'This campaign already has an approved extension'
            });
        }
        
        const fundingPercentage = (campaign.currentFunding / campaign.fundingGoal) * 100;
        if (fundingPercentage < 25) {
            return res.status(400).json({
                success: false,
                error: 'Campaign must have at least 25% funding to request extension'
            });
        }
        
        // Auto-approve if > 50% funded and < 48 hours to deadline
        const shouldAutoApprove = fundingPercentage > 50 && daysUntilDeadline < 2;
        
        campaign.extensionRequest = {
            requested: true,
            requestedAt: new Date(),
            newDeadline: new Date(newDeadline),
            approved: shouldAutoApprove,
            reason
        };
        
        await campaign.save();
        
        // Send email notification for manual review
        if (!shouldAutoApprove) {
            emailService.sendExtensionRequest(campaign, reason, newDeadline).catch(console.error);
        }
        
        res.json({
            success: true,
            message: shouldAutoApprove ? 'Extension automatically approved!' : 'Extension request submitted for review',
            approved: shouldAutoApprove,
            newDeadline
        });
        
    } catch (error) {
        console.error('Error requesting extension:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process extension request'
        });
    }
};

// Toggle save campaign to wishlist
exports.toggleSaveCampaign = async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const campaignId = req.params.id;
        const idx = user.savedCampaigns.indexOf(campaignId);
        
        if (idx > -1) {
            // Already saved, so remove it
            user.savedCampaigns.splice(idx, 1);
        } else {
            // Not saved yet, so add it
            user.savedCampaigns.push(campaignId);
        }
        
        await user.save();
        
        res.json({
            success: true,
            saved: idx === -1 // true if we just saved it, false if we unsaved it
        });
        
    } catch (error) {
        console.error('Error toggling saved campaign:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle saved campaign'
        });
    }
};
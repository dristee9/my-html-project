const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Create transporter with SMTP configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Email templates
const templates = {
    welcome: (user) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to FundMyIdea BD! <i class="fa fa-trophy"></i></h1>
                </div>
                <div class="content">
                    <p>Hi ${user.username},</p>
                    <p>Welcome to FundMyIdea BD - the student crowdfunding platform! We're excited to have you join our community of innovators and changemakers.</p>
                    <p>With FundMyIdea BD, you can:</p>
                    <ul>
                        <li>Create campaigns to fund your innovative ideas</li>
                        <li>Support fellow students' projects</li>
                        <li>Track your contributions and campaign progress</li>
                        <li>Connect with a community of like-minded students</li>
                    </ul>
                    <p>Ready to get started?</p>
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
                    <p style="margin-top: 30px;">Best regards,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,

    donationConfirmation: (donor, campaign, amount, trxID) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
                .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Your Donation! 💚</h1>
                </div>
                <div class="content">
                    <p>Dear ${donor.username},</p>
                    <p>Thank you so much for your generous contribution to <strong>"${campaign.title}"</strong>. Your support means the world to ${campaign.creator.username} and helps bring this innovative idea closer to reality!</p>
                    
                    <div class="details">
                        <h3>Donation Details</h3>
                        <p><strong>Campaign:</strong> ${campaign.title}</p>
                        <p><strong>Amount:</strong> ৳${amount} BDT</p>
                        <p><strong>Transaction ID:</strong> ${trxID || 'N/A'}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    
                    <p>You're making a real difference in supporting student innovation in Bangladesh. Together, we're building a future where great ideas can flourish!</p>
                    
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/campaigns/${campaign._id}" class="button">View Campaign</a>
                    
                    <p style="margin-top: 30px;">With gratitude,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,

    passwordReset: (user, resetToken) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request 🔐</h1>
                </div>
                <div class="content">
                    <p>Hi ${user.username},</p>
                    <p>We received a request to reset your password for your FundMyIdea BD account.</p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
                    </div>
                    
                    <p>To reset your password, click the button below:</p>
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/reset-password/${resetToken}" class="button">Reset Password</a>
                    
                    <p style="margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #2563eb;">${process.env.APP_URL || 'http://localhost:3000'}/reset-password/${resetToken}</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,

    emailVerification: (user, verificationToken) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verify Your Email Address 📧</h1>
                </div>
                <div class="content">
                    <p>Hi ${user.username},</p>
                    <p>Thanks for registering with FundMyIdea BD! To complete your registration and start exploring amazing student projects, please verify your email address.</p>
                    
                    <p>Click the button below to verify your email:</p>
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/verify-email/${verificationToken}" class="button">Verify Email</a>
                    
                    <p style="margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #8b5cf6;">${process.env.APP_URL || 'http://localhost:3000'}/verify-email/${verificationToken}</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,

    campaignUpdate: (campaign, title, content) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .update-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📢 New Update from Campaign!</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Great news! <strong>${campaign.creator.username}</strong> has posted a new update to the campaign you're supporting:</p>
                    
                    <div class="update-box">
                        <h2 style="color: #f59e0b; margin-bottom: 10px;">${title}</h2>
                        <p style="white-space: pre-wrap; line-height: 1.8;">${content}</p>
                    </div>
                    
                    <p>Your continued support makes a difference! Check out the full campaign page to see all updates and progress.</p>
                    
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/campaigns/${campaign._id}" class="button">View Campaign Page</a>
                    
                    <p style="margin-top: 30px;">Thank you for being part of this journey!<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,

    milestoneReached: (campaign, milestone) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .milestone-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center; }
                .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0; }
                .progress-fill { background: linear-gradient(90deg, #10b981, #34d399); height: 100%; width: ${campaign.fundingPercentage}%; transition: width 0.5s ease; }
                .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                .confetti { font-size: 2rem; margin: 0 0.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1><i class="fa fa-trophy"></i> Milestone Reached!</h1>
                    <div style="font-size: 3rem; margin-top: 1rem;">
                        <span class="confetti">🎊</span>
                        <span class="confetti">🎈</span>
                        <span class="confetti">🎁</span>
                    </div>
                </div>
                <div class="content">
                    <p>Congratulations! Thanks to supporters like you, <strong>"${campaign.title}"</strong> has reached an exciting milestone!</p>
                    
                    <div class="milestone-box">
                        <h2 style="color: #10b981; margin-bottom: 10px; font-size: 1.5rem;">${milestone.title || milestone.percentage + '% Funded!'}</h2>
                        ${milestone.description ? `<p style="color: #6b7280; line-height: 1.6;">${milestone.description}</p>` : ''}
                        <div style="margin-top: 20px;">
                            <div style="font-size: 2.5rem; font-weight: 700; color: #10b981;">${campaign.fundingPercentage}%</div>
                            <div style="color: #6b7280; font-size: 0.875rem;">of funding goal reached</div>
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    
                    <p style="text-align: center; margin: 20px 0;"><strong>Current Funding:</strong> ৳${campaign.currentFunding.toLocaleString()} BDT / ৳${campaign.fundingGoal.toLocaleString()} BDT</p>
                    
                    <p>Your support has helped bring this project closer to reality! Let's keep the momentum going and help ${campaign.creator.username} reach the ultimate goal.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/campaigns/${campaign._id}" class="button">View Campaign Progress</a>
                    </div>
                    
                    <p style="margin-top: 30px; text-align: center;">Together, we're making student innovation happen!<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,

    extensionRequest: (campaign, reason, newDeadline) => `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 Extension Request Received</h1>
                </div>
                <div class="content">
                    <p>A campaign creator has requested a deadline extension:</p>
                    
                    <div class="info-box">
                        <h2 style="color: #f59e0b; margin-bottom: 10px;">${campaign.title}</h2>
                        <p><strong>Creator:</strong> ${campaign.creator.username}</p>
                        <p><strong>Current Deadline:</strong> ${new Date(campaign.deadline).toLocaleDateString()}</p>
                        <p><strong>Requested New Deadline:</strong> ${new Date(newDeadline).toLocaleDateString()}</p>
                        <p><strong>Funding Progress:</strong> ৳${campaign.currentFunding.toLocaleString()} / ৳${campaign.fundingGoal.toLocaleString()} (${campaign.fundingPercentage}%)</p>
                        <p style="margin-top: 15px;"><strong>Reason:</strong></p>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${reason}</p>
                    </div>
                    
                    <p>Please review this extension request and take appropriate action.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">View Dashboard</a>
                    </div>
                    
                    <p style="margin-top: 30px;">The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `
};

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(user) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to FundMyIdea BD! 🎉',
            html: templates.welcome(user)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${user.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send donation confirmation email
 */
async function sendDonationConfirmation(donor, campaign, amount, trxID = null) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: donor.email,
            subject: `Thank you for your donation! 💚`,
            html: templates.donationConfirmation(donor, campaign, amount, trxID)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Donation confirmation email sent to ${donor.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending donation confirmation email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, resetToken) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request 🔐',
            html: templates.passwordReset(user, resetToken)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${user.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send email verification email
 */
async function sendEmailVerification(user, verificationToken) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Verify Your Email Address 📧',
            html: templates.emailVerification(user, verificationToken)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email verification sent to ${user.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending verification email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send campaign update notification to backers
 */
async function sendCampaignUpdate(backerEmail, campaign, title, content) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: backerEmail,
            subject: `📢 New Update: ${campaign.title}`,
            html: templates.campaignUpdate(campaign, title, content)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Campaign update email sent to ${backerEmail}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending campaign update email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send milestone reached notification to backers
 */
async function sendMilestoneReached(backerEmail, campaign, milestone) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: backerEmail,
            subject: `🎉 Milestone Reached: ${campaign.title} is ${milestone.percentage}% funded!`,
            html: templates.milestoneReached(campaign, milestone)
        };

        await transporter.sendMail(mailOptions);
        console.log(`Milestone notification sent to ${backerEmail}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending milestone notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send campaign extension request notification to admin
 */
async function sendExtensionRequest(campaign, reason, newDeadline) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"FundMyIdea BD" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: `📋 Extension Request: ${campaign.title}`,
            html: templates.extensionRequest(campaign, reason, newDeadline)
        };

        await transporter.sendMail(mailOptions);
        console.log('Extension request notification sent to admin');
        return { success: true };
    } catch (error) {
        console.error('Error sending extension request notification:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendWelcomeEmail,
    sendDonationConfirmation,
    sendPasswordResetEmail,
    sendEmailVerification,
    sendCampaignUpdate,
    sendMilestoneReached,
    sendExtensionRequest
};

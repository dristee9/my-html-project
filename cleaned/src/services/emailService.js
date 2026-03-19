let a=require('nodemailer'),b=require('path'),d={welcome:A=>`
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
                    <h1>Welcome to FundMyIdea BD! 🎉</h1>
                </div>
                <div class="content">
                    <p>Hi ${A.username},</p>
                    <p>Welcome to FundMyIdea BD - the student crowdfunding platform! We're excited to have you join our community of innovators and changemakers.</p>
                    <p>With FundMyIdea BD, you can:</p>
                    <ul>
                        <li>Create campaigns to fund your innovative ideas</li>
                        <li>Support fellow students' projects</li>
                        <li>Track your contributions and campaign progress</li>
                        <li>Connect with a community of like-minded students</li>
                    </ul>
                    <p>Ready to get started?</p>
                    <a href="${process.env.APP_URL||'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
                    <p style="margin-top: 30px;">Best regards,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,donationConfirmation:(_,B,C,D)=>`
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
                    <p>Dear ${_.username},</p>
                    <p>Thank you so much for your generous contribution to <strong>"${B.title}"</strong>. Your support means the world to ${B.creator.username} and helps bring this innovative idea closer to reality!</p>
                    
                    <div class="details">
                        <h3>Donation Details</h3>
                        <p><strong>Campaign:</strong> ${B.title}</p>
                        <p><strong>Amount:</strong> ৳${C} BDT</p>
                        <p><strong>Transaction ID:</strong> ${D||'N/A'}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    
                    <p>You're making a real difference in supporting student innovation in Bangladesh. Together, we're building a future where great ideas can flourish!</p>
                    
                    <a href="${process.env.APP_URL||'http://localhost:3000'}/campaigns/${B._id}" class="button">View Campaign</a>
                    
                    <p style="margin-top: 30px;">With gratitude,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,passwordReset:(_a,_b)=>`
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
                    <p>Hi ${_a.username},</p>
                    <p>We received a request to reset your password for your FundMyIdea BD account.</p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
                    </div>
                    
                    <p>To reset your password, click the button below:</p>
                    <a href="${process.env.APP_URL||'http://localhost:3000'}/reset-password/${_b}" class="button">Reset Password</a>
                    
                    <p style="margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #2563eb;">${process.env.APP_URL||'http://localhost:3000'}/reset-password/${_b}</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,emailVerification:(_A,_B)=>`
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
                    <p>Hi ${_A.username},</p>
                    <p>Thanks for registering with FundMyIdea BD! To complete your registration and start exploring amazing student projects, please verify your email address.</p>
                    
                    <p>Click the button below to verify your email:</p>
                    <a href="${process.env.APP_URL||'http://localhost:3000'}/verify-email/${_B}" class="button">Verify Email</a>
                    
                    <p style="margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #8b5cf6;">${process.env.APP_URL||'http://localhost:3000'}/verify-email/${_B}</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,campaignUpdate:(E,aA,_c)=>`
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
                    <p>Great news! <strong>${E.creator.username}</strong> has posted a new update to the campaign you're supporting:</p>
                    
                    <div class="update-box">
                        <h2 style="color: #f59e0b; margin-bottom: 10px;">${aA}</h2>
                        <p style="white-space: pre-wrap; line-height: 1.8;">${_c}</p>
                    </div>
                    
                    <p>Your continued support makes a difference! Check out the full campaign page to see all updates and progress.</p>
                    
                    <a href="${process.env.APP_URL||'http://localhost:3000'}/campaigns/${E._id}" class="button">View Campaign Page</a>
                    
                    <p style="margin-top: 30px;">Thank you for being part of this journey!<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,milestoneReached:(aB,aC)=>`
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
                .progress-fill { background: linear-gradient(90deg, #10b981, #34d399); height: 100%; width: ${aB.fundingPercentage}%; transition: width 0.5s ease; }
                .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                .confetti { font-size: 2rem; margin: 0 0.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Milestone Reached!</h1>
                    <div style="font-size: 3rem; margin-top: 1rem;">
                        <span class="confetti">🎊</span>
                        <span class="confetti">🎈</span>
                        <span class="confetti">🎁</span>
                    </div>
                </div>
                <div class="content">
                    <p>Congratulations! Thanks to supporters like you, <strong>"${aB.title}"</strong> has reached an exciting milestone!</p>
                    
                    <div class="milestone-box">
                        <h2 style="color: #10b981; margin-bottom: 10px; font-size: 1.5rem;">${aC.title||aC.percentage+'% Funded!'}</h2>
                        ${aC.description?`<p style="color: #6b7280; line-height: 1.6;">${aC.description}</p>`:''}
                        <div style="margin-top: 20px;">
                            <div style="font-size: 2.5rem; font-weight: 700; color: #10b981;">${aB.fundingPercentage}%</div>
                            <div style="color: #6b7280; font-size: 0.875rem;">of funding goal reached</div>
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    
                    <p style="text-align: center; margin: 20px 0;"><strong>Current Funding:</strong> ৳${aB.currentFunding.toLocaleString()} BDT / ৳${aB.fundingGoal.toLocaleString()} BDT</p>
                    
                    <p>Your support has helped bring this project closer to reality! Let's keep the momentum going and help ${aB.creator.username} reach the ultimate goal.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.APP_URL||'http://localhost:3000'}/campaigns/${aB._id}" class="button">View Campaign Progress</a>
                    </div>
                    
                    <p style="margin-top: 30px; text-align: center;">Together, we're making student innovation happen!<br>The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `,extensionRequest:(aD,aE,_C)=>`
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
                        <h2 style="color: #f59e0b; margin-bottom: 10px;">${aD.title}</h2>
                        <p><strong>Creator:</strong> ${aD.creator.username}</p>
                        <p><strong>Current Deadline:</strong> ${new Date(aD.deadline).toLocaleDateString()}</p>
                        <p><strong>Requested New Deadline:</strong> ${new Date(_C).toLocaleDateString()}</p>
                        <p><strong>Funding Progress:</strong> ৳${aD.currentFunding.toLocaleString()} / ৳${aD.fundingGoal.toLocaleString()} (${aD.fundingPercentage}%)</p>
                        <p style="margin-top: 15px;"><strong>Reason:</strong></p>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${aE}</p>
                    </div>
                    
                    <p>Please review this extension request and take appropriate action.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.APP_URL||'http://localhost:3000'}/dashboard" class="button">View Dashboard</a>
                    </div>
                    
                    <p style="margin-top: 30px;">The FundMyIdea BD Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} FundMyIdea BD. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `};require('dotenv').config();let c=()=>a.createTransport({host:process.env.EMAIL_HOST||'smtp.gmail.com',port:process.env.EMAIL_PORT||587,secure:!1,auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});async function e(aF){try{let aG=c();await aG.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:aF.email,subject:'Welcome to FundMyIdea BD! 🎉',html:d.welcome(aF)});console.log(`Welcome email sent to ${aF.email}`);return{success:!0}}catch(aH){console.error('Error sending welcome email:',aH);return{success:!1,error:aH.message}}}async function f(aI,aJ,aK,_d=null){try{let aL=c();await aL.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:aI.email,subject:`Thank you for your donation! 💚`,html:d.donationConfirmation(aI,aJ,aK,_d)});console.log(`Donation confirmation email sent to ${aI.email}`);return{success:!0}}catch(aM){console.error('Error sending donation confirmation email:',aM);return{success:!1,error:aM.message}}}async function g(aN,aO){try{let aP=c();await aP.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:aN.email,subject:'Password Reset Request 🔐',html:d.passwordReset(aN,aO)});console.log(`Password reset email sent to ${aN.email}`);return{success:!0}}catch(aQ){console.error('Error sending password reset email:',aQ);return{success:!1,error:aQ.message}}}async function h(aR,aS){try{let aT=c();await aT.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:aR.email,subject:'Verify Your Email Address 📧',html:d.emailVerification(aR,aS)});console.log(`Email verification sent to ${aR.email}`);return{success:!0}}catch(aU){console.error('Error sending verification email:',aU);return{success:!1,error:aU.message}}}async function i(aV,aW,aX,_D){try{let aY=c();await aY.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:aV,subject:`📢 New Update: ${aW.title}`,html:d.campaignUpdate(aW,aX,_D)});console.log(`Campaign update email sent to ${aV}`);return{success:!0}}catch(aZ){console.error('Error sending campaign update email:',aZ);return{success:!1,error:aZ.message}}}async function j(bA,bB,bC){try{let bD=c();await bD.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:bA,subject:`🎉 Milestone Reached: ${bB.title} is ${bC.percentage}% funded!`,html:d.milestoneReached(bB,bC)});console.log(`Milestone notification sent to ${bA}`);return{success:!0}}catch(bE){console.error('Error sending milestone notification:',bE);return{success:!1,error:bE.message}}}async function k(bF,bG,bH){try{let bI=c();await bI.sendMail({from:`"FundMyIdea BD" <${process.env.EMAIL_FROM||process.env.EMAIL_USER}>`,to:process.env.ADMIN_EMAIL||process.env.EMAIL_USER,subject:`📋 Extension Request: ${bF.title}`,html:d.extensionRequest(bF,bG,bH)});console.log('Extension request notification sent to admin');return{success:!0}}catch(bJ){console.error('Error sending extension request notification:',bJ);return{success:!1,error:bJ.message}}}module.exports={sendWelcomeEmail:e,sendDonationConfirmation:f,sendPasswordResetEmail:g,sendEmailVerification:h,sendCampaignUpdate:i,sendMilestoneReached:j,sendExtensionRequest:k};

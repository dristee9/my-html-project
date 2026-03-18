const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            // Check if this is an AJAX/API request
            if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
            }
            return res.redirect('/login');
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            // Check if this is an AJAX/API request
            if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
            }
            return res.redirect('/login');
        }
        
        req.user = user;
        
        // Check if email is verified (except for verification and auth routes)
        // Only enforce for users who have the emailVerified field set to false
        const shouldVerifyEmail = user.emailVerified === false;
        const isExcludedRoute = req.path.startsWith('/verify-email') || 
                                req.path.startsWith('/resend-verification') ||
                                req.path === '/logout';
        
        if (shouldVerifyEmail && !isExcludedRoute) {
            // Store user info in session for resend verification
            req.session.pendingUser = user._id.toString();
            
            // Check if this is an AJAX/API request
            if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(403).json({ error: 'Email not verified', redirect: '/verify-email-pending' });
            }
            return res.redirect('/verify-email-pending');
        }
        
        // Implement sliding window token refresh
        // Refresh token if less than 1 day remaining (tokens are valid for 7 days)
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        const oneDayInSeconds = 24 * 60 * 60;
        
        if (timeUntilExpiry < oneDayInSeconds && timeUntilExpiry > 0) {
            // Token is still valid but expiring soon, issue new token
            const newToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            // Set new token in cookie
            res.cookie('token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });
        }
        
        next();
    } catch (error) {
        // Check if this is an AJAX/API request
        if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
        }
        res.redirect('/login');
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            req.user = user;
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = { authenticateToken, optionalAuth };
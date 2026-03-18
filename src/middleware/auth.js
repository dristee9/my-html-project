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
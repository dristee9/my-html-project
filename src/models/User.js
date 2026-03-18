const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    university: {
        type: String,
        required: [true, 'University is required'],
        enum: ['BUET', 'Dhaka University', 'North South University', 'BRAC University', 'Other']
    },
    profileImage: {
        type: String,
        default: '/images/default-profile.png'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = async function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token using bcrypt for extra security
    this.resetPasswordToken = await bcrypt.hash(resetToken, 12);
    this.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    
    return resetToken; // Return unhashed token for email link
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = async function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token using bcrypt
    this.emailVerificationToken = await bcrypt.hash(verificationToken, 12);
    
    return verificationToken; // Return unhashed token for email link
};

// Verify email verification token
userSchema.statics.verifyEmailToken = async function(hashedToken, verificationToken) {
    return await bcrypt.compare(verificationToken, hashedToken);
};

module.exports = mongoose.model('User', userSchema);
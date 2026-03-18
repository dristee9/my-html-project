const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Campaign title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Campaign description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Technology', 'Education', 'Social Impact', 'Arts & Culture', 'Research', 'Other']
    },
    fundingGoal: {
        type: Number,
        required: [true, 'Funding goal is required'],
        min: [1000, 'Minimum funding goal is 1000 BDT'],
        max: [1000000, 'Maximum funding goal is 1,000,000 BDT']
    },
    currentFunding: {
        type: Number,
        default: 0,
        min: 0
    },
    deadline: {
        type: Date,
        required: [true, 'Deadline is required'],
        validate: {
            validator: function(date) {
                return date > Date.now();
            },
            message: 'Deadline must be in the future'
        }
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    imageUrl: {
        type: String,
        default: '/images/default-campaign.jpg'
    },
    // Page Builder Data
    pageBuilder: {
        enabled: {
            type: Boolean,
            default: false
        },
        sections: [{
            id: String,
            type: {
                type: String,
                enum: ['hero', 'text', 'image', 'gallery', 'video', 'features', 'testimonials', 'faq', 'cta', 'form', 'divider', 'custom']
            },
            content: mongoose.Schema.Types.Mixed,
            settings: {
                backgroundColor: String,
                textColor: String,
                padding: {
                    top: { type: Number, default: 20 },
                    bottom: { type: Number, default: 20 },
                    left: { type: Number, default: 20 },
                    right: { type: Number, default: 20 }
                },
                margin: {
                    top: { type: Number, default: 0 },
                    bottom: { type: Number, default: 0 }
                },
                borderRadius: { type: Number, default: 0 },
                boxShadow: String,
                customClass: String
            },
            order: Number
        }],
        globalStyles: {
            fontFamily: String,
            primaryColor: String,
            secondaryColor: String,
            accentColor: String,
            backgroundColor: String
        },
        customCSS: String,
        versionHistory: [{
            version: Number,
            data: mongoose.Schema.Types.Mixed,
            createdAt: { type: Date, default: Date.now },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }]
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'completed', 'expired', 'cancelled', 'draft']
    },
    backers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        amount: Number,
        message: String,
        bkashNumberLast4: String, // Store only last 4 digits for privacy
        transactionId: String, // For future bKash API integration
        donatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Virtual for funding percentage
campaignSchema.virtual('fundingPercentage').get(function() {
    return Math.min(Math.round((this.currentFunding / this.fundingGoal) * 100), 100);
});

// Virtual for days remaining
campaignSchema.virtual('daysRemaining').get(function() {
    const diffTime = this.deadline - Date.now();
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
});

// Virtual for days left text
campaignSchema.virtual('daysLeftText').get(function() {
    const days = this.daysRemaining;
    if (days === 0) return 'Last day';
    if (days === 1) return '1 day left';
    return `${days} days left`;
});

// Index for better querying
campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
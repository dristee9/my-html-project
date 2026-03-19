const mongoose = require('mongoose');

const campaignVersionSchema = new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true,
        index: true
    },
    version: {
        type: Number,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7776000 // Auto-expire after 90 days (optional cleanup)
    }
}, {
    timestamps: true
});

// Compound index for efficient version queries
campaignVersionSchema.index({ campaign: 1, version: -1 });

// Static method to get all versions for a campaign
campaignVersionSchema.statics.findByCampaign = function(campaignId) {
    return this.find({ campaign: campaignId }).sort('-version').lean();
};

// Static method to get a specific version
campaignVersionSchema.statics.getVersion = function(campaignId, version) {
    return this.findOne({ campaign: campaignId, version: version }).lean();
};

// Static method to get latest version number
campaignVersionSchema.statics.getLatestVersion = async function(campaignId) {
    const latest = await this.findOne({ campaign: campaignId }).sort('-version').select('version').lean();
    return latest ? latest.version : 0;
};

// Instance method to save new version - optimized to reduce N+1 queries
campaignVersionSchema.methods.saveVersion = async function() {
    const saved = await this.save();
    
    // Optional: Keep only last 20 versions to prevent unbounded growth
    // Optimized: Fetch only IDs, skip first 20, delete in one operation
    const oldVersions = await this.constructor
        .find({ campaign: this.campaign })
        .sort('-version')
        .skip(20)
        .select('_id')
        .lean();
    
    if (oldVersions.length > 0) {
        await this.constructor.deleteMany({ 
            _id: { $in: oldVersions.map(v => v._id) } 
        });
    }
    
    return saved;
};

module.exports = mongoose.model('CampaignVersion', campaignVersionSchema);

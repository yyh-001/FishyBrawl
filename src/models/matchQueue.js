const mongoose = require('mongoose');

const matchQueueSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['matching', 'matched', 'cancelled'],
        default: 'matching'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5分钟后自动删除
    }
});

module.exports = mongoose.model('MatchQueue', matchQueueSchema); 
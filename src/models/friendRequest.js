const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        maxLength: 100
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7 * 24 * 60 * 60 // 7天后自动删除
    }
});

// 索引优化查询
friendRequestSchema.index({ fromUser: 1, toUser: 1, status: 1 });
friendRequestSchema.index({ toUser: 1, status: 1 });
friendRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema); 
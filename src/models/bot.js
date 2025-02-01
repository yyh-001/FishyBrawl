const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
    botId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 1000
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // 1小时后自动删除
    }
});

module.exports = mongoose.model('Bot', botSchema); 
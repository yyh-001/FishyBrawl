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
    availableHeroes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hero'
    }],
    selectedHero: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hero'
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // 1小时后自动删除
    }
});

// 添加索引
botSchema.index({ botId: 1 });
botSchema.index({ roomId: 1 });
botSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('Bot', botSchema); 
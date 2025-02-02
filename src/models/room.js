const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    maxPlayers: {
        type: Number,
        required: true,
        default: 8
    },
    players: [{
        userId: {
            type: String,
            required: true,
        },
        username: String,
        ready: {
            type: Boolean,
            default: false
        },
        isBot: {
            type: Boolean,
            default: false
        },
        availableHeroes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hero'
        }],
        selectedHero: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hero'
        },
        health: {
            type: Number,
            default: 40
        },
        coins: {
            type: Number,
            default: 3
        },
        tavernTier: {
            type: Number,
            default: 1
        },
        board: [{
            type: Object
        }],
        shopMinions: [{
            type: Object
        }],
        hand: [{
            type: Object
        }],
        heroPowerUsed: {
            type: Boolean,
            default: false
        },
        eliminated: {
            type: Boolean,
            default: false
        }
    }],
    status: {
        type: String,
        enum: ['waiting', 'selecting', 'playing', 'finished'],
        default: 'waiting'
    },
    phase: {
        type: String,
        enum: ['preparation', 'combat'],
        default: 'preparation'
    },
    isMatchRoom: {
        type: Boolean,
        default: false,
        index: true
    },
    turn: {
        type: Number,
        default: 1
    },
    winner: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // 1小时后自动删除
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 更新时间中间件
roomSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// 状态转换验证
roomSchema.pre('save', function(next) {
    // 状态转换规则
    const validTransitions = {
        waiting: ['selecting'],
        selecting: ['playing'],
        playing: ['finished'],
        finished: []
    };

    // 如果状态发生变化，验证转换是否有效
    if (this.isModified('status')) {
        const oldStatus = this._original ? this._original.status : 'waiting';
        const newStatus = this.status;

        if (!validTransitions[oldStatus].includes(newStatus)) {
            next(new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`));
            return;
        }
    }

    // 如果是游戏进行中状态，phase 必须是 preparation 或 combat
    if (this.status === 'playing' && !['preparation', 'combat'].includes(this.phase)) {
        next(new Error('Invalid phase for playing status'));
        return;
    }

    next();
});

// 保存原始状态用于验证
roomSchema.pre('save', function(next) {
    if (this.isNew) {
        this._original = {};
    } else {
        this._original = this.toObject();
    }
    next();
});

// 索引
roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });
roomSchema.index({ status: 1 });
roomSchema.index({ isMatchRoom: 1 });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    maxPlayers: {
        type: Number,
        default: 8,
        min: 2,
        max: 8
    },
    players: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        health: {
            type: Number,
            default: 40
        },
        board: [{
            type: Object
        }],
        ready: {
            type: Boolean,
            default: false
        }
    }],
    status: {
        type: String,
        enum: ['waiting', 'playing', 'finished'],
        default: 'waiting'
    },
    turn: {
        type: Number,
        default: 0
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
    }
});

module.exports = mongoose.model('Room', roomSchema); 
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
        board: [{
            type: Object
        }]
    }],
    status: {
        type: String,
        enum: ['waiting', 'selecting', 'playing', 'finished'],
        default: 'waiting'
    },
    isMatchRoom: {
        type: Boolean,
        default: false,
        index: true
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
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Room', roomSchema); 
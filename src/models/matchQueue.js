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
    startTime: {
        type: Date,
        default: Date.now
    },
    matchedRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MatchQueue', matchQueueSchema); 
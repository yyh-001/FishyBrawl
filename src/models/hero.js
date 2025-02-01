const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    health: {
        type: Number,
        required: true,
        default: 40
    },
    ability: {
        name: String,
        description: String,
        type: {
            type: String,
            enum: ['active', 'passive']
        },
        effect: String
    },
    image: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Hero', heroSchema); 
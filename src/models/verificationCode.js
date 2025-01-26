const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    code: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['register', 'reset_password'],
        required: true
    },
    expireAt: {
        type: Date,
        required: true
    },
    used: {
        type: Boolean,
        default: false
    }
});

// 自动删除过期的验证码
verificationCodeSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema); 
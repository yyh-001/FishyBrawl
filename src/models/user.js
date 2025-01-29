const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    // 添加 friends 字段定义
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  // 引用 User 模型
    }],
    rating: {
        type: Number,
        default: 1000
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    lastOnline: {
        type: Date,
        default: Date.now
    },
    verificationCode: {
        code: String,
        expiresAt: Date,
        type: String
    }
}, {
    timestamps: true
});

// 添加索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ rating: -1 });
userSchema.index({ status: 1 });

// 密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// 虚拟字段：在线状态
userSchema.virtual('isOnline').get(function() {
    return this.status === 'online' || this.status === 'in_game';
});

// 设置 toJSON 选项
userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.verificationCode;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema); 
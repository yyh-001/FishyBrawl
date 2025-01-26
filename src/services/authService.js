const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const VerificationCode = require('../models/verificationCode');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const CustomError = require('../utils/customError');

class AuthService {
    // 生成验证码
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // 生成 JWT token
    generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
    }

    // 发送验证码
    async sendVerificationCode(email, type) {
        const code = this.generateVerificationCode();
        const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

        // 保存验证码
        await VerificationCode.create({
            email,
            code,
            type,
            expireAt
        });

        // 发送邮件
        await emailService.sendVerificationCode(email, code, type);
        logger.info(`验证码已发送到邮箱: ${email}`);
    }

    // 验证验证码
    async verifyCode(email, code, type) {
        const verificationCode = await VerificationCode.findOne({
            email,
            code,
            type,
            used: false,
            expireAt: { $gt: new Date() }
        });

        if (!verificationCode) {
            throw new CustomError(1001, '验证码错误或已过期');
        }

        // 标记验证码为已使用
        verificationCode.used = true;
        await verificationCode.save();

        return true;
    }

    // 注册
    async register(email, password, username, verificationCode) {
        // 验证验证码
        await this.verifyCode(email, verificationCode, 'register');

        // 检查邮箱是否已注册
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new CustomError(1002, '邮箱已被注册');
        }

        // 创建用户
        const user = await User.create({
            email,
            password,
            username
        });

        // 生成 token
        const token = this.generateToken(user._id);

        return {
            userId: user._id,
            username: user.username,
            email: user.email,
            token
        };
    }

    // 登录
    async login(email, password) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new CustomError(401, '用户不存在');
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new CustomError(401, '密码错误');
        }

        const token = this.generateToken(user._id);

        return {
            token,
            userInfo: {
                userId: user._id,
                username: user.username,
                rating: user.rating
            }
        };
    }

    // 发送重置密码验证码
    async sendResetPasswordCode(email) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        await this.sendVerificationCode(email, 'reset_password');
    }

    // 验证重置密码验证码
    async verifyResetCode(email, verificationCode) {
        await this.verifyCode(email, verificationCode, 'reset_password');
        
        // 生成重置令牌
        const resetToken = jwt.sign(
            { email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return resetToken;
    }

    // 重置密码
    async resetPassword(resetToken, newPassword) {
        try {
            const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
            const user = await User.findOne({ email: decoded.email });
            
            if (!user) {
                throw new CustomError(404, '用户不存在');
            }

            user.password = newPassword;
            await user.save();

        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                throw new CustomError(1003, '重置密码令牌无效');
            }
            if (error.name === 'TokenExpiredError') {
                throw new CustomError(1003, '重置密码令牌已过期');
            }
            throw error;
        }
    }

    // 修改密码
    async changePassword(userId, oldPassword, newPassword) {
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        const isPasswordValid = await user.comparePassword(oldPassword);
        if (!isPasswordValid) {
            throw new CustomError(400, '原密码错误');
        }

        user.password = newPassword;
        await user.save();
    }
}

module.exports = new AuthService(); 
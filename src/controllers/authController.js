const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
    // 发送验证码
    async sendVerificationCode(req, res, next) {
        try {
            const { email, type } = req.body;
            await authService.sendVerificationCode(email, type);
            res.json(ApiResponse.success(null, '验证码已发送'));
        } catch (error) {
            next(error);
        }
    }

    // 注册
    async register(req, res, next) {
        try {
            const { email, password, username, verificationCode } = req.body;
            const userData = await authService.register(email, password, username, verificationCode);
            res.json(ApiResponse.success(userData));
        } catch (error) {
            next(error);
        }
    }

    // 登录
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const loginData = await authService.login(email, password);
            res.json(ApiResponse.success(loginData));
        } catch (error) {
            next(error);
        }
    }

    // 发送重置密码验证码
    async sendResetPasswordCode(req, res, next) {
        try {
            const { email } = req.body;
            await authService.sendResetPasswordCode(email);
            res.json(ApiResponse.success(null, '重置密码验证码已发送'));
        } catch (error) {
            next(error);
        }
    }

    // 验证重置密码验证码
    async verifyResetCode(req, res, next) {
        try {
            const { email, verificationCode } = req.body;
            const resetToken = await authService.verifyResetCode(email, verificationCode);
            res.json(ApiResponse.success({ resetToken }));
        } catch (error) {
            next(error);
        }
    }

    // 重置密码
    async resetPassword(req, res, next) {
        try {
            const { resetToken, newPassword } = req.body;
            await authService.resetPassword(resetToken, newPassword);
            res.json(ApiResponse.success(null, '密码重置成功'));
        } catch (error) {
            next(error);
        }
    }

    // 修改密码
    async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;
            await authService.changePassword(req.user.id, oldPassword, newPassword);
            res.json(ApiResponse.success(null, '密码修改成功'));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController(); 
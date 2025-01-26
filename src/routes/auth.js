const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authValidators, validateRequest } = require('../middlewares/validator');
const authMiddleware = require('../middlewares/auth');

// 发送验证码
router.post('/verification-code', 
    authValidators.sendVerificationCode,
    validateRequest,
    authController.sendVerificationCode
);

// 注册
router.post('/register',
    authValidators.register,
    validateRequest,
    authController.register
);

// 登录
router.post('/login',
    authValidators.login,
    validateRequest,
    authController.login
);

// 重置密码验证码
router.post('/reset-password-code',
    authValidators.resetPasswordCode,
    validateRequest,
    authController.sendResetPasswordCode
);

// 验证重置密码验证码
router.post('/verify-reset-code',
    authValidators.verifyResetCode,
    validateRequest,
    authController.verifyResetCode
);

// 重置密码
router.post('/reset-password',
    authValidators.resetPassword,
    validateRequest,
    authController.resetPassword
);

// 修改密码
router.put('/password',
    authMiddleware,
    authValidators.changePassword,
    validateRequest,
    authController.changePassword
);

module.exports = router; 
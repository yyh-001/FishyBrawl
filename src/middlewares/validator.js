const { body, validationResult } = require('express-validator');

// 验证请求的中间件
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            code: 400,
            message: '请求参数验证失败',
            errors: errors.array()
        });
    }
    next();
};

// 验证规则
const authValidators = {
    sendVerificationCode: [
        body('email').isEmail().withMessage('邮箱格式不正确'),
        body('type').isIn(['register', 'reset_password']).withMessage('验证码类型不正确')
    ],
    
    register: [
        body('email').isEmail().withMessage('邮箱格式不正确'),
        body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
        body('username').isLength({ min: 2 }).withMessage('用户名至少2个字符'),
        body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('验证码格式不正确')
    ],
    
    login: [
        body('email').isEmail().withMessage('邮箱格式不正确'),
        body('password').isLength({ min: 6 }).withMessage('密码至少6个字符')
    ],

    resetPasswordCode: [
        body('email').isEmail().withMessage('邮箱格式不正确')
    ],

    verifyResetCode: [
        body('email').isEmail().withMessage('邮箱格式不正确'),
        body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('验证码格式不正确')
    ],

    resetPassword: [
        body('resetToken').notEmpty().withMessage('重置令牌不能为空'),
        body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')
    ],

    changePassword: [
        body('oldPassword').notEmpty().withMessage('原密码不能为空'),
        body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')
    ]
};

module.exports = {
    validateRequest,
    authValidators
}; 
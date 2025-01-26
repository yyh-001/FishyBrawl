const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/response');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json(
                ApiResponse.error(401, '未提供有效的认证令牌')
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json(
                ApiResponse.error(401, '用户不存在')
            );
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(
                ApiResponse.error(401, '无效的认证令牌')
            );
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(
                ApiResponse.error(401, '认证令牌已过期')
            );
        }
        next(error);
    }
};

module.exports = authMiddleware; 
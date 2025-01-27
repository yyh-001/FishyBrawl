const logger = require('../utils/logger');
const ApiResponse = require('../utils/response');
const CustomError = require('../utils/customError');

const errorHandler = (err, req, res, next) => {
    logger.error(err);

    // 处理自定义错误
    if (err instanceof CustomError) {
        return res.status(err.code < 500 ? err.code : 500).json({
            code: err.code,
            message: err.message
        });
    }

    // 处理验证错误
    if (err.name === 'ValidationError') {
        return res.status(400).json(
            ApiResponse.error(400, '请求参数验证失败')
        );
    }

    // 处理授权错误
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json(
            ApiResponse.error(401, '未授权访问')
        );
    }

    // 处理速率限制错误
    if (err.name === 'TooManyRequests') {
        return res.status(429).json(
            ApiResponse.error(429, '请求过于频繁，请稍后再试')
        );
    }

    // 处理 MongoDB CastError
    if (err.name === 'CastError') {
        return res.status(400).json(
            ApiResponse.error(400, '无效的ID格式')
        );
    }

    // 处理其他错误
    res.status(500).json(
        ApiResponse.error(500, '服务器内部错误')
    );
};

module.exports = errorHandler; 
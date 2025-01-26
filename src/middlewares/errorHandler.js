const logger = require('../utils/logger');
const ApiResponse = require('../utils/response');

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json(
            ApiResponse.error(400, '请求参数验证失败')
        );
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json(
            ApiResponse.error(401, '未授权访问')
        );
    }

    res.status(500).json(
        ApiResponse.error(500, '服务器内部错误')
    );
};

module.exports = errorHandler; 
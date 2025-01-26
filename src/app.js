const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

// 创建 Express 应用
const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(helmet()); // 安全头
app.use(cors()); // CORS
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 限流配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use('/api/', limiter);

// 路由
app.use('/api/auth', require('./routes/auth'));

// 404处理
app.use((req, res) => {
    res.status(404).json({
        code: 404,
        message: '请求的资源不存在'
    });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`服务器运行在端口 ${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('SIGTERM 信号收到，关闭 HTTP 服务器');
    app.close(() => {
        logger.info('HTTP 服务器已关闭');
        process.exit(0);
    });
}); 
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const initializeSocket = require('./config/socket');
const LobbyHandler = require('./socket/lobbyHandler');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

// 创建 Express 应用
const app = express();
const server = http.createServer(app);
const io = initializeSocket(server, {
    cors: {
        origin: '*', // 在生产环境中应该设置具体的域名
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true
    }
});

// 设置代理信任
app.set('trust proxy', 1);

// 连接数据库
connectDB();

// 中间件
app.use(helmet()); // 安全头
app.use(cors({
    origin: '*', // 在生产环境中应该设置具体的域名
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 限流配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    standardHeaders: true,
    legacyHeaders: false,
    // 自定义密钥生成器，使用 X-Forwarded-For 或实际 IP
    keyGenerator: (req) => {
        return req.ip; // Express 会自动处理 X-Forwarded-For
    }
});
app.use('/api/', limiter);

// 路由
app.use('/api/auth', require('./routes/auth'));

// 健康检查路由
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        code: 404,
        message: '请求的资源不存在'
    });
});

// 错误处理
app.use(errorHandler);

// 初始化 WebSocket 处理器
const lobbyHandler = new LobbyHandler(io);

// WebSocket 连接处理
io.on('connection', (socket) => {
    logger.info(`用户连接: ${socket.user.username}`);
    lobbyHandler.initialize(socket);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // 修改这里，监听所有网络接口

server.listen(PORT, HOST, () => {
    logger.info(`HTTP 服务器运行在 http://${HOST}:${PORT}`);
    logger.info(`WebSocket 服务器已启动`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('SIGTERM 信号收到，关闭 HTTP 服务器');
    server.close(() => {
        logger.info('HTTP 服务器已关闭');
        process.exit(0);
    });
});

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的 Promise 拒绝:', reason);
}); 
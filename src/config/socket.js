const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const logger = require('../utils/logger');

function initializeSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: '*',  // 在生产环境中应该设置具体的域名
            methods: ['GET', 'POST'],
            allowedHeaders: ['Authorization'],
            credentials: true
        },
        pingTimeout: 60000, // 60秒超时
        pingInterval: 25000 // 25秒发送一次心跳
    });

    // JWT 认证中间件
    io.use(async (socket, next) => {
        try {
            logger.info('WebSocket 连接尝试:', {
                ip: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent']
            });

            const token = socket.handshake.auth.token || 
                         socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                logger.error('WebSocket 认证失败: 未提供 token', {
                    ip: socket.handshake.address,
                    headers: socket.handshake.headers
                });
                return next(new Error('未提供认证令牌'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (!user) {
                logger.error('WebSocket 认证失败: 用户不存在', {
                    userId: decoded.userId,
                    ip: socket.handshake.address
                });
                return next(new Error('用户不存在'));
            }

            socket.user = user;
            logger.info('WebSocket 认证成功', {
                userId: user._id,
                username: user.username,
                ip: socket.handshake.address,
                connectionId: socket.id
            });
            next();
        } catch (error) {
            logger.error('WebSocket 认证错误', {
                error: error.message,
                errorName: error.name,
                stack: error.stack,
                ip: socket.handshake.address
            });
            if (error.name === 'JsonWebTokenError') {
                next(new Error('无效的认证令牌'));
            } else if (error.name === 'TokenExpiredError') {
                next(new Error('认证令牌已过期'));
            } else {
                next(new Error('认证失败'));
            }
        }
    });

    // 连接事件
    io.on('connection', (socket) => {
        logger.info('WebSocket 连接建立', {
            userId: socket.user._id,
            username: socket.user.username,
            connectionId: socket.id,
            ip: socket.handshake.address,
            timestamp: new Date().toISOString()
        });

        socket.on('disconnect', (reason) => {
            logger.info('WebSocket 连接断开', {
                userId: socket.user._id,
                username: socket.user.username,
                connectionId: socket.id,
                reason: reason,
                ip: socket.handshake.address,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('error', (error) => {
            logger.error('WebSocket 连接错误', {
                userId: socket.user._id,
                username: socket.user.username,
                connectionId: socket.id,
                error: error.message,
                errorName: error.name,
                stack: error.stack,
                ip: socket.handshake.address,
                timestamp: new Date().toISOString()
            });
        });
    });

    return io;
}

module.exports = initializeSocket; 
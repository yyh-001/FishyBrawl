const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        // 添加 MongoDB 连接错误监听
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB 连接错误:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB 连接断开');
        });

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        logger.info('MongoDB 连接成功');
    } catch (error) {
        logger.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 
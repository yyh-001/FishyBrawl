const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        logger.info('MongoDB 连接成功');
    } catch (error) {
        logger.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 
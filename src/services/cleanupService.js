const User = require('../models/user');
const Bot = require('../models/bot');
const logger = require('../utils/logger');

class CleanupService {
    constructor() {
        // 每天运行一次清理
        setInterval(this.cleanup.bind(this), 24 * 60 * 60 * 1000);
    }

    async cleanup() {
        try {
            // 清理旧的机器人用户数据
            const result = await User.deleteMany({
                email: { $regex: /^bot_.*@example\.com$/ },
                createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            logger.info('清理旧机器人数据完成', {
                deletedCount: result.deletedCount
            });
        } catch (error) {
            logger.error('清理机器人数据失败:', error);
        }
    }
}

module.exports = new CleanupService(); 
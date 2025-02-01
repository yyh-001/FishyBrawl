const mongoose = require('mongoose');
const Hero = require('../models/hero');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
require('dotenv').config();

async function importHeroes() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('数据库连接成功');

        // 读取 CSV 文件
        const csvFilePath = path.join(__dirname, '../data/heroes.csv');
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        const records = csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        // 转换数据格式
        const heroes = records.map(record => ({
            name: record.name,
            description: record.description,
            health: parseInt(record.health),
            abilities: [{
                name: record.ability_name,
                description: record.ability_description,
                type: record.ability_type,
                cost: parseInt(record.ability_cost),
                effect: record.ability_effect
            }]
        }));

        // 清空现有数据
        await Hero.deleteMany({});
        logger.info('已清空现有英雄数据');

        // 导入新数据
        await Hero.insertMany(heroes);
        logger.info(`成功导入 ${heroes.length} 个英雄`);

        process.exit(0);
    } catch (error) {
        logger.error('导入英雄数据失败:', error);
        process.exit(1);
    }
}

importHeroes(); 
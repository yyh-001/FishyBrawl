const Hero = require('../models/hero');
const logger = require('../utils/logger');
const CustomError = require('../utils/customError');

class HeroService {
    // 获取随机英雄列表
    async getRandomHeroes(count = 4) {
        try {
            logger.info('开始获取随机英雄');
            
            // 随机获取指定数量的英雄
            const heroes = await Hero.aggregate([
                { $sample: { size: count } },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        health: 1,
                        ability: {
                            name: '$ability_name',
                            description: '$ability_description',
                            type: '$ability_type',
                            cost: '$ability_cost',
                            effect: '$ability_effect'
                        }
                    }
                }
            ]);

            logger.info('数据库查询结果:', {
                rawHeroes: JSON.stringify(heroes, null, 2)
            });

            // 处理英雄数据
            const processedHeroes = heroes.map(hero => ({
                _id: hero._id,
                name: hero.name,
                description: hero.description,
                health: hero.health,
                ability: {
                    name: hero.ability_name || '基础技能',
                    description: hero.ability_description || '暂无描述',
                    type: hero.ability_type || 'active',
                    cost: hero.ability_cost || 0,
                    effect: hero.ability_effect || ''
                }
            }));

            logger.info('获取英雄列表成功', {
                requestedCount: count,
                returnedCount: processedHeroes.length,
                heroes: JSON.stringify(processedHeroes, null, 2)
            });

            return processedHeroes;
        } catch (error) {
            logger.error('获取随机英雄失败:', {
                error: error.message,
                stack: error.stack
            });
            throw new CustomError(500, '获取英雄列表失败');
        }
    }

    // 获取指定英雄信息
    async getHeroById(heroId) {
        try {
            const hero = await Hero.findById(heroId);
            if (!hero) {
                throw new CustomError(404, '英雄不存在');
            }
            return hero;
        } catch (error) {
            logger.error('获取英雄信息失败:', error);
            throw new CustomError(500, '获取英雄信息失败');
        }
    }

    // 获取所有英雄列表
    async getAllHeroes() {
        try {
            const heroes = await Hero.find({});
            return heroes;
        } catch (error) {
            logger.error('获取所有英雄失败:', error);
            throw new CustomError(500, '获取英雄列表失败');
        }
    }
}

module.exports = new HeroService(); 
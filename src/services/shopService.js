const Minion = require('../models/minion');
const logger = require('../utils/logger');
const CustomError = require('../utils/customError');

class ShopService {
    // 刷新商店，获取随机随从
    async refreshShop(tavernTier) {
        try {
            logger.info('🎲 开始刷新商店随从:', {
                tavernTier,
                timestamp: new Date().toISOString()
            });

            // 获取当前酒馆等级及以下的随从
            const minions = await Minion.aggregate([
                { 
                    $match: { 
                        tier: { $lte: tavernTier } 
                    } 
                },
                { 
                    $sample: { 
                        size: 3
                    } 
                },
                {
                    $project: {
                        _id: 1,
                        id: 1,
                        name: 1,
                        attack: 1,
                        health: 1,
                        tier: 1,
                        tribe: 1,
                        abilities: 1,
                        description: 1,
                        battlecry: 1,
                        deathrattle: 1,
                        keywords: 1,
                        flavorText: 1,
                        battlecry_type: 1,
                        battlecry_value: 1,
                        deathrattle_type: 1,
                        deathrattle_value: 1
                    }
                }
            ]);

            logger.info('📥 原始随从数据:', {
                count: minions.length,
                minions: minions.map(m => ({
                    id: m._id,
                    dbId: m.id,
                    name: m.name,
                    tier: m.tier,
                    description: m.description
                }))
            });

            // 处理每个随从的描述文本
            const processedMinions = minions.map(minion => {
                // 使用数据库中的描述，替换下划线为空格
                let description = minion.description ? minion.description.replace(/_/g, ' ') : '';
                
                // 确保 abilities 是数组
                const abilities = Array.isArray(minion.abilities) ? minion.abilities : [];
                
                // 如果没有描述但有其他技能，则组合技能描述
                if (!description) {
                    if (minion.battlecry_type) {
                        const battlecryDesc = this.getBattlecryDescription(minion.battlecry_type, minion.battlecry_value);
                        description += `战吼：${battlecryDesc}\n`;
                    }
                    if (minion.deathrattle_type) {
                        const deathrattleDesc = this.getDeathrattleDescription(minion.deathrattle_type, minion.deathrattle_value);
                        description += `亡语：${deathrattleDesc}\n`;
                    }
                    if (abilities.length > 0) {
                        description += abilities.join('\n');
                    }
                }

                // 处理关键词
                const keywords = minion.keywords ? minion.keywords.split('_') : [];

                const processedMinion = {
                    _id: minion._id,
                    id: minion.id,
                    name: minion.name,
                    attack: minion.attack,
                    health: minion.health,
                    tier: minion.tier,
                    tribe: minion.tribe || '无种族',
                    abilities: abilities,
                    keywords: keywords,
                    description: description.trim() || '普通随从',
                    flavorText: minion.flavorText ? minion.flavorText.replace(/_/g, ' ') : '',
                    battlecry_type: minion.battlecry_type,
                    battlecry_value: minion.battlecry_value,
                    deathrattle_type: minion.deathrattle_type,
                    deathrattle_value: minion.deathrattle_value
                };

                logger.debug('🎭 随从处理结果:', {
                    id: processedMinion._id,
                    name: processedMinion.name,
                    stats: `${processedMinion.attack}/${processedMinion.health}`,
                    tier: processedMinion.tier,
                    tribe: processedMinion.tribe,
                    keywords: processedMinion.keywords,
                    description: processedMinion.description,
                    flavorText: processedMinion.flavorText
                });

                return processedMinion;
            });

            logger.info('✨ 商店随从刷新完成:', {
                tavernTier,
                minionCount: processedMinions.length,
                minions: processedMinions.map(m => ({
                    id: m._id,
                    name: m.name,
                    stats: `${m.attack}/${m.health}`,
                    tier: m.tier,
                    tribe: m.tribe,
                    abilities: m.abilities.length,
                    hasDescription: !!m.description
                })),
                timestamp: new Date().toISOString()
            });

            return processedMinions;

        } catch (error) {
            logger.error('❌ 刷新商店随从失败:', {
                error: error.message,
                stack: error.stack,
                tavernTier,
                timestamp: new Date().toISOString()
            });
            throw new CustomError(500, '刷新商店失败');
        }
    }

    // 获取随从的购买价格
    getMinionCost(minion) {
        // 基础随从价格为3金币
        return 3;
    }

    // 获取随从的出售价格
    getMinionSellPrice(minion) {
        // 基础出售价格为1金币
        return 1;
    }

    // 辅助函数：获取战吼描述
    getBattlecryDescription(type, value) {
        const descriptions = {
            'buff_random_friendly': `使一个友方随从获得+${value}/+${value}`,
            'discover_minion': `发现一个${value}星随从`,
            // 添加更多战吼类型的描述...
        };
        return descriptions[type] || type;
    }

    // 辅助函数：获取亡语描述
    getDeathrattleDescription(type, value) {
        const descriptions = {
            'draw_cards': `抽${value}张牌`,
            // 添加更多亡语类型的描述...
        };
        return descriptions[type] || type;
    }
}

module.exports = new ShopService(); 
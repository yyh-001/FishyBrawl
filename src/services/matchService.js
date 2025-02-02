const mongoose = require('mongoose');
const Room = require('../models/room');
const User = require('../models/user');
const heroService = require('./heroService');
const logger = require('../utils/logger');
const Bot = require('../models/bot');
const lobbyService = require('./lobbyService');

const BOT_NAMES = ['张三', '李四', '王五', '赵六', '老王', '小李', '阿伟', '老张', '小王', '大勇', '老地', '林伟', '杨鹰', '徐超', '李黑', '赵强', '张天', '老鹰', '赵地', '张黑'];

class MatchService {
  constructor() {
    this.matchingPlayers = new Map();
    this.matchingTimeout = 30000; // 30秒匹配超时
    this.version = '1.0.2';
    // 机器人名字生成配置
    this.BOT_FIRST_NAMES = [
      '小', '大', '老', '阿', '张', '李', '王', '赵',
      '刘', '陈', '杨', '黄', '周', '吴', '林', '徐'
    ];
    this.BOT_SECOND_NAMES = [
      '白', '黑', '红', '明', '强', '伟', '华', '勇',
      '超', '龙', '虎', '鹰', '风', '云', '天', '地'
    ];
    logger.info(`MatchService initialized - Version ${this.version}`);
  }

  // 创建机器人玩家
  async createBotPlayers(count) {
    logger.info(`MatchService Version ${this.version} - Creating Bots`, {
      callerStack: new Error().stack
    });

    const bots = [];
    for (let i = 0; i < count; i++) {
      const bot = await lobbyService.createBot();
      bots.push({
        userId: bot.botId,
        username: bot.username,
        isBot: true,
        ready: true,
        availableHeroes: bot.availableHeroes
      });
    }

    return bots;
  }

  // 创建匹配房间
  async createMatchRoom(players, botCount = 0) {
    logger.info(`MatchService Version ${this.version} - Creating Match Room`, {
      callerStack: new Error().stack,
      players,
      botCount
    });
    try {
      // 创建机器人
      const bots = await this.createBotPlayers(botCount);
      
      logger.info('准备添加到房间的机器人:', {
        version: this.version,
        botCount,
        bots: bots.map(b => ({
          userId: b.userId,
          username: b.username,
          isBot: b.isBot,
          heroCount: b.availableHeroes.length
        }))
      });
      
      // 创建房间
      const room = new Room({
        name: `匹配房间-${Date.now()}`,
        maxPlayers: players.length + botCount,
        players: [
          ...players.map(userId => ({
            userId: String(userId),
            username: '',
            ready: true,
            isBot: false,
            availableHeroes: []
          })),
          ...bots.map(bot => ({
            userId: bot.userId,  // 这里是 BOT_timestamp_random 格式
            username: bot.username,
            ready: true,
            isBot: true,
            availableHeroes: bot.availableHeroes || []
          }))
        ],
        status: 'selecting',
        isMatchRoom: true,
        createdBy: players[0]
      });

      // 为真实玩家分配英雄
      for (const player of room.players.filter(p => !p.userId.startsWith('BOT_'))) {
        const user = await User.findById(player.userId);
        if (user) {
          player.username = user.username;
          player.availableHeroes = await heroService.getRandomHeroes(4).then(heroes => heroes.map(h => h._id));
        }
      }

      // 保存前检查所有玩家状态
      logger.info('保存前的房间状态:', {
        version: this.version,
        roomId: room._id,
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
          isBot: p.isBot,
          isBotByUserId: p.userId.startsWith('bot_')
        }))
      });

      await room.save();
      
      // 验证房间中的机器人数量
      const savedRoom = await Room.findById(room._id);
      
      // 重新标记机器人，使用 toObject() 转换为普通对象
      savedRoom.players = savedRoom.players.map(p => {
        const player = p.toObject();
        // 通过 userId 判断是否为机器人
        const isBot = player.userId.startsWith('bot_');
        return {
          ...player,
          userId: String(player.userId),
          isBot: isBot
        };
      });

      // 强制更新整个 players 数组
      await Room.updateOne(
        { _id: savedRoom._id },
        { 
          $set: { 
            players: savedRoom.players.map(p => ({
              ...p,
              isBot: p.userId.startsWith('bot_'),
              userId: String(p.userId)
            }))
          } 
        }
      );

      // 最终检查
      const finalRoom = await Room.findById(savedRoom._id);
      const botCount = finalRoom.players.filter(p => p.userId.startsWith('bot_')).length;
      const realPlayerCount = finalRoom.players.filter(p => !p.userId.startsWith('bot_')).length;
      
      logger.info('最终房间状态:', {
        version: this.version,
        roomId: finalRoom._id,
        statistics: {
          totalPlayers: finalRoom.players.length,
          botCount,
          realPlayerCount
        },
        players: finalRoom.players.map(p => ({
          userId: p.userId,
          username: p.username,
          isBot: p.isBot,
          isBotByUserId: p.userId.startsWith('bot_')
        }))
      });

      return finalRoom;
    } catch (error) {
      logger.error('创建匹配房间失败:', {
        version: this.version,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 开始匹配
  async startMatching(userId) {
    try {
      logger.info(`MatchService Version ${this.version} - Starting Match`);
      // 检查玩家是否已在匹配中
      if (this.matchingPlayers.has(userId)) {
        return { success: false, message: '您已在匹配队列中' };
      }

      // 添加到匹配队列
      this.matchingPlayers.set(userId, {
        startTime: Date.now(),
        timeout: setTimeout(() => this.handleMatchTimeout(userId), this.matchingTimeout)
      });

      logger.info('玩家开始匹配', {
        version: this.version,
        userId,
        queueSize: this.matchingPlayers.size
      });

      // 检查是否可以立即匹配
      await this.tryMatch();

      return { success: true, message: '开始匹配' };
    } catch (error) {
      logger.error('开始匹配失败:', {
        version: this.version,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 取消匹配
  cancelMatching(userId) {
    const matchingInfo = this.matchingPlayers.get(userId);
    if (matchingInfo) {
      clearTimeout(matchingInfo.timeout);
      this.matchingPlayers.delete(userId);
      logger.info('玩家取消匹配', {
        userId,
        queueSize: this.matchingPlayers.size
      });
    }
    return { success: true, message: '已取消匹配' };
  }

  // 处理匹配超时
  handleMatchTimeout(userId) {
    this.matchingPlayers.delete(userId);
    logger.info('玩家匹配超时', {
      userId,
      queueSize: this.matchingPlayers.size
    });
  }

  // 尝试匹配
  async tryMatch() {
    try {
      if (this.matchingPlayers.size >= 1) {
        const players = Array.from(this.matchingPlayers.keys());
        const matchedPlayers = players.slice(0, 1);
        
        logger.info(`MatchService Version ${this.version} - Starting tryMatch`);
        logger.info('开始创建机器人房间:', {
          version: this.version,
          realPlayers: matchedPlayers,
          botCount: 7
        });
        
        // 创建带机器人的房间
        const room = await this.createMatchRoom(matchedPlayers, 7);
        
        // 清理匹配队列
        matchedPlayers.forEach(userId => {
          const matchingInfo = this.matchingPlayers.get(userId);
          if (matchingInfo) {
            clearTimeout(matchingInfo.timeout);
            this.matchingPlayers.delete(userId);
          }
        });

        logger.info('匹配成功', {
          version: this.version,
          roomId: room._id,
          players: matchedPlayers
        });

        return room;
      }
    } catch (error) {
      logger.error('匹配失败:', {
        version: this.version,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new MatchService(); 
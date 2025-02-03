const Room = require('../models/room');
const MatchQueue = require('../models/matchQueue');
const User = require('../models/user');
const CustomError = require('../utils/customError');
const logger = require('../utils/logger');
const Hero = require('../models/hero');
const matchService = require('./matchService');
const Bot = require('../models/bot');
const heroService = require('./heroService');
const gameConfig = require('../config/gameConfig');

class LobbyService {
    constructor() {
        this.version = '1.0.0';
        // 机器人名字生成配置
        this.BOT_FIRST_NAMES = [
            '小', '大', '老', '阿', '张', '李', '王', '赵',
            '刘', '陈', '杨', '黄', '周', '吴', '林', '徐'
        ];
        this.BOT_SECOND_NAMES = [
            '白', '黑', '红', '明', '强', '伟', '华', '勇',
            '超', '龙', '虎', '鹰', '风', '云', '天', '地'
        ];
        logger.info(`LobbyService initialized - Version ${this.version}`);
    }

    // 获取房间列表
    async getRooms() {
        const rooms = await Room.find({ 
            status: 'waiting',
            'players.0': { $exists: true } // 确保至少有一个玩家
        })
        .select('name players maxPlayers status')
        .lean();

        // 如果没有房间，返回空数组
        if (!rooms || rooms.length === 0) {
            return [];
        }

        return rooms.map(room => ({
            roomId: room._id,
            name: room.name,
            players: room.players.length,
            maxPlayers: room.maxPlayers,
            status: room.status
        }));
    }

    // 创建房间
    async createRoom(userId, name, maxPlayers = 8) {
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        // 检查用户是否已在其他房间
        const existingRoom = await Room.findOne({
            'players.userId': userId,
            status: 'waiting'
        });

        if (existingRoom) {
            throw new CustomError(400, '您已在其他房间中');
        }

        const room = new Room({
            name,
            maxPlayers,
            createdBy: userId,
            players: [{
                userId,
                username: user.username,
                ready: false,
                isCreator: true
            }],
            status: 'waiting'
        });

        await room.save();

        return {
            roomId: room._id,
            _id: room._id,
            name: room.name,
            players: room.players,
            maxPlayers: room.maxPlayers,
            status: room.status,
            createdBy: room.createdBy,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt
        };
    }

    // 开始匹配
    async startMatching(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        // 先清理旧的匹配记录和等待状态房间
        await Promise.all([
            MatchQueue.deleteMany({
                userId,
                status: { $in: ['waiting', 'cancelled'] }
            }),
            Room.deleteMany({
                'players.userId': userId,
                status: { $in: ['waiting', 'selecting'] },
                isMatchRoom: true
            })
        ]);

        // 检查是否已在匹配队列
        const existingMatch = await MatchQueue.findOne({ 
            userId, 
            status: 'matching' 
        });
        
        if (existingMatch) {
            throw new CustomError(400, '已在匹配队列中');
        }

        // 检查是否在活跃游戏中
        const existingRoom = await Room.findOne({
            'players.userId': userId,
            status: 'playing',  // 只检查正在进行的游戏
            isMatchRoom: true
        });

        if (existingRoom) {
            throw new CustomError(400, '您已在游戏中，无法开始匹配');
        }

        // 创建匹配记录
        const matchQueue = await MatchQueue.create({
            userId,
            rating: user.rating,
            status: 'matching',
            startTime: new Date()
        });

        // 确保用户状态为在线
        await User.updateOne(
            { _id: userId },
            { status: 'online' }
        );

        logger.info('玩家开始匹配', {
            userId,
            username: user.username,
            rating: user.rating,
            queueId: matchQueue._id,
            timestamp: new Date().toISOString()
        });

        return matchQueue;
    }

    // 取消匹配
    async cancelMatching(userId) {
        const matchQueue = await MatchQueue.findOne({ 
            userId, 
            status: 'matching' 
        });
        
        if (!matchQueue) {
            throw new CustomError(404, '未在匹配队列中');
        }

        matchQueue.status = 'cancelled';
        await matchQueue.save();

        return { success: true };
    }

    // 匹配检查
    async checkMatching() {
        const now = new Date();

        // 获取所有正在匹配的玩家
        const matchingPlayers = await MatchQueue.find({ 
            status: 'matching' 
        }).sort({ startTime: 1 }); // 按等待时间排序

        // 检查是否有玩家等待时间过长
        for (const player of matchingPlayers) {
            const waitTime = now - player.startTime;
            if (waitTime >= gameConfig.BOT.WAIT_TIME) {  // 使用配置的等待时间
                logger.info('匹配等待超时,添加机器人', {
                    waitTime,
                    configWaitTime: gameConfig.BOT.WAIT_TIME,
                    playerCount: matchingPlayers.length,
                    userId: player.userId
                });

                // 创建需要的机器人数量
                const botsNeeded = 8 - matchingPlayers.length;
                const bots = [];
                
                logger.info('开始创建机器人', {
                    botsNeeded,
                    targetRating: player.rating
                });

                for (let i = 0; i < botsNeeded; i++) {
                    const bot = await this.createBot(player.rating);
                    bots.push(bot);
                }

                logger.info('机器人创建完成', {
                    bots: bots.map(b => ({
                        id: b.botId,
                        username: b.username,
                        rating: b.rating
                    }))
                });
                
                // 合并真实玩家和机器人
                const allPlayers = [...matchingPlayers, ...bots.map(bot => ({
                    userId: bot.botId,
                    rating: bot.rating
                }))];
                
                try {
                    // 创建对战房间
                    const playerIds = allPlayers.map(p => p.userId);
                    const room = await this.createMatchRoom(playerIds);
                    
                    // 更新真实玩家的匹配状态
                    await MatchQueue.updateMany(
                        { userId: { $in: matchingPlayers.map(p => p.userId) } },
                        { status: 'matched', matchedRoom: room._id }
                    );

                    logger.info('匹配完成(含机器人)', {
                        roomId: room._id,
                        totalPlayers: playerIds.length,
                        realPlayers: matchingPlayers.length,
                        bots: botsNeeded
                    });

                    // 返回匹配结果
                    return {
                        success: true,
                        roomId: room._id,
                        players: playerIds,
                        hasBots: true
                    };
                } catch (error) {
                    logger.error('创建机器人房间失败:', error);
                    // 清理创建的机器人
                    await User.deleteMany({ _id: { $in: bots.map(b => b.botId) } });
                    throw error;
                }
            }
        }

        if (matchingPlayers.length < 8) return;

        // 按照分数段分组
        const ratingGroups = new Map();
        const RATING_RANGE = 300; // 扩大分数差范围以便更容易匹配

        for (const player of matchingPlayers) {
            const ratingGroup = Math.floor(player.rating / RATING_RANGE);
            if (!ratingGroups.has(ratingGroup)) {
                ratingGroups.set(ratingGroup, []);
            }
            ratingGroups.get(ratingGroup).push(player);
        }

        // 在每个分数段内进行匹配
        for (const [_, players] of ratingGroups) {
            while (players.length >= 8) {
                const matchedPlayers = players.splice(0, 8);
                const playerIds = matchedPlayers.map(p => p.userId);

                // 创建对战房间
                const room = await this.createMatchRoom(playerIds);

                // 更新匹配状态
                await MatchQueue.updateMany(
                    { 
                        userId: { $in: playerIds }
                    },
                    { 
                        status: 'matched',
                        matchedRoom: room._id
                    }
                );

                // 返回匹配结果
                return {
                    success: true,
                    roomId: room._id,
                    players: playerIds
                };
            }
        }
    }

    // 创建机器人
    async createBot(targetRating = 1000) {
        try {
            const timestamp = Date.now();
            const ratingVariation = Math.floor(Math.random() * 100) - 50; // -50 到 50 的随机值
            
            // 生成机器人名字
            const firstNames = ['小', '大', '老', '阿', '张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴', '林', '徐'];
            const secondNames = ['白', '黑', '红', '明', '强', '伟', '华', '勇', '超', '龙', '虎', '鹰', '风', '云', '天', '地'];
            
            // 获取已存在的机器人名字
            const existingBots = await Bot.find({}, 'username');
            const existingNames = new Set(existingBots.map(bot => bot.username));
            
            // 生成唯一名字
            let randomName;
            do {
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const secondName = secondNames[Math.floor(Math.random() * secondNames.length)];
                randomName = `${firstName}${secondName}`;
            } while (existingNames.has(randomName));

            // 生成唯一的机器人ID
            const botId = `BOT_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 获取随机英雄
            const availableHeroes = await heroService.getRandomHeroes(4)
                .then(heroes => heroes.map(h => h._id));

            // 创建机器人记录在 Bot 表中
            const bot = new Bot({
                botId,
                username: randomName,
                rating: targetRating + ratingVariation,
                availableHeroes,
                isBot: true
            });

            await bot.save();

            logger.info('机器人创建成功', {
                version: this.version,
                botId: bot.botId,
                username: bot.username,
                rating: bot.rating
            });

            return {
                botId: bot.botId,
                username: bot.username,
                rating: bot.rating,
                isBot: true,
                availableHeroes: bot.availableHeroes
            };
        } catch (error) {
            logger.error('创建机器人失败:', error);
            throw error;
        }
    }

    // 创建匹配房间
    async createMatchRoom(playerIds) {
        // 确保 playerIds 都是字符串
        const normalizedPlayerIds = playerIds.map(id => String(id));
        
        // 分离真实玩家和机器人ID
        const realPlayerIds = normalizedPlayerIds.filter(id => !id.startsWith('BOT_'));
        const botIds = normalizedPlayerIds.filter(id => id.startsWith('BOT_'));
        
        // 只查询真实玩家
        const realPlayers = await User.find({ _id: { $in: realPlayerIds } });
        
        const heroes = await Hero.find().lean();
        
        // 确保有足够的英雄可供选择
        if (!heroes || heroes.length < 4) {
            logger.error('没有足够的英雄可供选择', {
                heroCount: heroes?.length || 0,
                requiredCount: 4
            });
            throw new Error('系统错误：没有足够的英雄可供选择');
        }
        
        // 确保所有真实玩家都在线
        const onlinePlayers = realPlayers.filter(p => p.status === 'online');
        if (onlinePlayers.length !== realPlayers.length) {
            throw new Error('部分玩家已离线');
        }
        
        // 先清理所有相关的等待状态房间
        await Room.deleteMany({
            'players.userId': { $in: realPlayerIds },
            status: { $in: ['waiting', 'selecting'] },
            isMatchRoom: true
        });
        
        // 检查是否在活跃游戏中
        const existingRoom = await Room.findOne({
            'players.userId': { $in: realPlayerIds },
            status: 'playing',
            isMatchRoom: true
        });
        
        if (existingRoom) {
            // 检查是否都是机器人
            const existingPlayers = await User.find({ 
                _id: { $in: realPlayerIds },
                isBot: { $ne: true }
            });
            
            if (existingPlayers.length > 0) {
                throw new Error('部分玩家已在其他房间中');
            }
        }
        
        // 创建房间前等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 为每个玩家预先分配英雄
        const playerHeroes = new Map();
        // 处理真实玩家
        for (const playerId of realPlayerIds) {
            // 随机打乱英雄列表
            const shuffled = [...heroes].sort(() => 0.5 - Math.random());
            // 选择前4个英雄
            const availableHeroes = shuffled.slice(0, 4);
            playerHeroes.set(playerId.toString(), availableHeroes);
        }
        
        // 获取机器人信息
        const bots = await Bot.find({ 
            botId: { $in: botIds }
        }).lean();

        // 创建房间
        const room = new Room({
            name: `匹配房间-${Date.now()}`,
            maxPlayers: normalizedPlayerIds.length,
            players: [
                ...realPlayers.map(p => ({
                    userId: p._id.toString(),
                    username: p.username,
                    ready: true,
                    isBot: false,
                    availableHeroes: playerHeroes.get(p._id.toString()) || []
                })),
                ...bots.map(bot => ({
                    userId: bot.botId,
                    username: bot.username,  // 使用保存的机器人名字
                    ready: true,
                    isBot: true,
                    availableHeroes: playerHeroes.get(bot.botId) || [],
                    // 为机器人自动选择英雄
                    selectedHero: playerHeroes.get(bot.botId)?.[Math.floor(Math.random() * 4)]._id
                }))
            ],
            status: 'selecting',
            isMatchRoom: true,
            createdBy: realPlayers[0]._id
        });

        await room.save();
        
        logger.info('匹配房间创建成功:', {
            roomId: room._id,
            totalPlayers: room.players.length,
            realPlayers: realPlayers.length,
            bots: botIds.length,
            players: room.players.map(p => ({
                userId: p.userId,
                username: p.username,
                isBot: p.isBot,
                selectedHero: p.selectedHero
            }))
        });
        
        return room;
    }

    // 加入房间
    async joinRoom(userId, roomId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new CustomError(404, '用户不存在');
            }

            const room = await Room.findById(roomId);
            if (!room) {
                throw new CustomError(404, '房间不存在');
            }

            // 检查房间状态
            if (!['waiting', 'selecting'].includes(room.status)) {
                throw new CustomError(400, '房间已开始游戏或已结束');
            }

            // 检查用户是否已在其他房间
            const existingRoom = await Room.findOne({
                'players.userId': userId,
                status: { $in: ['waiting', 'selecting'] }
            });

            if (existingRoom) {
                // 如果已在当前房间中，直接返回房间信息
                if (existingRoom._id.toString() === roomId.toString()) {
                    return {
                        roomId: existingRoom._id,
                        name: existingRoom.name,
                        maxPlayers: existingRoom.maxPlayers,
                        status: existingRoom.status,
                        createdBy: existingRoom.createdBy,
                        players: existingRoom.players.map(p => ({
                            userId: p.userId,
                            username: p.username,
                            ready: p.ready,
                            isCreator: p.userId.toString() === existingRoom.createdBy.toString()
                        })),
                        alreadyInRoom: true,
                        isCreator: existingRoom.createdBy.toString() === userId.toString()
                    };
                }
                throw new CustomError(400, '您已在其他房间中');
            }

            // 检查房间是否已满
            if (room.players.length >= room.maxPlayers) {
                throw new CustomError(400, '房间已满');
            }

            // 检查是否在匹配队列中
            const inQueue = await MatchQueue.findOne({
                userId,
                status: 'matching'
            });

            if (inQueue) {
                throw new CustomError(400, '您正在匹配中，无法加入房间');
            }

            // 加入房间
            room.players.push({
                userId: user._id,
                username: user.username,
                health: 40,
                board: [],
                ready: false
            });

            await room.save();

            return {
                roomId: room._id,
                name: room.name,
                maxPlayers: room.maxPlayers,
                status: room.status,
                createdBy: room.createdBy,
                players: room.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    ready: p.ready,
                    isCreator: p.userId.toString() === room.createdBy.toString()
                })),
                alreadyInRoom: false,
                isCreator: room.createdBy.toString() === userId.toString()
            };
        } catch (error) {
            // 处理 MongoDB 的 CastError
            if (error.name === 'CastError') {
                throw new CustomError(404, '房间不存在');
            }
            throw error;
        }
    }

    // 离开房间
    async leaveRoom(userId, roomId) {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new CustomError(404, '房间不存在');
            }

            const playerIndex = room.players.findIndex(p => p.userId.toString() === userId);
            if (playerIndex === -1) {
                throw new CustomError(400, '您不在该房间中');
            }

            // 如果是房主且还有其他玩家，转移房主权限给第二个玩家
            if (room.createdBy.toString() === userId && room.players.length > 1) {
                const nextPlayer = room.players.find(p => p.userId.toString() !== userId);
                room.createdBy = nextPlayer.userId;
            }

            // 移除玩家
            room.players.splice(playerIndex, 1);

            // 如果没有玩家了，删除房间
            if (room.players.length === 0) {
                await Room.findByIdAndDelete(roomId);
                return { deleted: true };
            }

            await room.save();
            return {
                roomId: room._id,
                createdBy: room.createdBy,
                players: room.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    ready: p.ready,
                    isCreator: p.userId.toString() === room.createdBy.toString()
                }))
            };
        } catch (error) {
            if (error.name === 'CastError') {
                throw new CustomError(404, '房间不存在');
            }
            throw error;
        }
    }

    // 玩家准备/取消准备
    async toggleReady(userId, roomId) {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new CustomError(404, '房间不存在');
            }

            const player = room.players.find(p => p.userId.toString() === userId);
            if (!player) {
                throw new CustomError(400, '您不在该房间中');
            }

            // 切换准备状态
            player.ready = !player.ready;
            await room.save();

            // 修改计算所有玩家准备状态的逻辑
            const allReady = room.players.every(p => p.ready);

            const result = {
                roomId: room._id,
                name: room.name,
                players: room.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    ready: p.ready,
                    isCreator: p.userId.toString() === room.createdBy.toString()
                })),
                allReady,
                readyState: player.ready
            };

            return result;

        } catch (error) {
            if (error.name === 'CastError') {
                throw new CustomError(404, '房间不存在');
            }
            throw error;
        }
    }

    // 查找用户所在的房间
    async findUserRoom(userId) {
        return await Room.findOne({
            'players.userId': userId,
            status: 'waiting'
        });
    }

    // 邀请好友加入房间
    async inviteToRoom(userId, friendId, roomId) {
        // 检查房间是否存在
        const room = await Room.findById(roomId);
        if (!room) {
            throw new CustomError(404, '房间不存在');
        }

        // 检查是否是房间成员
        const isInRoom = room.players.some(p => p.userId.toString() === userId);
        if (!isInRoom) {
            throw new CustomError(403, '您不在该房间中');
        }

        // 检查好友是否存在
        const friend = await User.findById(friendId);
        if (!friend) {
            throw new CustomError(404, '好友不存在');
        }

        // 检查好友是否在线
        if (friend.status !== 'online') {
            throw new CustomError(400, '好友不在线');
        }

        // 检查是否已在房间中
        const friendInRoom = room.players.some(p => p.userId.toString() === friendId);
        if (friendInRoom) {
            throw new CustomError(400, '该好友已在房间中');
        }

        // 检查房间是否已满
        if (room.players.length >= room.maxPlayers) {
            throw new CustomError(400, '房间已满');
        }

        // 检查房间状态
        if (room.status !== 'waiting') {
            throw new CustomError(400, '房间已开始游戏');
        }

        // 检查是否是好友关系
        const areFriends = await this.checkFriendship(userId, friendId);
        if (!areFriends) {
            throw new CustomError(403, '该用户不是您的好友');
        }

        return {
            roomId: room._id,
            roomName: room.name,
            inviter: {
                userId,
                username: room.players.find(p => p.userId.toString() === userId)?.username
            },
            currentPlayers: room.players.length,
            maxPlayers: room.maxPlayers
        };
    }

    // 处理好友邀请响应
    async handleRoomInvitation(userId, roomId, accept) {
        // 检查房间是否存在
        const room = await Room.findById(roomId);
        if (!room) {
            throw new CustomError(404, '房间不存在或已解散');
        }

        // 检查用户是否存在
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        // 如果接受邀请
        if (accept) {
            // 检查用户是否已在其他房间
            const existingRoom = await Room.findOne({
                'players.userId': userId,
                status: 'waiting'
            });

            if (existingRoom) {
                throw new CustomError(400, '您已在其他房间中');
            }

            // 再次检查房间是否已满
            if (room.players.length >= room.maxPlayers) {
                throw new CustomError(400, '房间已满');
            }

            // 检查房间状态
            if (room.status !== 'waiting') {
                throw new CustomError(400, '房间已开始游戏');
            }

            // 将用户添加到房间
            room.players.push({
                userId: user._id,
                username: user.username,
                ready: false
            });

            await room.save();

            return {
                success: true,
                roomData: {
                    _id: room._id,
                    roomId: room._id,
                    name: room.name,
                    players: room.players.map(p => ({
                        userId: p.userId,
                        username: p.username,
                        ready: p.ready,
                        isCreator: p.userId.toString() === room.createdBy.toString()
                    })),
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                    createdBy: room.createdBy,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt
                }
            };
        }

        // 如果拒绝邀请
        return {
            success: false,
            message: '已拒绝邀请'
        };
    }

    // 检查好友关系
    async checkFriendship(userId1, userId2) {
        const user = await User.findById(userId1);
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }
        return user.friends.some(friendId => friendId.toString() === userId2.toString());
    }

    // 为机器人选择英雄
    async assignHeroesToBots(roomId) {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new CustomError(404, '房间不存在');
            }

            // 获取机器人数量（通过 userId 和 isBot 标记双重判断）
            // 先转换为普通对象
            const players = room.players.map(p => p.toObject());
            const bots = players.filter(p => {
                // 检查 userId 是否为机器人格式
                const isBotId = typeof p.userId === 'string' && p.userId.startsWith('bot_');
                // 检查 isBot 标记
                const hasIsBot = p.isBot === true;
                // 记录判断过程
                logger.debug('机器人判断:', {
                    userId: p.userId,
                    username: p.username,
                    isBotId,
                    hasIsBot,
                    userIdType: typeof p.userId
                });
                return isBotId || hasIsBot;
            });

            logger.info('为机器人分配英雄:', {
                roomId,
                totalPlayers: room.players.length,
                botCount: bots.length,
                bots: bots.map(b => ({
                    userId: b.userId,
                    username: b.username,
                    isBot: b.isBot,
                    isBotId: b.userId.startsWith('bot_')
                }))
            });

            // 如果没有机器人，直接返回
            if (bots.length === 0) {
                logger.info('房间中没有机器人，跳过分配', {
                    roomId,
                    totalPlayers: room.players.length,
                    players: players.map(p => ({
                        userId: p.userId,
                        username: p.username,
                        isBot: p.isBot,
                        isBotId: typeof p.userId === 'string' && p.userId.startsWith('bot_')
                    }))
                });
                return room;
            }

            // 为每个机器人随机选择英雄
            await Promise.all(bots.map(async bot => {
                // 从可用英雄中随机选择一个
                const availableHeroes = bot.availableHeroes || [];
                if (availableHeroes.length === 0) {
                    logger.warn('机器人没有可用英雄:', {
                        botId: bot.userId,
                        botName: bot.username
                    });
                    return;
                }

                const randomIndex = Math.floor(Math.random() * availableHeroes.length);
                const selectedHeroId = availableHeroes[randomIndex];

                // 更新机器人的选择
                await Room.updateOne(
                    { 
                        _id: roomId,
                        'players.userId': bot.userId 
                    },
                    {
                        $set: {
                            'players.$.selectedHero': selectedHeroId,
                            'players.$.isBot': true // 确保 isBot 标记被设置
                        }
                    }
                );

                logger.info('机器人选择英雄:', {
                    roomId,
                    botId: bot.userId,
                    botName: bot.username,
                    selectedHero: selectedHeroId,
                    isBot: true,
                    isBotId: bot.userId.startsWith('bot_')
                });
            }));

            // 重新获取更新后的房间数据
            const updatedRoom = await Room.findById(roomId).lean(); // 使用 lean() 显式获取普通 JS 对象
            
            // 检查是否所有玩家都已选择英雄
            const allSelected = updatedRoom.players.every(p => p.selectedHero);
            
            // 如果所有玩家都选择了英雄,更新房间状态为 playing
            if (allSelected) {
                // 使用 updateOne 而不是 save
                const result = await Room.updateOne(
                    { _id: roomId },
                    { 
                        $set: { 
                            status: 'playing',
                            gameStarted: true,
                            gameStartTime: new Date()
                        } 
                    }
                );

                // 再次获取更新后的房间数据
                const finalRoom = await Room.findById(roomId).lean();

                logger.info('所有玩家已选择英雄,游戏开始', {
                    roomId,
                    players: finalRoom.players.map(p => ({
                        userId: p.userId,
                        username: p.username,
                        heroId: p.selectedHero,
                        isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_'))
                    })),
                    updateResult: result
                });

                // 返回最终的房间状态
                return {
                    ...finalRoom,
                    gameStarted: true
                };
            }

            // 如果还没有全部选择完,返回当前状态
            return {
                ...updatedRoom,
                gameStarted: false
            };

        } catch (error) {
            logger.error('机器人选择英雄失败:', error);
            throw error;
        }
    }

    // 处理匹配超时
    async handleMatchTimeout(userId) {
        try {
            logger.info(`LobbyService Version ${this.version} - Handling Match Timeout`);
            const player = await MatchQueue.findOne({ userId });
            if (!player) {
                throw new CustomError(404, '未在匹配队列中');
            }

            // 获取玩家等待时间
            const waitTime = Date.now() - player.startTime;
            
            logger.info('匹配等待超时,添加机器人', {
                version: this.version,
                userId,
                playerCount: 1,
                waitTime,
                configWaitTime: gameConfig.BOT.WAIT_TIME
            });

            // 使用 matchService 创建带机器人的房间
            logger.info(`Using MatchService to create bot room`);
            const room = await matchService.createMatchRoom([userId], 7);

            // 保存机器人信息（如果需要跟踪）
            if (room) {
                const bots = room.players.filter(p => p.userId.startsWith('BOT_'));
                await Promise.all(bots.map(bot => 
                    Bot.create({
                        botId: bot.userId,
                        username: bot.username,
                        rating: 1000,
                        roomId: room._id
                    })
                ));
            }

            // 更新玩家状态
            await MatchQueue.findByIdAndUpdate(player._id, {
                status: 'matched',
                matchedRoom: room._id
            });

            return room;
        } catch (error) {
            logger.error('处理匹配超时失败:', {
                version: this.version,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = new LobbyService(); 
const lobbyService = require('../services/lobbyService');
const heroService = require('../services/heroService');
const logger = require('../utils/logger');
const Room = require('../models/room');
const User = require('../models/user');
const CustomError = require('../utils/customError');
const Hero = require('../models/hero');
const shopService = require('../services/shopService');
const gameConfig = require('../config/gameConfig');

class LobbyHandler {
    constructor(io) {
        this.io = io;
        this.selectionTimers = {}; // 存储房间的倒计时
    }

    // 初始化房间事件监听
    initialize(socket) {
        // 获取房间列表
        socket.on('getRooms', async (callback) => {
            try {
                const rooms = await lobbyService.getRooms();
                callback({ success: true, data: { rooms } });
            } catch (error) {
                logger.error('获取房间列表失败:', error);
                callback({ success: false, error: error.message });
            }
        });

        // 创建房间
        socket.on('createRoom', async (data, callback) => {
            try {
                const error = this.validateRoomName(data.name);
                if (error) {
                    return callback({ success: false, error });
                }

                const room = await lobbyService.createRoom(socket.user.id, data.name);
                
                // 加入 socket room
                socket.join(`room:${room.roomId}`);
                
                // 广播房间更新
                this.io.emit('roomListUpdated');
                
                callback({ 
                    success: true, 
                    data: room
                });
            } catch (error) {
                logger.error('创建房间失败:', error);
                callback({ success: false, error: error.message });
            }
        });

        // 加入房间
        socket.on('joinRoom', async (data, callback) => {
            try {
                logger.info('玩家尝试加入房间', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    roomId: data.roomId,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                const error = this.validateRoomId(data.roomId);
                if (error) {
                    logger.warn('房间ID验证失败', {
                        userId: socket.user._id,
                        roomId: data.roomId,
                        error: error
                    });
                    return callback({ success: false, error });
                }

                const roomData = await lobbyService.joinRoom(socket.user.id, data.roomId);
                
                // 加入 socket room
                socket.join(`room:${data.roomId}`);
                
                // 通知房间内所有玩家
                this.io.to(`room:${data.roomId}`).emit('playerJoined', {
                    roomId: data.roomId,
                    newPlayer: {
                        userId: socket.user.id,
                        username: socket.user.username,
                        ready: false,
                        isCreator: roomData.createdBy.toString() === socket.user.id.toString()
                    },
                    players: roomData.players.map(player => ({
                        userId: player.userId,
                        username: player.username,
                        ready: player.ready,
                        isCreator: player.userId.toString() === roomData.createdBy.toString()
                    }))
                });
                
                logger.info('玩家成功加入房间', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    roomId: data.roomId,
                    roomName: roomData.name,
                    playerCount: roomData.players.length,
                    maxPlayers: roomData.maxPlayers,
                    isCreator: roomData.createdBy.toString() === socket.user.id.toString(),
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                // 广播房间列表更新
                this.io.emit('roomListUpdated');
                
                callback({ success: true, data: roomData });
            } catch (error) {
                logger.error('加入房间失败', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    roomId: data.roomId,
                    error: error.message,
                    errorName: error.name,
                    stack: error.stack,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });

        // 处理玩家离开房间
        socket.on('leaveRoom', async (roomId) => {
            try {
                logger.info('玩家请求离开房间', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString(),
                    userId: socket.user._id,
                    username: socket.user.username
                });

                // 确保 roomId 存在
                if (!roomId) {
                    throw new Error('房间ID不能为空');
                }

                // 从房间中移除玩家
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new Error('房间不存在');
                }

                // 更新房间玩家列表
                room.players = room.players.filter(p => p.userId.toString() !== socket.user._id.toString());
                await room.save();

                // 离开 socket room
                socket.leave(`room:${roomId}`);

                // 广播玩家离开消息
                this.io.to(`room:${roomId}`).emit('playerLeft', {
                    userId: socket.user._id,
                    username: socket.user.username
                });

                logger.info('玩家成功离开房间', {
                    socketId: socket.id,
                    roomId,
                    userId: socket.user._id,
                    username: socket.user.username,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('离开房间失败:', {
                    error,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });

                socket.emit('error', {
                    message: '离开房间失败',
                    details: error.message
                });
            }
        });

        // 处理断开连接
        socket.on('disconnect', async () => {
            try {
                logger.info('玩家断开连接', {
                    socketId: socket.id,
                    userId: socket.user?._id,
                    username: socket.user?.username,
                    timestamp: new Date().toISOString()
                });

                if (socket.user) {
                    // 查找玩家所在的房间
                    const room = await Room.findOne({
                        'players.userId': socket.user._id,
                        status: { $in: ['waiting'] }  // 只处理等待中的房间
                    });

                    if (room) {
                        // 更新房间玩家列表
                        room.players = room.players.filter(p => p.userId.toString() !== socket.user._id.toString());
                        await room.save();

                        // 广播玩家离开消息
                        this.io.to(`room:${room._id}`).emit('playerLeft', {
                            userId: socket.user._id,
                            username: socket.user.username
                        });

                        logger.info('玩家离开房间(断开连接)', {
                            socketId: socket.id,
                            roomId: room._id,
                            userId: socket.user._id,
                            username: socket.user.username,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            } catch (error) {
                logger.error('处理断开连接失败:', error);
            }
        });

        // 处理准备状态切换
        socket.on('toggleReady', async (data, callback) => {
            try {
                const { roomId } = data;
                
                // 获取房间信息
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new Error('房间不存在');
                }

                // 找到当前玩家
                const player = room.players.find(p => 
                    p.userId.toString() === socket.user._id.toString()
                );
                
                if (!player) {
                    throw new Error('您不在该房间中');
                }

                // 切换准备状态
                player.ready = !player.ready;
                await room.save();

                // 检查是否所有玩家都准备好了
                const allReady = room.players.length > 1 && 
                    room.players.every(p => p.ready);

                // 广播准备状态变化
                this.io.to(`room:${roomId}`).emit('readyStateChanged', {
                    roomId,
                    players: room.players.map(p => ({
                        userId: p.userId,
                        username: p.username,
                        ready: p.ready,
                        isCreator: p.userId.toString() === room.createdBy.toString()
                    })),
                    changedPlayer: {
                        userId: player.userId,
                        username: player.username,
                        ready: player.ready
                    },
                    allReady
                });

                callback({ 
                    success: true,
                    data: {
                        ready: player.ready,
                        allReady
                    }
                });

            } catch (error) {
                logger.error('准备状态切换失败:', error);
                callback({ success: false, error: error.message });
            }
        });

        // 快速匹配
        socket.on('quickMatch', async (callback) => {
            try {
                const matchData = await lobbyService.startMatching(socket.user.id);
                callback({ success: true, data: matchData });
                
                // 开始匹配进程
                this.handleMatching(socket.user.id);
            } catch (error) {
                logger.error('开始匹配失败:', error);
                callback({ success: false, error: error.message });
            }
        });

        // 取消匹配
        socket.on('cancelMatch', async (callback) => {
            try {
                await lobbyService.cancelMatching(socket.user.id);
                callback({ success: true });
            } catch (error) {
                logger.error('取消匹配失败:', error);
                callback({ success: false, error: error.message });
            }
        });

        // 断开连接时的清理
        socket.on('disconnect', async () => {
            try {
                logger.info('用户断开连接，开始清理', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                // 查找用户所在的房间
                const room = await lobbyService.findUserRoom(socket.user.id);
                if (room) {
                    logger.info('用户在房间中，执行离开操作', {
                        userId: socket.user._id,
                        roomId: room._id,
                        roomName: room.name
                    });

                    const result = await lobbyService.leaveRoom(socket.user.id, room._id);
                    
                    if (result.deleted) {
                        this.io.emit('roomDeleted', { roomId: room._id });
                    } else {
                        this.io.to(`room:${room._id}`).emit('playerLeft', {
                            roomId: room._id,
                            userId: socket.user.id,
                            players: result.players.map(player => ({
                                userId: player.userId,
                                username: player.username,
                                ready: player.ready,
                                isCreator: player.userId.toString() === result.createdBy?.toString()
                            }))
                        });
                    }
                    
                    this.io.emit('roomListUpdated');
                }
                
                // 取消匹配
                await lobbyService.cancelMatching(socket.user.id);

                logger.info('用户断开连接清理完成', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('断开连接清理失败', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    error: error.message,
                    errorName: error.name,
                    stack: error.stack,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 处理邀请好友加入房间
        socket.on('inviteToRoom', async (data, callback) => {
            try {
                const { friendId, roomId, userId } = data;
                
                logger.info('收到邀请好友请求:', {
                    friendId,
                    roomId,
                    userId,
                    socketUserId: socket.user._id
                });

                // 检查房间是否存在
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new CustomError(404, '房间不存在');
                }

                // 检查是否是房间成员
                const isInRoom = room.players.some(p => 
                    p.userId.toString() === socket.user._id.toString() || 
                    p.userId.toString() === userId.toString()
                );
                
                logger.info('检查用户是否在房间中:', {
                    isInRoom,
                    userId: socket.user._id,
                    players: room.players.map(p => p.userId.toString()),
                    roomId: room._id
                });

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
                const areFriends = await lobbyService.checkFriendship(socket.user._id, friendId);
                if (!areFriends) {
                    throw new CustomError(403, '该用户不是您的好友');
                }

                // 向好友发送邀请
                logger.info('准备向好友发送邀请:', {
                    friendId,
                    roomId: room._id,
                    inviter: socket.user.username,
                    socketRooms: Array.from(socket.rooms),
                    friendSocketId: this.io.sockets.adapter.rooms.get(`user:${friendId}`)
                })

                this.io.to(`user:${friendId}`).emit('roomInvitation', {
                    roomId: room._id,
                    roomName: room.name,
                    inviter: {
                        userId: socket.user._id,
                        username: socket.user.username
                    },
                    currentPlayers: room.players.length,
                    maxPlayers: room.maxPlayers,
                    roomData: {
                        _id: room._id,
                        roomId: room._id,
                        name: room.name,
                        players: room.players,
                        maxPlayers: room.maxPlayers,
                        status: room.status,
                        createdBy: room.createdBy,
                        createdAt: room.createdAt,
                        updatedAt: room.updatedAt
                    }
                })

                logger.info('邀请已发送')

                callback({
                    success: true,
                    data: { message: '邀请已发送' }
                });

            } catch (error) {
                logger.error('处理邀请好友失败:', error);
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 处理邀请响应
        socket.on('handleRoomInvitation', async (data, callback) => {
            try {
                const { roomId, accept } = data;
                const userId = socket.user._id;

                logger.info('玩家响应房间邀请', {
                    userId,
                    roomId,
                    accept,
                    timestamp: new Date().toISOString()
                });

                const result = await lobbyService.handleRoomInvitation(userId, roomId, accept);

                if (result.success) {
                    // 如果接受邀请，加入房间
                    socket.join(`room:${roomId}`);

                    // 通知房间所有玩家
                    this.io.to(`room:${roomId}`).emit('playerJoined', {
                        roomId,
                        newPlayer: {
                            userId: socket.user._id,
                            username: socket.user.username,
                            ready: false
                        },
                        players: result.roomData.players
                    });

                    // 更新房间列表
                    this.io.emit('roomListUpdated');
                }

                // 通知邀请者处理结果
                const room = await Room.findById(roomId);
                if (room) {
                    const inviter = room.players.find(p => p.isCreator);
                    if (inviter) {
                        this.io.to(`user:${inviter.userId}`).emit('roomInviteResponse', {
                            success: accept,
                            friendName: socket.user.username,
                            message: accept ? '已加入房间' : '拒绝了邀请'
                        });
                    }
                }

                callback({
                    success: true,
                    data: result
                });

            } catch (error) {
                logger.error('处理房间邀请失败:', error);
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 加入用户专属房间
        socket.on('joinUserRoom', (userId, callback) => {
            try {
                const roomName = `user:${userId}`
                socket.join(roomName)
                logger.info('用户加入专属房间:', {
                    userId,
                    roomName,
                    socketId: socket.id
                })
                callback({ success: true })
            } catch (error) {
                logger.error('加入用户专属房间失败:', error)
                callback({ success: false, error: error.message })
            }
        })

        // 开始匹配
        socket.on('startMatching', async (callback) => {
            try {
                logger.info('玩家开始匹配', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });

                const matchQueue = await lobbyService.startMatching(socket.user._id);
                
                // 加入匹配队列房间
                socket.join('matching');
                logger.info('玩家加入匹配队列', {
                    userId: socket.user._id,
                    queueId: matchQueue._id,
                    rating: matchQueue.rating,
                    timestamp: new Date().toISOString()
                });
                
                callback({ success: true, data: matchQueue });

                // 开始检查匹配
                this.checkMatchingInterval = setInterval(async () => {
                    logger.debug('检查匹配队列', {
                        userId: socket.user._id,
                        timestamp: new Date().toISOString()
                    });

                    const matchResult = await lobbyService.checkMatching();
                    if (matchResult?.success) {
                        logger.info('匹配成功', {
                            roomId: matchResult.roomId,
                            players: matchResult.players,
                            timestamp: new Date().toISOString()
                        });

                        // 通知所有匹配成功的玩家
                        matchResult.players.forEach(playerId => {
                            logger.debug('发送匹配成功通知', {
                                toUserId: playerId,
                                roomId: matchResult.roomId,
                                timestamp: new Date().toISOString()
                            });

                            this.io.to(`user:${playerId}`).emit('matchFound', {
                                success: true,
                                roomId: matchResult.roomId,
                                message: '匹配成功，即将进入游戏'
                            });
                        });

                        // 清除匹配检查定时器
                        if (this.checkMatchingInterval) {
                            clearInterval(this.checkMatchingInterval);
                            logger.debug('停止匹配检查', {
                                userId: socket.user._id,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }, 3000);

            } catch (error) {
                logger.error('开始匹配失败:', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });

        // 取消匹配
        socket.on('cancelMatching', async (callback) => {
            try {
                logger.info('玩家取消匹配', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });

                const result = await lobbyService.cancelMatching(socket.user._id);
                
                // 离开匹配队列房间
                socket.leave('matching');
                logger.debug('玩家离开匹配队列', {
                    userId: socket.user._id,
                    timestamp: new Date().toISOString()
                });
                
                // 清除匹配检查定时器
                if (this.checkMatchingInterval) {
                    clearInterval(this.checkMatchingInterval);
                    logger.debug('停止匹配检查', {
                        userId: socket.user._id,
                        timestamp: new Date().toISOString()
                    });
                }
                
                callback({ success: true });
                logger.info('取消匹配成功', {
                    userId: socket.user._id,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('取消匹配失败:', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });

        // 在 socket 断开连接时清理
        socket.on('disconnect', () => {
            if (this.checkMatchingInterval) {
                clearInterval(this.checkMatchingInterval);
            }
        });

        // 获取可选英雄
        socket.on('getAvailableHeroes', async (data, callback) => {
            try {
                const { roomId } = data;
                
                logger.info('获取可选英雄请求', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    roomId
                });

                // 获取房间信息
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new CustomError(404, '房间不存在');
                }
                
                logger.info('房间信息:', {
                    roomId,
                    status: room.status,
                    players: room.players.map(p => ({
                        userId: p.userId,
                        username: p.username,
                        availableHeroes: p.availableHeroes
                    }))
                });

                // 获取当前玩家
                const player = room.players.find(p => 
                    p.userId.toString() === socket.user._id.toString()
                );
                
                if (!player) {
                    throw new CustomError(400, '您不在该房间中');
                }
                
                // 如果是机器人，直接分配一个随机英雄
                if (player.isBot) {
                    const randomHero = await Hero.aggregate([
                        { $sample: { size: 1 } },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                description: 1,
                                health: 1,
                                ability_name: 1,
                                ability_description: 1,
                                ability_type: 1,
                                ability_cost: 1,
                                ability_effect: 1
                            }
                        }
                    ]);
                    
                    if (randomHero.length > 0) {
                        player.selectedHero = randomHero[0]._id;
                        await room.save();
                        
                        logger.info('机器人自动选择英雄:', {
                            roomId,
                            botId: player.userId,
                            botName: player.username,
                            selectedHero: randomHero[0].name
                        });
                        
                        // 通知其他玩家机器人已选择英雄
                        socket.to(`room:${roomId}`).emit('playerSelectedHero', {
                            userId: player.userId,
                            username: player.username,
                            heroId: randomHero[0]._id
                        });
                        
                        return;
                    }
                }
                
                logger.info('当前玩家信息:', {
                    userId: player.userId,
                    username: player.username,
                    availableHeroes: player.availableHeroes
                });

                // 获取玩家可选英雄的详细信息
                const heroes = await Hero.find({
                    _id: { $in: player.availableHeroes }
                })
                .select('_id name description health ability_name ability_description ability_type ability_cost ability_effect');

                logger.info('查询到的英雄详情:', {
                    heroCount: heroes.length,
                    heroes: JSON.stringify(heroes.map(h => ({
                        id: h._id,
                        name: h.name,
                        description: h.description,
                        health: h.health,
                        ability: {
                            name: h.ability_name,
                            description: h.ability_description,
                            type: h.ability_type,
                            cost: h.ability_cost,
                            effect: h.ability_effect
                        }
                    })), null, 2)
                });

                logger.info('获取英雄列表成功', {
                    userId: socket.user._id,
                    heroCount: heroes.length,
                    heroes: JSON.stringify(heroes.map(h => ({
                        id: h._id,
                        name: h.name,
                        ability: {
                            name: h.ability_name,
                            description: h.ability_description,
                            type: h.ability_type,
                            cost: h.ability_cost,
                            effect: h.ability_effect
                        }
                    })), null, 2)
                });

                // 开始英雄选择倒计时
                this.startHeroSelectionTimer(roomId);

                callback({ 
                    success: true, 
                    data: { 
                        heroes,
                        selectionTimeLimit: gameConfig.TIME_LIMITS.HERO_SELECTION // 使用配置的时间
                    } 
                });
            } catch (error) {
                logger.error('获取可选英雄列表失败:', error);
                callback({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // 确认英雄选择
        socket.on('confirmHeroSelection', async ({ roomId, heroId }) => {
            try {
                // 获取用户ID
                const userId = socket.user._id;
                
                logger.info('玩家确认英雄选择:', {
                    userId,
                    username: socket.user.username,
                    roomId,
                    heroId
                });

                // 查找并更新房间
                const room = await Room.findOneAndUpdate(
                    { 
                        _id: roomId,
                        'players.userId': userId 
                    },
                    {
                        $set: {
                            'players.$.selectedHero': heroId,
                            'players.$.ready': true
                        }
                    },
                    { new: true }
                );

                if (!room) {
                    throw new Error('房间不存在或您不在该房间中');
                }

                // 检查是否所有玩家都已选择英雄
                const allSelected = room.players.every(p => p.selectedHero);
                
                // 广播选择结果
                this.io.to(`room:${roomId}`).emit('heroSelectionUpdated', {
                    userId,
                    heroId,
                    allSelected
                });

                // 如果所有玩家都已选择，取消倒计时并开始游戏
                if (allSelected) {
                    // 清除该房间的倒计时
                    if (this.selectionTimers && this.selectionTimers[roomId]) {
                        clearTimeout(this.selectionTimers[roomId]);
                        delete this.selectionTimers[roomId];
                    }
                    
                    await this.startGame(room);
                }

            } catch (error) {
                logger.error('确认英雄选择失败:', error);
                socket.emit('error', {
                    message: '确认英雄选择失败',
                    details: error.message
                });
            }
        });

        // 检查房间状态
        socket.on('checkRoomStatus', async (data, callback) => {
            try {
                const { roomId } = data;
                
                logger.info('检查房间状态', {
                    userId: socket.user._id,
                    roomId
                });
                
                // 获取房间信息
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new CustomError(404, '房间不存在');
                }
                
                // 检查房间状态
                if (!['selecting', 'waiting'].includes(room.status)) {
                    throw new CustomError(400, '房间状态错误');
                }
                
                // 检查玩家是否在房间中
                const isPlayerInRoom = room.players.some(p => 
                    p.userId.toString() === socket.user._id.toString()
                );
                
                if (!isPlayerInRoom) {
                    // 如果玩家不在房间中，尝试加入房间
                    if (room.players.length < room.maxPlayers) {
                        room.players.push({
                            userId: socket.user._id,
                            username: socket.user.username,
                            ready: true
                        });
                        await room.save();
                    } else {
                        throw new CustomError(400, '房间已满');
                    }
                }
                
                callback({
                    success: true,
                    data: {
                        status: room.status,
                        players: room.players.length,
                        ready: room.status === 'selecting' && room.players.length > 0
                    }
                });
                
            } catch (error) {
                logger.error('检查房间状态失败:', error);
                callback({ success: false, error: error.message });
            }
        });

        // 开始游戏
        socket.on('startGame', async (data, callback) => {
            try {
                const { roomId } = data;
                logger.info('请求开始游戏:', {
                    roomId,
                    userId: socket.user._id,
                    timestamp: new Date().toISOString()
                });

                // 获取房间信息
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new CustomError(404, '房间不存在');
                }

                // 检查是否是房主
                if (room.createdBy.toString() !== socket.user._id.toString()) {
                    throw new CustomError(403, '只有房主可以开始游戏');
                }

                // 检查玩家数量
                if (room.players.length < 2) {
                    throw new CustomError(400, '玩家数量不足');
                }

                // 检查所有玩家是否已准备
                const notReadyPlayers = room.players.filter(p => !p.ready);
                if (notReadyPlayers.length > 0) {
                    throw new CustomError(400, '有玩家尚未准备');
                }

                // 更新房间状态为选择英雄阶段
                await Room.updateOne(
                    { _id: roomId },
                    { 
                        $set: { 
                            status: 'selecting',  // 先进入英雄选择阶段
                            phase: 'preparation'   // 直接设置为准备阶段
                        }
                    }
                );

                // 通知房间内所有玩家游戏开始
                this.io.to(`room:${roomId}`).emit('gameStarting', {
                    roomId,
                    status: 'selecting',
                    phase: 'preparation'
                });

                // 开始英雄选择阶段
                await this.startHeroSelection(room);

                callback({ success: true });

            } catch (error) {
                logger.error('开始游戏失败:', {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                callback({ 
                    success: false, 
                    error: error.message 
                });
            }
        });
    }

    // 开始英雄选择阶段
    async startHeroSelection(room) {
        try {
            logger.info('开始英雄选择阶段:', {
                roomId: room._id,
                duration: gameConfig.TIME_LIMITS.HERO_SELECTION,
                timestamp: new Date().toISOString()
            });

            // 为每个玩家分配可选英雄
            for (const player of room.players) {
                // 随机选择3个英雄供玩家选择
                const availableHeroes = await Hero.aggregate([
                    { $sample: { size: 3 } }
                ]);

                await Room.updateOne(
                    { 
                        _id: room._id,
                        'players.userId': player.userId 
                    },
                    {
                        $set: { 
                            'players.$.availableHeroes': availableHeroes,
                            'players.$.selectedHero': null
                        }
                    }
                );

                // 通知玩家可选的英雄
                this.io.to(`user:${player.userId}`).emit('heroSelectionStarted', {
                    heroes: availableHeroes
                });
            }

            // 使用配置的选择时间
            setTimeout(async () => {
                await this.endHeroSelection(room._id);
            }, gameConfig.TIME_LIMITS.HERO_SELECTION * 1000);

        } catch (error) {
            logger.error('开始英雄选择失败:', {
                roomId: room._id,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // 结束英雄选择阶段
    async endHeroSelection(roomId) {
        try {
            logger.info('结束英雄选择阶段:', {
                roomId,
                timestamp: new Date().toISOString()
            });

            const room = await Room.findById(roomId);
            
            // 为未选择英雄的玩家随机分配英雄
            for (const player of room.players) {
                if (!player.selectedHero && player.availableHeroes?.length > 0) {
                    const randomHero = player.availableHeroes[0];
                    await Room.updateOne(
                        { 
                            _id: roomId,
                            'players.userId': player.userId 
                        },
                        {
                            $set: { 'players.$.selectedHero': randomHero._id }
                        }
                    );
                }
            }

            // 更新房间状态并开始游戏
            await Room.updateOne(
                { _id: roomId },
                { 
                    $set: { 
                        status: 'playing',
                        phase: 'preparation',  // 保持准备阶段
                        turn: 1
                    }
                }
            );

            // 获取更新后的房间数据
            const updatedRoom = await Room.findById(roomId);
            logger.info('房间状态已更新:', {
                roomId,
                status: updatedRoom.status,
                phase: updatedRoom.phase,
                turn: updatedRoom.turn,
                timestamp: new Date().toISOString()
            });

            // 使用更新后的房间数据创建游戏处理器并开始游戏
            const gameHandler = new GameHandler(this.io);
            await gameHandler.startGame(updatedRoom);

        } catch (error) {
            logger.error('结束英雄选择失败:', {
                roomId,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // 处理匹配逻辑
    async handleMatching(userId) {
        // 这里实现匹配逻辑
        // 可以定期检查匹配队列，将符合条件的玩家匹配在一起
    }

    validateRoomName(name) {
        if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
            return '房间名长度应在1-50个字符之间';
        }
        return null;
    }

    validateRoomId(roomId) {
        if (!roomId || !roomId.match(/^[0-9a-fA-F]{24}$/)) {
            return '无效的房间ID';
        }
        return null;
    }

    // 开始英雄选择计时
    startHeroSelectionTimer(roomId) {
        logger.info('开始英雄选择计时:', {
            roomId,
            duration: gameConfig.TIME_LIMITS.HERO_SELECTION
        });

        // 使用配置的英雄选择时间
        setTimeout(async () => {
            try {
                const room = await Room.findById(roomId);
                if (!room || room.status !== 'selecting') {
                    return;
                }

                logger.info('英雄选择时间到:', {
                    roomId,
                    configDuration: gameConfig.TIME_LIMITS.HERO_SELECTION
                });

                // 为未选择英雄的玩家随机选择
                await this.handleHeroSelectionTimeout(room);

            } catch (error) {
                logger.error('英雄选择超时处理失败:', {
                    roomId,
                    error: error.message,
                    stack: error.stack
                });
            }
        }, gameConfig.TIME_LIMITS.HERO_SELECTION * 1000);  // 转换为毫秒
    }

    // 处理倒计时结束
    async handleTimeUp(roomId) {
        try {
            const room = await Room.findById(roomId);
            if (!room) return;

            // 为未选择英雄的玩家随机分配英雄
            const unselectedPlayers = room.players.filter(p => !p.selectedHero);
            
            for (const player of unselectedPlayers) {
                // 随机选择一个英雄
                const randomHero = await Hero.aggregate([
                    { $sample: { size: 1 } }
                ]);

                if (randomHero.length > 0) {
                    player.selectedHero = randomHero[0]._id;
                    player.ready = true;

                    // 通知玩家被随机分配了英雄
                    this.io.to(`room:${roomId}`).emit('heroSelectionUpdated', {
                        userId: player.userId,
                        heroId: randomHero[0]._id,
                        isAutoSelected: true
                    });
                }
            }

            // 保存更新后的房间
            await room.save();

            // 开始游戏
            await this.startGame(room);

        } catch (error) {
            logger.error('处理英雄选择超时失败:', error);
        }
    }

    // 开始游戏的逻辑抽取为独立方法
    async startGame(room) {
        try {
            logger.info('开始游戏初始化:', {
                roomId: room._id,
                players: room.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    heroId: p.selectedHero,
                    isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_'))
                }))
            });

            // 更新房间状态
            await Room.updateOne(
                { _id: room._id },
                { 
                    $set: { 
                        status: 'playing',
                        gameStarted: true,
                        gameStartTime: new Date()
                    } 
                }
            );
            logger.debug('房间状态已更新为游戏中');

            // 获取最终的房间状态
            const finalRoom = await Room.findById(room._id).lean();
            
            // 获取所有选择的英雄ID
            const heroIds = finalRoom.players.map(p => p.selectedHero);
            logger.debug('收集英雄ID:', { heroIds });
            
            // 查询英雄详情
            const heroes = await Hero.find(
                { _id: { $in: heroIds } },
                {
                    _id: 1,
                    name: 1,
                    description: 1,
                    health: 1,
                    ability_name: 1,
                    ability_description: 1,
                    ability_type: 1,
                    ability_cost: 1,
                    ability_effect: 1
                }
            ).lean();

            logger.debug('获取到英雄详情:', {
                heroCount: heroes.length,
                heroes: heroes.map(h => ({
                    id: h._id,
                    name: h.name,
                    ability: h.ability_name
                }))
            });

            // 创建英雄ID到英雄详情的映射
            const heroDetails = heroes.reduce((acc, hero) => {
                acc[hero._id.toString()] = hero;
                return acc;
            }, {});
            
            // 准备游戏初始数据
            const gameStartData = {
                roomId: room._id,
                gameId: finalRoom._id,
                players: finalRoom.players.map(p => {
                    const heroId = p.selectedHero.toString();
                    const hero = heroDetails[heroId];
                    
                    if (!hero) {
                        logger.error('未找到英雄详情:', {
                            heroId,
                            playerId: p.userId,
                            playerName: p.username
                        });
                        throw new Error(`未找到英雄详情: ${heroId}`);
                    }
                    
                    return {
                        userId: p.userId,
                        username: p.username,
                        heroId: p.selectedHero,
                        isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_')),
                        health: gameConfig.INITIAL_HEALTH,  // 使用配置的初始生命值
                        coins: gameConfig.INITIAL_COINS,    // 使用配置的初始金币
                        tavernTier: gameConfig.INITIAL_TAVERN_TIER,
                        board: [],
                        hand: [],
                        hero: {
                            id: hero._id,
                            name: hero.name,
                            description: hero.description,
                            health: hero.health,
                            ability: {
                                name: hero.ability_name,
                                description: hero.ability_description,
                                type: hero.ability_type,
                                cost: hero.ability_cost,
                                effect: hero.ability_effect
                            }
                        }
                    };
                }),
                turn: 1,
                phase: 'preparation',
                startTime: finalRoom.gameStartTime
            };

            logger.info('游戏初始数据准备完成:', {
                roomId: room._id,
                gameId: gameStartData.gameId,
                playerCount: gameStartData.players.length,
                players: gameStartData.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    heroName: p.hero.name,
                    ability: p.hero.ability.name,
                    initialCoins: p.coins,  // 添加初始金币
                    initialHealth: p.health,  // 添加初始生命值
                    tavernTier: p.tavernTier  // 添加酒馆等级
                })),
                gameConfig: {  // 添加游戏配置信息
                    initialCoins: gameConfig.INITIAL_COINS,
                    refreshCost: gameConfig.REFRESH_COST,
                    minionPurchaseCost: gameConfig.MINION_PURCHASE_COST,
                    minionSellRefund: gameConfig.MINION_SELL_REFUND
                },
                timestamp: new Date().toISOString()
            });
            
            // 在发送游戏开始事件前记录详细日志
            logger.debug('准备发送游戏开始事件:', {
                roomId: room._id,
                gameId: gameStartData.gameId,
                playerDetails: gameStartData.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    isBot: p.isBot,
                    coins: p.coins,
                    health: p.health,
                    tavernTier: p.tavernTier,
                    hero: {
                        name: p.hero.name,
                        ability: p.hero.ability.name
                    }
                })),
                phase: gameStartData.phase,
                turn: gameStartData.turn,
                startTime: gameStartData.startTime,
                timestamp: new Date().toISOString()
            });

            // 广播游戏开始事件
            this.io.to(`room:${room._id}`).emit('gameStart', gameStartData);
            logger.debug('已发送游戏开始事件');

            // 将所有玩家从大厅房间移动到游戏房间
            const realPlayers = room.players.filter(p => 
                !p.isBot && !(typeof p.userId === 'string' && p.userId.startsWith('BOT_'))
            ).map(p => p.userId.toString());

            logger.debug('准备移动真实玩家到游戏房间:', {
                totalPlayers: room.players.length,
                realPlayers: realPlayers.length,
                playerIds: realPlayers
            });

            realPlayers.forEach(playerId => {
                const playerSocket = this.io.sockets.sockets.get(
                    Array.from(this.io.sockets.sockets.keys()).find(
                        id => this.io.sockets.sockets.get(id).user?._id.toString() === playerId
                    )
                );
                if (playerSocket) {
                    playerSocket.leave(`room:${room._id}`);
                    playerSocket.join(`game:${gameStartData.gameId}`);
                    logger.debug('玩家已移动到游戏房间:', {
                        userId: playerId,
                        from: `room:${room._id}`,
                        to: `game:${gameStartData.gameId}`
                    });
                } else {
                    logger.error('未找到真实玩家的Socket连接:', {
                        userId: playerId,
                        roomId: room._id
                    });
                }
            });

            // 更新房间状态
            room.status = 'playing';
            await room.save();
            logger.info('游戏初始化完成');

        } catch (error) {
            logger.error('游戏初始化失败:', {
                error: error.message,
                stack: error.stack,
                roomId: room._id,
                players: room.players.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    heroId: p.selectedHero
                }))
            });
            throw error;
        }
    }

    // 处理英雄选择超时
    async handleHeroSelectionTimeout(room) {
        try {
            logger.info('英雄选择超时处理:', {
                roomId: room._id,
                configDuration: gameConfig.TIME_LIMITS.HERO_SELECTION,
                timestamp: new Date().toISOString()
            });

            // 为未选择英雄的玩家随机分配英雄
            const unselectedPlayers = room.players.filter(p => !p.selectedHero);
            
            for (const player of unselectedPlayers) {
                // 随机选择一个英雄
                const randomHero = await Hero.aggregate([
                    { $sample: { size: 1 } }
                ]);

                if (randomHero.length > 0) {
                    player.selectedHero = randomHero[0]._id;
                    player.ready = true;

                    // 通知玩家被随机分配了英雄
                    this.io.to(`room:${room._id}`).emit('heroSelectionUpdated', {
                        userId: player.userId,
                        heroId: randomHero[0]._id,
                        isAutoSelected: true
                    });
                }
            }

            // 保存更新后的房间
            await room.save();

            // 开始游戏
            await this.startGame(room);

        } catch (error) {
            logger.error('处理英雄选择超时失败:', {
                roomId: room._id,
                error: error.message,
                stack: error.stack,
                configDuration: gameConfig.TIME_LIMITS.HERO_SELECTION
            });
        }
    }
}

module.exports = LobbyHandler; 
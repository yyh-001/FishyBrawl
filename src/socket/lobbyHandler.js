const lobbyService = require('../services/lobbyService');
const heroService = require('../services/heroService');
const logger = require('../utils/logger');
const Room = require('../models/room');
const User = require('../models/user');
const CustomError = require('../utils/customError');
const Hero = require('../models/hero');

class LobbyHandler {
    constructor(io) {
        this.io = io;
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

                callback({ 
                    success: true, 
                    data: { heroes } 
                });
            } catch (error) {
                logger.error('获取可选英雄列表失败:', {
                    error: error.message,
                    stack: error.stack,
                    roomId: data?.roomId,
                    userId: socket.user._id
                });
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
                    { new: true } // 返回更新后的文档
                );

                if (!room) {
                    throw new Error('房间不存在或您不在该房间中');
                }

                // 检查是否所有玩家都已选择英雄
                const allSelected = room.players.every(p => p.selectedHero);
                
                logger.info('检查英雄选择状态:', {
                    roomId,
                    totalPlayers: room.players.length,
                    selectedCount: room.players.filter(p => p.selectedHero).length,
                    allSelected,
                    players: room.players.map(p => ({
                        userId: p.userId,
                        username: p.username,
                        selectedHero: p.selectedHero,
                        isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_'))
                    }))
                });

                // 广播选择结果
                this.io.to(`room:${roomId}`).emit('heroSelectionUpdated', {
                    userId,
                    heroId,
                    allSelected
                });

                // 如果所有玩家都已选择，则开始游戏
                if (allSelected) {
                    logger.info('所有玩家已选择英雄，准备开始游戏:', {
                        roomId,
                        players: room.players.map(p => ({
                            userId: p.userId,
                            username: p.username,
                            heroId: p.selectedHero,
                            isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_'))
                        }))
                    });

                    // 更新房间状态
                    await Room.updateOne(
                        { _id: roomId },
                        { 
                            $set: { 
                                status: 'playing',
                                gameStarted: true,
                                gameStartTime: new Date()
                            } 
                        }
                    );

                    // 获取最终的房间状态
                    const finalRoom = await Room.findById(roomId).lean();
                    
                    // 准备游戏初始数据
                    const gameStartData = {
                        roomId,
                        gameId: finalRoom._id,
                        players: finalRoom.players.map(p => ({
                            userId: p.userId,
                            username: p.username,
                            heroId: p.selectedHero,
                            isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_')),
                            health: 40,
                            coins: 3,
                            tavernTier: 1,
                            board: [],
                            hand: []
                        })),
                        turn: 1,
                        phase: 'preparation',
                        startTime: finalRoom.gameStartTime
                    };
                    
                    logger.info('发送游戏开始事件:', {
                        roomId,
                        gameStartData
                    });
                    
                    // 广播游戏开始事件
                    this.io.to(`room:${roomId}`).emit('gameStart', gameStartData);

                    // 将所有玩家从大厅房间移动到游戏房间
                    const players = room.players.map(p => p.userId.toString());
                    players.forEach(playerId => {
                        const playerSocket = this.io.sockets.sockets.get(
                            Array.from(this.io.sockets.sockets.keys()).find(
                                id => this.io.sockets.sockets.get(id).user?._id.toString() === playerId
                            )
                        );
                        if (playerSocket) {
                            playerSocket.leave(`room:${room._id}`);
                            playerSocket.join(`game:${gameStartData.gameId}`);
                        }
                    });

                    // 更新房间状态
                    room.status = 'playing';
                    await room.save();

                } else {
                    logger.info('等待其他玩家选择英雄:', {
                        roomId,
                        waitingPlayers: room.players
                            .filter(p => !p.selectedHero)
                            .map(p => ({
                                userId: p.userId,
                                username: p.username,
                                isBot: p.isBot || (typeof p.userId === 'string' && p.userId.startsWith('BOT_'))
                            }))
                    });
                }

                // 发送确认响应
                socket.emit('heroSelectionConfirmed', {
                    success: true,
                    data: {
                        userId,
                        heroId,
                        allSelected
                    }
                });

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
}

module.exports = LobbyHandler; 
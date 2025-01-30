const lobbyService = require('../services/lobbyService');
const logger = require('../utils/logger');
const Room = require('../models/room');
const User = require('../models/user');
const CustomError = require('../utils/customError');

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

        // 离开房间
        socket.on('leaveRoom', async (callback) => {
            try {
                logger.info('玩家请求离开房间', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    socketId: socket.id
                });

                // 获取玩家当前所在的房间
                const room = await Room.findOne({
                    'players.userId': socket.user._id,
                    status: 'waiting'
                });

                if (!room) {
                    return callback({ success: true });
                }

                // 从房间中移除玩家
                await Room.updateOne(
                    { _id: room._id },
                    { $pull: { players: { userId: socket.user._id } } }
                );

                // 离开 socket room
                socket.leave(`room:${room._id}`);

                // 获取更新后的房间数据
                const updatedRoom = await Room.findById(room._id);

                // 如果房间没有玩家了，删除房间
                if (!updatedRoom.players.length) {
                    await Room.deleteOne({ _id: room._id });
                    this.io.to(`room:${room._id}`).emit('roomDeleted');
                } else {
                    // 通知房间内其他玩家
                    this.io.to(`room:${room._id}`).emit('playerLeft', {
                        userId: socket.user._id,
                        username: socket.user.username
                    });

                    // 广播更新后的房间数据
                    this.io.to(`room:${room._id}`).emit('roomUpdated', {
                        roomId: updatedRoom._id,
                        name: updatedRoom.name,
                        players: updatedRoom.players,
                        maxPlayers: updatedRoom.maxPlayers,
                        status: updatedRoom.status,
                        createdBy: updatedRoom.createdBy
                    });
                }

                // 广播房间列表更新
                this.io.emit('roomListUpdated');

                callback({ success: true });
            } catch (error) {
                logger.error('离开房间失败:', error);
                callback({ success: false, error: error.message });
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
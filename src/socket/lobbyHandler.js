const lobbyService = require('../services/lobbyService');
const logger = require('../utils/logger');

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
        socket.on('leaveRoom', async (data, callback) => {
            try {
                logger.info('玩家尝试离开房间', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                // 先查找用户所在的房间
                const room = await lobbyService.findUserRoom(socket.user.id);
                if (!room) {
                    logger.warn('用户不在任何房间中', {
                        userId: socket.user._id,
                        username: socket.user.username
                    });
                    return callback({ success: false, error: '您不在任何房间中' });
                }

                const result = await lobbyService.leaveRoom(socket.user.id, room._id);
                
                // 离开 socket room
                socket.leave(`room:${room._id}`);
                
                if (result.deleted) {
                    // 如果房间被删除，通知所有客户端
                    this.io.emit('roomDeleted', { roomId: room._id });
                } else {
                    // 通知房间内其他玩家
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
                
                logger.info('玩家成功离开房间', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    roomId: room._id,
                    roomName: room.name,
                    deleted: result.deleted,
                    remainingPlayers: result.players?.length || 0,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                // 广播房间列表更新
                this.io.emit('roomListUpdated');
                
                callback({ success: true, data: result });
            } catch (error) {
                logger.error('离开房间失败', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    error: error.message,
                    errorName: error.name,
                    stack: error.stack,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });

        // 准备/取消准备
        socket.on('toggleReady', async (data, callback) => {
            try {
                const result = await lobbyService.toggleReady(socket.user.id, data.roomId);
                
                // 通知房间内所有玩家
                this.io.to(`room:${data.roomId}`).emit('readyStateChanged', {
                    players: result.players,
                    allReady: result.allReady
                });
                
                callback({ success: true, data: result });
            } catch (error) {
                logger.error('更新准备状态失败:', error);
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
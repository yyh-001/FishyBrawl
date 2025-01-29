const friendService = require('../services/friendService');
const logger = require('../utils/logger');

class FriendHandler {
    constructor(io) {
        this.io = io;
    }

    initialize(socket) {
        if (!socket.user) {
            logger.error('Socket 未包含用户信息');
            return;
        }

        logger.info('初始化好友处理器:', {
            userId: socket.user._id,
            username: socket.user.username,
            socketId: socket.id
        });

        // 获取好友列表
        socket.on('getFriends', async (callback) => {
            try {
                logger.info('用户请求获取好友列表', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                const friends = await friendService.getFriendList(socket.user.id);
                
                logger.info('获取好友列表成功', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    friendCount: friends.length,
                    friends: friends.map(f => ({
                        userId: f.userId,
                        username: f.username,
                        status: f.status
                    })),
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                callback({ success: true, data: { friends } });
            } catch (error) {
                logger.error('获取好友列表失败', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    error: error.message,
                    stack: error.stack,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });

        // 发送好友请求
        socket.on('sendFriendRequest', async (data, callback) => {
            logger.debug('收到好友请求:', {
                fromUser: {
                    id: socket.user._id,
                    username: socket.user.username
                },
                toUserId: data?.toUserId,
                message: data?.message,
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });

            try {
                // 请求开始日志
                console.log('\n[好友请求] 开始处理:', {
                    time: new Date().toISOString(),
                    from: socket.user.username,
                    to: data.toUserId,
                    message: data.message
                });

                // 参数验证
                if (!data.toUserId) {
                    console.warn('[好友请求] 参数验证失败:', {
                        error: '目标用户ID不能为空',
                        user: socket.user.username
                    });
                    return callback({ 
                        success: false, 
                        error: '目标用户ID不能为空',
                        requestSent: false
                    });
                }

                const result = await friendService.sendFriendRequest(
                    socket.user.id,
                    data.toUserId,
                    data.message
                );

                // 请求成功日志
                console.log('[好友请求] 处理成功:', {
                    requestId: result.requestId,
                    from: socket.user.username,
                    to: data.toUserId,
                    message: data.message,
                    status: result.status,
                    processingTime: `${Date.now() - new Date(socket.handshake.time).getTime()}ms`
                });

                // 通知目标用户前添加日志
                logger.info('准备发送好友请求通知:', {
                    toUserId: data.toUserId,
                    fromUser: {
                        userId: socket.user.id,
                        username: socket.user.username
                    },
                    socketRoom: `user:${data.toUserId}`,
                    requestId: result.requestId
                });

                // 通知目标用户
                this.io.to(`user:${data.toUserId}`).emit('friendRequestReceived', {
                    requestId: result.requestId,
                    fromUser: {
                        userId: socket.user.id,
                        username: socket.user.username
                    },
                    message: data.message,
                    timestamp: new Date().toISOString()
                });

                // 添加发送后的确认日志
                logger.info('好友请求通知已发送:', {
                    toUserId: data.toUserId,
                    requestId: result.requestId,
                    timestamp: new Date().toISOString()
                });

                // 返回成功信息
                callback({ 
                    success: true, 
                    data: {
                        requestId: result.requestId,
                        status: result.status,
                        requestSent: true,
                        message: '好友请求发送成功'
                    }
                });

                // 详细日志记录
                logger.info('好友请求完整处理记录', {
                    type: 'friendRequest',
                    status: 'success',
                    requestId: result.requestId,
                    fromUser: {
                        userId: socket.user._id,
                        username: socket.user.username
                    },
                    toUserId: data.toUserId,
                    message: data.message,
                    requestSent: true,
                    processingTime: Date.now() - new Date(socket.handshake.time).getTime(),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                // 错误日志
                console.error('\n[好友请求] 处理失败:', {
                    error: error.message,
                    from: socket.user.username,
                    to: data.toUserId
                });

                // 返回错误信息
                callback({ 
                    success: false, 
                    error: error.message,
                    requestSent: false
                });

                // 详细错误记录
                logger.error('好友请求失败详细信息', {
                    type: 'friendRequest',
                    status: 'error',
                    fromUser: {
                        userId: socket.user._id,
                        username: socket.user.username
                    },
                    toUserId: data.toUserId,
                    message: data.message,
                    requestSent: false,
                    error: {
                        name: error.name,
                        message: error.message,
                        code: error.code,
                        stack: error.stack
                    },
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 处理好友请求
        socket.on('handleFriendRequest', async (data, callback) => {
            try {
                // 请求开始日志
                console.log('\n[好友请求处理] 开始处理:', {
                    time: new Date().toISOString(),
                    user: socket.user.username,
                    requestId: data.requestId,
                    action: data.action
                });

                // 参数验证
                if (!data.requestId || !data.action) {
                    console.warn('[好友请求处理] 参数验证失败:', {
                        error: '请求ID和处理动作不能为空',
                        user: socket.user.username
                    });
                    return callback({ 
                        success: false, 
                        error: '请求ID和处理动作不能为空',
                        handled: false
                    });
                }

                const result = await friendService.handleFriendRequest(
                    data.requestId,
                    socket.user.id,
                    data.action
                );

                // 处理成功日志
                console.log('[好友请求处理] 处理成功:', {
                    requestId: data.requestId,
                    user: socket.user.username,
                    action: data.action,
                    status: result.status,
                    processingTime: `${Date.now() - new Date(socket.handshake.time).getTime()}ms`
                });

                // 通知发送请求的用户
                this.io.to(`user:${result.fromUser}`).emit('friendRequestHandled', {
                    requestId: result._id,
                    status: result.status,
                    toUser: {
                        userId: socket.user.id,
                        username: socket.user.username
                    }
                });

                // 返回成功信息
                callback({ 
                    success: true, 
                    data: {
                        requestId: result._id,
                        status: result.status,
                        handled: true,
                        message: `好友请求${data.action === 'accept' ? '接受' : '拒绝'}成功`
                    }
                });

                // 详细日志记录
                logger.info('好友请求处理完整记录', {
                    type: 'handleFriendRequest',
                    status: 'success',
                    requestId: data.requestId,
                    user: {
                        userId: socket.user._id,
                        username: socket.user.username
                    },
                    action: data.action,
                    result: result.status,
                    handled: true,
                    processingTime: Date.now() - new Date(socket.handshake.time).getTime(),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                // 错误日志
                console.error('\n[好友请求处理] 处理失败:', {
                    error: error.message,
                    user: socket.user.username,
                    requestId: data.requestId,
                    action: data.action
                });

                // 返回错误信息
                callback({ 
                    success: false, 
                    error: error.message,
                    handled: false
                });

                // 详细错误记录
                logger.error('好友请求处理失败详细信息', {
                    type: 'handleFriendRequest',
                    status: 'error',
                    user: {
                        userId: socket.user._id,
                        username: socket.user.username
                    },
                    requestId: data.requestId,
                    action: data.action,
                    handled: false,
                    error: {
                        name: error.name,
                        message: error.message,
                        code: error.code,
                        stack: error.stack
                    },
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 删除好友
        socket.on('removeFriend', async (data, callback) => {
            try {
                logger.info('用户请求删除好友', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    friendId: data.friendId,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                await friendService.removeFriend(socket.user.id, data.friendId);
                
                logger.info('删除好友成功', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    friendId: data.friendId,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                // 通知被删除的好友
                this.io.to(`user:${data.friendId}`).emit('friendRemoved', {
                    userId: socket.user.id,
                    username: socket.user.username
                });

                callback({ success: true });
            } catch (error) {
                logger.error('删除好友失败', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    friendId: data.friendId,
                    error: error.message,
                    stack: error.stack,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });

        // 获取好友请求
        socket.on('getFriendRequests', async (callback) => {
            try {
                logger.info('用户请求获取好友请求列表', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                const requests = await friendService.getFriendRequests(socket.user.id);
                
                logger.info('获取好友请求列表成功', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    requestCount: {
                        received: requests.received.length,
                        sent: requests.sent.length
                    },
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });

                callback({ success: true, data: { requests: requests.received } });
            } catch (error) {
                logger.error('获取好友请求列表失败', {
                    userId: socket.user._id,
                    username: socket.user.username,
                    error: error.message,
                    stack: error.stack,
                    connectionId: socket.id,
                    timestamp: new Date().toISOString()
                });
                callback({ success: false, error: error.message });
            }
        });
    }
}

module.exports = FriendHandler; 
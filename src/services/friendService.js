const User = require('../models/user');
const FriendRequest = require('../models/friendRequest');
const CustomError = require('../utils/customError');

class FriendService {
    // 发送好友请求
    async sendFriendRequest(fromUserId, toUserId, message) {
        // 检查发送者和接收者是否存在
        const [fromUser, toUser] = await Promise.all([
            User.findById(fromUserId),
            User.findById(toUserId)
        ]);

        if (!fromUser) {
            throw new CustomError(404, '发送者不存在');
        }

        if (!toUser) {
            throw new CustomError(404, '目标用户不存在');
        }

        // 检查是否是自己
        if (fromUserId === toUserId) {
            throw new CustomError(400, '不能向自己发送好友请求');
        }

        if (fromUser.friends.includes(toUserId)) {
            throw new CustomError(400, '该用户已经是您的好友');
        }

        // 检查是否已经发送过请求
        const existingRequest = await FriendRequest.findOne({
            fromUser: fromUserId,
            toUser: toUserId,
            status: 'pending'
        });

        if (existingRequest) {
            throw new CustomError(400, '已经发送过好友请求');
        }

        // 创建好友请求
        const request = await FriendRequest.create({
            fromUser: fromUserId,
            toUser: toUserId,
            message: message || '请求添加您为好友',
            status: 'pending'
        });

        return {
            requestId: request._id,
            status: request.status,
            toUser: {
                userId: toUser._id,
                username: toUser.username
            }
        };
    }

    // 处理好友请求
    async handleFriendRequest(requestId, userId, action) {
        const request = await FriendRequest.findById(requestId);
        if (!request) {
            throw new CustomError(404, '好友请求不存在');
        }

        if (request.toUser.toString() !== userId) {
            throw new CustomError(403, '无权处理该请求');
        }

        if (request.status !== 'pending') {
            throw new CustomError(400, '该请求已被处理');
        }

        if (action === 'accept') {
            // 修改这部分代码，分开更新两个用户
            await Promise.all([
                // 更新发送请求的用户
                User.findByIdAndUpdate(
                    request.fromUser,
                    { $addToSet: { friends: request.toUser } }
                ),
                // 更新接收请求的用户
                User.findByIdAndUpdate(
                    request.toUser,
                    { $addToSet: { friends: request.fromUser } }
                )
            ]);
            
            request.status = 'accepted';
        } else if (action === 'reject') {
            request.status = 'rejected';
        } else {
            throw new CustomError(400, '无效的操作');
        }

        await request.save();

        // 获取发送者信息以返回
        const fromUser = await User.findById(request.fromUser)
            .select('username rating');

        return {
            ...request.toObject(),
            fromUser: {
                userId: fromUser._id,
                username: fromUser.username,
                rating: fromUser.rating
            }
        };
    }

    // 获取好友列表
    async getFriendList(userId) {
        const user = await User.findById(userId).populate('friends', 'username rating status lastOnline');
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        return user.friends.map(friend => ({
            userId: friend._id,
            username: friend.username,
            rating: friend.rating,
            status: friend.status,
            lastOnline: friend.lastOnline
        }));
    }

    // 获取好友请求列表
    async getFriendRequests(userId) {
        const [received, sent] = await Promise.all([
            // 只获取 pending 状态的接收请求
            FriendRequest.find({ 
                toUser: userId,
                status: 'pending'  // 只返回待处理的请求
            })
                .populate('fromUser', 'username rating')
                .sort('-createdAt'),
            
            // 获取所有发送的请求，因为用户可能想看自己发送的请求的状态
            FriendRequest.find({ 
                fromUser: userId,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 只显示24小时内的请求
            })
                .populate('toUser', 'username')
                .sort('-createdAt')
        ]);

        return {
            received: received.map(req => ({
                requestId: req._id,
                fromUser: {
                    userId: req.fromUser._id,
                    username: req.fromUser.username,
                    rating: req.fromUser.rating
                },
                message: req.message,
                status: req.status,
                createdAt: req.createdAt
            })),
            sent: sent.map(req => ({
                requestId: req._id,
                toUser: {
                    userId: req.toUser._id,
                    username: req.toUser.username
                },
                status: req.status,
                createdAt: req.createdAt
            }))
        };
    }

    // 删除好友
    async removeFriend(userId, friendId) {
        const [user, friend] = await Promise.all([
            User.findById(userId),
            User.findById(friendId)
        ]);

        if (!user || !friend) {
            throw new CustomError(404, '用户不存在');
        }

        if (!user.friends.includes(friendId)) {
            throw new CustomError(400, '该用户不是您的好友');
        }

        // 双向删除好友关系
        await Promise.all([
            User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
            User.findByIdAndUpdate(friendId, { $pull: { friends: userId } })
        ]);

        return { message: '好友删除成功' };
    }
}

module.exports = new FriendService(); 
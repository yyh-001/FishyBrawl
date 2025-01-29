const Room = require('../models/room');
const MatchQueue = require('../models/matchQueue');
const User = require('../models/user');
const CustomError = require('../utils/customError');

class LobbyService {
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
    async createRoom(userId, name, maxPlayers) {
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

        const room = await Room.create({
            name,
            maxPlayers: maxPlayers || 8,
            createdBy: userId,
            players: [{
                userId,
                username: user.username,
                ready: false
            }],
            status: 'waiting'
        });

        return {
            roomId: room._id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            status: room.status,
            createdBy: room.createdBy,
            players: [{
                userId: user._id,
                username: user.username,
                ready: false,
                isCreator: true
            }],
            isCreator: true
        };
    }

    // 开始匹配
    async startMatching(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError(404, '用户不存在');
        }

        // 检查是否已在匹配队列
        const existingMatch = await MatchQueue.findOne({ 
            userId, 
            status: 'matching' 
        });
        
        if (existingMatch) {
            throw new CustomError(400, '已在匹配队列中');
        }

        // 检查是否在房间中
        const existingRoom = await Room.findOne({
            'players.userId': userId,
            status: 'waiting'
        });

        if (existingRoom) {
            throw new CustomError(400, '您已在房间中，无法开始匹配');
        }

        const matchQueue = await MatchQueue.create({
            userId,
            rating: user.rating,
            status: 'matching'
        });

        return {
            matchId: matchQueue._id,
            status: 'matching',
            estimatedTime: 30
        };
    }

    // 取消匹配
    async cancelMatching(userId) {
        const matchQueue = await MatchQueue.findOne({ 
            userId, 
            status: 'matching' 
        });
        
        if (!matchQueue) {
            throw new CustomError(404, '未找到匹配记录');
        }

        matchQueue.status = 'cancelled';
        await matchQueue.save();
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
            if (room.status !== 'waiting') {
                throw new CustomError(400, '房间已开始游戏或已结束');
            }

            // 检查用户是否已在其他房间
            const existingRoom = await Room.findOne({
                'players.userId': userId,
                status: 'waiting'
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
}

module.exports = new LobbyService(); 
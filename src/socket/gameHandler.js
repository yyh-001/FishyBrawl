const Room = require('../models/room');
const logger = require('../utils/logger');
const CustomError = require('../utils/customError');
const shopService = require('../services/shopService');
const gameConfig = require('../config/gameConfig');

class GameHandler {
    constructor(io) {
        this.io = io;
    }

    initialize(socket) {
        // 刷新商店
        socket.on('refreshShop', async (data, callback) => {
            try {
                const { roomId } = data;
                
                // 获取最新的房间数据
                const room = await Room.findById(roomId);
                if (!room) {
                    throw new CustomError(404, '房间不存在');
                }

                // 获取当前玩家的最新状态
                const player = room.players.find(p => 
                    p.userId.toString() === socket.user._id.toString()
                );
                
                if (!player) {
                    throw new CustomError(400, '您不在该房间中');
                }

                logger.info('刷新商店前状态:', {
                    userId: socket.user._id,
                    currentCoins: player.coins,
                    refreshCost: gameConfig.REFRESH_COST
                });

                // 检查玩家金币是否足够
                if (player.coins < gameConfig.REFRESH_COST) {
                    throw new CustomError(400, '金币不足');
                }

                // 扣除刷新费用
                const remainingCoins = player.coins - gameConfig.REFRESH_COST;
                
                // 获取新的商店随从
                const minions = await shopService.refreshShop(player.tavernTier);

                logger.info('刷新商店结果:', {
                    userId: socket.user._id,
                    beforeCoins: player.coins,
                    afterCoins: remainingCoins,
                    minionsCount: minions.length
                });

                // 更新玩家金币和商店随从
                await Room.updateOne(
                    { 
                        _id: roomId,
                        'players.userId': socket.user._id 
                    },
                    {
                        $set: {
                            'players.$.coins': remainingCoins,
                            'players.$.shopMinions': minions
                        }
                    }
                );

                // 返回响应
                callback({
                    success: true,
                    data: {
                        minions: minions.map(m => ({
                            _id: m._id,
                            name: m.name,
                            attack: m.attack,
                            health: m.health,
                            tier: m.tier,
                            tribe: m.tribe,
                            abilities: m.abilities,
                            description: m.description
                        })),
                        remainingCoins
                    }
                });

            } catch (error) {
                logger.error('刷新商店失败:', {
                    error: error.message,
                    stack: error.stack,
                    userId: socket.user._id,
                    roomId: data.roomId,
                    timestamp: new Date().toISOString()
                });
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 购买随从
        socket.on('buyMinion', async (data, callback) => {
            try {
                const { roomId, minionId, position } = data;
                // TODO: 实现购买随从逻辑
            } catch (error) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 出售随从
        socket.on('sellMinion', async (data, callback) => {
            try {
                const { roomId, minionId } = data;
                // TODO: 实现出售随从逻辑
            } catch (error) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 升级酒馆
        socket.on('upgradeTavern', async (data, callback) => {
            try {
                const { roomId } = data;
                // TODO: 实现升级酒馆逻辑
            } catch (error) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 使用英雄技能
        socket.on('useHeroPower', async (data, callback) => {
            try {
                const { roomId, targetId } = data;
                // TODO: 实现英雄技能逻辑
            } catch (error) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 结束回合
        socket.on('endTurn', async (data, callback) => {
            try {
                const { roomId } = data;
                // TODO: 实现结束回合逻辑
            } catch (error) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        });

        // 冻结/解冻随从
        socket.on('toggleFreeze', async (data, callback) => {
            try {
                const { roomId, minionId } = data;
                // TODO: 实现冻结/解冻随从逻辑
            } catch (error) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    // 开始游戏
    async startGame(room) {
        try {
            logger.info('开始游戏:', {
                roomId: room._id,
                status: room.status,
                phase: room.phase,
                playerCount: room.players.length,
                initialCoins: gameConfig.INITIAL_COINS,
                timestamp: new Date().toISOString()
            });

            // 确保使用最新的房间数据
            const currentRoom = await Room.findById(room._id);
            if (!currentRoom) {
                throw new Error('房间不存在');
            }

            // 先更新所有玩家的初始状态
            await Room.updateOne(
                { _id: currentRoom._id },
                { 
                    $set: { 
                        status: 'playing',
                        phase: 'preparation',
                        turn: 1,
                        'players.$[].coins': gameConfig.INITIAL_COINS,  // 设置所有玩家的初始金币
                        'players.$[].health': gameConfig.INITIAL_HEALTH,  // 设置所有玩家的初始生命值
                        'players.$[].tavernTier': gameConfig.INITIAL_TAVERN_TIER  // 设置所有玩家的初始酒馆等级
                    }
                }
            );

            // 验证更新是否成功
            const updatedRoom = await Room.findById(currentRoom._id);
            for (const player of updatedRoom.players) {
                logger.info('验证玩家初始状态:', {
                    userId: player.userId,
                    username: player.username,
                    coins: player.coins,
                    health: player.health,
                    tavernTier: player.tavernTier,
                    expectedCoins: gameConfig.INITIAL_COINS,
                    expectedHealth: gameConfig.INITIAL_HEALTH,
                    expectedTavernTier: gameConfig.INITIAL_TAVERN_TIER,
                    timestamp: new Date().toISOString()
                });

                // 如果有任何值不正确，单独更新该玩家
                if (player.coins !== gameConfig.INITIAL_COINS || 
                    player.health !== gameConfig.INITIAL_HEALTH || 
                    player.tavernTier !== gameConfig.INITIAL_TAVERN_TIER) {
                    
                    logger.warn('玩家状态不正确，正在修复:', {
                        userId: player.userId,
                        username: player.username,
                        currentCoins: player.coins,
                        currentHealth: player.health,
                        currentTavernTier: player.tavernTier,
                        expectedCoins: gameConfig.INITIAL_COINS,
                        expectedHealth: gameConfig.INITIAL_HEALTH,
                        expectedTavernTier: gameConfig.INITIAL_TAVERN_TIER
                    });

                    await Room.updateOne(
                        { 
                            _id: currentRoom._id,
                            'players.userId': player.userId 
                        },
                        {
                            $set: {
                                'players.$.coins': gameConfig.INITIAL_COINS,
                                'players.$.health': gameConfig.INITIAL_HEALTH,
                                'players.$.tavernTier': gameConfig.INITIAL_TAVERN_TIER
                            }
                        }
                    );
                }
            }

            // 初始化游戏数据
            await this.initializeGameData(currentRoom);

            // 开始第一个准备阶段
            await this.startPreparationPhase(currentRoom._id);

            logger.info('游戏初始化完成:', {
                roomId: currentRoom._id,
                status: 'playing',
                phase: 'preparation',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('开始游戏失败:', {
                roomId: room._id,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // 初始化游戏数据
    async initializeGameData(room) {
        try {
            logger.info('开始初始化游戏数据:', {
                roomId: room._id,
                initialCoins: gameConfig.INITIAL_COINS,  // 记录使用的初始金币值
                timestamp: new Date().toISOString()
            });

            // 先更新房间状态
            await Room.updateOne(
                { _id: room._id },
                { 
                    $set: { 
                        status: 'playing',
                        phase: 'preparation',
                        turn: 1
                    }
                }
            );

            // 为每个玩家初始化游戏数据
            for (const player of room.players) {
                logger.info('初始化玩家数据:', {
                    roomId: room._id,
                    userId: player.userId,
                    username: player.username,
                    initialCoins: gameConfig.INITIAL_COINS,
                    timestamp: new Date().toISOString()
                });

                // 获取初始商店随从
                const shopMinions = await shopService.refreshShop(1);

                // 初始化玩家状态
                await Room.updateOne(
                    { 
                        _id: room._id,
                        'players.userId': player.userId 
                    },
                    {
                        $set: {
                            'players.$.coins': gameConfig.INITIAL_COINS,  // 使用配置的初始金币
                            'players.$.health': gameConfig.INITIAL_HEALTH,  // 使用配置的初始生命值
                            'players.$.tavernTier': gameConfig.INITIAL_TAVERN_TIER,  // 使用配置的初始酒馆等级
                            'players.$.board': [],
                            'players.$.hand': [],
                            'players.$.heroPowerUsed': false,
                            'players.$.shopMinions': shopMinions,
                            'players.$.eliminated': false
                        }
                    }
                );

                // 验证更新是否成功
                const updatedPlayer = await Room.findOne(
                    { 
                        _id: room._id,
                        'players.userId': player.userId 
                    },
                    { 'players.$': 1 }
                );

                logger.info('玩家初始化结果:', {
                    userId: player.userId,
                    coins: updatedPlayer.players[0].coins,
                    expectedCoins: gameConfig.INITIAL_COINS,
                    timestamp: new Date().toISOString()
                });

                // 通知玩家游戏开始
                this.io.to(`user:${player.userId}`).emit('gameStarted', {
                    phase: 'preparation',
                    turn: 1,
                    coins: gameConfig.INITIAL_COINS,
                    health: gameConfig.INITIAL_HEALTH,
                    tavernTier: gameConfig.INITIAL_TAVERN_TIER,
                    shopMinions
                });
            }

            // 验证初始化结果
            const updatedRoom = await Room.findById(room._id);
            logger.info('游戏数据初始化完成:', {
                roomId: room._id,
                status: updatedRoom.status,
                phase: updatedRoom.phase,
                turn: updatedRoom.turn,
                playerCount: updatedRoom.players.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('初始化游戏数据失败:', {
                roomId: room._id,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // 开始准备阶段
    async startPreparationPhase(roomId) {
        try {
            logger.info('开始准备阶段:', { 
                roomId,
                initialCoins: gameConfig.INITIAL_COINS
            });

            const room = await Room.findById(roomId);
            if (!room) {
                throw new CustomError(404, '房间不存在');
            }

            // 更新房间阶段
            await Room.updateOne(
                { _id: roomId },
                { $set: { phase: 'preparation' } }
            );

            // 为每个玩家初始化回合数据
            for (const player of room.players) {
                if (player.eliminated) continue;

                // 第一回合使用初始金币，之后每回合都是固定金币
                const coins = room.turn === 1 ? gameConfig.INITIAL_COINS : 5;
                
                logger.info('设置玩家回合金币:', {
                    userId: player.userId,
                    username: player.username,
                    turn: room.turn,
                    isFirstTurn: room.turn === 1,
                    initialCoins: gameConfig.INITIAL_COINS,
                    calculatedCoins: coins,
                    timestamp: new Date().toISOString()
                });

                // 刷新商店随从
                const shopMinions = await shopService.refreshShop(player.tavernTier);

                // 更新玩家状态
                await Room.updateOne(
                    { 
                        _id: roomId,
                        'players.userId': player.userId 
                    },
                    {
                        $set: {
                            'players.$.coins': coins,
                            'players.$.shopMinions': shopMinions,
                            'players.$.heroPowerUsed': false
                        }
                    }
                );

                // 验证更新是否成功
                const updatedPlayer = await Room.findOne(
                    { 
                        _id: roomId,
                        'players.userId': player.userId 
                    },
                    { 'players.$': 1 }
                );

                logger.info('玩家回合初始化结果:', {
                    userId: player.userId,
                    username: player.username,
                    turn: room.turn,
                    expectedCoins: coins,
                    actualCoins: updatedPlayer.players[0].coins,
                    timestamp: new Date().toISOString()
                });

                // 通知玩家回合开始
                this.io.to(`user:${player.userId}`).emit('preparationPhaseStarted', {
                    coins,
                    shopMinions,
                    turn: room.turn
                });
            }

            // 开始准备阶段计时
            this.startPreparationTimer(roomId);

        } catch (error) {
            logger.error('开始准备阶段失败:', {
                roomId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // 开始战斗阶段
    async startCombatPhase(roomId) {
        try {
            logger.info('开始战斗阶段:', { roomId });

            // 更新房间阶段
            await Room.updateOne(
                { _id: roomId },
                { $set: { phase: 'combat' } }
            );

            // 通知所有玩家进入战斗阶段
            this.io.to(`room:${roomId}`).emit('combatPhaseStarted');

            // 处理战斗
            await this.handleCombatPhase(roomId);

            // 战斗结束后，检查游戏是否结束
            const gameEnded = await this.checkGameEnd(roomId);
            if (!gameEnded) {
                // 如果游戏未结束，开始新回合
                await this.startNewRound(roomId);
            }

        } catch (error) {
            logger.error('开始战斗阶段失败:', {
                roomId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // 检查游戏是否结束
    async checkGameEnd(roomId) {
        try {
            const room = await Room.findById(roomId);
            const activePlayers = room.players.filter(p => !p.eliminated);

            if (activePlayers.length <= 1) {
                // 游戏结束，宣布胜利者
                const winner = activePlayers[0];
                
                await Room.updateOne(
                    { _id: roomId },
                    { 
                        $set: { 
                            status: 'finished',
                            phase: 'finished',
                            winner: winner?.userId
                        }
                    }
                );

                this.io.to(`room:${roomId}`).emit('gameEnded', {
                    winner: winner?.userId,
                    username: winner?.username
                });

                return true;
            }

            return false;

        } catch (error) {
            logger.error('检查游戏结束失败:', error);
            throw error;
        }
    }

    // 处理战斗阶段
    async handleCombatPhase(roomId) {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new CustomError(404, '房间不存在');
            }

            logger.info('开始处理战斗:', {
                roomId,
                turn: room.turn,
                playerCount: room.players.length,
                activePlayers: room.players.filter(p => !p.eliminated).length
            });

            // 配对玩家进行战斗
            const battlePairs = this.matchPlayers(room.players);
            
            logger.info('玩家配对结果:', {
                roomId,
                pairs: battlePairs.map(([p1, p2]) => ({
                    player1: p1?.username || 'Ghost',
                    player2: p2?.username || 'Ghost'
                }))
            });

            // 处理每一场战斗
            for (const [player1, player2] of battlePairs) {
                const battleResult = await this.simulateBattle(player1, player2);
                
                logger.info('战斗结果:', {
                    roomId,
                    winner: battleResult.winner?.username,
                    loser: battleResult.loser?.username,
                    damage: battleResult.damage
                });

                // 更新玩家状态
                await this.updatePlayersAfterBattle(roomId, battleResult);

                // 通知玩家战斗结果
                this.notifyBattleResult(roomId, battleResult);
            }

            // 检查游戏是否结束
            const gameEnded = await this.checkGameEnd(roomId);
            if (gameEnded) {
                logger.info('游戏结束:', { roomId });
                return;
            }

            // 开始新回合
            await this.startNewRound(roomId);

        } catch (error) {
            logger.error('处理战斗阶段失败:', {
                roomId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // 配对玩家
    matchPlayers(players) {
        const activePlayers = players.filter(p => !p.eliminated);
        const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
        const pairs = [];
        
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                pairs.push([shuffled[i], shuffled[i + 1]]);
            } else {
                // 如果是奇数玩家，最后一个玩家和鬼魂对战
                pairs.push([shuffled[i], null]);
            }
        }
        
        return pairs;
    }

    // 模拟战斗
    async simulateBattle(player1, player2) {
        // TODO: 实现具体的战斗逻辑
        return {
            winner: player1,
            loser: player2,
            damage: 5
        };
    }

    // 更新玩家战斗后状态
    async updatePlayersAfterBattle(roomId, battleResult) {
        const { winner, loser, damage } = battleResult;
        
        if (loser) {
            logger.info('更新失败者状态:', {
                roomId,
                loserId: loser.userId,
                loserName: loser.username,
                damage
            });

            // 更新失败者生命值
            await Room.updateOne(
                { 
                    _id: roomId,
                    'players.userId': loser.userId 
                },
                {
                    $inc: { 'players.$.health': -damage }
                }
            );

            // 检查是否淘汰
            const updatedRoom = await Room.findById(roomId);
            const loserPlayer = updatedRoom.players.find(p => p.userId === loser.userId);
            
            if (loserPlayer.health <= 0) {
                logger.info('玩家被淘汰:', {
                    roomId,
                    userId: loser.userId,
                    username: loser.username,
                    finalHealth: loserPlayer.health
                });

                await Room.updateOne(
                    { 
                        _id: roomId,
                        'players.userId': loser.userId 
                    },
                    {
                        $set: { 'players.$.eliminated': true }
                    }
                );
            }
        }
    }

    // 通知战斗结果
    notifyBattleResult(roomId, battleResult) {
        this.io.to(`room:${roomId}`).emit('battleResult', battleResult);
    }

    // 开始新回合
    async startNewRound(roomId) {
        try {
            // 增加回合数
            await Room.updateOne(
                { _id: roomId },
                { $inc: { turn: 1 } }
            );

            // 开始新的准备阶段
            await this.startPreparationPhase(roomId);

        } catch (error) {
            logger.error('开始新回合失败:', {
                roomId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // 开始准备阶段计时
    async startPreparationTimer(roomId) {
        try {
            logger.info('开始准备阶段计时:', {
                roomId,
                duration: '30秒'
            });

            // 30秒后自动进入战斗阶段
            setTimeout(async () => {
                try {
                    const room = await Room.findById(roomId);
                    if (!room || room.phase !== 'preparation') {
                        return;
                    }

                    // 更新状态为 playing 并开始战斗
                    await Room.updateOne(
                        { _id: roomId },
                        { 
                            $set: { 
                                status: 'playing',
                                phase: 'combat'
                            }
                        }
                    );

                    // 开始战斗阶段
                    await this.startCombatPhase(roomId);

                } catch (error) {
                    logger.error('准备阶段结束处理失败:', {
                        roomId,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }, 30000);

        } catch (error) {
            logger.error('开始准备阶段计时失败:', {
                roomId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = GameHandler; 
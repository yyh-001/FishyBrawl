# Fishy Brawl (摸鱼乱斗) 后端服务

Fishy Brawl 是一款轻便的多人在线酒馆对战游戏，旨在为玩家提供随时随地、爽快的对战体验。

## 游戏特点

- **快速游戏**: 简化的酒馆对战机制，单局游戏时间约10-15分钟
- **随时进行**: 支持跨平台游戏，随时可以开始新的对局
- **竞技排名**: 完整的排名系统和匹配机制
- **社交系统**: 支持好友添加和好友对战
- **实时对战**: 基于 WebSocket 的实时对战系统

## 技术架构

- **后端框架**: Node.js + Express
- **数据库**: MongoDB
- **实时通信**: Socket.IO
- **用户认证**: JWT + 邮箱验证
- **安全机制**: 
  - 请求速率限制
  - 数据验证
  - 安全头配置
  - 密码加密存储

## 核心功能

### 1. 用户系统
- ✅ 邮箱验证码注册
- ✅ 账号密码登录
- ✅ 忘记密码/重置密码
- ✅ 修改密码

### 2. 对战系统
- ✅ 快速匹配
  - ✅ 支持机器人对战
  - ✅ 匹配超时处理
  - ✅ 匹配状态同步
- ✅ 创建房间
  - 🚧 自定义房间设置
  - ✅ 房间状态管理
  - ✅ 玩家准备系统
- ✅ 英雄选择
  - ✅ 随机英雄池
  - 🚧 英雄技能系统
- 🚧 实时对战
  - 🚧 回合制系统
  - 🚧 商店系统
  - 🚧 战斗系统
  - 🚧 随从放置
  - 🚧 英雄技能

### 3. 社交系统
- ✅ 添加好友
  - ✅ 好友请求发送
  - ✅ 好友请求处理
  - ✅ 请求消息
- ✅ 好友列表管理
  - ✅ 好友状态同步
  - ✅ 好友删除
- ✅ 好友在线状态
  - ✅ 实时状态更新
  - ✅ 最后在线时间
- ✅ 好友对战邀请
  - ✅ 发送邀请
  - ✅ 处理邀请
  - ✅ 邀请超时

### 4. 排名系统
- 🚧 全球排行榜
- 🚧 好友排行榜
- 🚧 个人战绩统计
- 🚧 段位系统

## WebSocket 事件

### 连接事件
```javascript
// 连接认证
socket.on('connect', { token: string })

// 连接断开
socket.on('disconnect')
```

### 大厅事件
```javascript
// 创建房间
socket.emit('createRoom', { name: string, maxPlayers: number })

// 加入房间
socket.emit('joinRoom', { roomId: string })

// 离开房间
socket.emit('leaveRoom', { roomId: string })

// 准备/取消准备
socket.emit('toggleReady', { roomId: string })
```

### 游戏事件
```javascript
// 获取可选英雄
socket.emit('getAvailableHeroes', { roomId: string })

// 选择英雄
socket.emit('confirmHeroSelection', { roomId: string, heroId: string })

// 回合开始
socket.on('turnStart', { gold: number, turn: number })

// 购买随从
socket.emit('buyMinion', { position: number, minionId: string })

// 战斗开始
socket.on('combatStart', { opponent: object })
```

### 好友事件
```javascript
// 获取好友列表
socket.emit('getFriends')

// 发送好友请求
socket.emit('sendFriendRequest', { toUserId: string, message: string })

// 处理好友请求
socket.emit('handleFriendRequest', { requestId: string, action: 'accept' | 'reject' })

// 好友状态变更
socket.on('friendStatusChanged', { userId: string, status: string })
```

## 开发环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0.0
- Redis >= 6.0.0

## 开发规范

1. 使用 Express 框架构建 API
2. 使用 MongoDB 作为数据库，通过 Mongoose 进行数据操作
3. 实现适当的错误处理和输入验证
4. 使用异步/等待（async/await）语法处理异步操作
5. 遵循 RESTful API 设计原则
6. 添加基本的日志记录功能

## 项目结构
```
src/
├── config/          # 配置文件
├── models/          # 数据模型
├── services/        # 业务逻辑
├── socket/          # WebSocket 处理器
├── utils/           # 工具函数
├── routes/          # API 路由
├── middlewares/     # 中间件
└── app.js          # 应用入口
```

## 部署说明

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
```bash
cp .env.example .env
```

3. 启动服务
```bash
npm start
```

## 开发命令

```bash
# 开发环境启动
npm run dev

# 生产环境启动
npm start

# 导入英雄数据
npm run import-heroes

# 运行测试
npm test
```

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。在提交代码前，请确保：

1. 代码符合项目的编码规范
2. 添加了适当的测试用例
3. 所有测试都能通过
4. 更新了相关文档

## 许可证

MIT License

## 待完成功能

### 1. 游戏核心系统
- 🚧 战斗系统
  - 🚧 随从战斗逻辑
  - 🚧 战斗伤害计算
  - 🚧 战斗动画同步
  - 🚧 战斗结果广播
  - 🚧 战斗回放功能
  
- 🚧 商店系统
  - 🚧 随从商店刷新
  - 🚧 随从购买/出售
  - 🚧 随从升级合成
  - 🚧 商店冻结机制
  - 🚧 酒馆等级升级

- 🚧 随从系统
  - 🚧 随从属性系统
  - 🚧 随从特效系统
  - 🚧 随从种族加成
  - 🚧 随从光环效果
  - 🚧 随从死亡触发

- 🚧 英雄技能系统
  - 🚧 主动技能实现
  - 🚧 被动技能实现
  - 🚧 技能冷却机制
  - 🚧 技能目标选择
  - 🚧 技能效果同步

### 2. 游戏平衡性
- 🚧 英雄平衡
  - 🚧 英雄技能数值
  - 🚧 英雄初始属性
  - 🚧 英雄胜率统计
  
- 🚧 随从平衡
  - 🚧 随从属性调整
  - 🚧 随从出现概率
  - 🚧 随从组合强度

### 3. 排名系统
- 🚧 段位系统
  - 🚧 段位划分设计
  - 🚧 段位晋升/降级
  - 🚧 赛季重置机制
  
- 🚧 积分系统
  - 🚧 胜负积分计算
  - 🚧 对局表现加分
  - 🚧 连胜/连败机制
  
- 🚧 排行榜
  - 🚧 全球排行榜
  - 🚧 好友排行榜
  - 🚧 周/月排行榜
  - 🚧 赛季排行榜

### 4. 数据统计系统
- 🚧 对局数据
  - 🚧 对局历史记录
  - 🚧 英雄使用统计
  - 🚧 随从组合统计
  - 🚧 胜率/使用率统计
  
- 🚧 个人数据
  - 🚧 常用英雄统计
  - 🚧 常用随从统计
  - 🚧 场均数据统计
  - 🚧 成就系统

### 5. 社交系统增强
- 🚧 观战系统
  - 🚧 实时观战
  - 🚧 录像回放
  - 🚧 观战邀请
  
- 🚧 聊天系统
  - 🚧 全局聊天
  - 🚧 好友私聊
  - 🚧 房间聊天
  - 🚧 表情系统

### 6. 系统优化
- 🚧 性能优化
  - 🚧 WebSocket 消息压缩
  - 🚧 数据缓存优化
  - 🚧 战斗同步优化
  
- 🚧 容错机制
  - 🚧 断线重连
  - 🚧 状态同步修复
  - 🚧 异常操作处理
  
- 🚧 反作弊系统
  - 🚧 操作频率限制
  - 🚧 异常行为检测
  - 🚧 作弊玩家惩罚

### 7. 运营功能
- 🚧 公告系统
  - 🚧 游戏公告
  - 🚧 维护公告
  - 🚧 活动公告
  
- 🚧 数据分析
  - 🚧 玩家行为分析
  - 🚧 游戏平衡分析
  - 🚧 异常行为分析
  
- 🚧 管理后台
  - 🚧 用户管理
  - 🚧 游戏配置
  - 🚧 数据统计
  - 🚧 日志查询
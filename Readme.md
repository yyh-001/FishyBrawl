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
- 邮箱验证码注册
- 账号密码登录
- 忘记密码/重置密码
- 修改密码

### 2. 对战系统
- 快速匹配
- 创建房间
- 自定义房间设置
- 实时对战

### 3. 社交系统
- 添加好友
- 好友列表管理
- 好友在线状态
- 好友对战邀请

### 4. 排名系统
- 全球排行榜
- 好友排行榜
- 个人战绩统计
- 段位系统

## API 文档

### 用户管理

#### 注册流程
1. 发送验证码
```http
POST /api/auth/verification-code
Content-Type: application/json

{
    "email": "string",
    "type": "register"
}
```

2. 注册账号
```http
POST /api/auth/register
Content-Type: application/json

{
    "email": "string",
    "password": "string",
    "username": "string",
    "verificationCode": "string"
}
```

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "string",
    "password": "string"
}
```

### 游戏大厅

#### 快速匹配
```http
POST /api/lobby/quickmatch
Authorization: Bearer {token}
```

#### 创建房间
```http
POST /api/lobby/rooms
Authorization: Bearer {token}

{
    "name": "string",
    "maxPlayers": number
}
```

### 排行榜

#### 获取全球排行榜
```http
GET /api/leaderboard/global?page=1&limit=20
```

#### 获取个人排名
```http
GET /api/leaderboard/me
Authorization: Bearer {token}
```

## WebSocket 事件

### 游戏事件
```javascript
// 回合开始
socket.on('turnStart', { gold: number, turn: number })

// 购买随从
socket.emit('buyMinion', { position: number, minionId: string })

// 战斗开始
socket.on('combatStart', { opponent: object })
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

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。在提交代码前，请确保：

1. 代码符合项目的编码规范
2. 添加了适当的测试用例
3. 所有测试都能通过
4. 更新了相关文档

## 许可证

MIT License

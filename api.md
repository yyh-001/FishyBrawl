# 炉石酒馆战棋游戏后端 API 文档

基于 Node.js 和 Express 框架开发的炉石酒馆战棋游戏后端服务，提供用户管理、游戏大厅和实时对战功能。

## 技术栈

- Node.js
- Express
- Socket.IO
- MongoDB
- JWT 认证

## API 接口说明

### 用户管理

#### 发送注册验证码
- **POST** `/api/auth/verification-code`
- 请求体:
```json
{
    "email": "string",
    "type": "register"
}
```
- 响应:
```json
{
    "code": 200,
    "message": "验证码已发送",
    "data": {
        "expireTime": number  // 验证码过期时间(秒)
    }
}
```

#### 注册用户
- **POST** `/api/auth/register`
- 请求体:
```json
{
    "email": "string",
    "password": "string",
    "username": "string",
    "verificationCode": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "data": {
        "userId": "string",
        "username": "string",
        "email": "string",
        "token": "string"
    }
}
```

#### 发送重置密码验证码
- **POST** `/api/auth/reset-password-code`
- 请求体:
```json
{
    "email": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "message": "重置密码验证码已发送",
    "data": {
        "expireTime": number
    }
}
```

#### 验证重置密码验证码
- **POST** `/api/auth/verify-reset-code`
- 请求体:
```json
{
    "email": "string",
    "verificationCode": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "data": {
        "resetToken": "string"
    }
}
```

#### 重置密码
- **POST** `/api/auth/reset-password`
- 请求体:
```json
{
    "resetToken": "string",
    "newPassword": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "message": "密码重置成功"
}
```

#### 修改密码
- **PUT** `/api/auth/password`
- 请求头: `Authorization: Bearer {token}`
- 请求体:
```json
{
    "oldPassword": "string",
    "newPassword": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "message": "密码修改成功"
}
```

#### 用户登录
- **POST** `/api/auth/login`
- 请求体:
```json
{
    "username": "string",
    "password": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "data": {
        "token": "string",
        "userInfo": {
            "userId": "string",
            "username": "string",
            "rating": number
        }
    }
}
```

### 游戏大厅

#### 获取房间列表
- **GET** `/api/lobby/rooms`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "data": {
        "rooms": [
            {
                "roomId": "string",
                "name": "string",
                "players": number,
                "maxPlayers": number,
                "status": "waiting|playing"
            }
        ]
    }
}
```

#### 创建房间
- **POST** `/api/lobby/rooms`
- 请求头: `Authorization: Bearer {token}`
- 请求体:
```json
{
    "name": "string",
    "maxPlayers": number
}
```
- 响应:
```json
{
    "code": 200,
    "data": {
        "roomId": "string"
    }
}
```

#### 快速匹配
- **POST** `/api/lobby/quickmatch`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "data": {
        "matchId": "string",
        "status": "matching|matched",
        "estimatedTime": number
    }
}
```

#### 取消匹配
- **DELETE** `/api/lobby/quickmatch`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "message": "匹配已取消"
}
```

### 排行榜

#### 获取全球排行榜
- **GET** `/api/leaderboard/global`
- 请求参数:
  - page: number (默认: 1)
  - limit: number (默认: 20)
- 响应:
```json
{
    "code": 200,
    "data": {
        "total": number,
        "rankings": [
            {
                "rank": number,
                "userId": "string",
                "username": "string",
                "rating": number,
                "wins": number,
                "games": number
            }
        ]
    }
}
```

#### 获取好友排行榜
- **GET** `/api/leaderboard/friends`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "data": {
        "rankings": [
            {
                "rank": number,
                "userId": "string",
                "username": "string",
                "rating": number,
                "wins": number,
                "games": number
            }
        ]
    }
}
```

#### 获取个人排名
- **GET** `/api/leaderboard/me`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "data": {
        "rank": number,
        "rating": number,
        "stats": {
            "wins": number,
            "games": number,
            "topRank": number,
            "highestRating": number
        }
    }
}
```

### 好友管理

#### 发送好友请求
- **POST** `/api/friends/requests`
- 请求头: `Authorization: Bearer {token}`
- 请求体:
```json
{
    "targetUserId": "string",
    "message": "string"
}
```
- 响应:
```json
{
    "code": 200,
    "data": {
        "requestId": "string",
        "status": "pending"
    }
}
```

#### 获取好友请求列表
- **GET** `/api/friends/requests`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "data": {
        "received": [
            {
                "requestId": "string",
                "fromUser": {
                    "userId": "string",
                    "username": "string",
                    "rating": number
                },
                "message": "string",
                "createdAt": "string"
            }
        ],
        "sent": [
            {
                "requestId": "string",
                "toUser": {
                    "userId": "string",
                    "username": "string"
                },
                "status": "pending|accepted|rejected",
                "createdAt": "string"
            }
        ]
    }
}
```

#### 处理好友请求
- **PUT** `/api/friends/requests/{requestId}`
- 请求头: `Authorization: Bearer {token}`
- 请求体:
```json
{
    "action": "accept|reject"
}
```
- 响应:
```json
{
    "code": 200,
    "message": "好友请求已处理"
}
```

#### 获取好友列表
- **GET** `/api/friends`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "data": {
        "friends": [
            {
                "userId": "string",
                "username": "string",
                "status": "online|offline|in_game",
                "rating": number,
                "lastOnline": "string"
            }
        ]
    }
}
```

#### 删除好友
- **DELETE** `/api/friends/{friendId}`
- 请求头: `Authorization: Bearer {token}`
- 响应:
```json
{
    "code": 200,
    "message": "好友已删除"
}
```

### WebSocket 事件

#### 连接
```javascript
socket.on('connect', callback)
```

#### 加入房间
```javascript
socket.emit('joinRoom', { roomId: 'string' })
socket.on('roomJoined', callback)
```

#### 游戏事件
```javascript
// 回合开始
socket.on('turnStart', { gold: number, turn: number })

// 购买随从
socket.emit('buyMinion', { position: number, minionId: string })

// 出售随从
socket.emit('sellMinion', { position: number })

// 战斗开始
socket.on('combatStart', { opponent: object })

// 战斗结果
socket.on('combatEnd', { damage: number, winner: string })
```

#### 匹配事件
```javascript
// 匹配状态更新
socket.on('matchUpdate', { 
    status: 'matching|matched|cancelled',
    players?: [
        {
            userId: string,
            username: string,
            rating: number
        }
    ]
})

// 匹配成功
socket.on('matchSuccess', {
    roomId: string,
    players: array
})
```

#### 好友相关事件
```javascript
// 好友状态更新
socket.on('friendStatusUpdate', {
    userId: string,
    status: 'online|offline|in_game'
})

// 收到好友请求
socket.on('friendRequest', {
    requestId: string,
    fromUser: {
        userId: string,
        username: string
    },
    message: string
})

// 好友请求被处理
socket.on('friendRequestProcessed', {
    requestId: string,
    status: 'accepted|rejected'
})
```

## 数据模型

### 用户模型
```javascript
{
    userId: string,
    username: string,
    password: string,
    email: string,
    rating: number,
    stats: {
        wins: number,
        games: number
    }
}
```

### 房间模型
```javascript
{
    roomId: string,
    name: string,
    players: [
        {
            userId: string,
            username: string,
            health: number,
            board: array
        }
    ],
    status: string,
    turn: number
}
```

### 好友关系模型
```javascript
{
    userId: string,
    friendId: string,
    status: string,
    createdAt: Date,
    lastInteraction: Date
}
```

### 好友请求模型
```javascript
{
    requestId: string,
    fromUserId: string,
    toUserId: string,
    message: string,
    status: string,
    createdAt: Date,
    processedAt: Date
}
```

### 验证码模型
```javascript
{
    email: string,
    code: string,
    type: string,  // register|reset_password
    expireAt: Date,
    used: boolean
}
```

### 密码重置令牌模型
```javascript
{
    email: string,
    resetToken: string,
    expireAt: Date,
    used: boolean
}
```

## 错误码说明

- 200: 成功
- 400: 请求参数错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 500: 服务器内部错误
- 429: 请求过于频繁
- 1001: 验证码错误或已过期
- 1002: 邮箱已被注册
- 1003: 重置密码令牌无效或已过期

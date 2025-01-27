# Fishy Brawl 游戏后端 API 文档

基于 Node.js、Express 和 Socket.IO 框架开发的炉石酒馆战棋游戏后端服务，提供用户管理、游戏大厅和实时对战功能。

## 技术栈

- Node.js
- Express
- Socket.IO
- MongoDB
- JWT 认证

## API 接口说明

### HTTP 接口

#### 用户管理

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

### WebSocket 接口

#### 连接

### 建立连接
```javascript
import { io } from 'socket.io-client';

// 创建连接
const socket = io('http://localhost:3000', {
    auth: {
        token: 'your-jwt-token' // 从登录获取的 JWT token
    },
    transports: ['websocket'],   // 强制使用 WebSocket
    reconnection: true,          // 启用重连
    reconnectionAttempts: 5,     // 最大重连次数
    reconnectionDelay: 1000,     // 重连延迟，单位毫秒
    timeout: 10000               // 连接超时时间
});
```

### 连接事件
```javascript
// 连接成功
socket.on('connect', () => {
    console.log('WebSocket 连接成功');
});

// 连接错误
socket.on('connect_error', (error) => {
    console.log('WebSocket 连接失败:', error.message);
    // 可能的错误消息：
    // - 未提供认证令牌
    // - 无效的认证令牌
    // - 认证令牌已过期
    // - 用户不存在
    // - 认证失败
});

// 断开连接
socket.on('disconnect', (reason) => {
    console.log('WebSocket 断开连接:', reason);
});

// 重新连接
socket.on('reconnect', (attemptNumber) => {
    console.log('重新连接成功，尝试次数:', attemptNumber);
});

// 重新连接错误
socket.on('reconnect_error', (error) => {
    console.log('重新连接失败:', error);
});
```

### React 组件示例
```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const GameLobby = () => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 从本地存储获取 token
        const token = localStorage.getItem('token');
        if (!token) {
            setError('未找到认证令牌');
            return;
        }

        // 创建 socket 连接
        const socket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket'],
            reconnection: true
        });

        // 连接事件处理
        socket.on('connect', () => {
            setConnected(true);
            setError(null);
        });

        socket.on('connect_error', (error) => {
            setConnected(false);
            setError(error.message);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        setSocket(socket);

        // 清理函数
        return () => {
            socket.disconnect();
        };
    }, []);

    // 组件渲染
    if (error) {
        return <div>连接错误: {error}</div>;
    }

    if (!connected) {
        return <div>正在连接...</div>;
    }

    return (
        <div>
            <h1>游戏大厅</h1>
            {/* 游戏大厅内容 */}
        </div>
    );
};

export default GameLobby;
```

#### 游戏大厅

##### 获取房间列表
```javascript
// 发送请求
socket.emit('getRooms', (response) => {
    if (response.success) {
        console.log('房间列表:', response.data.rooms);
    }
});

// 成功响应
{
    success: true,
    data: {
        rooms: [
            {
                roomId: "string",
                name: "string",
                players: number,
                maxPlayers: 8,
                status: "waiting"
            }
        ]
    }
}
```

##### 创建房间
```javascript
// 发送请求
socket.emit('createRoom', { 
    name: "string"  // 房间名称
}, (response) => {
    if (response.success) {
        console.log('房间创建成功:', response.data.roomId);
    }
});

// 成功响应
{
    success: true,
    data: {
        roomId: "string"
    }
}
```

##### 加入房间
```javascript
// 发送请求
socket.emit('joinRoom', { 
    roomId: "string"  // 房间ID
}, (response) => {
    if (response.success) {
        console.log('加入房间成功:', response.data);
    }
});

// 成功响应
{
    success: true,
    data: {
        roomId: "string",
        name: "string",
        maxPlayers: 8,
        status: "waiting",
        createdBy: "string",
        players: [
            {
                userId: "string",
                username: "string",
                ready: boolean,
                isCreator: boolean
            }
        ],
        alreadyInRoom: boolean,
        isCreator: boolean
    }
}
```

##### 离开房间
```javascript
// 发送请求
socket.emit('leaveRoom', { 
    roomId: "string"  // 房间ID
}, (response) => {
    if (response.success) {
        console.log('离开房间成功:', response.data);
    }
});

// 成功响应
{
    success: true,
    data: {
        roomId: "string",
        players: [
            {
                userId: "string",
                username: "string",
                ready: boolean,
                isCreator: boolean
            }
        ]
    }
}

// 如果房间被删除
{
    success: true,
    data: {
        deleted: true
    }
}
```

##### 准备/取消准备
```javascript
// 发送请求
socket.emit('toggleReady', { 
    roomId: "string"  // 房间ID
}, (response) => {
    if (response.success) {
        console.log('准备状态更新成功:', response.data);
    }
});

// 成功响应
{
    success: true,
    data: {
        roomId: "string",
        players: [
            {
                userId: "string",
                username: "string",
                ready: boolean,
                isCreator: boolean
            }
        ],
        allReady: boolean
    }
}
```

#### 房间事件监听

##### 房间列表更新
```javascript
socket.on('roomListUpdated', () => {
    // 重新获取房间列表
    socket.emit('getRooms', callback);
});
```

##### 玩家加入房间
```javascript
socket.on('playerJoined', (data) => {
    // data.players: 更新后的玩家列表
});
```

##### 玩家离开房间
```javascript
socket.on('playerLeft', (data) => {
    // data.players: 更新后的玩家列表
});
```

##### 房间被删除
```javascript
socket.on('roomDeleted', (data) => {
    // data.roomId: 被删除的房间ID
});
```

##### 准备状态改变
```javascript
socket.on('readyStateChanged', (data) => {
    // data.players: 更新后的玩家列表
    // data.allReady: 是否所有玩家都已准备
});
```

#### 错误处理

所有 WebSocket 事件的错误响应格式：
```javascript
{
    success: false,
    error: "错误信息"
}
```

常见错误：
- 房间不存在
- 房间已满
- 您已在其他房间中
- 您不在该房间中
- 房主无需准备
- 认证失败
- 房间名长度应在1-50个字符之间
- 无效的房间ID

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

## 注意事项

1. WebSocket 连接需要在请求头中提供有效的 JWT token
2. 所有回调函数都采用 (error, response) 格式
3. 房间相关的事件只会发送给相关的客户端
4. 断线重连时需要重新加入之前的房间
5. 房间会在1小时后自动删除
6. 房间名长度限制：1-50个字符
7. 每个房间最多8名玩家
8. 房主不需要准备，其他玩家都准备后可以开始游戏

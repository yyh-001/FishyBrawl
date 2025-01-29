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
                roomId: "507f1f77bcf86cd799439011",
                name: "欢乐对战",
                players: 2,
                maxPlayers: 8,
                status: "waiting"
            }
        ]
    }
}
```

##### 获取当前房间信息
```javascript
socket.emit('getCurrentRoom', (response) => {
    if (response.success) {
        console.log('当前房间信息:', response.data);
    }
});
```

##### 创建房间
```javascript
// 发送请求
socket.emit('createRoom', { 
    name: "欢乐对战",
    maxPlayers: 8  // 可选，默认为8
}, (response) => {
    if (response.success) {
        console.log('房间创建成功:', response.data);
    }
});

// 成功响应
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "欢乐对战",
        maxPlayers: 8,
        status: "waiting",
        createdBy: "507f1f77bcf86cd799439012",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            }
        ],
        isCreator: true
    }
}
```

##### 加入房间
```javascript
// 发送请求
socket.emit('joinRoom', { 
    roomId: "507f1f77bcf86cd799439011"
}, (response) => {
    if (response.success) {
        console.log('加入房间成功:', response.data);
    }
});

// 成功响应
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "欢乐对战",
        maxPlayers: 8,
        status: "waiting",
        createdBy: "507f1f77bcf86cd799439012",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            },
            {
                userId: "507f1f77bcf86cd799439013",
                username: "player2",
                ready: false,
                isCreator: false
            }
        ],
        alreadyInRoom: false,
        isCreator: false
    }
}
```

##### 离开房间
```javascript
// 发送请求
socket.emit('leaveRoom', (response) => {
    if (response.success) {
        console.log('离开房间成功:', response.data);
    }
});
```

##### 准备/取消准备
```javascript
// 发送请求
socket.emit('toggleReady', (response) => {
    if (response.success) {
        console.log('准备状态切换成功:', response.data);
    }
});
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

### WebSocket 房间接口

#### 1. 获取房间列表

**发送请求**:
```javascript
socket.emit('getRooms', (response) => {
    if (response.success) {
        console.log('房间列表:', response.data.rooms);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        rooms: [
            {
                roomId: "507f1f77bcf86cd799439011",
                name: "欢乐对战",
                players: 2,
                maxPlayers: 8,
                status: "waiting"
            }
        ]
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "获取房间列表失败"
}
```

#### 2. 获取当前房间信息

**发送请求**:
```javascript
socket.emit('getCurrentRoom', (response) => {
    if (response.success) {
        console.log('当前房间信息:', response.data);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "欢乐对战",
        maxPlayers: 8,
        status: "waiting",
        createdBy: "507f1f77bcf86cd799439012",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            },
            {
                userId: "507f1f77bcf86cd799439013",
                username: "player2",
                ready: true,
                isCreator: false
            }
        ]
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "您当前不在任何房间中"
}
```

#### 3. 创建房间

**发送请求**:
```javascript
socket.emit('createRoom', { 
    name: "欢乐对战",
    maxPlayers: 8  // 可选，默认为8
}, (response) => {
    if (response.success) {
        console.log('房间创建成功:', response.data);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "欢乐对战",
        maxPlayers: 8,
        status: "waiting",
        createdBy: "507f1f77bcf86cd799439012",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            }
        ],
        isCreator: true
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息" // 可能的错误：
    // - 房间名长度应在1-50个字符之间
    // - 您已在其他房间中
    // - 玩家数量应在2-8之间
}
```

**相关事件**:
- roomListUpdated: 通知所有客户端房间列表已更新

#### 4. 加入房间

**发送请求**:
```javascript
socket.emit('joinRoom', { 
    roomId: "507f1f77bcf86cd799439011"
}, (response) => {
    if (response.success) {
        console.log('加入房间成功:', response.data);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "欢乐对战",
        maxPlayers: 8,
        status: "waiting",
        createdBy: "507f1f77bcf86cd799439012",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            },
            {
                userId: "507f1f77bcf86cd799439013",
                username: "player2",
                ready: false,
                isCreator: false
            }
        ],
        alreadyInRoom: false,
        isCreator: false
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息" // 可能的错误：
    // - 无效的房间ID
    // - 房间不存在
    // - 房间已满
    // - 您已在其他房间中
    // - 您正在匹配中，无法加入房间
    // - 房间已开始游戏或已结束
}
```

**相关事件**:
```javascript
// 新玩家加入事件
socket.on('playerJoined', (data) => {
    console.log('新玩家加入:', data);
    // data 格式:
    // {
    //     roomId: "507f1f77bcf86cd799439011",
    //     newPlayer: {
    //         userId: "507f1f77bcf86cd799439013",
    //         username: "player2",
    //         ready: false,
    //         isCreator: false
    //     },
    //     players: [/* 所有玩家列表 */]
    // }
});
```

#### 5. 离开房间

**发送请求**:
```javascript
socket.emit('leaveRoom', (response) => {
    if (response.success) {
        console.log('离开房间成功:', response.data);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            }
        ]
    }
}
```

**房间被删除时的响应**:
```javascript
{
    success: true,
    data: {
        deleted: true
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息" // 可能的错误：
    // - 您不在任何房间中
    // - 房间不存在
}
```

**相关事件**:
```javascript
// 玩家离开事件
socket.on('playerLeft', (data) => {
    console.log('玩家离开:', data);
    // data 格式:
    // {
    //     roomId: "507f1f77bcf86cd799439011",
    //     userId: "507f1f77bcf86cd799439013",
    //     players: [/* 更新后的玩家列表 */]
    // }
});

// 房间被删除事件
socket.on('roomDeleted', (data) => {
    console.log('房间被删除:', data);
    // data 格式:
    // {
    //     roomId: "507f1f77bcf86cd799439011"
    // }
});
```

#### 6. 准备/取消准备

**发送请求**:
```javascript
socket.emit('toggleReady', (response) => {
    if (response.success) {
        console.log('准备状态切换成功:', response.data);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "欢乐对战",
        players: [
            {
                userId: "507f1f77bcf86cd799439012",
                username: "player1",
                ready: false,
                isCreator: true
            },
            {
                userId: "507f1f77bcf86cd799439013",
                username: "player2",
                ready: true,
                isCreator: false
            }
        ],
        allReady: false,
        readyState: true  // 当前玩家的准备状态
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息" // 可能的错误：
    // - 您不在该房间中
    // - 房主无需准备
    // - 房间不存在
}
```

**相关事件**:
```javascript
// 准备状态改变事件
socket.on('readyStateChanged', (data) => {
    console.log('准备状态更新:', data);
    // data 格式:
    // {
    //     roomId: "507f1f77bcf86cd799439011",
    //     players: [/* 更新后的玩家列表 */],
    //     allReady: boolean,
    //     changedPlayer: {
    //         userId: "507f1f77bcf86cd799439013",
    //         username: "player2",
    //         ready: true
    //     }
    // }
});
```

### 房间状态说明

1. 房间状态(status):
   - waiting: 等待中
   - playing: 游戏中
   - finished: 已结束

2. 玩家状态:
   - ready: 准备状态
   - isCreator: 是否为房主

3. 房间限制:
   - 最大玩家数: 2-8人
   - 房间名长度: 1-50个字符
   - 房间存活时间: 1小时(无人时自动删除)

### 注意事项

1. 房主权限:
   - 可以踢出其他玩家
   - 可以解散房间
   - 需要准备才能开始游戏
   - 所有玩家(包括房主)都准备后可以开始游戏

2. 房主转移规则:
   - 房主离开时，自动转移给第二个加入的玩家
   - 如果没有其他玩家，房间将被删除
   - 转移房主权限不会影响准备状态

3. 断线重连:
   - 重连后需要重新获取房间信息
   - 30秒内重连可以保留房间位置和准备状态
   - 超时未重连将被视为离开房间

4. 并发处理:
   - 同一用户只能在一个房间中
   - 加入房间时会进行并发控制
   - 准备状态变更具有原子性

### WebSocket 好友接口

#### 1. 获取好友列表

**发送请求**:
```javascript
socket.emit('getFriends', (response) => {
    if (response.success) {
        console.log('好友列表:', response.data.friends);
    }
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        friends: [
            {
                userId: "507f1f77bcf86cd799439011",
                username: "player1",
                rating: 1000,
                status: "online", // online|offline|in_game
                lastOnline: "2024-03-15T08:30:00Z"
            }
        ]
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息" // 可能的错误：
    // - 用户不存在
}
```

#### 2. 发送好友请求

**发送请求**:
```javascript
socket.emit('sendFriendRequest', {
    toUserId: "507f1f77bcf86cd799439011",
    message: "我是你的对手，加个好友吧" // 可选，默认为"请求添加您为好友"
}, (response) => {
    if (response.success) {
        console.log('请求发送成功:', response.data);
    }
});
```

**请求参数说明**:
- toUserId: 目标用户ID (必填)
- message: 请求消息 (可选，最大长度100字符)

**成功响应**:
```javascript
{
    success: true,
    data: {
        requestId: "507f1f77bcf86cd799439012",
        status: "pending",
        requestSent: true,
        message: "好友请求发送成功"
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息", // 可能的错误信息
    requestSent: false // 标识请求是否已发送
}
```

**可能的错误信息**:
- 目标用户ID不能为空
- 用户不存在
- 该用户已经是您的好友
- 已经发送过好友请求
- 请求消息过长
- 不能向自己发送好友请求

#### 3. 处理好友请求

**发送请求**:
```javascript
socket.emit('handleFriendRequest', {
    requestId: "507f1f77bcf86cd799439012",
    action: "accept" // accept|reject
}, (response) => {
    if (response.success) {
        console.log('请求处理成功:', response.data);
    }
});
```

**请求参数说明**:
- requestId: 好友请求ID (必填)
- action: 处理动作 (必填，accept或reject)

**成功响应**:
```javascript
{
    success: true,
    data: {
        requestId: "507f1f77bcf86cd799439012",
        status: "accepted", // accepted|rejected
        handled: true,
        message: "好友请求接受成功" // 或 "好友请求拒绝成功"
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息",
    handled: false
}
```

**可能的错误信息**:
- 请求ID和处理动作不能为空
- 好友请求不存在
- 无权处理该请求
- 该请求已被处理
- 无效的操作

**相关事件**:
```javascript
// 好友请求被处理的通知
socket.on('friendRequestHandled', (data) => {
    console.log('好友请求状态更新:', data);
    // data 格式:
    // {
    //     requestId: "507f1f77bcf86cd799439012",
    //     status: "accepted", // accepted|rejected
    //     toUser: {
    //         userId: "507f1f77bcf86cd799439011",
    //         username: "player1"
    //     }
    // }
});
```

**注意事项**:
1. 处理状态说明：
   - handled: 标识请求是否已被处理
   - status: 处理结果(accepted/rejected)
   - success: 操作是否成功

2. 处理规则：
   - 只有请求接收者可以处理请求
   - 请求一旦处理不能重复处理
   - 接受请求后双方自动成为好友

3. 错误处理：
   - 所有错误响应都包含 success: false
   - 错误响应包含具体的错误信息
   - 处理失败时 handled 为 false

4. 实时通知：
   - 处理完成后，请求发送者会收到通知
   - 通知包含处理结果和处理者信息
   - 可通过 socket.on('friendRequestHandled') 监听处理结果

#### 4. 删除好友

**发送请求**:
```javascript
socket.emit('removeFriend', {
    friendId: "507f1f77bcf86cd799439011"
}, (response) => {
    if (response.success) {
        console.log('好友删除成功');
    }
});
```

**请求参数说明**:
- friendId: 要删除的好友ID (必填)

**成功响应**:
```javascript
{
    success: true,
    data: {
        message: "好友删除成功"
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息" // 可能的错误：
    // - 用户不存在
    // - 该用户不是您的好友
}
```

### 好友相关事件

#### 1. 收到好友请求
```javascript
socket.on('friendRequestReceived', (data) => {
    console.log('收到新的好友请求:', data);
    // data 格式:
    // {
    //     requestId: "507f1f77bcf86cd799439012",
    //     fromUser: {
    //         userId: "507f1f77bcf86cd799439013",
    //         username: "player2"
    //     },
    //     message: "请求添加您为好友"
    // }
});
```

### 注意事项

1. 好友请求状态说明：
   - requestSent: 标识请求是否已成功发送
   - status: 请求的当前状态(pending/accepted/rejected)
   - success: 操作是否成功

2. 好友请求限制：
   - 不能向自己发送好友请求
   - 不能向已是好友的用户发送请求
   - 不能重复发送请求
   - 请求消息最大长度100字符

3. 错误处理：
   - 所有错误响应都包含 success: false
   - 错误响应包含具体的错误信息
   - 请求发送失败时 requestSent 为 false

4. 数据验证：
   - toUserId 必须是有效的用户ID
   - message 长度不能超过100字符
   - 请求ID必须是有效的MongoDB ObjectId

5. 实时通知：
   - 发送请求后，目标用户会立即收到通知
   - 通知包含发送者信息和请求消息
   - 可通过 socket.on('friendRequestReceived') 监听新请求

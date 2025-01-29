# Fishy Brawl 测试用例
### 1. 发送验证码

**请求**:
```http
POST https://xkmvwivzjdqv.sealosbja.site/api/auth/verification-code
Content-Type: application/json

{
    "email": "test@example.com",
    "type": "register"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "message": "验证码已发送",
    "data": {
        "expireTime": 600
    }
}
```

**失败响应** (400):
```json
{
    "code": 400,
    "message": "请求参数验证失败",
    "errors": [
        {
            "msg": "邮箱格式不正确",
            "param": "email",
            "location": "body"
        }
    ]
}
```

### 2. 用户注册

**请求**:
```http
POST https://xkmvwivzjdqv.sealosbja.site/api/auth/register
Content-Type: application/json

{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser",
    "verificationCode": "123456"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "message": "注册成功",
    "data": {
        "userId": "507f1f77bcf86cd799439011",
        "username": "testuser",
        "email": "test@example.com",
        "token": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

**失败响应** (400/1001/1002):
```json
{
    "code": 1001,
    "message": "验证码错误或已过期"
}
```
```json
{
    "code": 1002,
    "message": "邮箱已被注册"
}
```

### 3. 用户登录

**请求**:
```http
POST https://xkmvwivzjdqv.sealosbja.site/api/auth/login
Content-Type: application/json

{
    "email": "test@example.com",
    "password": "password123"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "message": "登录成功",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "userInfo": {
            "userId": "507f1f77bcf86cd799439011",
            "username": "testuser",
            "rating": 1000
        }
    }
}
```

**失败响应** (401):
```json
{
    "code": 401,
    "message": "用户不存在"
}
```
```json
{
    "code": 401,
    "message": "密码错误"
}
```

### 4. 发送重置密码验证码

**请求**:
```http
POST https://xkmvwivzjdqv.sealosbja.site/api/auth/reset-password-code
Content-Type: application/json

{
    "email": "test@example.com"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "message": "重置密码验证码已发送",
    "data": {
        "expireTime": 600
    }
}
```

**失败响应** (404):
```json
{
    "code": 404,
    "message": "用户不存在"
}
```

### 5. 验证重置密码验证码

**请求**:
```http
POST https://xkmvwivzjdqv.sealosbja.site/api/auth/verify-reset-code
Content-Type: application/json

{
    "email": "test@example.com",
    "verificationCode": "123456"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "data": {
        "resetToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

**失败响应** (1001):
```json
{
    "code": 1001,
    "message": "验证码错误或已过期"
}
```

### 6. 重置密码

**请求**:
```http
POST https://xkmvwivzjdqv.sealosbja.site/api/auth/reset-password
Content-Type: application/json

{
    "resetToken": "eyJhbGciOiJIUzI1NiIs...",
    "newPassword": "newpassword123"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "message": "密码重置成功"
}
```

**失败响应** (1003):
```json
{
    "code": 1003,
    "message": "重置密码令牌无效或已过期"
}
```

### 7. 修改密码

**请求**:
```http
PUT https://xkmvwivzjdqv.sealosbja.site/api/auth/password
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
    "oldPassword": "password123",
    "newPassword": "newpassword123"
}
```

**成功响应** (200):
```json
{
    "code": 200,
    "message": "密码修改成功"
}
```

**失败响应** (401/400):
```json
{
    "code": 401,
    "message": "未提供有效的认证令牌"
}
```
```json
{
    "code": 400,
    "message": "原密码错误"
}
```

### 通用错误响应

1. 请求参数验证失败 (400):
```json
{
    "code": 400,
    "message": "请求参数验证失败",
    "errors": [
        {
            "msg": "错误信息",
            "param": "参数名",
            "location": "body"
        }
    ]
}
```

2. 服务器错误 (500):
```json
{
    "code": 500,
    "message": "服务器内部错误"
}
```

3. 请求过于频繁 (429):
```json
{
    "code": 429,
    "message": "请求过于频繁，请稍后再试"
}
```

# WebSocket 游戏大厅测试用例

## WebSocket 连接

### 连接请求
```javascript
const socket = io('https://xkmvwivzjdqv.sealosbja.site', {
    auth: {
        token: 'your-jwt-token'
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
});
```

### 连接成功
```javascript
socket.on('connect', () => {
    console.log('连接成功');
});
```

### 连接失败
```javascript
socket.on('connect_error', (error) => {
    console.log('连接失败:', error.message);
    // 可能的错误消息：
    // - 未提供认证令牌
    // - 认证失败
    // - 用户不存在
});
```

## 房间操作

### 1. 获取房间列表

**发送**:
```javascript
socket.emit('getRooms', (response) => {
    console.log(response);
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

### 2. 获取当前房间信息
```javascript
socket.emit('getCurrentRoom', (response) => {
    console.log(response);
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "测试房间",
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

**错误情况**:
```javascript
{
    success: false,
    error: "您当前不在任何房间中"
}
```

### 3. 创建房间

**发送**:
```javascript
socket.emit('createRoom', { name: '测试房间' }, (response) => {
    console.log(response);
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "测试房间",
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
    // - 用户不存在
}
```

**事件通知**:
- roomListUpdated: 通知所有客户端房间列表已更新

**注意事项**:
1. 创建房间后会自动加入该房间
2. 创建者默认为房主，无需准备
3. 返回的房间信息包含完整的玩家列表和房间状态
4. isCreator 字段标识当前用户是否为房主

### 4. 加入房间

#### 1. 发送加入房间请求
```javascript
socket.emit('joinRoom', { roomId: 'room_id' }, (response) => {
    console.log(response);
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

#### 2. 监听玩家加入事件
```javascript
socket.on('playerJoined', (data) => {
    console.log('新加入的玩家:', data.newPlayer);
    console.log('当前房间玩家列表:', data.players);
});
```

**事件数据格式**:
```javascript
{
    roomId: "507f1f77bcf86cd799439011",
    newPlayer: {
        userId: "507f1f77bcf86cd799439013",
        username: "player2",
        ready: false,
        isCreator: false
    },
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
    ]
}
```

#### 3. 相关事件
- roomListUpdated: 房间列表更新事件，需要重新获取房间列表
- playerLeft: 玩家离开事件
- readyStateChanged: 准备状态改变事件
- roomDeleted: 房间被删除事件

#### 4. 注意事项
1. 加入房间前需要先验证 roomId 的有效性
2. 一个玩家同时只能在一个房间中
3. 不能加入已满或已开始游戏的房间
4. 加入房间后会自动加入对应的 socket room
5. 所有玩家都会收到新玩家加入的通知
6. 房间列表会自动更新
7. 断线重连时需要重新加入房间

#### 5. 测试场景
1. 正常加入房间
2. 加入不存在的房间
3. 加入已满的房间
4. 重复加入同一房间
5. 在匹配中时尝试加入房间
6. 已在其他房间时尝试加入新房间
7. 加入已开始游戏的房间
8. 断线重连测试

### 5. 离开房间

**发送**:
```javascript
socket.emit('leaveRoom', { roomId: '507f1f77bcf86cd799439011' }, (response) => {
    if (response.success) {
        console.log('离开房间成功:', response.data);
    } else {
        console.error('离开房间失败:', response.error);
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

### 6. 准备/取消准备

**发送**:
```javascript
socket.emit('toggleReady', { roomId: 'room_id' }, (response) => {
    console.log(response);
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
        ],
        allReady: true
    }
}
```

## 事件监听

### 房间列表更新
```javascript
socket.on('roomListUpdated', () => {
    // 重新获取房间列表
    socket.emit('getRooms', callback);
});
```

### 玩家加入房间
```javascript
socket.on('playerJoined', (data) => {
    console.log('新玩家:', data.newPlayer);
    console.log('当前房间玩家列表:', data.players);
    // data.newPlayer 格式:
    // {
    //     userId: string,
    //     username: string,
    //     ready: boolean,
    //     isCreator: boolean
    // }
    // data.players 格式:
    // [{
    //     userId: string,
    //     username: string,
    //     ready: boolean,
    //     isCreator: boolean
    // }]
});
```

### 玩家离开房间
```javascript
socket.on('playerLeft', (data) => {
    console.log('玩家离开:', data.players);
    // data.players 格式:
    // [{
    //     userId: string,
    //     username: string,
    //     ready: boolean,
    //     isCreator: boolean
    // }]
});
```

### 房间被删除
```javascript
socket.on('roomDeleted', (data) => {
    console.log('房间已删除:', data.roomId);
});
```

### 准备状态改变
```javascript
socket.on('readyStateChanged', (data) => {
    console.log('准备状态更新:', data.players);
    console.log('所有玩家已准备:', data.allReady);
});
```

## 错误处理

所有事件的错误响应格式：
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

## 测试步骤

1. 启动测试页面
2. 获取有效的 JWT token
3. 建立 WebSocket 连接
4. 执行各项测试用例
5. 观察日志输出
6. 验证预期结果

## 注意事项

1. 确保使用有效的 JWT token
2. 注意网络状态和延迟
3. 观察错误处理是否正确
4. 验证事件监听是否正常
5. 检查内存泄漏问题
6. 测试断线重连功能
7. 验证房间状态同步
8. 检查并发操作的稳定性

## 常见问题

1. 连接失败
   - 检查 token 是否有效
   - 确认服务器地址正确
   - 验证网络连接状态

2. 事件未触发
   - 检查事件名称是否正确
   - 确认事件监听器已注册
   - 验证服务器是否发送事件

3. 操作失败
   - 检查参数格式是否正确
   - 确认操作权限
   - 验证房间状态是否允许操作

# WebSocket 测试文档

## 测试环境

- 服务器地址: https://xkmvwivzjdqv.sealosbja.site
- 协议: WebSocket (WSS)
- 认证方式: JWT Token

## 测试工具

1. 测试页面 (test.html)
2. 浏览器开发者工具
3. Socket.IO 客户端 (v4.7.4)

## 测试用例

### 1. 连接测试

#### 1.1 基础连接
```javascript
const socket = io('https://xkmvwivzjdqv.sealosbja.site', {
    auth: {
        token: 'your-jwt-token'
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
});
```

**预期结果**:
- 连接成功事件被触发
- 日志显示连接成功消息

#### 1.2 无效 Token 测试
```javascript
const socket = io('https://xkmvwivzjdqv.sealosbja.site', {
    auth: {
        token: 'invalid_token'
    }
});
```

**预期结果**:
- 连接错误事件被触发
- 错误消息: "无效的认证令牌"

#### 1.3 断线重连测试
- 断开网络连接
- 等待重连尝试
- 恢复网络连接

**预期结果**:
- 自动尝试重新连接
- 重连成功后恢复正常功能

### 2. 房间操作测试

#### 2.1 获取房间列表
```javascript
socket.emit('getRooms', (response) => {
    console.log(response);
});
```

**预期结果**:
- 成功获取房间列表
- 返回格式正确的房间数据

#### 2.2 获取房间列表
```javascript
socket.emit('getCurrentRoom', (response) => {
    console.log(response);
});
```

**预期结果**:
```javascript
{
    success: true,
    data: {
        roomId: "507f1f77bcf86cd799439011",
        name: "测试房间",
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

**错误情况**:
```javascript
{
    success: false,
    error: "您当前不在任何房间中"
}
```

#### 2.3 创建房间
```javascript
socket.emit('createRoom', { name: '测试房间' }, (response) => {
    console.log(response);
});
```

**预期结果**:
- 房间创建成功
- 返回房间ID
- 房间列表更新事件被触发

#### 2.4 加入房间
```javascript
socket.emit('joinRoom', { roomId: 'room_id' }, (response) => {
    console.log(response);
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
        alreadyInRoom: false,
        isCreator: false
    }
}
```

#### 2.5 准备状态
```javascript
socket.emit('toggleReady', { roomId: 'room_id' }, (response) => {
    console.log(response);
});
```

**预期结果**:
- 准备状态切换成功
- 房间内其他玩家收到通知
- 所有玩家准备后可以开始游戏

### 3. 错误处理测试

#### 3.1 加入不存在的房间
```javascript
socket.emit('joinRoom', { roomId: 'nonexistent_id' });
```

**预期结果**:
- 返回错误消息
- 错误码: 404
- 错误信息: "房间不存在"

#### 3.2 加入已满房间
```javascript
socket.emit('joinRoom', { roomId: 'full_room_id' });
```

**预期结果**:
- 返回错误消息
- 错误码: 400
- 错误信息: "房间已满"

#### 3.3 重复加入房间
```javascript
// 已在房间中时再次加入
socket.emit('joinRoom', { roomId: 'current_room_id' });
```

**预期结果**:
- 返回错误消息
- 错误信息: "您已在该房间中"

### 4. 事件监听测试

#### 4.1 房间事件
```javascript
// 房间列表更新
socket.on('roomListUpdated', () => {});

// 玩家加入
socket.on('playerJoined', (data) => {});

// 玩家离开
socket.on('playerLeft', (data) => {});

// 房间删除
socket.on('roomDeleted', (data) => {});

// 准备状态改变
socket.on('readyStateChanged', (data) => {});
```

#### 4.2 连接事件
```javascript
socket.on('connect', () => {});
socket.on('disconnect', (reason) => {});
socket.on('connect_error', (error) => {});
```

### 5. 压力测试

#### 5.1 快速操作测试
- 快速创建多个房间
- 快速加入/离开房间
- 快速切换准备状态

#### 5.2 并发连接测试
- 创建多个 Socket 连接
- 测试多个客户端同时操作
- 验证服务器处理能力

## 测试步骤

1. 启动测试页面
2. 获取有效的 JWT token
3. 建立 WebSocket 连接
4. 执行各项测试用例
5. 观察日志输出
6. 验证预期结果

## 注意事项

1. 确保使用有效的 JWT token
2. 注意网络状态和延迟
3. 观察错误处理是否正确
4. 验证事件监听是否正常
5. 检查内存泄漏问题
6. 测试断线重连功能
7. 验证房间状态同步
8. 检查并发操作的稳定性

## 常见问题

1. 连接失败
   - 检查 token 是否有效
   - 确认服务器地址正确
   - 验证网络连接状态

2. 事件未触发
   - 检查事件名称是否正确
   - 确认事件监听器已注册
   - 验证服务器是否发送事件

3. 操作失败
   - 检查参数格式是否正确
   - 确认操作权限
   - 验证房间状态是否允许操作

### 好友系统测试用例

#### 1. 发送好友请求

**发送请求**:
```javascript
socket.emit('sendFriendRequest', {
    toUserId: 'valid_user_id',
    message: '请求添加好友'
}, (response) => {
    console.log(response);
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        requestId: "507f1f77bcf86cd799439011",
        status: "pending",
        requestSent: true,
        message: "好友请求发送成功",
        toUser: {
            userId: "507f1f77bcf86cd799439012",
            username: "player1"
        }
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息", // 可能的错误：
    // - 目标用户ID不能为空
    // - 用户不存在
    // - 该用户已经是您的好友
    // - 已经发送过好友请求
    requestSent: false
}
```

#### 2. 处理好友请求

**发送请求**:
```javascript
socket.emit('handleFriendRequest', {
    requestId: 'valid_request_id',
    action: 'accept' // 或 'reject'
}, (response) => {
    console.log(response);
});
```

**成功响应**:
```javascript
{
    success: true,
    data: {
        requestId: "507f1f77bcf86cd799439011",
        status: "accepted", // 或 "rejected"
        handled: true,
        message: "好友请求接受成功", // 或 "好友请求拒绝成功"
        fromUser: {
            userId: "507f1f77bcf86cd799439012",
            username: "player1"
        }
    }
}
```

**错误响应**:
```javascript
{
    success: false,
    error: "错误信息", // 可能的错误：
    // - 请求ID和处理动作不能为空
    // - 好友请求不存在
    // - 无权处理该请求
    // - 该请求已被处理
    // - 无效的操作
    handled: false
}
```

### 事件监听

#### 1. 接收好友请求
```javascript
socket.on('friendRequestReceived', (data) => {
    // data 格式:
    // {
    //     requestId: "507f1f77bcf86cd799439011",
    //     fromUser: {
    //         userId: "507f1f77bcf86cd799439012",
    //         username: "player1"
    //     },
    //     message: "请求添加好友",
    //     timestamp: "2024-01-20T12:00:00Z"
    // }
});
```

#### 2. 好友请求处理结果
```javascript
socket.on('friendRequestHandled', (data) => {
    // data 格式:
    // {
    //     requestId: "507f1f77bcf86cd799439011",
    //     status: "accepted", // 或 "rejected"
    //     toUser: {
    //         userId: "507f1f77bcf86cd799439013",
    //         username: "player2"
    //     },
    //     timestamp: "2024-01-20T12:00:00Z"
    // }
});
```

### 注意事项

1. 请求限制：
   - 不能向自己发送好友请求
   - 不能向已是好友的用户发送请求
   - 不能重复发送请求
   - 请求消息最大长度100字符

2. 状态说明：
   - requestSent: 标识请求是否已成功发送
   - status: 请求的当前状态(pending/accepted/rejected)
   - handled: 标识请求是否已被处理

3. 错误处理：
   - 所有错误响应都包含 success: false
   - 错误响应包含具体的错误信息
   - 请求发送失败时 requestSent 为 false
   - 请求处理失败时 handled 为 false

4. 实时通知：
   - 发送请求后，目标用户会立即收到通知
   - 处理请求后，发送者会立即收到结果通知
   - 所有通知都包含时间戳

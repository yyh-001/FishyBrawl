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

class ApiResponse {
    static success(data = null, message = '操作成功') {
        return {
            code: 200,
            message,
            data
        };
    }

    static error(code, message) {
        return {
            code,
            message,
            data: null
        };
    }
}

module.exports = ApiResponse; 
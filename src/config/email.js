module.exports = {
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    },
    from: process.env.EMAIL_FROM,
    verificationCodeExpires: 10 * 60, // 10分钟
    resetTokenExpires: 30 * 60 // 30分钟
}; 
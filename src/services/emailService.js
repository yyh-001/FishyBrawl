const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport(emailConfig.smtp);
    }

    async sendVerificationCode(email, code, type) {
        const subject = type === 'register' ? '注册验证码' : '重置密码验证码';
        const html = `
            <h1>验证码</h1>
            <p>您的${subject}是：<strong>${code}</strong></p>
            <p>验证码有效期为10分钟，请尽快使用。</p>
        `;

        try {
            await this.transporter.sendMail({
                from: emailConfig.from,
                to: email,
                subject,
                html
            });
            logger.info(`邮件发送成功: ${email}`);
        } catch (error) {
            logger.error(`邮件发送失败: ${email}`, error);
            throw new Error('邮件发送失败');
        }
    }
}

module.exports = new EmailService(); 
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMail = validateMail;
var nodemailer_1 = require("nodemailer");
var process = require("node:process");
var emailHtml_ts_1 = require("../plugins/emailHtml.ts");
/**
 * 发送验证码给指定邮箱
 * @param email {string} 邮箱接收者
 * @param subject {string} 邮件标题
 * @param content {string} 邮件内容
 * @param code {string} 邮箱验证码，默认由该函数生成
 * @param expired {string} 验证码过期时间，默认为60秒
 * @return {Promise} 返回一个Promise
 * @example 使用示例：
 * validateMail({email:'xxx@qq.com'}).then(res=>{}).catch(err=>{})
 */
function validateMail(_a) {
    var email = _a.email, subject = _a.subject, content = _a.content, code = _a.code, expired = _a.expired;
    var config = {
        pool: true,
        host: process.env.MAILER_HOST,
        port: Number(process.env.MAILER_PORT),
        secure: true,
        auth: {
            user: process.env.MAILER_USER,
            pass: process.env.MAILER_PASS
        }
    };
    var smtpTransport = nodemailer_1.default.createTransport(config);
    var string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var generateVerifyCode = function () {
        var stringArr = string.split('');
        var randomString = '';
        //创建循环，随机生成一个与letterArray长度一致字符串
        for (var i = 0; i <= 5; i++) {
            var randomNumber = parseInt((Math.random() * stringArr.length).toString());
            randomString += stringArr[randomNumber];
        }
        return randomString;
    };
    var verifyCodeExpired = expired !== undefined ? expired : 60;
    var defaultSub = 'Zora email verification';
    var verifyCode = generateVerifyCode();
    var html = (0, emailHtml_ts_1.generateEmailHtml)(code ? code : verifyCode, expired ? expired : verifyCodeExpired, subject ? subject : defaultSub);
    return new Promise(function (resolve, reject) {
        var _a;
        smtpTransport.sendMail({
            from: (_a = config === null || config === void 0 ? void 0 : config.auth) === null || _a === void 0 ? void 0 : _a.user,
            to: email,
            subject: subject || defaultSub,
            html: content || html
        }).then(function (res) {
            resolve({
                result: res,
                code: code ? code : verifyCode
            });
        }).catch(function (err) {
            reject(err);
        });
    });
}

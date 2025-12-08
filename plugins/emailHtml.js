"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmailHtml = void 0;
var generateEmailHtml = function (code, verifyCodeExpired, title) {
    return "\n      <!DOCTYPE html>\n      <html lang=\"zh-CN\">\n      <head>\n          <meta charset=\"UTF-8\">\n          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n          <title>".concat(title, "</title>\n          <style>\n              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n              .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n              .code { font-size: 24px; font-weight: bold; color: #ff4400; letter-spacing: 2px; margin: 15px 0; }\n              .expire { color: #999; font-size: 14px; }\n          </style>\n      </head>\n      <body>\n          <div class=\"container\">\n              <p>Hello\uFF01</p>\n              <p>Thank you for using Zora services. Your verification code is:</p>\n              <div class=\"code\">").concat(code, "</div>\n              <p class=\"expire\">Please use it within <strong>").concat(verifyCodeExpired / 60, "</strong> minute\uFF0C It is invalid after expiration!</p>\n              <p>If it is not operated by you personally, please ignore this email.</p>\n          </div>\n      </body>\n      </html>\n    ");
};
exports.generateEmailHtml = generateEmailHtml;

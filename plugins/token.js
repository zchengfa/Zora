"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTokenAsync = exports.verifyToken = exports.createToken = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var secretOrPrivateKey = process.env.JWT_PRIVATE_KEY;
var createToken = function (params, expiresTime) {
    if (!secretOrPrivateKey) {
        throw new Error('JWT_PRIVATE_KEY environment variable is not set');
    }
    // 生成token,当过期时间number类型时以秒计算
    return jsonwebtoken_1.default.sign(params, secretOrPrivateKey, { expiresIn: expiresTime });
};
exports.createToken = createToken;
var verifyToken = function (token, callback) {
    if (!secretOrPrivateKey) {
        callback(new Error('JWT_PRIVATE_KEY environment variable is not set'), undefined);
        return;
    }
    jsonwebtoken_1.default.verify(token, secretOrPrivateKey, callback);
};
exports.verifyToken = verifyToken;
// 可选：添加一个返回 Promise 的版本，便于异步使用
var verifyTokenAsync = function (token) {
    return new Promise(function (resolve, reject) {
        (0, exports.verifyToken)(token, function (error, decoded) {
            if (error) {
                reject(error);
            }
            else {
                resolve(decoded);
            }
        });
    });
};
exports.verifyTokenAsync = verifyTokenAsync;

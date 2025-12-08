"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoraApi = zoraApi;
var validateMail_ts_1 = require("../plugins/validateMail.ts");
var express_rate_limit_1 = require("express-rate-limit");
var bcrypt_1 = require("bcrypt");
var handleZoraError_ts_1 = require("../plugins/handleZoraError.ts");
var uuid_1 = require("uuid");
var token_ts_1 = require("../plugins/token.ts");
var REDIS_EMAIL_APPEND = '_verify_code';
var REDIS_ATTEMPT_KEY = '_attempt_count';
var EXPIRED = 300;
var SESSION_EXPIRED_DURATION = 7 * 24 * 60 * 60 * 1000;
var getRedisStorageKey = function (target, append) {
    if (append === void 0) { append = REDIS_EMAIL_APPEND; }
    return "".concat(target).concat(append);
};
//限制器工厂函数
var createRateLimiter = function (limit, windowMs) {
    if (windowMs === void 0) { windowMs = 60000; }
    return (0, express_rate_limit_1.default)({
        windowMs: windowMs,
        limit: limit,
        message: "Your request is too frequent. Please try again later"
    });
};
//定义限制级别
var RATE_LIMITS = {
    STRICT: createRateLimiter(3),
    NORMAL: createRateLimiter(60),
    LOOSE: createRateLimiter(300),
};
var pwdCompare = function (paramsObj, databasePwd, res, redis, prisma) { return __awaiter(void 0, void 0, void 0, function () {
    var result, session_id, expired, sessionPrismaUpsert, token, e_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 8]);
                return [4 /*yield*/, bcrypt_1.default.compare(paramsObj.password, databasePwd)];
            case 1:
                result = _b.sent();
                if (!result) return [3 /*break*/, 5];
                session_id = (0, uuid_1.v4)();
                expired = new Date(new Date().getTime() + SESSION_EXPIRED_DURATION);
                return [4 /*yield*/, prisma.session.upsert({
                        where: {
                            email: paramsObj.email
                        },
                        update: {
                            sessionId: session_id,
                            expires: expired
                        },
                        create: {
                            sessionId: session_id,
                            userId: paramsObj.id,
                            firstName: paramsObj.firstName,
                            lastName: paramsObj.lastName,
                            email: paramsObj.email,
                            expires: expired,
                        }
                    })];
            case 2:
                sessionPrismaUpsert = _b.sent();
                return [4 /*yield*/, redis.hset("session:".concat(paramsObj.id), __assign({}, sessionPrismaUpsert))];
            case 3:
                _b.sent();
                return [4 /*yield*/, redis.expire("session:".concat(paramsObj.id), SESSION_EXPIRED_DURATION / 1000)];
            case 4:
                _b.sent();
                token = (0, token_ts_1.createToken)({ session_id: session_id }, '1d');
                res.status(200).send({ result: true, message: 'login successfully', token: token, userInfo: { userId: (_a = paramsObj.id) === null || _a === void 0 ? void 0 : _a.toString() } });
                return [3 /*break*/, 6];
            case 5:
                res.status(200).send({ result: false, message: 'login failed with invalid credentials' });
                _b.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                e_1 = _b.sent();
                (0, handleZoraError_ts_1.handlePrismaError)(e_1);
                res.status(500).send({ result: false, message: "Server Error" });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); };
var loginFunction = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var redisPwdQuery, prismaPwdQuery, e_2;
    var redis = _b.redis, prisma = _b.prisma, paramsObj = _b.paramsObj, res = _b.res;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 9, , 10]);
                return [4 /*yield*/, redis.hget("customer:".concat(paramsObj.email), 'password')
                    //是否命中
                ];
            case 1:
                redisPwdQuery = _c.sent();
                if (!redisPwdQuery) return [3 /*break*/, 3];
                return [4 /*yield*/, pwdCompare(paramsObj, redisPwdQuery, res, redis, prisma)];
            case 2:
                _c.sent();
                return [3 /*break*/, 8];
            case 3: return [4 /*yield*/, prisma.customers.findUnique({
                    where: {
                        email: paramsObj.email
                    }
                })];
            case 4:
                prismaPwdQuery = _c.sent();
                return [4 /*yield*/, redis.hset("customer:".concat(paramsObj.email), __assign({}, prismaPwdQuery))];
            case 5:
                _c.sent();
                return [4 /*yield*/, redis.expire("customer:".concat(paramsObj.email), 24 * 60 * 60)];
            case 6:
                _c.sent();
                return [4 /*yield*/, pwdCompare(paramsObj, prismaPwdQuery.password, res, redis, prisma)];
            case 7:
                _c.sent();
                _c.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                e_2 = _c.sent();
                res.status(500).send({ result: false, message: "Server Error" });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); };
function zoraApi(_a) {
    var _this = this;
    var app = _a.app, redis = _a.redis, prisma = _a.prisma;
    app.post('/authenticator', RATE_LIMITS.STRICT, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var paramsObj, redisQuery, prismaQuery, newCustomer, _a, _b, e_3;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    paramsObj = req.body;
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 15, , 16]);
                    return [4 /*yield*/, redis.hget("customer:".concat(paramsObj.email), 'userId')
                        //检查是否命中，未命中则再去数据库查询
                    ];
                case 2:
                    redisQuery = _e.sent();
                    if (!redisQuery) return [3 /*break*/, 4];
                    //redis命中，表示需要登录
                    paramsObj.id = redisQuery;
                    return [4 /*yield*/, loginFunction({ redis: redis, prisma: prisma, paramsObj: paramsObj, res: res })];
                case 3:
                    _e.sent();
                    return [3 /*break*/, 14];
                case 4: return [4 /*yield*/, prisma.customers.findUnique({
                        where: {
                            email: paramsObj.email
                        }
                    })
                    //查询到数据，同步到redis中,执行登录操作
                ];
                case 5:
                    prismaQuery = _e.sent();
                    if (!prismaQuery) return [3 /*break*/, 8];
                    return [4 /*yield*/, redis.hget("customer:".concat(paramsObj.email), __assign({}, prismaQuery))
                        //登录
                    ];
                case 6:
                    _e.sent();
                    //登录
                    paramsObj.id = prismaQuery.id;
                    return [4 /*yield*/, loginFunction({ redis: redis, prisma: prisma, paramsObj: paramsObj, res: res })];
                case 7:
                    _e.sent();
                    return [3 /*break*/, 14];
                case 8:
                    _b = (_a = prisma.customers).create;
                    _c = {};
                    _d = {
                        shopify_customer_id: new Date().getTime().toString(),
                        email: paramsObj.email,
                        first_name: paramsObj.firstName,
                        last_name: paramsObj.lastName
                    };
                    return [4 /*yield*/, bcrypt_1.default.hash(paramsObj.password, 10)];
                case 9: return [4 /*yield*/, _b.apply(_a, [(_c.data = (_d.password = _e.sent(),
                            _d.market_email = paramsObj.marketEmail,
                            _d.market_sms = paramsObj.marketSMS,
                            _d),
                            _c)])
                    //数据写入成功，执行一次redis写入
                ];
                case 10:
                    newCustomer = _e.sent();
                    if (!newCustomer) return [3 /*break*/, 14];
                    return [4 /*yield*/, redis.hset("customer:".concat(paramsObj.email), __assign({}, newCustomer))];
                case 11:
                    _e.sent();
                    return [4 /*yield*/, redis.expire("customer:".concat(paramsObj.email), 24 * 60 * 60)
                        //执行登录
                    ];
                case 12:
                    _e.sent();
                    //执行登录
                    paramsObj.id = newCustomer.id;
                    return [4 /*yield*/, loginFunction({ redis: redis, prisma: prisma, paramsObj: paramsObj, res: res })];
                case 13:
                    _e.sent();
                    _e.label = 14;
                case 14: return [3 /*break*/, 16];
                case 15:
                    e_3 = _e.sent();
                    (0, handleZoraError_ts_1.handlePrismaError)(e_3);
                    res.status(500).send({ result: false, message: "Server Error" });
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    }); });
    app.post('/validateToken', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var token, err_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
                    if (!token) {
                        return [2 /*return*/, res.status(401).send({ result: false, message: 'Authentication token missing' })];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, token_ts_1.verifyTokenAsync)(token)];
                case 2:
                    _b.sent();
                    res.status(200).send({ result: true, message: 'logged in' });
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _b.sent();
                    return [2 /*return*/, res.status(401).send({ result: false, message: 'Token expired or invalid' })];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    app.post('/checkEmail', RATE_LIMITS.NORMAL, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var email, redisEmailQuery, prismaEmailQuery, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    email = req.body.email;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, redis.hexists("customer:".concat(email), 'email')
                        //是否命中
                    ];
                case 2:
                    redisEmailQuery = _a.sent();
                    if (!redisEmailQuery) return [3 /*break*/, 3];
                    res.status(200).send({ result: true, message: "Email already exists" });
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, prisma.customers.findUnique({
                        where: {
                            email: email
                        }
                    })
                    //数据库有该邮箱
                ];
                case 4:
                    prismaEmailQuery = _a.sent();
                    if (!prismaEmailQuery) return [3 /*break*/, 7];
                    //将读取到的信息同步到 redis
                    return [4 /*yield*/, redis.hset("customer:".concat(email), __assign({}, prismaEmailQuery))];
                case 5:
                    //将读取到的信息同步到 redis
                    _a.sent();
                    return [4 /*yield*/, redis.expire("customer:".concat(email), 3600)];
                case 6:
                    _a.sent();
                    res.status(200).send({ result: true, message: "Email already exists" });
                    return [3 /*break*/, 8];
                case 7:
                    res.status(200).send({ result: false, message: "Email available" });
                    _a.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    e_4 = _a.sent();
                    res.status(500).send({ result: false, message: "Server Error" });
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    }); });
    app.post('/sendVerifyCodeToEmail', RATE_LIMITS.STRICT, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var email, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    email = req.body.email;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, validateMail_ts_1.validateMail)({ email: email, expired: EXPIRED })
                        //发送成功保存验证码到redis中，并设置过期时间，并清除之前验证的次数，防止用户在验证次数时间未过期时重新获取验证码却还是提示验证次数过多
                    ];
                case 2:
                    data = _a.sent();
                    //发送成功保存验证码到redis中，并设置过期时间，并清除之前验证的次数，防止用户在验证次数时间未过期时重新获取验证码却还是提示验证次数过多
                    return [4 /*yield*/, redis.multi()
                            .setex(getRedisStorageKey(email), EXPIRED, data.code)
                            .setex(getRedisStorageKey(email, REDIS_ATTEMPT_KEY), EXPIRED, 0)
                            .exec()];
                case 3:
                    //发送成功保存验证码到redis中，并设置过期时间，并清除之前验证的次数，防止用户在验证次数时间未过期时重新获取验证码却还是提示验证次数过多
                    _a.sent();
                    res.status(200).send({ success: true, code_expired: EXPIRED, message: 'code send successfully' });
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    res.status(500).send({ server_error: true, message: 'server error' });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    app.post('/verifyCode', RATE_LIMITS.LOOSE, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var _a, code, email, attempt, attemptKey, redisEx, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = req.body, code = _a.code, email = _a.email;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, redis.get(getRedisStorageKey(email, REDIS_ATTEMPT_KEY))];
                case 2:
                    attempt = (_b.sent()) || 0;
                    attemptKey = getRedisStorageKey(email, REDIS_ATTEMPT_KEY);
                    if (!code || !email) {
                        return [2 /*return*/, res.status(400).send({
                                result: false,
                                left_attempt: 5 - Number(attempt),
                                message: 'Incomplete parameters'
                            })];
                    }
                    if (parseInt(String(attempt)) >= 5) {
                        return [2 /*return*/, res.status(429).send({
                                result: false,
                                message: 'Too many attempts, please obtain the verification code again'
                            })];
                    }
                    return [4 /*yield*/, redis.get(email + REDIS_EMAIL_APPEND)];
                case 3:
                    redisEx = _b.sent();
                    if (!redisEx) return [3 /*break*/, 10];
                    if (!(redisEx === code)) return [3 /*break*/, 6];
                    //验证码正确，结果反馈，删除redis中存储的对应验证码和验证次数
                    return [4 /*yield*/, redis.del(attemptKey)];
                case 4:
                    //验证码正确，结果反馈，删除redis中存储的对应验证码和验证次数
                    _b.sent();
                    return [4 /*yield*/, redis.del(getRedisStorageKey(email))];
                case 5:
                    _b.sent();
                    res.status(200).send({ result: true, message: 'validate success' });
                    return [3 /*break*/, 9];
                case 6: 
                //验证码错误，增加验证次数
                return [4 /*yield*/, redis.incr(attemptKey)];
                case 7:
                    //验证码错误，增加验证次数
                    _b.sent();
                    return [4 /*yield*/, redis.expire(attemptKey, EXPIRED)];
                case 8:
                    _b.sent();
                    res.status(200).send({ result: false, left_attempt: 5 - Number(attempt) - 1, message: "Verification code error, you still have ".concat(5 - Number(attempt) - 1, " chances to try") });
                    _b.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    res.status(200).send({ result: false, message: 'code expired' });
                    _b.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    error_2 = _b.sent();
                    res.status(500).send({ server_error: true, message: 'server error' });
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    }); });
}

"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSocketServer = startSocketServer;
var socket_io_1 = require("socket.io");
var process = require("node:process");
function startSocketServer(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var io, users_1;
        var _this = this;
        var server = _b.server, redis = _b.redis, prisma = _b.prisma;
        return __generator(this, function (_c) {
            try {
                io = new socket_io_1.Server(server, {
                    cors: {
                        origin: __spreadArray([], (process.env.SERVER_ORIGIN.split(',')), true),
                    },
                    transports: ['websocket', 'polling']
                });
                users_1 = new Map();
                io.on('connection', function (ws) {
                    ws.emit('test', 'hello');
                    ws.on('online', function (payload) { return __awaiter(_this, void 0, void 0, function () {
                        var user, redisQuery, prismaQuery, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    user = JSON.parse(payload);
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 6, , 7]);
                                    return [4 /*yield*/, redis.hget("session:".concat(user.userId), 'email')];
                                case 2:
                                    redisQuery = _a.sent();
                                    if (!!redisQuery) return [3 /*break*/, 4];
                                    return [4 /*yield*/, prisma.session.findUnique({
                                            where: {
                                                userId: user.userId
                                            }
                                        })];
                                case 3:
                                    prismaQuery = _a.sent();
                                    users_1.set(prismaQuery.email, ws.id);
                                    console.log(prismaQuery.email + '上线了');
                                    return [3 /*break*/, 5];
                                case 4:
                                    users_1.set(redisQuery, ws.id);
                                    console.log(redisQuery + '上线了');
                                    _a.label = 5;
                                case 5: return [3 /*break*/, 7];
                                case 6:
                                    e_1 = _a.sent();
                                    console.log('出错了：socketServer.ts');
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); });
                    ws.on('sendMessage', function (payload) {
                        console.log(payload);
                    });
                });
                return [2 /*return*/, '✅ zora socket服务启动成功'];
            }
            catch (e) {
                return [2 /*return*/, '❌ zora socket服务启动失败：' + e];
            }
            return [2 /*return*/];
        });
    });
}

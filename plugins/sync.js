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
exports.syncRedis = void 0;
var handleZoraError_ts_1 = require("./handleZoraError.ts");
var syncRedis = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var EXPIRED, customers, customerTag, customerAddress, customerTagRelation, session, pipeline, _i, customers_1, customer, _c, customerTag_1, tag, _d, customerAddress_1, address, _e, customerTagRelation_1, relation, _f, session_1, item, id, e_1;
    var prisma = _b.prisma, redis = _b.redis;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 9, , 10]);
                EXPIRED = 24 * 60 * 60;
                return [4 /*yield*/, prisma.customers.findMany()];
            case 1:
                customers = _g.sent();
                return [4 /*yield*/, prisma.customer_tags.findMany()];
            case 2:
                customerTag = _g.sent();
                return [4 /*yield*/, prisma.customer_addresses.findMany()];
            case 3:
                customerAddress = _g.sent();
                return [4 /*yield*/, prisma.customer_tag_relations.findMany()];
            case 4:
                customerTagRelation = _g.sent();
                return [4 /*yield*/, prisma.session.findMany()
                    // 如果数据不为空，则写入Redis
                ];
            case 5:
                session = _g.sent();
                if (!(customers.length > 0)) return [3 /*break*/, 7];
                pipeline = redis.pipeline();
                // 存储客户基本信息为 Hash
                for (_i = 0, customers_1 = customers; _i < customers_1.length; _i++) {
                    customer = customers_1[_i];
                    pipeline.hset("customer:".concat(customer.email), __assign({}, customer));
                    pipeline.expire("customer:".concat(customer.email), EXPIRED);
                }
                // 存储标签信息
                for (_c = 0, customerTag_1 = customerTag; _c < customerTag_1.length; _c++) {
                    tag = customerTag_1[_c];
                    pipeline.hset("tag:".concat(tag.id), __assign({}, tag));
                    pipeline.expire("tag:".concat(tag.id), EXPIRED);
                }
                // 存储地址信息
                for (_d = 0, customerAddress_1 = customerAddress; _d < customerAddress_1.length; _d++) {
                    address = customerAddress_1[_d];
                    pipeline.hset("address:".concat(address.id), __assign({}, address));
                    pipeline.expire("address:".concat(address.id), EXPIRED);
                }
                // 存储关系（使用 Set）
                for (_e = 0, customerTagRelation_1 = customerTagRelation; _e < customerTagRelation_1.length; _e++) {
                    relation = customerTagRelation_1[_e];
                    pipeline.sadd("customer:".concat(relation.customer_id, ":tags"), relation.tag_id.toString());
                    pipeline.expire("customer:".concat(relation.customer_id, ":tags"), EXPIRED);
                    pipeline.sadd("tag:".concat(relation.tag_id, ":customers"), relation.customer_id.toString());
                    pipeline.expire("tag:".concat(relation.tag_id, ":customers"), EXPIRED);
                }
                //存储session
                for (_f = 0, session_1 = session; _f < session_1.length; _f++) {
                    item = session_1[_f];
                    id = item.userId ? item.userId : 999999999;
                    pipeline.hset("session:".concat(id), __assign({}, item));
                    pipeline.expire("session:".concat(id), EXPIRED);
                }
                // 执行管道中的命令
                return [4 /*yield*/, pipeline.exec()];
            case 6:
                // 执行管道中的命令
                _g.sent();
                return [2 /*return*/, "zora提示✅：redis数据同步成功"];
            case 7: return [2 /*return*/, "zora提示😢：没有可同步的数据"];
            case 8: return [3 /*break*/, 10];
            case 9:
                e_1 = _g.sent();
                (0, handleZoraError_ts_1.handlePrismaError)(e_1);
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.syncRedis = syncRedis;

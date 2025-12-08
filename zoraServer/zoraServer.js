"use strict";
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
var dotenv_1 = require("dotenv");
var express_1 = require("express");
var cors_1 = require("cors");
var body_parser_1 = require("body-parser");
var db_server_ts_1 = require("../app/db.server.ts");
var ioredis_1 = require("ioredis");
var socketServer_ts_1 = require("./socketServer.ts");
var zoraApi_ts_1 = require("./zoraApi.ts");
var sync_ts_1 = require("../plugins/sync.ts");
var interceptors_ts_1 = require("../plugins/interceptors.ts");
var process = require("node:process");
dotenv_1.default.config({ path: '.env' });
var redis = new ioredis_1.default(process.env.REDIS_URL);
var app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: __spreadArray([], (process.env.SERVER_ORIGIN.split(',')), true),
}));
//信任代理
app.set("trust proxy", 1);
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(function (req, res, next) { return (0, interceptors_ts_1.default)({ res: res, req: req, next: next }); });
var server = app.listen(8080, function () {
    console.log("zora服务启动成功，端口：8080");
});
//接口
(0, zoraApi_ts_1.zoraApi)({ app: app, redis: redis, prisma: db_server_ts_1.default });
//启动socket服务
(0, socketServer_ts_1.startSocketServer)({ redis: redis, prisma: db_server_ts_1.default, server: server }).then(function (res) {
    console.log(res);
})
    .catch(function (e) {
    console.log(e);
});
(0, sync_ts_1.syncRedis)({ prisma: db_server_ts_1.default, redis: redis }).then(function (res) {
    console.log(res);
});

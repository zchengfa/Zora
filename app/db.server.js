"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
if (process.env.NODE_ENV !== "production") {
    if (!global.prismaGlobal) {
        global.prismaGlobal = new client_1.PrismaClient();
    }
}
var prisma = (_a = global.prismaGlobal) !== null && _a !== void 0 ? _a : new client_1.PrismaClient();
exports.default = prisma;

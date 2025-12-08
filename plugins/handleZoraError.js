"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePrismaError = void 0;
var handlePrismaError = function (e) {
    var err = e.toString();
    var errMsg = '';
    if (err.indexOf('PrismaClientInitializationError') !== -1) {
        if (err.indexOf('Authentication failed') !== -1) {
            errMsg = '数据库连接失败，env文件中配置的数据库参数是否有误！';
        }
        else if (err.indexOf("Can't reach database server") !== -1) {
            errMsg = '未检测到数据库服务，请确认数据库服务已开启！';
        }
    }
    else if (err.indexOf('PrismaClientKnownRequestError') !== -1) {
        if (err.indexOf('Unique constraint failed') !== -1) {
            var uniqueModel = e.meta.modelName;
            var uniqueKey = e.meta.target.replace('_key', '').replace(e.meta.modelName + "_", '');
            errMsg = "Model:".concat(uniqueModel, "\u5177\u6709\u552F\u4E00\u7EA6\u675F,\u552F\u4E00\u7EA6\u675Fkey:").concat(uniqueKey, "\uFF0C\u65E0\u6CD5\u518D\u6B21\u521B\u5EFA");
        }
    }
    else if (err.indexOf('TypeError') !== -1) {
        errMsg = 'Prisma客户端查询的 Model 属性错误，请确认是否有该 Model 属性！';
    }
    console.log("Prisma\u51FA\u9519\u4E86\uFF1A\u274C ".concat(errMsg));
};
exports.handlePrismaError = handlePrismaError;

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export const logger = winston.createLogger({
  level: 'info', // 设置最低日志级别，'debug', 'info', 'warn', 'error'
  format: winston.format.combine(
    winston.format.timestamp({format:'YYYY-MM-DD hh:mm:ss'}), // 添加时间戳（2026年01月06日 11时34分50秒）
    winston.format.errors({ stack: true }), // 捕获错误堆栈
    winston.format.json(), // 输出为 JSON 格式，便于分析
    winston.format.colorize({
      all:true,
      colors:{
        info: 'green',
        warning: 'yellow',
        error: 'red',
        debug: 'blue',
      }
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/zora-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // 压缩旧日志
      maxSize: '20m',     // 单个文件最大 20MB
      maxFiles: '1d'     // 保留最近 30 天的日志
    })
  ]
});

// 如果不是生产环境，则同时输出到控制台，方便开发调试
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple() // 控制台使用更易读的格式
  }));
}



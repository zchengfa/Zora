import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/zora-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '15d'
    })
  ],
  // 捕获并记录未处理的异常
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '15d'
    })
  ],
  // 捕获并记录未处理的 Promise
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '15d'
    })
  ]
});



// 非生产环境，添加控制台传输器并单独配置颜色
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    // 为控制台单独设置格式，包含颜色且更易读
    format: winston.format.combine(
      winston.format.colorize({
        all: true,
        colors: {
          info: 'green',
          warn: 'yellow',
          error: 'red',
          debug: 'blue',
        }
      }),
      winston.format.printf(({level,message,timestamp,meta})=>{
        return `${timestamp}(❤️) From：[${meta?.taskType}] [${level}] : ${message}`;
      })
    )
  }));
}

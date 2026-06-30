import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: config.app.name },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.app.env === 'development'
        ? combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), devFormat)
        : combine(timestamp(), json()),
    }),
    // File transports for production
    ...(config.app.env === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export default logger;

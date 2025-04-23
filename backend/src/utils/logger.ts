import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Default to 'info', can be configured via env var
  format: combine(
    timestamp(), // Add timestamp
    errors({ stack: true }), // Log stack trace if available
    json() // Log in JSON format
  ),
  transports: [
    new winston.transports.Console(), // Log to the console
    // TODO: Add file transport for production logging if needed later
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
  exceptionHandlers: [
    // Log unhandled exceptions to the console as well
    new winston.transports.Console(),
    // TODO: Add file transport for unhandled exceptions if needed
    // new winston.transports.File({ filename: 'exceptions.log' })
  ],
  rejectionHandlers: [
    // Log unhandled promise rejections
    new winston.transports.Console(),
    // TODO: Add file transport for unhandled rejections if needed
    // new winston.transports.File({ filename: 'rejections.log' })
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Stream for morgan logging (optional, can integrate later if needed)
// logger.stream = {
//   write: (message) => {
//     logger.info(message.trim());
//   },
// };

export default logger;
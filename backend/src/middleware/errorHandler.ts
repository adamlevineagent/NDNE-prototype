import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import logger from '../utils/logger';
import { HttpError } from '../utils/HttpError';

/**
 * Express error handling middleware.
 * Catches errors passed via next(error), logs them, and sends a generic
 * error response to the client.
 */
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Check if this is our custom HttpError
  const isHttpError = err instanceof HttpError;
  
  // Get status code, defaulting to 500 if not specified
  const statusCode = err.statusCode || 500;

  // Determine message based on environment and error type
  const responseMessage = process.env.NODE_ENV === 'production' && statusCode >= 500
    ? 'Internal Server Error' // Hide detailed server errors in production
    : err.message || 'An unexpected error occurred';

  // Log the error with Winston
  logger.error('Error caught by handler', {
    message: err.message,
    stack: err.stack,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    httpError: isHttpError,
    // Include any custom details if present
    ...(isHttpError && err.details && { details: err.details }),
  });

  // Send response to client
  res.status(statusCode).json({
    status: 'error',
    message: responseMessage,
    // Only include these details in non-production or for client errors (4xx)
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      ...(isHttpError && err.details && { details: err.details })
    }),
  });

  // Note: We don't call next() here because the response is already sent.
};

export default errorHandler;
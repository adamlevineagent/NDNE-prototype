/**
 * Custom error class for HTTP-related errors.
 * Allows for specifying a status code and optional details.
 * Works with the global error handler middleware.
 */
export class HttpError extends Error {
  statusCode: number;
  details?: Record<string, any>;

  /**
   * Create a new HTTP error
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param details - Optional additional details for logging
   */
  constructor(message: string, statusCode = 500, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    
    // Captures the stack trace (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Helper function to create a not found error (404)
 * @param message - Optional custom message
 * @param details - Optional additional details for logging
 */
export function notFound(message = 'Resource not found', details?: Record<string, any>): HttpError {
  return new HttpError(message, 404, details);
}

/**
 * Helper function to create a bad request error (400)
 * @param message - Optional custom message
 * @param details - Optional additional details for logging
 */
export function badRequest(message = 'Bad request', details?: Record<string, any>): HttpError {
  return new HttpError(message, 400, details);
}

/**
 * Helper function to create an unauthorized error (401)
 * @param message - Optional custom message
 * @param details - Optional additional details for logging
 */
export function unauthorized(message = 'Unauthorized', details?: Record<string, any>): HttpError {
  return new HttpError(message, 401, details);
}

/**
 * Helper function to create a forbidden error (403)
 * @param message - Optional custom message
 * @param details - Optional additional details for logging
 */
export function forbidden(message = 'Forbidden', details?: Record<string, any>): HttpError {
  return new HttpError(message, 403, details);
}

/**
 * Helper function to create a conflict error (409)
 * @param message - Optional custom message
 * @param details - Optional additional details for logging
 */
export function conflict(message = 'Conflict', details?: Record<string, any>): HttpError {
  return new HttpError(message, 409, details);
}

/**
 * Helper function to create a server error (500)
 * @param message - Optional custom message
 * @param details - Optional additional details for logging
 */
export function serverError(message = 'Internal server error', details?: Record<string, any>): HttpError {
  return new HttpError(message, 500, details);
}
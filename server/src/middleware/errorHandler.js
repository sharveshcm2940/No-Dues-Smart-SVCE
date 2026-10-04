const { logger } = require('../utils/logger');

/**
 * Centralized Application Error Handling Middleware
 * - Logs structured error with request correlation ID
 * - Strictly strips stack traces and internal paths in production
 * - Returns uniform JSON response format
 */
function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // 1. Log structured error details server-side
  logger.error({
    err: {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack
    },
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user ? req.user.id : null
  }, 'Unhandled request error caught by centralized error handler');

  // 2. Handle specific known operational error types
  if (err.message && err.message.startsWith('CORS policy violation')) {
    return res.status(403).json({
      success: false,
      message: err.message,
      requestId
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload size limit exceeded (max 1MB).',
      requestId
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
      requestId
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      requestId
    });
  }

  // 3. Status code determination
  const statusCode = (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600)
    ? err.statusCode
    : (typeof err.status === 'number' && err.status >= 400 && err.status < 600)
      ? err.status
      : 500;

  // 4. Response formatting (Never leak stack traces or internal DB details in production)
  let safeMessage = err.message || 'Internal server error.';
  if (isProduction) {
    if (statusCode === 500 || err.sql || err.sqlMessage || (err.code && String(err.code).startsWith('ER_'))) {
      safeMessage = 'An internal server error occurred. Please contact IT support with your Request ID.';
    }
  }

  const clientResponse = {
    success: false,
    message: safeMessage,
    requestId
  };

  if (!isProduction && statusCode === 500) {
    clientResponse.debug = {
      name: err.name,
      stack: err.stack,
      code: err.code,
      sql: err.sql || undefined
    };
  }

  return res.status(statusCode).json(clientResponse);
}

module.exports = errorHandler;

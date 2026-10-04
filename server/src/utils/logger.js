const pino = require('pino');
const pinoHttp = require('pino-http');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Sensitive keys to strictly redact across all log entries (PII + Secrets)
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-auth-token"]',
  'password',
  'newPassword',
  'confirmPassword',
  'currentPassword',
  'oldPassword',
  'mfa_secret',
  'secret',
  'totpCode',
  'totp_code',
  'token',
  'refreshToken',
  'mfaPendingToken',
  'certificate_token',
  'certificate_hmac',
  'student_phone',
  'phone',
  'parent_phone',
  'contact_number',
  'student_email',
  'email',
  'parent_email',
  'aadhaar',
  'aadhaar_number',
  'ctc_package',
  'salary',
  'stipend',
  'credit_card',
  'cardNumber',
  'cvv',
  'pan_number',
  '*.password',
  '*.newPassword',
  '*.token',
  '*.refreshToken',
  '*.mfa_secret',
  '*.secret',
  '*.student_phone',
  '*.phone',
  '*.student_email',
  '*.email',
  '*.aadhaar',
  '*.ctc_package'
];

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isProduction ? 'info' : 'debug'),
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]'
  },
  base: {
    service: 'svce-nodues-backend',
    env: process.env.NODE_ENV || 'development'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    }
  }
});

// HTTP Request Logger Middleware with Request ID tracing
const httpLogger = pinoHttp({
  logger,
  genReqId: function (req) {
    const existingId = req.headers['x-request-id'];
    if (existingId && typeof existingId === 'string' && existingId.length <= 64) {
      return existingId;
    }
    return crypto.randomUUID();
  },
  customSuccessMessage: function (req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: function (req, res, err) {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'latencyMs'
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip || req.remoteAddress
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  },
  autoLogging: {
    ignore: (req) => {
      // Don't clutter logs with high-frequency health probes in non-debug mode
      if ((req.url === '/health' || req.url === '/ready') && process.env.LOG_LEVEL !== 'debug') {
        return true;
      }
      return false;
    }
  }
});

/**
 * Middleware ensuring X-Request-ID response header is set for client correlation
 */
function correlationIdMiddleware(req, res, next) {
  // If pino-http already assigned req.id
  const requestId = req.id || req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = {
  logger,
  httpLogger,
  correlationIdMiddleware
};

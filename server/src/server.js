const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Fail-fast environment validation
const config = require('./config/env');

const { seedDatabase } = require('./seed/seedData');
const apiRoutes = require('./routes/api');
const { ensureReady, getPoolStats, getPool, query } = require('./config/db');
const { logger, httpLogger, correlationIdMiddleware } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { getClientsCount, closeAllSSE } = require('./utils/sse');

const app = express();
const PORT = config.PORT || 5000;

// Configure Trust Proxy so rate limiters and audit logs resolve true client IPs behind Nginx/reverse proxy
app.set('trust proxy', config.TRUST_PROXY || 1);

// Structured HTTP Request Logging & Correlation ID Tracking
app.use(httpLogger);
app.use(correlationIdMiddleware);

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Strict CORS Allowlist
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, testing)
    if (!origin) return callback(null, true);
    if (config.CORS_ORIGINS && config.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Request-ID',
    'x-device-name',
    'x-device-type',
    'x-client-location'
  ]
}));

// Global Rate Limiter: configurable (default 300 requests per 15-minute window)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || (process.env.NODE_ENV === 'test' ? '50000' : '300'), 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
  message: {
    success: false,
    message: 'Too many requests from this client. Please retry after 15 minutes.'
  }
});
app.use(globalLimiter);

// Strict Rate Limiter for Authentication & Password Reset: 10 attempts per 15 minutes
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || (process.env.NODE_ENV === 'test' ? '10000' : '10'), 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

// Strict Rate Limiter for Public Certificate Verification: 60 queries per 15 minutes
const publicVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_VERIFY_MAX || (process.env.NODE_ENV === 'test' ? '10000' : '60'), 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
  message: {
    success: false,
    message: 'Too many certificate verification queries. Please try again later.'
  }
});


// Apply specific rate limiters before route mounting
app.use('/api/auth/login', strictAuthLimiter);
app.use('/api/auth/forgot-password', strictAuthLimiter);
app.use('/api/auth/reset-password', strictAuthLimiter);
app.use('/api/auth/mfa/verify', strictAuthLimiter);
app.use('/api/verify', publicVerifyLimiter);
app.use('/api/certificate/verify', publicVerifyLimiter);

// Body Parsing with 1 MB Size Limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Liveness Probe Endpoint (/health)
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'svce-nodues-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    sseClientsCount: getClientsCount(),
    timestamp: new Date().toISOString()
  });
});

// Deep Readiness Probe Endpoint (/ready)
app.get('/ready', async (req, res) => {
  const checks = {
    database: { status: 'UNKNOWN' },
    storage: { status: 'UNKNOWN' },
    sse: { status: 'UP', clients: getClientsCount() }
  };

  let isReady = true;

  // 1. MySQL pool connectivity check
  try {
    const start = Date.now();
    await query('SELECT 1 AS ready_ping');
    checks.database = {
      status: 'UP',
      latencyMs: Date.now() - start,
      pool: getPoolStats()
    };
  } catch (err) {
    isReady = false;
    checks.database = {
      status: 'DOWN',
      error: err.message
    };
  }

  // 2. Storage write check (Uploads folder)
  try {
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    checks.storage = { status: 'UP', writable: true };
  } catch (err) {
    isReady = false;
    checks.storage = { status: 'DOWN', error: err.message };
  }

  const statusCode = isReady ? 200 : 503;
  return res.status(statusCode).json({
    status: isReady ? 'READY' : 'UNAVAILABLE',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks
  });
});

// Mount API Routes
app.use('/api', apiRoutes);

// Production Static Frontend Hosting
const clientBuildPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/ready') {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Centralized Production Error Handler (Hides stack traces in production)
app.use(errorHandler);

let serverInstance = null;

// Start Server & Initialize Database
async function startServer() {
  try {
    await ensureReady();
    await seedDatabase();
    serverInstance = app.listen(PORT, '0.0.0.0', () => {
      logger.info({
        port: PORT,
        baseUrl: `http://localhost:${PORT}/api`,
        health: `http://localhost:${PORT}/health`,
        ready: `http://localhost:${PORT}/ready`
      }, 'SVCE No-Dues API Server Running');
      console.log(`=======================================================`);
      console.log(` IT No-Dues System API Server Running on Port ${PORT}`);
      console.log(` Base URL: http://localhost:${PORT}/api`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(` Readiness Check: http://localhost:${PORT}/ready`);
      console.log(`=======================================================`);
    });

    serverInstance.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
      } else {
        console.error('Server error:', error);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful Shutdown Handling
function handleGracefulShutdown(signal) {
  logger.info({ signal }, 'Initiating graceful server shutdown');
  closeAllSSE();

  if (serverInstance) {
    serverInstance.close(async () => {
      logger.info('HTTP server closed');
      try {
        const pool = getPool();
        if (pool) {
          await pool.end();
          logger.info('MySQL connection pool closed');
        }
      } catch (err) {
        logger.error({ err: err.message }, 'Error closing MySQL pool during shutdown');
      }
      process.exit(0);
    });

    // Force exit after 10s if connections refuse to close
    setTimeout(() => {
      logger.warn('Forcing server termination after timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

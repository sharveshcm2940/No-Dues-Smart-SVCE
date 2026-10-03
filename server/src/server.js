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
const { ensureReady } = require('./config/db');

const app = express();
const PORT = config.PORT || 5000;

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Global Rate Limiter: 300 requests per 15-minute window
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client. Please retry after 15 minutes.'
  }
});
app.use(globalLimiter);

// Strict Rate Limiter for Authentication & Password Reset: 10 attempts per 15 minutes
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

// Strict Rate Limiter for Public Certificate Verification: 60 queries per 15 minutes
const publicVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
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

// Mount API Routes
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'Information Technology Department No-Dues Automation Server',
    sseClientsCount: require('./utils/sse').getClientsCount(),
    timestamp: new Date().toISOString()
  });
});

// Production Static Frontend Hosting
const clientBuildPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
  console.log(`📦 Enterprise Production Mode: Serving bundled client from ${clientBuildPath}`);
}

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS policy violation')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Payload size limit exceeded (max 1MB).' });
  }
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Start Server & Initialize Database
async function startServer() {
  try {
    await ensureReady();
    await seedDatabase();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(` IT No-Dues System API Server Running on Port ${PORT}`);
      console.log(` Base URL: http://localhost:${PORT}/api (Accepts LAN IP requests)`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(`=======================================================`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`   Please close the process holding Port ${PORT} or terminate process holding Port ${PORT}.`);
      } else {
        console.error('Server error:', error);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { seedDatabase } = require('./seed/seedData');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

const fs = require('fs');

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve API Routes
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

// Production Static Frontend Hosting (Single-Command Deployment)
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

// Start Server & Initialize Database
async function startServer() {
  try {
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

startServer();

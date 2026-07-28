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

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve API Routes
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'Information Technology Department No-Dues Automation Server',
    timestamp: new Date().toISOString()
  });
});

// Start Server & Initialize Database
async function startServer() {
  try {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` IT No-Dues System API Server Running on Port ${PORT}`);
      console.log(` Base URL: http://localhost:${PORT}/api`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

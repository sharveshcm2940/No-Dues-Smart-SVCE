const { query, getOne, mysqlPool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`SVCE ERP: Checking MySQL database status (Environment: ${process.env.NODE_ENV || 'development'})...`);

  try {
    // 1. Check if core tables exist in the active MySQL database
    const userTable = await getOne(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );

    if (!userTable) {
      if (isProduction) {
        throw new Error(
          'FATAL: Database tables do not exist in production. Automated seeding of demo accounts is forbidden in production. Please run production migrations.'
        );
      }

      console.log('SVCE ERP: Initializing MySQL database schema from mysql_schema.sql (Non-production)...');
      const schemaPath = path.resolve(__dirname, '../../mysql_schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sqlContent = fs.readFileSync(schemaPath, 'utf8');
        await mysqlPool.query(sqlContent);
        console.log('SVCE ERP: Successfully created all MySQL tables and initial records from schema script.');
      } else {
        console.warn('SVCE ERP: mysql_schema.sql not found at', schemaPath);
      }
    } else {
      console.log('SVCE ERP: Core MySQL schema detected and verified. ✅');
    }

    // 2. In production, strictly enforce that no demo accounts exist
    if (isProduction) {
      const demoUsers = await query(
        "SELECT username FROM users WHERE username IN ('IT2024001', 'IT2024002', 'IT2025001', 'EMP-HOD-IT-01', 'EMP-DPC-IT-01') AND password LIKE '$2a$%'"
      );
      if (demoUsers.length > 0) {
        console.warn(`⚠️ PRODUCTION SECURITY WARNING: Detected ${demoUsers.length} demo seed accounts in production database.`);
      }
    }

    // 3. Automatically execute pending database migrations
    const { runMigrations } = require('../scripts/migrate');
    await runMigrations('up');

    // 4. Synchronize workflow percentages across all clearance requests
    const { syncAllRequestsProgress } = require('../utils/workflowHelper');
    await syncAllRequestsProgress();

    console.log('SVCE ERP: MySQL database is fully initialized and operational. ✅');
  } catch (error) {
    console.error('SVCE ERP: Database initialization error:', error.message);
    throw error;
  }
}

module.exports = { seedDatabase };

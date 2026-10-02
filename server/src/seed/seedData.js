const { query, getOne, mysqlPool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  console.log('SVCE ERP: Checking MySQL database status...');

  try {
    // 1. Check if core tables exist in the active MySQL database
    const userTable = await getOne(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );

    if (!userTable) {
      console.log('SVCE ERP: Initializing MySQL database schema from mysql_schema.sql...');
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

    // 2. Synchronize workflow percentages across all clearance requests
    const { syncAllRequestsProgress } = require('../utils/workflowHelper');
    await syncAllRequestsProgress();

    console.log('SVCE ERP: MySQL database is fully initialized and operational. ✅');
  } catch (error) {
    console.error('SVCE ERP: Database initialization error:', error.message);
    throw error;
  }
}

module.exports = { seedDatabase };

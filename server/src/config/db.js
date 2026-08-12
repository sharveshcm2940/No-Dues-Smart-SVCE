const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'no_dues_erp';

let pool = null;

// Helper to sanitize SQLite specific SQL syntax to MySQL compatible syntax
function sanitizeSql(sql) {
  if (!sql) return sql;
  return sql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/PRAGMA foreign_keys = ON;/gi, 'SET FOREIGN_KEY_CHECKS = 1;')
    .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO')
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO');
}

/**
 * Initializes MySQL pool with auto-retry and ensures target database exists
 */
async function initDbPool() {
  if (pool) return pool;

  let retries = 5;
  while (retries > 0) {
    try {
      // First connect without specifying database to create database if not exists
      const tempConnection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD
      });

      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await tempConnection.end();

      // Now create pool connected to DB_NAME
      pool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        multipleStatements: true
      });

      console.log(`Connected to MySQL database '${DB_NAME}' at ${DB_HOST}:${DB_PORT}`);
      return pool;

    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error(`❌ Unable to connect to MySQL database (${DB_HOST}:${DB_PORT}) after 5 attempts:`, err.message);
        throw err;
      }
      console.log(`⏳ MySQL connection attempt failed (${err.message}). Retrying in 2 seconds... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Lazy initialization wrapper
async function getPool() {
  if (!pool) {
    await initDbPool();
  }
  return pool;
}

/**
 * Executes a parameterized MySQL query
 * @param {string} sql - SQL query string
 * @param {Array} params - Array of positional parameters
 */
const query = async (sql, params = []) => {
  const activePool = await getPool();
  const cleanSql = sanitizeSql(sql);

  const [results] = await activePool.query(cleanSql, params);

  // Normalize insertId / affectedRows to match sqlite's lastID / changes for backward compatibility
  if (results && typeof results === 'object' && !Array.isArray(results)) {
    results.lastID = results.insertId || results.lastID || 0;
    results.changes = results.affectedRows || results.changes || 0;
  }

  return results;
};

/**
 * Fetches a single row result
 * @param {string} sql 
 * @param {Array} params 
 */
const getOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0];
  }
  return null;
};

/**
 * Executes queries within a single MySQL transaction
 * @param {Function} callback - Async function receiving connection object
 */
const transaction = async (callback) => {
  const activePool = await getPool();
  const connection = await activePool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback({
      query: async (sql, params = []) => {
        const cleanSql = sanitizeSql(sql);
        const [res] = await connection.query(cleanSql, params);
        if (res && typeof res === 'object' && !Array.isArray(res)) {
          res.lastID = res.insertId || res.lastID || 0;
          res.changes = res.affectedRows || res.changes || 0;
        }
        return res;
      },
      getOne: async (sql, params = []) => {
        const cleanSql = sanitizeSql(sql);
        const [rows] = await connection.query(cleanSql, params);
        return rows && rows.length > 0 ? rows[0] : null;
      }
    });
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    console.error('MySQL Transaction Failed - Rolled Back:', err.message);
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  initDbPool,
  getPool,
  query,
  getOne,
  transaction
};

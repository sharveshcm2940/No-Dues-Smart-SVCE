const mysql = require('mysql2/promise');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'svce_nodues',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true,
  multipleStatements: true
};

let mysqlPool = null;
let isReadyPromise = null;
let spawnedMysqldProcess = null;

function isPortOpen(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host === 'localhost' ? '127.0.0.1' : host);
  });
}

function findMysqldBinary() {
  const candidates = [
    'C:\\mysql\\bin\\mysqld.exe',
    process.env.MYSQL_HOME ? path.join(process.env.MYSQL_HOME, 'bin', 'mysqld.exe') : null,
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe',
    'C:\\xampp\\mysql\\bin\\mysqld.exe'
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

async function autoStartMySQLIfLocal() {
  const isLocal = config.host === 'localhost' || config.host === '127.0.0.1';
  if (!isLocal) return;

  const portOpen = await isPortOpen(config.host, config.port);
  if (portOpen) {
    return; // Already running
  }

  const mysqldPath = findMysqldBinary();
  if (!mysqldPath) {
    return; // Binary not found, will fail with informative message
  }

  const basedir = path.dirname(path.dirname(mysqldPath));
  console.log(`🔄 MySQL Server is not currently running on port ${config.port}.`);
  console.log(`🚀 Automatically launching MySQL Server from: ${mysqldPath}...`);

  spawnedMysqldProcess = spawn(mysqldPath, ['--console'], {
    cwd: basedir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  spawnedMysqldProcess.stdout.on('data', () => {});
  spawnedMysqldProcess.stderr.on('data', () => {});

  const cleanup = () => {
    if (spawnedMysqldProcess && !spawnedMysqldProcess.killed) {
      try {
        spawnedMysqldProcess.kill();
      } catch (e) {}
    }
  };

  process.once('exit', cleanup);
  process.once('SIGINT', () => { cleanup(); process.exit(0); });
  process.once('SIGTERM', () => { cleanup(); process.exit(0); });

  // Poll port until MySQL is listening (up to 20 seconds)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const ready = await isPortOpen(config.host, config.port);
    if (ready) {
      console.log(`✅ MySQL Server successfully launched and ready on port ${config.port}!`);
      return;
    }
  }
}

async function ensureReady() {
  if (isReadyPromise) return isReadyPromise;

  isReadyPromise = (async () => {
    // Auto-start MySQL if needed
    try {
      await autoStartMySQLIfLocal();
    } catch (startErr) {
      console.warn(`⚠️ MySQL auto-start attempt note: ${startErr.message}`);
    }

    // 1. Ensure target database exists
    try {
      const adminConn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        multipleStatements: true
      });
      await adminConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await adminConn.end();
    } catch (err) {
      console.warn(`⚠️ MySQL admin pre-check: ${err.message}`);
    }

    // 2. Initialize connection pool
    try {
      mysqlPool = mysql.createPool(config);
      const conn = await mysqlPool.getConnection();
      console.log(`✅ Connected to MySQL database: ${config.database}@${config.host}:${config.port}`);
      conn.release();
      return 'mysql';
    } catch (err) {
      console.error(`❌ FATAL: Cannot connect to MySQL server (${config.host}:${config.port}/${config.database}): ${err.message}`);
      console.error(`   Please ensure MySQL Server 8.0+ is running (e.g., C:\\mysql\\start_mysql.bat or MySQL service).`);
      throw err;
    }
  })();

  return isReadyPromise;
}

const query = async (sql, params = []) => {
  await ensureReady();

  // Automatic query sanitation for universal compatibility
  const sanitizedSql = sql
    .replace(/datetime\('now',\s*'localtime'\)/gi, 'NOW()')
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO');

  try {
    const [results] = await mysqlPool.query(sanitizedSql, params);

    if (Array.isArray(results)) {
      return results;
    }

    return {
      lastID: results.insertId,
      insertId: results.insertId,
      changes: results.affectedRows,
      affectedRows: results.affectedRows
    };
  } catch (err) {
    console.error('MySQL Query Error:', err.message, '\nSQL:', sanitizedSql);
    throw err;
  }
};

const getOne = async (sql, params = []) => {
  await ensureReady();
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
};

module.exports = {
  mysqlPool,
  getPool: () => mysqlPool,
  ensureReady,
  getEngine: () => 'mysql',
  query,
  getOne
};

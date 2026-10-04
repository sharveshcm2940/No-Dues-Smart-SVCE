/**
 * SVCE Smart No-Dues ERP - Database & Uploads Disaster Recovery Restore Script
 * 
 * Features:
 * 1. Locates latest or user-specified encrypted backup file (.enc)
 * 2. Authenticates HMAC-SHA256 and decrypts using AES-256-CBC
 * 3. Decompresses package payload with gzip
 * 4. Restores MySQL database via mysql CLI
 * 5. Reconstructs uploads directory files
 * 6. Executes cryptographic audit chain verification & table count diagnostics
 * 
 * Usage:
 *   node server/src/scripts/restore.js [--file /path/to/backup.enc] [--passphrase <key>]
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { verifyAuditChain } = require('../utils/auditChain');
const { query, ensureReady } = require('../config/db');

const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '../../backups');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads');
const ENCRYPTION_PASSPHRASE = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'svce_nodues_secure_disaster_recovery_key_2026';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'svce_nodues';

function findExecutable(name) {
  const isWin = process.platform === 'win32';
  const binName = isWin ? `${name}.exe` : name;

  if (isWin) {
    const candidates = [
      `C:\\mysql\\bin\\${binName}`,
      process.env.MYSQL_HOME ? path.join(process.env.MYSQL_HOME, 'bin', binName) : null,
      `C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\${binName}`,
      `C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\${binName}`,
      `C:\\xampp\\mysql\\bin\\${binName}`
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  try {
    const checkCmd = isWin ? `where ${binName}` : `which ${binName}`;
    const found = execSync(checkCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (found) return found.split('\n')[0].trim();
  } catch (e) {
    // Ignore
  }

  return binName;
}

/**
 * Decrypts a buffer encrypted by backup.js
 */
function decryptBuffer(encryptedBuffer, passphrase) {
  const magic = encryptedBuffer.subarray(0, 4).toString('utf8');
  if (magic !== 'SVCE') {
    throw new Error('Invalid backup file format: SVCE magic header missing.');
  }

  const salt = encryptedBuffer.subarray(4, 20);
  const iv = encryptedBuffer.subarray(20, 36);
  const authTag = encryptedBuffer.subarray(36, 68);
  const ciphertext = encryptedBuffer.subarray(68);

  // Authenticate HMAC
  const hmacKey = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512');
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(salt);
  hmac.update(iv);
  hmac.update(ciphertext);
  const expectedAuthTag = hmac.digest();

  if (!crypto.timingSafeEqual(authTag, expectedAuthTag)) {
    throw new Error('Integrity verification failed: HMAC authentication tag mismatch (corrupted data or wrong passphrase).');
  }

  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Feeds SQL string into mysql CLI
 */
function runMysqlRestore(sqlString) {
  return new Promise((resolve, reject) => {
    const mysqlBin = findExecutable('mysql');
    console.log(`📌 Using mysql binary: ${mysqlBin}`);

    const args = [
      `--host=${DB_HOST}`,
      `--port=${DB_PORT}`,
      `--user=${DB_USER}`,
      '--default-character-set=utf8mb4'
    ];

    if (DB_PASSWORD) {
      args.push(`--password=${DB_PASSWORD}`);
    }

    args.push(DB_NAME);

    const child = spawn(mysqlBin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const errChunks = [];

    child.stderr.on('data', (d) => errChunks.push(d));

    child.on('close', (code) => {
      if (code !== 0) {
        const errMsg = Buffer.concat(errChunks).toString('utf8');
        return reject(new Error(`mysql restore failed with code ${code}: ${errMsg}`));
      }
      resolve();
    });

    child.on('error', reject);

    child.stdin.write(sqlString);
    child.stdin.end();
  });
}

/**
 * Restores files into uploads directory
 */
function restoreUploadsArchive(archiveBuffer, targetDir) {
  if (!archiveBuffer || archiveBuffer.length === 0) return 0;

  const delimiter = Buffer.from('||--END-MANIFEST--||', 'utf8');
  const idx = archiveBuffer.indexOf(delimiter);
  if (idx === -1) return 0;

  const manifestStr = archiveBuffer.subarray(0, idx).toString('utf8');
  const manifest = JSON.parse(manifestStr);
  let cursor = idx + delimiter.length;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let fileCount = 0;
  for (const item of manifest) {
    const fileData = archiveBuffer.subarray(cursor, cursor + item.size);
    cursor += item.size;
    const destPath = path.join(targetDir, item.rel);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destPath, fileData);
    fileCount++;
  }

  return fileCount;
}

function findLatestBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`Backup directory does not exist: ${BACKUP_DIR}`);
  }

  const entries = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.enc'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (entries.length === 0) {
    throw new Error(`No encrypted backup files (.enc) found in ${BACKUP_DIR}`);
  }

  return path.join(BACKUP_DIR, entries[0].name);
}

async function performRestore(specificFile = null, customPassphrase = null) {
  const targetFile = specificFile || findLatestBackup();
  const passphrase = customPassphrase || ENCRYPTION_PASSPHRASE;

  console.log(`=======================================================`);
  console.log(`  SVCE Smart No-Dues ERP - Disaster Recovery Restore   `);
  console.log(`=======================================================`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`📦 Backup File: ${targetFile}`);
  console.log(`🗄️  Target DB:   ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

  // 1. Read encrypted file
  console.log(`\n⏳ Step 1/5: Loading encrypted archive...`);
  const encryptedData = fs.readFileSync(targetFile);
  console.log(`   ✅ Encrypted size: ${(encryptedData.length / 1024 / 1024).toFixed(2)} MB`);

  // 2. Decrypt
  console.log(`⏳ Step 2/5: Authenticating HMAC and decrypting AES-256-CBC...`);
  const compressedData = decryptBuffer(encryptedData, passphrase);
  console.log(`   ✅ Decrypted payload successfully validated.`);

  // 3. Decompress
  console.log(`⏳ Step 3/5: Decompressing gzip payload...`);
  const jsonStr = zlib.gunzipSync(compressedData).toString('utf8');
  const payload = JSON.parse(jsonStr);
  console.log(`   ✅ Archive Metadata:`, payload.metadata);

  // 4. Restore Database
  console.log(`⏳ Step 4/5: Restoring database schema and records into ${DB_NAME}...`);
  await ensureReady();
  const sqlDump = Buffer.from(payload.sqlDump, 'base64').toString('utf8');
  await runMysqlRestore(sqlDump);
  console.log(`   ✅ MySQL database restoration complete.`);

  // 5. Restore Uploads
  console.log(`⏳ Step 5/5: Restoring uploads directory...`);
  let restoredUploadsCount = 0;
  if (payload.uploadsArchive) {
    const uploadsBuffer = Buffer.from(payload.uploadsArchive, 'base64');
    restoredUploadsCount = restoreUploadsArchive(uploadsBuffer, UPLOADS_DIR);
  }
  console.log(`   ✅ Restored ${restoredUploadsCount} uploaded documents to ${UPLOADS_DIR}`);

  // Post-restore verification
  console.log(`\n🔍 Performing Post-Restore Verification Drill...`);
  const [usersCount] = await query('SELECT count(*) as count FROM users');
  const [requestsCount] = await query('SELECT count(*) as count FROM nodues_requests');
  const [systemLogsCount] = await query('SELECT count(*) as count FROM system_audit_logs');
  const [noduesLogsCount] = await query('SELECT count(*) as count FROM nodues_audit_logs');

  console.log(`   📊 Users Table:        ${usersCount.count} records`);
  console.log(`   📊 Requests Table:     ${requestsCount.count} records`);
  console.log(`   📊 System Audit Logs:  ${systemLogsCount.count} records`);
  console.log(`   📊 NoDues Audit Logs:  ${noduesLogsCount.count} records`);

  const auditCheck = await verifyAuditChain();
  console.log(`   🔐 Cryptographic Chain Integrity: ${auditCheck.valid ? 'PASSED ✅' : 'FAILED 🚨'}`);

  if (!auditCheck.valid) {
    throw new Error(`Restored database failed cryptographic audit chain verification: ${JSON.stringify(auditCheck)}`);
  }

  console.log(`\n🎉 Disaster recovery restore completed successfully! System is fully operational.`);
  return {
    success: true,
    restoredFile: path.basename(targetFile),
    usersCount: usersCount.count,
    requestsCount: requestsCount.count,
    auditValid: auditCheck.valid
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let fileArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      fileArg = args[i + 1];
    }
  }

  performRestore(fileArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Restore failed:', err);
      process.exit(1);
    });
}

module.exports = { performRestore, decryptBuffer };

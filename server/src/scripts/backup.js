/**
 * SVCE Smart No-Dues ERP - Encrypted Database & Uploads Backup Utility
 * 
 * Features:
 * 1. Executes mysqldump with atomic transaction flags (--single-transaction --quick --routines --triggers)
 * 2. Compresses database dump and uploads directory
 * 3. Encrypts archive using AES-256-CBC with PBKDF2 key derivation and HMAC authentication
 * 4. Enforces automated retention pruning (default 30 days)
 * 5. Generates cryptographic checksum metadata
 * 
 * Usage:
 *   node server/src/scripts/backup.js [--retention 30] [--out-dir /path/to/backups]
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { ensureReady } = require('../config/db');

const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '../../backups');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const ENCRYPTION_PASSPHRASE = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'svce_nodues_secure_disaster_recovery_key_2026';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'svce_nodues';

function findExecutable(name) {
  const isWin = process.platform === 'win32';
  const binName = isWin ? `${name}.exe` : name;

  // Check candidate paths on Windows
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

  // Check PATH
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
 * Encrypts a buffer using AES-256-CBC + HMAC-SHA256
 */
function encryptBuffer(buffer, passphrase) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  // Compute HMAC over salt + iv + ciphertext
  const hmacKey = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512');
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(salt);
  hmac.update(iv);
  hmac.update(encrypted);
  const authTag = hmac.digest();

  // File structure: MAGIC(4) + SALT(16) + IV(16) + HMAC(32) + CIPHERTEXT
  const magic = Buffer.from('SVCE', 'utf8');
  return Buffer.concat([magic, salt, iv, authTag, encrypted]);
}

/**
 * Runs mysqldump and returns raw SQL string
 */
function runMysqldump() {
  return new Promise((resolve, reject) => {
    const mysqldumpBin = findExecutable('mysqldump');
    console.log(`📌 Using mysqldump binary: ${mysqldumpBin}`);

    const args = [
      `--host=${DB_HOST}`,
      `--port=${DB_PORT}`,
      `--user=${DB_USER}`,
      '--single-transaction',
      '--quick',
      '--routines',
      '--triggers',
      '--default-character-set=utf8mb4'
    ];

    if (DB_PASSWORD) {
      args.push(`--password=${DB_PASSWORD}`);
    }

    args.push(DB_NAME);

    const child = spawn(mysqldumpBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    const errChunks = [];

    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => errChunks.push(d));

    child.on('close', (code) => {
      if (code !== 0) {
        const errMsg = Buffer.concat(errChunks).toString('utf8');
        return reject(new Error(`mysqldump failed with code ${code}: ${errMsg}`));
      }
      resolve(Buffer.concat(chunks));
    });

    child.on('error', reject);
  });
}

/**
 * Creates an in-memory tar-like archive for uploads directory
 */
function archiveUploads(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) {
    return Buffer.alloc(0);
  }

  const files = [];
  function scan(dir, relPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = path.join(relPath, ent.name);
      if (ent.isDirectory()) {
        scan(full, rel);
      } else if (ent.isFile()) {
        files.push({ rel, data: fs.readFileSync(full) });
      }
    }
  }
  scan(uploadsDir);

  const manifest = JSON.stringify(files.map(f => ({ rel: f.rel, size: f.data.length })));
  const buffers = [
    Buffer.from(manifest, 'utf8'),
    Buffer.from('||--END-MANIFEST--||', 'utf8')
  ];

  for (const f of files) {
    buffers.push(f.data);
  }

  return Buffer.concat(buffers);
}

/**
 * Prunes backups older than RETENTION_DAYS
 */
function pruneBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const now = Date.now();
  const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const entries = fs.readdirSync(BACKUP_DIR);

  let prunedCount = 0;
  for (const ent of entries) {
    if (ent.endsWith('.enc') || ent.endsWith('.json')) {
      const full = path.join(BACKUP_DIR, ent);
      const stat = fs.statSync(full);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(full);
        prunedCount++;
      }
    }
  }
  if (prunedCount > 0) {
    console.log(`🧹 Pruned ${prunedCount} expired backup files (older than ${RETENTION_DAYS} days).`);
  }
}

async function performBackup() {
  console.log(`=======================================================`);
  console.log(`  SVCE Smart No-Dues ERP - Automated Backup Service    `);
  console.log(`=======================================================`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🗄️  Target DB: ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);
  console.log(`📂 Output Dir: ${BACKUP_DIR}`);

  await ensureReady();

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `svce_nodues_backup_${timestamp}`;

  // 1. Run mysqldump
  console.log(`\n⏳ Step 1/4: Dumping MySQL database (${DB_NAME})...`);
  const sqlDump = await runMysqldump();
  console.log(`   ✅ DB dump acquired: ${(sqlDump.length / 1024 / 1024).toFixed(2)} MB`);

  // 2. Archive uploads
  console.log(`⏳ Step 2/4: Archiving uploads directory (${UPLOADS_DIR})...`);
  const uploadsArchive = archiveUploads(UPLOADS_DIR);
  console.log(`   ✅ Uploads archive size: ${(uploadsArchive.length / 1024).toFixed(2)} KB`);

  // 3. Package and Compress
  console.log(`⏳ Step 3/4: Compressing payload with gzip...`);
  const packagePayload = JSON.stringify({
    metadata: {
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      host: DB_HOST,
      version: '3.1.0'
    },
    sqlDump: sqlDump.toString('base64'),
    uploadsArchive: uploadsArchive.toString('base64')
  });

  const compressed = zlib.gzipSync(Buffer.from(packagePayload, 'utf8'), { level: 9 });
  console.log(`   ✅ Compressed package size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);

  // 4. Encrypt package
  console.log(`⏳ Step 4/4: Encrypting with AES-256-CBC and PBKDF2...`);
  const encrypted = encryptBuffer(compressed, ENCRYPTION_PASSPHRASE);
  const outPath = path.join(BACKUP_DIR, `${baseName}.enc`);
  fs.writeFileSync(outPath, encrypted);

  // Generate SHA-256 checksum and metadata manifest
  const sha256Checksum = crypto.createHash('sha256').update(encrypted).digest('hex');
  const manifestPath = path.join(BACKUP_DIR, `${baseName}.meta.json`);
  const manifest = {
    backupFile: path.basename(outPath),
    createdAt: new Date().toISOString(),
    sha256: sha256Checksum,
    sizeBytes: encrypted.length,
    database: DB_NAME,
    encrypted: true,
    algorithm: 'AES-256-CBC + HMAC-SHA256'
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\n🎉 Backup successfully created and encrypted!`);
  console.log(`   📁 Encrypted File: ${outPath}`);
  console.log(`   🔒 SHA-256 Hash:   ${sha256Checksum}`);
  console.log(`   📄 Metadata:       ${manifestPath}`);

  // Prune old backups
  pruneBackups();

  return { outPath, manifestPath, manifest };
}

if (require.main === module) {
  performBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Backup execution failed:', err);
      process.exit(1);
    });
}

module.exports = { performBackup, encryptBuffer, BACKUP_DIR };

/**
 * SVCE Smart No-Dues ERP - Production Log Rotation Script
 * 
 * Inspects the server/logs directory, archives logs exceeding size or age thresholds,
 * compresses archived files with gzip, and prunes archives older than retention policy.
 * 
 * Usage:
 *   node server/src/scripts/rotate_logs.js [--max-age-days 14] [--max-size-mb 50]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LOGS_DIR = process.env.LOGS_DIR || path.resolve(__dirname, '../../logs');
const MAX_AGE_DAYS = parseInt(process.env.LOG_MAX_AGE_DAYS || '14', 10);
const MAX_SIZE_BYTES = parseInt(process.env.LOG_MAX_SIZE_MB || '50', 10) * 1024 * 1024;

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function rotateFile(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size < MAX_SIZE_BYTES && path.basename(filePath) !== 'app.log') {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const rotatedName = `${baseName}-${timestamp}${ext}.gz`;
  const rotatedPath = path.join(LOGS_DIR, rotatedName);

  console.log(`📦 Rotating log file: ${path.basename(filePath)} -> ${rotatedName} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  const fileContents = fs.readFileSync(filePath);
  const compressed = zlib.gzipSync(fileContents);
  fs.writeFileSync(rotatedPath, compressed);

  // Truncate the original file so open file handles continue writing
  fs.truncateSync(filePath, 0);
  console.log(`✅ Truncated active log: ${path.basename(filePath)}`);
}

function pruneOldArchives() {
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(LOGS_DIR);

  for (const file of files) {
    if (file.endsWith('.gz')) {
      const fullPath = path.join(LOGS_DIR, file);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > maxAgeMs) {
        console.log(`🗑️  Pruning expired log archive: ${file} (Age: ${((now - stat.mtimeMs) / (1000 * 60 * 60 * 24)).toFixed(1)} days)`);
        fs.unlinkSync(fullPath);
      }
    }
  }
}

function runRotation() {
  ensureLogsDir();
  console.log(`🔍 Checking log rotation for: ${LOGS_DIR}`);
  console.log(`   Config: Max Size = ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB, Retention = ${MAX_AGE_DAYS} days`);

  const files = fs.readdirSync(LOGS_DIR);
  for (const file of files) {
    const fullPath = path.join(LOGS_DIR, file);
    if (!file.endsWith('.gz') && fs.statSync(fullPath).isFile()) {
      rotateFile(fullPath);
    }
  }

  pruneOldArchives();
  console.log(`✨ Log rotation completed successfully.`);
}

if (require.main === module) {
  try {
    runRotation();
  } catch (err) {
    console.error('❌ Log rotation error:', err);
    process.exit(1);
  }
}

module.exports = { runRotation, ensureLogsDir, LOGS_DIR };

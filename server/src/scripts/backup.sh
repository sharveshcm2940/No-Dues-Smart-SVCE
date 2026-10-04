#!/usr/bin/env bash
# ==============================================================================
# SVCE Smart No-Dues ERP - Production Daily Backup Automation
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/app/uploads}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-svce_app}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-svce_nodues}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-svce_nodues_secure_disaster_recovery_key_2026}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/svce_nodues_${TIMESTAMP}.sql.gz"
ENC_FILE="${BACKUP_FILE}.enc"

echo "=== [$(date)] Starting Automated Backup for ${DB_NAME} ==="

# 1. Atomic mysqldump + gzip
echo "⏳ Running mysqldump..."
if [ -n "${DB_PASSWORD}" ]; then
  MYSQL_PWD="${DB_PASSWORD}" mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    --single-transaction --quick --routines --triggers --events "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
else
  mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    --single-transaction --quick --routines --triggers --events "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
fi

# 2. Encrypt with OpenSSL AES-256-CBC
echo "🔒 Encrypting dump with AES-256-CBC..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${BACKUP_FILE}" \
  -out "${ENC_FILE}" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

rm -f "${BACKUP_FILE}"

# 3. Archive Uploads
if [ -d "${UPLOADS_DIR}" ]; then
  echo "📁 Archiving uploads..."
  tar -czf "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" -C "${UPLOADS_DIR}" .
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" \
    -out "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz.enc" \
    -pass "pass:${BACKUP_ENCRYPTION_KEY}"
  rm -f "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
fi

# 4. Retention Pruning
echo "🧹 Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.enc" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "✅ Backup successfully created: ${ENC_FILE}"

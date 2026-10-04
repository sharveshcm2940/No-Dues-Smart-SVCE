#!/usr/bin/env bash
# ==============================================================================
# SVCE Smart No-Dues ERP - Disaster Recovery Restore Script (Linux)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/app/uploads}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-svce_app}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-svce_nodues}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-svce_nodues_secure_disaster_recovery_key_2026}"

TARGET_ENC="${1:-}"

if [ -z "${TARGET_ENC}" ]; then
  TARGET_ENC=$(find "${BACKUP_DIR}" -name "svce_nodues_*.sql.gz.enc" -type f | sort -r | head -n 1)
  if [ -z "${TARGET_ENC}" ]; then
    echo "❌ Error: No backup files found in ${BACKUP_DIR}"
    exit 1
  fi
fi

echo "=== Restoring Database from ${TARGET_ENC} ==="

DECRYPTED_GZ="/tmp/restore_temp.sql.gz"

echo "🔓 Decrypting backup..."
openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${TARGET_ENC}" \
  -out "${DECRYPTED_GZ}" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

echo "⏳ Restoring database into ${DB_NAME}..."
if [ -n "${DB_PASSWORD}" ]; then
  MYSQL_PWD="${DB_PASSWORD}" gunzip < "${DECRYPTED_GZ}" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}"
else
  gunzip < "${DECRYPTED_GZ}" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}"
fi

rm -f "${DECRYPTED_GZ}"
echo "✅ Database restoration complete!"

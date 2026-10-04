const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { purgeExpiredAuditLogs } = require('../controllers/consentController');
const { ensureReady } = require('../config/db');

async function main() {
  await ensureReady();
  const retentionDays = parseInt(process.argv[2] || process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);
  console.log(`🧹 Running DPDP Audit Log Retention Cleanup (Purging logs older than ${retentionDays} days)...`);

  const result = await purgeExpiredAuditLogs(retentionDays);
  console.log(`✅ Retention Job Finished: Purged ${result.deletedCount} expired audit logs.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error running audit log retention job:', err);
    process.exit(1);
  });
}

module.exports = { main };

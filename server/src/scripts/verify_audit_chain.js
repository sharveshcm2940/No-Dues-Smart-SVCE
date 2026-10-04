const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { verifyAuditChain } = require('../utils/auditChain');
const { ensureReady } = require('../config/db');

async function main() {
  await ensureReady();
  console.log('🔍 Initiating Cryptographic Audit Chain Verification...\n');

  console.log('--- Checking System Audit Logs (system_audit_logs) ---');
  const sysResult = await verifyAuditChain('system_audit_logs');
  if (sysResult.valid) {
    console.log(`✅ System Audit Chain INTACT. Verified ${sysResult.totalRecords} records.`);
  } else {
    console.error(`🚨 TAMPERING DETECTED in system_audit_logs at Row #${sysResult.tamperedRowId}!`);
    console.error(sysResult);
  }

  console.log('\n--- Checking No-Dues Clearance Audit Logs (nodues_audit_logs) ---');
  const noduesResult = await verifyAuditChain('nodues_audit_logs');
  if (noduesResult.valid) {
    console.log(`✅ No-Dues Audit Chain INTACT. Verified ${noduesResult.totalRecords} records.`);
  } else {
    console.error(`🚨 TAMPERING DETECTED in nodues_audit_logs at Row #${noduesResult.tamperedRowId}!`);
    console.error(noduesResult);
  }

  const allValid = sysResult.valid && noduesResult.valid;
  console.log(`\nOverall Integrity: ${allValid ? 'PASSED ✅' : 'FAILED 🚨'}`);
  process.exit(allValid ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error during chain verification:', err);
    process.exit(1);
  });
}

module.exports = { main };

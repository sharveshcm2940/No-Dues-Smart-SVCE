const bcrypt = require('bcryptjs');
const { query, getOne } = require('../config/db');

async function seedDemoCredentials() {
  console.log('Seeding / resetting institutional demo accounts with known credentials...');

  const DEFAULT_PASSWORD = 'Svce@2026!';
  const DEMO_MFA_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'; // Standard 32-character Base32 test secret (160 bits)
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Ensure 'admin' superuser account exists
  const existingAdmin = await getOne("SELECT id FROM users WHERE username = 'admin'");
  if (existingAdmin) {
    await query(
      `UPDATE users 
       SET password = ?, role = 'admin', email = 'admin@svce.ac.in', is_active = 1, must_change_password = 0, failed_login_attempts = 0, locked_until = NULL, mfa_enabled = 0, mfa_secret = NULL
       WHERE username = 'admin'`,
      [hash]
    );
    console.log('✅ Admin account updated: admin / Svce@2026!');
  } else {
    await query(
      `INSERT INTO users (username, email, password, role, is_active, must_change_password, failed_login_attempts, mfa_enabled, mfa_secret)
       VALUES ('admin', 'admin@svce.ac.in', ?, 'admin', 1, 0, 0, 0, NULL)`,
      [hash]
    );
    console.log('✅ Admin account created: admin / Svce@2026!');
  }

  // 2. Reset passwords for standard seeded departmental and student accounts
  const demoUsernames = [
    'EMP-HOD-IT-01',   // HOD
    'EMP-FIN-IT-01',   // Finance
    'EMP-DPC-IT-01',   // DPC
    'EMP-LIB-IT-01',   // Dept Library
    'EMP-MLIB-IT-01',  // Central Library
    'EMP-FA-IT-01',    // Faculty Advisor
    'EMP-FA-IT-02',    // Faculty Advisor
    'IT2024001',       // Student (Aadhityan K)
    'IT2024002',       // Student (Bhavani S)
    'IT2025001'        // Student (Abinaya)
  ];

  for (const username of demoUsernames) {
    await query(
      `UPDATE users 
       SET password = ?, is_active = 1, must_change_password = 0, failed_login_attempts = 0, locked_until = NULL,
           mfa_enabled = 0, mfa_secret = NULL
       WHERE username = ?`,
      [hash, username]
    );
  }

  console.log(`✅ Successfully updated ${demoUsernames.length} demo accounts to password: '${DEFAULT_PASSWORD}' (MFA disabled)`);
}

if (require.main === module) {
  seedDemoCredentials()
    .then(() => {
      console.log('Demo credentials ready! ✅');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding demo credentials:', err);
      process.exit(1);
    });
}

module.exports = { seedDemoCredentials };

/**
 * Generates self-signed TLS certificates for local or staging testing
 * Places fullchain.pem and privkey.pem into deploy/certs/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CERTS_DIR = path.resolve(__dirname, 'certs');

if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

const keyPath = path.join(CERTS_DIR, 'privkey.pem');
const certPath = path.join(CERTS_DIR, 'fullchain.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ TLS certificates already exist in deploy/certs/');
  process.exit(0);
}

console.log('🔑 Generating self-signed TLS certificate for testing...');
try {
  execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -subj "/CN=localhost/O=SVCE/OU=IT Department"`, {
    stdio: 'inherit'
  });
  console.log('✅ Generated self-signed certificates in deploy/certs/');
} catch (err) {
  console.warn('⚠️  openssl CLI not available in PATH. Please place fullchain.pem and privkey.pem in deploy/certs/ manually.');
}

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KNOWN_DEFAULT_SECRETS = new Set([
  'svce_college_nodues_enterprise_secret_key_2026',
  'svce_college_nodues_secure_jwt_token_key_2026_super_secret',
  'svce_nodues_secure_jwt_secret_2026',
  'secret',
  'password',
  'your_jwt_secret_min_32_bytes_random_hex',
  'your_refresh_token_secret_min_32_bytes_random_hex',
  'your_certificate_hmac_key_min_32_bytes_random_hex',
  '12345678901234567890123456789012'
]);

function validateEnv() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const PORT = parseInt(process.env.PORT || '5000', 10);
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
  const DB_USER = process.env.DB_USER;
  const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const DB_NAME = process.env.DB_NAME || 'svce_nodues';

  const JWT_SECRET = process.env.JWT_SECRET;
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
  const CERT_HMAC_KEY = process.env.CERT_HMAC_KEY || JWT_SECRET;
  const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

  // 1. JWT_SECRET Validation
  if (!JWT_SECRET) {
    throw new Error('FATAL CONFIG ERROR: JWT_SECRET environment variable is missing.');
  }

  if (Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
    throw new Error(`FATAL CONFIG ERROR: JWT_SECRET is too short (${Buffer.byteLength(JWT_SECRET, 'utf8')} bytes). Must be at least 32 bytes (256 bits).`);
  }

  if (KNOWN_DEFAULT_SECRETS.has(JWT_SECRET.trim())) {
    throw new Error('FATAL CONFIG ERROR: JWT_SECRET matches a known insecure default or leaked repository key. Set a unique, cryptographically random secret.');
  }

  // 2. REFRESH_TOKEN_SECRET Validation
  if (Buffer.byteLength(REFRESH_TOKEN_SECRET, 'utf8') < 32) {
    throw new Error('FATAL CONFIG ERROR: REFRESH_TOKEN_SECRET must be at least 32 bytes.');
  }

  // 3. CERT_HMAC_KEY Validation
  if (Buffer.byteLength(CERT_HMAC_KEY, 'utf8') < 32) {
    throw new Error('FATAL CONFIG ERROR: CERT_HMAC_KEY must be at least 32 bytes.');
  }

  // 4. Database Credentials Validation
  if (!DB_USER) {
    throw new Error('FATAL CONFIG ERROR: DB_USER environment variable is missing.');
  }

  if (NODE_ENV === 'production') {
    if (DB_USER.toLowerCase() === 'root') {
      throw new Error("FATAL CONFIG ERROR: Running as MySQL 'root' is forbidden in production. Configure a dedicated least-privilege user.");
    }
    if (!DB_PASSWORD || DB_PASSWORD === 'password123') {
      throw new Error("FATAL CONFIG ERROR: DB_PASSWORD cannot be empty or 'password123' in production.");
    }
  } else {
    if (DB_USER.toLowerCase() === 'root' || !DB_PASSWORD) {
      console.warn("⚠️  SECURITY NOTICE [DEV MODE]: MySQL is connecting as 'root' or with empty password. In production, this will fail fast.");
    }
  }

  // 5. CORS Origins
  const rawCors = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000';
  const CORS_ORIGINS = rawCors.split(',').map(s => s.trim()).filter(Boolean);

  return {
    NODE_ENV,
    PORT,
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    JWT_SECRET,
    REFRESH_TOKEN_SECRET,
    CERT_HMAC_KEY,
    PUBLIC_BASE_URL,
    CORS_ORIGINS,
    SMTP: {
      HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
      PORT: parseInt(process.env.SMTP_PORT || '587', 10),
      SECURE: process.env.SMTP_SECURE === 'true',
      USER: process.env.SMTP_USER || '',
      PASS: process.env.SMTP_PASS || '',
      FROM: process.env.EMAIL_FROM || '"SVCE No-Dues ERP" <no-reply@svce.ac.in>'
    }
  };
}

let config;
try {
  config = validateEnv();
} catch (err) {
  console.error('\n=======================================================');
  console.error('❌ CONFIGURATION VALIDATION FAILED AT STARTUP');
  console.error(err.message);
  console.error('=======================================================\n');
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
  // In test environment, throw error so unit tests can catch it
  config = { validateEnv };
}

config.validateEnv = validateEnv;

module.exports = config;

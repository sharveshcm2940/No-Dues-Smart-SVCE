const { validateEnv } = require('../src/config/env');

describe('Security Task 1: Credentials and Configuration Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should throw if JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).toThrow(/JWT_SECRET environment variable is missing/i);
  });

  test('should throw if JWT_SECRET is shorter than 32 bytes (256 bits)', () => {
    process.env.JWT_SECRET = 'short_secret_under_32_bytes';
    expect(() => validateEnv()).toThrow(/JWT_SECRET is too short/i);
  });

  test('should throw if JWT_SECRET matches known insecure default or leaked keys', () => {
    process.env.JWT_SECRET = 'svce_college_nodues_enterprise_secret_key_2026';
    expect(() => validateEnv()).toThrow(/matches a known insecure default or leaked repository key/i);

    process.env.JWT_SECRET = 'svce_college_nodues_secure_jwt_token_key_2026_super_secret';
    expect(() => validateEnv()).toThrow(/matches a known insecure default or leaked repository key/i);
  });

  test('should throw if DB_USER is missing', () => {
    delete process.env.DB_USER;
    expect(() => validateEnv()).toThrow(/DB_USER environment variable is missing/i);
  });

  test('should throw if DB_USER is root in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = 'strong_production_password_xyz';
    process.env.JWT_SECRET = '0123456789012345678901234567890123456789012345678901234567890123';
    process.env.REFRESH_TOKEN_SECRET = '0123456789012345678901234567890123456789012345678901234567890124';
    process.env.CERT_HMAC_KEY = '0123456789012345678901234567890123456789012345678901234567890125';

    expect(() => validateEnv()).toThrow(/Running as MySQL 'root' is forbidden in production/i);
  });

  test('should throw if DB_PASSWORD is default "password123" in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_USER = 'svce_app';
    process.env.DB_PASSWORD = 'password123';
    process.env.JWT_SECRET = '0123456789012345678901234567890123456789012345678901234567890123';
    process.env.REFRESH_TOKEN_SECRET = '0123456789012345678901234567890123456789012345678901234567890124';
    process.env.CERT_HMAC_KEY = '0123456789012345678901234567890123456789012345678901234567890125';

    expect(() => validateEnv()).toThrow(/DB_PASSWORD cannot be empty or 'password123' in production/i);
  });

  test('should succeed validation with valid 32+ byte secrets and credentials', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_USER = 'svce_app';
    process.env.DB_PASSWORD = 'SuperSecureProductionPassword2026!';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(32);
    process.env.CERT_HMAC_KEY = 'c'.repeat(32);

    const config = validateEnv();
    expect(config.DB_USER).toBe('svce_app');
    expect(config.JWT_SECRET).toBe('a'.repeat(32));
  });
});

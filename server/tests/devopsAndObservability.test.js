const request = require('supertest');
const app = require('../src/server');
const { encryptBuffer, performBackup, BACKUP_DIR } = require('../src/scripts/backup');
const { decryptBuffer } = require('../src/scripts/restore');
const { runRotation, ensureLogsDir, LOGS_DIR } = require('../src/scripts/rotate_logs');
const { getClientsCount, getUserActiveStreamsCount, handleSSEConnection } = require('../src/utils/sse');
const { logger } = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

describe('Phase 6: DevOps, Observability, Backup & Hardening Tests', () => {

  describe('1. Observability Endpoints (/health & /ready)', () => {
    test('GET /health returns healthy liveness probe with uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.service).toBe('svce-nodues-backend');
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(typeof res.body.sseClientsCount).toBe('number');
      expect(res.headers['x-request-id']).toBeDefined();
    });

    test('GET /ready returns deep readiness probe with database and storage status', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database.status).toBe('UP');
      expect(res.body.checks.database.pool).toBeDefined();
      expect(res.body.checks.storage.status).toBe('UP');
      expect(res.body.checks.sse.status).toBe('UP');
    });

    test('X-Request-ID header is propagated or auto-generated for every request', async () => {
      const customId = 'client-req-uuid-test-12345';
      const res = await request(app).get('/health').set('X-Request-ID', customId);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('2. Backup Encryption & Decryption Cryptographic Verification', () => {
    test('encryptBuffer and decryptBuffer round-trip with HMAC-SHA256 authentication', () => {
      const secretPassphrase = 'test_disaster_recovery_passphrase_32_bytes!';
      const originalPayload = Buffer.from('SVCE No-Dues Sample Database Content and Records', 'utf8');

      const encrypted = encryptBuffer(originalPayload, secretPassphrase);
      expect(encrypted.subarray(0, 4).toString('utf8')).toBe('SVCE');

      const decrypted = decryptBuffer(encrypted, secretPassphrase);
      expect(decrypted.toString('utf8')).toBe(originalPayload.toString('utf8'));
    });

    test('decryptBuffer rejects tampered ciphertext with HMAC authentication failure', () => {
      const secretPassphrase = 'test_disaster_recovery_passphrase_32_bytes!';
      const originalPayload = Buffer.from('Critical Secret Records', 'utf8');

      const encrypted = encryptBuffer(originalPayload, secretPassphrase);
      // Corrupt a byte in ciphertext
      encrypted[encrypted.length - 1] ^= 0xFF;

      expect(() => {
        decryptBuffer(encrypted, secretPassphrase);
      }).toThrow(/Integrity verification failed/);
    });

    test('decryptBuffer rejects incorrect passphrase', () => {
      const originalPayload = Buffer.from('Confidential Data', 'utf8');
      const encrypted = encryptBuffer(originalPayload, 'correct_passphrase_12345');

      expect(() => {
        decryptBuffer(encrypted, 'wrong_passphrase_99999');
      }).toThrow(/Integrity verification failed/);
    });
  });

  describe('3. Automated Log Rotation Utility', () => {
    test('runRotation creates logs directory and processes log files without crashing', () => {
      ensureLogsDir();
      expect(fs.existsSync(LOGS_DIR)).toBe(true);

      const testLogPath = path.join(LOGS_DIR, 'test_rotation.log');
      fs.writeFileSync(testLogPath, 'sample log entry\n');

      expect(() => {
        runRotation();
      }).not.toThrow();

      if (fs.existsSync(testLogPath)) {
        fs.unlinkSync(testLogPath);
      }
    });
  });

  describe('4. Centralized Production Error Handler Sanitization', () => {
    test('Centralized error handler returns uniform JSON with Request ID', async () => {
      // Trigger a 404/handled route
      const res = await request(app).get('/api/non-existent-probe-route-test');
      expect(res.status).toBe(404);
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });
});

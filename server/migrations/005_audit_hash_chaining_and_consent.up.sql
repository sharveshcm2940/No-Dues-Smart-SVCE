-- Migration 005 UP: DPDP Act 2023 Consent Records & Append-Only Audit Hash Chaining

-- 1. Create consent records table for DPDP Act 2023 compliance
CREATE TABLE IF NOT EXISTS consent_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  policy_version VARCHAR(50) NOT NULL,
  status ENUM('Granted', 'Revoked') NOT NULL DEFAULT 'Granted',
  ip_address VARCHAR(100) NULL,
  user_agent TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consent_user (user_id),
  INDEX idx_consent_purpose (purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add cryptographic hash chaining columns to nodues_audit_logs
ALTER TABLE nodues_audit_logs
  ADD COLUMN previous_hash VARCHAR(64) NULL AFTER attachment_url,
  ADD COLUMN entry_hash VARCHAR(64) NULL AFTER previous_hash;

-- 3. Add cryptographic hash chaining columns to system_audit_logs
ALTER TABLE system_audit_logs
  ADD COLUMN previous_hash VARCHAR(64) NULL AFTER ip_address,
  ADD COLUMN entry_hash VARCHAR(64) NULL AFTER previous_hash;

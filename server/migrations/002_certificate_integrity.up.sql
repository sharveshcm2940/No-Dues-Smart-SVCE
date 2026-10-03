-- =========================================================================
-- Migration 002 UP: Certificate Cryptographic Integrity & Public Verification
-- =========================================================================

ALTER TABLE `nodues_requests`
  ADD COLUMN `certificate_token` VARCHAR(64) UNIQUE NULL,
  ADD COLUMN `certificate_hmac` VARCHAR(64) NULL,
  ADD COLUMN `certificate_version` INT NOT NULL DEFAULT 1,
  ADD COLUMN `certificate_status` ENUM('Valid', 'Revoked') NOT NULL DEFAULT 'Valid',
  ADD COLUMN `revocation_reason` TEXT NULL,
  ADD COLUMN `revoked_by` VARCHAR(100) NULL,
  ADD COLUMN `revoked_at` DATETIME NULL;

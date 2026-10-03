-- =========================================================================
-- Migration 002 DOWN: Rollback Certificate Cryptographic Integrity
-- =========================================================================

ALTER TABLE `nodues_requests`
  DROP COLUMN `certificate_token`,
  DROP COLUMN `certificate_hmac`,
  DROP COLUMN `certificate_version`,
  DROP COLUMN `certificate_status`,
  DROP COLUMN `revocation_reason`,
  DROP COLUMN `revoked_by`,
  DROP COLUMN `revoked_at`;

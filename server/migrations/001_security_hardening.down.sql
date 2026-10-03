-- =========================================================================
-- Migration 001 DOWN: Rollback Security Hardening
-- =========================================================================

DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `refresh_tokens`;

ALTER TABLE `users`
  DROP COLUMN `must_change_password`,
  DROP COLUMN `failed_login_attempts`,
  DROP COLUMN `locked_until`,
  DROP COLUMN `mfa_secret`,
  DROP COLUMN `mfa_enabled`;

-- =========================================================================
-- Migration 001 UP: Security Hardening & Authentication Controls
-- =========================================================================

-- 1. Extend users table with password policy, lockout, and MFA fields
ALTER TABLE `users`
  ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `failed_login_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `locked_until` DATETIME NULL,
  ADD COLUMN `mfa_secret` VARCHAR(255) NULL,
  ADD COLUMN `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 0;

-- 2. Create refresh_tokens table for rotating, revocable JWT refresh tokens
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(100),
  `user_agent` VARCHAR(255),
  INDEX `idx_rf_token_hash` (`token_hash`),
  INDEX `idx_rf_user_id` (`user_id`),
  CONSTRAINT `fk_rf_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create password_resets table for single-use, 15-minute reset tokens
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pwd_reset_hash` (`token_hash`),
  INDEX `idx_pwd_reset_user` (`user_id`),
  CONSTRAINT `fk_pwd_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

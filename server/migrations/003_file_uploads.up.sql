-- =========================================================================
-- Migration 003 UP: Secure File Uploads & Access Audit Logs
-- =========================================================================

CREATE TABLE IF NOT EXISTS `uploaded_files` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `file_id` VARCHAR(64) UNIQUE NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_filename` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `owner_user_id` INT NOT NULL,
  `request_id` INT NULL,
  `malware_status` VARCHAR(50) DEFAULT 'Clean',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_uf_file_id` (`file_id`),
  INDEX `idx_uf_owner` (`owner_user_id`),
  INDEX `idx_uf_request` (`request_id`),
  CONSTRAINT `fk_uf_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `file_access_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `file_id` VARCHAR(64) NOT NULL,
  `user_id` INT NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `ip_address` VARCHAR(100),
  `user_agent` VARCHAR(255),
  `accessed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fal_file` (`file_id`),
  INDEX `idx_fal_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

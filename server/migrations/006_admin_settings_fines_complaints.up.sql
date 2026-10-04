-- Migration 006 UP: Admin Role, System Settings, Configurable Fines, Stage Reopening, and Complaint Desk

-- 1. Update users table: extend role ENUM to include 'admin', add 'is_active' column
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('student','library_staff','faculty_advisor','hod','dpc','finance','main_library_staff','admin') NOT NULL,
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `must_change_password`;

-- 2. Create system_settings table for fine policies and general ERP configuration
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) UNIQUE NOT NULL,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_by` VARCHAR(100) NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default fine calculation and ERP settings if not already present
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `updated_by`) VALUES
  ('fine_rate_per_day', '5.00', 'Overdue fine rate per day in Rupees (₹)', 'System Seed'),
  ('fine_grace_days', '0', 'Grace period days before overdue fines start accruing', 'System Seed'),
  ('fine_cap_amount', '500.00', 'Maximum fine cap per overdue book in Rupees (₹)', 'System Seed'),
  ('payment_gateway_mode', 'mock', 'Active payment gateway mode (mock / production)', 'System Seed'),
  ('allow_student_self_registration', '0', 'Allow new students to self-register accounts', 'System Seed')
ON DUPLICATE KEY UPDATE `updated_at` = NOW();

-- 3. Extend borrow_records for receipt number, payment metadata and officer mark-as-paid
ALTER TABLE `borrow_records`
  ADD COLUMN `receipt_number` VARCHAR(100) NULL AFTER `fine_status`,
  ADD COLUMN `paid_at` DATETIME NULL AFTER `receipt_number`,
  ADD COLUMN `paid_by` VARCHAR(150) NULL AFTER `paid_at`,
  ADD COLUMN `payment_method` VARCHAR(50) NULL AFTER `paid_by`,
  ADD COLUMN `payment_reference` VARCHAR(100) NULL AFTER `payment_method`,
  ADD INDEX `idx_borrow_receipt` (`receipt_number`);

-- 4. Extend complaints table for routing, assignee, and resolution timestamps
ALTER TABLE `complaints`
  ADD COLUMN `department` VARCHAR(100) NULL AFTER `category`,
  ADD COLUMN `assigned_to_user_id` INT NULL AFTER `assigned_to`,
  ADD COLUMN `assigned_to_role` VARCHAR(50) NULL AFTER `assigned_to_user_id`,
  ADD COLUMN `resolved_at` DATETIME NULL AFTER `updated_at`,
  ADD INDEX `idx_complaints_dept` (`department`),
  ADD INDEX `idx_complaints_assigned` (`assigned_to_user_id`);

-- 5. Create complaint_status_history table for auditing ticket lifecycle transitions
CREATE TABLE IF NOT EXISTS `complaint_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `old_status` VARCHAR(50) NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `changed_by_user_id` INT NULL,
  `changed_by_name` VARCHAR(150) NOT NULL,
  `changed_by_role` VARCHAR(50) NOT NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_csh_complaint` (`complaint_id`),
  CONSTRAINT `fk_csh_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

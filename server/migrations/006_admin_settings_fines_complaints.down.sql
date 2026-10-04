-- Migration 006 DOWN: Rollback Admin, Settings, Fine Payments and Complaints History

DROP TABLE IF EXISTS `complaint_status_history`;

ALTER TABLE `complaints`
  DROP INDEX `idx_complaints_assigned`,
  DROP INDEX `idx_complaints_dept`,
  DROP COLUMN `resolved_at`,
  DROP COLUMN `assigned_to_role`,
  DROP COLUMN `assigned_to_user_id`,
  DROP COLUMN `department`;

ALTER TABLE `borrow_records`
  DROP INDEX `idx_borrow_receipt`,
  DROP COLUMN `payment_reference`,
  DROP COLUMN `payment_method`,
  DROP COLUMN `paid_by`,
  DROP COLUMN `paid_at`,
  DROP COLUMN `receipt_number`;

DROP TABLE IF EXISTS `system_settings`;

ALTER TABLE `users`
  DROP COLUMN `is_active`,
  MODIFY COLUMN `role` ENUM('student','library_staff','faculty_advisor','hod','dpc','finance','main_library_staff') NOT NULL;

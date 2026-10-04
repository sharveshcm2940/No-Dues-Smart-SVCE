-- =========================================================================
-- SVCE SMART NO-DUES ERP - MYSQL WORKBENCH DATABASE SCRIPT
-- Sri Venkateswara College of Engineering
-- Generated on: 2026-10-02T02:31:09.970Z
-- Compatible with: MySQL Workbench 8.0+, MySQL 8.0+, MariaDB 10.4+
-- =========================================================================

CREATE DATABASE IF NOT EXISTS `svce_nodues` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `svce_nodues`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student','library_staff','faculty_advisor','hod','dpc','finance','main_library_staff') NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: students
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `register_number` VARCHAR(100) UNIQUE NOT NULL,
  `id_card_number` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `photo_url` TEXT,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `programme` VARCHAR(100) DEFAULT 'B.Tech IT',
  `batch` VARCHAR(50) DEFAULT '2022-2026',
  `year` VARCHAR(50) DEFAULT 'IV Year',
  `semester` VARCHAR(50) DEFAULT 'Semester VII',
  `section` VARCHAR(20) DEFAULT 'Sec-A',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `advisor_name` VARCHAR(150) NOT NULL,
  `advisor_emp_id` VARCHAR(100) NOT NULL,
  `advisor_email` VARCHAR(150) NOT NULL,
  `advisor_phone` VARCHAR(50) NOT NULL,
  `hall_ticket_status` VARCHAR(50) DEFAULT 'Not Issued',
  `hall_ticket_issued_by` VARCHAR(150),
  `hall_ticket_issued_by_emp_id` VARCHAR(100),
  `hall_ticket_issued_at` DATETIME,
  `hall_ticket_remarks` TEXT,
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: library_staff
DROP TABLE IF EXISTS `library_staff`;
CREATE TABLE `library_staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `employee_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `designation` VARCHAR(150) DEFAULT 'Library In-Charge',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  CONSTRAINT `fk_lib_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: main_library_profile
DROP TABLE IF EXISTS `main_library_profile`;
CREATE TABLE `main_library_profile` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `employee_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Central Library',
  `designation` VARCHAR(150) DEFAULT 'Main Library Officer',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  CONSTRAINT `fk_mlib_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: finance_profile
DROP TABLE IF EXISTS `finance_profile`;
CREATE TABLE `finance_profile` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `employee_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Finance and Accounts Section',
  `designation` VARCHAR(150) DEFAULT 'Finance Clearance Officer',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  CONSTRAINT `fk_fin_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: faculty_advisors
DROP TABLE IF EXISTS `faculty_advisors`;
CREATE TABLE `faculty_advisors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `employee_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `designation` VARCHAR(150) DEFAULT 'Assistant Professor & Faculty Advisor',
  `assigned_batch` VARCHAR(100) DEFAULT '2023-2027 (III Year IT)',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  CONSTRAINT `fk_fa_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: hod_profile
DROP TABLE IF EXISTS `hod_profile`;
CREATE TABLE `hod_profile` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `employee_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `designation` VARCHAR(150) DEFAULT 'Professor & Head of Department',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  CONSTRAINT `fk_hod_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: dpc_profile
DROP TABLE IF EXISTS `dpc_profile`;
CREATE TABLE `dpc_profile` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `employee_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `designation` VARCHAR(150) DEFAULT 'Department Placement Coordinator (DPC)',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  CONSTRAINT `fk_dpc_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: books
DROP TABLE IF EXISTS `books`;
CREATE TABLE `books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `book_id` VARCHAR(100) UNIQUE NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(200) NOT NULL,
  `publisher` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `edition` VARCHAR(50) NOT NULL,
  `isbn` VARCHAR(100) UNIQUE NOT NULL,
  `shelf_number` VARCHAR(50) NOT NULL,
  `total_copies` INT DEFAULT 1,
  `available_copies` INT DEFAULT 1,
  `issued_copies` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table: borrow_records
DROP TABLE IF EXISTS `borrow_records`;
CREATE TABLE `borrow_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `register_number` VARCHAR(100) NOT NULL,
  `book_id` VARCHAR(100) NOT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `return_date` DATE,
  `fine_amount` DECIMAL(10,2) DEFAULT 0.00,
  `status` VARCHAR(50) DEFAULT 'Issued',
  `fine_status` VARCHAR(50) DEFAULT 'None',
  `remarks` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Table: nodues_requests
DROP TABLE IF EXISTS `nodues_requests`;
CREATE TABLE `nodues_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_number` VARCHAR(100) UNIQUE NOT NULL,
  `register_number` VARCHAR(100) NOT NULL,
  `student_name` VARCHAR(200) NOT NULL,
  `id_card_number` VARCHAR(100) NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `year` VARCHAR(50) NOT NULL,
  `request_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `overall_status` VARCHAR(50) DEFAULT 'In Progress',
  `progress_percentage` INT DEFAULT 16,
  `current_stage` VARCHAR(100) DEFAULT 'Department Library',
  `certificate_number` VARCHAR(100),
  `completion_date` DATETIME,
  `career_option` ENUM('Placements','Higher Studies','Competitive Exams','Entrepreneurship'),
  `company_name` VARCHAR(200), `job_designation` VARCHAR(150), `ctc_package` VARCHAR(100), `offer_letter_url` TEXT,
  `higher_college_name` VARCHAR(200), `higher_degree` VARCHAR(100), `higher_app_form_url` TEXT, `higher_scorecard_url` TEXT, `higher_letter_url` TEXT, `higher_contact` VARCHAR(150),
  `exam_name` VARCHAR(100), `exam_reg_no` VARCHAR(100), `admit_card_url` TEXT, `exam_letter_url` TEXT, `exam_details` TEXT,
  `startup_name` VARCHAR(200), `business_idea` TEXT, `business_details` TEXT, `pitch_deck_url` TEXT,
  `resubmission_count` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Table: nodues_stages
DROP TABLE IF EXISTS `nodues_stages`;
CREATE TABLE `nodues_stages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_id` INT NOT NULL,
  `department_name` VARCHAR(100) NOT NULL,
  `stage_order` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `updated_at` DATETIME,
  `approved_by` VARCHAR(150),
  `remarks` TEXT,
  CONSTRAINT `fk_stage_request` FOREIGN KEY (`request_id`) REFERENCES `nodues_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Table: nodues_audit_logs
DROP TABLE IF EXISTS `nodues_audit_logs`;
CREATE TABLE `nodues_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_id` INT NOT NULL,
  `department_name` VARCHAR(100) NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_role` VARCHAR(100) NOT NULL,
  `status_after` VARCHAR(50) NOT NULL,
  `remarks` TEXT,
  `student_comment` TEXT,
  `attachment_url` TEXT,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_request` FOREIGN KEY (`request_id`) REFERENCES `nodues_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Table: system_audit_logs (All Dashboards with Device Name, Device Type, Location)
DROP TABLE IF EXISTS `system_audit_logs`;
CREATE TABLE `system_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `username` VARCHAR(100) NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT,
  `module` VARCHAR(100) NOT NULL,
  `device_name` VARCHAR(255) NOT NULL,
  `device_type` VARCHAR(50) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(100) DEFAULT '127.0.0.1',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_user` (`username`),
  INDEX `idx_audit_device` (`device_type`),
  INDEX `idx_audit_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Table: complaints
DROP TABLE IF EXISTS `complaints`;
CREATE TABLE `complaints` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` VARCHAR(100) UNIQUE NOT NULL,
  `register_number` VARCHAR(100) NOT NULL,
  `student_name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `attachment_url` TEXT,
  `priority` VARCHAR(50) DEFAULT 'Medium',
  `status` VARCHAR(50) DEFAULT 'Open',
  `reply` TEXT,
  `assigned_to` VARCHAR(150),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Table: announcements
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `college_name` VARCHAR(255) DEFAULT 'Sri Venkateswara College of Engineering',
  `department` VARCHAR(100) DEFAULT 'Information Technology',
  `category` VARCHAR(100) DEFAULT 'Library',
  `priority` VARCHAR(50) DEFAULT 'Medium',
  `attachment_url` TEXT,
  `is_pinned` TINYINT(1) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Published',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Table: notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `target_user` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Table: hall_ticket_audit_logs
DROP TABLE IF EXISTS `hall_ticket_audit_logs`;
CREATE TABLE `hall_ticket_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_register_number` VARCHAR(100) NOT NULL,
  `student_name` VARCHAR(200) NOT NULL,
  `previous_status` VARCHAR(50) NOT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `updated_by_name` VARCHAR(150) NOT NULL,
  `updated_by_emp_id` VARCHAR(100) NOT NULL,
  `remarks` TEXT,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Table: library_metrics
DROP TABLE IF EXISTS `library_metrics`;
CREATE TABLE `library_metrics` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `total_books` INT DEFAULT 0,
  `available_books` INT DEFAULT 0,
  `borrowed_books` INT DEFAULT 0,
  `pending_returns` INT DEFAULT 0,
  `is_custom` TINYINT(1) DEFAULT 0,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- DATA DUMP SECTION (INSERT STATEMENTS)
-- =========================================================================

-- Data for table `users` (110 rows)
INSERT INTO `users` (`id`, `username`, `password`, `role`, `email`, `created_at`) VALUES
  (1, 'EMP-HOD-IT-01', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'hod', 'vidhya.v@svce.ac.in', '2026-07-31 17:59:12'),
  (2, 'EMP-DPC-IT-01', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'dpc', 'dpc.it@svce.ac.in', '2026-07-31 17:59:12'),
  (3, 'EMP-LIB-IT-01', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'library_staff', 'sivakumar.e@svce.ac.in', '2026-07-31 17:59:12'),
  (4, 'EMP-MLIB-IT-01', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'main_library_staff', 'mohan.kumar@svce.ac.in', '2026-07-31 17:59:12'),
  (5, 'EMP-FIN-IT-01', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'finance', 'gurusamy.m@svce.ac.in', '2026-07-31 17:59:12'),
  (6, 'EMP-FA-IT-01', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'faculty_advisor', 'praveenkumar.v@svce.ac.in', '2026-07-31 17:59:12'),
  (7, 'EMP-FA-IT-02', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'faculty_advisor', 'selvaganesh.n@svce.ac.in', '2026-07-31 17:59:12'),
  (8, 'EMP-FA-IT-03', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'faculty_advisor', 'ranjith.v@svce.ac.in', '2026-07-31 17:59:12'),
  (9, 'EMP-FA-IT-04', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'faculty_advisor', 'kavishree.s@svce.ac.in', '2026-07-31 17:59:12'),
  (10, 'IT2024001', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'aadhityank@svce.ac.in', '2026-07-31 17:59:12'),
  (11, 'IT2024002', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'bhavanis@svce.ac.in', '2026-07-31 17:59:12'),
  (12, 'IT2024003', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'chandramoulir@svce.ac.in', '2026-07-31 17:59:12'),
  (13, 'IT2024004', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'dineshkarthik@svce.ac.in', '2026-07-31 17:59:12'),
  (14, 'IT2025001', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'abinaya@svce.ac.in', '2026-07-31 17:59:13'),
  (15, 'IT2025002', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'akshaya@svce.ac.in', '2026-07-31 17:59:13'),
  (16, 'IT2025003', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'anuradha@svce.ac.in', '2026-07-31 17:59:13'),
  (17, 'IT2025004', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'aravindpl@svce.ac.in', '2026-07-31 17:59:13'),
  (18, 'IT2025005', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'archanab@svce.ac.in', '2026-07-31 17:59:13'),
  (19, 'IT2025006', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'balamuruganvt@svce.ac.in', '2026-07-31 17:59:13'),
  (20, 'IT2025007', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'balamurugank@svce.ac.in', '2026-07-31 17:59:13'),
  (21, 'IT2025008', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'bhavana@svce.ac.in', '2026-07-31 17:59:13'),
  (22, 'IT2025009', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'harishankarcp@svce.ac.in', '2026-07-31 17:59:13'),
  (23, 'IT2025010', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'dkishankumar@svce.ac.in', '2026-07-31 17:59:13'),
  (24, 'IT2025011', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'deepikak@svce.ac.in', '2026-07-31 17:59:13'),
  (25, 'IT2025012', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'dharshinim@svce.ac.in', '2026-07-31 17:59:13'),
  (26, 'IT2025013', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'divyashreem@svce.ac.in', '2026-07-31 17:59:13'),
  (27, 'IT2025014', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'ezhumalair@svce.ac.in', '2026-07-31 17:59:13'),
  (28, 'IT2025015', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'gayathiri@svce.ac.in', '2026-07-31 17:59:13'),
  (29, 'IT2025016', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'geethak@svce.ac.in', '2026-07-31 17:59:13'),
  (30, 'IT2025017', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'giridharan@svce.ac.in', '2026-07-31 17:59:13'),
  (31, 'IT2025018', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'gowsan@svce.ac.in', '2026-07-31 17:59:13'),
  (32, 'IT2025019', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'gunapriyasuresh@svce.ac.in', '2026-07-31 17:59:13'),
  (33, 'IT2025020', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'hansikaas@svce.ac.in', '2026-07-31 17:59:13'),
  (34, 'IT2025021', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'hariharanms@svce.ac.in', '2026-07-31 17:59:13'),
  (35, 'IT2025022', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'harinis@svce.ac.in', '2026-07-31 17:59:13'),
  (36, 'IT2025023', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'harirambharathwajmurali@svce.ac.in', '2026-07-31 17:59:13'),
  (37, 'IT2025024', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'harishk@svce.ac.in', '2026-07-31 17:59:13'),
  (38, 'IT2025301', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'srinivasan@svce.ac.in', '2026-07-31 17:59:13'),
  (39, 'IT2025025', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'harshul@svce.ac.in', '2026-07-31 17:59:13'),
  (40, 'IT2025026', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'hayakreevan@svce.ac.in', '2026-07-31 17:59:13'),
  (41, 'IT2025027', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'hemeshs@svce.ac.in', '2026-07-31 17:59:13'),
  (42, 'IT2025028', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'irfanaleethajudeen@svce.ac.in', '2026-07-31 17:59:13'),
  (43, 'IT2025029', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'ishal@svce.ac.in', '2026-07-31 17:59:13'),
  (44, 'IT2025030', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'janapriyans@svce.ac.in', '2026-07-31 17:59:13'),
  (45, 'IT2025031', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'jaswanth@svce.ac.in', '2026-07-31 17:59:13'),
  (46, 'IT2025032', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'jeeval@svce.ac.in', '2026-07-31 17:59:13'),
  (47, 'IT2025033', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'jeevithadinakaran@svce.ac.in', '2026-07-31 17:59:13'),
  (48, 'IT2025034', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'kamaleshrv@svce.ac.in', '2026-07-31 17:59:13'),
  (49, 'IT2025035', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'kanishs@svce.ac.in', '2026-07-31 17:59:13'),
  (50, 'IT2025036', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'kavivarthiniv@svce.ac.in', '2026-07-31 17:59:13');

INSERT INTO `users` (`id`, `username`, `password`, `role`, `email`, `created_at`) VALUES
  (51, 'IT2025037', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'keerthanam@svce.ac.in', '2026-07-31 17:59:13'),
  (52, 'IT2025038', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'kirthikasrirs@svce.ac.in', '2026-07-31 17:59:13'),
  (53, 'IT2025039', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'laavanyar@svce.ac.in', '2026-07-31 17:59:13'),
  (54, 'IT2025040', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'lavanyak@svce.ac.in', '2026-07-31 17:59:13'),
  (55, 'IT2025041', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'liginjm@svce.ac.in', '2026-07-31 17:59:13'),
  (56, 'IT2025042', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'lisshanth@svce.ac.in', '2026-07-31 17:59:13'),
  (57, 'IT2025043', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'logeshd@svce.ac.in', '2026-07-31 17:59:13'),
  (58, 'IT2025044', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mhpooja@svce.ac.in', '2026-07-31 17:59:13'),
  (59, 'IT2025045', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mhannahfelin@svce.ac.in', '2026-07-31 17:59:13'),
  (60, 'IT2025046', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'madhulekhaselshinir@svce.ac.in', '2026-07-31 17:59:13'),
  (61, 'IT2025047', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'madhumithas@svce.ac.in', '2026-07-31 17:59:13'),
  (62, 'IT2025048', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mangalas@svce.ac.in', '2026-07-31 17:59:13'),
  (63, 'IT2025302', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'venkateshu@svce.ac.in', '2026-07-31 17:59:13'),
  (64, 'IT2025049', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'merinaashika@svce.ac.in', '2026-07-31 17:59:13'),
  (65, 'IT2025050', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mithunc@svce.ac.in', '2026-07-31 17:59:13'),
  (66, 'IT2025051', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mohammedunais@svce.ac.in', '2026-07-31 17:59:13'),
  (67, 'IT2025052', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mohammedshafiq@svce.ac.in', '2026-07-31 17:59:13'),
  (68, 'IT2025053', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'mounesh@svce.ac.in', '2026-07-31 17:59:13'),
  (69, 'IT2025054', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'nasrinbanu@svce.ac.in', '2026-07-31 17:59:13'),
  (70, 'IT2025055', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'nathiyam@svce.ac.in', '2026-07-31 17:59:13'),
  (71, 'IT2025056', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'naveensg@svce.ac.in', '2026-07-31 17:59:13'),
  (72, 'IT2025057', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'naveenvelan@svce.ac.in', '2026-07-31 17:59:13'),
  (73, 'IT2025058', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'niranjan@svce.ac.in', '2026-07-31 17:59:13'),
  (74, 'IT2025059', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'niranjana@svce.ac.in', '2026-07-31 17:59:13'),
  (75, 'IT2025060', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'dhivyashri@svce.ac.in', '2026-07-31 17:59:13'),
  (76, 'IT2025061', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'parkavi@svce.ac.in', '2026-07-31 17:59:13'),
  (77, 'IT2025064', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'payalrajput@svce.ac.in', '2026-07-31 17:59:13'),
  (78, 'IT2025065', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'perarivalan@svce.ac.in', '2026-07-31 17:59:13'),
  (79, 'IT2025066', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'pitchappan@svce.ac.in', '2026-07-31 17:59:13'),
  (80, 'IT2025067', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'pranvimohan@svce.ac.in', '2026-07-31 17:59:13'),
  (81, 'IT2025068', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'preetharajam@svce.ac.in', '2026-07-31 17:59:13'),
  (82, 'IT2025069', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'premsr@svce.ac.in', '2026-07-31 17:59:13'),
  (83, 'IT2025070', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'saravanan@svce.ac.in', '2026-07-31 17:59:13'),
  (84, 'IT2025071', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'ragini@svce.ac.in', '2026-07-31 17:59:13'),
  (85, 'IT2025072', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'rajaguru@svce.ac.in', '2026-07-31 17:59:13'),
  (86, 'IT2025073', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'raviramanbumani@svce.ac.in', '2026-07-31 17:59:13'),
  (87, 'IT2025074', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'ritikas@svce.ac.in', '2026-07-31 17:59:13'),
  (88, 'IT2025075', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'rohinidevi@svce.ac.in', '2026-07-31 17:59:13'),
  (89, 'IT2025076', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sanjeevsriram@svce.ac.in', '2026-07-31 17:59:13'),
  (90, 'IT2025077', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'samiksha@svce.ac.in', '2026-07-31 17:59:13'),
  (91, 'IT2025078', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sandhiyag@svce.ac.in', '2026-07-31 17:59:13'),
  (92, 'IT2025079', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sandhiyap@svce.ac.in', '2026-07-31 17:59:13'),
  (93, 'IT2025080', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sanjay@svce.ac.in', '2026-07-31 17:59:13'),
  (94, 'IT2025081', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'saranyadevi@svce.ac.in', '2026-07-31 17:59:13'),
  (95, 'IT2025082', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sarveshvaran@svce.ac.in', '2026-07-31 17:59:13'),
  (96, 'IT2025083', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sashwanth@svce.ac.in', '2026-07-31 17:59:13'),
  (97, 'IT2025084', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sharveshcm@svce.ac.in', '2026-07-31 17:59:13'),
  (98, 'IT2025085', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'siddharthsanthoshkumar@svce.ac.in', '2026-07-31 17:59:13'),
  (99, 'IT2025086', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sivaprasath@svce.ac.in', '2026-07-31 17:59:13'),
  (100, 'IT2025087', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'srivarshini@svce.ac.in', '2026-07-31 17:59:13');

INSERT INTO `users` (`id`, `username`, `password`, `role`, `email`, `created_at`) VALUES
  (101, 'IT2025088', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'sruthilaya@svce.ac.in', '2026-07-31 17:59:13'),
  (102, 'IT2025089', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'surjithkumar@svce.ac.in', '2026-07-31 17:59:13'),
  (103, 'IT2025090', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'swetha@svce.ac.in', '2026-07-31 17:59:13'),
  (104, 'IT2025091', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'thamaraiselvi@svce.ac.in', '2026-07-31 17:59:13'),
  (105, 'IT2025092', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'tharun@svce.ac.in', '2026-07-31 17:59:13'),
  (106, 'IT2025093', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'thaufiqabdulkaadher@svce.ac.in', '2026-07-31 17:59:13'),
  (107, 'IT2025094', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'vaishnavi@svce.ac.in', '2026-07-31 17:59:13'),
  (108, 'IT2025096', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'varshanvchari@svce.ac.in', '2026-07-31 17:59:13'),
  (109, 'IT2025097', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'viveka@svce.ac.in', '2026-07-31 17:59:13'),
  (110, 'IT2025098', '$2a$10$qCRy6NGggfcy1cj1MekfO.XYAA583QcFCT2iIJRfU1v5iSmiOmVh2', 'student', 'yogikrishnan@svce.ac.in', '2026-07-31 17:59:13');

-- Data for table `students` (101 rows)
INSERT INTO `students` (`id`, `user_id`, `register_number`, `id_card_number`, `full_name`, `photo_url`, `college_name`, `department`, `programme`, `batch`, `year`, `semester`, `section`, `email`, `phone`, `advisor_name`, `advisor_emp_id`, `advisor_email`, `advisor_phone`, `hall_ticket_status`, `hall_ticket_issued_by`, `hall_ticket_issued_by_emp_id`, `hall_ticket_issued_at`, `hall_ticket_remarks`) VALUES
  (1, 10, 'IT2024001', 'SVCE-IT-101', 'Aadhityan K', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2022-2026', 'IV Year', 'Semester VII', 'Sec-A', 'aadhityank@svce.ac.in', '+91 98410 10112', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (2, 11, 'IT2024002', 'SVCE-IT-102', 'Bhavani S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2022-2026', 'IV Year', 'Semester VII', 'Sec-A', 'bhavanis@svce.ac.in', '+91 98410 10212', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', 'V Praveenkumar', 'EMP-FA-IT-01', '2026-08-10 17:27:26', NULL),
  (3, 12, 'IT2024003', 'SVCE-IT-103', 'Chandra Mouli R', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2022-2026', 'IV Year', 'Semester VII', 'Sec-B', 'chandramoulir@svce.ac.in', '+91 98410 10312', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (4, 13, 'IT2024004', 'SVCE-IT-104', 'Dinesh Karthik', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2022-2026', 'IV Year', 'Semester VII', 'Sec-B', 'dineshkarthik@svce.ac.in', '+91 98410 10412', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (5, 14, 'IT2025001', 'SVCE-IT-1', 'Abinaya', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'abinaya@svce.ac.in', '+91 98403 1456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (6, 15, 'IT2025002', 'SVCE-IT-2', 'Akshaya', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'akshaya@svce.ac.in', '+91 98403 2456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (7, 16, 'IT2025003', 'SVCE-IT-3', 'Anuradha', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'anuradha@svce.ac.in', '+91 98403 3456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (8, 17, 'IT2025004', 'SVCE-IT-4', 'Aravind PL', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'aravindpl@svce.ac.in', '+91 98403 4456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (9, 18, 'IT2025005', 'SVCE-IT-5', 'Archana B', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'archanab@svce.ac.in', '+91 98403 5456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (10, 19, 'IT2025006', 'SVCE-IT-6', 'BalaMurugan VT', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'balamuruganvt@svce.ac.in', '+91 98403 6456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (11, 20, 'IT2025007', 'SVCE-IT-7', 'BalaMurugan K', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'balamurugank@svce.ac.in', '+91 98403 7456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (12, 21, 'IT2025008', 'SVCE-IT-8', 'Bhavana', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'bhavana@svce.ac.in', '+91 98403 8456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (13, 22, 'IT2025009', 'SVCE-IT-9', 'Hari Shankar CP', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'harishankarcp@svce.ac.in', '+91 98403 9456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (14, 23, 'IT2025010', 'SVCE-IT-10', 'D Kishan Kumar', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'dkishankumar@svce.ac.in', '+91 98403 10456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (15, 24, 'IT2025011', 'SVCE-IT-11', 'Deepika K', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'deepikak@svce.ac.in', '+91 98403 11456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (16, 25, 'IT2025012', 'SVCE-IT-12', 'Dharshini M', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'dharshinim@svce.ac.in', '+91 98403 12456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (17, 26, 'IT2025013', 'SVCE-IT-13', 'Divya Shree M', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'divyashreem@svce.ac.in', '+91 98403 13456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (18, 27, 'IT2025014', 'SVCE-IT-14', 'Ezhumalai R', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'ezhumalair@svce.ac.in', '+91 98403 14456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (19, 28, 'IT2025015', 'SVCE-IT-15', 'Gayathiri', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'gayathiri@svce.ac.in', '+91 98403 15456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (20, 29, 'IT2025016', 'SVCE-IT-16', 'Geetha K', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'geethak@svce.ac.in', '+91 98403 16456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (21, 30, 'IT2025017', 'SVCE-IT-17', 'Giridharan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'giridharan@svce.ac.in', '+91 98403 17456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (22, 31, 'IT2025018', 'SVCE-IT-18', 'Gowsan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'gowsan@svce.ac.in', '+91 98403 18456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (23, 32, 'IT2025019', 'SVCE-IT-19', 'Gunapriya Suresh', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'gunapriyasuresh@svce.ac.in', '+91 98403 19456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (24, 33, 'IT2025020', 'SVCE-IT-20', 'Hansikaa S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'hansikaas@svce.ac.in', '+91 98403 20456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (25, 34, 'IT2025021', 'SVCE-IT-21', 'Hariharan MS', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'hariharanms@svce.ac.in', '+91 98403 21456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (26, 35, 'IT2025022', 'SVCE-IT-22', 'Harini S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'harinis@svce.ac.in', '+91 98403 22456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (27, 36, 'IT2025023', 'SVCE-IT-23', 'Hariram Bharathwaj Murali', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'harirambharathwajmurali@svce.ac.in', '+91 98403 23456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (28, 37, 'IT2025024', 'SVCE-IT-24', 'Harish K', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'harishk@svce.ac.in', '+91 98403 24456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (29, 38, 'IT2025301', 'SVCE-IT-301', 'Srinivasan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'srinivasan@svce.ac.in', '+91 98403 301456', 'V.Ranjith', 'EMP-FA-IT-03', 'ranjith.v@svce.ac.in', '+91 98403 33445', 'Not Issued', NULL, NULL, NULL, NULL),
  (30, 39, 'IT2025025', 'SVCE-IT-25', 'Harshul', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'harshul@svce.ac.in', '+91 98403 25456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (31, 40, 'IT2025026', 'SVCE-IT-26', 'Hayakreevan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'hayakreevan@svce.ac.in', '+91 98403 26456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (32, 41, 'IT2025027', 'SVCE-IT-27', 'Hemesh S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'hemeshs@svce.ac.in', '+91 98403 27456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (33, 42, 'IT2025028', 'SVCE-IT-28', 'Irfan Alee Thajudeen', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'irfanaleethajudeen@svce.ac.in', '+91 98403 28456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (34, 43, 'IT2025029', 'SVCE-IT-29', 'Isha L', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'ishal@svce.ac.in', '+91 98403 29456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (35, 44, 'IT2025030', 'SVCE-IT-30', 'Janapriyan S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'janapriyans@svce.ac.in', '+91 98403 30456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (36, 45, 'IT2025031', 'SVCE-IT-31', 'Jaswanth', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'jaswanth@svce.ac.in', '+91 98403 31456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (37, 46, 'IT2025032', 'SVCE-IT-32', 'Jeeva L', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'jeeval@svce.ac.in', '+91 98403 32456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (38, 47, 'IT2025033', 'SVCE-IT-33', 'Jeevitha Dinakaran', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'jeevithadinakaran@svce.ac.in', '+91 98403 33456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (39, 48, 'IT2025034', 'SVCE-IT-34', 'Kamalesh R V', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'kamaleshrv@svce.ac.in', '+91 98403 34456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (40, 49, 'IT2025035', 'SVCE-IT-35', 'Kanish S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'kanishs@svce.ac.in', '+91 98403 35456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (41, 50, 'IT2025036', 'SVCE-IT-36', 'Kavivarthini V', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'kavivarthiniv@svce.ac.in', '+91 98403 36456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (42, 51, 'IT2025037', 'SVCE-IT-37', 'Keerthana M', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'keerthanam@svce.ac.in', '+91 98403 37456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (43, 52, 'IT2025038', 'SVCE-IT-38', 'Kirthika Sri R S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'kirthikasrirs@svce.ac.in', '+91 98403 38456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (44, 53, 'IT2025039', 'SVCE-IT-39', 'Laavanya R', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'laavanyar@svce.ac.in', '+91 98403 39456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (45, 54, 'IT2025040', 'SVCE-IT-40', 'Lavanya K', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'lavanyak@svce.ac.in', '+91 98403 40456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (46, 55, 'IT2025041', 'SVCE-IT-41', 'Ligin J M', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'liginjm@svce.ac.in', '+91 98403 41456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (47, 56, 'IT2025042', 'SVCE-IT-42', 'Lisshanth', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'lisshanth@svce.ac.in', '+91 98403 42456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (48, 57, 'IT2025043', 'SVCE-IT-43', 'Logesh D', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'logeshd@svce.ac.in', '+91 98403 43456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (49, 58, 'IT2025044', 'SVCE-IT-44', 'M H Pooja', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'mhpooja@svce.ac.in', '+91 98403 44456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (50, 59, 'IT2025045', 'SVCE-IT-45', 'M Hannah Felin', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'mhannahfelin@svce.ac.in', '+91 98403 45456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL);

INSERT INTO `students` (`id`, `user_id`, `register_number`, `id_card_number`, `full_name`, `photo_url`, `college_name`, `department`, `programme`, `batch`, `year`, `semester`, `section`, `email`, `phone`, `advisor_name`, `advisor_emp_id`, `advisor_email`, `advisor_phone`, `hall_ticket_status`, `hall_ticket_issued_by`, `hall_ticket_issued_by_emp_id`, `hall_ticket_issued_at`, `hall_ticket_remarks`) VALUES
  (51, 60, 'IT2025046', 'SVCE-IT-46', 'Madhulekha Selshini R', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'madhulekhaselshinir@svce.ac.in', '+91 98403 46456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (52, 61, 'IT2025047', 'SVCE-IT-47', 'Madhumitha S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'madhumithas@svce.ac.in', '+91 98403 47456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (53, 62, 'IT2025048', 'SVCE-IT-48', 'Mangala S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'mangalas@svce.ac.in', '+91 98403 48456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (54, 63, 'IT2025302', 'SVCE-IT-302', 'Venkatesh U', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-A', 'venkateshu@svce.ac.in', '+91 98403 302456', 'S.Kavishree', 'EMP-FA-IT-04', 'kavishree.s@svce.ac.in', '+91 98404 44556', 'Not Issued', NULL, NULL, NULL, NULL),
  (55, 64, 'IT2025049', 'SVCE-IT-49', 'Merin Aashika', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'merinaashika@svce.ac.in', '+91 98403 49456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (56, 65, 'IT2025050', 'SVCE-IT-50', 'Mithun C', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'mithunc@svce.ac.in', '+91 98403 50456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (57, 66, 'IT2025051', 'SVCE-IT-51', 'Mohammed Unais', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'mohammedunais@svce.ac.in', '+91 98403 51456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (58, 67, 'IT2025052', 'SVCE-IT-52', 'Mohammed Shafiq', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'mohammedshafiq@svce.ac.in', '+91 98403 52456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (59, 68, 'IT2025053', 'SVCE-IT-53', 'Mounesh', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'mounesh@svce.ac.in', '+91 98403 53456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (60, 69, 'IT2025054', 'SVCE-IT-54', 'Nasrin Banu', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'nasrinbanu@svce.ac.in', '+91 98403 54456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (61, 70, 'IT2025055', 'SVCE-IT-55', 'Nathiya M', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'nathiyam@svce.ac.in', '+91 98403 55456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (62, 71, 'IT2025056', 'SVCE-IT-56', 'Naveen SG', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'naveensg@svce.ac.in', '+91 98403 56456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (63, 72, 'IT2025057', 'SVCE-IT-57', 'Naveen Velan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'naveenvelan@svce.ac.in', '+91 98403 57456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (64, 73, 'IT2025058', 'SVCE-IT-58', 'Niranjan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'niranjan@svce.ac.in', '+91 98403 58456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (65, 74, 'IT2025059', 'SVCE-IT-59', 'Niranjana', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'niranjana@svce.ac.in', '+91 98403 59456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (66, 75, 'IT2025060', 'SVCE-IT-60', 'Dhivya Shri', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'dhivyashri@svce.ac.in', '+91 98403 60456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (67, 76, 'IT2025061', 'SVCE-IT-61', 'Parkavi', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'parkavi@svce.ac.in', '+91 98403 61456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (68, 77, 'IT2025064', 'SVCE-IT-64', 'Payal Rajput', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'payalrajput@svce.ac.in', '+91 98403 64456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (69, 78, 'IT2025065', 'SVCE-IT-65', 'Perarivalan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'perarivalan@svce.ac.in', '+91 98403 65456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (70, 79, 'IT2025066', 'SVCE-IT-66', 'Pitchappan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'pitchappan@svce.ac.in', '+91 98403 66456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (71, 80, 'IT2025067', 'SVCE-IT-67', 'Pranvi Mohan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'pranvimohan@svce.ac.in', '+91 98403 67456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (72, 81, 'IT2025068', 'SVCE-IT-68', 'Preetha Rajam', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'preetharajam@svce.ac.in', '+91 98403 68456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (73, 82, 'IT2025069', 'SVCE-IT-69', 'Prem SR', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'premsr@svce.ac.in', '+91 98403 69456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (74, 83, 'IT2025070', 'SVCE-IT-70', 'Saravanan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'saravanan@svce.ac.in', '+91 98403 70456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (75, 84, 'IT2025071', 'SVCE-IT-71', 'Ragini', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'ragini@svce.ac.in', '+91 98403 71456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (76, 85, 'IT2025072', 'SVCE-IT-72', 'Rajaguru', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'rajaguru@svce.ac.in', '+91 98403 72456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (77, 86, 'IT2025073', 'SVCE-IT-73', 'Raviram Anbumani', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'raviramanbumani@svce.ac.in', '+91 98403 73456', 'N.Selvaganesh', 'EMP-FA-IT-02', 'selvaganesh.n@svce.ac.in', '+91 98402 22334', 'Not Issued', NULL, NULL, NULL, NULL),
  (78, 87, 'IT2025074', 'SVCE-IT-74', 'Ritika S', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'ritikas@svce.ac.in', '+91 98403 74456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (79, 88, 'IT2025075', 'SVCE-IT-75', 'Rohinidevi', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'rohinidevi@svce.ac.in', '+91 98403 75456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (80, 89, 'IT2025076', 'SVCE-IT-76', 'Sanjeev Sriram', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sanjeevsriram@svce.ac.in', '+91 98403 76456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (81, 90, 'IT2025077', 'SVCE-IT-77', 'Samiksha', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'samiksha@svce.ac.in', '+91 98403 77456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (82, 91, 'IT2025078', 'SVCE-IT-78', 'Sandhiya G', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sandhiyag@svce.ac.in', '+91 98403 78456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (83, 92, 'IT2025079', 'SVCE-IT-79', 'Sandhiya P', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sandhiyap@svce.ac.in', '+91 98403 79456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (84, 93, 'IT2025080', 'SVCE-IT-80', 'Sanjay', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sanjay@svce.ac.in', '+91 98403 80456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Issued', 'V Praveenkumar', 'EMP-FA-IT-01', '2026-08-10 17:27:49', NULL),
  (85, 94, 'IT2025081', 'SVCE-IT-81', 'Saranyadevi', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'saranyadevi@svce.ac.in', '+91 98403 81456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (86, 95, 'IT2025082', 'SVCE-IT-82', 'Sarveshvaran', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sarveshvaran@svce.ac.in', '+91 98403 82456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (87, 96, 'IT2025083', 'SVCE-IT-83', 'Sashwanth', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sashwanth@svce.ac.in', '+91 98403 83456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (88, 97, 'IT2025084', 'SVCE-IT-84', 'Sharvesh CM', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sharveshcm@svce.ac.in', '+91 98403 84456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (89, 98, 'IT2025085', 'SVCE-IT-85', 'Siddharth Santhosh kumar', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'siddharthsanthoshkumar@svce.ac.in', '+91 98403 85456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', 'V Praveenkumar', 'EMP-FA-IT-01', '2026-08-11 04:47:11', NULL),
  (90, 99, 'IT2025086', 'SVCE-IT-86', 'Sivaprasath', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sivaprasath@svce.ac.in', '+91 98403 86456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (91, 100, 'IT2025087', 'SVCE-IT-87', 'Srivarshini', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'srivarshini@svce.ac.in', '+91 98403 87456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (92, 101, 'IT2025088', 'SVCE-IT-88', 'Sruthilaya', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'sruthilaya@svce.ac.in', '+91 98403 88456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (93, 102, 'IT2025089', 'SVCE-IT-89', 'Surjithkumar', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'surjithkumar@svce.ac.in', '+91 98403 89456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (94, 103, 'IT2025090', 'SVCE-IT-90', 'Swetha', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'swetha@svce.ac.in', '+91 98403 90456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (95, 104, 'IT2025091', 'SVCE-IT-91', 'Thamaraiselvi', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'thamaraiselvi@svce.ac.in', '+91 98403 91456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (96, 105, 'IT2025092', 'SVCE-IT-92', 'Tharun', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'tharun@svce.ac.in', '+91 98403 92456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (97, 106, 'IT2025093', 'SVCE-IT-93', 'Thaufiq Abdul Kaadher', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'thaufiqabdulkaadher@svce.ac.in', '+91 98403 93456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (98, 107, 'IT2025094', 'SVCE-IT-94', 'Vaishnavi', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'vaishnavi@svce.ac.in', '+91 98403 94456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (99, 108, 'IT2025096', 'SVCE-IT-95', 'Varshan V Chari', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'varshanvchari@svce.ac.in', '+91 98403 95456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL),
  (100, 109, 'IT2025097', 'SVCE-IT-97', 'Vivek A', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'viveka@svce.ac.in', '+91 98403 97456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL);

INSERT INTO `students` (`id`, `user_id`, `register_number`, `id_card_number`, `full_name`, `photo_url`, `college_name`, `department`, `programme`, `batch`, `year`, `semester`, `section`, `email`, `phone`, `advisor_name`, `advisor_emp_id`, `advisor_email`, `advisor_phone`, `hall_ticket_status`, `hall_ticket_issued_by`, `hall_ticket_issued_by_emp_id`, `hall_ticket_issued_at`, `hall_ticket_remarks`) VALUES
  (101, 110, 'IT2025098', 'SVCE-IT-98', 'Yogi Krishnan', NULL, 'Sri Venkateswara College of Engineering', 'Information Technology', 'B.Tech IT', '2023-2027', 'III Year', 'Semester V', 'Sec-B', 'yogikrishnan@svce.ac.in', '+91 98403 98456', 'V Praveenkumar', 'EMP-FA-IT-01', 'praveenkumar.v@svce.ac.in', '+91 98401 11223', 'Not Issued', NULL, NULL, NULL, NULL);

-- Data for table `library_staff` (1 rows)
INSERT INTO `library_staff` (`id`, `user_id`, `employee_id`, `full_name`, `college_name`, `department`, `designation`, `email`, `phone`) VALUES
  (1, 3, 'EMP-LIB-IT-01', 'Sivakumar E', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Library In-Charge', 'sivakumar.e@svce.ac.in', '+91 94450 99887');

-- Data for table `main_library_profile` (1 rows)
INSERT INTO `main_library_profile` (`id`, `user_id`, `employee_id`, `full_name`, `college_name`, `department`, `designation`, `email`, `phone`) VALUES
  (1, 4, 'EMP-MLIB-IT-01', 'Mohan Kumar S', 'Sri Venkateswara College of Engineering', 'Central Library', 'Main Library Officer', 'mohan.kumar@svce.ac.in', '+91 94450 11224');

-- Data for table `finance_profile` (1 rows)
INSERT INTO `finance_profile` (`id`, `user_id`, `employee_id`, `full_name`, `college_name`, `department`, `designation`, `email`, `phone`) VALUES
  (1, 5, 'EMP-FIN-IT-01', 'Gurusamy M', 'Sri Venkateswara College of Engineering', 'Finance and Accounts Section', 'Finance Clearance Officer', 'gurusamy.m@svce.ac.in', '+91 94440 22336');

-- Data for table `faculty_advisors` (4 rows)
INSERT INTO `faculty_advisors` (`id`, `user_id`, `employee_id`, `full_name`, `college_name`, `department`, `designation`, `assigned_batch`, `email`, `phone`) VALUES
  (1, 6, 'EMP-FA-IT-01', 'V Praveenkumar', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Assistant Professor & Faculty Advisor', '2023-2027 (III Year IT-B)', 'praveenkumar.v@svce.ac.in', '+91 98401 11223'),
  (2, 7, 'EMP-FA-IT-02', 'N.Selvaganesh', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Assistant Professor & Faculty Advisor', '2023-2027 (III Year IT-B)', 'selvaganesh.n@svce.ac.in', '+91 98402 22334'),
  (3, 8, 'EMP-FA-IT-03', 'V.Ranjith', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Assistant Professor & Faculty Advisor', '2023-2027 (III Year IT-A)', 'ranjith.v@svce.ac.in', '+91 98403 33445'),
  (4, 9, 'EMP-FA-IT-04', 'S.Kavishree', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Assistant Professor & Faculty Advisor', '2023-2027 (III Year IT-A)', 'kavishree.s@svce.ac.in', '+91 98404 44556');

-- Data for table `hod_profile` (1 rows)
INSERT INTO `hod_profile` (`id`, `user_id`, `employee_id`, `full_name`, `college_name`, `department`, `designation`, `email`, `phone`) VALUES
  (1, 1, 'EMP-HOD-IT-01', 'Dr V Vidhya', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Professor & Head of Department', 'vidhya.v@svce.ac.in', '+91 94440 12345');

-- Data for table `dpc_profile` (1 rows)
INSERT INTO `dpc_profile` (`id`, `user_id`, `employee_id`, `full_name`, `college_name`, `department`, `designation`, `email`, `phone`) VALUES
  (1, 2, 'EMP-DPC-IT-01', 'Dr. R. Placement Coordinator', 'Sri Venkateswara College of Engineering', 'Information Technology', 'Department Placement Coordinator (DPC)', 'dpc.it@svce.ac.in', '+91 94455 11223');

-- Data for table `books` (5 rows)
INSERT INTO `books` (`id`, `book_id`, `title`, `author`, `publisher`, `category`, `edition`, `isbn`, `shelf_number`, `total_copies`, `available_copies`, `issued_copies`, `status`) VALUES
  (1, 'BK-IT-101', 'Operating System Concepts', 'Silberschatz, Galvin, Gagne', 'Wiley', 'Core IT', '10th Edition', '978-1118063330', 'Shelf-A2', 30, 24, 6, 'Available'),
  (2, 'BK-IT-102', 'Data Structures and Algorithm Analysis in C++', 'Mark Allen Weiss', 'Pearson', 'Data Structures', '4th Edition', '978-0132847377', 'Shelf-B1', 30, 26, 4, 'Available'),
  (3, 'BK-IT-103', 'Database System Concepts', 'Abraham Silberschatz', 'McGraw-Hill', 'Database Systems', '7th Edition', '978-0078022159', 'Shelf-C3', 25, 20, 5, 'Available'),
  (4, 'BK-IT-104', 'Computer Networking: A Top-Down Approach', 'Kurose & Ross', 'Pearson', 'Networks', '8th Edition', '978-0136681557', 'Shelf-D4', 30, 30, 0, 'Available'),
  (5, 'BK-IT-105', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Pearson', 'AI & ML', '4th Edition', '978-0134610993', 'Shelf-E1', 25, 25, 0, 'Available');

-- Data for table `nodues_requests` (10 rows)
INSERT INTO `nodues_requests` (`id`, `request_number`, `register_number`, `student_name`, `id_card_number`, `college_name`, `department`, `year`, `request_date`, `overall_status`, `progress_percentage`, `current_stage`, `certificate_number`, `completion_date`, `career_option`, `company_name`, `job_designation`, `ctc_package`, `offer_letter_url`, `higher_college_name`, `higher_degree`, `higher_app_form_url`, `higher_scorecard_url`, `higher_contact`, `exam_name`, `exam_reg_no`, `admit_card_url`, `exam_details`, `startup_name`, `business_idea`, `business_details`, `pitch_deck_url`, `resubmission_count`, `higher_letter_url`, `exam_letter_url`) VALUES
  (3, 'NDR-2026-F103', 'IT2024003', 'Chandra Mouli R', 'SVCE-IT-103', 'Sri Venkateswara College of Engineering', 'Information Technology', 'IV Year', '2026-07-31 17:59:12', 'In Progress', 25, 'Initial Approvals (1 of 3 cleared - Pending: DPC, Central Library)', NULL, NULL, 'Competitive Exams', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'GATE 2026 CS/IT', 'CS26S33012901', 'https://svce.ac.in/gate/chandra-admit.pdf', 'Scored 99.4 percentile in GATE CS', NULL, NULL, NULL, NULL, 0, NULL, NULL),
  (4, 'NDR-2026-F104', 'IT2024004', 'Dinesh Karthik', 'SVCE-IT-104', 'Sri Venkateswara College of Engineering', 'Information Technology', 'IV Year', '2026-07-31 17:59:12', 'In Progress', 25, 'Initial Approvals (1 of 3 cleared - Pending: DPC, Central Library)', NULL, NULL, 'Entrepreneurship', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Nexus AI Solutions Pvt Ltd', 'AI-driven logistics automation platform for South India ports', NULL, 'https://svce.ac.in/startups/nexus-deck.pdf', 0, NULL, NULL),
  (6, 'NDR-2026-005-3413', 'IT2025092', 'Tharun', 'SVCE-IT-92', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-04 09:46:33', 'In Progress', 25, 'Initial Approvals (1 of 3 cleared - Pending: Central Library, Department Library)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL),
  (14, 'NDR-2026-014-7129', 'IT2025082', 'Sarveshvaran', 'SVCE-IT-82', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-04 15:09:47', 'Approved', 100, 'Completed', 'CERT-SVCE-IT-2026-0014', '2026-10-02 02:30:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL),
  (15, 'NDR-2026-015-8227', 'IT2025045', 'M Hannah Felin', 'SVCE-IT-45', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-04 15:13:38', 'In Progress', 90, 'Pending HOD Approval', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL),
  (16, 'NDR-2026-016-3791', 'IT2025025', 'Harshul', 'SVCE-IT-25', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-05 08:25:03', 'In Progress', 25, 'Initial Approvals (1 of 3 cleared - Pending: Central Library, Department Library)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL),
  (22, 'NDR-2026-022-2674', 'IT2025084', 'Sharvesh CM', 'SVCE-IT-84', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-10 16:21:12', 'In Progress', 25, 'Initial Approvals (1 of 3 cleared - Pending: Central Library, Department Library)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL),
  (23, 'NDR-2026-023-4248', 'IT2025080', 'Sanjay', 'SVCE-IT-80', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-10 17:24:14', 'Approved', 100, 'Completed', 'CERT-SVCE-IT-2026-0023', '2026-10-02 02:30:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL),
  (24, 'NDR-2026-024-8631', 'IT2025085', 'Siddharth Santhosh kumar', 'SVCE-IT-85', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-10 17:24:18', 'In Progress', 35, 'Initial Approvals (2 of 3 cleared - Pending: Central Library)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL),
  (25, 'NDR-2026-025-6083', 'IT2025001', 'Abinaya', 'SVCE-IT-1', 'Sri Venkateswara College of Engineering', 'Information Technology', 'III Year', '2026-08-12 04:47:46', 'In Progress', 50, 'Pending Finance Approval', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL);

-- Data for table `nodues_stages` (60 rows)
INSERT INTO `nodues_stages` (`id`, `request_id`, `department_name`, `stage_order`, `status`, `updated_at`, `approved_by`, `remarks`) VALUES
  (13, 3, 'Finance', 4, 'Pending', '2026-07-31 17:59:12', NULL, 'Awaiting Finance clearance review.'),
  (14, 3, 'Central Library', 3, 'Pending', '2026-07-31 17:59:12', NULL, 'Awaiting Central Library clearance review.'),
  (15, 3, 'Department Library', 2, 'Approved', '2026-07-31 17:59:12', 'Sivakumar E (Library In-Charge)', '0 Books & Rs0 Fine verified. Cleared.'),
  (16, 3, 'Faculty Advisor', 5, 'Approved', '2026-08-10 16:16:24', 'V.Praveen Kumar (Faculty Advisor)', 'Bulk Approved by Faculty Advisor.'),
  (17, 3, 'DPC', 1, 'Pending', '2026-07-31 17:59:12', NULL, 'Awaiting DPC / placement verification.'),
  (18, 3, 'HOD', 6, 'Pending', '2026-07-31 17:59:12', NULL, 'Awaiting HOD final review.'),
  (19, 4, 'Finance', 4, 'Pending', '2026-07-31 17:59:13', NULL, 'Awaiting Finance clearance review.'),
  (20, 4, 'Central Library', 3, 'Pending', '2026-07-31 17:59:13', NULL, 'Awaiting Central Library clearance review.'),
  (21, 4, 'Department Library', 2, 'Approved', '2026-07-31 17:59:13', 'Sivakumar E (Library In-Charge)', '0 Books & Rs0 Fine verified. Cleared.'),
  (22, 4, 'Faculty Advisor', 5, 'Approved', '2026-08-10 16:16:24', 'V.Praveen Kumar (Faculty Advisor)', 'Bulk Approved by Faculty Advisor.'),
  (23, 4, 'DPC', 1, 'Pending', '2026-07-31 17:59:13', NULL, 'Awaiting DPC / placement verification.'),
  (24, 4, 'HOD', 6, 'Pending', '2026-07-31 17:59:13', NULL, 'Awaiting HOD final review.'),
  (31, 6, 'Finance', 4, 'Pending', '2026-08-04 09:46:33', NULL, 'Awaiting Finance clearance review.'),
  (32, 6, 'Central Library', 3, 'Pending', '2026-08-04 09:46:33', NULL, 'Awaiting Central Library clearance review.'),
  (33, 6, 'Department Library', 2, 'Pending', '2026-08-04 09:46:33', NULL, 'Awaiting Department Library clearance review.'),
  (34, 6, 'Faculty Advisor', 5, 'Approved', '2026-08-10 16:16:24', 'V.Praveen Kumar (Faculty Advisor)', 'Bulk Approved by Faculty Advisor.'),
  (35, 6, 'DPC', 1, 'Approved', '2026-08-04 10:23:40', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (36, 6, 'HOD', 6, 'Pending', '2026-08-04 09:46:33', NULL, 'Awaiting HOD final review.'),
  (79, 14, 'Finance', 4, 'Approved', '2026-08-04 15:15:44', 'Gurusamy M (Finance Officer)', 'This guys has paid'),
  (80, 14, 'Central Library', 3, 'Approved', '2026-08-04 15:16:16', 'Mohan Kumar S (Main Library Staff)', 'Central library books and fines cleared.'),
  (81, 14, 'Department Library', 2, 'Approved', '2026-08-04 15:12:34', 'Sivakumar E (IT Library Officer)', 'Nalla paiyan'),
  (82, 14, 'Faculty Advisor', 5, 'Approved', '2026-08-04 15:11:54', 'V.Praveen Kumar (Faculty Advisor)', 'Hi guys sarvesh naa massu'),
  (83, 14, 'DPC', 1, 'Approved', '2026-08-04 15:09:47', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (84, 14, 'HOD', 6, 'Approved', '2026-08-04 15:17:08', 'Dr V Vidhya (Head of Department)', 'Head of Department approval granted.'),
  (85, 15, 'Finance', 4, 'Approved', '2026-08-05 11:36:04', 'Gurusamy M (Finance Officer)', 'Tuition and laboratory accounts cleared.'),
  (86, 15, 'Central Library', 3, 'Approved', '2026-08-04 15:16:20', 'Mohan Kumar S (Main Library Staff)', 'Central library books and fines cleared.'),
  (87, 15, 'Department Library', 2, 'Approved', '2026-08-04 15:15:06', 'Sivakumar E (IT Library Officer)', 'Department Library clearance granted.'),
  (88, 15, 'Faculty Advisor', 5, 'Approved', '2026-08-04 15:13:49', 'S.Kavishree (Faculty Advisor)', 'Faculty Advisor approval granted.'),
  (89, 15, 'DPC', 1, 'Approved', '2026-08-04 15:13:38', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (90, 15, 'HOD', 6, 'Pending', '2026-08-04 15:13:38', NULL, 'Awaiting HOD final review.'),
  (91, 16, 'Finance', 4, 'Pending', '2026-08-05 08:25:03', NULL, 'Awaiting Finance clearance review.'),
  (92, 16, 'Central Library', 3, 'Pending', '2026-08-05 08:25:03', NULL, 'Awaiting Central Library clearance review.'),
  (93, 16, 'Department Library', 2, 'Pending', '2026-08-05 08:25:03', NULL, 'Awaiting Department Library clearance review.'),
  (94, 16, 'Faculty Advisor', 5, 'Pending', '2026-08-05 08:25:03', NULL, 'Awaiting Faculty Advisor review.'),
  (95, 16, 'DPC', 1, 'Approved', '2026-08-05 08:25:03', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (96, 16, 'HOD', 6, 'Pending', '2026-08-05 08:25:03', NULL, 'Awaiting HOD final review.'),
  (127, 22, 'DPC', 1, 'Approved', '2026-08-10 16:21:12', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (128, 22, 'Department Library', 2, 'Pending', '2026-08-10 16:21:12', NULL, 'Awaiting Department Library clearance review.'),
  (129, 22, 'Central Library', 3, 'Pending', '2026-08-10 16:21:12', NULL, 'Awaiting Central Library clearance review.'),
  (130, 22, 'Finance', 4, 'Pending', '2026-08-10 16:21:12', NULL, 'Awaiting Finance clearance review.'),
  (131, 22, 'Faculty Advisor', 5, 'Pending', '2026-08-10 16:21:12', NULL, 'Awaiting Faculty Advisor review.'),
  (132, 22, 'HOD', 6, 'Pending', '2026-08-10 16:21:12', NULL, 'Awaiting HOD final review.'),
  (133, 23, 'DPC', 1, 'Approved', '2026-08-10 17:24:14', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (134, 23, 'Department Library', 2, 'Approved', '2026-08-10 17:25:08', 'Sivakumar E (IT Library Officer)', 'Department Library clearance granted.'),
  (135, 23, 'Central Library', 3, 'Approved', '2026-08-10 17:24:51', 'Mohan Kumar S (Main Library Staff)', 'Central library books and fines cleared.'),
  (136, 23, 'Finance', 4, 'Approved', '2026-08-10 17:25:31', 'Gurusamy M (Finance Officer)', 'Tuition and laboratory accounts cleared.'),
  (137, 23, 'Faculty Advisor', 5, 'Approved', '2026-08-10 17:25:47', 'V Praveenkumar (Faculty Advisor)', 'Faculty Advisor approval granted.'),
  (138, 23, 'HOD', 6, 'Approved', '2026-08-10 17:26:12', 'Dr V Vidhya (Head of Department)', 'Head of Department approval granted.'),
  (139, 24, 'DPC', 1, 'Approved', '2026-08-10 17:24:18', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (140, 24, 'Department Library', 2, 'Approved', '2026-08-10 17:30:14', 'Sivakumar E (IT Library Officer)', 'Department Library clearance granted.');

INSERT INTO `nodues_stages` (`id`, `request_id`, `department_name`, `stage_order`, `status`, `updated_at`, `approved_by`, `remarks`) VALUES
  (141, 24, 'Central Library', 3, 'Pending', '2026-08-10 17:24:18', NULL, 'Awaiting Central Library clearance review.'),
  (142, 24, 'Finance', 4, 'Pending', '2026-08-10 17:24:18', NULL, 'Awaiting Finance clearance review.'),
  (143, 24, 'Faculty Advisor', 5, 'Pending', '2026-08-10 17:24:18', NULL, 'Awaiting Faculty Advisor review.'),
  (144, 24, 'HOD', 6, 'Pending', '2026-08-10 17:24:18', NULL, 'Awaiting HOD final review.'),
  (145, 25, 'DPC', 1, 'Approved', '2026-08-12 04:47:46', 'System (Auto-Cleared)', 'Not applicable for non-final year students.'),
  (146, 25, 'Department Library', 2, 'Approved', '2026-08-12 04:50:05', 'Sivakumar E (IT Library Officer)', 'Department Library clearance granted.'),
  (147, 25, 'Central Library', 3, 'Approved', '2026-08-12 04:50:15', 'Mohan Kumar S (Main Library Staff)', 'Central library books and fines cleared.'),
  (148, 25, 'Finance', 4, 'Pending', '2026-08-12 04:47:46', NULL, 'Awaiting Finance clearance review.'),
  (149, 25, 'Faculty Advisor', 5, 'Pending', '2026-08-12 04:47:46', NULL, 'Awaiting Faculty Advisor review.'),
  (150, 25, 'HOD', 6, 'Pending', '2026-08-12 04:47:46', NULL, 'Awaiting HOD final review.');

-- Data for table `nodues_audit_logs` (18 rows)
INSERT INTO `nodues_audit_logs` (`id`, `request_id`, `department_name`, `action_type`, `actor_name`, `actor_role`, `status_after`, `remarks`, `student_comment`, `attachment_url`, `timestamp`) VALUES
  (1, 15, 'Finance', 'Re-submission', 'M Hannah Felin', 'student', 'Pending (Finance)', 'Re-submitted directly to Finance.', 'test comment', NULL, '2026-08-05 09:31:09'),
  (2, 15, 'Finance', 'Re-submission', 'M Hannah Felin', 'student', 'Pending (Finance)', 'Re-submitted directly to Finance.', 'I resolved the fees issue.', NULL, '2026-08-05 11:28:23'),
  (3, 15, 'Finance', 'Re-submission', 'M Hannah Felin', 'student', 'Pending (Finance)', 'Re-submitted directly to Finance.', 'SUper guys', NULL, '2026-08-05 11:35:26'),
  (4, 15, 'Finance', 'Approval', 'Gurusamy M (Finance Officer)', 'finance', 'Approved', 'Tuition and laboratory accounts cleared.', NULL, NULL, '2026-08-05 11:36:04'),
  (15, 22, 'Student Submission', 'Submission', 'Sharvesh CM', 'student', 'Pending Library Verification', 'No-Dues clearance application submitted by student.', NULL, NULL, '2026-08-10 16:21:12'),
  (17, 23, 'Student Submission', 'Submission', 'Sanjay', 'student', 'Pending Library Verification', 'No-Dues clearance application submitted by student.', NULL, NULL, '2026-08-10 17:24:14'),
  (18, 24, 'Student Submission', 'Submission', 'Siddharth Santhosh kumar', 'student', 'Pending Library Verification', 'No-Dues clearance application submitted by student.', NULL, NULL, '2026-08-10 17:24:18'),
  (19, 23, 'Central Library', 'Approval', 'Mohan Kumar S (Main Library Staff)', 'main_library_staff', 'Approved', 'Central library books and fines cleared.', NULL, NULL, '2026-08-10 17:24:51'),
  (20, 23, 'Department Library', 'Approval', 'Sivakumar E (IT Library Officer)', 'library_staff', 'Approved', 'Department Library clearance granted.', NULL, NULL, '2026-08-10 17:25:08'),
  (21, 23, 'Finance', 'Approval', 'Gurusamy M (Finance Officer)', 'finance', 'Approved', 'Tuition and laboratory accounts cleared.', NULL, NULL, '2026-08-10 17:25:31'),
  (22, 23, 'Faculty Advisor', 'Approval', 'V Praveenkumar (Faculty Advisor)', 'faculty_advisor', 'Approved', 'Faculty Advisor clearance granted.', NULL, NULL, '2026-08-10 17:25:47'),
  (23, 23, 'HOD', 'Approval', 'Dr V Vidhya (Head of Department)', 'hod', 'Approved', 'Head of Department final clearance granted.', NULL, NULL, '2026-08-10 17:26:12'),
  (24, 24, 'Department Library', 'Rejection', 'Sivakumar E (IT Library Officer)', 'library_staff', 'Rejected', 'kdfla', NULL, NULL, '2026-08-10 17:29:07'),
  (25, 24, 'Department Library', 'Re-submission', 'Siddharth Santhosh kumar', 'student', 'Pending (Department Library)', 'Re-submitted directly to Department Library.', 'wersdtyuiop[', NULL, '2026-08-10 17:29:38'),
  (26, 24, 'Department Library', 'Approval', 'Sivakumar E (IT Library Officer)', 'library_staff', 'Approved', 'Department Library clearance granted.', NULL, NULL, '2026-08-10 17:30:14'),
  (27, 25, 'Student Submission', 'Submission', 'Abinaya', 'student', 'Pending Library Verification', 'No-Dues clearance application submitted by student.', NULL, NULL, '2026-08-12 04:47:46'),
  (28, 25, 'Department Library', 'Approval', 'Sivakumar E (IT Library Officer)', 'library_staff', 'Approved', 'Department Library clearance granted.', NULL, NULL, '2026-08-12 04:50:05'),
  (29, 25, 'Central Library', 'Approval', 'Mohan Kumar S (Main Library Staff)', 'main_library_staff', 'Approved', 'Central library books and fines cleared.', NULL, NULL, '2026-08-12 04:50:15');

-- Data for table `system_audit_logs` (16 rows)
INSERT INTO `system_audit_logs` (`id`, `user_id`, `username`, `full_name`, `role`, `action`, `details`, `module`, `device_name`, `device_type`, `location`, `ip_address`, `created_at`) VALUES
  (1, NULL, 'IT2024001', 'Aadhityan K', 'student', 'USER_LOGIN', 'Student logged into No-Dues Smart Portal via Web App', 'Authentication', 'Windows 11 (Chrome 122)', 'Desktop', 'SVCE Campus Network, Sriperumbudur (12.986° N, 79.972° E)', '192.168.10.45', '2026-09-30 09:15:22'),
  (2, NULL, 'IT2024001', 'Aadhityan K', 'student', 'CAREER_DETAILS_SUBMITTED', 'Submitted Placement career details: Zoho Corporation (8.5 LPA)', 'No-Dues Clearance', 'Windows 11 (Chrome 122)', 'Desktop', 'SVCE Campus Network, Sriperumbudur (12.986° N, 79.972° E)', '192.168.10.45', '2026-09-30 09:22:10'),
  (3, NULL, 'EMP-DPC-IT-01', 'Dr. R. Placement Coordinator', 'dpc', 'STAGE_APPROVED', 'Approved Stage 1 Career Verification for Aadhityan K (IT2024001)', 'DPC Clearance', 'macOS Sonoma (Safari 17)', 'Desktop', 'SVCE Admin Block, 1st Floor, Sriperumbudur', '192.168.1.18', '2026-09-30 10:45:00'),
  (4, NULL, 'IT2024002', 'Bhavani S', 'student', 'USER_LOGIN', 'Student logged in to view Higher Studies clearance progress', 'Authentication', 'iPhone 15 Pro (Mobile Safari 17.4)', 'Mobile', 'Chennai, Tamil Nadu, India (13.0827° N, 80.2707° E)', '106.213.84.112', '2026-09-30 11:30:14'),
  (5, NULL, 'EMP-LIB-IT-01', 'Sivakumar E', 'library_staff', 'BOOK_RETURNED', 'Returned book "Operating System Concepts" (BK-IT-101) for reg IT2024001', 'Book Circulation', 'Windows 10 (Edge 121)', 'Desktop', 'SVCE IT Dept Lab 3, Sriperumbudur', '192.168.20.102', '2026-09-30 13:10:45'),
  (6, NULL, 'EMP-LIB-IT-01', 'Sivakumar E', 'library_staff', 'STAGE_APPROVED', 'Cleared Department Library dues for Aadhityan K (IT2024001)', 'Department Library', 'Windows 10 (Edge 121)', 'Desktop', 'SVCE IT Dept Lab 3, Sriperumbudur', '192.168.20.102', '2026-09-30 13:15:30'),
  (7, NULL, 'EMP-MLIB-IT-01', 'Mohan Kumar S', 'main_library_staff', 'STAGE_APPROVED', 'Central Library clearance granted for Aadhityan K (IT2024001)', 'Central Library', 'iPad Air 5th Gen (Safari)', 'Tablet', 'SVCE Central Library Terminal (12.9865° N, 79.9722° E)', '192.168.30.55', '2026-09-30 14:02:18'),
  (8, NULL, 'EMP-FIN-IT-01', 'Gurusamy M', 'finance', 'STAGE_APPROVED', 'Tuition and laboratory fee verified with zero dues for IT2024001', 'Finance Section', 'Windows 11 (Chrome 122)', 'Desktop', 'SVCE Admin Block, Finance Section, Sriperumbudur', '192.168.1.42', '2026-09-30 15:20:00'),
  (9, NULL, 'EMP-FA-IT-01', 'V Praveenkumar', 'faculty_advisor', 'HALL_TICKET_VERIFIED', 'Verified and authorized Semester VII Hall Ticket for Sharvesh CM (IT2025084)', 'Faculty Advisory', 'Samsung Galaxy Tab S9 (Chrome)', 'Tablet', 'SVCE IT Faculty Cabin 204, Sriperumbudur', '192.168.10.77', '2026-10-01 09:40:12'),
  (10, NULL, 'EMP-FA-IT-01', 'V Praveenkumar', 'faculty_advisor', 'STAGE_APPROVED', 'Academic conduct and credit clearance approved for Aadhityan K (IT2024001)', 'Faculty Advisory', 'Windows 11 (Chrome 122)', 'Desktop', 'SVCE IT Faculty Cabin 204, Sriperumbudur', '192.168.10.77', '2026-10-01 10:05:00'),
  (11, NULL, 'EMP-HOD-IT-01', 'Dr V Vidhya', 'hod', 'FINAL_CLEARANCE_APPROVED', 'Final HOD executive sign-off granted. Digital No-Dues Certificate issued.', 'HOD Executive', 'macOS Sonoma (Safari 17)', 'Desktop', 'SVCE HOD Office, IT Department, Sriperumbudur', '192.168.1.10', '2026-10-01 11:30:00'),
  (12, NULL, 'IT2025084', 'Sharvesh CM', 'student', 'USER_LOGIN', 'Student logged in from mobile device to check hall ticket status', 'Authentication', 'Samsung Galaxy S24 (Chrome Mobile 122)', 'Mobile', 'SVCE Campus Network, Sriperumbudur (12.986° N, 79.972° E)', '192.168.15.84', '2026-10-01 14:15:33'),
  (13, NULL, 'IT2025084', 'Sharvesh CM', 'student', 'PROFILE_UPDATED', 'Updated profile contact phone number to +91 98403 84456', 'Profile Management', 'Samsung Galaxy S24 (Chrome Mobile 122)', 'Mobile', 'SVCE Campus Network, Sriperumbudur (12.986° N, 79.972° E)', '192.168.15.84', '2026-10-01 14:18:20'),
  (14, NULL, 'IT2024003', 'Chandra Mouli R', 'student', 'USER_LOGIN', 'Student accessed No-Dues portal from Bangalore off-campus location', 'Authentication', 'OnePlus 12 (Chrome Mobile)', 'Mobile', 'Bengaluru, Karnataka, India (12.9716° N, 77.5946° E)', '117.216.45.92', '2026-10-01 16:45:10'),
  (15, NULL, 'EMP-HOD-IT-01', 'Dr V Vidhya', 'hod', 'AUDIT_LOG_EXPORT', 'Exported quarterly institutional clearance audit report', 'System Reports', 'macOS Sonoma (Safari 17)', 'Desktop', 'SVCE HOD Office, IT Department, Sriperumbudur', '192.168.1.10', '2026-10-02 07:15:00'),
  (16, 1, 'EMP-HOD-IT-01', 'Dr V Vidhya', 'hod', 'USER_LOGIN', 'User authenticated successfully into hod workspace', 'Authentication', 'Windows 11/10 (Chrome)', 'Desktop', 'SVCE Campus Network, Sriperumbudur (12.986° N, 79.972° E)', '127.0.0.1', '2026-10-02 08:00:58');

-- Data for table `announcements` (1 rows)
INSERT INTO `announcements` (`id`, `title`, `description`, `college_name`, `department`, `category`, `priority`, `attachment_url`, `is_pinned`, `status`, `created_at`) VALUES
  (1, '4th Year & 3rd Year IT No-Dues & Career Verification Schedule', 'All 4th Year B.Tech IT students must complete Career Pathway details (Placements/Higher Studies/Exams/Entrepreneurship) for Stage 5 DPC clearance.', 'Sri Venkateswara College of Engineering', 'Information Technology', 'No-Dues', 'High', NULL, 1, 'Published', '2026-07-31 17:59:13');

-- Data for table `notifications` (83 rows)
INSERT INTO `notifications` (`id`, `target_user`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
  (1, 'IT2025092', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-005-9547 was submitted successfully.', 'success', 0, '2026-08-04 09:46:29'),
  (2, 'IT2025092', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-005-3413 was submitted successfully.', 'success', 0, '2026-08-04 09:46:33'),
  (3, 'IT2024001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-007-0199 was submitted successfully.', 'success', 0, '2026-08-04 10:16:20'),
  (4, 'IT2024001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-007-8386 was submitted successfully.', 'success', 0, '2026-08-04 10:26:58'),
  (5, 'IT2024001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-007-1930 was submitted successfully.', 'success', 0, '2026-08-04 10:27:21'),
  (6, 'IT2025025', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-010-3618 was submitted successfully.', 'success', 0, '2026-08-04 11:54:33'),
  (7, 'IT2024001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-011-4542 was submitted successfully.', 'success', 0, '2026-08-04 12:02:04'),
  (8, 'IT2025001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-011-3793 was submitted successfully.', 'success', 0, '2026-08-04 12:05:43'),
  (9, 'IT2025001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-011-8508 was submitted successfully.', 'success', 0, '2026-08-04 12:09:28'),
  (10, 'IT2025082', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-014-7129 was submitted successfully.', 'success', 0, '2026-08-04 15:09:47'),
  (11, 'IT2025082', 'Faculty Advisor Approved', 'Your Faculty Advisor V.Praveen Kumar (Faculty Advisor) approved your No-Dues request NDR-2026-014-7129.', 'success', 0, '2026-08-04 15:11:54'),
  (12, 'IT2025082', 'Department Library Approved', 'Department Library has approved your No-Dues request NDR-2026-014-7129.', 'success', 0, '2026-08-04 15:12:34'),
  (13, 'IT2025045', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-015-8227 was submitted successfully.', 'success', 0, '2026-08-04 15:13:38'),
  (14, 'IT2025045', 'Faculty Advisor Approved', 'Your Faculty Advisor S.Kavishree (Faculty Advisor) approved your No-Dues request NDR-2026-015-8227.', 'success', 0, '2026-08-04 15:13:49'),
  (15, 'IT2025045', 'Department Library Approved', 'Department Library has approved your No-Dues request NDR-2026-015-8227.', 'success', 0, '2026-08-04 15:15:06'),
  (16, 'IT2025045', 'No-Dues Request REJECTED (Finance Stage)', 'Finance Officer Gurusamy M (Finance Officer) rejected your clearance. Remarks: no fees paid', 'danger', 0, '2026-08-04 15:15:25'),
  (17, 'EMP-FA-IT-04', 'Advisee Alert: No-Dues Request REJECTED (Finance Stage)', 'ADVISEE FINANCE ALERT: No-Dues application (NDR-2026-015-8227) of M Hannah Felin was REJECTED by Finance Section. Remarks: no fees paid', 'danger', 0, '2026-08-04 15:15:25'),
  (18, 'kavishree.s@svce.ac.in', 'Advisee Alert: No-Dues Request REJECTED (Finance Stage)', 'ADVISEE FINANCE ALERT: No-Dues application (NDR-2026-015-8227) of M Hannah Felin was REJECTED by Finance Section. Remarks: no fees paid', 'danger', 0, '2026-08-04 15:15:25'),
  (19, 'S.Kavishree', 'Advisee Alert: No-Dues Request REJECTED (Finance Stage)', 'ADVISEE FINANCE ALERT: No-Dues application (NDR-2026-015-8227) of M Hannah Felin was REJECTED by Finance Section. Remarks: no fees paid', 'danger', 0, '2026-08-04 15:15:25'),
  (20, 'IT2025082', 'Finance Clearance Approved', 'Finance Section (Gurusamy M (Finance Officer)) has cleared your No-Dues request.', 'success', 0, '2026-08-04 15:15:44'),
  (21, 'IT2025082', 'Central Library Approved', 'Main Library staff (Mohan Kumar S (Main Library Staff)) approved your No-Dues.', 'success', 0, '2026-08-04 15:16:16'),
  (22, 'IT2025045', 'Central Library Approved', 'Main Library staff (Mohan Kumar S (Main Library Staff)) approved your No-Dues.', 'success', 0, '2026-08-04 15:16:20'),
  (23, 'IT2025082', 'No-Dues Clearance Completed!', 'All sections have approved your request. Your official SVCE Digital Certificate CERT-SVCE-IT-2026-0014 is now ready for download!', 'success', 0, '2026-08-04 15:17:08'),
  (24, 'IT2025025', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-016-3791 was submitted successfully.', 'success', 0, '2026-08-05 08:25:03'),
  (25, 'IT2025085', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-017-7293 was submitted successfully.', 'success', 0, '2026-08-05 09:24:07'),
  (26, 'IT2025085', 'Finance Clearance Approved', 'Finance Section (Gurusamy M (Finance Officer)) has cleared your No-Dues request.', 'success', 0, '2026-08-05 09:27:25'),
  (27, 'finance', 'Re-submitted Clearance Request (NDR-2026-015-8227)', 'Student M Hannah Felin (IT2025045) has re-submitted their clearance request to Finance. Comment: "I resolved the fees issue."', 'info', 0, '2026-08-05 11:28:23'),
  (28, 'finance', 'Re-submitted Clearance Request (NDR-2026-015-8227)', 'Student M Hannah Felin (IT2025045) has re-submitted their clearance request to Finance. Comment: "SUper guys"', 'info', 0, '2026-08-05 11:35:26'),
  (29, 'IT2025045', 'Finance Clearance Approved', 'Finance Section (Gurusamy M (Finance Officer)) has cleared your No-Dues request.', 'success', 0, '2026-08-05 11:36:04'),
  (30, 'IT2025001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-018-1316 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 04:45:01'),
  (31, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Abinaya (IT2025001) has submitted a new No-Dues request NDR-2026-018-1316.', 'info', 0, '2026-08-10 04:45:01'),
  (32, 'library_staff', 'New No-Dues Clearance Request', 'Student Abinaya (IT2025001) has submitted a new No-Dues request NDR-2026-018-1316.', 'info', 0, '2026-08-10 04:45:01'),
  (33, 'IT2025001', 'Department Library Approved', 'Department Library has approved your No-Dues request NDR-2026-018-1316.', 'success', 0, '2026-08-10 04:45:43'),
  (34, 'IT2025001', 'Central Library Approved', 'Main Library staff (Mohan Kumar S (Main Library Staff)) approved your No-Dues.', 'success', 0, '2026-08-10 04:47:19'),
  (35, 'IT2025001', 'No-Dues Request REJECTED (Finance Stage)', 'Finance Officer Gurusamy M (Finance Officer) rejected your clearance. Remarks: uhafsdge', 'danger', 0, '2026-08-10 04:48:20'),
  (36, 'EMP-FA-IT-03', 'Advisee Alert: No-Dues Request REJECTED (Finance Stage)', 'ADVISEE FINANCE ALERT: No-Dues application (NDR-2026-018-1316) of Abinaya was REJECTED by Finance Section. Remarks: uhafsdge', 'danger', 0, '2026-08-10 04:48:20'),
  (37, 'ranjith.v@svce.ac.in', 'Advisee Alert: No-Dues Request REJECTED (Finance Stage)', 'ADVISEE FINANCE ALERT: No-Dues application (NDR-2026-018-1316) of Abinaya was REJECTED by Finance Section. Remarks: uhafsdge', 'danger', 0, '2026-08-10 04:48:20'),
  (38, 'V.Ranjith', 'Advisee Alert: No-Dues Request REJECTED (Finance Stage)', 'ADVISEE FINANCE ALERT: No-Dues application (NDR-2026-018-1316) of Abinaya was REJECTED by Finance Section. Remarks: uhafsdge', 'danger', 0, '2026-08-10 04:48:20'),
  (39, 'finance', 'Re-submitted Clearance Request (NDR-2026-018-1316)', 'Student Abinaya (IT2025001) has re-submitted their clearance request to Finance. Comment: "hggdh"', 'info', 0, '2026-08-10 04:48:42'),
  (40, 'IT2025001', 'Finance Clearance Approved', 'Finance Section (Gurusamy M (Finance Officer)) has cleared your No-Dues request.', 'success', 0, '2026-08-10 04:48:55'),
  (41, 'IT2025001', 'Faculty Advisor Approved', 'Your Faculty Advisor V.Ranjith (Faculty Advisor) approved your No-Dues request NDR-2026-018-1316.', 'success', 0, '2026-08-10 04:49:16'),
  (42, 'IT2025085', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-019-1353 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 16:08:01'),
  (43, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-019-1353.', 'info', 0, '2026-08-10 16:08:01'),
  (44, 'library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-019-1353.', 'info', 0, '2026-08-10 16:08:01'),
  (45, 'IT2025085', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-019-5186 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 16:14:55'),
  (46, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-019-5186.', 'info', 0, '2026-08-10 16:14:55'),
  (47, 'library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-019-5186.', 'info', 0, '2026-08-10 16:14:55'),
  (48, 'IT2025085', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-019-0359 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 16:19:50'),
  (49, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-019-0359.', 'info', 0, '2026-08-10 16:19:50'),
  (50, 'library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-019-0359.', 'info', 0, '2026-08-10 16:19:50');

INSERT INTO `notifications` (`id`, `target_user`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
  (51, 'IT2025084', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-022-2674 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 16:21:12'),
  (52, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Sharvesh CM (IT2025084) has submitted a new No-Dues request NDR-2026-022-2674.', 'info', 0, '2026-08-10 16:21:12'),
  (53, 'library_staff', 'New No-Dues Clearance Request', 'Student Sharvesh CM (IT2025084) has submitted a new No-Dues request NDR-2026-022-2674.', 'info', 0, '2026-08-10 16:21:12'),
  (54, 'IT2025085', 'Central Library Approved', 'Main Library staff (Mohan Kumar S (Main Library Staff)) approved your No-Dues.', 'success', 0, '2026-08-10 16:40:58'),
  (55, 'IT2025080', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-023-4248 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 17:24:14'),
  (56, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Sanjay (IT2025080) has submitted a new No-Dues request NDR-2026-023-4248.', 'info', 0, '2026-08-10 17:24:14'),
  (57, 'library_staff', 'New No-Dues Clearance Request', 'Student Sanjay (IT2025080) has submitted a new No-Dues request NDR-2026-023-4248.', 'info', 0, '2026-08-10 17:24:14'),
  (58, 'IT2025085', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-024-8631 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-10 17:24:18'),
  (59, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-024-8631.', 'info', 0, '2026-08-10 17:24:18'),
  (60, 'library_staff', 'New No-Dues Clearance Request', 'Student Siddharth Santhosh kumar (IT2025085) has submitted a new No-Dues request NDR-2026-024-8631.', 'info', 0, '2026-08-10 17:24:18'),
  (61, 'IT2025080', 'Central Library Approved', 'Main Library staff (Mohan Kumar S (Main Library Staff)) approved your No-Dues.', 'success', 0, '2026-08-10 17:24:51'),
  (62, 'IT2025080', 'Department Library Approved', 'Department Library has approved your No-Dues request NDR-2026-023-4248.', 'success', 0, '2026-08-10 17:25:08'),
  (63, 'IT2025080', 'Finance Clearance Approved', 'Finance Section (Gurusamy M (Finance Officer)) has cleared your No-Dues request.', 'success', 0, '2026-08-10 17:25:31'),
  (64, 'IT2025080', 'Faculty Advisor Approved', 'Your Faculty Advisor V Praveenkumar (Faculty Advisor) approved your No-Dues request NDR-2026-023-4248.', 'success', 0, '2026-08-10 17:25:47'),
  (65, 'IT2025080', 'No-Dues Clearance Completed!', 'All sections have approved your request. Your official SVCE Digital Certificate CERT-SVCE-IT-2026-0023 is now ready for download!', 'success', 0, '2026-08-10 17:26:12'),
  (66, 'IT2024002', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Issued by Faculty Advisor V Praveenkumar.', 'success', 0, '2026-08-10 17:27:16'),
  (67, 'IT2024002', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Not Issued by Faculty Advisor V Praveenkumar.', 'warning', 0, '2026-08-10 17:27:26'),
  (68, 'IT2025080', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Issued by Faculty Advisor V Praveenkumar.', 'success', 0, '2026-08-10 17:27:49'),
  (69, 'IT2025085', 'No-Dues Request REJECTED (Department Library)', 'Your No-Dues request NDR-2026-024-8631 was rejected by Department Library. Reason/Remarks: kdfla', 'danger', 0, '2026-08-10 17:29:07'),
  (70, 'EMP-FA-IT-01', 'Advisee Alert: No-Dues Request REJECTED (Department Library)', 'URGENT ADVISEE ALERT: The No-Dues application (NDR-2026-024-8631) of your advisee Siddharth Santhosh kumar (IT2025085) was REJECTED by Department Library. Remarks: kdfla', 'danger', 0, '2026-08-10 17:29:07'),
  (71, 'praveenkumar.v@svce.ac.in', 'Advisee Alert: No-Dues Request REJECTED (Department Library)', 'URGENT ADVISEE ALERT: The No-Dues application (NDR-2026-024-8631) of your advisee Siddharth Santhosh kumar (IT2025085) was REJECTED by Department Library. Remarks: kdfla', 'danger', 0, '2026-08-10 17:29:07'),
  (72, 'V Praveenkumar', 'Advisee Alert: No-Dues Request REJECTED (Department Library)', 'URGENT ADVISEE ALERT: The No-Dues application (NDR-2026-024-8631) of your advisee Siddharth Santhosh kumar (IT2025085) was REJECTED by Department Library. Remarks: kdfla', 'danger', 0, '2026-08-10 17:29:07'),
  (73, 'library_staff', 'Re-submitted Clearance Request (NDR-2026-024-8631)', 'Student Siddharth Santhosh kumar (IT2025085) has re-submitted their clearance request to Department Library. Comment: "wersdtyuiop["', 'info', 0, '2026-08-10 17:29:38'),
  (74, 'IT2025085', 'Department Library Approved', 'Department Library has approved your No-Dues request NDR-2026-024-8631.', 'success', 0, '2026-08-10 17:30:14'),
  (75, 'IT2025085', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Issued by Faculty Advisor V Praveenkumar.', 'success', 0, '2026-08-11 04:46:39'),
  (76, 'IT2025085', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Not Issued by Faculty Advisor V Praveenkumar.', 'warning', 0, '2026-08-11 04:46:43'),
  (77, 'IT2025085', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Issued by Faculty Advisor V Praveenkumar.', 'success', 0, '2026-08-11 04:46:57'),
  (78, 'IT2025085', 'Hall Ticket Status Updated', 'Your Hall Ticket status has been marked as: Not Issued by Faculty Advisor V Praveenkumar.', 'warning', 0, '2026-08-11 04:47:11'),
  (79, 'IT2025001', 'No-Dues Request Submitted', 'Your No-Dues request NDR-2026-025-6083 was submitted successfully and sent for parallel Library Verification (Central Library & Dept Library).', 'success', 0, '2026-08-12 04:47:46'),
  (80, 'main_library_staff', 'New No-Dues Clearance Request', 'Student Abinaya (IT2025001) has submitted a new No-Dues request NDR-2026-025-6083.', 'info', 0, '2026-08-12 04:47:46'),
  (81, 'library_staff', 'New No-Dues Clearance Request', 'Student Abinaya (IT2025001) has submitted a new No-Dues request NDR-2026-025-6083.', 'info', 0, '2026-08-12 04:47:46'),
  (82, 'IT2025001', 'Department Library Approved', 'Department Library has approved your No-Dues request NDR-2026-025-6083.', 'success', 0, '2026-08-12 04:50:05'),
  (83, 'IT2025001', 'Central Library Approved', 'Main Library staff (Mohan Kumar S (Main Library Staff)) approved your No-Dues.', 'success', 0, '2026-08-12 04:50:15');

-- Data for table `hall_ticket_audit_logs` (7 rows)
INSERT INTO `hall_ticket_audit_logs` (`id`, `student_register_number`, `student_name`, `previous_status`, `new_status`, `updated_by_name`, `updated_by_emp_id`, `remarks`, `timestamp`) VALUES
  (1, 'IT2024002', 'Bhavani S', 'Not Issued', 'Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-10 17:27:16'),
  (2, 'IT2024002', 'Bhavani S', 'Issued', 'Not Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-10 17:27:26'),
  (3, 'IT2025080', 'Sanjay', 'Not Issued', 'Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-10 17:27:49'),
  (4, 'IT2025085', 'Siddharth Santhosh kumar', 'Not Issued', 'Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-11 04:46:39'),
  (5, 'IT2025085', 'Siddharth Santhosh kumar', 'Issued', 'Not Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-11 04:46:43'),
  (6, 'IT2025085', 'Siddharth Santhosh kumar', 'Not Issued', 'Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-11 04:46:57'),
  (7, 'IT2025085', 'Siddharth Santhosh kumar', 'Issued', 'Not Issued', 'V Praveenkumar', 'EMP-FA-IT-01', NULL, '2026-08-11 04:47:11');

SET FOREIGN_KEY_CHECKS = 1;
-- =========================================================================
-- END OF SCRIPT. You can run this in MySQL Workbench by:
-- 1. Open MySQL Workbench
-- 2. Connect to Local instance 3306 (or your MySQL Server)
-- 3. File -> Open SQL Script -> Select this file
-- 4. Click the Lightning Bolt (⚡) button to execute all queries
-- =========================================================================

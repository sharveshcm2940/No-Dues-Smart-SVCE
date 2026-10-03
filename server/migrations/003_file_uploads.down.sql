-- =========================================================================
-- Migration 003 DOWN: Rollback Secure File Uploads
-- =========================================================================

DROP TABLE IF EXISTS `file_access_logs`;
DROP TABLE IF EXISTS `uploaded_files`;

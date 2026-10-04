-- Migration 005 DOWN: Revert Consent Records & Audit Hash Chaining

ALTER TABLE system_audit_logs DROP COLUMN entry_hash, DROP COLUMN previous_hash;
ALTER TABLE nodues_audit_logs DROP COLUMN entry_hash, DROP COLUMN previous_hash;
DROP TABLE IF EXISTS consent_records;

-- Migration 004 DOWN: Revert Performance Indexes & Constraints

DROP INDEX uq_active_request_per_year ON nodues_requests;
ALTER TABLE nodues_requests DROP COLUMN active_request_slot;

DROP INDEX idx_sal_created_at ON system_audit_logs;
DROP INDEX idx_nal_timestamp ON nodues_audit_logs;
DROP INDEX idx_br_reg_status ON borrow_records;
DROP INDEX idx_ns_req_order_status ON nodues_stages;
DROP INDEX idx_nr_department ON nodues_requests;
DROP INDEX idx_nr_reg_status ON nodues_requests;

-- Migration 004 UP: Performance Indexes & Integrity Constraints

-- 1. Performance indexes for requests, stages, borrow records and audit logs
CREATE INDEX idx_nr_reg_status ON nodues_requests (register_number, overall_status);
CREATE INDEX idx_nr_department ON nodues_requests (department);
CREATE INDEX idx_ns_req_order_status ON nodues_stages (request_id, stage_order, status);
CREATE INDEX idx_br_reg_status ON borrow_records (register_number, status);
CREATE INDEX idx_nal_timestamp ON nodues_audit_logs (timestamp);
CREATE INDEX idx_sal_created_at ON system_audit_logs (created_at);

-- 2. Prevent duplicate active clearance requests per student per academic year
-- Generates an active slot string only when request is active ('In Progress', 'Pending', 'Hold')
ALTER TABLE nodues_requests
  ADD COLUMN active_request_slot VARCHAR(150)
  GENERATED ALWAYS AS (
    CASE 
      WHEN overall_status IN ('In Progress', 'Pending', 'Hold') 
      THEN CONCAT(register_number, '_', year) 
      ELSE NULL 
    END
  ) STORED;

CREATE UNIQUE INDEX uq_active_request_per_year ON nodues_requests (active_request_slot);

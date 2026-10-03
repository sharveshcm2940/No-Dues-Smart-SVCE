-- =========================================================================
-- SVCE SMART NO-DUES ERP: LEAST-PRIVILEGE MYSQL USER PROVISIONING
-- =========================================================================
-- For production deployment, the application MUST NOT run as MySQL 'root'.
-- Run this script as the MySQL Administrator to provision a dedicated app user.

-- 1. Create the application user restricted to localhost (or app subnet)
-- Replace 'CHANGE_THIS_TO_STRONG_PASSWORD_64_CHAR' with a secure, generated password.
CREATE USER IF NOT EXISTS 'svce_app'@'localhost' IDENTIFIED BY 'CHANGE_THIS_TO_STRONG_PASSWORD_64_CHAR';

-- 2. Grant ONLY the required DML privileges on the schema
GRANT SELECT, INSERT, UPDATE, DELETE ON `svce_nodues`.* TO 'svce_app'@'localhost';

-- 3. Explicitly ensure administrative privileges are NOT granted
-- (No DROP, ALTER, GRANT OPTION, SUPER, FILE, PROCESS, RELOAD, SHUTDOWN)
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'svce_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON `svce_nodues`.* TO 'svce_app'@'localhost';

-- 4. Apply privilege changes
FLUSH PRIVILEGES;

-- 5. Verification: Check granted privileges
SHOW GRANTS FOR 'svce_app'@'localhost';

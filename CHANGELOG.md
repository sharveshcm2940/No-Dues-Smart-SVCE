# Changelog

All notable changes to the **SVCE Smart No-Dues ERP** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-04

### Added
- **Modular Domain Services (Microservices-Style) Architecture**:
  - Reorganized backend from monolithic flat controllers/routes into decoupled business domain modules under `server/src/modules/`:
    - `modules/auth/`: Authentication, session lifecycle, password policy, and token rotation.
    - `modules/clearance/`: Clearance state machine, stage transitions, SLA calculation, and student/officer pipelines.
    - `modules/library/`: Department & central library clearance, catalog management, fines calculation, and payments.
    - `modules/complaints/`: Unified grievance and complaint resolution desk.
    - `modules/admin/`: System settings, role/user administration, and high-throughput bulk CSV ingestion.
    - `modules/audit/`: SHA-256 tamper-evident hash chaining and DPDP Act 2023 consent tracking.
    - `modules/files/`: Secure file storage, document download, and profile photo processing.
  - **Unified API Gateway (`server/src/gateway/apiGateway.js`)**: Routes requests across domain services, manages Server-Sent Events (SSE), and handles rate-limited public verification endpoints while maintaining 100% backward compatibility for all existing client routes.
- **Authentic Institutional SVCE No Due Certificate (Matching Form FT/GN/51/01/08.04.15)**:
  - Redesigned `DigitalCertificate.jsx` to pixel-perfectly match the official SVCE physical certificate layout.
  - Extracted and integrated the high-resolution circular SVCE college seal emblem (`/svce_seal.png`).
  - Implemented exact 8-row black-bordered clearance grid featuring Student Details, Branch, Section & Roll No, Department Library, Faculty Advisor, HOD Signature banner, Accounts Section, Central Library, and Student Signature.
  - Integrated bottom mandatory institutional legal notice: `"DUES, IF ANY ARISES, WILL BE COMMUNICATED AT THE APPROPRIATE TIME"`.
  - Embedded high-res QR code linking to `/verify/:token` for instant smartphone camera verification against the tamper-evident registry.
- **Flexible Multi-Identifier Authentication**:
  - Upgraded authentication engine in `authController.login` to support login by Register Number/Employee ID (e.g. `EMP-FA-IT-03`), College Email (e.g. `ranjith.v@svce.ac.in`), Full Name (e.g. `V.Ranjith`), or First Name (e.g. `Ranjith`).
  - Reset and synchronized default passwords for all 110 institutional users and faculty advisors to `Svce@2026!`, clearing legacy lockouts.
- **Root Directory Cleanup & Simplification**:
  - Relocated database setup guides and SQL workbench assets into `docs/` (`docs/MYSQL_WORKBENCH_GUIDE.md`, `docs/mysql_workbench_setup.sql`).

## [3.2.0-qa-security-documentation-vapt] - 2026-10-04

### Added
- **Comprehensive Unit & Integration Test Suite (`server/tests/comprehensiveUnitAndIntegration.test.js`)**:
  - 25 extensive unit and integration tests verifying the full lifecycle of the clearance state machine.
  - Stage-transition logic: Valid sequential progression, blocking skipped stages, and 404 handling on nonexistent requests/departments.
  - Configurable fine calculations: Overdue fine matrix verification with zero-fine grace periods, daily rates, and maximum fee ceiling enforcement.
  - Token and HMAC generation: 192-bit CSPRNG token verification, HMAC-SHA256 signature sensitivity against canonical tuple alteration, and verification URL rendering.
  - SLA tracking and metrics: Turnaround elapsed hours computation, SLA breach detection against stage thresholds, median turnaround calculation, and automated bottleneck stage detection.
  - Centralized error handler verification: CORS preflight origin rejection (403), payload size limit (413), malformed JSON syntax (400), Multer file handling (400), and production database error masking (500).
  - Integration workflow: Full clearance sequence for student `IT2024002` across all 6 clearance stages, hold-resubmit-approve cycle, stage reopening with cascading downstream resets, certificate revocation, and complaint delegation/escalation.
- **Exhaustive Role-Based Authorization & Negative Access Control Tests (`server/tests/roleNegativeAuthorization.test.js`)**:
  - 45 automated negative authorization tests validating zero unauthorized access.
  - Unauthenticated 401 Unauthorized assertions across 17 distinct API endpoints.
  - Role-based 403 Forbidden assertions preventing Students, Faculty Advisors, Department Library Officers, Finance Officers, and DPCs from accessing unauthorized endpoints.
  - Administrative login rejection (403 Forbidden) for deactivated user accounts.
- **Playwright End-to-End Browser Test Suite (`tests/e2e/clearance_lifecycle.spec.js`, `playwright.config.js`)**:
  - Dual-server browser test orchestration spinning up Express backend (port 5000) and Vite PWA frontend (port 3000) with Microsoft Edge.
  - Student Journey: Authentication, clearance pipeline inspection, and department borrow record viewing.
  - Officer Review Journey: Department library officer login, queue inspection, and approval workflow.
  - HOD Executive Sign-off Journey: Direct single credentials authentication and approval desk navigation.
  - Public Certificate Verification: Scanning QR URL, validating authentic certificates with live HMAC check, and testing token rejection for invalid links.
- **Institutional Single Direct Authentication Streamlining**:
  - Removed multi-factor authentication (MFA / TOTP) per college institutional requirements.
  - All users (Students, Faculty Advisors, Department Officers, Finance, HOD, and Administrators) authenticate directly in a single step using institutional credentials.
  - Updated frontend `LoginPage.jsx` and `AuthContext.jsx` to eliminate MFA challenge states, rendering a clean, responsive single login form.
  - Reset `mfa_enabled = 0` and cleared `mfa_secret = NULL` across all database user records.
  - Updated all test suites and Playwright E2E journeys to reflect direct single-step authentication.
- **Pilot Metrics Engine & CSV Exporter (`server/src/scripts/pilot_metrics_report.js`)**:
  - Real-time empirical analysis tool computing turnaround time per stage, median latency, stage bottleneck detection, hold and rejection rates, and SLA breach frequency.
  - Generates detailed CLI terminal summaries and automated CSV export (`server/logs/pilot_metrics_report.csv`).
- **Institutional Publication Documentation & PDF Compilation (`docs/SVCE_No_Dues_Project_Documentation.md`, `SVCE_No_Dues_Project_Documentation.pdf`, `server/src/scripts/build_docs_html.js`)**:
  - 12-section technical and operational manual covering system architecture, HMAC-SHA256 tuple signing, hash-chained audit trails, least-privilege RBAC, deployment guides, disaster recovery runbooks, DPDP Act 2023 compliance, incident response plan, administrator guide, officer guide, and student FAQ.
  - Corrected `http://localhost:3000` URLs and replaced unsubstantiated marketing metrics with pilot-measured benchmarking.
  - Explicit institutional distinction emphasizing that the No-Dues Clearance Certificate is an internal clearance document strictly separate from Anna University Degree Certificates.
  - Compiled into a 517.6 KB institutional PDF via headless browser printing.
- **Production Security Documentation (`docs/SECURITY_CHECKLIST.md`, `docs/VAPT_READINESS_REPORT.md`, `docs/VAPT_SCOPE_DOCUMENT.md`, `docs/GO_LIVE_CHECKLIST.md`)**:
  - Security checklist covering authentication, authorization, session management, cryptographic controls, database security, input handling, and infrastructure.
  - VAPT readiness report mapping OWASP Top 10 vulnerabilities, residual risks RR-01 to RR-04 with remediation timelines, and automated test proof.
  - VAPT tester scope document defining target domains, authorized test personas, testing boundaries, and CVSS reporting SLAs.
  - One-page pre-launch go-live checklist with 10 critical operational readiness gates.
  - Verified zero usage of prohibited terms across all documentation and reports.

## [3.1.0-devops-observability-hardening] - 2026-10-04

### Added
- **Production Containerization & Deployment Orchestration (`docker-compose.prod.yml`, `docker-compose.dev.yml`, `server/Dockerfile`, `client/Dockerfile`)**:
  - Hardened multi-stage Dockerfile for backend on `node:20-alpine` with non-root least-privilege user (`USER node`), automated liveness healthcheck (`wget -qO- http://localhost:5000/health`), and stripped development dependencies.
  - Hardened multi-stage client Dockerfile on `node:20-alpine` (builder) and `nginx:1.25-alpine` (runner) with embedded healthcheck.
  - Complete local development compose stack (`docker-compose.dev.yml` and root `docker-compose.yml`) provisioning healthchecked MySQL 8, live source mounting, and developer networking with zero committed secrets.
  - Production multi-container compose architecture (`docker-compose.prod.yml`) featuring network-isolated internal MySQL backend, persistent volumes (`nodues_prod_db_data`, `nodues_prod_uploads`, `nodues_prod_logs`, `nodues_prod_backups`), tuned MySQL buffers (`--max-connections=200 --innodb-buffer-pool-size=512M`), and container JSON-file log rotation (`max-size: 50m`, `max-file: 5`).
  - Production Nginx reverse proxy configuration (`deploy/nginx/nginx.conf`, `deploy/nginx/conf.d/svce_nodues.conf`) with HTTP-to-HTTPS 301 permanent redirect, TLS 1.3/1.2 modern cipher suite, strict HSTS (`max-age=31536000; includeSubDomains; preload`), Gzip level 6 compression, reverse proxy client IP headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`), dedicated unbuffered long-lived SSE streaming (`/api/sse`), and 10MB payload limit for student document uploads.
  - Development self-signed TLS certificate generation script (`deploy/generate_dev_certs.js`).
  - Production deployment guides: `docs/DEPLOYMENT_CAMPUS.md` for on-premises campus physical servers / intranet hypervisors, and `docs/DEPLOYMENT_CLOUD.md` for cloud VMs (AWS EC2 / GCP / DigitalOcean) with automated Let's Encrypt Certbot renewal.
- **Enterprise Observability & Privacy-Preserving Logging (`server/src/utils/logger.js`, `server/src/middleware/errorHandler.js`, `server/src/scripts/rotate_logs.js`)**:
  - Pino structured JSON logging enhanced with expanded PII and secret redaction (`student_phone`, `parent_phone`, `student_email`, `aadhaar`, `ctc_package`, `passwords`, `tokens`, `mfa_secrets`, `totpCode`, `refreshTokens`).
  - Request ID correlation tracing (`X-Request-ID`) auto-propagated across all request logs and response headers.
  - Centralized production error handler hardened to strictly suppress stack traces, query structures, and database internal error codes (`err.sql`, `err.sqlMessage`, `ER_*`) in production mode.
  - Automated production log rotation script (`server/src/scripts/rotate_logs.js`) with gzip compression and 14-day retention pruning, alongside Linux host logrotate specification (`deploy/logrotate.conf`).
- **Disaster Recovery, Automated Encrypted Backup & Restore (`server/src/scripts/backup.js`, `server/src/scripts/restore.js`, `docs/BACKUP_AND_RESTORE.md`)**:
  - Automated daily backup utility executing atomic `--single-transaction --quick --routines --triggers --events` mysqldump and packaging the `uploads/` directory into an encrypted archive using AES-256-CBC with PBKDF2 (100,000 iterations) and HMAC-SHA256 integrity authentication, with automated 30-day retention pruning.
  - Disaster recovery restoration drill script verifying HMAC integrity, decrypting, gunzipping, and restoring database records and document uploads, with post-restore verification confirming table records and cryptographic audit chain validity.
  - Documented disaster recovery guide (`docs/BACKUP_AND_RESTORE.md`) defining RPO (<24h), RTO (<15min), and restore drill logs.
- **SSE Hardening & 500-User Concurrency Benchmark (`server/src/config/db.js`, `server/tests/semester_end_load_test.js`)**:
  - Tuned MySQL connection pool parameters for peak semester-end clearance traffic (`DB_CONNECTION_LIMIT=50`, `DB_MAX_IDLE=25`, `idleTimeout=60000`).
  - Autocannon 500-concurrent-user load benchmark simulating peak semester-end clearance traffic: achieved 2,053.4 requests/second, 24,637 requests handled in 12s, 0 non-2xx responses, p50 latency 375ms, p95 latency 1,248ms, and 100% pool stability.
- **Automated CI/CD Pipeline (`.github/workflows/ci.yml`)**:
  - Multi-stage GitHub Actions workflow executing syntax validation, MySQL 8 service container integration testing (running all 14 Jest test suites and 101 tests), npm dependency security auditing, Gitleaks secret scanning, Vite PWA client production compilation, and Docker multi-container builds.
- **Frontend Hardening & Accessibility (`client/vite.config.js`, `client/src/context/AuthContext.jsx`, `client/src/components/common/ErrorBoundary.jsx`, `client/src/pages/LoginPage.jsx`)**:
  - Removed all `console.log` and `console.info` statements in client source code and configured `esbuild: { drop: ['console', 'debugger'] }` for production bundle compilation.
  - Configured Workbox PWA service worker caching rules to enforce strict `NetworkOnly` policies for `/api/.*` and `/uploads/.*`, guaranteeing authenticated student records and uploaded documents are never cached locally.
  - Implemented complete CacheStorage (`caches.delete(...)`) and `sessionStorage.clear()` purge on user logout.
  - WCAG 2.1 AA accessibility pass on `LoginPage.jsx` (explicit `id`, `htmlFor` label associations, `aria-required`, `aria-live` polite alert regions, `autoComplete` attributes, and `aria-label` for toggle controls).
  - Sanitized React `ErrorBoundary.jsx` to prevent technical stack trace exposure in production builds.

## [3.0.0-admin-bulk-fines-complaints] - 2026-10-04

### Added
- **ADMIN Role & Management Console (`server/src/controllers/adminController.js`, `client/src/pages/AdminDashboard.jsx`)**:
  - New `admin` superuser role with mandatory TOTP Multi-Factor Authentication.
  - User Directory Management: Create users with role-specific profile records, edit profiles and role assignments, toggle account activation (active/deactivated), unlock locked accounts (resetting `failed_login_attempts` and clearing `locked_until`), and force password reset on next login.
  - System Settings Management: Dynamically configure fine rules (rate per day, grace days, max cap), payment gateway mode, and registration flags with atomic persistence in `system_settings`.
  - Embedded Cryptographic Audit Log Viewer (`client/src/components/common/AuditLogsViewer.jsx`) with dedicated "Tamper Check" button that executes SHA-256 chain verification across `system_audit_logs` and `nodues_audit_logs`.
  - Immutable audit logging for all administrative actions with cryptographic hash chaining.
- **Bulk Data Ingestion with Dry-Run Validation (`server/src/controllers/bulkImportController.js`, `server/src/utils/csvTemplates.js`)**:
  - CSV upload support for students, staff, and library borrow records with 5MB upload limit enforced by Multer.
  - Robust quoted CSV parser with RFC 4180 compatibility.
  - Dry-run validation preview returning total rows, valid counts, preview rows, and downloadable per-row error reports without mutating the database.
  - Idempotent upsert logic: students keyed by `register_number`, staff keyed by `employee_id`, and borrow records keyed by `(register_number, book_id, issue_date)`.
  - Downloadable sample CSV templates for all three supported entities.
- **Stage Reopening Workflow (`server/src/utils/workflowHelper.js`, `server/src/controllers/reopenController.js`)**:
  - Dedicated endpoint `POST /api/nodues/reopen-stage` allowing stage officer or HOD/Admin to reopen a previously approved stage.
  - Mandatory reason validation (minimum 5 characters) for accountability.
  - Cascading resets: automatically resets all downstream dependent stages to `Pending` and recalculates overall progress percentage.
  - Automatic certificate revocation: issued clearance certificate is immediately marked `Revoked`, cryptographic tokens cleared, and revocation reasons recorded.
  - Dispatches notifications to student and advisor, and appends cryptographically hash-chained audit log in `nodues_audit_logs`.
- **Configurable Fines & Vendor-Agnostic Payment Gateway (`server/src/utils/fineCalculator.js`, `server/src/services/paymentGateway.js`, `server/src/controllers/finePaymentController.js`)**:
  - Dynamic fine calculation engine removing hardcoded values and pulling active rates from `system_settings` (`fine_rate_per_day`, `fine_grace_days`, `fine_cap_amount`).
  - Officer receipting workflow: authorized officers (`library_staff`, `finance`, `admin`) record fines as Paid with mandatory receipt number, payment method, and timestamp.
  - Vendor-agnostic payment gateway abstraction (`PaymentGatewayInterface`) and `MockPaymentGateway` providing cryptographic HMAC-SHA256 signature generation and timing-safe verification.
  - Student online checkout session initiation and signature verification with audit logging.
- **Unified Complaint Desk (`server/src/controllers/complaintController.js`)**:
  - Automated category-based department routing (Department Library, Central Library, DPC, Finance, Faculty Advisor, HOD, General).
  - Assignee tracking and assignment access control restricting ticket reassignments to authorized department officers, HOD, and Admin.
  - Status lifecycle audit trail stored in `complaint_status_history` table (`Open` -> `In Progress` -> `Resolved` / `Closed` / `Rejected`).
  - Resolution timestamps (`resolved_at`) and formal resolution reply tracking.
  - Granular access control: students view only their tickets; officers view department/assigned tickets; HOD and Admin have institutional overview.
- **Database Migrations (Idempotent UP/DOWN)**:
  - `006_admin_settings_fines_complaints.up.sql` / `.down.sql`:
    - Users role ENUM extended to include `'admin'`; added `is_active TINYINT(1) DEFAULT 1`.
    - `system_settings` table created with default fine policies.
    - `borrow_records` extended with `receipt_number`, `paid_at`, `paid_by`, `payment_method`, `payment_reference`.
    - `complaints` extended with `department`, `assigned_to_user_id`, `assigned_to_role`, `resolved_at`.
    - `complaint_status_history` table created.
- **Comprehensive Automated Test Suites (5 new suites, 34 new tests; total 13 suites, 93 tests)**:
  - `tests/adminAndMfa.test.js`: Admin login with mandatory MFA, user directory listing, account unlocking, password reset forcing, deactivation login block (403), and settings CRUD.
  - `tests/bulkImport.test.js`: Template downloads, dry-run schema validation, idempotent upsert execution, and 5MB size limit rejection.
  - `tests/stageReopening.test.js`: Reopen authorization, missing reason rejection, cascading stage reset, certificate revocation, and audit chain verification.
  - `tests/configurableFinesAndPayment.test.js`: Dynamic rule retrieval, grace period and cap calculations, officer receipting, IDOR prevention, and mock payment signature verification.
  - `tests/complaintDesk.test.js`: Category routing, cross-department access control, ticket assignment, and full status lifecycle history.

## [2.1.0-authorization-workflow-dpdp] - 2026-10-04

### Added
- **Centralized Authorization & IDOR Protection (`server/src/middleware/authorizeResource.js`)**:
  - `requireRequestOwnership`: Ensures students access only their own requests, files, audit logs, and complaints.
  - Department and cohort scoping: Restricts Department Officers (`library_staff`, `dpc`, `hod`) to requests within their department.
  - Advisee roster verification: Ensures `faculty_advisor` can access and approve only assigned advisees.
  - Clearance officer access for Central Library and Finance officers across all departments.
- **Server-Side Sequential Workflow Enforcement (`server/src/utils/workflowHelper.js`)**:
  - Enforced strict 6-stage clearance hierarchy: 1. Dept Library -> 2. DPC -> 3. Central Library -> 4. Faculty Advisor -> 5. Finance -> 6. HOD.
  - Concurrency locking with `SELECT ... FOR UPDATE` row locks inside DB transactions on all stage transitions (`executeStageTransition`), preventing double-approval race conditions.
  - Valid stage transition state machine: `Pending` -> `In Progress` -> `Approved` / `Rejected` / `Hold` -> `Resubmit`.
  - Automated certificate token and HMAC issuance atomically executed upon final Stage 6 (HOD) sign-off.
- **DPDP Act 2023 Compliance & Privacy Preserving Architecture**:
  - Consent tracking engine (`consent_records` table and `consentController.js`) recording explicit opt-in purposes (`geolocation_telemetry`) with policy versioning and one-click revocation.
  - Deprecated and removed external 3rd-party geocoding and IP services (`BigDataCloud`, `ipwho.is`). Default auditing strictly relies on local IP + User-Agent headers.
  - Opt-in GPS telemetry with coarse coordinate rounding (~2 decimals, ~1.1km accuracy) preventing residential geolocation tracking.
  - User-facing Privacy Notice page (`/privacy` mounted in `client/src/pages/PrivacyNoticePage.jsx`).
  - Configurable audit log retention purging job (`server/src/scripts/purge_audit_logs.js` and `POST /api/admin/audit-logs/purge`).
- **Data Masking & Privacy Sanitization (`server/src/utils/dataMasking.js`)**:
  - Masking utilities: `maskPhone` (preserves first 2 and last 3 digits), `maskEmail` (masks username portion), `maskCTC` (`[Confidential - Placement/Student Only]`).
  - Sensitive field sanitization across student profile and request queries based on actor role and request ownership.
- **Append-Only Cryptographic Audit Log Chaining (`server/src/utils/auditChain.js`)**:
  - SHA-256 hash chaining on both `nodues_audit_logs` and `system_audit_logs` via `previous_hash` and `entry_hash`.
  - Independent CLI verification script (`server/src/scripts/verify_audit_chain.js`) and administrative verification endpoint (`GET /api/audit-logs/verify`).
  - Updated least-privilege script (`docs/LEAST_PRIVILEGE_USER.sql`) to document revoking `UPDATE` and `DELETE` on audit log tables for `svce_app`.
- **Database Migrations (Idempotent UP/DOWN)**:
  - `004_integrity_indexes_and_constraints`: Composite performance indexes and unique constraint `uq_active_request_per_year` on virtual column `active_request_slot` preventing multiple active requests per academic year.
  - `005_audit_hash_chaining_and_consent`: `consent_records` table and hash chaining columns (`previous_hash`, `entry_hash`).
- **Comprehensive Automated Test Suites**:
  - `tests/idorAndAuthorization.test.js`: Cross-user student IDOR, cross-department officer boundaries, and advisee roster authorization tests expecting 403/404.
  - `tests/workflowAndConcurrency.test.js`: 6-stage order enforcement, out-of-order rejection, concurrent race condition locking, and end-to-end clearance completion.
  - `tests/dpdpAndAuditChain.test.js`: DPDP consent grant/retrieval/revocation, retention purging, field masking, cryptographic hash verification, and DB tampering detection.

## [2.0.0-security] - 2026-10-02

### Added
- **Fail-Fast Environment Validation (`server/src/config/env.js`)**:
  - Enforced strict validation of critical secrets (`JWT_SECRET`, `CERT_HMAC_KEY`, `SESSION_SECRET`, `DB_PASSWORD`).
  - Minimum 32-byte cryptographic entropy checks.
  - Rejection of default/insecure passwords (`root`, `admin`, `password`, `123456`) in production environments.
- **Least-Privilege Database Script (`docs/LEAST_PRIVILEGE_USER.sql`)**:
  - Provisioning of dedicated non-root MySQL application user `svce_app` granted only `SELECT`, `INSERT`, `UPDATE`, `DELETE` on `svce_nodues.*`.
- **JWT & Token Management Architecture**:
  - Access token lifetime reduced to 1 hour.
  - Refresh token rotation (RTR) with cryptographic hashes stored in the `refresh_tokens` table.
  - Automatic detection of compromised/replayed refresh tokens with cascade revocation.
  - Token revocation on logout (`POST /api/auth/logout`).
- **Multi-Factor Authentication (MFA / TOTP)**:
  - Time-Based One-Time Password (TOTP) enforcement for sensitive administrative roles (`HOD`, `Finance`).
  - QR code generation and verification endpoints (`POST /api/auth/mfa/setup`, `POST /api/auth/mfa/verify`).
- **NIST SP 800-63B Compliant Password Policy & Self-Service Reset**:
  - Enforcement of password complexity rules (10+ characters, mixed case, numbers, special characters).
  - Common breached password detection blocklist.
  - `must_change_password` flag enforcement blocking non-exempt routes until a compliant password is set.
  - Single-use, time-limited (15-min) SHA-256 hashed password reset tokens via `password_resets` table.
  - Anti-enumeration protection on authentication and password recovery endpoints.
- **Account Lockout & Rate Limiting**:
  - IP-based rate limiting on sensitive routes (authentication, verification, API endpoints).
  - Account lockout policy locking credentials for 15 minutes after 5 consecutive failed login attempts.
- **Cryptographically Signed Digital Certificates**:
  - Base64url random certificate verification tokens (192-bit entropy).
  - HMAC-SHA256 digital signature computation over `(certificate_number, register_number, issue_date, request_id)` using `CERT_HMAC_KEY`.
  - Public verification endpoint (`GET /api/verify/:token`) with data minimization (exposes only institutional clearance metadata and omits private contacts and internal staff identifiers).
  - Certificate revocation and versioned re-issuance capabilities restricted to HOD role with audit logging.
- **Secure File Storage & Access Control**:
  - File upload validation with MIME and Magic Byte signature detection (PDF, JPEG, PNG).
  - Storage directory placed outside web document root with random UUID filenames.
  - Secure authenticated stream endpoint (`GET /api/files/:fileId`) enforcing granular role and ownership checks.
  - EXIF metadata stripping and resizing for avatar images via `sharp`.
  - Anti-malware scanning pipeline (`server/src/utils/malwareScanner.js`) supporting ClamAV and heuristic signatures.
  - Immutable audit logging for file downloads in `file_access_logs`.
- **Automated Database Migration Framework**:
  - Migration script `server/src/scripts/migrate.js` with forward and rollback (`up`/`down`) support.
  - Idempotent migration `001_security_hardening.js` provisioning security columns and indexes.
- **Comprehensive Automated Test Suites**:
  - `tests/config.test.js`: Environment and fail-fast validation.
  - `tests/jwtAndMfa.test.js`: JWT lifecycle, refresh token rotation, TOTP MFA, and password reset flows.
  - `tests/rateLimitingAndLockout.test.js`: Rate limit headers, failed login tracking, and account lockout.
  - `tests/fileUploads.test.js`: Magic bytes validation, authorized downloads, role checks, and photo EXIF stripping.
  - `tests/certificateIntegrity.test.js`: 192-bit tokens, HMAC verification, public data minimization, revocation, and re-issuance.

### Changed
- Removed exposed hardcoded credentials and quick-fill demo cards from frontend `LoginPage.jsx`.
- Hardened database connection configuration to enforce secure timeouts and parameterized queries across all database calls.
- Updated digital certificate component and public verification page to display cryptographic seal and status.

### Security
- Resolved critical findings identified in security audit `docs/AUDIT.md`.
- Zero raw plaintext storage of sensitive tokens or credentials in logs, database, or error responses.

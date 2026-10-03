# SECURITY & ARCHITECTURAL AUDIT REPORT: SVCE SMART NO-DUES ERP

**Document Version:** 1.0.0  
**Audit Date:** October 2, 2026  
**Auditor:** Senior Full-Stack Engineer & Application Security Reviewer  
**Target Application:** SVCE Smart No-Dues Clearance ERP  
**Target Repository:** `sharveshcm2940/No-Dues-Smart-SVCE` (Branch: `CM`)  
**Technology Stack:**
- **Frontend:** React 18, Vite 5, Tailwind CSS, Vite PWA Plugin, Axios, Chart.js, QRCode.react (`/client`)
- **Backend:** Node.js 18, Express 4.19, `mysql2/promise` (Pool), JWT, bcryptjs (`/server`)
- **Database:** MySQL 8.0+ / MariaDB 10.4+, Schema `svce_nodues`
- **Real-Time Layer:** Server-Sent Events (SSE) via `/api/sse`
- **Workflow:** 6-Stage Sequential Clearance (Dept Library -> Placement/DPC -> Central Library -> Faculty Advisor -> Finance -> HOD)
- **Roles (7):** `student`, `library_staff`, `faculty_advisor`, `hod`, `dpc`, `finance`, `main_library_staff`

---

## 1. ARCHITECTURE SUMMARY

### 1.1 Routing Architecture
The backend application is structured around a single Express root app ([server/src/server.js](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L1-L84)) which mounts:
- Core API Routes: `/api/*` handled by [server/src/routes/api.js](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L1-L362).
- Health Check: `/health` ([server/src/server.js:L32-L39](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L32-L39)) exposing system metadata, active SSE connections, and timestamp.
- Single-Command Production SPA Serving: `app.use(express.static(clientBuildPath))` and wildcard `app.get('*')` ([server/src/server.js:L42-L52](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L42-L52)) serving the Vite production build from `client/dist`.

A dead routing module exists at [server/src/routes/dpcRoutes.js](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/dpcRoutes.js#L1-L10) which imports undefined middleware functions (`verifyToken`, `checkRole`) but is never mounted in `server.js`.

### 1.2 Middleware Pipeline
1. **Helmet:** Configured as `app.use(helmet({ contentSecurityPolicy: false }))` ([server/src/server.js:L18-L20](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L18-L20)). Content Security Policy (CSP) is explicitly disabled.
2. **CORS:** Configured with `origin: true, credentials: true` ([server/src/server.js:L21-L24](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L21-L24)), reflecting any incoming `Origin` header and allowing credentialed cross-origin requests from any site.
3. **Body Parsers:** `express.json({ limit: '10mb' })` and `express.urlencoded({ extended: true })` ([server/src/server.js:L25-L26](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L25-L26)). The large 10MB limit accommodates client-side Base64 Data URL file submissions.
4. **Authentication (`authenticateToken`):** Validates Bearer JWTs extracted from the `Authorization` header against `process.env.JWT_SECRET` (with a hardcoded fallback) ([server/src/middleware/auth.js:L5-L20](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/middleware/auth.js#L5-L20)). Decoded payload (`id`, `username`, `role`, `email`, `profileId`, `register_number`) is assigned to `req.user`.
5. **Role Authorization (`authorizeRole`):** Validates `req.user.role` against an array of allowed roles ([server/src/middleware/auth.js:L22-L32](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/middleware/auth.js#L22-L32)). Returns HTTP 403 upon mismatch.

### 1.3 Database Schema & Tables
All relational entities reside in MySQL 8 under schema `svce_nodues` ([server/mysql_schema.sql](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql)):
1. `users`: Credentials, username (Register No / Employee ID), bcrypt password hash, role enum, email.
2. `students`: Extended student profile (register number, id card number, year, section, advisor details, hall ticket state).
3. `library_staff`: Department Library officer profile.
4. `main_library_profile`: Central Library officer profile.
5. `finance_profile`: Finance & accounts section clearance officer profile.
6. `faculty_advisors`: Faculty Advisor profiles, mapped to assigned batches.
7. `hod_profile`: Head of Department executive profile.
8. `dpc_profile`: Department Placement Coordinator profile.
9. `books`: Library catalogue (book IDs, ISBNs, shelf numbers, copies).
10. `borrow_records`: Book borrowing transactions, dues, fines (`Issued`, `Returned`).
11. `nodues_requests`: Master clearance application (register number, career pathway fields, base64 document URLs, status, progress, certificate number).
12. `nodues_stages`: Child stage approval states (request ID, department name, order 1-6, status `Pending`/`Approved`/`Rejected`/`Hold`/`Locked`).
13. `nodues_audit_logs`: Detailed clearance transition audit trail with actor name, role, timestamps, and remarks.
14. `system_audit_logs`: Enterprise system audit log recording logins, logouts, device names, device types, locations, and IPs.
15. `complaints`: Student grievance ticketing system.
16. `announcements`: Broadcast department announcements.
17. `notifications`: In-app recipient alert store.
18. `hall_ticket_audit_logs`: Historical audit trail for hall ticket release actions.
19. `library_metrics`: Singleton aggregate metrics cache.

### 1.4 How Stage Transitions Work
Clearance progression is driven by the state engine in [server/src/utils/workflowHelper.js:L12-L205](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L12-L205) (`updateRequestProgress`):
1. **Parallel Phase 1 (Initial Approvals):**
   - DPC (Stage 1), Department Library (Stage 2), and Central Library (Stage 3) receive the application simultaneously.
   - Non-4th year students are automatically granted auto-cleared status for DPC ([workflowHelper.js:L33-L43](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L33-L43)).
   - Overall progress moves from 15% (0 approvals) up to 45% (all 3 approved).
2. **Phase 2 (Finance Clearance - Stage 4):**
   - Unlocked only when DPC, Central Library, and Department Library are all `Approved` ([workflowHelper.js:L81-L105](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L81-L105)). Progress increments to 50%.
3. **Phase 3 (Faculty Advisor Clearance - Stage 5):**
   - Unlocked only when Finance is `Approved` ([workflowHelper.js:L107-L135](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L107-L135)). Progress increments to 75%.
4. **Phase 4 (HOD Final Executive Clearance - Stage 6):**
   - Unlocked only when Faculty Advisor is `Approved` ([workflowHelper.js:L137-L166](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L137-L166)). Progress reaches 90% when pending HOD sign-off.
5. **Completion & Certificate Generation:**
   - When HOD approves, overall status transitions to `Approved`, progress reaches 100%, and an official certificate number is assigned ([workflowHelper.js:L174-L184](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L174-L184)).
6. **Rejection Handling:**
   - Any rejecting stage sets `overall_status = 'Rejected'` and freezes progression ([workflowHelper.js:L46-L60](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L46-L60)).
   - Targeted re-submission via `POST /api/student/resubmit-nodues` ([studentController.js:L460-L562](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L460-L562)) flips ONLY the rejected stage back to `Pending` without resetting already approved stages.

### 1.5 How Files Are Uploaded and Served
- **Upload Mechanism:** The server uses **no multipart/form-data parser** (no Multer, Busboy, or Formidable). File uploads (offer letters, higher studies scorecards, competitive exam admit cards, pitch decks) are handled purely on the client side via browser `FileReader.readAsDataURL(file)` ([client/src/components/student/NoDuesTracker.jsx:L146-L152](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/components/student/NoDuesTracker.jsx#L146-L152)).
- **Transfer & Storage:** The resulting raw Base64 Data URLs (e.g., `data:application/pdf;base64,...`) are transmitted inside standard JSON request payloads and inserted into MySQL columns typed as `TEXT` in `nodues_requests` ([server/mysql_schema.sql:L197-L200](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L197-L200)).
- **Serving:** Files are not served as static assets from disk or an S3 bucket. They are read from the database row as strings, included in the dashboard JSON response, and rendered directly in client anchors via `<a href={r.offer_letter_url} download=...>` ([client/src/pages/DPCDashboard.jsx:L207-L209](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/pages/DPCDashboard.jsx#L207-L209)).

### 1.6 How Certificates and Hashes Are Generated
- **Generation Logic:** Certificate numbers are generated upon final HOD approval in [server/src/utils/workflowHelper.js:L176-L178](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L176-L178):
  ```javascript
  certNo = `CERT-SVCE-IT-2026-${String(requestId).padStart(4, '0')}`;
  ```
- **Hash / Entropy:** **No cryptographic hash, digital signature, or entropy exists.** The certificate identifier is completely deterministic, sequential, and predictable based on the integer auto-increment `requestId`.
- **QR Code Content:** In [client/src/components/student/DigitalCertificate.jsx:L52-L61](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/components/student/DigitalCertificate.jsx#L52-L61), the QR code encodes a raw plaintext JSON string:
  ```json
  {
    "institution": "Sri Venkateswara College of Engineering (SVCE)",
    "department": "Information Technology",
    "certificateNumber": "CERT-SVCE-IT-2026-0001",
    "studentName": "...",
    "registerNumber": "...",
    "idCardNumber": "...",
    "status": "VERIFIED_CLEARED_NO_DUES",
    "dateOfIssue": "..."
  }
  ```
- **Verification Endpoint:** **There is NO public or server-side verification endpoint.** The QR code does not point to an HTTPS verification URL.

### 1.7 How Login Geolocation Is Captured
- **Client Acquisition:** During authentication in [client/src/services/locationService.js](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/services/locationService.js#L96-L210), the browser requests GPS coordinates via `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })`.
- **Third-Party Geocoding:** 
  1. Primary: Coordinates are sent to BigDataCloud's free reverse-geocoding API (`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=...&longitude=...`) to resolve locality, city, district, and state.
  2. Fallback: If GPS permission is denied or fails, an unauthenticated call is made to `https://ipwho.is/` to extract IP geolocation.
- **Transmission:** The client attaches headers `x-client-location`, `x-device-name`, and `x-device-type` to outgoing API requests via Axios request interceptors ([client/src/services/api.js:L11-L19](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/services/api.js#L11-L19)).
- **Backend Ingestion:** [server/src/utils/auditLogger.js:L15-L99](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/auditLogger.js#L15-L99) decodes these headers and stores them directly into `system_audit_logs`. If headers are omitted, the server makes its own call to `https://ipwho.is/`.

---

## 2. DETAILED AUDIT FINDINGS

| Item | Status | Evaluation & References |
|---|:---:|---|
| **Secrets and Default Credentials** | **MISSING** | • `JWT_SECRET` has a committed plaintext fallback in code: `'svce_college_nodues_enterprise_secret_key_2026'` ([server/src/middleware/auth.js:L3](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/middleware/auth.js#L3)).<br>• `.env.example` contains the production key `JWT_SECRET=svce_college_nodues_secure_jwt_token_key_2026_super_secret` ([server/.env.example:L5](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/.env.example#L5)).<br>• `docker-compose.yml` hardcodes `JWT_SECRET=svce_nodues_secure_jwt_secret_2026` ([docker-compose.yml:L18](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/docker-compose.yml#L18)).<br>• Every seeded account (students, HOD, FAs, DPC, Finance, Library) shares the identical default password `'password123'` ([server/mysql_schema.sql:L323-L448](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L323-L448)).<br>• Bulk student registration automatically assigns `'password123'` ([server/src/controllers/hodController.js:L276](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L276)).<br>• The public login page displays 13 quick-fill buttons allowing instant one-click login into HOD, DPC, FA, Finance, and Student accounts ([client/src/pages/LoginPage.jsx:L64-L78](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/pages/LoginPage.jsx#L64-L78)). |
| **Rate Limiting, Lockout, Helmet, CORS, HTTPS** | **PARTIAL** | • **Rate Limiting:** `express-rate-limit` is in `package.json` ([server/package.json:L15](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/package.json#L15)) but is **completely unused**. Brute-force attacks against `POST /api/auth/login` are unrestricted.<br>• **Account Lockout:** MISSING. Failed logins do not increment an attempt counter or lock accounts.<br>• **Helmet:** ALREADY DONE but weakened: `app.use(helmet({ contentSecurityPolicy: false }))` disables CSP ([server/src/server.js:L18-L20](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L18-L20)).<br>• **CORS:** Insecure: `cors({ origin: true, credentials: true })` ([server/src/server.js:L21-L24](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L21-L24)) reflects any requesting origin.<br>• **HTTPS / Trust Proxy:** MISSING. Express has no SSL redirect or `trust proxy` setting ([server/src/server.js:L1-L27](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L1-L27)). |
| **Password Reset Flow & MFA** | **MISSING** | • **Password Reset:** MISSING. No forgot password endpoint, reset token generation, or verification mechanism exists. The UI modal is an informational placeholder instructing users to visit room IT-204 ([client/src/pages/LoginPage.jsx:L327-L343](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/pages/LoginPage.jsx#L327-L343)).<br>• **Password Complexity:** MISSING. `POST /api/auth/password` has no length or complexity checks ([server/src/controllers/authController.js:L127-L156](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/authController.js#L127-L156)).<br>• **MFA / 2FA:** MISSING. No TOTP, SMS, or email second-factor authentication for administrative or staff roles. |
| **Certificate Hash Generation & Verification** | **MISSING** | • **Hash Algorithm:** MISSING. Certificate identifiers are predictable sequential strings (`CERT-SVCE-IT-2026-0001`) with zero cryptographic entropy ([server/src/utils/workflowHelper.js:L177](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L177)).<br>• **Digital Signature:** MISSING. No HMAC, RSA, or ECDSA signature is embedded.<br>• **Public Verification Endpoint:** MISSING. No public `/api/verify/:certId` route exists. The QR code encodes raw client-side JSON ([client/src/components/student/DigitalCertificate.jsx:L52-L61](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/components/student/DigitalCertificate.jsx#L52-L61)). Anyone can forge a certificate QR code with arbitrary data. |
| **File Upload Validation, Storage, Access Control** | **MISSING** | • **Storage Location:** MISSING server filesystem/cloud storage. Files are converted into raw Base64 data URIs on the client ([client/src/components/student/NoDuesTracker.jsx:L146-L152](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/components/student/NoDuesTracker.jsx#L146-L152)) and stored in database `TEXT` columns ([server/mysql_schema.sql:L197-L200](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L197-L200)).<br>• **Database Buffer Truncation:** MySQL `TEXT` columns hold max 64KB. Uploading an 8MB document silently truncates or fails on strict mode.<br>• **Validation:** MISSING server-side validation. No MIME-type, magic bytes, or file extension verification. An attacker can submit `data:text/html` or malicious payloads via `offer_letter_url`.<br>• **Access Control:** All career documents are returned indiscriminately to DPC, HOD, and students in full JSON responses. |
| **Authorization & IDOR Vulnerabilities** | **PARTIAL** | • Middleware `authorizeRole` is present on most routes, but critical IDOR gaps exist across several endpoints (see Section 2.1 table below). |
| **Stage Order Enforcement & Transactions / Locks** | **PARTIAL** | • **Stage Order Enforcement:** Server-side approval checks exist in `processFinanceAction` ([financeController.js:L105-L121](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/financeController.js#L105-L121)), `processFAAction` ([faController.js:L108-L118](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L108-L118)), and `processHODAction` ([hodController.js:L128-L137](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L128-L137)). However, `Reject` and `Hold` actions **bypass all stage prerequisites**, permitting Finance or HOD to reject requests that haven't cleared earlier stages.<br>• **Transactions & Locking:** MISSING. Zero calls to `START TRANSACTION`, `COMMIT`, `ROLLBACK`, or `SELECT ... FOR UPDATE` anywhere in the backend. Concurrent requests will cause race conditions during state transitions. |
| **GPS / IP Capture & Third-Party Geocoding** | **PARTIAL** | • GPS coordinates and IP lookups are captured via `navigator.geolocation` and BigDataCloud / `ipwho.is` ([client/src/services/locationService.js:L43-L91](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/client/src/services/locationService.js#L43-L91)).<br>• **Spoofing Vulnerability:** Client-sent HTTP headers (`x-client-location`, `x-device-name`, `x-device-type`) are trusted without server verification ([server/src/utils/auditLogger.js:L17-L18](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/auditLogger.js#L17-L18), [L74-L77](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/auditLogger.js#L74-L77)).<br>• **Privacy / Third-Party Data Leakage:** Exact latitude and longitude coordinates are sent to external third parties (BigDataCloud and `ipwho.is`) without user consent banners or data processing agreements. |
| **Audit-Log Immutability, Indexes, Constraints** | **PARTIAL** | • **Indexes:** Indexes exist on `(username)`, `(device_type)`, and `(module)` in `system_audit_logs` ([server/mysql_schema.sql:L251-L253](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L251-L253)). However, composite indexes on `(action, created_at)` are MISSING, causing full-table scans for login log queries.<br>• **Immutability:** MISSING. No `BEFORE UPDATE` or `BEFORE DELETE` triggers exist. Logs can be modified or deleted directly by DB users.<br>• **Audit Deletion Flaw:** When a student cancels their request via `POST /api/student/cancel-nodues`, the code explicitly deletes all audit logs: `DELETE FROM nodues_audit_logs WHERE request_id = ?` ([studentController.js:L254](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L254)). Furthermore, foreign key `fk_audit_request` has `ON DELETE CASCADE` ([mysql_schema.sql:L232](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L232)), destroying history upon request deletion. |
| **Hardcoded IT-Department Assumptions** | **ALREADY DONE** *(Strictly hardcoded)* | • The entire database schema, queries, employee IDs (`EMP-HOD-IT-01`, `EMP-DPC-IT-01`), and certificates (`CERT-SVCE-IT-2026-`) assume the Information Technology (IT) department ([server/mysql_schema.sql:L35](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L35), [L63](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L63), [L188](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/mysql_schema.sql#L188); [workflowHelper.js:L177](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/workflowHelper.js#L177)).<br>• Multi-department support across other SVCE engineering branches (CSE, ECE, MECH, CIVIL) is MISSING. |
| **Notification Channels, Tests, Docker/CI, Logging** | **PARTIAL** | • **Channels:** Only database polling and SSE streams ([server/src/utils/sse.js](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/sse.js#L1-L88)) exist. Email (SMTP), SMS, and Web Push notifications are MISSING.<br>• **Tests:** MISSING. Zero automated test suites (no Jest, Supertest, Cypress, or Vitest) in `server/package.json` or `client/package.json`.<br>• **CI/CD:** MISSING. No `.github/workflows` directory exists.<br>• **Docker:** PARTIAL. `docker-compose.yml` mounts an obsolete `/app/data` sqlite volume, hardcodes JWT secrets, and lacks a MySQL container service definition ([docker-compose.yml:L1-L34](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/docker-compose.yml#L1-L34)).<br>• **Logging & Backups:** MISSING. Uses raw `console.log`; no Winston/Pino or log rotation. Automated database backup cron routines are absent. |

---

### 2.1 Complete Endpoint-by-Endpoint Authorization & IDOR Matrix

| Endpoint | Method | Middleware & Role Checks | IDOR / Access Control Risk | File & Line References |
|---|:---:|---|---|---|
| `/health` | `GET` | None (Public) | None. Exposes SSE client count and system name. | [server.js:L32-L39](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/server.js#L32-L39) |
| `/api/sse` | `GET` | None (Public connection) | **High:** Any client can connect without a token. Broadcast events with `targetUser = null` broadcast student and request identifiers to anonymous listeners. | [api.js:L19](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L19), [sse.js:L20-L27](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/utils/sse.js#L20-L27) |
| `/api/audit-logs` | `GET` | `authenticateToken` | Scoped by controller: non-HOD users see `(username = ? OR role = ?)`. HOD has department-wide visibility. | [api.js:L22](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L22), [auditLogController.js:L24-L32](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/auditLogController.js#L24-L32) |
| `/api/audit-logs` | `POST` | `authenticateToken` | **High (Audit Poisoning):** Any authenticated user can submit arbitrary `action`, `details`, and `module` to write fake audit events into `system_audit_logs`. | [api.js:L23](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L23), [auditLogController.js:L102-L122](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/auditLogController.js#L102-L122) |
| `/api/auth/login` | `POST` | None (Public) | **High:** No rate limiting or lockout protection; vulnerable to credential brute-forcing. | [api.js:L26](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L26), [authController.js:L7-L88](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/authController.js#L7-L88) |
| `/api/auth/me` | `GET` | `authenticateToken` | Safe. Fetches profile matching `req.user.id`. | [api.js:L27](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L27), [authController.js:L90-L125](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/authController.js#L90-L125) |
| `/api/auth/password` | `POST` | `authenticateToken` | Safe. Verifies `currentPassword` for `req.user.id`. Missing password strength validation. | [api.js:L28](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L28), [authController.js:L127-L157](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/authController.js#L127-L157) |
| `/api/auth/handover` | `POST` | `authenticateToken` | **High:** Does not revoke or invalidate existing active JWTs issued to the previous employee upon transfer. | [api.js:L29](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L29), [authController.js:L159-L224](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/authController.js#L159-L224) |
| `/api/student/dashboard` | `GET` | `authenticateToken`, `student` | Safe. Scoped strictly to `req.user.username` (Register No). | [api.js:L32-L37](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L32-L37), [studentController.js:L10-L90](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L10-L90) |
| `/api/student/request-nodues` | `POST` | `authenticateToken`, `student` | Safe. Scoped to `req.user.username`. Prevents multiple concurrent active requests. | [api.js:L39-L44](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L39-L44), [studentController.js:L93-L232](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L93-L232) |
| `/api/student/cancel-nodues` | `POST` | `authenticateToken`, `student` | **High (Audit Destruction):** Student can delete request record, which triggers `DELETE FROM nodues_audit_logs WHERE request_id = ?`, destroying all past audit history. | [api.js:L46-L51](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L46-L51), [studentController.js:L235-L263](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L235-L263) |
| `/api/student/resubmit-nodues` | `POST` | `authenticateToken`, `student` | Safe. Verifies `register_number = ?` ownership. Resets only the rejected stage. | [api.js:L53-L58](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L53-L58), [studentController.js:L460-L562](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L460-L562) |
| `/api/student/audit-logs/:requestId` | `GET` | `authenticateToken` only | **CRITICAL IDOR:** Missing `authorizeRole(['student'])` and **zero ownership check**. Any authenticated user can supply any `requestId` to inspect internal department remarks and audit trails. | [api.js:L60-L64](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L60-L64), [studentController.js:L565-L577](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L565-L577) |
| `/api/student/borrow-records` | `GET` | `authenticateToken`, `student` | Safe. Scoped to `req.user.username`. | [api.js:L66-L71](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L66-L71), [studentController.js:L266-L300](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L266-L300) |
| `/api/student/complaints` | `GET` | `authenticateToken`, `student` | Safe. Scoped to `req.user.username`. | [api.js:L73-L78](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L73-L78), [studentController.js:L303-L315](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L303-L315) |
| `/api/student/complaints` | `POST` | `authenticateToken`, `student` | Safe. Inserts complaint mapped to `req.user.username`. | [api.js:L80-L85](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L80-L85), [studentController.js:L317-L342](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L317-L342) |
| `/api/student/announcements` | `GET` | `authenticateToken` only | Safe. General read-only published announcements list. | [api.js:L87](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L87), [studentController.js:L345-L352](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L345-L352) |
| `/api/student/notifications` | `GET` | `authenticateToken` only | Safe. Queries targets matching authenticated user/emp ID. | [api.js:L88](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L88), [studentController.js:L355-L429](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L355-L429) |
| `/api/student/profile` | `PUT` | `authenticateToken`, `student` | Safe. Modifies phone/photo strictly for `req.user.username`. | [api.js:L89-L94](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L89-L94), [studentController.js:L432-L457](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/studentController.js#L432-L457) |
| `/api/library/dashboard` | `GET` | `authenticateToken`, `library_staff` | Safe. Scoped to department library stats and requests. | [api.js:L97-L102](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L97-L102), [libraryController.js:L10-L122](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L10-L122) |
| `/api/library/process-nodues` | `POST` | `authenticateToken`, `library_staff` | **Moderate IDOR:** Does not verify if `request.department === staff.department`. Checks dues and blocks approval if books/fines are pending. | [api.js:L104-L109](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L104-L109), [libraryController.js:L125-L245](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L125-L245) |
| `/api/library/add-fine` | `POST` | `authenticateToken`, `library_staff` | Safe. Creates fine record for student. | [api.js:L111-L116](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L111-L116), [libraryController.js:L247-L290](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L247-L290) |
| `/api/library/update-metrics` | `POST` | `authenticateToken`, `library_staff` | **Moderate:** Overwrites singleton `library_metrics` with arbitrary values without schema range validation. | [api.js:L118-L123](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L118-L123), [libraryController.js:L292-L340](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L292-L340) |
| `/api/library/books` (CRUD) | `GET`/`POST`/`PUT`/`DELETE` | `authenticateToken`, `library_staff` | Safe. Restricts catalogue management to library staff. | [api.js:L125-L152](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L125-L152), [libraryController.js:L342-L480](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L342-L480) |
| `/api/library/students` | `GET` | `authenticateToken`, `library_staff`, `faculty_advisor`, `hod` | Role-restricted student list view. | [api.js:L153-L158](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L153-L158), [libraryController.js:L482-L525](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L482-L525) |
| `/api/library/students/:regNo` | `GET` | `authenticateToken`, `library_staff`, `faculty_advisor`, `hod` | **Moderate IDOR:** FAs can view records of students outside their assigned advisee batch. | [api.js:L160-L165](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L160-L165), [libraryController.js:L527-L565](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L527-L565) |
| `/api/library/complaints` | `GET`/`PUT` | `authenticateToken`, `library_staff` | Safe. View and respond to library grievances. | [api.js:L167-L179](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L167-L179), [libraryController.js:L567-L630](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L567-L630) |
| `/api/library/announcements` | `POST`/`DELETE` | `authenticateToken`, `library_staff`, `hod` | Safe. | [api.js:L181-L193](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L181-L193), [libraryController.js:L632-L685](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L632-L685) |
| `/api/library/reports` | `GET` | `authenticateToken`, `library_staff`, `faculty_advisor`, `hod` | Aggregated clearance report data. | [api.js:L195-L200](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L195-L200), [libraryController.js:L687-L720](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L687-L720) |
| `/api/library/bulk-approve` | `POST` | `authenticateToken`, `library_staff` | Bulk approval for dept library. Skips students with pending books/fines. | [api.js:L202-L207](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L202-L207), [libraryController.js:L722-L751](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/libraryController.js#L722-L751) |
| `/api/fa/dashboard` | `GET` | `authenticateToken`, `faculty_advisor` | Safe. Filters advisees by `advisor_emp_id = ? OR advisor_name = ?`. | [api.js:L210-L215](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L210-L215), [faController.js:L10-L88](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L10-L88) |
| `/api/fa/process-nodues` | `POST` | `authenticateToken`, `faculty_advisor` | **CRITICAL IDOR:** Checks `financeStage.status === 'Approved'` for approval, but **never verifies if the student belongs to the logged-in Faculty Advisor**. Any FA can approve or reject any student in the institution. | [api.js:L217-L222](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L217-L222), [faController.js:L91-L175](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L91-L175) |
| `/api/fa/bulk-approve` | `POST` | `authenticateToken`, `faculty_advisor` | Safe. Scoped to advisees where `s.advisor_emp_id = ? OR s.advisor_name = ?`. | [api.js:L224-L229](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L224-L229), [faController.js:L178-L222](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L178-L222) |
| `/api/fa/students` | `GET` | `authenticateToken`, `faculty_advisor` | Safe. Scoped to assigned students roster. | [api.js:L231-L236](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L231-L236), [faController.js:L225-L276](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L225-L276) |
| `/api/fa/hall-ticket/update` | `POST` | `authenticateToken`, `faculty_advisor` | Safe. Verifies student belongs to the logged-in FA before updating hall ticket status. | [api.js:L238-L243](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L238-L243), [faController.js:L279-L349](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L279-L349) |
| `/api/fa/students/:regNo/detail` | `GET` | `authenticateToken`, `faculty_advisor` | **CRITICAL IDOR:** Takes `:regNo` from URL and returns full profile, request history, audit logs, and borrow records **without checking if the student belongs to the requesting FA**. | [api.js:L245-L250](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L245-L250), [faController.js:L352-L400](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/faController.js#L352-L400) |
| `/api/hod/dashboard` | `GET` | `authenticateToken`, `hod` | Safe. Department-wide statistics and pending stage 6 requests. | [api.js:L253-L258](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L253-L258), [hodController.js:L10-L105](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L10-L105) |
| `/api/hod/process-nodues` | `POST` | `authenticateToken`, `hod` | Verifies `faStage.status === 'Approved'` for approval. Generates certificate if overall cleared. Does not check department match. | [api.js:L260-L265](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L260-L265), [hodController.js:L107-L225](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L107-L225) |
| `/api/hod/bulk-approve` | `POST` | `authenticateToken`, `hod` | Bulk approves all stage 6 pending requests where FA has approved. | [api.js:L267-L272](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L267-L272), [hodController.js:L227-L268](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L227-L268) |
| `/api/hod/bulk-register-students` | `POST` | `authenticateToken`, `hod` | **High Risk:** Automatically assigns hardcoded default password `'password123'` to all newly created users. | [api.js:L274-L279](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L274-L279), [hodController.js:L270-L337](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L270-L337) |
| `/api/hod/students/year/:year` | `DELETE` | `authenticateToken`, `hod` | **CRITICAL High-Risk Destruction:** Permanently cascades and deletes all student records and user logins for a year without password confirmation or transaction protection. | [api.js:L281-L286](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L281-L286), [hodController.js:L340-L402](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L340-L402) |
| `/api/hod/students/all` | `DELETE` | `authenticateToken`, `hod` | **CRITICAL High-Risk Destruction:** Nukes the entire student body, clearance stages, borrow records, and logins from the system with no multi-party approval, 2FA, or backup snapshot. | [api.js:L288-L293](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L288-L293), [hodController.js:L405-L444](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/hodController.js#L405-L444) |
| `/api/dpc/dashboard` | `GET` | `authenticateToken`, `dpc` | Safe. Returns 4th-year career pathway submissions. | [api.js:L296-L301](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L296-L301), [dpcController.js:L10-L87](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/dpcController.js#L10-L87) |
| `/api/dpc/process-nodues` | `POST` | `authenticateToken`, `dpc` | **Moderate IDOR:** Does not verify department of the request. Missing whitelist validation on `action` parameter. | [api.js:L303-L308](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L303-L308), [dpcController.js:L89-L165](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/dpcController.js#L89-L165) |
| `/api/dpc/bulk-approve` | `POST` | `authenticateToken`, `dpc` | Safe. Bulk approves pending DPC stages. | [api.js:L310-L315](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L310-L315), [dpcController.js:L168-L207](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/dpcController.js#L168-L207) |
| `/api/finance/dashboard` | `GET` | `authenticateToken`, `finance` | Safe. Returns institutional financial clearance requests. | [api.js:L318-L323](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L318-L323), [financeController.js:L10-L85](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/financeController.js#L10-L85) |
| `/api/finance/process-nodues` | `POST` | `authenticateToken`, `finance` | Verifies DPC + Libraries are approved before granting approval. Bypasses check for `Reject`/`Hold`. | [api.js:L325-L330](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L325-L330), [financeController.js:L87-L190](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/financeController.js#L87-L190) |
| `/api/finance/bulk-approve` | `POST` | `authenticateToken`, `finance` | Safe. Bulk approves eligible requests where initial 3 stages cleared. | [api.js:L332-L337](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L332-L337), [financeController.js:L193-L232](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/financeController.js#L193-L232) |
| `/api/main-library/dashboard` | `GET` | `authenticateToken`, `main_library_staff` | Safe. Central Library clearance dashboard. | [api.js:L340-L345](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L340-L345), [mainLibraryController.js:L10-L76](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/mainLibraryController.js#L10-L76) |
| `/api/main-library/process-nodues` | `POST` | `authenticateToken`, `main_library_staff` | Safe. Approves or rejects Central Library stage. | [api.js:L347-L352](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L347-L352), [mainLibraryController.js:L78-L158](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/mainLibraryController.js#L78-L158) |
| `/api/main-library/bulk-approve` | `POST` | `authenticateToken`, `main_library_staff` | Safe. Bulk approves Central Library pending requests. | [api.js:L354-L359](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/routes/api.js#L354-L359), [mainLibraryController.js:L160-L198](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/server/src/controllers/mainLibraryController.js#L160-L198) |

---

## 3. TOP 10 RISKS RANKED BY SEVERITY WITH ONE-LINE FIXES

### Risk 1: Universal Default Credentials & Public Quick-Fill Authentication
- **Impact:** CRITICAL. All seeded staff, executive, and student accounts share the default password `'password123'`, and the public login screen provides one-click buttons to sign in directly as HOD, Finance, FA, and DPC.
- **One-Line Fix:** Remove `quickPresets` from `LoginPage.jsx`, delete hardcoded credentials from seed scripts, and enforce an obligatory password change on first login.

### Risk 2: Hardcoded JWT Fallback Secret & Committed Example Secret
- **Impact:** CRITICAL. `JWT_SECRET` in `auth.js` falls back to `'svce_college_nodues_enterprise_secret_key_2026'`, and the identical secret is checked into `.env.example` and `docker-compose.yml`, allowing attackers to forge arbitrary administrator JWTs offline.
- **One-Line Fix:** Enforce `if (!process.env.JWT_SECRET) throw new Error("FATAL: JWT_SECRET required");` on startup and rotate the production key to a cryptographically secure 256-bit string.

### Risk 3: Complete Audit Trail Destruction on Student Request Cancellation
- **Impact:** CRITICAL. A student can cancel their clearance application via `POST /api/student/cancel-nodues`, which executes `DELETE FROM nodues_audit_logs WHERE request_id = ?`, completely scrubbing all institutional remarks, holds, and rejections.
- **One-Line Fix:** Replace deletion with a soft state change (`UPDATE nodues_requests SET overall_status = 'Cancelled' WHERE id = ?`) and forbid deleting from `nodues_audit_logs`.

### Risk 4: Unauthenticated & Unsanitized Audit Event Injection
- **Impact:** HIGH. `POST /api/audit-logs` allows any authenticated user to supply arbitrary `action`, `details`, and `module` text, enabling malicious actors to poison enterprise audit logs and frame other users.
- **One-Line Fix:** Restrict audit logging strictly to internal backend service calls or validate incoming action types against a rigid server-side whitelist.

### Risk 5: IDOR & Horizontal Privilege Escalation in FA Student Details & Approvals
- **Impact:** HIGH. `POST /api/fa/process-nodues` and `GET /api/fa/students/:regNo/detail` fail to verify if the requested student is assigned to the authenticated Faculty Advisor, allowing any FA to manipulate or inspect any student's records across departments.
- **One-Line Fix:** Add `JOIN students s ON nr.register_number = s.register_number WHERE s.advisor_emp_id = req.user.username` checks inside FA processing and profile query handlers.

### Risk 6: Unauthenticated Real-Time Server-Sent Events (SSE) Stream
- **Impact:** HIGH. `GET /api/sse` does not require authentication middleware, and broadcast events with `targetUser = null` push live student registration numbers, request numbers, and status transitions to unauthorized external connections.
- **One-Line Fix:** Apply `authenticateToken` middleware to `router.get('/sse', authenticateToken, handleSSEConnection)` and reject connection attempts lacking a valid Bearer token.

### Risk 7: Missing Rate Limiting on Login & Public API Endpoints
- **Impact:** HIGH. `express-rate-limit` is included in `package.json` but never registered on `POST /api/auth/login`, permitting high-velocity online password guessing and denial-of-service against the bcrypt hasher.
- **One-Line Fix:** Apply `rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts." })` to `POST /api/auth/login`.

### Risk 8: Predictable Certificate Numbers Lacking Cryptographic Signatures or Public Verification
- **Impact:** HIGH. Certificate numbers are deterministic sequential strings (`CERT-SVCE-IT-2026-0001`) with no HMAC/RSA hash, the QR code encodes raw JSON, and no public verification URL exists, allowing easy forgery of graduation clearance certificates.
- **One-Line Fix:** Generate certificates with a SHA-256 HMAC digest (`crypto.createHmac('sha256', secret).update(payload).digest('hex')`) and implement a public `GET /api/verify/:hash` endpoint.

### Risk 9: Permissive CORS Configuration and Disabled Content Security Policy
- **Impact:** MEDIUM. `cors({ origin: true, credentials: true })` reflects any origin and enables credentialed cross-origin requests, while `helmet({ contentSecurityPolicy: false })` disables script execution restrictions, maximizing vulnerability to XSS and CSRF.
- **One-Line Fix:** Restrict CORS origin to an exact institutional domain whitelist and enable a strict Content Security Policy in Helmet.

### Risk 10: In-Database Base64 File Storage with Missing MIME Validation & 64KB Truncation
- **Impact:** MEDIUM. Files up to 8MB are read into memory as Data URLs and stored into MySQL `TEXT` columns (max 65,535 bytes), leading to silent data corruption, database bloat, and potential Stored XSS via `data:text/html` payloads.
- **One-Line Fix:** Migrate file uploads to disk/object storage (using Multer with magic-byte validation) and store only sanitized URL references in the database.

---

## 4. POLICY DECISIONS REQUIRED BEFORE PHASE 1 IMPLEMENTATION

Before proceeding with Phase 1 hardening and architectural refactoring, the following institutional policy decisions must be confirmed:

1. **Authentication & Demo Accounts Policy:**
   - Should the login page test accounts / quick-fill cards be completely stripped from the production build or guarded behind a development flag (`process.env.NODE_ENV !== 'production'`)?
   - What should the mandatory password complexity requirements be (e.g., minimum 8 characters, alphanumeric + symbol), and should the default seed password be forced into an initial reset cycle upon first user login?

2. **Faculty Advisor Allocation & Scope:**
   - Should Faculty Advisors strictly possess read and approval permissions ONLY for their assigned advisees (students where `advisor_emp_id == fa.employee_id`), or should senior faculty have department-wide cross-advisee emergency override permissions?

3. **Multi-Department Scalability:**
   - Is this system intended to remain exclusively for the Information Technology department, or should Phase 1 introduce a dynamic `departments` table allowing onboarding of CSE, ECE, MECH, CIVIL, and MBA departments under distinct HODs, FAs, and Department Libraries?

4. **Document Storage Architecture:**
   - Where should student clearance verification attachments (offer letters, admit cards, scorecards) be stored? Options include local protected filesystem disk storage (e.g., `/server/uploads` with token-guarded streaming) or enterprise cloud storage (e.g., AWS S3 / Google Cloud Storage / institutional MinIO).

5. **Certificate Verification & Privacy Model:**
   - What exact fields should the public QR verification endpoint expose to third-party employers and university verification officers? Should it reveal student personal contact details (phone, email, GPA), or strictly institutional status (Certificate ID, Student Name, Register Number, Department, Completion Date, Issuing Authority)?

6. **Audit Trail Retention & Destruction Governance:**
   - Is request cancellation by students legally permitted once submitted? If a student cancels a request, should the request be archived with an immutable `Cancelled` status while preserving all history, rather than permanently wiping the database row and its audit logs?

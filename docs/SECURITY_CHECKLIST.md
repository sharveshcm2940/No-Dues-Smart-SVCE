# SVCE Smart No-Dues ERP — Production Security Checklist

## 1. Authentication & Session Management
- [x] **Password Hashing:** Passwords hashed with bcrypt using a workload factor of 10 (`bcrypt.hash(password, 10)`).
- [x] **Brute-Force & Credential Stuffing Protection:** Account locked for 15 minutes after 5 consecutive failed login attempts (`failed_login_attempts`, `locked_until`).
- [x] **Single Direct Authentication:** Streamlined institutional authentication with Bcrypt password hashing (workload factor 10) and role-based access control (MFA disabled per college institutional policy).
- [x] **JWT Token Hardening:** Signed using cryptographically random 256-bit secret (`JWT_SECRET`); short access token TTL (2 hours) paired with cryptographically isolated refresh tokens (7 days).
- [x] **Session Revocation:** Client-side cache purge (`caches.delete`, `sessionStorage.clear`, `localStorage.clear`) on sign-out to prevent credential persistence on shared lab terminals.
- [x] **Account State Enforcement:** Deactivated accounts (`is_active = 0`) and forced password change flags (`must_change_password = 1`) strictly enforced at the gateway.

---

## 2. Authorization & Insecure Direct Object Reference (IDOR) Scoping
- [x] **Least-Privilege Role-Based Access Control (RBAC):** Strict segregation among `student`, `library_staff`, `dpc`, `main_library_staff`, `faculty_advisor`, `finance`, `hod`, and `admin`.
- [x] **Resource Ownership Scoping (`requireRequestOwnership`):**
  - Students can only view, track, resubmit, or cancel their own clearance applications.
  - Faculty Advisors can only review and manage assigned advisees matching their official employee identifier.
  - Department Officers (`hod`, `dpc`, `library_staff`) can only review clearance stages for students enrolled in their assigned department.
- [x] **Sequential Stage Enforcement:** Clearance stages must follow strict linear progression (`Department Library` → `DPC` → `Central Library` → `Faculty Advisor` → `Finance` → `HOD`). Out-of-order stage transitions are rejected.
- [x] **Administrative Revocation & Audit:** Stage reopening (`/nodues/reopen-stage`) requires mandatory justification, resets downstream stages, and triggers cryptographic log entry.

---

## 3. Cryptographic Integrity & Anti-Tamper Controls
- [x] **Certificate HMAC Signing:** Clearance certificates are cryptographically signed using HMAC-SHA256 over canonical tuple `(certificate_number, register_number, issue_date, request_id)` using an isolated institutional secret (`CERT_HMAC_KEY`).
- [x] **Timing-Safe Verification:** Certificate HMAC comparisons execute via `crypto.timingSafeEqual` over fixed-length binary buffers to prevent timing side-channel attacks.
- [x] **Append-Only Hash-Chained Audit Trail:** Every clearance workflow action and administrative mutation is appended to `nodues_audit_logs` using SHA-256 block chaining (`previous_hash` + row fields → `current_hash`).
- [x] **Verification URL Entropy:** Public verification tokens generated via CSPRNG (`crypto.randomBytes(24).toString('base64url')`), providing 192 bits of entropy to resist enumeration.

---

## 4. Input Validation, Sanitization & Injection Defense
- [x] **Parameterized SQL Execution:** All queries utilize MySQL 2 prepared statements (`?` placeholders) to prevent SQL injection vulnerabilities.
- [x] **File Upload Restrictions:**
  - Allowed file types strictly restricted to `application/pdf`, `image/jpeg`, and `image/png`.
  - Maximum upload size capped at 5 MB.
  - Storage paths randomized with UUIDs to prevent directory traversal and file overwrites.
- [x] **Image Sanitization:** Profile photos and attachments processed via `sharp` to strip all EXIF metadata and re-encode to safe formats.
- [x] **Payload Limits:** Request bodies restricted to 1 MB max to prevent memory exhaustion and Denial of Service.

---

## 5. Transport Security & Network Boundary
- [x] **Transport Layer Security:** TLS 1.3 / TLS 1.2 with modern cipher suites (`ECDHE-ECDSA-AES128-GCM-SHA256`, `ECDHE-RSA-AES128-GCM-SHA256`).
- [x] **HTTP-to-HTTPS Redirection:** Unconditional 301 redirection from HTTP (port 80) to HTTPS (port 443).
- [x] **HTTP Strict Transport Security (HSTS):** `max-age=31536000; includeSubDomains; preload` header enabled.
- [x] **Secure Response Headers:** Helmet-configured security headers including `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] **Reverse Proxy Trust:** `trust proxy` configured in Express to preserve true client IPs for rate-limiting and audit logging.

---

## 6. Observability, Logging & Privacy (DPDP Act 2023)
- [x] **Centralized Correlation Logging:** Pino JSON logger injecting unique correlation IDs (`req.id` / `X-Request-Id`) across all incoming requests and exceptions.
- [x] **PII Redaction:** Automated masking of sensitive fields (`phone`, `email`, `aadhaar`, `ctc`, `password`, `token`, `otp`) in log outputs.
- [x] **Safe Error Handling:** Production error handler strips raw database errors (`sql`, `sqlMessage`, `ER_*`), table names, and stack traces, returning sanitized error messages.
- [x] **Grievance Redressal:** Unified complaint desk ticketing system providing full tracking and escalation of student grievances.

---

## 7. Disaster Recovery & Backup Integrity
- [x] **Authenticated Encrypted Backups:** Automated AES-256-CBC database dumps with HMAC-SHA256 authenticity digest verification (`backup.js`).
- [x] **Isolated Decryption & Verification Drill:** Automated drill script (`restore.js`) testing backup restoration and validating the integrity of the cryptographic audit hash chain.
- [x] **Backup Retention:** 30-day rolling rotation with automatic cleanup of expired encrypted archives.

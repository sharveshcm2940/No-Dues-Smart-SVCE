# Changelog

All notable changes to the **SVCE Smart No-Dues ERP** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

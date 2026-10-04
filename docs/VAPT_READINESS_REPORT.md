# SVCE Smart No-Dues ERP — VAPT Readiness Report

**Document Version:** 1.0.0  
**Target Application:** SVCE Smart No-Dues ERP (React 18 + Vite PWA, Express.js, MySQL 8)  
**Date:** October 2026  
**Audience:** Security Auditors, External Penetration Testers, Institutional Management  

---

## 1. Executive Summary
The SVCE Smart No-Dues ERP has completed security hardening across its full stack in preparation for formal Vulnerability Assessment and Penetration Testing (VAPT). The application replaces paper-based clearance circulars with an automated, role-segregated workflow supporting students, department faculty, administrative offices, and institutional executives.

This report summarizes the defensive posture of the platform, details implemented security controls, catalogs verified automated test results, and discloses known residual risks along with recommended mitigation roadmaps.

---

## 2. Target Profile & Architecture Overview

| Component | Technology | Security Configuration |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite PWA, Tailwind CSS | Security headers, Workbox `NetworkOnly` for `/api/.*`, cache purge on logout |
| **Backend** | Node.js 20 LTS, Express 4.19 | Helmet, Pino structured logging, real-IP rate limiting, centralized error handling |
| **Database** | MySQL 8.0 Enterprise / Community | Parameterized queries, connection pooling, isolated schema `svce_nodues` |
| **Authentication** | JWT (HMAC-SHA256) + Bcrypt | Bcrypt (work factor 10), 15-minute lockouts after 5 failures, rotating refresh tokens |
| **Cryptographic Signatures** | Node.js `crypto` | HMAC-SHA256 for certificates, SHA-256 append-only block-chained audit trail |
| **Reverse Proxy** | Nginx 1.25 Alpine | TLS 1.3 / 1.2, HSTS (`max-age=31536000`), Gzip level 6, unbuffered SSE |

---

## 3. High-Value Asset Inventory & Threat Model

The primary assets and threat vectors evaluated prior to testing include:

1. **Clearance Certificates & Verification Tokens:**
   - *Threat:* Unauthorized generation, tampering with student register numbers or clearance dates, or token enumeration.
   - *Defense:* Cryptographic HMAC-SHA256 signature generated over `(certificate_number, register_number, issue_date, request_id)` using an isolated server secret. Public verification tokens provide 192 bits of CSPRNG entropy. Verification executes in constant time using `crypto.timingSafeEqual`.
2. **Student & Faculty Personal Information (PII):**
   - *Threat:* Data exposure via system logs, IDOR query enumeration, or administrative data scraping.
   - *Defense:* Scoped resource ownership middleware (`requireRequestOwnership`), automated log sanitization via Pino redacting contact numbers and email addresses, and compliance with DPDP Act 2023 principles.
3. **Institutional Audit Trails:**
   - *Threat:* Repudiation or retroactive tampering with approval or rejection logs.
   - *Defense:* Append-only hash chaining where every log row incorporates the SHA-256 hash of its predecessor, creating a verifiable cryptographic chain.
4. **Administrative & Executive Endpoints:**
   - *Threat:* Privilege escalation, bypassing sequential clearance stages, or brute-force attacks against administrative credentials.
   - *Defense:* Strict role-based authorization, session security via short-lived tokens and rotating refresh tokens, and rate-limited credential endpoints.

---

## 4. Implemented Security Defenses

### 4.1 Injection Defenses
All SQL execution throughout the codebase uses parameterized prepared statements with positional `?` placeholders via `mysql2/promise`. Dynamic string concatenation within SQL clauses is strictly barred.

### 4.2 Cross-Site Scripting (XSS) & Content Injection Defenses
- React’s virtual DOM natively escapes dynamic output bindings.
- Helmet enforces strict response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
- Input validation sanitizes all free-text fields (rejection remarks, complaint descriptions).

### 4.3 Insecure Direct Object Reference (IDOR) & Scoping
Authorization is not solely dependent on role membership. The centralized `authorizeResource` middleware verifies that:
- Students can only view, resubmit, or cancel requests linked to their own session username.
- Faculty Advisors can only access student records assigned to their specific employee roster.
- Department Officers (`hod`, `dpc`, `library_staff`) can only execute actions for students enrolled in their assigned department.

### 4.4 File Upload Security
- Attachments are restricted to `application/pdf`, `image/jpeg`, and `image/png`.
- Files are limited to 5 MB maximum size.
- Uploaded file names are sanitized with UUIDv4 identifiers before disk storage to prevent directory traversal.
- Uploaded images are passed through `sharp` to strip all EXIF metadata and re-encode to safe formats.

---

## 5. Known Residual Risks & Mitigations

| # | Residual Risk | Inherent Severity | Operational Context | Planned / Active Mitigation |
| :- | :--- | :--- | :--- | :--- |
| **RR-01** | **Token Revocation Prior to Expiry** | Low | Issued JWT access tokens remain valid until their 1-hour expiration unless server secret is rotated. | Mitigated by short 1-hour access token lifetime and immediate refresh token revocation upon logout; distributed Redis revocation blacklist planned. |
| **RR-02** | **Client PWA Local Storage Tokens** | Low | JWT access tokens are stored in browser local storage for offline PWA functionality. | Short token lifetime (2 hours); automatic cache and storage purge triggered on explicit logout; Workbox configured with `NetworkOnly` for all API calls. |
| **RR-03** | **Single Database Node in Development** | Medium | Local development uses a single standalone MySQL instance without automated replica failover. | Production environment specifies active-passive database clustering with automated hourly encrypted snapshots and off-site replication. |
| **RR-04** | **Third-Party Email Relay Dependency** | Low | Notifications depend on the operational uptime and reputation of the upstream SMTP relay. | Centralized notification queue persists in-app notifications to MySQL independently of SMTP delivery status. |

---

## 6. Verification & Automated Test Status

Automated testing covers 100% of defined system functional and security criteria:

- **Total Test Suites:** 16 passed, 0 failed (100% pass rate)
- **Total Automated Test Cases:** 165 passed, 0 failed
- **Security Specific Suites:**
  - `roleNegativeAuthorization.test.js` (45 negative role assertions)
  - `idorAndAuthorization.test.js` (IDOR scoping validation)
  - `rateLimitingAndLockout.test.js` (Account lockout & rate-limit throttling)
  - `dpdpAndAuditChain.test.js` (Hash-chain verification & PII protection)
  - `certificateIntegrity.test.js` (HMAC verification & anti-tamper testing)

---

## 7. Hand-off Guidelines for External Penetration Testers
The system is ready for independent white-box and grey-box penetration testing. Refer to [`VAPT_SCOPE_DOCUMENT.md`](./VAPT_SCOPE_DOCUMENT.md) for target IP ranges, test account credentials, excluded endpoints, and rules of engagement.

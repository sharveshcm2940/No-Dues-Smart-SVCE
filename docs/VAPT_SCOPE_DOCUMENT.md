# SVCE Smart No-Dues ERP — VAPT Scope & Rules of Engagement

**Document Classification:** Confidential — Authorized Penetration Testing Scope  
**Author:** Department of Information Technology, Sri Venkateswara College of Engineering  
**Target Application:** SVCE Smart No-Dues ERP  
**Effective Testing Window:** October 2026 – Pre-Launch Period  

---

## 1. Engagement Purpose
This scope document defines the authorized parameters, boundaries, testing accounts, and rules of engagement for external security practitioners performing a comprehensive Vulnerability Assessment and Penetration Testing (VAPT) exercise against the SVCE Smart No-Dues ERP application.

---

## 2. In-Scope Assessment Targets

### 2.1 Web Applications & User Interfaces
- **Target URL (Pre-Production):** `https://nodues-staging.svce.ac.in` (or local designated test host `http://localhost:3000`)
- **Components:**
  - Student Self-Service Portal (`/student/*`)
  - Department Officer Clearance Dashboards (`/library/*`, `/dpc/*`, `/main-library/*`, `/fa/*`, `/finance/*`)
  - Head of Department Executive Sign-off Portal (`/hod/*`)
  - Institutional Administration & User Management Portal (`/admin/*`)
  - Public Certificate Verification Portal (`/verify/:token`)
  - DPDP Privacy Notice & Consent Preferences (`/privacy`)

### 2.2 RESTful API Endpoints
- **Target API Base:** `https://nodues-staging.svce.ac.in/api` (or local `http://localhost:5000/api`)
- **Focus Areas:**
  - Authentication, password change, and session endpoints (`/api/auth/*`)
  - No-Dues clearance lifecycle and sequential state machine (`/api/student/*`, `/api/library/*`, `/api/hod/*`)
  - Stage reopening and revocation controllers (`/api/nodues/reopen-stage`, `/api/hod/certificate/revoke`)
  - Financial records and fine payment simulation (`/api/fines/*`)
  - Multipart file uploads and image processing (`/api/student/profile-photo`, `/api/student/request-nodues`)
  - Bulk CSV import handlers (`/api/admin/bulk-import/*`)
  - Public cryptographic verification endpoint (`/api/verify/:token`)

---

## 3. Out-of-Scope Targets & Prohibited Activities

The following systems, activities, and techniques are strictly **OUT OF SCOPE**:

1. **Denial of Service (DoS / DDoS):** Volumetric network flood attacks, SYN floods, or aggressive load generators that degrade server availability.
2. **Third-Party Payment Gateway Infrastructure:** Live Razorpay / banking settlement gateways. Testing is limited to simulated callbacks in staging mode.
3. **Upstream Network Infrastructure:** College core network firewalls, upstream ISP routing, DNS nameservers, and mail servers.
4. **Physical & Social Engineering:** Physical access to SVCE server rooms, social engineering, phishing of SVCE faculty or students.
5. **Data Deletion / Destruction:** Testers must not drop production tables or delete existing persistent database rows.

---

## 4. Test Accounts & Personas (Dedicated Staging Credentials)

Testers will be provisioned with isolated staging credentials representing each system persona:

| Persona | Role Identifier | Staging Username | Initial Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Final Year)** | `student` | `IT2024001` | `Svce@2026!` | Advisee of V Praveenkumar |
| **Student (Pre-Final Year)**| `student` | `IT2025001` | `Svce@2026!` | Third-year clearance flow |
| **Dept Library Staff** | `library_staff` | `EMP-LIB-IT-01` | `Svce@2026!` | IT Department Library |
| **Central Library Staff** | `main_library_staff`| `EMP-MLIB-IT-01` | `Svce@2026!` | Institutional Main Library |
| **Placement Coordinator** | `dpc` | `EMP-DPC-IT-01` | `Svce@2026!` | Department Placement |
| **Faculty Advisor** | `faculty_advisor` | `EMP-FA-IT-01` | `Svce@2026!` | Assigned advisees roster |
| **Finance Officer** | `finance` | `EMP-FIN-IT-01` | `Svce@2026!` | College Accounts Section |
| **Head of Department** | `hod` | `EMP-HOD-IT-01` | `Svce@2026!` | Direct single authentication |
| **System Administrator** | `admin` | `admin` | `Svce@2026!` | Direct single authentication |

---

## 5. Security Focus Areas & Test Objectives

1. **Authentication & Session:**
   - Testing JWT secret robustness, algorithm confusion (`none` algorithm), and expiration enforcement.
   - Brute-force lockout verification on `/api/auth/login`.
   - Rotating refresh token replay protection and session invalidation on logout.
2. **Authorization & IDOR:**
   - Horizontal privilege escalation: Attempting to access another student's clearance status or download private attachments.
   - Vertical privilege escalation: Attempting to invoke administrative or approval endpoints using a student JWT.
   - Cross-department escalation: Attempting to approve an IT student request using a mechanical department officer account.
   - Sequential workflow bypass: Attempting to approve HOD final stage while prerequisite stages remain pending.
3. **Cryptographic Verification & Anti-Tamper Controls:**
   - Attempting to forge valid digital certificates or tamper with signed attributes (`certificate_number`, `register_number`, `issue_date`).
   - Timing analysis on certificate signature verification (`verifyCertificateHmac`).
   - Tampering with append-only audit logs in `nodues_audit_logs` and testing detection via `verify_audit_chain.js`.
4. **Input Handling & File Uploads:**
   - Malicious file upload via profile picture and receipt attachments (e.g. polyglot files, HTML in SVG, executable payloads).
   - SQL injection attempts on filtered and paginated query endpoints (`/api/admin/users`, `/api/complaints`).
   - Server-Side Request Forgery (SSRF) and Path Traversal attempts on file serving endpoints (`/uploads/*`).

---

## 6. Vulnerability Severity & SLA Reporting

Discovered vulnerabilities must be classified using the Common Vulnerability Scoring System (CVSS v3.1):

| Severity | CVSS v3.1 Score | Notification Requirement | Fix Target |
| :--- | :--- | :--- | :--- |
| **Critical** | 9.0 – 10.0 | Immediate notification within 4 hours | 24 hours |
| **High** | 7.0 – 8.9 | Notification within 12 hours | 72 hours |
| **Medium** | 4.0 – 6.9 | Included in daily progress report | 7 business days |
| **Low / Informational** | 0.1 – 3.9 | Included in final report | Next release cycle |

---

## 7. Emergency Contacts & Escalation Procedure
In the event of an unintended service degradation or potential high-severity vulnerability discovery:
- **Lead IT Coordinator:** HOD, Department of Information Technology (`hod.it@svce.ac.in`)
- **System Administration Team:** `sysadmin@svce.ac.in`
- **Security Lead:** Lead Security Architect (`security@svce.ac.in`)

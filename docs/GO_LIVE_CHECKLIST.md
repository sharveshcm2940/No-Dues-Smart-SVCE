# SVCE Smart No-Dues ERP — Production Go-Live Pre-Launch Checklist

**Target Go-Live Date:** November 2026  
**System Name:** SVCE Smart No-Dues ERP  
**Sign-off Authority:** Head of Department (IT) & Institutional Dean of Academics  

---

| Status | Verification Item | Specification & Acceptance Criteria | Assigned Owner | Sign-off Date |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | **1. Secrets Rotated & Sealed** | `JWT_SECRET`, `CERT_HMAC_KEY`, `BACKUP_ENCRYPTION_KEY`, `DB_PASSWORD`, and `SMTP_PASS` rotated to unique 256-bit CSPRNG secrets; zero secrets present in source repositories or container images. | Lead DevOps / SecOps | _____________ |
| [ ] | **2. Demo & Test Data Absent** | All synthetic test student records (`IT2024001`–`IT2024004`), mock borrow records, and development test requests purged from production schema `svce_nodues`. Real student roster bulk-imported via admin CSV tool. | Database Administrator | _____________ |
| [ ] | **3. Role-Based Access Control Verified** | Single direct login active without MFA per institutional requirements; role permissions strictly verified for students, officers, HOD, and administrators. | Identity & Access Team | _____________ |
| [ ] | **4. Backup & Restoration Verified** | Daily encrypted AES-256-CBC backup automated with 30-day rolling retention; restore drill executed successfully with post-restore SHA-256 audit hash chain integrity confirmed. | Systems Administrator | _____________ |
| [ ] | **5. TLS & Network Boundary Valid** | Institutional or Let's Encrypt TLS certificate active with automatic renewal; HTTP (port 80) unconditionally redirects to HTTPS (port 443); HSTS header active (`max-age=31536000`). | Network Administrator | _____________ |
| [ ] | **6. VAPT Assessment Completed** | Independent third-party vulnerability assessment completed; all Critical, High, and Medium vulnerabilities remediated and validated in re-test. | Security Audit Lead | _____________ |
| [ ] | **7. Privacy Notice (DPDP Act 2023)** | DPDP Act 2023 compliance notice published at `/privacy`; explicit student consent modal enabled on first login; Data Protection Officer (DPO) named. | Legal & Compliance Lead | _____________ |
| [ ] | **8. Institutional Staff Trained** | Department library staff, central library in-charge, faculty advisors, placement coordinator, finance team, and HOD trained on review queues, hold handling, and complaint desk. | ERP Project Lead | _____________ |
| [ ] | **9. Rollback & Contingency Plan** | Disaster recovery rollback procedure documented; VM snapshot restore procedure verified; offline emergency paper-circular clearance fallback procedure established. | DevOps Engineer | _____________ |
| [ ] | **10. Support Owner Named** | Primary operational owner, campus helpdesk email (`nodues-support@svce.ac.in`), telephone extension, and tier-2 escalation engineer designated and active. | Support Lead / HOD IT | _____________ |

---

## Post-Launch Monitoring (First 48 Hours)
- Continuous monitoring of `/health` and `/ready` endpoints via Prometheus / Uptime Kuma.
- Review error logs (`pino`) for unexpected 5xx responses or database lock timeouts.
- Hourly inspection of Redis/MySQL connection pool usage under student traffic bursts.
- Real-time review of complaint desk submissions for clearance dispute escalation.

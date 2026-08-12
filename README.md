# 🏛️ Sri Venkateswara College of Engineering (SVCE)
## Department of Information Technology - No-Dues Clearance ERP & Dynamic Faculty Advisor Management System (MySQL Edition)

An enterprise-grade University ERP System for automating No-Dues clearance, book return tracking, dynamic faculty advisor management, cohort reassignment, career pathway verifications, manual Hall Ticket issuance, and digital certificate generation at Sri Venkateswara College of Engineering (SVCE).

> **Officially Approved by Head of Department (HOD) - Department of Information Technology**

---

## 🚀 Architectural Upgrade: SQLite → MySQL & Dynamic Advisor Allocation

The system has been completely upgraded from SQLite to a robust **MySQL** architecture with a two-table relational model (`students.faculty_id → faculty.id`).

### Key Database & Relationship Highlights:
- **Native MySQL Database Layer**: Uses `mysql2/promise` connection pool with environment variable configuration (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
- **Dynamic Student → Faculty Relationship**: Student records store only the `faculty_id` foreign key. Faculty Advisor names are resolved dynamically via SQL joins (`students.faculty_id → faculty.id`).
- **Master Faculty Roster (`faculty` table)**: Supports statuses `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TRANSFERRED`, and `RETIRED`. Faculty records are preserved for audit history and never deleted when a faculty member leaves.
- **Bulk Cohort Reassignment (Batch + Section)**: HOD can reassign an entire student cohort (e.g., `2023-2027 / Sec-A`) to a new Faculty Advisor in a single MySQL transaction.
- **Replace Outgoing Faculty Workflow**: Bulk reassign advisees of a leaving/transferred faculty member to a replacement faculty advisor and update outgoing status in a transactional operation with confirmation dialogs.
- **Automated Migration & Backup**: Includes safe SQLite → MySQL migration script (`npm run migrate:mysql`) and one-click database backup generator (`npm run backup:mysql`).

---

## 🌟 Key Features & Role Portals

The system features **7 Institutional Role Portals**, automatically resolved upon login based on employee or register credentials:

### 🎓 1. Student Portal (`student`)
- **Clearance Progress Tracker**: Live 6-stage visual pipeline tracker (Finance → Central Library → Department Library → Faculty Advisor → DPC → HOD).
- **4th Year Career Pathway Details & Uploads**: Required for 4th Year (IV Year) students:
  - **Option A: Placements**: Offer letter, job designation, CTC package, company details.
  - **Option B: Higher Studies**: Target university details, degree program, application form, scorecard, and optional supporting letter.
  - **Option C: Competitive Exams**: Exam details, registration number, admit card/scorecard, and optional supporting letter.
  - **Option E: Entrepreneurship**: Startup name, business idea, business description, and pitch deck.
- **Academic Profile Desk**: Details on Programme, Department, Year, Semester, Section, Academic Batch (`2023-2027`), and assigned Faculty Advisor (`V Praveenkumar`).
- **Official Digital Certificate Archive**: Instant generation & download of official SVCE digital clearance certificate (`CERT-SVCE-IT-2026-XXXX`) complete with Certificate Number, verification QR code, and signatures.

### 👨‍🏫 2. Faculty Advisor (FA) Desk & Hall Ticket Management (`faculty_advisor`)
- **Assigned Advisee Roster**: Displays only students assigned to the logged-in Faculty Advisor (`advisor_emp_id` / `faculty_id`).
- **Manual Hall Ticket Issuance & Revocation**:
  - Summary metrics: Total Advisees, Hall Tickets Issued (✅), Not Issued (⏳).
  - Manual FA Action: Hall Tickets are strictly **FA-controlled** and never auto-issued upon No-Dues completion.
  - Confirmation Modal: Prompt confirming issuance or revocation before updating status.
  - Audit Trail: Immutable logging in `hall_ticket_audit_logs` storing status changes, FA employee ID, FA name, timestamp, and remarks.
- **Student Profile & Audit History Modal**: Inspect student profile, No-Dues 6-stage breakdown, and complete Hall Ticket audit history.

### 💼 3. Department Placement Coordinator (DPC) Portal (`dpc`)
- **Option Segregation Tabs**: Interactive filter tabs for 4th-Year career pathways (Option A, Option B, Option C, Option E).
- **Career Credentials Audit Modal**: Inspect uploaded credentials with inline data URL viewers and clearance fallback cards.

### 📚 4. Department Library Portal (`library_staff`)
- **Zero-Dues Rule Enforcement**: Automated zero-dues enforcement (0 Active Borrowed Books & ₹0 Unpaid Fines required before clearance).
- **Direct Fine Imposition**: Impose library fines in Rupees (₹) with custom reasons directly within the review drawer.

### 🏛️ 5. Central Library Portal (`main_library_staff`)
- **Institutional Library Verification**: Verify campus central library borrowing records, unreturned books, and clearance stage 2.

### 💳 6. Finance Section Portal (`finance`)
- **Stage 1 Tuition & Institutional Fee Clearance**: Verify student fee dues, hostel dues, bus fees, and grant Stage 1 clearance.

### 👑 7. HOD Executive Dashboard (`hod`)
- **Faculty & Advisor Management Desk**: Add faculty, edit details, toggle active/inactive status, view assigned advisees, reassign cohorts by batch/section, and replace outgoing faculty.
- **Stage 6 Final Approval & Certificate Issuance**: Bulk final HOD sign-off issuing official digital certificates for passing students.
- **Database Administration & Batch Management**: Bulk CSV student import with automatic `faculty_id` resolution, batch-wise student wipe, and system reset.

---

## ⚙️ Environment Configuration (`server/.env`)

Configure the MySQL database credentials in `server/.env`:

```env
PORT=5000
JWT_SECRET=svce_it_nodues_erp_secret_key_2026
DB_HOST=localhost
DB_PORT=3306
DB_NAME=no_dues_erp
DB_USER=root
DB_PASSWORD=your_mysql_password
```

---

## 🔄 SQLite → MySQL Database Migration

To migrate existing data from `database.sqlite` into your MySQL database without losing any records:

```bash
cd server
npm run migrate:mysql
```

### Migration Verification Output Example:
```text
=======================================================
  SQLite → MySQL Migration Summary Report
=======================================================
 Users Table      | SQLite: 105  | MySQL: 105  | Status: OK ✅
 Faculty Table    | SQLite: 4    | MySQL: 4    | Status: OK ✅
 Students Table   | SQLite: 102  | MySQL: 102  | Status: OK ✅
 Requests Table   | SQLite: 4    | MySQL: 4    | Status: OK ✅
 Stages Table     | SQLite: 24   | MySQL: 24   | Status: OK ✅
=======================================================
🎉 Migration Completed Successfully! No records lost.
```

---

## 💾 Database Backup Procedure

To produce a full `.sql` snapshot backup (`no_dues_erp_YYYY-MM-DD.sql`) inside `server/backups/`:

```bash
cd server
npm run backup:mysql
```

Alternatively, use `mysqldump`:
```bash
mysqldump -u root -p no_dues_erp > no_dues_erp_backup.sql
```

---

## 🔐 Credentials Roster (Default Password: `password123`)

### Executive & Staff Logins
| Role | Name | Username / ID | Email | Portal Scope |
| :--- | :--- | :--- | :--- | :--- |
| **HOD** | Dr V Vidhya | `EMP-HOD-IT-01` | `vidhya.v@svce.ac.in` | All IT Batches & Faculty Reassignment |
| **Placement Coordinator (DPC)** | Dr. R. Placement Coordinator | `EMP-DPC-IT-01` | `dpc.it@svce.ac.in` | 4th Year Career Verification |
| **Library In-Charge** | Sivakumar E | `EMP-LIB-IT-01` | `sivakumar.e@svce.ac.in` | Department Library Desk |
| **Faculty Advisor** | V Praveenkumar | `EMP-FA-IT-01` | `praveenkumar.v@svce.ac.in` | Hall Ticket & Advisee Roster |
| **Faculty Advisor** | N.Selvaganesh | `EMP-FA-IT-02` | `selvaganesh.n@svce.ac.in` | 3rd Year IT-B Advisees |
| **Faculty Advisor** | V.Ranjith | `EMP-FA-IT-03` | `ranjith.v@svce.ac.in` | 3rd Year IT-A Advisees |

---

## 📜 Official HOD Approval
**IT Dept HOD Approved Release** - Verified and approved by **Dr V Vidhya**, Head of Department, Department of Information Technology, Sri Venkateswara College of Engineering.

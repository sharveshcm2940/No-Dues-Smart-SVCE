# 🏛️ Sri Venkateswara College of Engineering (SVCE)
## Department of Information Technology - No-Dues Clearance ERP & Hall Ticket Management System

An enterprise-grade, human-crafted University ERP System for automating No-Dues clearance, book return tracking, faculty advisorship approvals, career pathway verifications, manual Hall Ticket issuance, and digital certificate generation at Sri Venkateswara College of Engineering (SVCE).

> **Officially Approved by Head of Department (HOD) - Department of Information Technology**

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
- **Academic Profile Desk**: Details on Programme, Department, Year, Semester, Section, and assigned Faculty Advisor (`V Praveenkumar`).
- **Official Digital Certificate Archive**: Instant generation & download of official SVCE digital clearance certificate (`CERT-SVCE-IT-2026-XXXX`) complete with Certificate Number, verification QR code, and signatures.
- **Support & Complaints Desk**: Raise inquiries or submit attachments to department staff.

### 👨‍🏫 2. Faculty Advisor (FA) Desk & Hall Ticket Management (`faculty_advisor`)
- **Assigned Advisee Roster**: Displays only students assigned to the logged-in Faculty Advisor (`advisor_emp_id`).
- **Manual Hall Ticket Issuance & Revocation**:
  - Summary metrics: Total Advisees, Hall Tickets Issued (✅), Not Issued (⏳).
  - Manual FA Action: Hall Tickets are strictly **FA-controlled** and never auto-issued upon No-Dues completion.
  - Confirmation Modal: Prompt confirming issuance or revocation before updating status.
  - Audit Trail: Immutable logging in `hall_ticket_audit_logs` storing status changes, FA employee ID, FA name, timestamp, and remarks.
- **Student Profile & Audit History Modal**: Inspect student profile, No-Dues 6-stage breakdown, and complete Hall Ticket audit history.
- **Stage 4 Clearance Desk**: Review advisee conduct, attendance records, and grant/reject Stage 4 clearance with mandatory remarks.
- **Bulk Approve All Advisees**: One-click bulk approval for all pending advisee clearance requests.

### 💼 3. Department Placement Coordinator (DPC) Portal (`dpc`)
- **Option Segregation Tabs**: Interactive filter tabs for 4th-Year career pathways:
  - **Option A (Placements)**: Company name, designation, CTC, offer letter proof.
  - **Option B (Higher Studies)**: Target university, degree, application form proof, scorecard, supporting letter.
  - **Option C (Competitive Exams)**: Exam name, registration details, score/percentile, admit card, supporting letter.
  - **Option E (Entrepreneurship)**: Startup name, business idea, details, pitch deck.
- **Career Credentials Audit Modal**: Inspect uploaded credentials with inline data URL viewers and clearance fallback cards.
- **Stage 5 Placement Clearance Desk**: Verify credentials and grant Stage 5 placement clearance.

### 📚 4. Department Library Portal (`library_staff`)
- **Zero-Dues Rule Enforcement**: Automated zero-dues enforcement (0 Active Borrowed Books & ₹0 Unpaid Fines required before clearance).
- **Direct Fine Imposition**: Impose library fines in Rupees (₹) with custom reasons directly within the review drawer.
- **Editable Stat Cards**: Live stat card totals (Books Catalog, Available, Borrowed, Pending Returns) with "Reset to Auto" option.
- **Bulk Approve All Eligible Dues**: One-click bulk approval for all pending students with zero active books and zero unpaid fines.

### 🏛️ 5. Central Library Portal (`main_library_staff`)
- **Institutional Library Verification**: Verify campus central library borrowing records, unreturned books, and clearance stage 2.

### 💳 6. Finance Section Portal (`finance`)
- **Stage 1 Tuition & Institutional Fee Clearance**: Verify student fee dues, hostel dues, bus fees, and grant Stage 1 clearance.

### 👑 7. HOD Executive Dashboard (`hod`)
- **Department Master Metrics**: Department-wide statistics on total applications, cleared certificates, pending approvals, and active dues.
- **Stage 6 Final Approval & Certificate Issuance**: Bulk final HOD sign-off issuing official digital certificates for passing students.
- **Database Administration & Batch Management**: CSV student import, batch-wise student wipe, and complete system reset.
- **Announcements Desk**: Publish department-wide No-Dues notices to students and faculty.

---

## 📡 Server-Sent Events (SSE) & Dual Notification System

- **Server-Sent Events Stream (`/api/sse`)**: Real-time HTTP event stream pushing live updates to connected browsers without manual polling.
- **Dual Notification Dispatch**: Whenever a student's No-Dues application is Put On Hold, Rejected, or Marked with Dues:
  - Real-time notification sent to the **Student** (`register_number`).
  - Real-time alert dispatched to their **respective Faculty Advisor** (`advisor_emp_id`, `V Praveenkumar`).

---

## 📱 Mobile View & Responsive Dual Navigation

- **Horizontal Scroll Pill Strip (`< md`)**: On small screens, a sticky top horizontal pill bar enables fast tab switching.
- **Slide-Over Mobile Drawer**: Expandable slide-out navigation menu overlay with smooth backdrop blur.
- **Mobile Optimized Dialogs & Certificate**: Touch-friendly modals (`max-h-[85vh] overflow-y-auto`) and scrollable digital certificate viewer (`overflow-x-auto`).

---

## 🔐 Credentials Roster (Default Password: `password123`)

### Executive & Staff Logins
| Role | Name | Username / ID | Email | Portal Scope |
| :--- | :--- | :--- | :--- | :--- |
| **HOD** | Dr V Vidhya | `EMP-HOD-IT-01` | `vidhya.v@svce.ac.in` | All IT Batches & Final Sign-Off |
| **Placement Coordinator (DPC)** | Dr. R. Placement Coordinator | `EMP-DPC-IT-01` | `dpc.it@svce.ac.in` | 4th Year Career Verification |
| **Library In-Charge** | Sivakumar E | `EMP-LIB-IT-01` | `sivakumar.e@svce.ac.in` | Department Library Desk |
| **Faculty Advisor** | V Praveenkumar | `EMP-FA-IT-01` | `praveenkumar.v@svce.ac.in` | Hall Ticket & Advisee Roster |
| **Faculty Advisor** | N.Selvaganesh | `EMP-FA-IT-02` | `selvaganesh.n@svce.ac.in` | 3rd Year IT-B Advisees |
| **Faculty Advisor** | V.Ranjith | `EMP-FA-IT-03` | `ranjith.v@svce.ac.in` | 3rd Year IT-A Advisees |

### 4th Year B.Tech IT Student Logins (Career Pathway Demo)
| Student Name | Register No / ID | Section | Selected Career Pathway |
| :--- | :--- | :--- | :--- |
| **Aadhityan K** | `IT2024001` | Sec-A | Option A: Placements (Zoho Corp - 8.5 LPA) |
| **Bhavani S** | `IT2024002` | Sec-A | Option B: Higher Studies (Carnegie Mellon MS CS) |
| **Chandra Mouli R** | `IT2024003` | Sec-B | Option C: Competitive Exams (GATE 2026 CS/IT) |
| **Dinesh Karthik** | `IT2024004` | Sec-B | Option E: Entrepreneurship (Nexus AI Solutions) |

---

## 🛠️ Installation & Server Deployment

### Unified Production Server (Single-Command Host)
Express hosts both the production React bundle (`client/dist`) and the API backend on a single port (`5000`):

```bash
# 1. Build Client Assets
cd client
npm run build

# 2. Start Unified Server
cd ../server
npm start
```

### LAN Access (Other Laptops on Same Wi-Fi/Network)
Open browser on any laptop connected to the same network and navigate to:
```text
http://<HOST-LAPTOP-IP>:5000
```

---

## 📜 Official HOD Approval
**IT Dept HOD Approved Release** - Verified and approved by **Dr V Vidhya**, Head of Department, Department of Information Technology, Sri Venkateswara College of Engineering.

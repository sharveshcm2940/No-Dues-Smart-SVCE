# 🏛️ Sri Venkateswara College of Engineering (SVCE)
## Department of Information Technology - No-Dues Clearance ERP

An enterprise-grade, human-crafted University ERP System for automating No-Dues clearance, book return tracking, faculty advisorship approvals, career pathway verifications, and digital certificate issuance at Sri Venkateswara College of Engineering (SVCE).

---

## 🌟 Key Features & Role Portals

The system features **5 Dedicated Role Portals**, automatically detected upon login based on employee or register credentials:

### 🎓 1. Student Portal (`student`)
- **Clearance Progress Tracker**: Live 6-stage visual pipeline tracker (Finance → Central Library → Department Library → Faculty Advisor → DPC → HOD).
- **4th Year Career Pathway Details & Uploads**: Required for 4th Year (IV Year) students alone when submitting No-Dues:
  - **Option A: Placements**: Offer letter, job designation, CTC package, company details.
  - **Option B: Higher Studies**: College details, degree program, application form, GRE/TOEFL scorecard, contact info.
  - **Option C: Competitive Exams**: Exam details, GATE/CAT/UPSC scorecard, admit card, registration details.
  - **Option E: Entrepreneurship**: Startup details, business ideas, business description, pitch deck.
- **Academic Profile Desk**: Details on Programme, Department, Year, Semester, Section, and assigned Faculty Advisor.
- **Official Digital Certificate Archive**: Instant generation & download of official SVCE digital clearance certificate (`CERT-SVCE-IT-2026-XXXX`) complete with unique Certificate Number, verification QR code, and signatures. Also displays previous issued term certificates.
- **Support & Complaints Desk**: Raise inquiries or submit attachments to department staff.

### 📚 2. Department Library Portal (`library_staff`)
- **Strict Verification Rule**: Automated zero-dues enforcement (**0 Active Borrowed Books & ₹0 Unpaid Fines** required before clearance).
- **Action Drawer Direct Fine Imposition**: Impose library fines in Rupees (₹) with custom reasons directly within the student review drawer (`+ Add Fine`).
- **Editable Metric Statistics**: Edit stat card totals (**Total Books Catalog**, **Books Available**, **Books Borrowed**, **Pending Returns**) live from the header banner or stat cards, with a **"Reset to Auto"** option.
- **Bulk Approve All Eligible Dues**: One-click bulk approval for all pending students with zero active books and zero unpaid fines.
- **Book Inventory Management**: Searchable catalog with copy count tracking and edition details.
- **Student Borrow Directory**: Issue, return, and fine management for all IT department students.

### 👨‍🏫 3. Faculty Advisor (FA) Desk (`faculty_advisor`)
- **Assigned Advisee Roster**: Complete roster of assigned advisees with full student profile modals.
- **Bulk Approve All Advisees**: One-click bulk approval for all pending advisee No-Dues clearance requests.
- **Stage 4 Clearance Approval Desk**: Review student conduct, attendance records, and grant/reject/hold Stage 4 clearance with mandatory remarks.

### 💼 4. Department Placement Coordinator (DPC) Portal (`dpc`)
- **Stage 5 Placement & Career Clearance Desk**: Dedicated portal for Department Placement Coordinator to verify 4th Year student career credentials (Options A, B, C, E).
- **Career Credentials Audit Modal**: Inspect uploaded offer letters, GRE scorecards, GATE admit cards, and startup pitch decks.
- **Bulk Approve All Placement Requests**: One-click bulk approval for all pending Stage 5 placement clearance requests.

### 👑 5. HOD Executive Dashboard (`hod`)
- **Department Master Metrics**: Department-wide statistics on total applications, cleared certificates, pending approvals, and active dues.
- **Department Student Roster**: View all active IT department students, sections, batches, assigned Faculty Advisors, and current clearance stages.
- **Bulk Grant Final HOD Sign-Off & Issue Certificates**: One-click bulk final sign-off issuing official digital certificates for all pending passing students.
- **Announcements Desk**: Publish department-wide No-Dues notices to students and faculty.

---

## 🔔 Dual Notification System & Real-Time Live Polling

- **Dual Notification Dispatch**: Whenever a student's No-Dues application is **Put On Hold**, **REJECTED**, or **Marked with a Fine** at ANY stage:
  - Real-time notification is sent to the **Student** (`register_number`).
  - Real-time urgent alert is sent to their **respective Faculty Advisor** (`advisor_emp_id`, `advisor_email`, `advisor_name`).
- **5-Second Real-Time Live Polling**: All 5 dashboard portals automatically poll for notifications every 5 seconds, updating the red notification bell icon live without requiring manual page refresh.

---

## 🎨 SVCE Brand Theme & Aesthetic

- **Official Logo**: Official Sri Venkateswara College of Engineering Logo (`svce_logo.png`).
- **Color Palette**:
  - **SVCE Royal Blue**: `#1d4ed8`
  - **Laurel Leaf Orange**: `#f97316`
  - **Slate Neutral**: `#f8fafc` & `#0f172a`
- **Typography & Initial Badges**: Clean, human-crafted ERP layout with initial letter badges.

---

## 🔐 Credentials Roster (Default Password: `password123`)

### Executive & Staff Logins
| Role | Name | Username / ID | Email | Portal Scope |
| :--- | :--- | :--- | :--- | :--- |
| **HOD** | Dr V Vidhya | `EMP-HOD-IT-01` | `vidhya.v@svce.ac.in` | All IT Batches & Final Sign-Off |
| **Placement Coordinator (DPC)** | Dr. R. Placement Coordinator | `EMP-DPC-IT-01` | `dpc.it@svce.ac.in` | 4th Year Career Verification |
| **Library In-Charge** | Sivakumar E | `EMP-LIB-IT-01` | `sivakumar.e@svce.ac.in` | Department Library Desk |
| **Faculty Advisor** | V.Ranjith | `EMP-FA-IT-03` | `ranjith.v@svce.ac.in` | 3rd Year IT-A Advisees |
| **Faculty Advisor** | S.Kavishree | `EMP-FA-IT-04` | `kavishree.s@svce.ac.in` | 3rd Year IT-A Advisees |
| **Faculty Advisor** | N.Selvaganesh | `EMP-FA-IT-02` | `selvaganesh.n@svce.ac.in` | 3rd Year IT-B Advisees |
| **Faculty Advisor** | V.Praveen Kumar | `EMP-FA-IT-01` | `praveenkumar.v@svce.ac.in` | 3rd Year / 4th Year Advisees |

### 4th Year B.Tech IT Student Logins (Career Pathway Demo)
| Student Name | Register No / ID | Section | Selected Career Pathway |
| :--- | :--- | :--- | :--- |
| **Aadhityan K** | `IT2024001` | Sec-A | Option A: Placements (Zoho Corp - 8.5 LPA) |
| **Bhavani S** | `IT2024002` | Sec-A | Option B: Higher Studies (Carnegie Mellon MS CS) |
| **Chandra Mouli R** | `IT2024003` | Sec-B | Option C: Competitive Exams (GATE 2026 CS/IT) |
| **Dinesh Karthik** | `IT2024004` | Sec-B | Option E: Entrepreneurship (Nexus AI Solutions) |

### 3rd Year B.Tech IT Student Logins (98 Students)
Log in using **Register Number** (`IT2025001` to `IT2025098`) and password `password123`.

---

## 📁 Project Structure

```
No dues/
├── client/                     # React 18 + Vite + Tailwind CSS Frontend
│   ├── public/                 # Static Assets (svce_logo.png)
│   ├── src/
│   │   ├── components/         # Header, Sidebar, Modal, ApprovalDialog, Logo & Tables
│   │   ├── pages/              # Role Dashboards (Student, Library, FA, DPC, HOD)
│   │   ├── services/           # Axios API Client
│   │   ├── App.jsx             # Main Routing & Auth Context
│   │   └── main.jsx
│   ├── tailwind.config.js      # SVCE Theme Palette
│   └── vite.config.js          # Vite Server & Proxy Config
│
├── server/                     # Node.js + Express Backend
│   ├── database.sqlite         # SQLite Local Database
│   ├── src/
│   │   ├── config/             # DB Connection Wrapper
│   │   ├── controllers/        # Auth, Student, Library, FA, DPC, HOD Controllers
│   │   ├── middleware/         # JWT Auth & Role Access Control
│   │   ├── routes/             # RESTful API Endpoints
│   │   ├── seed/               # Database Schema & Seed Data
│   │   ├── utils/              # Dual Notification Notifier Utility
│   │   └── server.js           # Express App Entry Point
│   ├── Dockerfile              # Backend Container Configuration
│   └── package.json
├── docker-compose.yml          # Full-Stack Container Orchestration
└── README.md
```

---

## 🛠️ Installation & Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Server Setup
```bash
cd server
npm install
npm start
```
The server will initialize `database.sqlite`, execute schema seeds, and start on `http://localhost:5000`.

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```
The client dev server will start on `http://localhost:3000`.

---

## 🐳 Docker Containerized Setup (Recommended)

Run the entire stack (Node Express Backend + React Nginx Frontend) with a single command:

```bash
docker-compose up --build -d
```

- **Frontend Application**: `http://localhost:3000` (Served by Nginx)
- **Backend API**: `http://localhost:5000/api`
- **Stop Containers**: `docker-compose down`

---

## 🧪 Production Build & Verification

To build the client application for production manually:
```bash
cd client
npm run build
```

---

## 📜 License
Developed for Sri Venkateswara College of Engineering (SVCE), Department of Information Technology.

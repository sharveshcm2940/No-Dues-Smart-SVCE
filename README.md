# 🏛️ Sri Venkateswara College of Engineering (SVCE)
## Department of Information Technology - No-Dues Clearance ERP

An enterprise-grade, human-crafted University ERP System for automating No-Dues clearance, book return tracking, faculty advisorship approvals, and digital certificate issuance at Sri Venkateswara College of Engineering (SVCE).

---

## 🌟 Key Features & Role Portals

The system features **4 Unified User Portals**, automatically detected upon login based on employee or register credentials:

### 🎓 1. Student Portal (`student`)
- **Clearance Progress Tracker**: Live 6-stage visual pipeline tracker (Finance → Central Library → Department Library → Faculty Advisor → DPC → HOD).
- **Academic Profile Desk**: Details on Programme, Department, Year, Semester, Section, and assigned Faculty Advisor.
- **Official Digital Clearance Certificate**: Instant generation of official SVCE digital clearance certificate complete with unique Certificate Number, verification QR code, and signatures.
- **Support & Complaints**: Desk to raise inquiries or submit attachments to department staff.

### 📚 2. Department Library Portal (`library_staff`)
- **Strict Verification Rule**: Automated zero-dues enforcement (**0 Active Borrowed Books & ₹0 Unpaid Fines** required before clearance).
- **Book Inventory Management**: Searchable catalog with copy count tracking and edition details.
- **Student Borrow Directory**: Issue, return, and fine management for all IT department students.
- **Reports & Export Desk**: PDF/CSV audit reports for library clearance.

### 👨‍🏫 3. Faculty Advisor (FA) Desk (`faculty_advisor`)
- **Assigned Advisee Roster**: Complete roster of assigned batch advisees (25 students each for V.Ranjith, S.Kavishree, V.Praveen Kumar, and 23 students for N.Selvaganesh).
- **Advisee Full Profile Modal**: View detailed student profiles including section, phone number, email, active books, fines, and clearance progress.
- **Stage 4 Clearance Approval Desk**: Review student conduct and grant/reject Stage 4 clearance with remarks.

### 👑 4. HOD Executive Dashboard (`hod`)
- **Department Master Metrics**: Department-wide statistics on total applications, cleared certificates, pending approvals, and active dues.
- **Stage 6 Final Sign-Off Desk**: Final executive approval issuing official digital certificates for passing students.
- **Announcements Desk**: Publish department-wide No-Dues notices to students and faculty.

---

## 🎨 SVCE Brand Theme & Aesthetic

- **Official Logo**: Official Sri Venkateswara College of Engineering Logo (`svce_logo.png`).
- **Color Palette**:
  - **SVCE Royal Blue**: `#1d4ed8`
  - **Laurel Leaf Orange**: `#f97316`
  - **Slate Neutral**: `#f8fafc` & `#0f172a`
- **Typography & Initial Badges**: Clean, human-crafted ERP layout with initial letter badges (zero profile photos).

---

## 🔐 Credentials Roster (Default Password: `password123`)

### Executive & Staff Logins
| Role | Name | Username / ID | Email | Assigned Batch |
| :--- | :--- | :--- | :--- | :--- |
| **HOD** | Dr V Vidhya | `EMP-HOD-IT-01` | `vidhya.v@svce.ac.in` | All IT Batches |
| **Library In-Charge** | Sivakumar E | `EMP-LIB-IT-01` | `sivakumar.e@svce.ac.in` | Department Library |
| **Faculty Advisor** | V.Ranjith | `EMP-FA-IT-03` | `ranjith.v@svce.ac.in` | 3rd Year IT-A (Rolls 1–24 & 301) |
| **Faculty Advisor** | S.Kavishree | `EMP-FA-IT-04` | `kavishree.s@svce.ac.in` | 3rd Year IT-A (Rolls 25–48 & 302) |
| **Faculty Advisor** | N.Selvaganesh | `EMP-FA-IT-02` | `selvaganesh.n@svce.ac.in` | 3rd Year IT-B (Rolls 49–73) |
| **Faculty Advisor** | V.Praveen Kumar | `EMP-FA-IT-01` | `praveenkumar.v@svce.ac.in` | 3rd Year IT-B (Rolls 74–98) |

### 3rd Year B.Tech IT Advisee Student Logins (98 Students)
All 98 students can log in using their **Register Number** as username and password `password123`:

- **Section A (V.Ranjith Advisees - Rolls 1 to 24 & 301)**: `IT2025001` to `IT2025024`, `IT2025301`
- **Section A (S.Kavishree Advisees - Rolls 25 to 48 & 302)**: `IT2025025` to `IT2025048`, `IT2025302`
- **Section B (N.Selvaganesh Advisees - Rolls 49 to 73)**: `IT2025049` to `IT2025073`
- **Section B (V.Praveen Kumar Advisees - Rolls 74 to 98)**: `IT2025074` to `IT2025098`

---

## 📁 Project Structure

```
No dues/
├── client/                     # React 18 + Vite + Tailwind CSS Frontend
│   ├── public/                 # Static Assets (svce_logo.png)
│   ├── src/
│   │   ├── components/         # Common Header, Sidebar, Modal, Logo & Tables
│   │   ├── pages/              # Role Dashboards (Student, Library, FA, HOD)
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
│   │   ├── controllers/        # Auth, Student, Library, FA, HOD Controllers
│   │   ├── middleware/         # JWT Auth & Role Access Control
│   │   ├── routes/             # RESTful API Endpoints
│   │   ├── seed/               # Database Schema & Seed Data (98 Students)
│   │   └── server.js           # Express App Entry Point
│   └── package.json
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
node src/server.js
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

## 🧪 Production Build & Verification

To build the client application for production deployment:
```bash
cd client
npm run build
```

---

## 📜 License
Developed for Sri Venkateswara College of Engineering (SVCE), Department of Information Technology.

# 🐬 MySQL Workbench & MySQL Server Database Integration Guide

This project is built natively for **MySQL Workbench** and **MySQL Server (8.0+)**.

---

## ⚡ Loading the Database in MySQL Workbench

The repository provides a complete, standalone SQL script containing all 19 schemas, relational tables, foreign keys, and seed records:
📄 **[`mysql_workbench_setup.sql`](file:///c:/Users/Sharvesh%20C%20M/Downloads/No-Dues/mysql_workbench_setup.sql)**

### Step-by-Step Instructions:

1. **Launch MySQL Workbench**:
   - Open **MySQL Workbench** on your machine.
   - Click on your MySQL connection (e.g. `Local instance MySQL80` or `Local instance 3306`).

2. **Open the SQL Script**:
   - Go to top menu: **File** ➔ **Open SQL Script...** (or press `Ctrl + Shift + O`).
   - Navigate to your project directory and select:
     ```
     mysql_workbench_setup.sql
     ```

3. **Execute the Script**:
   - Click the **Execute (Lightning Bolt ⚡)** button in the query editor toolbar.
   - MySQL Workbench will:
     - Create database `svce_nodues` with `utf8mb4` encoding.
     - Build all 19 relational tables (including `system_audit_logs`, `nodues_requests`, `users`, `students`, etc.).
     - Populate all default seed accounts, books, clearance requests, and sample audit log trails.

4. **Verify in Schema Navigator**:
   - In the left sidebar under **SCHEMAS**, right-click and click **Refresh All**.
   - You will see `svce_nodues` with all tables ready to inspect and query.

---

## 🔄 Node.js Backend Connection

The backend connects directly to MySQL via `mysql2/promise`:

1. In `server/`, your `.env` configuration:
   ```ini
   PORT=5000
   JWT_SECRET=svce_college_nodues_secure_jwt_token_key_2026_super_secret

   # MySQL Server credentials
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=svce_nodues
   ```

2. Start the backend:
   ```bash
   cd server
   npm start
   ```

3. The system connects directly to your MySQL database:
   ```
   ✅ Connected to MySQL database: svce_nodues@localhost:3306
   ```

---

## 📋 Schema Overview in MySQL Workbench

| # | Table Name | Purpose |
|---|---|---|
| 1 | `users` | User credentials, roles, and hashed passwords |
| 2 | `students` | Student academic & profile info, advisor mapping, hall ticket status |
| 3 | `library_staff` | Department library officer profile |
| 4 | `main_library_profile` | Central library officer profile |
| 5 | `finance_profile` | Finance clearance officer profile |
| 6 | `faculty_advisors` | Faculty advisors assigned to batches |
| 7 | `hod_profile` | Head of Department profile |
| 8 | `dpc_profile` | Department Placement Coordinator profile |
| 9 | `books` | Book catalog, ISBN, stock, availability |
| 10 | `borrow_records` | Borrowing history, due dates, fines |
| 11 | `nodues_requests` | No-Dues clearance applications, career pathways |
| 12 | `nodues_stages` | 6 clearance approval stages with timestamps |
| 13 | `nodues_audit_logs` | Specific application approval history trail |
| 14 | `system_audit_logs` | **Audit logs with Device Name, Device Type, and Location** |
| 15 | `complaints` | Student helpdesk & complaint ticketing |
| 16 | `announcements` | Circulars and department notifications |
| 17 | `notifications` | Role-based instant user notifications |
| 18 | `hall_ticket_audit_logs` | Hall ticket authorization audit trail |
| 19 | `library_metrics` | Live statistics dashboard metrics |

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'no_dues_erp';

async function backupDatabase() {
  console.log('=======================================================');
  console.log('  MySQL Database Backup Tool (No-Dues ERP)');
  console.log('=======================================================');

  const dateStr = new Date().toISOString().split('T')[0];
  const backupDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `no_dues_erp_${dateStr}.sql`);
  let connection = null;

  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    const [tables] = await connection.query('SHOW TABLES');
    const tableKey = `Tables_in_${DB_NAME}`;

    let sqlDump = `-- No-Dues ERP MySQL Backup\n-- Date: ${new Date().toISOString()}\n-- Database: ${DB_NAME}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tRow of tables) {
      const tableName = tRow[tableKey];
      const [[createRow]] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createRow['Create Table'];

      sqlDump += `-- Table structure for \`${tableName}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += `${createTableSql};\n\n`;

      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        sqlDump += `-- Data for \`${tableName}\` (${rows.length} rows)\n`;
        for (const row of rows) {
          const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
          const vals = Object.values(row).map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(v).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
          }).join(', ');
          sqlDump += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${vals});\n`;
        }
        sqlDump += `\n`;
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    fs.writeFileSync(backupPath, sqlDump, 'utf8');

    console.log(`✅ Backup successfully created at: ${backupPath}`);
    console.log(` File Size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
    console.log('=======================================================\n');

  } catch (err) {
    console.error('❌ Backup Failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

backupDatabase();

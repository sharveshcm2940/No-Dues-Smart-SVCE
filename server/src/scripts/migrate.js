const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { getPool, ensureReady } = require('../config/db');

async function runMigrations(direction = 'up') {
  await ensureReady();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // 1. Ensure migrations tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
        \`version\` VARCHAR(100) PRIMARY KEY,
        \`applied_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir);

    function parseStatements(sql) {
      const cleanSql = sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      return cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    if (direction === 'up') {
      const upFiles = files.filter(f => f.endsWith('.up.sql')).sort();
      for (const file of upFiles) {
        const version = file.replace('.up.sql', '');
        const [rows] = await connection.query('SELECT version FROM schema_migrations WHERE version = ?', [version]);
        if (rows.length > 0) {
          console.log(`⏩ Migration already applied: ${file}`);
          continue;
        }

        console.log(`🚀 Applying migration UP: ${file}`);
        const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const statements = parseStatements(sqlContent);

        for (const statement of statements) {
          if (statement.trim()) {
            await connection.query(statement);
          }
        }

        await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
        console.log(`✅ Successfully applied: ${file}`);
      }
    } else if (direction === 'down') {
      const downFiles = files.filter(f => f.endsWith('.down.sql')).sort().reverse();
      for (const file of downFiles) {
        const version = file.replace('.down.sql', '');
        const [rows] = await connection.query('SELECT version FROM schema_migrations WHERE version = ?', [version]);
        if (rows.length === 0) {
          continue;
        }

        console.log(`⏪ Rolling back migration DOWN: ${file}`);
        const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const statements = parseStatements(sqlContent);

        for (const statement of statements) {
          if (statement.trim()) {
            await connection.query(statement);
          }
        }

        await connection.query('DELETE FROM schema_migrations WHERE version = ?', [version]);
        console.log(`✅ Successfully rolled back: ${file}`);
        break; // Roll back one at a time for safety
      }
    }
  } catch (err) {
    console.error('Migration execution failed:', err);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  const arg = process.argv[2] || 'up';
  runMigrations(arg)
    .then(() => {
      console.log('🏁 Migrations complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };

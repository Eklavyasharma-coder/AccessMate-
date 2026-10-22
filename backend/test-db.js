const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/config/db');

async function testDatabase() {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, version() AS version'
    );

    console.log('✅ PostgreSQL connected successfully!');
    console.log('Database Name:', result.rows[0].database);
    console.log('Version:', result.rows[0].version);

    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log('\nTables in "public" schema:', tables);

    if (tables.includes('users')) {
      const userCount = await pool.query('SELECT COUNT(*) AS total FROM users');
      console.log(`- users table: ${userCount.rows[0].total} record(s)`);
    }

    if (tables.includes('documents')) {
      const docCount = await pool.query('SELECT COUNT(*) AS total FROM documents');
      console.log(`- documents table: ${docCount.rows[0].total} record(s)`);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
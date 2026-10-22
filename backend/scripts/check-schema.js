'use strict';
const pool = require('../src/config/db');
(async () => {
  try {
    const info = await pool.query(`
      SELECT current_database() AS database, current_user AS role,
             current_setting('server_version') AS server_version,
             inet_server_port() AS server_port
    `);
    console.log('Connected:', info.rows[0]);
    const result = await pool.query(`
      SELECT t.table_schema, t.table_name, c.column_name, c.data_type, c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c USING (table_schema, table_name)
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name, c.ordinal_position
    `);
    for (const row of result.rows) console.log(`${row.table_schema}.${row.table_name}.${row.column_name} ${row.data_type} nullable=${row.is_nullable}`);
  } catch (error) {
    console.error('Schema inspection failed:', error.message);
    process.exitCode = 1;
  } finally { await pool.end(); }
})();

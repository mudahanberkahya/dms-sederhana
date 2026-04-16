import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:p@55w0rd@localhost:5432/astara_dms'
});

async function main() {
  await pool.query(
    "INSERT INTO activity_log (action, entity, details) VALUES ('SYSTEM_UPDATE', 'System', 'Audit Trail feature was successfully installed and initialized.')"
  );
  console.log('Test log inserted');
  pool.end();
}

main();

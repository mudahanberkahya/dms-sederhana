import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:p@55w0rd@localhost:5432/astara_dms'
});

async function main() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(res.rows);
  pool.end();
}

main();

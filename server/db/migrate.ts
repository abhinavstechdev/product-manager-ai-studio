import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not defined.');
    console.log('Usage:');
    console.log('  DATABASE_URL="postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require" npm run db:migrate');
    console.log('Or connect directly via the web dashboard at Settings -> Connect to Neon.');
    process.exit(1);
  }

  console.log('🚀 Connecting to database to apply migration...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database successfully.');

    const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    const statements = schemaSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📦 Executing ${statements.length} migration statements from server/db/schema.sql...`);

    await client.query('BEGIN');
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    await client.query('COMMIT');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name ASC
    `);

    console.log(`\n🎉 Migration complete! ${res.rows.length} verified tables in database:`);
    res.rows.forEach((r: any) => console.log(`   - ${r.table_name}`));

    client.release();
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

runMigration();

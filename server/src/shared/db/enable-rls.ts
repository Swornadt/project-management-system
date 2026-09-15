import "reflect-metadata";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const tables = [
  "roles",
  "users",
  "projects",
  "project_members",
  "contents",
  "tags",
  "content_tags",
  "tasks",
  "task_comments",
  "task_dependencies",
  "files",
  "project_files",
  "notifications",
  "activity_logs",
];

async function enableRls() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    for (const table of tables) {
      await pool.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await pool.query(
        `CREATE POLICY "${table}_read_policy" ON "${table}" FOR SELECT USING (true);`
      );
      await pool.query(
        `CREATE POLICY "${table}_write_policy" ON "${table}" FOR INSERT WITH CHECK (true);`
      );
      await pool.query(
        `CREATE POLICY "${table}_update_policy" ON "${table}" FOR UPDATE USING (true) WITH CHECK (true);`
      );
      await pool.query(
        `CREATE POLICY "${table}_delete_policy" ON "${table}" FOR DELETE USING (true);`
      );
      console.log(`RLS enabled with permissive policies on: ${table}`);
    }

    console.log("RLS enabled on all tables.");
  } catch (error) {
    console.error("RLS enable error:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

enableRls();

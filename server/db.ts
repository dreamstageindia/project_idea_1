// server/db.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const PGSSL = process.env.PGSSL === "true";

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL env var is required (e.g. postgres://user:pass@host:5432/dbname)"
  );
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: PGSSL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);

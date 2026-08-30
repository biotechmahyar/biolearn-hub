import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

// Connection pool
const client = postgres(connectionString ?? "postgresql://localhost:5432/nibrc", {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });

/** Quick check if DB is reachable (used by WS to avoid hangs). */
let _dbAvailable: boolean | null = null;
export async function isDbAvailable(): Promise<boolean> {
  if (_dbAvailable !== null) return _dbAvailable;
  try {
    await db.select().from(schema.users).limit(1);
    _dbAvailable = true;
  } catch {
    _dbAvailable = false;
  }
  return _dbAvailable;
}

/** Reset the cached availability check (for tests). */
export function resetDbAvailability() {
  _dbAvailable = null;
}

export type Database = typeof db;

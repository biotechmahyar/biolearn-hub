import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

// Lazy initialization — client is created on first DB access, not at import time.
// This allows test files to be imported before DATABASE_URL is set (by globalSetup).
let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    const url = connectionString || process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set.");
    }
    _client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 5,
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

// Export as a getter — first DB access triggers initialization
let _dbProxy: ReturnType<typeof drizzle> | null = null;

export const db: ReturnType<typeof drizzle> = (() => {
  // Use a Proxy so .select(), .insert(), etc. work lazily
  const handler: ProxyHandler<any> = {
    get(_target, prop, _receiver) {
      if (!_dbProxy) _dbProxy = getDb();
      const val = (_dbProxy as any)[prop];
      if (typeof val === "function") {
        return val.bind(_dbProxy);
      }
      return val;
    },
  };
  return new Proxy({} as any, handler) as ReturnType<typeof drizzle>;
})();

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

export type Database = ReturnType<typeof drizzle>;

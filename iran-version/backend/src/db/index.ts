import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL!;

// Disable SSL for local development; enable in production
const isProduction = process.env.NODE_ENV === "production";
const client = postgres(connectionString, {
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
});

export const db = drizzle(client, { schema });

export async function isDbAvailable(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function closeDb() {
  await client.end();
}

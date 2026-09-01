import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/nibrc";

// Create postgres connection
const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

// Helper: generate a simple ID
export function generateId(): string {
  return `_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Helper: current timestamp
export function now(): number {
  return Date.now();
}

// Initialize tables
export async function initDb(): Promise<void> {
  try {
    // Simple health check
    await client`SELECT 1`;
    console.log("[DB] PostgreSQL connected successfully");
  } catch (error) {
    console.error("[DB] PostgreSQL connection failed:", error);
    throw error;
  }
}

export default db;

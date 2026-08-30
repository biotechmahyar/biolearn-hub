/**
 * vitest globalSetup — starts embedded PostgreSQL before any test module is imported.
 * This ensures DATABASE_URL is set before db/index.ts creates its client.
 */
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const PG_DATA_DIR = path.join("/tmp", "nibrc-test-pgdata");
const PG_PORT = 5433;
const PG_USER = "test";
const PG_PASSWORD = "test";
const PG_DB = "nibrc_test";
const DATABASE_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}`;

let pgInstance: any = null;

export default async function setup() {
  // Set env BEFORE any test module imports db/index.ts
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.JWT_SECRET = "test-jwt-secret-for-integration";
  process.env.REFRESH_SECRET = "test-refresh-secret-for-integration";

  // Clean previous data
  if (fs.existsSync(PG_DATA_DIR)) {
    fs.rmSync(PG_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(PG_DATA_DIR, { recursive: true });

  pgInstance = new (EmbeddedPostgres as any)({
    database_dir: PG_DATA_DIR,
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
  });

  await pgInstance.initialise();
  await pgInstance.start();

  // Create the test database
  const sysClient = postgres(
    `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/postgres`
  );
  await sysClient.unsafe(`CREATE DATABASE ${PG_DB}`);
  await sysClient.end();

  // Apply Drizzle migrations
  const backendDir = path.resolve(import.meta.dirname ?? __dirname, "..", "..");
  try {
    execSync("npx drizzle-kit push --force", {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL },
      stdio: "pipe",
      timeout: 30000,
    });
    console.log("✅ Drizzle migrations applied");
  } catch (err: any) {
    const stderr = err.stderr?.toString() || "";
    if (stderr.includes("already exists") || stderr.includes("relation") && stderr.includes("already")) {
      console.log("ℹ️  Schema already applied");
    } else {
      console.warn("⚠️  drizzle-kit push:", stderr.slice(0, 300));
    }
  }

  // Seed test data
  const client = postgres(DATABASE_URL);
  const testUsers = [
    { id: "00000000-0000-0000-0000-000000000001", name: "Test User A", email: "user-a@test.com", role: "user" },
    { id: "00000000-0000-0000-0000-000000000002", name: "Test User B", email: "user-b@test.com", role: "user" },
    { id: "00000000-0000-0000-0000-000000000003", name: "Test Instructor", email: "instructor@test.com", role: "instructor" },
    { id: "00000000-0000-0000-0000-000000000004", name: "Test Admin", email: "admin@test.com", role: "admin" },
    { id: "00000000-0000-0000-0000-000000000005", name: "Test User Expired", email: "expired@test.com", role: "user" },
  ];

  for (const user of testUsers) {
    await client.unsafe(
      `INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, role = $4`,
      [user.id, user.name, user.email, user.role]
    );
  }

  const roomId = "00000000-0000-0000-0000-000000000099";
  await client.unsafe(
    `INSERT INTO class_rooms (id, instructor_id, instructor_name, title, topic, description, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [roomId, "00000000-0000-0000-0000-000000000003", "Test Instructor", "Test Room", "Testing", "Test room", "live", Date.now()]
  );

  await client.unsafe(
    `INSERT INTO class_enroll_requests (id, user_id, room_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    ["00000000-0000-0000-0000-000000000098", "00000000-0000-0000-0000-000000000001", roomId, "approved", Date.now()]
  );

  await client.unsafe(
    `INSERT INTO room_messages (id, room_id, user_id, name, role, type, text, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    ["00000000-0000-0000-0000-000000000097", roomId, "00000000-0000-0000-0000-000000000001", "Test User A", "user", "question", "Test question?", Date.now()]
  );

  await client.end();
  console.log("🌱 Test data seeded");
}

export async function teardown() {
  if (pgInstance) {
    await pgInstance.stop();
    pgInstance = null;
  }
  if (fs.existsSync(PG_DATA_DIR)) {
    fs.rmSync(PG_DATA_DIR, { recursive: true, force: true });
  }
  console.log("🐘 PostgreSQL stopped");
}

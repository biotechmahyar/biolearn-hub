/**
 * PostgreSQL Test Setup — starts embedded PostgreSQL, applies migrations, seeds data.
 * Used by all integration tests that need a real database.
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import postgres from "postgres";
import path from "path";
import fs from "fs";

const PG_DATA_DIR = path.join("/tmp", "nibrc-test-pgdata");
const PG_PORT = 5433;
const PG_USER = "test";
const PG_PASSWORD = "test";
const PG_DB = "nibrc_test";
const DATABASE_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}`;

let pgInstance: EmbeddedPostgres | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export { DATABASE_URL, sqlClient };

/**
 * Start embedded PostgreSQL and create the test database.
 */
export async function startPostgres(): Promise<void> {
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

  await pgInstance!.initialise();
  await pgInstance!.start();

  // Create the test database
  const sysClient = postgres(
    `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/postgres`
  );
  await sysClient.unsafe(`CREATE DATABASE ${PG_DB}`);
  await sysClient.end();

  // Set env for the application
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.JWT_SECRET = "test-jwt-secret-for-integration";
  process.env.REFRESH_SECRET = "test-refresh-secret-for-integration";

  console.log(`🐘 PostgreSQL started on port ${PG_PORT}, database: ${PG_DB}`);
}

/**
 * Apply Drizzle migrations using drizzle-kit push.
 */
export async function applyMigrations(): Promise<void> {
  // Use drizzle-kit to push the schema
  const backendDir = path.resolve(import.meta.dirname ?? __dirname, "..", "..");
  try {
    execSync(
      `npx drizzle-kit push --force`,
      {
        cwd: backendDir,
        env: { ...process.env, DATABASE_URL },
        stdio: "pipe",
        timeout: 30000,
      }
    );
    console.log("✅ Drizzle migrations applied");
  } catch (err: any) {
    // drizzle-kit push may fail if schema already exists — that's ok
    const stderr = err.stderr?.toString() || "";
    if (stderr.includes("already exists") || stderr.includes("relation") && stderr.includes("already")) {
      console.log("ℹ️  Schema already applied");
    } else {
      console.warn("⚠️  drizzle-kit push output:", stderr.slice(0, 500));
    }
  }
}

/**
 * Seed test data — users that match the test JWT tokens.
 */
export async function seedTestData(): Promise<void> {
  const client = postgres(DATABASE_URL);

  // Insert test users that match the JWT tokens used in tests
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

  // Create a test room
  const roomId = "00000000-0000-0000-0000-000000000099";
  await client.unsafe(
    `INSERT INTO class_rooms (id, instructor_id, instructor_name, title, topic, description, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [roomId, "00000000-0000-0000-0000-000000000003", "Test Instructor", "Test Room", "Testing", "Test room", "live", Date.now()]
  );

  // Approve User A for the test room
  const enrollId = "00000000-0000-0000-0000-000000000098";
  await client.unsafe(
    `INSERT INTO class_enroll_requests (id, user_id, room_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [enrollId, "00000000-0000-0000-0000-000000000001", roomId, "approved", Date.now()]
  );

  // Create a test question message (for room:answer test)
  const msgId = "00000000-0000-0000-0000-000000000097";
  await client.unsafe(
    `INSERT INTO room_messages (id, room_id, user_id, name, role, type, text, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [msgId, roomId, "00000000-0000-0000-0000-000000000001", "Test User A", "user", "question", "Test question?", Date.now()]
  );

  await client.end();
  console.log("🌱 Test data seeded");
}

/**
 * Clean test data between tests (preserves users, resets mutable tables).
 */
export async function cleanTestData(): Promise<void> {
  const client = postgres(DATABASE_URL);
  await client.unsafe("DELETE FROM room_messages");
  await client.unsafe("DELETE FROM presence");
  await client.unsafe("DELETE FROM attendance");
  await client.unsafe("DELETE FROM group_members");
  await client.unsafe("DELETE FROM group_announcements");
  await client.unsafe("DELETE FROM mentor_questions");
  await client.unsafe("DELETE FROM mentor_sessions");
  await client.unsafe("DELETE FROM mentor_groups");
  await client.unsafe("DELETE FROM comments");
  await client.unsafe("DELETE FROM announcements");
  await client.unsafe("DELETE FROM reminders");
  await client.unsafe("DELETE FROM inbox_messages");
  await client.unsafe("DELETE FROM flashcards");
  await client.unsafe("DELETE FROM bookmarks");
  await client.unsafe("DELETE FROM exam_attempts");
  await client.unsafe("DELETE FROM daily_quiz_answers");
  await client.unsafe("DELETE FROM exam_reports");
  await client.unsafe("DELETE FROM offline_payments");
  await client.unsafe("DELETE FROM order_items");
  await client.unsafe("DELETE FROM orders");
  await client.unsafe("DELETE FROM enrollments");
  await client.unsafe("DELETE FROM media_items");
  await client.unsafe("DELETE FROM class_enroll_requests WHERE id = '00000000-0000-0000-0000-000000000098'");
  await client.unsafe("DELETE FROM room_messages WHERE id = '00000000-0000-0000-0000-000000000097'");
  await client.end();
}

/**
 * Stop embedded PostgreSQL.
 */
export async function stopPostgres(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
  }
  if (pgInstance) {
    await pgInstance.stop();
    pgInstance = null;
  }
  // Clean up data dir
  if (fs.existsSync(PG_DATA_DIR)) {
    fs.rmSync(PG_DATA_DIR, { recursive: true, force: true });
  }
  console.log("🐘 PostgreSQL stopped");
}

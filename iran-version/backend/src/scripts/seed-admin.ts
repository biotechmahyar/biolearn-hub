import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users, admins } from "../db/schema.js";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@nibrc.ir";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "System Admin";

  console.log(`Seeding admin user: ${email}`);

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    console.log(`Admin user ${email} already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "admin",
  }).returning();

  // Add to admins allow-list
  await db.insert(admins).values({ email });

  console.log(`✅ Admin user created: ${user.email} (${user.id})`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to seed admin:", err);
    process.exit(1);
  });

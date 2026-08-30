import dotenv from "dotenv";
dotenv.config();

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const email = "admin@nibrc.ir";
  const password = "admin123";
  const name = "Admin";

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(`✅ Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "admin",
  });

  console.log(`✅ Admin created: ${email} / ${password}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });

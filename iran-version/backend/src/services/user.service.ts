import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { users, profileEdits } from "../db/schema.js";
import { NotFoundError, BadRequestError } from "../lib/errors.js";

export async function getMyProfile(userId: string) {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      secondaryRole: users.secondaryRole,
      firstName: users.firstName,
      lastName: users.lastName,
      about: users.about,
      avatarUrl: users.avatarUrl,
      university: users.university,
      major: users.major,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function updateMyProfile(userId: string, data: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const [edit] = await db
    .insert(profileEdits)
    .values({ userId, data, status: "pending", createdAt: now })
    .returning();
  return edit;
}

export async function adminGetUsers() {
  const db = getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      secondaryRole: users.secondaryRole,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function adminSetRole(userId: string, role: string) {
  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: Date.now() })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new NotFoundError("User");
  return { id: updated.id, role: updated.role };
}

export async function adminSetSecondaryRole(userId: string, role: string | null) {
  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ secondaryRole: role, updatedAt: Date.now() })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new NotFoundError("User");
  return { id: updated.id, secondaryRole: updated.secondaryRole };
}

export async function adminDeleteUser(userId: string) {
  const db = getDb();
  await db.delete(users).where(eq(users.id, userId));
}

// ─── Profile Approval ────────────────────────────────────────────────────────

export async function listPendingProfiles() {
  const db = getDb();
  return db
    .select()
    .from(profileEdits)
    .where(eq(profileEdits.status, "pending"))
    .orderBy(desc(profileEdits.createdAt));
}

export async function approveProfile(editId: string) {
  const db = getDb();
  const [edit] = await db
    .select()
    .from(profileEdits)
    .where(eq(profileEdits.id, editId))
    .limit(1);
  if (!edit) throw new NotFoundError("Profile edit");

  const data = edit.data as Record<string, unknown>;
  await db
    .update(users)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(users.id, edit.userId));
  await db
    .update(profileEdits)
    .set({ status: "approved" })
    .where(eq(profileEdits.id, editId));
  return { success: true };
}

export async function rejectProfile(editId: string) {
  const db = getDb();
  const [updated] = await db
    .update(profileEdits)
    .set({ status: "rejected" })
    .where(eq(profileEdits.id, editId))
    .returning();
  if (!updated) throw new NotFoundError("Profile edit");
  return { success: true };
}

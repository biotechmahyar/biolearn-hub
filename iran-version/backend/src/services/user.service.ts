/**
 * Service layer for User management and profiles.
 */
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export const userService = {
  async findById(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByEmail(email: string) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  },

  async listAll() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  },

  async listAdmin() {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      secondaryRole: u.secondaryRole,
      university: u.university,
      major: u.major,
      isAnonymous: u.isAnonymous,
      createdAt: u.createdAt,
    }));
  },

  async setRole(userId: string, role: string) {
    const [row] = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
    return row ?? null;
  },

  async setSecondaryRole(userId: string, secondaryRole: string | null) {
    const [row] = await db
      .update(users)
      .set({ secondaryRole })
      .where(eq(users.id, userId))
      .returning();
    return row ?? null;
  },

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      about?: string;
    }
  ) {
    const patch: Record<string, unknown> = {};
    if (data.firstName !== undefined) patch.firstName = data.firstName || null;
    if (data.lastName !== undefined) patch.lastName = data.lastName || null;
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl || null;
    if (data.about !== undefined) patch.about = data.about || null;
    if (data.firstName || data.lastName) {
      patch.name = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
    }
    const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    return row ?? null;
  },

  async approvePendingProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user || !user.pendingProfile) return null;

    const p = user.pendingProfile as any;
    const patch: Record<string, unknown> = {
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
      avatarUrl: p.avatarStorageId ?? null,
      about: p.about ?? null,
      pendingProfile: null,
    };
    if (p.firstName || p.lastName) {
      patch.name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    }
    const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    return row ?? null;
  },

  async rejectPendingProfile(userId: string) {
    const [row] = await db
      .update(users)
      .set({ pendingProfile: null })
      .where(eq(users.id, userId))
      .returning();
    return row ?? null;
  },

  async listPendingProfiles() {
    const rows = await db.select().from(users);
    return rows
      .filter((u) => u.pendingProfile !== null && u.pendingProfile !== undefined)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        pending: u.pendingProfile,
      }))
      .sort((a, b) => {
        const aTime = (a.pending as any)?.submittedAt ?? 0;
        const bTime = (b.pending as any)?.submittedAt ?? 0;
        return bTime - aTime;
      });
  },

  async delete(userId: string) {
    const [row] = await db.delete(users).where(eq(users.id, userId)).returning();
    return row ?? null;
  },
};

import { db, generateId, now } from "./db.js";
import {
  courses, categories, instructors, articles, dictionaryTerms,
  exams, products, workshops, storeProducts, announcements
} from "./schema.js";
import { eq } from "drizzle-orm";

const MAIN_SITE_URL = process.env.MAIN_SITE_URL || "https://nibrc.ir";
const SYNC_API_KEY = process.env.SYNC_API_KEY || "";

interface SyncResult {
  status: string;
  message: string;
  synced?: Record<string, number>;
}

// Helper: fetch JSON from Convex /sync/data endpoint
async function fetchSyncData(): Promise<Record<string, any> | null> {
  if (!SYNC_API_KEY) {
    console.error("[SYNC] SYNC_API_KEY is not set. Cannot sync.");
    return null;
  }

  try {
    const res = await fetch(`${MAIN_SITE_URL}/sync/data`, {
      headers: {
        "Accept": "application/json",
        "X-Sync-Key": SYNC_API_KEY,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (res.status === 401) {
      console.error("[SYNC] Unauthorized — SYNC_API_KEY mismatch with Convex deployment.");
      return null;
    }

    if (!res.ok) {
      console.error(`[SYNC] Convex returned HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    return (await res.json()) as Record<string, any>;
  } catch (error) {
    console.error(`[SYNC] Failed to reach Convex: ${(error as Error).message}`);
    return null;
  }
}

// Helper: upsert a record by ID
async function upsert(table: any, id: string, data: Record<string, any>) {
  try {
    const existing = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (existing.length === 0) {
      await db.insert(table).values({ id, ...data });
      return "created";
    } else {
      await db.update(table).set(data).where(eq(table.id, id));
      return "updated";
    }
  } catch (error) {
    console.error(`[SYNC] Upsert error for ${id}:`, (error as Error).message);
    return "error";
  }
}

// Main sync function — Pull from Convex /sync/data → PostgreSQL
export async function syncFromMain(): Promise<SyncResult> {
  const synced: Record<string, number> = {};

  const data = await fetchSyncData();
  if (!data) {
    return {
      status: "error",
      message: "Failed to fetch data from Convex. Check MAIN_SITE_URL and SYNC_API_KEY.",
      synced,
    };
  }

  try {
    // 1. Sync categories
    if (Array.isArray(data.categories)) {
      let count = 0;
      for (const cat of data.categories) {
        const id = cat._id || cat.id;
        if (!id) continue;
        await upsert(categories, id, {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          accent: cat.accent,
          order: cat.order,
          published: cat.published ?? true,
          title: cat.title,
          createdAt: cat._creationTime || cat.createdAt || now(),
        });
        count++;
      }
      synced.categories = count;
      console.log(`[SYNC] categories: ${count} records`);
    }

    // 2. Sync instructors
    if (Array.isArray(data.instructors)) {
      let count = 0;
      for (const inst of data.instructors) {
        const id = inst._id || inst.id;
        if (!id) continue;
        await upsert(instructors, id, {
          userId: inst.userId,
          name: inst.name,
          slug: inst.slug,
          bio: inst.bio,
          avatar: inst.avatar,
          education: inst.education,
          specialties: inst.specialties,
          published: inst.published ?? true,
          createdAt: inst._creationTime || inst.createdAt || now(),
        });
        count++;
      }
      synced.instructors = count;
      console.log(`[SYNC] instructors: ${count} records`);
    }

    // 3. Sync courses
    if (Array.isArray(data.courses)) {
      let count = 0;
      for (const course of data.courses) {
        const id = course._id || course.id;
        if (!id) continue;
        await upsert(courses, id, {
          title: course.title,
          slug: course.slug,
          description: course.description,
          categoryId: course.categoryId,
          instructorId: course.instructorId,
          price: course.price,
          discountPrice: course.discountPrice,
          coverImage: course.coverImage,
          status: course.status,
          published: course.published ?? false,
          featured: course.featured ?? false,
          free: course.free ?? false,
          duration: course.duration,
          durationText: course.durationText,
          level: course.level,
          mode: course.mode,
          summary: course.summary,
          includes: course.includes,
          lessonsCount: course.lessonsCount,
          studentsCount: course.studentsCount,
          rating: course.rating,
          ratingCount: course.ratingCount,
          popular: course.popular ?? false,
          accent: course.accent,
          createdAt: course._creationTime || course.createdAt || now(),
          updatedAt: now(),
        });
        count++;
      }
      synced.courses = count;
      console.log(`[SYNC] courses: ${count} records`);
    }

    // 4. Sync articles
    if (Array.isArray(data.articles)) {
      let count = 0;
      for (const art of data.articles) {
        const id = art._id || art.id;
        if (!id) continue;
        await upsert(articles, id, {
          title: art.title,
          slug: art.slug,
          excerpt: art.excerpt,
          content: art.content,
          category: art.category,
          authorId: art.authorId,
          authorName: art.authorName,
          coverImage: art.coverImage,
          featuredImage: art.featuredImage,
          featured: art.featured ?? false,
          published: art.published ?? false,
          readTime: art.readTime,
          accent: art.accent,
          status: art.status,
          createdAt: art._creationTime || art.createdAt || now(),
          updatedAt: now(),
        });
        count++;
      }
      synced.articles = count;
      console.log(`[SYNC] articles: ${count} records`);
    }

    // 5. Sync dictionary terms
    if (Array.isArray(data.dictionary_terms)) {
      let count = 0;
      for (const term of data.dictionary_terms) {
        const id = term._id || term.id;
        if (!id) continue;
        await upsert(dictionaryTerms, id, {
          term: term.term,
          fullName: term.fullName,
          gramStatus: term.gramStatus,
          shape: term.shape,
          oxygen: term.oxygen,
          habitat: term.habitat,
          diseases: term.diseases,
          virulence: term.virulence,
          diagnosis: term.diagnosis,
          characteristics: term.characteristics,
          examNotes: term.examNotes,
          sources: term.sources,
          createdAt: term._creationTime || term.createdAt || now(),
        });
        count++;
      }
      synced.dictionary = count;
      console.log(`[SYNC] dictionary_terms: ${count} records`);
    }

    // 6. Sync workshops
    if (Array.isArray(data.workshops)) {
      let count = 0;
      for (const w of data.workshops) {
        const id = w._id || w.id;
        if (!id) continue;
        await upsert(workshops, id, {
          title: w.title,
          slug: w.slug,
          description: w.description,
          summary: w.summary,
          instructorId: w.instructorId,
          price: w.price,
          free: w.free ?? false,
          published: w.published ?? false,
          time: w.time,
          location: w.location,
          topic: w.topic,
          capacity: w.capacity,
          registeredCount: w.registeredCount,
          coverImage: w.coverImage,
          expertTalk: w.expertTalk ?? false,
          createdAt: w._creationTime || w.createdAt || now(),
        });
        count++;
      }
      synced.workshops = count;
      console.log(`[SYNC] workshops: ${count} records`);
    }

    // 7. Sync products
    if (Array.isArray(data.products)) {
      let count = 0;
      for (const p of data.products) {
        const id = p._id || p.id;
        if (!id) continue;
        await upsert(products, id, {
          title: p.title,
          slug: p.slug,
          description: p.description,
          price: p.price,
          coverImage: p.coverImage,
          category: p.category,
          published: p.published ?? false,
          featured: p.featured ?? false,
          createdAt: p._creationTime || p.createdAt || now(),
        });
        count++;
      }
      synced.products = count;
      console.log(`[SYNC] products: ${count} records`);
    }

    // 8. Sync testimonials (from /sync/data but stored as storeProducts if applicable)
    if (Array.isArray(data.testimonials)) {
      // Testimonials don't map to a dedicated PG table yet — log only
      console.log(`[SYNC] testimonials: ${data.testimonials.length} records (no PG table)`);
    }

    // Note: exams and announcements are not included in /sync/data
    // They are managed locally on the Iran Server
    console.log("[SYNC] exams and announcements: managed locally, not synced from Convex");

    const totalSynced = Object.values(synced).reduce((a, b) => a + b, 0);
    console.log(`[SYNC] Done. Total: ${totalSynced} records synced.`);
    return {
      status: "ok",
      message: `Synced ${totalSynced} records from Convex`,
      synced,
    };
  } catch (error) {
    console.error(`[SYNC] Error during upsert:`, error);
    return {
      status: "error",
      message: `Sync failed during upsert: ${(error as Error).message}`,
      synced,
    };
  }
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("[SYNC] Starting manual sync...");
  const result = await syncFromMain();
  console.log("[SYNC] Result:", JSON.stringify(result, null, 2));
  process.exit(result.status === "ok" ? 0 : 1);
}

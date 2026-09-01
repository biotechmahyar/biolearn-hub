import { db, generateId, now } from "./db.js";
import {
  courses, categories, instructors, articles, dictionaryTerms,
  exams, products, workshops, storeProducts, announcements
} from "./schema.js";
import { eq } from "drizzle-orm";

const MAIN_SITE_URL = process.env.MAIN_SITE_URL || "https://nibrc.ir";

interface SyncResult {
  status: string;
  message: string;
  synced?: Record<string, number>;
}

// Helper: fetch JSON from main site
async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${MAIN_SITE_URL}${path}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
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

// Main sync function
export async function syncFromMain(): Promise<SyncResult> {
  const synced: Record<string, number> = {};

  try {
    // 1. Sync categories
    const catsData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/categories");
    if (catsData?.ok && catsData.data) {
      let count = 0;
      for (const cat of catsData.data) {
        await upsert(categories, cat._id || cat.id, {
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
    }

    // 2. Sync instructors
    const instData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/instructors");
    if (instData?.ok && instData.data) {
      let count = 0;
      for (const inst of instData.data) {
        await upsert(instructors, inst._id || inst.id, {
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
    }

    // 3. Sync courses
    const coursesData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/courses");
    if (coursesData?.ok && coursesData.data) {
      let count = 0;
      for (const course of coursesData.data) {
        await upsert(courses, course._id || course.id, {
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
    }

    // 4. Sync articles
    const articlesData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/articles");
    if (articlesData?.ok && articlesData.data) {
      let count = 0;
      for (const art of articlesData.data) {
        await upsert(articles, art._id || art.id, {
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
    }

    // 5. Sync dictionary
    const dictData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/dictionary");
    if (dictData?.ok && dictData.data) {
      let count = 0;
      for (const term of dictData.data) {
        await upsert(dictionaryTerms, term._id || term.id, {
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
    }

    // 6. Sync exams
    const examsData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/exams");
    if (examsData?.ok && examsData.data) {
      let count = 0;
      for (const exam of examsData.data) {
        await upsert(exams, exam._id || exam.id, {
          title: exam.title,
          slug: exam.slug,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          questionCount: exam.questionCount,
          free: exam.free ?? false,
          published: exam.published ?? false,
          featured: exam.featured ?? false,
          diagnostic: exam.diagnostic ?? false,
          questionIds: exam.questionIds,
          accent: exam.accent,
          category: exam.category,
          createdAt: exam._creationTime || exam.createdAt || now(),
        });
        count++;
      }
      synced.exams = count;
    }

    // 7. Sync workshops
    const workshopsData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/workshops");
    if (workshopsData?.ok && workshopsData.data) {
      let count = 0;
      for (const w of workshopsData.data) {
        await upsert(workshops, w._id || w.id, {
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
    }

    // 8. Sync products
    const productsData = await fetchJson<{ ok: boolean; data: any[] }>("/api/content/products");
    if (productsData?.ok && productsData.data) {
      let count = 0;
      for (const p of productsData.data) {
        await upsert(products, p._id || p.id, {
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
    }

    // 9. Sync announcements
    const annData = await fetchJson<{ ok: boolean; data: any[] }>("/api/announcements");
    if (annData?.ok && annData.data) {
      let count = 0;
      for (const ann of annData.data) {
        await upsert(announcements, ann._id || ann.id, {
          title: ann.title,
          body: ann.body,
          link: ann.link,
          audience: ann.audience,
          published: ann.published ?? false,
          createdAt: ann._creationTime || ann.createdAt || now(),
        });
        count++;
      }
      synced.announcements = count;
    }

    const totalSynced = Object.values(synced).reduce((a, b) => a + b, 0);
    return {
      status: "ok",
      message: `Synced ${totalSynced} records from main site`,
      synced,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Sync failed: ${(error as Error).message}`,
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

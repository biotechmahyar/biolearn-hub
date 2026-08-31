import { httpAction } from "./_generated/server";

/**
 * GET /sync/data — Serves all public data for the Iran mirror site.
 *
 * Protected by X-Sync-Key header. Returns JSON with all public tables.
 * This is the only endpoint the Iran sync worker needs to poll.
 */
export const handleSyncData = httpAction(async (ctx, request) => {
  // Auth: verify sync key
  const syncKey = request.headers.get("X-Sync-Key");
  const expectedKey = process.env.SYNC_API_KEY || "changeme-sync-secret-key";
  if (syncKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch all public tables in parallel
  const [
    categories,
    instructors,
    courses,
    products,
    workshops,
    articles,
    dictionaryTerms,
    questions,
    exams,
    dailyQuiz,
    testimonials,
  ] = await Promise.all([
    ctx.runQuery("categories" as any, {}),
    ctx.runQuery("instructors" as any, {}),
    ctx.runQuery("courses" as any, { published: true }),
    ctx.runQuery("products" as any, { published: true }),
    ctx.runQuery("workshops" as any, { published: true }),
    ctx.runQuery("articles" as any, { published: true }),
    ctx.runQuery("dictionaryTerms" as any, {}),
    ctx.runQuery("questions" as any, {}),
    ctx.runQuery("exams" as any, { published: true }),
    ctx.runQuery("dailyQuiz" as any, {}),
    ctx.runQuery("testimonials" as any, {}),
  ]);

  const data = {
    categories: categories || [],
    instructors: instructors || [],
    courses: courses || [],
    products: products || [],
    workshops: workshops || [],
    articles: articles || [],
    dictionary_terms: dictionaryTerms || [],
    questions: questions || [],
    exams: exams || [],
    daily_quiz: dailyQuiz || [],
    testimonials: testimonials || [],
    synced_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300", // 5 min browser cache
      "Access-Control-Allow-Origin": "*",
    },
  });
});

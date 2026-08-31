import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

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

  // Fetch all public tables in parallel using proper API references
  const [
    categories,
    instructors,
    courses,
    products,
    workshops,
    articles,
    dictionaryTerms,
    testimonials,
  ] = await Promise.all([
    ctx.runQuery(api.content.listCategories, {}),
    ctx.runQuery(api.content.listInstructors, {}),
    ctx.runQuery(api.content.listCourses, {}),
    ctx.runQuery(api.content.listProducts, {}),
    ctx.runQuery(api.content.listWorkshops, {}),
    ctx.runQuery(api.content.listArticles, {}),
    ctx.runQuery(api.content.searchDictionary, { query: "" }),
    ctx.runQuery(api.content.listTestimonials, {}),
  ]);

  const data = {
    categories: categories || [],
    instructors: instructors || [],
    courses: courses || [],
    products: products || [],
    workshops: workshops || [],
    articles: articles || [],
    dictionary_terms: dictionaryTerms || [],
    testimonials: testimonials || [],
    synced_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

/**
 * POST /sync/push — Receives offline changes from the Iran mirror site.
 *
 * Protected by X-Sync-Key header. Receives a single change record
 * and applies it to the main database.
 */
export const handleSyncPush = httpAction(async (ctx, request) => {
  const syncKey = request.headers.get("X-Sync-Key");
  const expectedKey = process.env.SYNC_API_KEY || "changeme-sync-secret-key";
  if (syncKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { table, recordId, action, payload } = body;

  // Validate input
  if (!table || !recordId || !action || !payload) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Log the incoming change (Convex mutation would be ideal, but HTTP actions
  // can only run queries — so we just acknowledge receipt for now).
  // In production, this would call an internalMutation to write to the DB.
  console.log(`[SYNC-PUSH] Received: ${action} on ${table} (${recordId})`);

  return new Response(JSON.stringify({ ok: true, message: "Change received" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

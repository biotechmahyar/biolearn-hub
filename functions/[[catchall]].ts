// Cloudflare Pages Function — SPA catch-all fallback
// Every request that doesn't match a static asset returns index.html
// so React Router can handle client-side routing.

export const onRequest = async (context) => {
  const env = context.env as any;

  // Try to fetch the static asset first
  const response = await env.ASSETS.fetch(context.request);

  // If the asset exists (not 404), return it
  if (response.status !== 404) {
    return response;
  }

  // For all other routes, return index.html (SPA fallback)
  return env.ASSETS.fetch(
    new Request(new URL("/index.html", context.request.url), context.request)
  );
};

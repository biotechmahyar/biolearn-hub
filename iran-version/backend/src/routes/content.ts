import { Hono } from "hono";
import { db } from "../db/index.js";
import { categories } from "../db/schema.js";

export const contentRoutes = new Hono();

// List categories
contentRoutes.get("/categories", async (c) => {
  const cats = await db.select().from(categories).orderBy(categories.order);
  return c.json(cats);
});

// Placeholder routes — will be populated during migration
contentRoutes.get("/courses", async (c) => {
  return c.json([]); // TODO: migrate courses
});

contentRoutes.get("/courses/:slug", async (c) => {
  return c.json({ error: "Not implemented yet" }, 501);
});

contentRoutes.get("/articles", async (c) => {
  return c.json([]); // TODO: migrate articles
});

contentRoutes.get("/articles/:slug", async (c) => {
  return c.json({ error: "Not implemented yet" }, 501);
});

contentRoutes.get("/instructors", async (c) => {
  return c.json([]); // TODO: migrate instructors
});

contentRoutes.get("/dictionary", async (c) => {
  return c.json([]); // TODO: migrate dictionary
});

import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import * as notificationService from "../services/notification.service.js";

const notifications = new Hono();

// ─── Announcements ───────────────────────────────────────────────────────────

notifications.get("/", async (c) => {
  const data = await notificationService.listVisibleAnnouncements();
  return c.json(successResponse(data));
});

notifications.get("/all", authenticate, requireAdmin, async (c) => {
  const data = await notificationService.listAllAnnouncements();
  return c.json(successResponse(data));
});

notifications.get("/mine", authenticate, async (c) => {
  const user = c.get("user");
  const data = await notificationService.listMyAnnouncements(user.userId);
  return c.json(successResponse(data));
});

notifications.post("/", authenticate, requireAdmin, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      title: z.string().min(1),
      body: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      targetTitle: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await notificationService.createAnnouncement(
    user.userId,
    user.email,
    body
  );
  return c.json(successResponse(data), 201);
});

notifications.delete("/:id", authenticate, requireAdmin, async (c) => {
  await notificationService.deleteAnnouncement(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Reminders ───────────────────────────────────────────────────────────────

notifications.get("/reminders", authenticate, async (c) => {
  const user = c.get("user");
  const data = await notificationService.refreshReminders(user.userId);
  return c.json(successResponse(data));
});

notifications.post("/reminders/:id/shown", authenticate, async (c) => {
  const data = await notificationService.markReminderShown(c.req.param("id")!!);
  return c.json(successResponse(data));
});

notifications.post("/reminders/arm-next-exam", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      title: z.string().min(1),
      body: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await notificationService.armNextExamReminder(
    user.userId,
    body
  );
  return c.json(successResponse(data), 201);
});

notifications.get("/reminders/armed-next-exam", authenticate, async (c) => {
  const user = c.get("user");
  const data = await notificationService.getArmedNextExamReminder(user.userId);
  return c.json(successResponse(data));
});

// ─── Inbox ───────────────────────────────────────────────────────────────────

notifications.get("/inbox", authenticate, async (c) => {
  const user = c.get("user");
  const data = await notificationService.listMyInbox(user.userId);
  return c.json(successResponse(data));
});

notifications.get("/inbox/all", authenticate, requireAdmin, async (c) => {
  const data = await notificationService.listAllInbox();
  return c.json(successResponse(data));
});

notifications.post("/inbox", authenticate, requireAdmin, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      userId: z.string(),
      title: z.string().min(1),
      body: z.string().optional(),
    })
  );
  const data = await notificationService.sendInboxMessage(
    body.userId,
    body.title,
    body.body
  );
  return c.json(successResponse(data), 201);
});

notifications.delete("/inbox/:id", authenticate, async (c) => {
  await notificationService.deleteInboxMessage(c.req.param("id")!!);
  return c.json(successResponse({ deleted: true }));
});

notifications.post("/inbox/:id/read", authenticate, async (c) => {
  const data = await notificationService.markInboxRead(c.req.param("id")!!);
  return c.json(successResponse(data));
});

export default notifications;

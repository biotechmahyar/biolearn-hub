import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate } from "../middleware/auth.js";
import * as instructorService from "../services/instructor.service.js";

const instructor = new Hono();

instructor.use("*", authenticate);

// ─── Attendance ──────────────────────────────────────────────────────────────

instructor.get("/attendance/rooms", async (c) => {
  const user = c.get("user");
  const data = await instructorService.listInstructorRooms(user.userId);
  return c.json(successResponse(data));
});

instructor.get("/attendance/rooms/:roomId/students", async (c) => {
  const data = await instructorService.getRoomStudents(c.req.param("roomId")!!);
  return c.json(successResponse(data));
});

instructor.get("/attendance/rooms/:roomId", async (c) => {
  const data = await instructorService.getRoomStudents(c.req.param("roomId")!!);
  return c.json(successResponse(data));
});

instructor.post("/attendance/rooms/:roomId/mark", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      userId: z.string(),
      status: z.string(),
    })
  );
  const user = c.get("user");
  const data = await instructorService.markAttendance(
    c.req.param("roomId")!!,
    body.userId,
    body.status,
    user.userId
  );
  return c.json(successResponse(data));
});

// ─── Resources ───────────────────────────────────────────────────────────────

instructor.get("/resources/:courseId", async (c) => {
  const data = await instructorService.listCourseResources(
    c.req.param("courseId")
  );
  return c.json(successResponse(data));
});

instructor.post("/resources", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      courseId: z.string(),
      title: z.string().min(1),
      url: z.string().optional(),
      storageId: z.string().optional(),
      type: z.string().optional(),
      size: z.number().optional(),
    })
  );
  const { courseId, ...data } = body;
  const result = await instructorService.addCourseResource(courseId, data);
  return c.json(successResponse(result), 201);
});

instructor.delete("/resources/:resourceId", async (c) => {
  await instructorService.deleteCourseResource(c.req.param("resourceId")!);
  return c.json(successResponse({ deleted: true }));
});

// ─── Direct Messages ─────────────────────────────────────────────────────────

instructor.post("/messages", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      receiverId: z.string(),
      text: z.string().min(1),
    })
  );
  const user = c.get("user");
  const data = await instructorService.sendDirectMessage(
    user.userId,
    body.receiverId,
    body.text
  );
  return c.json(successResponse(data), 201);
});

instructor.get("/messages/conversations", async (c) => {
  const user = c.get("user");
  const data = await instructorService.listConversations(user.userId);
  return c.json(successResponse(data));
});

instructor.get("/messages/:partnerId", async (c) => {
  const user = c.get("user");
  const data = await instructorService.getConversation(
    user.userId,
    c.req.param("partnerId")!
  );
  return c.json(successResponse(data));
});

instructor.post("/messages/:partnerId/read", async (c) => {
  const user = c.get("user");
  await instructorService.markConversationRead(
    user.userId,
    c.req.param("partnerId")!
  );
  return c.json(successResponse({ read: true }));
});

// ─── Payments ────────────────────────────────────────────────────────────────

instructor.get("/payments", async (c) => {
  const user = c.get("user");
  const data = await instructorService.listInstructorPayments(user.userId);
  return c.json(successResponse(data));
});

// ─── Performance ─────────────────────────────────────────────────────────────

instructor.get("/performance", async (c) => {
  const user = c.get("user");
  const data = await instructorService.getStudentPerformance(user.userId);
  return c.json(successResponse(data));
});

// ─── Bank Account ────────────────────────────────────────────────────────────

instructor.get("/bank-account", async (c) => {
  const user = c.get("user");
  const data = await instructorService.getBankAccount(user.userId);
  return c.json(successResponse(data));
});

instructor.put("/bank-account", async (c) => {
  const body = await validateBody(
    c,
    z.object({
      bankName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      bankCardNumber: z.string().optional(),
      bankSheba: z.string().optional(),
    })
  );
  const user = c.get("user");
  const data = await instructorService.updateBankAccount(user.userId, body);
  return c.json(successResponse(data));
});

export default instructor;

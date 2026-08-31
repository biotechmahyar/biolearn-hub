import { Hono } from "hono";
import { successResponse } from "../lib/errors.js";
import { validateBody, z } from "../lib/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import * as ticketService from "../services/ticket.service.js";

const tickets = new Hono();

tickets.post("/", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({
      subject: z.string().min(1),
      text: z.string().min(1),
    })
  );
  const user = c.get("user");
  const data = await ticketService.createTicket(
    user.userId,
    body.subject,
    body.text
  );
  return c.json(successResponse(data), 201);
});

tickets.get("/my", authenticate, async (c) => {
  const user = c.get("user");
  const data = await ticketService.getMyTickets(user.userId);
  return c.json(successResponse(data));
});

tickets.get("/admin", authenticate, requireAdmin, async (c) => {
  const data = await ticketService.getAllTickets();
  return c.json(successResponse(data));
});

tickets.get("/:id", authenticate, async (c) => {
  const user = c.get("user");
  const data = await ticketService.getTicket(
    c.req.param("id")!!,
    user.userId,
    false
  );
  return c.json(successResponse(data));
});

tickets.post("/:id/messages", authenticate, async (c) => {
  const body = await validateBody(c, z.object({ text: z.string().min(1) }));
  const user = c.get("user");
  const data = await ticketService.addTicketMessage(
    c.req.param("id")!!,
    user.userId,
    body.text,
    false
  );
  return c.json(successResponse(data));
});

tickets.patch("/:id/status", authenticate, async (c) => {
  const body = await validateBody(
    c,
    z.object({ status: z.string() })
  );
  const user = c.get("user");
  const data = await ticketService.updateTicketStatus(
    c.req.param("id")!!,
    body.status,
    user.userId,
    false
  );
  return c.json(successResponse(data));
});

export default tickets;

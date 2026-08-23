import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

const PRESENCE_WINDOW = 60_000; // treat as online if heartbeat within 60s

// ── Role helpers ────────────────────────────────────────────────────────────
async function getRole(ctx: any): Promise<string | null> {
  const user = await getCurrentUser(ctx);
  return user?.role ?? null;
}

const isInstructor = async (ctx: any) => (await getRole(ctx)) === "instructor";
const isAdmin = async (ctx: any) => (await getRole(ctx)) === "admin";

// ── Presence ────────────────────────────────────────────────────────────────
// Client calls this on an interval (heartbeat) to mark itself online.
export const touchPresence = mutation({
  args: { location: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const data = {
      userId: user._id,
      name: user.name ?? "کاربر",
      role: user.role ?? "user",
      location: args.location,
      lastSeen: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("presence", data);
  },
});

export const listOnline = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_lastSeen")
      .order("desc")
      .take(100);
    const now = Date.now();
    return rows
      .filter((p) => now - p.lastSeen < PRESENCE_WINDOW)
      .map((p) => ({
        userId: p.userId,
        name: p.name ?? "کاربر",
        role: p.role ?? "user",
        location: p.location ?? null,
      }));
  },
});

// ── Live rooms ──────────────────────────────────────────────────────────────
export const createRoom = mutation({
  args: { title: v.string(), topic: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (!(await isInstructor(ctx)) && !(await isAdmin(ctx))) {
      throw new Error("فقط مدرس می‌تواند کلاس بسازد.");
    }
    if (args.title.trim().length === 0) throw new Error("عنوان کلاس لازم است.");
    return await ctx.db.insert("classRooms", {
      instructorId: user._id,
      instructorName: user.name ?? "مدرس",
      title: args.title.trim(),
      topic: args.topic.trim(),
      description: args.description.trim(),
      status: "live",
      broadcasting: false,
      createdAt: Date.now(),
    });
  },
});

export const deleteRoom = mutation({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند آن را حذف کند.");
    // Remove the room, its messages, strokes, and signals.
    const [messages, strokes, signals] = await Promise.all([
      ctx.db.query("roomMessages").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect(),
      ctx.db.query("whiteboardStrokes").withIndex("by_room_layer", (q) => q.eq("roomId", room._id)).collect(),
      ctx.db.query("signals").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect(),
    ]);
    await Promise.all([
      ...messages.map((m) => ctx.db.delete(m._id)),
      ...strokes.map((s) => ctx.db.delete(s._id)),
      ...signals.map((s) => ctx.db.delete(s._id)),
      ctx.db.delete(room._id),
    ]);
    return { ok: true };
  },
});

export const setRoomStatus = mutation({
  args: { roomId: v.id("classRooms"), status: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند وضعیت را تغییر دهد.");
    if (args.status !== "live" && args.status !== "ended" && args.status !== "scheduled") {
      throw new Error("وضعیت نامعتبر است.");
    }
    await ctx.db.patch(args.roomId, { status: args.status as any });
    return await ctx.db.get(args.roomId);
  },
});

export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const rooms = await ctx.db.query("classRooms").order("desc").take(60);
    const enriched = await Promise.all(
      rooms.map(async (r) => {
        const messages = await ctx.db
          .query("roomMessages")
          .withIndex("by_room", (q) => q.eq("roomId", r._id))
          .collect();
        const openQuestions = messages.filter((m) => m.type === "question" && !m.answer).length;
        return {
          ...r,
          messageCount: messages.length,
          openQuestions,
        };
      }),
    );
    // Students see only live rooms; instructors see their own (all statuses).
    if (user && ((await isInstructor(ctx)) || (await isAdmin(ctx)))) {
      return enriched;
    }
    return enriched.filter((r) => r.status === "live");
  },
});

export const getRoom = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    if (room.status !== "live") {
      const user = await getCurrentUser(ctx);
      const allowed = (await isInstructor(ctx)) && room.instructorId === user?._id;
      if (!allowed && !(await isAdmin(ctx))) return null;
    }
    const messages = await ctx.db
      .query("roomMessages")
      .withIndex("by_room_created", (q) => q.eq("roomId", room._id))
      .order("asc")
      .take(200);
    const enriched = await Promise.all(
      messages.map(async (m) => {
        const attachmentUrl = m.attachmentStorageId
          ? await ctx.storage.getUrl(m.attachmentStorageId)
          : undefined;
        return { ...m, attachmentUrl };
      }),
    );
    return { ...room, messages: enriched };
  },
});

// Ask a question or post a message (with optional file/voice/image attachment) in a live room.
export const sendMessage = mutation({
  args: {
    roomId: v.id("classRooms"),
    text: v.string(),
    type: v.string(),
    attachmentType: v.optional(
      v.union(v.literal("file"), v.literal("voice"), v.literal("image")),
    ),
    attachmentName: v.optional(v.string()),
    attachmentStorageId: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if (args.text.trim().length === 0 && !args.attachmentStorageId) {
      throw new Error("متن پیام یا فایل لازم است.");
    }
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    if (room.status !== "live") throw new Error("این کلاس در حال حاضر برگزار نمی‌شود.");
    if (args.type !== "question" && args.type !== "message") {
      throw new Error("نوع پیام نامعتبر است.");
    }
    return await ctx.db.insert("roomMessages", {
      roomId: room._id,
      userId: user._id,
      name: user.name ?? "کاربر",
      role: user.role ?? "user",
      type: args.type as any,
      text: args.text.trim(),
      attachmentType: args.attachmentType,
      attachmentName: args.attachmentName,
      attachmentStorageId: args.attachmentStorageId,
      attachmentSize: args.attachmentSize,
      createdAt: Date.now(),
    });
  },
});

// ── Attachments (files, voice notes, images) ───────────────────────────────
// Client uploads the blob to this URL, gets back the storage id, then sends
// the message with attachmentStorageId.
export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Live broadcast (WebRTC signaling) ──────────────────────────────────────
export const startBroadcast = mutation({
  args: {
    roomId: v.id("classRooms"),
    kind: v.optional(v.union(v.literal("camera"), v.literal("screen"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند پخش را شروع کند.");
    await ctx.db.patch(args.roomId, {
      broadcasting: true,
      broadcastKind: args.kind ?? "camera",
    });
    return { ok: true };
  },
});

export const endBroadcast = mutation({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند پخش را پایان دهد.");
    await ctx.db.patch(args.roomId, {
      broadcasting: false,
      broadcastKind: undefined,
    });
    return { ok: true };
  },
});

// ── Whiteboard + screen-share annotations ──────────────────────────────────
// Only the instructor of the room (or an admin) may draw / clear / restyle.
export const setBoardBg = mutation({
  args: { roomId: v.id("classRooms"), bg: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند تخته را تغییر دهد.");
    if (args.bg.length > 32) throw new Error("رنگ نامعتبر است.");
    await ctx.db.patch(args.roomId, { boardBg: args.bg });
    return { ok: true };
  },
});

export const addStroke = mutation({
  args: {
    roomId: v.id("classRooms"),
    layer: v.union(v.literal("board"), v.literal("screen")),
    tool: v.union(v.literal("pen"), v.literal("highlighter"), v.literal("eraser")),
    color: v.string(),
    size: v.number(),
    points: v.array(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند روی تخته بکشد.");
    if (args.points.length === 0 || args.points.length > 800) {
      throw new Error("نقطه‌های نامعتبر.");
    }
    if (args.points.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) {
      throw new Error("مختصات خارج از محدوده است.");
    }
    if (args.size <= 0 || args.size > 0.5) throw new Error("اندازه نامعتبر است.");
    return await ctx.db.insert("whiteboardStrokes", {
      roomId: room._id,
      layer: args.layer,
      tool: args.tool,
      color: args.color.length > 32 ? "#ffffff" : args.color,
      size: args.size,
      points: args.points,
      createdAt: Date.now(),
    });
  },
});

export const clearStrokes = mutation({
  args: { roomId: v.id("classRooms"), layer: v.union(v.literal("board"), v.literal("screen")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند تخته را پاک کند.");
    const rows = await ctx.db
      .query("whiteboardStrokes")
      .withIndex("by_room_layer", (q) => q.eq("roomId", room._id).eq("layer", args.layer))
      .collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    return { ok: true };
  },
});

export const listStrokes = query({
  args: { roomId: v.id("classRooms"), layer: v.union(v.literal("board"), v.literal("screen")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const room = await ctx.db.get(args.roomId);
    if (!room) return [];
    if (room.status !== "live") {
      const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
      if (!allowed && !(await isAdmin(ctx))) return [];
    }
    return await ctx.db
      .query("whiteboardStrokes")
      .withIndex("by_room_layer_created", (q) =>
        q.eq("roomId", room._id).eq("layer", args.layer),
      )
      .order("asc")
      .take(400);
  },
});

// Peer-to-peer signaling for the live stream. The instructor posts an offer,
// every student answers, and ICE candidates are exchanged over the same table.
export const sendSignal = mutation({
  args: {
    roomId: v.id("classRooms"),
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("candidate")),
    data: v.string(),
    to: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    if (args.data.length > 16_000) throw new Error("سیگنال بیش از حد بزرگ است.");
    return await ctx.db.insert("signals", {
      roomId: room._id,
      from: user._id,
      to: args.to,
      type: args.type as any,
      data: args.data,
      createdAt: Date.now(),
    });
  },
});

export const listSignals = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const room = await ctx.db.get(args.roomId);
    if (!room) return [];
    // Only participants of a live (or previously live) room may read signals.
    if (room.status !== "live") {
      const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
      if (!allowed && !(await isAdmin(ctx))) return [];
    }
    return await ctx.db
      .query("signals")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .order("asc")
      .take(500);
  },
});

// Instructor answers an open question in their room.
export const answerQuestion = mutation({
  args: { messageId: v.id("roomMessages"), answer: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.type !== "question") throw new Error("سؤال یافت نشد.");
    const room = await ctx.db.get(msg.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند پاسخ دهد.");
    if (args.answer.trim().length === 0) throw new Error("پاسخ خالی است.");
    await ctx.db.patch(msg._id, { answer: args.answer.trim() });
    return await ctx.db.get(msg._id);
  },
});

// ── Mentoring groups ────────────────────────────────────────────────────────
export const listMentorGroups = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const groups = await ctx.db.query("mentorGroups").order("desc").take(50);
    if (user && ((await isAdmin(ctx)) || (await getRole(ctx)) === "mentor")) {
      return groups;
    }
    return groups;
  },
});

export const createMentorGroup = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    meetingDay: v.string(),
    meetingTime: v.string(),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if ((await getRole(ctx)) !== "mentor" && !(await isAdmin(ctx))) {
      throw new Error("فقط منتور می‌تواند گروه منتورینگ بسازد.");
    }
    if (args.title.trim().length === 0) throw new Error("عنوان گروه لازم است.");
    return await ctx.db.insert("mentorGroups", {
      mentorId: user._id,
      mentorName: user.name ?? "منتور",
      title: args.title.trim(),
      description: args.description.trim(),
      meetingDay: args.meetingDay,
      meetingTime: args.meetingTime,
      capacity: args.capacity,
      memberCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const deleteMentorGroup = mutation({
  args: { groupId: v.id("mentorGroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("گروه یافت نشد.");
    const allowed = (await getRole(ctx)) === "mentor" && group.mentorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط منتور این گروه می‌تواند آن را حذف کند.");
    await ctx.db.delete(args.groupId);
    return { ok: true };
  },
});

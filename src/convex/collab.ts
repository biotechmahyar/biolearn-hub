import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";

const PRESENCE_WINDOW = 60_000; // treat as online if heartbeat within 60s

// ── Role helpers ────────────────────────────────────────────────────────────
async function getRole(ctx: any): Promise<string | null> {
  const user = await getCurrentUser(ctx);
  return user?.role ?? null;
}

const isInstructor = async (ctx: any) => (await getRole(ctx)) === "instructor";
const isAdmin = async (ctx: any) => { const r = await getRole(ctx); return r === "admin" || r === "site_admin"; };

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

// All users with their presence status — for admin panel online/offline list

export const listRoomParticipants = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("presence").withIndex("by_lastSeen").order("desc").take(200);
    const now = Date.now();
    const roomLoc = `room:${args.roomId}`;
    return rows
      .filter((p) => now - p.lastSeen < PRESENCE_WINDOW && p.location === roomLoc)
      .map((p) => ({
        userId: p.userId,
        name: p.name ?? "دانشجو",
        role: p.role ?? "user",
        lastSeen: p.lastSeen,
        isRecent: now - p.lastSeen < 30_000,
      }));
  },
});


export const listAllUsersWithPresence = query({
  args: {},
  handler: async (ctx) => {
    const caller = await getCurrentUser(ctx);
    if (!caller) return [];
    const r = caller.role ?? "user";
    if (r !== "admin" && r !== "site_admin") return [];

    const users = await ctx.db.query("users").collect();
    const presences = await ctx.db.query("presence").collect();
    const presenceMap = new Map(presences.map((p) => [String(p.userId), p]));
    const now = Date.now();

    return users
      .filter((u) => u.role !== "admin" || r === "admin")
      .map((u) => {
        const pres = presenceMap.get(String(u._id));
        const isOnline = pres ? now - pres.lastSeen < PRESENCE_WINDOW : false;
        return {
          _id: u._id,
          name: u.name ?? "—",
          email: u.email ?? null,
          role: u.role ?? "user",
          isOnline,
          lastSeen: pres?.lastSeen ?? null,
          location: pres?.location ?? null,
        };
      })
      .sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (b.lastSeen ?? 0) - (a.lastSeen ?? 0);
      });
  },
});

// ── Raise hand (students) ───────────────────────────────────────────────────
export const toggleRaiseHand = mutation({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    if (room.status !== "live") throw new Error("کلاس در حال حاضر فعال نیست.");

    const existing = await ctx.db
      .query("roomMessages")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const handUp = existing.find(
      (m) => m.type === "message" && m.text === `__hand__${user._id}` && !m.answer,
    );

    if (handUp) {
      // Lower hand
      await ctx.db.patch(handUp._id, { answer: "lowered" });
      return { handUp: false };
    } else {
      // Raise hand - internal state message
      await ctx.db.insert("roomMessages", {
        roomId: room._id,
        userId: user._id,
        name: user.name ?? "دانشجو",
        role: user.role ?? "user",
        type: "message",
        text: `__hand__${user._id}`,
        createdAt: Date.now(),
      });
      // Also add a visible system message
      await ctx.db.insert("roomMessages", {
        roomId: room._id,
        userId: user._id,
        name: user.name ?? "دانشجو",
        role: user.role ?? "user",
        type: "message",
        text: `✋ ${user.name ?? "دانشجو"} دستش را بالا برد`,
        createdAt: Date.now() + 1,
      });
      return { handUp: true };
    }
  },
});

// ── Voice request / approval system ────────────────────────────────────────
export const requestVoice = mutation({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    if (room.status !== "live") throw new Error("کلاس در حال حاضر فعال نیست.");
    // Already approved?
    const speakers = (room as any).speakers ?? [];
    if (speakers.includes(user._id)) return { status: "approved" as const };
    // Check for pending request
    const existing = await ctx.db
      .query("roomMessages")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const pending = existing.find(
      (m) => m.type === "message" && m.text === `__voice_request__${user._id}` && !m.answer,
    );
    if (pending) return { status: "pending" as const };
    await ctx.db.insert("roomMessages", {
      roomId: room._id,
      userId: user._id,
      name: user.name ?? "دانشجو",
      role: user.role ?? "user",
      type: "message",
      text: `__voice_request__${user._id}`,
      createdAt: Date.now(),
    });
    // Also add a visible system message
    await ctx.db.insert("roomMessages", {
      roomId: room._id,
      userId: user._id,
      name: user.name ?? "دانشجو",
      role: user.role ?? "user",
      type: "message",
      text: `🎤 ${user.name ?? "دانشجو"} درخواست صحبت کرد`,
      createdAt: Date.now() + 1,
    });
    return { status: "pending" as const };
  },
});

export const approveSpeaker = mutation({
  args: { roomId: v.id("classRooms"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند فعال‌سازی کند.");
    const speakers = (room as any).speakers ?? [];
    if (!speakers.includes(args.userId)) {
      await ctx.db.patch(args.roomId, { speakers: [...speakers, args.userId] });
    }
    // Mark the voice request as answered
    const messages = await ctx.db
      .query("roomMessages")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const req = messages.find(
      (m) => m.type === "message" && m.text === `__voice_request__${args.userId}` && !m.answer,
    );
    if (req) await ctx.db.patch(req._id, { answer: "approved" });
    // Add visible system message
    const approvedDoc = await ctx.db.get(args.userId);
    const approvedName = (approvedDoc && "name" in approvedDoc) ? (approvedDoc as any).name : undefined;
    await ctx.db.insert("roomMessages", {
      roomId: room._id,
      userId: user._id,
      name: user.name ?? "مدرس",
      role: "instructor",
      type: "message",
      text: `✅ مدرس به ${approvedName ?? "دانشجو"} اجازه صحبت داد`,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const removeSpeaker = mutation({
  args: { roomId: v.id("classRooms"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("کلاس یافت نشد.");
    const allowed = (await isInstructor(ctx)) && room.instructorId === user._id;
    if (!allowed && !(await isAdmin(ctx))) throw new Error("فقط مدرس این کلاس می‌تواند غیرفعال کند.");
    const speakers = (room as any).speakers ?? [];
    await ctx.db.patch(args.roomId, { speakers: speakers.filter((s: string) => s !== args.userId) });
    const removedDoc = await ctx.db.get(args.userId);
    const removedName = (removedDoc && "name" in removedDoc) ? (removedDoc as any).name : undefined;
    await ctx.db.insert("roomMessages", {
      roomId: room._id,
      userId: user._id,
      name: user.name ?? "مدرس",
      role: "instructor",
      type: "message",
      text: `🔇 مدرس میکروفون ${removedName ?? "دانشجو"} را قطع کرد`,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const listVoiceRequests = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return { requests: [], speakers: [] };
    const speakers = (room as any).speakers ?? [];
    const messages = await ctx.db
      .query("roomMessages")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const pending = messages
      .filter((m) => m.type === "message" && m.text.startsWith("__voice_request__") && !m.answer)
      .map((m) => ({
        userId: m.userId,
        name: m.name,
        requestId: m._id,
        createdAt: m.createdAt,
      }));
    // Resolve speaker names
    const speakerDetails = await Promise.all(
      speakers.map(async (sid: string) => {
        const doc = await ctx.db.get(sid as any);
        const name = (doc && "name" in doc) ? (doc as any).name : undefined;
        return { userId: sid, name: name ?? "دانشجو" };
      })
    );
    return { requests: pending, speakers: speakerDetails };
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
        const handsUp = messages.filter((m) => m.type === "message" && m.text.startsWith("__hand__") && !m.answer).length;
        return {
          ...r,
          messageCount: messages.length,
          openQuestions,
          handsUp,
        };
      }),
    );
    // Students see live rooms + scheduled rooms with a platform link; instructors see their own (all statuses).
    if (user && ((await isInstructor(ctx)) || (await isAdmin(ctx)))) {
      return enriched;
    }
    return enriched.filter((r) => r.status === "live" || (r.status === "scheduled" && r.platformUrl));
  },
});

export const getRoom = query({
  args: { roomId: v.id("classRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    if (room.status !== "live") {
      const user = await getCurrentUser(ctx);
      if (!user) return null;
      const isRoomInstructor = room.instructorId === user._id;
      const role = user.role ?? null;
      const isSiteAdmin = role === "admin" || role === "site_admin";
      // Check if student is enrolled in any course taught by this instructor
      let isEnrolledStudent = false;
      if (!isRoomInstructor && !isSiteAdmin) {
        const userEnrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const enrollment of userEnrollments) {
          const course = await ctx.db.get(enrollment.courseId);
          if (course && (course as any).instructorId === room.instructorId) {
            isEnrolledStudent = true;
            break;
          }
        }
      }
      if (!isRoomInstructor && !isSiteAdmin && !isEnrolledStudent) return null;
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

// ── Group membership ──────────────────────────────────────────────────────

export const joinGroup = mutation({
  args: { groupId: v.id("mentorGroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("گروه یافت نشد.");
    // Check capacity
    if (group.memberCount >= group.capacity) throw new Error("ظرفیت گروه تکمیل است.");
    // Check duplicate
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", user._id))
      .first();
    if (existing) throw new Error("شما قبلاً عضو این گروه هستید.");

    await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: user._id,
      userName: user.name ?? "کاربر",
      joinedAt: Date.now(),
    });
    await ctx.db.patch(args.groupId, { memberCount: group.memberCount + 1 });
    return { ok: true };
  },
});

export const leaveGroup = mutation({
  args: { groupId: v.id("mentorGroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", user._id))
      .first();
    if (!membership) throw new Error("عضویت یافت نشد.");
    await ctx.db.delete(membership._id);
    const group = await ctx.db.get(args.groupId);
    if (group && group.memberCount > 0) {
      await ctx.db.patch(args.groupId, { memberCount: group.memberCount - 1 });
    }
    return { ok: true };
  },
});

export const listGroupMembers = query({
  args: { groupId: v.id("mentorGroups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
  },
});

export const isGroupMember = query({
  args: { groupId: v.id("mentorGroups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", user._id))
      .first();
    return !!membership;
  },
});

// ── Group announcements (with Telegram notification) ───────────────────────

export const createGroupAnnouncement = mutation({
  args: {
    groupId: v.id("mentorGroups"),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("ابتدا وارد حساب شوید.");
    if ((await getRole(ctx)) !== "mentor" && !(await isAdmin(ctx))) {
      throw new Error("فقط منتور می‌تواند اعلان گروه ایجاد کند.");
    }
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("گروه یافت نشد.");

    const announcementId = await ctx.db.insert("groupAnnouncements", {
      groupId: args.groupId,
      mentorId: user._id,
      mentorName: user.name ?? "منتور",
      title: args.title.trim(),
      message: args.message.trim(),
      createdAt: Date.now(),
    });

    // Send Telegram notification to all group members
    try {
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .collect();

      for (const member of members) {
        await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
          userId: member.userId,
          type: "group",
          key: `group-announce:${announcementId}:${member.userId}`,
          title: `👥 اعلان گروه «${group.title}»`,
          message: `${args.title.trim()}\n\n${args.message.trim().slice(0, 300)}`,
          linkLabel: "مشاهده در Genova",
        });
      }
    } catch { /* notification failure should not break announcement creation */ }

    return { ok: true, id: announcementId };
  },
});

export const listGroupAnnouncements = query({
  args: { groupId: v.id("mentorGroups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groupAnnouncements")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(50);
  },
});

// ── Session reminders ─────────────────────────────────────────────────────
// Triggered on-demand: checks upcoming sessions and sends reminders

export const checkSessionReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const upcoming = await ctx.db
      .query("mentorSessions")
      .withIndex("by_created", (q) => q.gte("createdAt", now - 7 * 24 * 60 * 60 * 1000))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    let remindersSent = 0;

    for (const session of upcoming) {
      // Parse session date/time into a timestamp
      // Session date format: YYYY-MM-DD, time format: HH:MM
      const sessionTimestamp = new Date(`${session.date}T${session.time}`).getTime();
      if (isNaN(sessionTimestamp) || sessionTimestamp < now) continue;

      const diffMs = sessionTimestamp - now;
      const hoursBefore = diffMs / (1000 * 60 * 60);

      // 24-hour reminder
      if (hoursBefore <= 24 && hoursBefore > 23) {
        const key = `reminder-24h:${session._id}`;
        const existing = await ctx.db
          .query("telegramNotifLog")
          .withIndex("by_key", (q: any) => q.eq("key", key))
          .first();
        if (!existing) {
          try {
            await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
              userId: session.studentId,
              type: "meeting",
              key,
              title: "⏰ یادآوری جلسه (۲۴ ساعت دیگر)",
              message: `جلسه شما با ${session.mentorName} فردا در ساعت ${session.time} برگزار می‌شود.\n\nعنوان: ${session.title}`,
              linkLabel: "مشاهده جلسه",
            });
            remindersSent++;
          } catch { /* ignore */ }
        }
      }

      // 1-hour reminder
      if (hoursBefore <= 1 && hoursBefore > 0.9) {
        const key = `reminder-1h:${session._id}`;
        const existing = await ctx.db
          .query("telegramNotifLog")
          .withIndex("by_key", (q: any) => q.eq("key", key))
          .first();
        if (!existing) {
          try {
            await ctx.scheduler.runAfter(0, api.telegramNotifications.sendNotification, {
              userId: session.studentId,
              type: "meeting",
              key,
              title: "⏰ یادآوری جلسه (۱ ساعت دیگر)",
              message: `جلسه شما با ${session.mentorName} در یک ساعت آینده برگزار می‌شود.\n\nعنوان: ${session.title}`,
              linkLabel: "مشاهده جلسه",
            });
            remindersSent++;
          } catch { /* ignore */ }
        }
      }
    }

    return { checked: upcoming.length, remindersSent };
  },
});

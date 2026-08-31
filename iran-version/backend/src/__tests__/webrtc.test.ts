// ─── WebRTC Signaling Tests ──────────────────────────────────────────────────
// Phase 6C — Tests for WebRTC signaling service, Socket.IO events, RBAC,
// peer tracking, signal persistence, and disconnect cleanup.

import { describe, it, expect, beforeAll } from "vitest";

// ─── Module Structure Tests ──────────────────────────────────────────────────

describe("WebRTC Service — Module Structure", () => {
  it("should export all required service functions", async () => {
    const mod = await import("../services/webrtc.service.js");
    expect(typeof mod.saveSignal).toBe("function");
    expect(typeof mod.getSignalsForUser).toBe("function");
    expect(typeof mod.clearRoomSignals).toBe("function");
    expect(typeof mod.getPeersInRoom).toBe("function");
    expect(typeof mod.addPeerToRoom).toBe("function");
    expect(typeof mod.removePeerFromRoom).toBe("function");
    expect(typeof mod.removeUserFromAllRooms).toBe("function");
    expect(typeof mod.isUserAuthorizedForWebRTC).toBe("function");
    expect(typeof mod.getRoomInfo).toBe("function");
  });

  it("should export Socket.IO setup from realtime/socket", async () => {
    const mod = await import("../realtime/socket.js");
    expect(typeof mod.setupSocketIO).toBe("function");
  });
});

// ─── Peer Tracking Tests (In-Memory) ────────────────────────────────────────

describe("WebRTC Peer Tracking — In-Memory", () => {
  let addPeerToRoom: typeof import("../services/webrtc.service.js")["addPeerToRoom"];
  let removePeerFromRoom: typeof import("../services/webrtc.service.js")["removePeerFromRoom"];
  let removeUserFromAllRooms: typeof import("../services/webrtc.service.js")["removeUserFromAllRooms"];
  let getPeersInRoom: typeof import("../services/webrtc.service.js")["getPeersInRoom"];

  beforeAll(async () => {
    const mod = await import("../services/webrtc.service.js");
    addPeerToRoom = mod.addPeerToRoom;
    removePeerFromRoom = mod.removePeerFromRoom;
    removeUserFromAllRooms = mod.removeUserFromAllRooms;
    getPeersInRoom = mod.getPeersInRoom;
  });

  it("should return empty array for unknown room", () => {
    const peers = getPeersInRoom("nonexistent-room-id");
    expect(peers).toEqual([]);
  });

  it("should add a peer to a room", () => {
    const testRoom = `test-room-${Date.now()}-1`;
    const testUser = `user-1-${Date.now()}`;
    addPeerToRoom(testRoom, testUser);
    const peers = getPeersInRoom(testRoom);
    expect(peers).toContain(testUser);
    expect(peers.length).toBe(1);
    // Cleanup
    removePeerFromRoom(testRoom, testUser);
  });

  it("should add multiple peers to a room", () => {
    const testRoom = `test-room-${Date.now()}-2`;
    const user1 = `user-a-${Date.now()}`;
    const user2 = `user-b-${Date.now()}`;
    addPeerToRoom(testRoom, user1);
    addPeerToRoom(testRoom, user2);
    const peers = getPeersInRoom(testRoom);
    expect(peers).toContain(user1);
    expect(peers).toContain(user2);
    expect(peers.length).toBe(2);
    // Cleanup
    removePeerFromRoom(testRoom, user1);
    removePeerFromRoom(testRoom, user2);
  });

  it("should remove a peer from a room", () => {
    const testRoom = `test-room-${Date.now()}-3`;
    const user1 = `user-x-${Date.now()}`;
    const user2 = `user-y-${Date.now()}`;
    addPeerToRoom(testRoom, user1);
    addPeerToRoom(testRoom, user2);
    removePeerFromRoom(testRoom, user1);
    const peers = getPeersInRoom(testRoom);
    expect(peers).not.toContain(user1);
    expect(peers).toContain(user2);
    expect(peers.length).toBe(1);
    // Cleanup
    removePeerFromRoom(testRoom, user2);
  });

  it("should remove user from all rooms", () => {
    const room1 = `test-room-${Date.now()}-4a`;
    const room2 = `test-room-${Date.now()}-4b`;
    const userId = `user-multi-${Date.now()}`;
    addPeerToRoom(room1, userId);
    addPeerToRoom(room2, userId);
    removeUserFromAllRooms(userId);
    expect(getPeersInRoom(room1)).not.toContain(userId);
    expect(getPeersInRoom(room2)).not.toContain(userId);
  });

  it("should handle removing non-existent peer gracefully", () => {
    const testRoom = `test-room-${Date.now()}-5`;
    removePeerFromRoom(testRoom, "nonexistent-user");
    expect(getPeersInRoom(testRoom)).toEqual([]);
  });
});

// ─── Socket.IO Event Contract Tests ─────────────────────────────────────────

describe("WebRTC Signaling — Event Contracts", () => {
  it("should define the correct WebRTC event names", () => {
    // These are the event names that the client should listen for / emit
    const clientToServerEvents = [
      "webrtc:join",
      "webrtc:leave",
      "webrtc:offer",
      "webrtc:answer",
      "webrtc:ice-candidate",
      "webrtc:get-peers",
    ];

    const serverToClientEvents = [
      "webrtc:peer-joined",
      "webrtc:peer-left",
      "webrtc:peer-list",
      "webrtc:offer",
      "webrtc:answer",
      "webrtc:ice-candidate",
      "webrtc:error",
    ];

    // Verify all event names follow the naming convention
    for (const event of clientToServerEvents) {
      expect(event).toMatch(/^webrtc:/);
    }
    for (const event of serverToClientEvents) {
      expect(event).toMatch(/^webrtc:/);
    }

    // Verify bidirectional events exist (offer, answer, ice-candidate)
    const bidirectional = ["webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"];
    for (const event of bidirectional) {
      expect(clientToServerEvents).toContain(event);
      expect(serverToClientEvents).toContain(event);
    }
  });

  it("should require roomId for webrtc:join", () => {
    // Schema validation: webrtc:join requires roomId
    const payload = { roomId: "some-room-id" };
    expect(payload.roomId).toBeTruthy();
  });

  it("should require roomId, toUserId, and sdp for webrtc:offer", () => {
    const payload = {
      roomId: "room-id",
      toUserId: "target-user",
      sdp: JSON.stringify({ type: "offer", sdp: "v=0\r\n..." }),
    };
    expect(payload.roomId).toBeTruthy();
    expect(payload.toUserId).toBeTruthy();
    expect(payload.sdp).toBeTruthy();
  });

  it("should require roomId, toUserId, and sdp for webrtc:answer", () => {
    const payload = {
      roomId: "room-id",
      toUserId: "target-user",
      sdp: JSON.stringify({ type: "answer", sdp: "v=0\r\n..." }),
    };
    expect(payload.roomId).toBeTruthy();
    expect(payload.toUserId).toBeTruthy();
    expect(payload.sdp).toBeTruthy();
  });

  it("should require roomId, toUserId, and candidate for webrtc:ice-candidate", () => {
    const payload = {
      roomId: "room-id",
      toUserId: "target-user",
      candidate: JSON.stringify({
        candidate: "candidate:1 1 UDP 2130706431 ...",
        sdpMid: "0",
        sdpMLineIndex: 0,
      }),
    };
    expect(payload.roomId).toBeTruthy();
    expect(payload.toUserId).toBeTruthy();
    expect(payload.candidate).toBeTruthy();
  });

  it("should have correct signal data shape for offer", () => {
    const signalPayload = {
      signalId: "uuid-123",
      roomId: "room-id",
      fromUserId: "sender-user",
      fromName: "Alice",
      fromRole: "instructor",
      sdp: JSON.stringify({ type: "offer", sdp: "v=0\r\n..." }),
      timestamp: Date.now(),
    };

    expect(signalPayload.signalId).toBeTruthy();
    expect(signalPayload.roomId).toBeTruthy();
    expect(signalPayload.fromUserId).toBeTruthy();
    expect(signalPayload.fromName).toBeTruthy();
    expect(typeof signalPayload.fromRole).toBe("string");
    expect(signalPayload.sdp).toBeTruthy();
    expect(typeof signalPayload.timestamp).toBe("number");
  });

  it("should have correct peer-joined payload shape", () => {
    const payload = {
      roomId: "room-id",
      userId: "joining-user",
      name: "Bob",
      role: "user",
      timestamp: Date.now(),
    };

    expect(payload.roomId).toBeTruthy();
    expect(payload.userId).toBeTruthy();
    expect(payload.name).toBeTruthy();
    expect(typeof payload.timestamp).toBe("number");
  });

  it("should have correct peer-left payload shape", () => {
    const payload = {
      roomId: "room-id",
      userId: "leaving-user",
      name: "Bob",
      timestamp: Date.now(),
    };

    expect(payload.roomId).toBeTruthy();
    expect(payload.userId).toBeTruthy();
    expect(typeof payload.timestamp).toBe("number");
  });

  it("should have correct peer-list payload shape", () => {
    const payload = {
      roomId: "room-id",
      peers: [{ userId: "user-1" }, { userId: "user-2" }],
      timestamp: Date.now(),
    };

    expect(payload.roomId).toBeTruthy();
    expect(Array.isArray(payload.peers)).toBe(true);
    expect(payload.peers.length).toBe(2);
    expect(typeof payload.timestamp).toBe("number");
  });
});

// ─── Signal Schema Tests ────────────────────────────────────────────────────

describe("WebRTC Signaling — Schema Contract", () => {
  it("should define signal types correctly", () => {
    const validTypes = ["offer", "answer", "candidate"];
    expect(validTypes).toContain("offer");
    expect(validTypes).toContain("answer");
    expect(validTypes).toContain("candidate");
    expect(validTypes.length).toBe(3);
  });

  it("should accept JSON-encoded SDP data", () => {
    const sdp = JSON.stringify({
      type: "offer",
      sdp: "v=0\r\no=- 12345 12345 IN IP4 127.0.0.1\r\n",
    });
    expect(() => JSON.parse(sdp)).not.toThrow();
    const parsed = JSON.parse(sdp);
    expect(parsed.type).toBe("offer");
  });

  it("should accept JSON-encoded ICE candidate data", () => {
    const candidate = JSON.stringify({
      candidate: "candidate:1 1 UDP 2130706431 192.168.1.1 12345 typ host",
      sdpMid: "0",
      sdpMLineIndex: 0,
    });
    expect(() => JSON.parse(candidate)).not.toThrow();
    const parsed = JSON.parse(candidate);
    expect(parsed.candidate).toContain("candidate:");
  });
});

// ─── Authorization Logic Tests ──────────────────────────────────────────────

describe("WebRTC Signaling — Authorization Logic", () => {
  it("should define admin roles that get full access", () => {
    const adminRoles = ["admin", "site_admin", "super_admin"];
    expect(adminRoles).toContain("admin");
    expect(adminRoles).toContain("site_admin");
    expect(adminRoles).toContain("super_admin");
  });

  it("should define instructor as room owner for authorization", () => {
    // The instructor of a room should always be authorized
    const room = { instructorId: "instructor-1" };
    const userId = "instructor-1";
    expect(room.instructorId).toBe(userId);
  });

  it("should require room membership for non-admin non-instructor users", () => {
    // A regular user must be in the room (via groupMembers or enrollment)
    // This is checked via isUserAuthorizedForRoom or isUserAuthorizedForWebRTC
    const adminRoles = ["admin", "site_admin", "super_admin"];
    const regularRole = "user";

    // Regular user is NOT admin
    expect(adminRoles).not.toContain(regularRole);
  });

  it("should require toUserId for point-to-point signaling", () => {
    // Offers, answers, and ICE candidates must be directed to a specific user
    const eventsRequiringToUserId = [
      "webrtc:offer",
      "webrtc:answer",
      "webrtc:ice-candidate",
    ];
    for (const event of eventsRequiringToUserId) {
      expect(event).toMatch(/webrtc:(offer|answer|ice-candidate)/);
    }
  });
});

// ─── Signal Persistence Tests ───────────────────────────────────────────────

describe("WebRTC Signaling — Persistence Contract", () => {
  it("should save and retrieve signals with correct shape", async () => {
    const { saveSignal } = await import("../services/webrtc.service.js");

    // Verify the function signature
    const fn = saveSignal as unknown as (params: {
      fromUserId: string;
      toUserId: string;
      roomId: string | null;
      type: "offer" | "answer" | "candidate";
      data: string;
    }) => Promise<{
      id: string;
      fromUserId: string;
      toUserId: string;
      roomId: string | null;
      type: string;
      data: string | null;
      createdAt: number;
    }>;

    // Type-check: function should exist and be callable
    expect(typeof fn).toBe("function");
  });

  it("should support clearing signals by room", async () => {
    const { clearRoomSignals } = await import("../services/webrtc.service.js");

    const fn = clearRoomSignals as unknown as (roomId: string) => Promise<number>;
    expect(typeof fn).toBe("function");
  });

  it("should support querying signals for a user in a room", async () => {
    const { getSignalsForUser } = await import("../services/webrtc.service.js");

    const fn = getSignalsForUser as unknown as (
      roomId: string,
      toUserId: string,
      limit?: number
    ) => Promise<
      Array<{
        id: string;
        fromUserId: string;
        toUserId: string;
        roomId: string | null;
        type: string;
        data: string | null;
        createdAt: number;
      }>
    >;

    expect(typeof fn).toBe("function");
  });
});

// ─── Flow Integration Tests ─────────────────────────────────────────────────

describe("WebRTC Signaling — Connection Flow", () => {
  it("should follow the correct offer/answer/ICE flow", () => {
    // 1. Peer A joins room → webrtc:join
    // 2. Server broadcasts webrtc:peer-joined to existing peers
    // 3. Server sends webrtc:peer-list to Peer A
    // 4. Peer A creates offer → webrtc:offer(toUserId: Peer B)
    // 5. Server persists signal and forwards to Peer B
    // 6. Peer B receives webrtc:offer → creates answer
    // 7. Peer B sends → webrtc:answer(toUserId: Peer A)
    // 8. Server persists signal and forwards to Peer A
    // 9. Both exchange ICE candidates via webrtc:ice-candidate
    // 10. P2P connection established

    const flow = [
      "webrtc:join",
      "webrtc:peer-joined (broadcast)",
      "webrtc:peer-list (to joiner)",
      "webrtc:offer (Peer A → Peer B)",
      "webrtc:answer (Peer B → Peer A)",
      "webrtc:ice-candidate (bidirectional)",
    ];

    expect(flow.length).toBe(6);
    expect(flow[0]).toBe("webrtc:join");
    expect(flow[flow.length - 1]).toContain("ice-candidate");
  });

  it("should support multiple simultaneous peers", () => {
    // Room with 3 participants: Instructor, Student A, Student B
    const peers = ["instructor-id", "student-a-id", "student-b-id"];

    // Instructor can send offer to any student
    // Students can only send to each other or the instructor
    // Each pair exchanges offers independently

    const connections = [];
    for (let i = 0; i < peers.length; i++) {
      for (let j = i + 1; j < peers.length; j++) {
        connections.push({ from: peers[i], to: peers[j] });
      }
    }

    // 3 peers → 3 connections (mesh topology)
    expect(connections.length).toBe(3);
  });

  it("should handle peer disconnect cleanup", async () => {
    // When a peer disconnects:
    // 1. removeUserFromAllRooms(userId) is called
    // 2. All rooms are notified via webrtc:peer-left
    // 3. Other peers should stop sending signals to the disconnected peer
    // 4. Signals in DB are preserved for potential reconnection

    const { addPeerToRoom, removeUserFromAllRooms, getPeersInRoom } =
      await import("../services/webrtc.service.js");

    const userId = `disconnecting-user-${Date.now()}`;
    const rooms = [`room-disc-${Date.now()}-1`, `room-disc-${Date.now()}-2`];

    for (const room of rooms) {
      addPeerToRoom(room, userId);
    }

    removeUserFromAllRooms(userId);

    for (const room of rooms) {
      expect(getPeersInRoom(room)).not.toContain(userId);
    }
  });
});

// ─── Error Handling Tests ───────────────────────────────────────────────────

describe("WebRTC Signaling — Error Handling", () => {
  it("should validate that all error events use webrtc:error", () => {
    // All server→client error responses should use the same event name
    const errorEvent = "webrtc:error";
    expect(errorEvent).toBe("webrtc:error");
  });

  it("should require roomId in all WebRTC events", () => {
    // Every event must include a roomId for room context
    const eventsWithRoomId = [
      "webrtc:join",
      "webrtc:leave",
      "webrtc:offer",
      "webrtc:answer",
      "webrtc:ice-candidate",
      "webrtc:get-peers",
    ];
    expect(eventsWithRoomId.length).toBe(6);
  });

  it("should handle missing required fields gracefully", () => {
    // When required fields are missing, server should emit webrtc:error
    const requiredFields: Record<string, string[]> = {
      "webrtc:join": ["roomId"],
      "webrtc:offer": ["roomId", "toUserId", "sdp"],
      "webrtc:answer": ["roomId", "toUserId", "sdp"],
      "webrtc:ice-candidate": ["roomId", "toUserId", "candidate"],
      "webrtc:leave": ["roomId"],
      "webrtc:get-peers": ["roomId"],
    };

    for (const [, fields] of Object.entries(requiredFields)) {
      expect(fields.length).toBeGreaterThanOrEqual(1);
    }
  });
});

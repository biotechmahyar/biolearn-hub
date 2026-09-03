import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

type SignalRow = (typeof api.collab.listSignals)["_returnType"][number];

export type BroadcastStatus = "idle" | "starting" | "live" | "failed";

// ── Instructor side: publish camera/mic to all students (multi-peer) ────────
// Creates individual RTCPeerConnection per student for reliable delivery.
export function useInstructorBroadcast(roomId: string, myId?: string) {
  const [status, setStatus] = useState<BroadcastStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const signals = useQuery(api.collab.listSignals, { roomId: roomId as any });
  const sendSignal = useMutation(api.collab.sendSignal);
  const startBroadcast = useMutation(api.collab.startBroadcast);
  const endBroadcast = useMutation(api.collab.endBroadcast);

  const stop = useCallback(async () => {
    // Close all peer connections
    for (const [, pc] of pcsRef.current) {
      pc.close();
    }
    pcsRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    setStatus("idle");
    processedRef.current = new Set();
    try {
      await endBroadcast({ roomId: roomIdRef.current as any });
    } catch {
      // room may already be gone
    }
  }, [endBroadcast]);

  /** Create or reuse a PC for a specific student */
  const getOrCreatePC = useCallback(
    (studentId: string, stream: MediaStream): RTCPeerConnection => {
      let pc = pcsRef.current.get(studentId);
      if (pc && pc.connectionState !== "closed") return pc;

      pc = new RTCPeerConnection(RTC_CONFIG);
      pcsRef.current.set(studentId, pc);

      stream.getTracks().forEach((t) => pc!.addTrack(t, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && myId) {
          void sendSignal({
            roomId: roomIdRef.current as any,
            type: "candidate",
            data: JSON.stringify(e.candidate),
            to: studentId as any,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc!.connectionState === "failed" || pc!.connectionState === "closed") {
          pcsRef.current.delete(studentId);
        }
      };

      return pc;
    },
    [myId, sendSignal],
  );

  const start = useCallback(
    async (wantVideo: boolean, kind: "camera" | "screen" = "camera") => {
      setError(null);
      setStatus("starting");
      try {
        if (!navigator.mediaDevices) {
          throw new Error("مرورگر شما از پخش زنده پشتیبانی نمی‌کند.");
        }
        const stream =
          kind === "screen"
            ? await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
              })
            : await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: wantVideo,
              });
        streamRef.current = stream;
        setLocalStream(stream);

        // Broadcast a single offer to all students via signaling.
        // Each student will create their own answer; we process them individually.
        const pc = new RTCPeerConnection(RTC_CONFIG);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // Store a "broadcast" PC — we'll create per-student PCs on demand
        // when answers come in
        pcsRef.current.set("__broadcast__", pc);

        pc.onicecandidate = (e) => {
          if (e.candidate && myId) {
            void sendSignal({
              roomId: roomIdRef.current as any,
              type: "candidate",
              data: JSON.stringify(e.candidate),
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await startBroadcast({ roomId: roomIdRef.current as any, kind });
        await sendSignal({
          roomId: roomIdRef.current as any,
          type: "offer",
          data: JSON.stringify(pc.localDescription),
        });
        setStatus("live");
      } catch (e) {
        setError(e instanceof Error ? e.message : "شروع پخش ناموفق بود");
        setStatus("failed");
      }
    },
    [myId, sendSignal, startBroadcast],
  );

  // Consume answers + ICE candidates from students.
  // The broadcast PC handles the first answer; subsequent answers create new PCs.
  useEffect(() => {
    if (!signals || status !== "live") return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      try {
        if (s.type === "answer" && s.from !== myId) {
          const broadcastPC = pcsRef.current.get("__broadcast__");
          if (broadcastPC && broadcastPC.signalingState === "have-local-offer") {
            // First student answer goes to the broadcast PC
            void broadcastPC.setRemoteDescription(JSON.parse(s.data)).catch(() => {});
          } else {
            // Subsequent answers: create a dedicated PC for this student
            if (streamRef.current) {
              const pc = getOrCreatePC(s.from, streamRef.current);
              if (pc.signalingState === "have-local-offer") {
                void pc.setRemoteDescription(JSON.parse(s.data)).catch(() => {});
              }
            }
          }
        } else if (s.type === "candidate" && s.from !== myId) {
          // Route ICE candidate to the right PC
          const targetPC = s.to === myId
            ? (pcsRef.current.get(s.from) ?? pcsRef.current.get("__broadcast__"))
            : pcsRef.current.get("__broadcast__");
          if (targetPC) {
            void targetPC.addIceCandidate(new RTCIceCandidate(JSON.parse(s.data))).catch(() => {});
          }
        }
      } catch {
        // ignore malformed signals
      }
    }
  }, [signals, status, myId, getOrCreatePC]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      for (const [, pc] of pcsRef.current) {
        pc.close();
      }
      pcsRef.current.clear();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { status, localStream, error, start, stop };
}

// ── Student side: receive the instructor's live stream ──────────────────────
export function useStudentReceiver(roomId: string, instructorId?: string, myId?: string) {
  const [status, setStatus] = useState<BroadcastStatus>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const answeredRef = useRef(false);
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const signals = useQuery(api.collab.listSignals, { roomId: roomId as any });
  const sendSignal = useMutation(api.collab.sendSignal);

  const reset = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    answeredRef.current = false;
    processedRef.current = new Set();
    setRemoteStream(null);
    setStatus("idle");
  }, []);

  // Consume the instructor's offer + candidates.
  useEffect(() => {
    if (!signals || !instructorId || !myId) return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (s.from !== instructorId) continue;
      try {
        if (s.type === "offer" && !answeredRef.current) {
          const pc = new RTCPeerConnection(RTC_CONFIG);
          pcRef.current = pc;
          pc.ontrack = (e) => {
            const stream = e.streams[0] ?? new MediaStream([e.track]);
            setRemoteStream(stream);
            setStatus("live");
          };
          pc.onicecandidate = (e) => {
            if (e.candidate && myId) {
              void sendSignal({
                roomId: roomIdRef.current as any,
                type: "candidate",
                data: JSON.stringify(e.candidate),
                to: instructorId as any,
              });
            }
          };
          pc.setRemoteDescription(JSON.parse(s.data))
            .then(() => pc.createAnswer())
            .then((ans) => pc.setLocalDescription(ans))
            .then(() => {
              answeredRef.current = true;
              return sendSignal({
                roomId: roomIdRef.current as any,
                type: "answer",
                data: JSON.stringify(pc.localDescription),
                to: instructorId as any,
              });
            })
            .catch(() => setStatus("failed"));
        } else if (s.type === "candidate" && pcRef.current) {
          void pcRef.current
            .addIceCandidate(new RTCIceCandidate(JSON.parse(s.data)))
            .catch(() => {});
        }
      } catch {
        // ignore malformed signals
      }
    }
  }, [signals, instructorId, myId, sendSignal]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);

  // Allow reconnection when instructor restarts broadcast
  const reconnect = useCallback(() => {
    reset();
    answeredRef.current = false;
    processedRef.current = new Set();
  }, [reset]);

  return { status, remoteStream, error, reset, reconnect };
}

// ── Student audio sender: approved students send voice to instructor ────────
// When a student is approved as a speaker, this hook sends their mic audio
// to the instructor via WebRTC. The student creates a PC, sends an offer,
// and the instructor answers.
export function useStudentAudioSender(
  roomId: string,
  instructorId?: string,
  myId?: string,
  isApproved = false,
) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const answeredRef = useRef(false);
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const signals = useQuery(api.collab.listSignals, { roomId: roomId as any });
  const sendSignal = useMutation(api.collab.sendSignal);

  const stopSending = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    setSending(false);
    answeredRef.current = false;
    processedRef.current = new Set();
  }, []);

  const startSending = useCallback(async () => {
    if (!isApproved || !instructorId || !myId) return;
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("مرورگر شما از میکروفون پشتیبانی نمی‌کند.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && myId) {
          void sendSignal({
            roomId: roomIdRef.current as any,
            type: "candidate",
            data: JSON.stringify(e.candidate),
            to: instructorId as any,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal({
        roomId: roomIdRef.current as any,
        type: "offer",
        data: JSON.stringify(pc.localDescription),
        to: instructorId as any,
      });
      answeredRef.current = false;
      setSending(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "شروع ارسال صدا ناموفق بود");
      setSending(false);
    }
  }, [isApproved, instructorId, myId, sendSignal]);

  // Process answer from instructor
  useEffect(() => {
    if (!signals || !sending || !instructorId) return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (s.from !== instructorId) continue;
      try {
        if (s.type === "answer" && !answeredRef.current && pcRef.current) {
          await pcRef.current.setRemoteDescription(JSON.parse(s.data));
          answeredRef.current = true;
        } else if (s.type === "candidate" && pcRef.current) {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(JSON.parse(s.data)),
          );
        }
      } catch {
        // ignore
      }
    }
  }, [signals, sending, instructorId]);

  // Cleanup
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Auto-stop when no longer approved
  useEffect(() => {
    if (!isApproved && sending) {
      stopSending();
    }
  }, [isApproved, sending, stopSending]);

  return { sending, error, localStream, startSending, stopSending };
}

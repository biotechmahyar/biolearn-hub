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

// ── Instructor side: publish camera/mic to all students ─────────────────────
export function useInstructorBroadcast(roomId: string, myId?: string) {
  const [status, setStatus] = useState<BroadcastStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const signals = useQuery(api.collab.listSignals, { roomId: roomId as any });
  const sendSignal = useMutation(api.collab.sendSignal);
  const startBroadcast = useMutation(api.collab.startBroadcast);
  const endBroadcast = useMutation(api.collab.endBroadcast);

  const stop = useCallback(async () => {
    pcRef.current?.close();
    pcRef.current = null;
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

  const start = useCallback(
    async (wantVideo: boolean) => {
      setError(null);
      setStatus("starting");
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("مرورگر شما از صدا/تصویر پشتیبانی نمی‌کند.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: wantVideo,
        });
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
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await startBroadcast({ roomId: roomIdRef.current as any });
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
  useEffect(() => {
    if (!signals || status !== "live") return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (!pcRef.current) continue;
      try {
        if (s.type === "answer" && s.from !== myId && s.to === myId) {
          void pcRef.current.setRemoteDescription(JSON.parse(s.data)).catch(() => {});
        } else if (s.type === "candidate" && s.from !== myId && s.to === myId) {
          void pcRef.current
            .addIceCandidate(new RTCIceCandidate(JSON.parse(s.data)))
            .catch(() => {});
        }
      } catch {
        // ignore malformed signals
      }
    }
  }, [signals, status, myId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
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
            setRemoteStream((prev) => {
              if (prev) return prev;
              const stream = e.streams[0] ?? new MediaStream([e.track]);
              setStatus("live");
              return stream;
            });
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

  return { status, remoteStream, error, reset };
}

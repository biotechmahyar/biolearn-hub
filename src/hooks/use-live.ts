import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export type BroadcastStatus = "idle" | "starting" | "live" | "failed";

// ── Instructor side: publish camera/mic/screen to all students ─────────────
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
    for (const [, pc] of pcsRef.current) pc.close();
    pcsRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    setStatus("idle");
    processedRef.current = new Set();
    // Clean up any student audio elements
    document.querySelectorAll('[id^="student-audio-"]').forEach((el) => el.remove());
    try { await endBroadcast({ roomId: roomIdRef.current as any }); } catch {}
  }, [endBroadcast]);

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
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            : await navigator.mediaDevices.getUserMedia({ audio: true, video: wantVideo });
        streamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(RTC_CONFIG);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
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

  // Process ALL incoming signals: student answers, student audio offers, ICE candidates
  useEffect(() => {
    if (!signals || status !== "live") return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (s.from === myId) continue; // skip our own signals
      try {
        if (s.type === "offer" && s.to === myId) {
          // ── Student audio offer ──
          const key = `audio-${s.from}`;
          if (pcsRef.current.has(key) && pcsRef.current.get(key)!.connectionState !== "closed") continue;
          const pc = new RTCPeerConnection(RTC_CONFIG);
          pcsRef.current.set(key, pc);
          pc.ontrack = (ev) => {
            const ms = ev.streams[0] ?? new MediaStream([ev.track]);
            const id = `audio-el-${s.from}`;
            let el = document.getElementById(id) as HTMLAudioElement | null;
            if (!el) {
              el = document.createElement("audio");
              el.id = id;
              el.autoplay = true;
              el.style.display = "none";
              document.body.appendChild(el);
            }
            el.srcObject = ms;
          };
          pc.onicecandidate = (ev) => {
            if (ev.candidate && myId) {
              void sendSignal({
                roomId: roomIdRef.current as any,
                type: "candidate",
                data: JSON.stringify(ev.candidate),
                to: s.from as any,
              });
            }
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
              pcsRef.current.delete(key);
              document.getElementById(`audio-el-${s.from}`)?.remove();
            }
          };
          void pc.setRemoteDescription(JSON.parse(s.data))
            .then(() => pc.createAnswer())
            .then((ans) => pc.setLocalDescription(ans))
            .then(() => sendSignal({
              roomId: roomIdRef.current as any,
              type: "answer",
              data: JSON.stringify(pc.localDescription),
              to: s.from as any,
            }))
            .catch(() => {});
        } else if (s.type === "answer" && s.to === myId) {
          // ── Student answer to our broadcast ──
          const broadcastPC = pcsRef.current.get("__broadcast__");
          if (broadcastPC && broadcastPC.signalingState === "have-local-offer") {
            void broadcastPC.setRemoteDescription(JSON.parse(s.data)).catch(() => {});
          }
        } else if (s.type === "candidate") {
          // ── ICE candidate — route to correct PC ──
          let pc: RTCPeerConnection | undefined;
          if (s.to === myId) {
            // Targeted at us: from student audio or student answer
            pc = pcsRef.current.get(`audio-${s.from}`)
              ?? pcsRef.current.get("__broadcast__");
          } else if (!s.to) {
            // Broadcast candidate (from student answer)
            pc = pcsRef.current.get("__broadcast__");
          }
          if (pc) {
            void pc.addIceCandidate(new RTCIceCandidate(JSON.parse(s.data))).catch(() => {});
          }
        }
      } catch {
        // ignore malformed signals
      }
    }
  }, [signals, status, myId, sendSignal]);

  useEffect(() => {
    return () => {
      for (const [, pc] of pcsRef.current) pc.close();
      pcsRef.current.clear();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { status, localStream, error, start, stop };
}

// ── Student side: receive instructor's live stream ──────────────────────────
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

  // Process ONLY broadcast offers (no `to` field) from instructor
  useEffect(() => {
    if (!signals || !instructorId || !myId) return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      if (s.from !== instructorId) continue;
      // ONLY process broadcast signals (no `to` field)
      if (s.to) {
        processedRef.current.add(s._id); // mark as seen but skip
        continue;
      }
      processedRef.current.add(s._id);
      try {
        if (s.type === "offer") {
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
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
              setStatus("failed");
            } else if (pc.connectionState === "connected") {
              setStatus("live");
            }
          };
          void pc.setRemoteDescription(JSON.parse(s.data))
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
        // ignore
      }
    }
  }, [signals, instructorId, myId, sendSignal]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);

  const reconnect = useCallback(() => {
    reset();
    answeredRef.current = false;
    processedRef.current = new Set();
  }, [reset]);

  return { status, remoteStream, error, reset, reconnect };
}

// ── Student audio sender ───────────────────────────────────────────────────
export function useStudentAudioSender(
  roomId: string,
  instructorId?: string,
  myId?: string,
  isApproved = false,
) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    streamRef.current = null;
    setSending(false);
    answeredRef.current = false;
    processedRef.current = new Set();
  }, []);

  const startSending = useCallback(async () => {
    if (!isApproved || !instructorId || !myId) return;
    if (pcRef.current) stopSending();
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("مرورگر شما از میکروفون پشتیبانی نمی‌کند.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setSending(true);
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setSending(false);
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
    } catch (e) {
      setError(e instanceof Error
        ? e.name === "NotAllowedError"
          ? "برای صحبت، دسترسی میکروفون را فعال کنید."
          : e.message
        : "شروع ارسال صدا ناموفق بود");
      setSending(false);
    }
  }, [isApproved, instructorId, myId, sendSignal, stopSending]);

  // Process answer + candidates from instructor (targeted at us only)
  useEffect(() => {
    if (!signals || !instructorId || !myId) return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (s.from !== instructorId) continue;
      if (s.to !== myId) continue;
      try {
        if (s.type === "answer" && pcRef.current && !answeredRef.current) {
          void pcRef.current.setRemoteDescription(JSON.parse(s.data)).then(() => {
            answeredRef.current = true;
          }).catch(() => {});
        } else if (s.type === "candidate" && pcRef.current) {
          void pcRef.current.addIceCandidate(
            new RTCIceCandidate(JSON.parse(s.data)),
          ).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, [signals, instructorId, myId]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      pcRef.current = null;
      streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      streamRef.current = null;
    };
  }, []);

  // Auto-stop when no longer approved
  useEffect(() => {
    if (!isApproved && sending) stopSending();
  }, [isApproved, sending, stopSending]);

  return { sending, error, startSending, stopSending };
}

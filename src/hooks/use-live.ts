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

  // Process student answers + ICE candidates + student audio offers
  useEffect(() => {
    if (!signals || status !== "live") return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      try {
        if (s.type === "answer" && s.from !== myId) {
          const broadcastPC = pcsRef.current.get("__broadcast__");
          if (broadcastPC && broadcastPC.signalingState === "have-local-offer") {
            void broadcastPC.setRemoteDescription(JSON.parse(s.data)).catch(() => {});
          } else if (s.to === myId) {
            const targetPC = pcsRef.current.get(s.from);
            if (targetPC && targetPC.signalingState === "have-local-offer") {
              void targetPC.setRemoteDescription(JSON.parse(s.data)).catch(() => {});
            }
          }
        } else if (s.type === "offer" && s.from !== myId && s.to === myId) {
          // Student audio offer: create a PC to receive their mic
          const key = `student-audio-${s.from}`;
          const existingPC = pcsRef.current.get(key);
          if (!existingPC || existingPC.connectionState === "closed") {
            const pc = new RTCPeerConnection(RTC_CONFIG);
            pcsRef.current.set(key, pc);

            pc.ontrack = (e) => {
              // Store the student's audio stream so it can be played
              const studentStream = e.streams[0] ?? new MediaStream([e.track]);
              // Attach to a hidden audio element that auto-plays
              const audio = document.createElement("audio");
              audio.srcObject = studentStream;
              audio.autoplay = true;
              audio.id = `student-audio-${s.from}`;
              document.body.appendChild(audio);
              // Clean up old one if exists
              const old = document.getElementById(`student-audio-${s.from}`);
              if (old && old !== audio) old.remove();
            };

            pc.onicecandidate = (e) => {
              if (e.candidate && myId) {
                void sendSignal({
                  roomId: roomIdRef.current as any,
                  type: "candidate",
                  data: JSON.stringify(e.candidate),
                  to: s.from as any,
                });
              }
            };

            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                pcsRef.current.delete(key);
                // Remove hidden audio element
                const el = document.getElementById(`student-audio-${s.from}`);
                if (el) el.remove();
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
          }
        } else if (s.type === "candidate" && s.from !== myId) {
          let targetPC: RTCPeerConnection | undefined;
          if (s.to === myId) {
            targetPC = pcsRef.current.get(s.from)
              ?? pcsRef.current.get(`student-audio-${s.from}`)
              ?? pcsRef.current.get("__broadcast__");
          } else {
            targetPC = pcsRef.current.get("__broadcast__");
          }
          if (targetPC) {
            void targetPC.addIceCandidate(new RTCIceCandidate(JSON.parse(s.data))).catch(() => {});
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

  // Consume ONLY broadcast offers (no `to` field) from instructor.
  // Targeted offers/answers (with `to` field) belong to the audio sender.
  useEffect(() => {
    if (!signals || !instructorId || !myId) return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (s.from !== instructorId) continue;
      // KEY FIX: skip signals targeted at us — those are for audio sender
      if (s.to) continue;
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

// ── Student audio sender: approved students send voice to instructor ────────
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
    // If already sending, stop first
    if (pcRef.current) stopSending();
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

      // Only set sending=true after connection is established
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setSending(true);
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setSending(false);
          setError("اتصال قطع شد");
        } else if (pc.connectionState === "connecting") {
          // Still connecting — don't set sending yet
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
      // Don't set sending=true here — wait for onconnectionstatechange "connected"
      setSending(true); // Optimistic — will be corrected by connection state
    } catch (e) {
      setError(e instanceof Error
        ? e.name === "NotAllowedError"
          ? "برای صحبت، دسترسی میکروفون را فعال کنید."
          : e.message
        : "شروع ارسال صدا ناموفق بود");
      setSending(false);
    }
  }, [isApproved, instructorId, myId, sendSignal, stopSending]);

  // Process answer + candidates from instructor (targeted at us)
  useEffect(() => {
    if (!signals || !instructorId || !myId) return;
    for (const s of signals) {
      if (processedRef.current.has(s._id)) continue;
      processedRef.current.add(s._id);
      if (s.from !== instructorId) continue;
      // Only process signals targeted at us
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

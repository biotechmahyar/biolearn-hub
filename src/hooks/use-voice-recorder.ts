import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice Recorder with proper state machine.
 *
 * States:
 *   IDLE → RECORDING → STOPPING → UPLOADING → IDLE
 *                ↓          ↓          ↓
 *              ERROR      ERROR      ERROR
 *
 * Every path eventually returns to IDLE.
 */

export type RecorderState = "IDLE" | "RECORDING" | "STOPPING" | "UPLOADING" | "ERROR";

export interface UseVoiceRecorderOptions {
  /** Called with the final blob when recording is complete and ready to send */
  onRecorded: (blob: Blob, durationSec: number) => void;
  /** Called when an error occurs */
  onError?: (message: string) => void;
}

export interface UseVoiceRecorderReturn {
  state: RecorderState;
  /** Seconds elapsed during recording */
  seconds: number;
  /** The recorded blob (available after STOPPING completes, before send) */
  previewBlob: Blob | null;
  /** Preview audio URL for <audio> element */
  previewUrl: string | null;
  /** Duration of the last recording in seconds */
  previewDuration: number;
  /** Start recording. Requests microphone permission. */
  start: () => Promise<void>;
  /** Stop recording. Transitions to STOPPING → produces preview blob. */
  stop: () => void;
  /** Send the recorded blob (calls onRecorded). Transitions to UPLOADING → IDLE. */
  send: () => void;
  /** Discard the recording and reset to IDLE */
  discard: () => void;
  /** Reset to IDLE from any state (for cleanup) */
  reset: () => void;
}

export function useVoiceRecorder({
  onRecorded,
  onError,
}: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>("IDLE");
  const [seconds, setSeconds] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobTypeRef = useRef<string>("audio/webm");
  // Use refs for callbacks to avoid stale closures
  const onRecordedRef = useRef(onRecorded);
  const onErrorRef = useRef(onError);

  // Keep refs fresh
  onRecordedRef.current = onRecorded;
  onErrorRef.current = onError;

  // Cleanup timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Release all media tracks
  const releaseMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      try { t.stop(); } catch { /* already stopped */ }
    });
    streamRef.current = null;
  }, []);

  // Full reset to IDLE
  const reset = useCallback(() => {
    clearTimer();
    // Try to stop recorder gracefully
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch { /* ignore */ }
    recorderRef.current = null;
    releaseMedia();
    chunksRef.current = [];
    setState("IDLE");
    setSeconds(0);
    setPreviewBlob(null);
    // Revoke old URL
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewDuration(0);
  }, [clearTimer, releaseMedia]);

  // Start recording
  const start = useCallback(async () => {
    // If there's a previous recording, discard it first
    if (previewBlob) {
      reset();
    }

    // Small delay to ensure state is clean
    await new Promise((r) => setTimeout(r, 50));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      blobTypeRef.current = rec.mimeType || "audio/webm";

      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      rec.onstop = () => {
        // Build the blob from chunks
        const blob = new Blob(chunksRef.current, { type: blobTypeRef.current });

        // Release microphone immediately
        releaseMedia();

        // Clear timer
        clearTimer();

        // Capture final seconds
        setSeconds((prev) => {
          setPreviewDuration(prev > 0 ? prev : 1);
          return prev;
        });

        setPreviewBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        // Transition to IDLE (preview mode)
        setState("IDLE");
      };

      rec.onerror = () => {
        releaseMedia();
        clearTimer();
        chunksRef.current = [];
        setState("ERROR");
        onErrorRef.current?.("خطا در ضبط صدا");
        // Auto-recover to IDLE after a short delay
        setTimeout(() => setState("IDLE"), 2000);
      };

      rec.start(1000); // Collect data every second
      setState("RECORDING");
      setSeconds(0);
      setPreviewBlob(null);
      setPreviewUrl(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      releaseMedia();
      clearTimer();
      setState("ERROR");
      onErrorRef.current?.(
        e instanceof Error
          ? e.name === "NotAllowedError"
            ? "برای ضبط صدا، دسترسی میکروفون را فعال کنید."
            : e.message
          : "دسترسی به میکروفون ممکن نشد"
      );
      setTimeout(() => setState("IDLE"), 2000);
    }
  }, [previewBlob, reset, releaseMedia, clearTimer]);

  // Stop recording → builds blob, shows preview
  const stop = useCallback(() => {
    if (state !== "RECORDING") return;
    setState("STOPPING");
    clearTimer();
    try {
      recorderRef.current?.stop();
    } catch {
      // If stop fails, force cleanup
      releaseMedia();
      clearTimer();
      setState("IDLE");
    }
  }, [state, clearTimer, releaseMedia]);

  // Send the recorded blob
  const send = useCallback(() => {
    setPreviewBlob((currentBlob) => {
      if (!currentBlob || currentBlob.size === 0) {
        reset();
        return null;
      }
      setState("UPLOADING");
      setSeconds((currentSec) => {
        const dur = previewDuration > 0 ? previewDuration : currentSec > 0 ? currentSec : 1;
        // Use ref to avoid stale closure
        onRecordedRef.current(currentBlob, dur);
        return currentSec;
      });
      return currentBlob;
    });
  }, [reset, previewDuration]);

  // Discard the current recording
  const discard = useCallback(() => {
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      releaseMedia();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    seconds,
    previewBlob,
    previewUrl,
    previewDuration: previewDuration || seconds,
    start,
    stop,
    send,
    discard,
    reset,
  };
}

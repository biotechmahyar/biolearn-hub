import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  useLabStore,
  LabEnvironment,
  LabFurnishings,
  LabEquipment,
  FirstPersonCamera,
} from "./index";

// ── WebGL support guard ──────────────────────────────────────────────────────
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") ?? canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

// ── Fallback overlay when WebGL is unavailable ───────────────────────────────
function WebGLFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 24,
        background: "#0a1412",
        color: "#e5f4ec",
        textAlign: "center",
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg,#12b76a,#0b5e40)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 18px 40px -14px rgba(18,183,106,0.7)",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          style={{ color: "#1a4a36" }}
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div style={{ maxWidth: 420 }}>
        <p
          style={{
            fontSize: 17,
            fontWeight: 800,
            lineHeight: 1.35,
            color: "#f3fdf6",
            margin: "0 0 8px",
          }}
        >
          مرورگر شما از گرافیک سه بعدی پشتیبانی نمی‌کند
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#9fd9c4", margin: "0" }}>
          آزمایشگاه سه بعدی ژنوا با WebGL работает. با مرورگری از پایین‌ترین نسخه‌های
          پیشنهادی مرورگرها (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+) امتحان کنید.
        </p>
      </div>
      <button
        onClick={onRetry}
        style={{
          marginTop: 6,
          padding: "11px 22px",
          borderRadius: 999,
          border: "1px solid rgba(229,244,236,0.22)",
          background: "#12b76a",
          color: "#0a1412",
          fontWeight: 800,
          fontSize: 13.5,
          cursor: "pointer",
          boxShadow: "0 10px 22px -12px rgba(18,183,106,0.8)",
        }}
      >
        دوباره تلاش کنید
      </button>
    </div>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────────────
function LabTopBar() {
  const locked = useLabStore((s) => s.locked);
  const setLocked = useLabStore((s) => s.setLocked);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: "rgba(10,20,18,0.6)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(229,244,236,0.12)",
        color: "#e5f4ec",
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "linear-gradient(135deg,#12b76a,#0b5e40)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a1412" strokeWidth="2.4">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
          </svg>
        </span>
        <span>آزمایشگاه سه بعدی ژنوا</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ opacity: 0.7, fontSize: 11.5 }}>
          {locked ? "لوك ماوس فعال · ESC برای ترک" : "کلیک رویCanvas برای لوك"}
        </span>
        <button
          onClick={() => setLocked(!locked)}
          style={{
            border: "1px solid rgba(229,244,236,0.25)",
            background: locked ? "#12b76a" : "transparent",
            color: "#0a1412",
            borderRadius: 8,
            padding: "5px 10px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 11.5,
            fontFamily: "inherit",
          }}
        >
          {locked ? "خروج از لوك" : "ورود به لوك"}
        </button>
      </div>
    </div>
  );
}

// ── Floating hint (shown when locked) ────────────────────────────────────────
function InteractHint() {
  const locked = useLabStore((s) => s.locked);
  if (!locked) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        background: "rgba(10,20,18,0.72)",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(229,244,236,0.14)",
        borderRadius: 999,
        padding: "7px 14px",
        color: "#eaf4ec",
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        letterSpacing: 0.3,
        boxShadow: "0 4px 12px -4px rgba(0,0,0,0.5)",
      }}
    >
      جهت حرکت: W A S D · نگاه: ماوس · تعامل با تجهیزات: E · ترک: ESC
    </div>
  );
}

// ── First-person camera driven by yaw/pitch ──────────────────────────────────
function FirstPersonCamera() {
  const { camera } = useThree();
  const manager = useLabStore((s) => s.manager);

  useFrame(() => {
    if (!camera) return;
    const look = new THREE.Euler(manager.pitch, manager.yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(look);
  });

  return null;
}

// ── Pointer-lock + keyboard controls layer ───────────────────────────────────
function PlayerController() {
  const locked = useLabStore((s) => s.locked);
  const setLocked = useLabStore((s) => s.setLocked);

  // Pointer lock engage only on user gesture (click on the canvas).
  useEffect(() => {
    const host = document.querySelector<HTMLCanvasElement>("canvas");
    if (!host) return;
    let down = false;
    host.addEventListener("mousedown", () => {
      if (!down) {
        down = true;
        try { host.ownerDocument?.body?.requestPointerLock?.() } catch {}
      }
    });
    const up = () => { down = false; };
    host.addEventListener("mouseup", up);
    return () => host.removeEventListener("mouseup", up);
  }, []);

  // ESC exits the pointer lock.
  useEffect(() => {
    const obs = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        try { document.exitPointerLock?.() } catch {}
        setLocked(false);
      }
    };
    window.addEventListener("keydown", obs);
    return () => window.removeEventListener("keydown", obs);
  }, [setLocked]);

  // When the pointer lock leaves, clear the hover highlight.
  useEffect(() => {
    const leave = () => setLocked(false);
    window.addEventListener("pointerlockchange", leave);
    return () => window.removeEventListener("pointerlockchange", leave);
  }, [setLocked]);

  // WASD strafing (key state tracked locally from events).
  const keys = useState({ w: false, a: false, s: false, d: false })[0];
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const manager = useLabStore((s) => s.manager);

  useEffect(() => {
    const kbd = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === "KeyW") keys.w = e.type === "keydown";
      if (code === "KeyA") keys.a = e.type === "keydown";
      if (code === "KeyS") keys.s = e.type === "keydown";
      if (code === "KeyD") keys.d = e.type === "keydown";
    };
    window.addEventListener("keydown", kbd);
    window.addEventListener("keyup", kbd);
    return () => {
      window.removeEventListener("keydown", kbd);
      window.removeEventListener("keyup", kbd);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!locked || !camera) {
        raf = requestAnimationFrame(loop);
        return;
      }
      camera.getWorldDirection(fwd.current);
      right.current.crossVectors(fwd.current, up.current).normalize();
      const forward = fwd.current.clone().multiplyScalar((keys.w ? 1 : 0) - (keys.s ? 1 : 0));
      const strafe = right.current.clone().multiplyScalar((keys.d ? 1 : 0) - (keys.a ? 1 : 0));
      manager.position.x += forward.x + strafe.x;
      manager.position.z += forward.z + strafe.z;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locked, camera, manager]);

  return <FirstPersonCamera />;
}

// ── Root canvas / loading / retry ────────────────────────────────────────────
export default function VirtualLab3DApp() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wgl, setWgl] = useState<boolean | null>(null);

  useEffect(() => {
    setWgl(supportsWebGL());
  }, []);

  if (wgl === null) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1412",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            border: "3px solid rgba(18,183,106,0.25)",
            borderTopColor: "#12b76a",
            borderRadius: 999,
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!wgl) {
    return <WebGLFallback onRetry={() => window.location.reload()} />;
  }

  if (failed) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 45,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          background: "#0a1412",
          color: "#e5f4ec",
          textAlign: "center",
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 800, color: "#f3fdf6", margin: "0 0 6px" }}>
          آزمایشگاه سه بعدی جایی رفت
        </p>
        <p style={{ fontSize: 13, color: "#9fd9c4", margin: "0" }}>
          گرافیک لود شد اما صحنهٔ سه بعدی نمایش داده نمی‌شود. دوباره تلاش کنید یا با تیم فنی تماس بگیرید.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            mt: 6,
            padding: "11px 22px",
            borderRadius: 999,
            border: "1px solid rgba(229,244,236,0.22)",
            background: "#12b76a",
            color: "#0a1412",
            fontWeight: 800,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          برگشت به آزمایشگاه
        </button>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 1.7, 6.4], fov: 62, near: 0.1, far: 60, zoom: 1 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      shadows
      dpr={[1, 2]}
      style={{ touchAction: "none" }}
      onCreated={() => setReady(true)}
      onError={(err) => {
        console.error("[virtual-lab-3d] canvas error", err);
        setFailed(true);
      }}
    >
      <color attach="background" args={["#0a1412"]} />
      <fog attach="fog" args={["#0a1412", 16, 40]} />

      <LabTopBar />
      <InteractHint />

      <Suspense fallback={null}>
        <OrbitControls makeDefault enabled={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        <group>
          {/* Head height. */}
          <group position={[0, 1.7, 5.2]}>
            <FirstPersonCamera />
          </group>
          <LabEnvironment />
          <LabFurnishings />
          <LabEquipment />
        </group>
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.35}
          scale={60}
          blur={2.4}
          far={14}
          color={new THREE.Color("#0b1412")}
        />
        <Environment preset="apartment" blur={0.7} />
      </Suspense>
    </Canvas>
  );
}


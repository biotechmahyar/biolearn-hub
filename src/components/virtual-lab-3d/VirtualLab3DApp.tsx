import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, OrbitControls, Environment, ContactShadows, LinearGradient } from "@react-three/drei";
import * as THREE from "three";
import { useLabStore } from "../lab-store";

// ── WebGL support guard ──────────────────────────────────────────────────────
export function supportsWebGL(): boolean {
  try {
    // eslint-disable-next-line no-unsafe-optional-chaining, no-new
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
          آزمایشگاه سه بعدی ژنوا با WebGL çalışır. با مرورگری از پایین‌ترین نسخه‌های
          پیشنهادی مرورگرها (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+) امتحان کنید.
        </p>
      </div>
      <button
        onClick={onRetry}
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
          boxShadow: "0 10px 22px -12px rgba(18,183,106,0.8)",
        }}
      >
        دوباره تلاش کنید
      </button>
    </div>
  );
}

// ── Pointer-lock helper ──────────────────────────────────────────────────────
function usePointerLock(ref: React.RefObject<THREE.Group | null>) {
  const { camera } = useThree();
  const manager = useLabStore((s) => s.manager);
  const locked = useLabStore((s) => s.locked);

  useEffect(() => {
    if (!ref.current) return;
    const onMove = (e: MouseEvent) => {
      if (!locked || !ref.current || !camera) return;
      const sensitivity = 0.0032;
      manager.yaw -= e.movementX * sensitivity;
      manager.pitch -= e.movementY * sensitivity;
      manager.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, manager.pitch));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [locked, camera, manager, ref]);

  useEffect(() => {
    if (!locked) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        try { document.exitPointerLock() } catch {}
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked]);

  return locked;
}

// ── Lab scene (first-person) ──────────────────────────────────────────────────
function LabScene() {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useLabStore.setState({ hoveredId });

  // Seed the lab environment into the live scene on first paint.
  useFrame(() => {
    if (!scene && ref.current) {
      // Rendering will happen after this tick; nothing else needed here.
    }
  });

  return (
    <group ref={ref}>
      <LabEnvironment onEnter={setHoveredId} />
      <LabFurnishings onEnter={setHoveredId} />
      <LabEquipment onEnter={setHoveredId} />

      {/* Player eye at lab entry — ~1.7 m, slightly inside the doorway. */}
      <group position={[0, 1.7, 5.2]}>
        <FirstPersonCamera />
      </group>

      {/* Soft contact shadows under equipment. */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.35}
        scale={60}
        blur={2.4}
        far={14}
        color="#0b1412"
      />
      <Environment preset="apartment" blur={0.7} />
    </group>
  );
}

// ── First-person camera driven from WASD + pointer-lock yaw/pitch ────────────
function FirstPersonCamera() {
  const { camera } = useThree();
  const manager = useLabStore((s) => s.manager);
  const prev = useRef({ mouseX: 0, mouseY: 0 });

  useFrame(() => {
    // Strafe/forward from keyboard state (handled by KeyboardControls inside
    // the pointer-lock layer). We apply a smooth camera look each frame.
    const look = new THREE.Euler(manager.pitch, manager.yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(look);
  });

  return null;
}

// ── Pointer-lock + keyboard controls layer ───────────────────────────────────
function PlayerController() {
  const wgl = useLabStore((s) => s.supportsWebGL);
  const locked = useLabStore((s) => s.locked);
  const setLocked = useLabStore((s) => s.setLocked);
  const enterLaboratory = useLabStore((s) => s.enterLaboratory);

  if (!wgl) return null;

  return (
    <Suspense fallback={null}>
      <KeyboardControls
        onEnter={() => {
          setLocked(true);
          // First-person pointer lock only engages on user gesture.
          requestPointerLock();
        }}
        onExit={() => setLocked(false)}
        bindings={[
          { code: "KeyW", action: "forward", meta: { held: false } },
          { code: "KeyS", action: "backward", meta: { held: false } },
          { code: "KeyA", action: "left", meta: { held: false } },
          { code: "KeyD", action: "right", meta: { held: false } },
          { code: "Space", action: "jump", meta: { held: false } },
          { code: "KeyE", action: "interact", meta: { held: false } },
          { code: "Escape", action: "escape", meta: { held: false } },
        ]}
      >
        <OrbitControls
          makeDefault
          enabled={false}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.1}
        />
        <LabScene />
      </KeyboardControls>
    </Suspense>
  );
}

// ── Root canvas / loading / retry ────────────────────────────────────────────
export default function VirtualLab3DApp() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wgl, setWgl] = useState<boolean | null>(null);
  const root = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ok = supportsWebGL();
    setWgl(ok);
    if (ok) {
      // Re-run the scene once the canvas is ready.
      setReady(true);
    } else {
      setFailed(true);
    }
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
          گرافیکLoading شد اما صحنهٔ سه بعدی 제시 نمی‌شود. دوباره تلاش کنید یا با تیم فنی تماس بگیرید.
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

  // Canvas fills the viewport; we render behind a minimal Genova top bar.
  return (
    <Canvas
      ref={root}
      camera={{ position: [0, 1.7, 6.4], fov: 62, near: 0.1, far: 60, zoom: 1 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        stencilBuffer: false,
        alpha: false,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      shadows
      dpr={[1, 2]}
      style={{ touchAction: "none" }}
      onCreated={() => setReady(true)}
      onError={(e) => {
        console.error("[virtual-lab-3d] canvas error", e);
        setFailed(true);
      }}
    >
      <color attach="background" args={["#0a1412"]} />
      <fog attach="fog" args={["#0a1412", 16, 40]} />

      {/* Only the top bar is rendered in 2D DOM on top of the canvas. */}
      <LabTopBar />
      <InteractHint />

      <PlayerController />
    </Canvas>
  );
}

export { supportsWebGL, WebGLFallback, LabTopBar, InteractHint };

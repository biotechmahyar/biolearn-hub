import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html, Float } from "@react-three/drei";
import { useLabStore } from "../lab-store";

// ── Equipment info panel (2D overlay) ────────────────────────────────────────
function EquipmentPanel({ open, id }: { open: boolean; id: string }) {
  if (!open) return null;
  const item = LABS.find((s) => s.id === id);
  if (!item) return null;

  return (
    <Html
      center
      position={[0, 0.75, -2.4]}
      style={{
        background: "rgba(10,20,18,0.78)",
        backdropFilter: "blur(8px)",
        color: "#eaf4ec",
        colorScheme: "dark",
        border: "1px solid rgba(229,244,236,0.18)",
        borderRadius: 16,
        padding: "14px 16px",
        minWidth: 280,
        maxWidth: 360,
        boxShadow: "0 22px 46px -16px rgba(0,0,0,0.7)",
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg,#055e40,#1fb87a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px -2px rgba(31,184,122,0.5)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#041a14"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 800,
              color: "#eaf4ec",
              letterSpacing: 0.3,
              textShadow: "0 1px 1px rgba(0,0,0,0.4)",
            }}
          >
            {item.label}
          </div>
          <div style={{ fontSize: 11, color: "#9fd9c4", marginTop: 2, letterSpacing: 0.3 }}>
            تجهیز آزمایشگاه · تعامل در دسترس
          </div>
        </div>
        <button
          style={{
            background: "transparent",
            border: "1px solid rgba(229,244,236,0.25)",
            color: "#eaf4ec",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
          }}
          onClick={(e) => {
            e.stopPropagation();
            useLabStore.setState({ panelId: null });
          }}
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#d6e9e0", margin: "0 0 6px" }}>
        {item.description}
      </p>
      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid rgba(229,244,236,0.14)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "#9fd9c4",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M12 8v4l3 3" />
        </svg>
        برای تعامل نزدیک شماره کلید E
      </div>
    </Html>
  );
}

// ── Instructional hint when pointer is locked ────────────────────────────────
function InteractHint() {
  const panelId = useLabStore((s) => s.panelId);
  const locked = useLabStore((s) => s.locked);
  if (!locked) return null;
  return (
    <Html
      position={[0, 0.82, -2.6]}
      style={{
        background: "rgba(10,20,18,0.7)",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(229,244,236,0.15)",
        borderRadius: 999,
        padding: "7px 14px",
        color: "#eaf4ec",
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        letterSpacing: 0.3,
      }}
    >
      برای تعامل با تجهیزات کلید E را بزنید · ESC برای ترک قفل ماوس
    </Html>
  );
}

// ── Generic highlight ring (hover + panel open). ─────────────────────────────
function HighlightRing({ id, position }: { id: string; position: [number, number, number] }) {
  const hoveredId = useLabStore((s) => s.hoveredId);
  const panelId = useLabStore((s) => s.panelId);
  const isHover = hoveredId === id || panelId === id;
  return (
    <Float speed={0.5} amplitude={0.04}>
      <mesh position={position} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.62, 0.72, 48]} />
        <meshBasicMaterial
          color={isHover ? "#12b76a" : "#0a5e48"}
          transparent
          opacity={isHover ? 0.9 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Float>
  );
}

// ── Equipment placeholder (colored) ──────────────────────────────────────────
function Equipment({
  id,
  position,
  rotation = [0, 0, 0],
  color = "#cfd6d9",
  height = 0.7,
}: {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  height?: number;
}) {
  const hoveredId = useLabStore((s) => s.hoveredId);
  const panelId = useLabStore((s) => s.panelId);
  const setPanelId = useLabStore((s) => s.setPanelId);
  const isHighlight = hoveredId === id || panelId === id;
  const ref = useRef<THREE.Group>(null);

  // Gentle hover bob.
  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() / 1000;
    if (isHighlight) {
      ref.current.position.y = position[1] + Math.sin(t * 3) * 0.012;
    } else {
      ref.current.position.y = position[1];
    }
  });

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerEnter={() => useLabStore.getState().setHoveredId(id)}
      onPointerLeave={() => useLabStore.getState().setHoveredId(null)}
      onClick={(e) => {
        e.stopPropagation();
        setPanelId(panelId === id ? null : id);
      }}
      castShadow
    >
      {/* Body. */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, height, 0.46]} />
        <meshStandardMaterial
          color={isHighlight ? "#e3f5ea" : color}
          roughness={0.5}
          metalness={0.08}
          emissive={isHighlight ? "#0b5e40" : "#000000"}
          emissiveIntensity={isHighlight ? 0.35 : 0}
        />
      </mesh>
      {/* Top accent strip. */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.04, 0.5]} />
        <meshStandardMaterial color="#8a9aa6" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Interaction ring on hover. */}
      {isHighlight && <HighlightRing id={id} position={[0, height + 0.06, 0]} />}
    </group>
  );
}

// ── Real equipment catalogue ──────────────────────────────────────────────────
const LABS = [
  {
    id: "pipette",
    label: "پیکتیو پیکering (میکرو)",
    description:
      "پیکتیو با دقت میکروولیتری به کار می‌رود و برای انتقال عينه‌ها، پرایمرها و رئاکتانت‌های PCR ضروری است. دقت آن مستقیماً بر результативitas assays اثر می‌گذارد.",
    position: [3.4, 0.82, -2.2],
    color: "#cfd6d9",
    height: 0.7,
  },
  {
    id: "centrifuge",
    label: "سانتریفیوژ میکرو",
    description:
      "برای جداسازی اجزای نمونه بر پایه چگالی با چرخش‌های بالا (کوئلی‌ها، دی‌ان‌ای/آر‌ان‌ای، پروتئین‌ها) استفاده می‌شود. سرعت و زمان چرخش بسته به ساختار و اجزای درون‌یابد.",
    position: [-3.6, 0.72, -2.0],
    color: "#d4d9de",
    height: 0.72,
  },
  {
    id: "vortex",
    label: "ورتکس مایعات",
    description:
      "هنگام همگن‌سازی سریع مایعات و نمونه‌ها در لوله‌های میکروتوب استفاده می‌شود. در پروتکل‌های استخراج DNA، لایزش آبشی و ترکیب رئاکتانت‌های PCR، وورتکس کوتاه یک قدم استاندارد اولیه است.",
    position: [3.2, 0.78, 1.6],
    color: "#d8dee3",
    height: 0.78,
  },
  {
    id: "pcr",
    label: "اتراکای درون‌گرم‌کننده (PCR)",
    description:
      "دستگاه PCR برای تکثیر یک منطقه خاص از DNA در اندازه‌های میلی‌متری در یک رئاکتان به کار می‌رود. آن به‌طور مداوم بین دمای انزال، اتصال پرایمر و گسترش رئاکتان چرخش می‌کند تا تعداد کپی‌های هدف را در طی ده‌ها چرخه افزایش دهد.",
    position: [-3.8, 0.78, 1.2],
    color: "#dbe3e7",
    height: 0.78,
  },
];

// ── Equipment cluster ─────────────────────────────────────────────────────────
export function LabEquipment() {
  // The equipment sits on benches; we keep hover + panel separate from the room.
  useLabStore.setState({ locked: false });

  return (
    <group>
      {LABS.map((item) => (
        <Equipment key={item.id} {...item} />
      ))}
      {/* Floating info ring for currently open panel. */}
      {LABS.map((item) => (
        <HighlightRing key={`ring-${item.id}`} id={item.id} position={item.position} />
      ))}
      {/* Top panel. */}
      <EquipmentPanel
        open={LABS.some((s) => s.id === useLabStore.getState().panelId)}
        id={useLabStore.getState().panelId ?? ""}
      />
    </group>
  );
}

// ── Lab bounds (invisible) ───────────────────────────────────────────────────
export function LabBounds() {
  const camera = useThree((s) => s.camera);
  const manager = useLabStore.getState().manager;

  // The lab room interior extends from x: -7 .. 7, z: -7 .. +6.6, y: 0 .. 3.6.
  // We constrain the player eye to stay inside so the camera cannot clip through
  // walls or leave the lab.
  useFrame(() => {
    if (!camera) return;
    let changed = false;
    let { x, y, z } = camera.position;
    if (x < -7) { x = -7; changed = true; }
    if (x > 7) { x = 7; changed = true; }
    if (z < -7) { z = -7; changed = true; }
    if (z > 6.6) { z = 6.6; changed = true; }
    if (y < 1.5) { y = 1.5; changed = true; }
    if (y > 3.3) { y = 3.3; changed = true; }
    if (changed) camera.position.set(x, y, z);
  });

  return null;
}

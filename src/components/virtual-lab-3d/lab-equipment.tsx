import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabStore } from "./lab-store";

const LABS: (
  | { id: string; label: string; description: string; position: [number, number, number]; color: string; height: number }
)[] = [
  {
    id: "pipette",
    label: "پیکتیو پیکینگ (میکرو)",
    description: "پیکتیو با دقت میکروولیتری به کار می‌رود و برای انتقال نمونه‌ها، پرایمرها و رئاکتنت‌های PCR ضروری است.",
    position: [3.4, 0.82, -2.2],
    color: "#cfd6d9",
    height: 0.7,
  },
  {
    id: "centrifuge",
    label: "سانتریفیوژ میکرو",
    description: "برای جداسازی اجزای نمونه بر پایه چگالی با چرخش‌های بالا (کوئلی‌ها، دی‌ان‌ای/آر‌ان‌ای، پروتئین‌ها) استفاده می‌شود.",
    position: [-3.6, 0.72, -2.0],
    color: "#d4d9de",
    height: 0.72,
  },
  {
    id: "vortex",
    label: "ورتکس مایعات",
    description: "هنگام همگن‌سازی سریع مایعات و نمونه‌ها در لوله‌های میکروتوب استفاده می‌شود.",
    position: [3.2, 0.78, 1.6],
    color: "#d8dee3",
    height: 0.78,
  },
  {
    id: "pcr",
    label: "اتراکای درون‌گرم‌کننده (PCR)",
    description: "دستگاه PCR برای پشتیبانی از رئاکتنت‌های DNA در آنالیزهای غلظت‌یاب و پایش RNA در بافت‌های درون‌یابد به کار می‌رود.",
    position: [-3.8, 0.78, 1.2],
    color: "#dbe3e7",
    height: 0.78,
  },
];

// ── Generic highlight ring (hover + panel open). ─────────────────────────────
function HighlightRing({ id, position }: { id: string; position: [number, number, number] }) {
  const hoveredId = useLabStore((s) => s.hoveredId);
  const panelId = useLabStore((s) => s.panelId);
  const isHover = hoveredId === id || panelId === id;
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() / 1000;
    if (isHover) {
      ref.current.position.y = position[1] + Math.sin(t * 3) * 0.012;
    } else {
      ref.current.position.y = position[1];
    }
  });

  return (
    <group position={position} rotation={[0, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.72, 48]} />
        <meshBasicMaterial
          color={isHover ? "#12b76a" : "#0a5e48"}
          transparent
          opacity={isHover ? 0.9 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ── Equipment placeholder (colored). ─────────────────────────────────────────
function Equipment({
  id,
  position,
  color,
  height,
}: {
  id: string;
  position: [number, number, number];
  color: string;
  height: number;
}) {
  const hoveredId = useLabStore((s) => s.hoveredId);
  const panelId = useLabStore((s) => s.panelId);
  const setPanelId = useLabStore((s) => s.setPanelId);
  const isHighlight = hoveredId === id || panelId === id;
  const ref = useRef<THREE.Group>(null);

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
      onClick={(e: { stopPropagation?: () => void }) => {
        e?.stopPropagation?.();
        setPanelId(panelId === id ? null : id);
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, height, 0.46]} />
        <meshStandardMaterial
          color={isHighlight ? "#e3f5ea" : color}
          roughness={0.5}
          metalness={0.08}
          emissive={isHighlight ? "#0b5e40" : "#000000"}
          emissiveIntensity={isHighlight ? 0.35 : 0}
        />
      </mesh>
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.04, 0.5]} />
        <meshStandardMaterial color="#8a9aa6" metalness={0.9} roughness={0.2} />
      </mesh>
      {isHighlight && <HighlightRing id={id} position={[0, height + 0.06, 0]} />}
    </group>
  );
}

// ── Equipment cluster. ────────────────────────────────────────────────────────
export function LabEquipment() {
  const panelId = useLabStore((s) => s.panelId);

  return (
    <group>
      {LABS.map((item) => (
        <Equipment key={item.id} id={item.id} position={item.position} color={item.color} height={item.height} />
      ))}
      {LABS.map((item) => (
        <HighlightRing
          key={`ring-${item.id}`}
          id={item.id}
          position={[item.position[0], item.position[1] + item.height + 0.06, item.position[2]]}
        />
      ))}
    </group>
  );
}

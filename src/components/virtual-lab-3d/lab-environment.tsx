import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ContactShadows, Environment, Float } from "@react-three/drei";
import { useLabStore } from "../lab-store";

// ── Subtle emissive accent strip down one wall (Genova green) ──────────────
function AccentStrip() {
  return (
    <group position={[0, 2.4, -7.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.0, 0]} receiveShadow>
        <boxGeometry args={[11.6, 0.55, 0.08]} />
        <meshStandardMaterial
          color="#0a2520"
          emissive="#0b5e40"
          emissiveIntensity={0.35}
        />
      </mesh>
      <Float speed={0.4} amplitude={0.02}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.0, 0.06]}>
          <boxGeometry args={[11.6, 0.04, 0.04]} />
          <meshStandardMaterial color="#12b76a" emissive="#12b76a" emissiveIntensity={0.5} />
        </mesh>
      </Float>
    </group>
  );
}

// ── Floor ───────────────────────────────────────────────────────────────────
function Floor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      receiveShadow
      castShadow
    >
      <planeGeometry args={[16, 16]} />
      <meshStandardMaterial
        color="#cfd6d9"
        roughness={0.62}
        metalness={0.02}
      />
    </mesh>
  );
}

// ── Ceiling tiles ────────────────────────────────────────────────────────────
function Ceiling() {
  return (
    <group position={[0, 3.6, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[15.6, 0.08, 10.4]} />
        <meshStandardMaterial color="#eef1f3" roughness={0.85} metalness={0.0} />
      </mesh>
      {/* Emissive light panels. */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[Math.floor(i / 4) * 5.2 - 2.6, 0.05, (i % 4) * 2.2 - 2.2]}>
          <planeGeometry args={[2.0, 1.4]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#bfe9d8"
            emissiveIntensity={0.55}
            transparent
            opacity={0.97}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Glass wall segments (left, back, right windows). ────────────────────────
function GlassBackWall() {
  return (
    <group position={[0, 2.1, -6.66]}>
      {/* Back solid wall with large window. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[15.4, 3.6, 0.12]} />
        <meshStandardMaterial
          color="#dadfe2"
          roughness={0.65}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Window frame. */}
      <mesh position={[0, 1.7, 0.065]} receiveShadow>
        <planeGeometry args={[13.8, 2.4]} />
        <meshStandardMaterial
          color="#e9f3f6"
          roughness={0.05}
          metalness={0.15}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Frame bars. */}
      {[
        [0, 2.9, 0.08, 0.1, 0.5],
        [0, 0.5, 0.08, 0.1, 0.5],
        [6.9, 1.7, 0.08, 0.1, 2.4],
        [-6.9, 1.7, 0.08, 0.1, 2.4],
      ].map(([x, y, z, w, h], i) => (
        <mesh key={i} position={[x, y, z]} receiveShadow>
          <boxGeometry args={[w, h, 0.1]} />
          <meshStandardMaterial color="#cfd6d9" roughness={0.6} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ── Side walls ───────────────────────────────────────────────────────────────
function SideWalls() {
  return (
    <>
      {/* Left wall */}
      <mesh position={[-7.6, 1.8, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[0.12, 3.6, 12.8]} />
        <meshStandardMaterial color="#d2d9de" roughness={0.62} metalness={0.05} />
      </mesh>
      {/* Right wall (mostly opaque with a window at far right). */}
      <group position={[7.6, 1.8, 0]}>
        <mesh rotation={[0, -Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[0.12, 3.6, 12.8]} />
          <meshStandardMaterial color="#d2d9de" roughness={0.62} metalness={0.05} />
        </mesh>
        {/* Window. */}
        <mesh position={[1.6, 1.8, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[3.4, 2.2]} />
          <meshStandardMaterial
            color="#eaf4f8"
            roughness={0.05}
            metalness={0.15}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            side={THREE.DoubleSide}
          />
        </mesh>
        {[
          [0.1, 3.0, 0.085, 0.1, 0.5],
          [0.1, 0.6, 0.085, 0.1, 0.5],
          [3.2, 1.8, 0.085, 0.1, 2.2],
          [-3.1, 1.8, 0.085, 0.1, 2.2],
        ].map(([x, y, z, w, h], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <boxGeometry args={[w, h, 0.1]} />
            <meshStandardMaterial color="#cfd6d9" roughness={0.6} metalness={0.1} />
          </mesh>
        ))}
      </group>
    </>
  );
}

// ── Front wall + double glass doors + opening. ───────────────────────────────
function FrontWallAndDoors() {
  // The front (z = +6.66) has a central opening for the player doorway, and two
  // glass doors flanking it that users pass through.
  return (
    <group position={[0, 1.8, 6.66]}>
      {/* Floor edge band at the door. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.5, 0.12]} />
        <meshStandardMaterial color="#cfd6d9" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Left door frame. */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-2.5, 0, 0]} receiveShadow>
        <boxGeometry args={[0.1, 2.2, 2.8]} />
        <meshStandardMaterial color="#cfd6d9" roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Door glass panel. */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-2.5, 1.4, 0]}>
        <planeGeometry args={[2.6, 2.1]} />
        <meshStandardMaterial
          color="#eef8fc"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Door handle. */}
      <mesh position={[-2.5, 0.9, 0.1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 24]} />
        <meshStandardMaterial color="#8a9aa6" metalness={0.85} roughness={0.18} />
      </mesh>

      {/* Right door frame. */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[2.5, 0, 0]} receiveShadow>
        <boxGeometry args={[0.1, 2.2, 2.8]} />
        <meshStandardMaterial color="#cfd6d9" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[2.5, 1.4, 0]}>
        <planeGeometry args={[2.6, 2.1]} />
        <meshStandardMaterial
          color="#eef8fc"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[2.5, 0.9, 0.1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 24]} />
        <meshStandardMaterial color="#8a9aa6" metalness={0.85} roughness={0.18} />
      </mesh>

      {/* Frieze / header beam above doors. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.3, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.18, 0.14]} />
        <meshStandardMaterial color="#d2d9de" roughness={0.65} metalness={0.05} />
      </mesh>
    </group>
  );
}

// ── Ambient ceiling lamp glow ─────────────────────────────────────────────────
function OverheadLights() {
  return (
    <group position={[0, 3.45, 0]}>
      {[...Array(8)].map((_, i) => (
        <pointLight
          key={i}
          position={[Math.floor(i / 4) * 5.2 - 2.6, -0.02, (i % 4) * 2.2 - 2.2]}
          intensity={1.6}
          distance={12}
          decay={1.2}
          color="#fff8ec"
        />
      ))}
    </group>
  );
}

// ── Lab environment ───────────────────────────────────────────────────────────
export function LabEnvironment({ onEnter }: { onEnter: (id: string | null) => void }) {
  // The lab frames the player at z+6; the interior extends back to z -7.6 so
  // movement stays well inside the room. We pass a stable zMax to the manager so
  // the player cannot run through the back or side walls.
  useLabStore.setState({ locked: false });
  const bounds = useMemo(
    () => ({
      minX: -7.0,
      maxX: 7.0,
      minZ: -7.0,
      maxZ: 6.6,
      floorY: 0,
      ceilingY: 2.9,
      height: 3.6,
    }),
    [],
  );
  const setLocked = useLabStore((s) => s.setLocked);

  // When the pointer lock leaves, clear the hood highlight.
  useEffect(() => {
    const onLeave = () => setLocked(false);
    window.addEventListener("pointerlockchange", onLeave);
    return () => window.removeEventListener("pointerlockchange", onLeave);
  }, [setLocked]);

  return (
    <>
      {/* Room shell. */}
      <group>
        {/* Floor tiles: subtle grid of slightly lighter grout lines. */}
        <Floor />
        {/* Ceiling. */}
        <Ceiling />
        {/* Back wall with window. */}
        <GlassBackWall />
        {/* Side walls. */}
        <SideWalls />
        {/* Front wall + glass doors. */}
        <FrontWallAndDoors />
        {/* Accent strip. */}
        <AccentStrip />
      </group>

      <OverheadLights />

      {/* Communicate movement bounds back to the first-person controller. */}
      {bounds && <LabBounds {...bounds} />}
    </>
  );
}

// ── Invisible volume the player must stay inside. ─────────────────────────────
function LabBounds({ minX, maxX, minZ, maxZ, floorY, ceilingY }: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
  ceilingY: number;
}) {
  const manager = useLabStore((s) => s.manager);
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    if (!camera) return;
    const pos = camera.position;
    let changed = false;
    if (pos.x < minX) { pos.x = minX; changed = true; }
    if (pos.x > maxX) { pos.x = maxX; changed = true; }
    if (pos.z < minZ) { pos.z = minZ; changed = true; }
    if (pos.z > maxZ) { pos.z = maxZ; changed = true; }
    if (pos.y < floorY + 1.5) { pos.y = floorY + 1.5; changed = true; }
    if (pos.y > ceilingY - 0.3) { pos.y = ceilingY - 0.3; changed = true; }
    if (changed) camera.position.copy(pos);
  });

  return null;
}

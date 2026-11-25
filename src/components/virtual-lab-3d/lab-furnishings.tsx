import { useLabStore } from "./lab-store";

// ── Generic horizontal lab bench ──────────────────────────────────────────────
function Bench({
  position,
  width = 3.2,
  depth = 0.85,
  height = 0.85,
  color = "#eef1f4",
  accent = false,
  name = "bench",
}: {
  position: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
  accent?: boolean;
  name?: string;
}) {
  const hoveredId = useLabStore((s: { hoveredId: string | null }) => s.hoveredId);
  const setHoveredId = useLabStore((s: { setHoveredId: (id: string | null) => void }) => s.setHoveredId);
  const isHover = hoveredId === name;
  return (
    <group
      position={position}
      onPointerEnter={() => setHoveredId(name)}
      onPointerLeave={() => setHoveredId(null)}
    >
      {/* Legs. */}
      {[
        [-width / 2 + 0.18, -depth / 2 + 0.18],
        [-width / 2 + 0.18, depth / 2 - 0.18],
        [width / 2 - 0.18, -depth / 2 + 0.18],
        [width / 2 - 0.18, depth / 2 - 0.18],
      ].map(([x, z], i) => (
        <group key={i} position={[x, height / 2, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.08, height, 0.08]} />
            <meshStandardMaterial color="#cfd6d9" roughness={0.6} metalness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Top. */}
      <group position={[0, height, 0]}>
        <mesh castShadow receiveShadow onClick={(e: unknown) => e.stopPropagation()}>
          <boxGeometry args={[width, 0.05, depth]} />
          <meshStandardMaterial
            color={accent ? "#dbe9e6" : color}
            roughness={0.42}
            metalness={0.02}
            transparent
            opacity={isHover ? 0.98 : 1}
          />
        </mesh>
        {/* Slate edge for accent benches. */}
        {accent && (
          <mesh position={[0, 0.025, depth / 2 - 0.06]} castShadow receiveShadow>
            <boxGeometry args={[width - 0.1, 0.015, 0.12]} />
            <meshStandardMaterial color="#0b5e40" roughness={0.35} metalness={0.15} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ── Storage cabinet (tall, with doors). ──────────────────────────────────────
function Cabinet({
  position,
  name = "cabinet",
  width = 1.1,
  depth = 0.65,
  height = 1.85,
  color = "#e3e9ec",
}: {
  position: [number, number, number];
  name?: string;
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
}) {
  const hoveredId = useLabStore((s: { hoveredId: string | null }) => s.hoveredId);
  const setHoveredId = useLabStore((s: { setHoveredId: (id: string | null) => void }) => s.setHoveredId);
  const isHover = hoveredId === name;
  return (
    <group
      position={position}
      onPointerEnter={() => setHoveredId(name)}
      onPointerLeave={() => setHoveredId(null)}
    >
      {/* Body. */}
      <group position={[0, height / 2 - 0.02, 0]}>
        <mesh castShadow receiveShadow onClick={(e: unknown) => e.stopPropagation()}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        </mesh>
      </group>
      {/* Top trim. */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.04, 0.06, depth + 0.04]} />
        <meshStandardMaterial color="#cfd6d9" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Left door. */}
      <group position={[-width / 2 + 0.045, 0, 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[width / 2 - 0.04, height - 0.08, 0.04]} />
          <meshStandardMaterial color="#d7dee3" roughness={0.45} metalness={0.08} />
        </mesh>
      </group>
      {/* Right door. */}
      <group position={[width / 2 - 0.045, 0, 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[width / 2 - 0.04, height - 0.08, 0.04]} />
          <meshStandardMaterial color="#d7dee3" roughness={0.45} metalness={0.08} />
        </mesh>
      </group>
      {/* Handles. */}
      {[
        [-width / 2 + 0.16, 0, depth / 2 + 0.02],
        [width / 2 - 0.16, 0, depth / 2 + 0.02],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh rotation={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 16]} />
            <meshStandardMaterial color="#8a9aa6" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Shelf lines for definition. */}
      {[0.5, 1.1].map((y, i) => (
        <group key={i} position={[0, y - 0.22, 0.05]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width - 0.1, 0.012, 0.6]} />
            <meshStandardMaterial color="#c4ccd2" roughness={0.6} metalness={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Shelving unit (wall-mounted) ─────────────────────────────────────────────
function ShelvingUnit({
  position,
  name = "shelf",
  width = 2.2,
  height = 1.9,
  depth = 0.42,
  color = "#e3e9ec",
}: {
  position: [number, number, number];
  name?: string;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
}) {
  const hoveredId = useLabStore((s: { hoveredId: string | null }) => s.hoveredId);
  const setHoveredId = useLabStore((s: { setHoveredId: (id: string | null) => void }) => s.setHoveredId);
  const isHover = hoveredId === name;
  const tierCount = 4;
  const tierSpacing = height / tierCount;
  return (
    <group
      position={position}
      onPointerEnter={() => setHoveredId(name)}
      onPointerLeave={() => setHoveredId(null)}
    >
      {/* Back board. */}
      <group position={[0, (height - 0.1) / 2 - 0.04, -depth / 2 + 0.04]}>
        <mesh castShadow receiveShadow onClick={(e: unknown) => e.stopPropagation()}>
          <boxGeometry args={[width, height - 0.1, 0.04]} />
          <meshStandardMaterial color="#d7dee3" roughness={0.55} metalness={0.05} />
        </mesh>
      </group>
      {/* Vertical posts. */}
      {[-width / 2 + 0.05, width / 2 - 0.05].map((x, i) => (
        <group key={i} position={[x, (height - 0.1) / 2 - 0.04, -depth / 2 + 0.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, height - 0.1, 0.04]} />
            <meshStandardMaterial color="#c4ccd2" roughness={0.55} metalness={0.1} />
          </mesh>
        </group>
      ))}
      {/* Shelves. */}
      {Array.from({ length: tierCount }).map((_, i) => {
        const ty = i * tierSpacing + tierSpacing / 2 - 0.05;
        return (
          <group key={i} position={[0, ty, -depth / 2 + 0.04]}>
            <group>
              <mesh castShadow receiveShadow onClick={(e: unknown) => e.stopPropagation()}>
                <boxGeometry args={[width - 0.12, 0.035, depth - 0.06]} />
                <meshStandardMaterial color={isHover ? "#d8e3e8" : "#ebe4e0"} roughness={0.5} metalness={0.05} />
              </mesh>
              {/* Small item silhouettes. */}
              {i % 2 === 0 && (
                <group position={[0.5, 0.06, 0.02]}>
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.08, 0.08, 0.22, 20]} />
                    <meshStandardMaterial color="#cfd6d9" roughness={0.5} metalness={0.15} />
                  </mesh>
                </group>
              )}
              {i % 2 === 1 && (
                <group position={[-0.5, 0.06, 0.02]}>
                  <group>
                    <mesh castShadow receiveShadow>
                      <cylinderGeometry args={[0.1, 0.1, 0.16, 18]} />
                      <meshStandardMaterial color="#cfd6d9" roughness={0.5} metalness={0.15} />
                    </mesh>
                  </group>
                  <group position={[0, 0.12, 0]}>
                    <mesh castShadow receiveShadow>
                      <cylinderGeometry args={[0.12, 0.12, 0.03, 22]} />
                      <meshStandardMaterial color="#8a9aa6" metalness={0.9} roughness={0.2} />
                    </mesh>
                  </group>
                </group>
              )}
            </group>
          </group>
        );
      })}
      {depth === 0.42 && (
        <>
          {/* Small items on the top too. */}
          <group position={[0.4, height / 2 + 0.02, 0.02]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.16, 18]} />
              <meshStandardMaterial color="#cfd6d9" roughness={0.5} metalness={0.15} />
            </mesh>
          </group>
          <group position={[-0.4, height / 2 + 0.02, 0.02]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.18, 0.14, 0.12]} />
              <meshStandardMaterial color="#d4dbe0" roughness={0.55} metalness={0.05} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

// ── Stool (adjustable height, laboratory side chair). ─────────────────────────
function Stool({
  position,
  name = "stool",
  height = 0.55,
  seatColor = "#cfd6d9",
}: {
  position: [number, number, number];
  name?: string;
  height?: number;
  seatColor?: string;
}) {
  const hoveredId = useLabStore((s: { hoveredId: string | null }) => s.hoveredId);
  const setHoveredId = useLabStore((s: { setHoveredId: (id: string | null) => void }) => s.setHoveredId);
  const isHover = hoveredId === name;
  return (
    <group
      position={position}
      onPointerEnter={() => setHoveredId(name)}
      onPointerLeave={() => setHoveredId(null)}
    >
      {/* Base post. */}
      <group position={[0, 0.16, 0]}>
        <mesh castShadow receiveShadow onClick={(e: unknown) => e.stopPropagation()}>
          <cylinderGeometry args={[0.07, 0.09, 0.32, 24]} />
          <meshStandardMaterial color="#8a9aa6" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>
      {/* Foot ring. */}
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.2, 0.015, 8, 32]} />
          <meshStandardMaterial color="#8a9aa6" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>
      {/* Four casters. */}
      {[
        [-0.18, 0.02, -0.18],
        [-0.18, 0.02, 0.18],
        [0.18, 0.02, -0.18],
        [0.18, 0.02, 0.18],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.035, 0.05, 0.07, 14]} />
            <meshStandardMaterial color="#6b7882" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* Seat. */}
      <group position={[0, height + 0.14, 0]}>
        <mesh castShadow receiveShadow onClick={(e: unknown) => e.stopPropagation()}>
          <cylinderGeometry args={[0.45, 0.45, 0.07, 36]} />
          <meshStandardMaterial
            color={seatColor}
            roughness={0.45}
            metalness={0.02}
            transparent
            opacity={isHover ? 0.98 : 1}
          />
        </mesh>
      </group>
      {/* Back rest. */}
      <group position={[0, height + 0.24, -0.47]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.32, 0.04]} />
          <meshStandardMaterial color="#cfd6d9" roughness={0.55} metalness={0.02} />
        </mesh>
      </group>
    </group>
  );
}

// ── Lab furnishings (organized layout). ───────────────────────────────────────
export function LabFurnishings() {
  return (
    <group>
      {/* Main workbench — left wall, long. */}
      <Bench
        position={[-5.6, 0, 0.2]}
        width={4.6}
        depth={0.85}
        height={0.85}
        name="bench-main"
      />
      {/* Smaller prep bench near the entry (player path). */}
      <Bench
        position={[0.1, 0, 4.6]}
        width={2.4}
        depth={0.85}
        height={0.85}
        color="#e3e9ec"
        accent
        name="bench-prep"
      />
      {/* Tall storage cabinet against the back wall, right side. */}
      <Cabinet
        position={[5.6, 0, -4.2]}
        name="cabinet-1"
        width={1.1}
        height={1.85}
        depth={0.6}
      />
      {/* Second cabinet, left of prep bench. */}
      <Cabinet
        position={[2.5, 0, 4.1]}
        name="cabinet-2"
        width={1.0}
        height={1.7}
        depth={0.62}
        color="#e7edf0"
      />
      {/* Wall-mounted shelving under the back window. */}
      <ShelvingUnit
        position={[0, 0.18, -5.4]}
        name="shelf-1"
        width={3.6}
        height={1.9}
        depth={0.4}
      />
      {/* Stool near the microscope bench. */}
      <Stool
        position={[4.35, 0, 1.3]}
        name="stool-1"
        height={0.55}
      />
      {/* Second stool. */}
      <Stool
        position={[2.8, 0, 1.5]}
        name="stool-2"
        height={0.5}
        seatColor="#dce3e7"
      />
    </group>
  );
}

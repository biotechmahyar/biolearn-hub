import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabStore } from "../lab-store";

// ── First-person camera driven by yaw/pitch ──────────────────────────────────
function FirstPersonCamera() {
  const { camera } = useThree();
  const manager = useLabStore((s) => s.manager);
  const prev = useRef({ yaw: manager.yaw, pitch: manager.pitch });

  useFrame(() => {
    const look = new THREE.Euler(manager.pitch, manager.yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(look);
    prev.current.yaw = manager.yaw;
    prev.current.pitch = manager.pitch;
  });

  return null;
}

// ── Movement / pointer-lock / keyboard bindings ────────────────────────────
export function LabPlayer() {
  const manager = useLabStore((s) => s.manager);
  const setLocked = useLabStore((s) => s.setLocked);
  const setHoveredId = useLabStore((s) => s.setHoveredId);
  const panelId = useLabStore((s) => s.panelId);
  const setPanelId = useLabStore((s) => s.setPanelId);

  // Pointer lock engage only on user gesture (click on the canvas).
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) return;
    let down = false;
    canvas.addEventListener("mousedown", () => {
      if (!down) {
        down = true;
        // Only lock if the panel is not open (user can still interact).
        if (panelId === null) {
          try { document.body.requestPointerLock() } catch {}
        }
      }
    });
    canvas.addEventListener("mouseup", () => { down = false; });
    return () => {
      canvas.removeEventListener("mousedown", () => {});
      canvas.removeEventListener("mouseup", () => {});
    };
  }, [panelId]);

  // ESC exits the pointer lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        try { document.exitPointerLock() } catch {}
        setLocked(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLocked]);

  // When the pointer lock leaves, clear the hover highlight.
  useEffect(() => {
    const onLeave = () => setLocked(false);
    window.addEventListener("pointerlockchange", onLeave);
    return () => window.removeEventListener("pointerlockchange", onLeave);
  }, [setLocked]);

  // Hover cursor.
  useEffect(() => {
    // The lab equipment registers its own hover; no extra cursor work here.
  }, [setHoveredId]);

  // Keyboard movement when locked (WASD).
  useEffect(() => {
    const keys = new Set<string>();
    const step = 0.05; // world units per frame (~3 m/s at 60fps).
    const eng = new THREE.Vector3();

    const move = () => {
      if (!manager.locked) return;
      // Forward/backward in the camera's look direction (xz plane only).
      camera.getWorldDirection(eng);
      const fwd = new THREE.Vector3(eng.x, 0, eng.z).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      let moved = false;
      if (keys.has("KeyW")) { manager.position.x += right.x * step; manager.position.z += right.z * step; changed = true; moved = true; }
      if (keys.has("KeyS")) { manager.position.x -= right.x * step; manager.position.z -= right.z * step; changed = true; moved = true; }
      if (keys.has("KeyA")) { manager.position.x += fwd.x * step; manager.position.z += fwd.z * step; changed = true; moved = true; }
      if (keys.has("KeyD")) { manager.position.x -= fwd.x * step; manager.position.z -= fwd.z * step; changed = true; moved = true; }
      if (moved) {
        // Re-read the camera direction after strafing for next frame.
        camera.getWorldDirection(eng);
      }
    };

    // Exchange the keyboard state with the manager every frame.
    const raf = window.requestAnimationFrame(function tick() {
      move();
      window.requestAnimationFrame(tick);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [manager, setLocked, setHoveredId, setPanelId]);

  return <FirstPersonCamera />;
}

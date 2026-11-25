import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabStore } from "./lab-store";

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
function LabPlayer() {
  const manager = useLabStore((s) => s.manager);
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

  return <FirstPersonCamera />;
}

export { FirstPersonCamera };
export default function LabPlayerWrapper() {
  return <LabPlayer />;
}

// keep backward compat export alias for equipment scene
export const labController = LabPlayer;
export const firstPersonCamera = FirstPersonCamera;
// keep backward compat export alias for equipment scene
const _labBounds: unknown = FirstPersonCamera;
export { _labBounds as labBounds };

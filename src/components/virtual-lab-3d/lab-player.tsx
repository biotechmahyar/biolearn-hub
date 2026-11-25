import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabStore } from "./lab-store";

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

export { FirstPersonCamera };

export default function LabPlayer() {
  const locked = useLabStore((s) => s.manager.locked);
  const setLocked = useLabStore((s) => s.setLocked);

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

  useEffect(() => {
    const leave = () => setLocked(false);
    window.addEventListener("pointerlockchange", leave);
    return () => window.removeEventListener("pointerlockchange", leave);
  }, [setLocked]);

  const keys = useState({ w: false, a: false, s: false, d: false })[0];
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

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
      const { camera } = useThree();
      if (!locked || !camera) {
        raf = requestAnimationFrame(loop);
        return;
      }
      camera.getWorldDirection(fwd.current);
      right.current.crossVectors(fwd.current, up.current).normalize();
      const forward = fwd.current.clone().multiplyScalar((keys.w ? 1 : 0) - (keys.s ? 1 : 0));
      const strafe = right.current.clone().multiplyScalar((keys.d ? 1 : 0) - (keys.a ? 1 : 0));
      const manager = useLabStore.getState().manager;
      manager.position.x += forward.x + strafe.x;
      manager.position.z += forward.z + strafe.z;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locked, keys]);

  return <FirstPersonCamera />;
}

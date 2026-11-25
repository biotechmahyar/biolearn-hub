export { default as VirtualLab3DApp } from "./VirtualLab3DApp";
export { supportsWebGL, WebGLFallback, LabTopBar, InteractHint } from "./VirtualLab3DApp";
export { LabEnvironment } from "./lab-environment";
export { LabFurnishings } from "./lab-furnishings";
export { LabEquipment, LabBounds, EquipmentPanel, InteractHint as InteractHintRing } from "./lab-equipment";
export { LabPlayer, FirstPersonCamera } from "./lab-player";
export type { LabEquipment, LabManagerState } from "./lab-store";
export { useLabStore } from "./lab-store";

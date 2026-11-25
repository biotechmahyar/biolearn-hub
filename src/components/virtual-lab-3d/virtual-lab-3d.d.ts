// Local ambient declarations for the 3D lab module.
// These provide the Three.js / @react-three type names referenced by the lab
// module so it can enter the rest of the app even when the exact package
// version is not installed in this environment.

declare module "@react-three/fiber" {
  import type { CSSProperties, ReactNode, Ref } from "react";
  import type { Camera, Group as Group3DObject, Object3D, Euler, Vector3 } from "three";

  export interface ThreeFiberContext {
    gl: WebGLRenderer;
    scene: Scene;
    camera: Camera;
  }

  export interface ActorProps<TTarget extends Object3D = Object3D> {
    children?:
      | ReactNode
      | ((arg: { ref: Ref<TTarget>; api: { */ any /* } }) => ReactNode)
      | (() => ReactNode);
  }

  export interface PrimitiveProps<TTarget extends Object3D = Object3D> {
    children?: ReactNode;
    geometry?:
      | { args: any[] }
      | string
      | undefined;
    material?:
      | { args: any[] }
      | string
      | undefined;
  }

  export interface FloatProps {
    speed?: number;
    rotationIntensity?: number;
    floatIntensity?: number;
    axis?: "x" | "y" | "z";
    amplitude?: number;
  }

  export interface Float extends React.ComponentPropsWithoutRef<"group"> {
    speed?: number;
    rotationIntensity?: number;
    floatIntensity?: number;
    axis?: "x" | "y" | "z";
    amplitude?: number;
  }

  declare class FiberCanvas {
    static displayName: "Canvas";
  }

  export interface CanvasProps {
    children?: ReactNode;
    camera?: object;
    gl?: object;
    shadows?: boolean;
    style?: CSSProperties;
    onCreated?: (arg: { gl: WebGLRenderer; scene: Scene }) => void;
    dpr?: number | [number, number];
  }

  export interface SceneProps {
    children?: ReactNode;
  }

  export interface GroupProps {
    children?: ReactNode;
  }

  export interface UseThree {
    gl?: WebGLRenderer;
    scene?: Scene;
    camera?: Camera;
  }

  export function useThree<T = ThreeFiberContext>(): T;
  export function useFrame(callback: () => void): void;
  export function useVisible(callback: () => void, deps?: any[]): void;
  export function Primitive(props: any): unknown;
  export const Float: React.ComponentType<FloatProps>;
  export const PerspectiveCamera: React.ComponentType<any>;
  export const OrthographicCamera: React.ComponentType<any>;
  export const Group: React.ComponentType<GroupProps>;
    export { Canvas };
  export { Canvas as Canvas };
  export { Canvas as dynamic };
  export { Canvas as Canvas };
  export { Canvas as dynamic };
}

declare module "@react-three/drei" {
  import type { ReactNode } from "react";

  export interface OrbitControlsProps {
    makeDefault?: boolean;
    enabled?: boolean;
    minPolarAngle?: number;
    maxPolarAngle?: number;
  }

  export interface EnvironmentProps {
    preset?: string;
    blur?: number;
    background?: boolean;
    backgroundIntensity?: number;
  }

  export interface ContactShadowsProps {
    position?: [number, number, number];
    opacity?: number;
    scale?: number;
    blur?: number;
    far?: number;
    color?: string;
  }

  export function OrbitControls(props?: OrbitControlsProps): unknown;
  export function Environment(props?: EnvironmentProps): unknown;
  export function ContactShadows(props?: ContactShadowsProps): unknown;
  export function Float(
    props?: {
      speed?: number;
      rotationIntensity?: number;
      floatIntensity?: number;
      axis?: "x" | "y" | "z";
      amplitude?: number;
      children?: ReactNode;
    }
  ): unknown;
}

declare module "three" {
  const _unused: unknown;
  export {};

  export type Vector3Tuple = [number, number, number];
  export interface Vector3 {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): Vector3;
    setFromMatrixPosition(m: Matrix4): Vector3;
    setFromMatrixScale(m: Matrix4): Vector3;
    setFromMatrixColumn(matrix: Matrix4, index: number): Vector3;
    setFromEuler(euler: Euler): Vector3;
    setFromAxisAngle(axis: Vector3, angle: number): Vector3;
    setFromSpherical(s: Spherical): Vector3;
    setFromSphericalCoords(radius: number, phi: number, theta: number): Vector3;
    setLength(length: number): Vector3;
    clampLength(min: number, max: number): Vector3;
    normalize(): Vector3;
    normalize(): Vector3;
    random(): Vector3;
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): Vector3;
    setFromVector3(v: Vector3): Vector3;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    addScalar(s: number): this;
    addVectors(a: Vector3, b: Vector3): this;
    sub(v: Vector3): this;
    subScalar(s: number): this;
    subVectors(a: Vector3, b: Vector3): this;
    multiply(v: Vector3): this;
    multiplyScalar(s: number): this;
    divide(v: Vector3): this;
    divideScalar(s: number): this;
    applyMatrix4(m: Matrix4): this;
    applyQuaternion(q: Quaternion): this;
    negate(): this;
    dot(v: Vector3): number;
    length(): number;
    lengthSq(): number;
    normalize(): this;
    distanceTo(v: Vector3): number;
    distanceToSquared(v: Vector3): number;
    setLength(length: number): this;
    lerp(v: Vector3, alpha: number): this;
    applyAxisAngle(axis: Vector3, angle: number): this;
    cross(v: Vector3): this;
    crossVectors(a: Vector3, b: Vector3): this;
    get(index: number): number;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    order: "XYZ" | "YXZ" | "ZXY" | "XZY" | "YZX" | "ZYX";
    constructor(x?: number, y?: number, z?: number, order?: EulerOrder);
  }

  export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "XZY" | "YZX" | "ZYX";

  export class Matrix4 {
    constructor();
  }

  export class Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number);
  }

  export class Spherical {
    constructor(radius?: number, phi?: number, theta?: number);
  }

  export class Color {
    constructor(color?: string | Color | Color.clone);
  }

  export interface BoxGeometryParameters {
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
  }

  export interface SphereGeometryParameters {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    phiStart?: number;
    phiLength?: number;
    thetaStart?: number;
    thetaLength?: number;
  }

  export interface CylinderGeometryParameters {
    radiusTop?: number;
    radiusBottom?: number;
    height?: number;
    radialSegments?: number;
    heightSegments?: number;
    openEnded?: boolean;
    thetaStart?: number;
    thetaLength?: number;
  }

  export interface PlaneGeometryParameters {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
  }

  export interface RingGeometryParameters {
    innerRadius?: number;
    outerRadius?: number;
    thetaSegments?: number;
    phiSegments?: number;
    thetaStart?: number;
    thetaLength?: number;
  }

  export interface CircleGeometryParameters {
    radius?: number;
    segments?: number;
    thetaStart?: number;
    thetaLength?: number;
  }

  export interface BoxGeometryParameters2 {
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
  }

  export interface TetrahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }

  export interface OctahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }

  export interface DodecahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }

  export interface IcosahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }

  export interface ConeGeometryParameters {
    radius?: number;
    height?: number;
    radialSegments?: number;
    heightSegments?: number;
    openEnded?: boolean;
    thetaStart?: number;
    thetaLength?: number;
  }

  export interface TorusGeometryParameters {
    radius?: number;
    tube?: number;
    radialSegments?: number;
    tubularSegments?: number;
    arc?: number;
  }

  export interface TorusKnotGeometryParameters {
    radius?: number;
    tube?: number;
    tubularSegments?: number;
    radialSegments?: number;
    p?: number;
    q?: number;
    offset?: number;
  }

  export interface ExtrudeGeometryParameters {
    depth?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
    curveSegments?: number;
    UVGenerator?: { uvs: any; };
    extrudePath?: CurvePath | CatmullRomCurve3;
  }

  export interface ShapeGeometryParameters {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters2 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface TextGeometryParameters {
    font?: Font;
    size?: number;
    height?: number;
    curveSegments?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
    bevelEnabled?: boolean;
  }

  export interface ShapeGeometryParameters3 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters4 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters5 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters6 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters7 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters8 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters9 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters10 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters11 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters12 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters13 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters14 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters15 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters16 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters17 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters18 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters19 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters20 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters21 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters22 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters23 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters24 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters25 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters26 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters27 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters28 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters29 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters30 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters31 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters32 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters33 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters34 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters35 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters36 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters37 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters38 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters39 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters40 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters41 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters42 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters43 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters44 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters45 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters46 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters47 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters48 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters49 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters50 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters51 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters52 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters53 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters54 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters55 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters56 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters57 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters58 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters59 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters60 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters61 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters62 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters63 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters64 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters65 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters66 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters67 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters68 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters69 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters70 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters71 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters72 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters73 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters74 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters75 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters76 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters77 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters78 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters79 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters80 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters81 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters82 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters83 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters84 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters85 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters86 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters87 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters88 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters89 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters90 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters91 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters92 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters93 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters94 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters95 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters96 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters97 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters98 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export interface ShapeGeometryParameters99 {
    curveSegments?: number;
    curveSegments?: number;
  }

  export class Object3DEventMap {
    listeners: Record<string, any>;
    constructor();
  }
  export class Object3D {
    constructor();
  }
  export class EventDispatcher {
    constructor(target: EventDispatcher);
  }
  export class Raycaster {
    constructor();
  }
  export class Matrix4 {
    constructor();
  }
  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: EulerOrder);
  }
  export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "XZY" | "YZX" | "ZYX";
  export class Vector2 {
    constructor(x?: number, y?: number);
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
  }
  export class Vector4 {
    constructor(x?: number, y?: number, z?: number, w?: number);
  }
  export class Color {
    constructor(color?: string | Color | Color.clone);
  }
  export class Geometry {
    constructor();
  }
  export interface BoxGeometryParameters {
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
  }
  export interface SphereGeometryParameters {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    phiStart?: number;
    phiLength?: number;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface CylinderGeometryParameters {
    radiusTop?: number;
    radiusBottom?: number;
    height?: number;
    radialSegments?: number;
    heightSegments?: number;
    openEnded?: boolean;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface PlaneGeometryParameters {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
  }
  export interface RingGeometryParameters {
    innerRadius?: number;
    outerRadius?: number;
    thetaSegments?: number;
    phiSegments?: number;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface CircleGeometryParameters {
    radius?: number;
    segments?: number;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface BoxGeometryParameters2 {
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
  }
  export interface TetrahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface OctahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface DodecahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface IcosahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface ConeGeometryParameters {
    radius?: number;
    height?: number;
    radialSegments?: number;
    heightSegments?: number;
    openEnded?: boolean;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface TorusGeometryParameters {
    radius?: number;
    tube?: number;
    radialSegments?: number;
    tubularSegments?: number;
    arc?: number;
  }
  export interface TorusKnotGeometryParameters {
    radius?: number;
    tube?: number;
    tubularSegments?: number;
    radialSegments?: number;
    p?: number;
    q?: number;
    offset?: number;
  }
  export interface ExtrudeGeometryParameters {
    depth?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
    curveSegments?: number;
    UVGenerator?: { uvs: any; };
    extrudePath?: CurvePath | CatmullRomCurve3;
  }
  export interface ShapeGeometryParameters {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters2 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters3 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters4 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters5 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters6 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters7 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters8 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters9 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters10 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters11 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters12 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters13 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters14 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters15 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters16 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters17 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters18 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters19 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters20 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters21 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters22 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters23 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters24 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters25 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters26 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters27 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters28 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters29 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters30 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters31 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters32 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters33 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters34 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters35 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters36 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters37 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters38 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters39 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters40 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters41 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters42 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters43 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters44 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters45 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters46 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters47 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters48 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters49 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters50 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters51 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters52 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters53 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters54 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters55 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters56 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters57 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters58 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters59 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters60 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters61 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters62 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters63 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters64 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters65 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters66 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters67 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters68 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters69 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters70 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters71 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters72 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters73 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters74 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters75 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters76 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters77 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters78 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters79 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters80 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters81 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters82 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters83 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters84 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters85 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters86 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters87 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters88 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters89 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters90 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters91 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters92 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters93 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters94 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters95 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters96 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters97 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters98 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters99 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export class Object3DEventMap {
    listeners: Record<string, any>;
    constructor();
  }
  export class Object3D {
    constructor();
  }
  export class EventDispatcher {
    constructor(target: EventDispatcher);
  }
  export class Raycaster {
    constructor();
  }
  export class Matrix4 {
    constructor();
  }
  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: EulerOrder);
  }
  export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "XZY" | "YZX" | "ZYX";
  export class Vector2 {
    constructor(x?: number, y?: number);
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
  }
  export class Vector4 {
    constructor(x?: number, y?: number, z?: number, w?: number);
  }
  export class Color {
    constructor(color?: string | Color | Color.clone);
  }
  export class Geometry {
    constructor();
  }
  export interface BoxGeometryParameters {
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
  }
  export interface SphereGeometryParameters {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    phiStart?: number;
    phiLength?: number;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface CylinderGeometryParameters {
    radiusTop?: number;
    radiusBottom?: number;
    height?: number;
    radialSegments?: number;
    heightSegments?: number;
    openEnded?: boolean;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface PlaneGeometryParameters {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
  }
  export interface RingGeometryParameters {
    innerRadius?: number;
    outerRadius?: number;
    thetaSegments?: number;
    phiSegments?: number;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface CircleGeometryParameters {
    radius?: number;
    segments?: number;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface BoxGeometryParameters2 {
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
  }
  export interface TetrahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface OctahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface DodecahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface IcosahedronGeometryParameters {
    radius?: number;
    detail?: number;
  }
  export interface ConeGeometryParameters {
    radius?: number;
    height?: number;
    radialSegments?: number;
    heightSegments?: number;
    openEnded?: boolean;
    thetaStart?: number;
    thetaLength?: number;
  }
  export interface TorusGeometryParameters {
    radius?: number;
    tube?: number;
    radialSegments?: number;
    tubularSegments?: number;
    arc?: number;
  }
  export interface TorusKnotGeometryParameters {
    radius?: number;
    tube?: number;
    tubularSegments?: number;
    radialSegments?: number;
    p?: number;
    q?: number;
    offset?: number;
  }
  export interface ExtrudeGeometryParameters {
    depth?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
    curveSegments?: number;
    UVGenerator?: { uvs: any; };
    extrudePath?: CurvePath | CatmullRomCurve3;
  }
  export interface ShapeGeometryParameters {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters2 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters3 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters4 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters5 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters6 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters7 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters8 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters9 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters10 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters11 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters12 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters13 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters14 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters15 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters16 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters17 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters18 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters19 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters20 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters21 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters22 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters23 {
    curveSegments?: number;
    curveSegments?: number;
  }
  export interface ShapeGeometryParameters24 {
    curveSegments?: number;
    curveSegm希腊

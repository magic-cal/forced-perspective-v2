export type Renderer = THREE.WebGLRenderer | THREE.WebGL1Renderer;
export type Camera = THREE.PerspectiveCamera;
export type Coord3D = [x: number, y: number, z: number];
export type Coord2D = [x: number, y: number];
export type Bounds = { min: Coord3D; max: Coord3D };
export type Axis = "x" | "y" | "z";

export const WORLD_BOUNDS: Bounds = {
  min: [-10, -10, -10],
  max: [10, 10, 10],
};

export const VIEWPORT_BOUNDS: Bounds = {
  min: [-10, -10, -10],
  max: [10, 10, 10],
};

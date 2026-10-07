import type { World } from '@dimforge/rapier3d-compat';

export type PhysicsRegion = {
  Id: string;
  X: number;
  Y: number;
  Origin: [number, number, number];
  World: World;
};

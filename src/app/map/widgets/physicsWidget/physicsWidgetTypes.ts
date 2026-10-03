import { ColliderDesc, RigidBody } from '@dimforge/rapier3d-compat';

export type PhysicsWidgetOptions = { Id: string };
export type PhysicsWidgetOptionsApi = {
  AddCollider(ColliderDescription: ColliderDesc, Parent?: RigidBody): void;
};

import { Collider, ColliderDesc, RigidBody } from '@dimforge/rapier3d-compat';

export type PhysicsWidgetOptions = { Id: string };
export type PhysicsWidgetApi = {
  AddCollider(ColliderDescription: ColliderDesc, Parent?: RigidBody): Collider;
};

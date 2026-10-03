import type { Collider, ColliderDesc, RigidBody, RigidBodyDesc } from '@dimforge/rapier3d-compat';

export type PhysicsWidgetApi = {
  AddCollider(ColliderDescription: ColliderDesc, Parent?: RigidBody): Collider;
  RemoveCollider(Collider: Collider, WakeUp?: boolean): void;
  AddRigidBody(RigidBodyDescription: RigidBodyDesc): RigidBody;
  RemoveRigidBody(RigidBody: RigidBody): void;
};

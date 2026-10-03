import type { ColliderHandle, RigidBodyHandle } from '@dimforge/rapier3d-compat';
import type { ColliderHandle, RigidBodyHandle } from '@dimforge/rapier3d-compat';

export type PhysicsWidgetApi = {
  AddCollider(Description: PhysicsColliderDescription, ParentId?: RigidBodyHandle): ColliderHandle;
  RemoveCollider(Id: ColliderHandle): void;
  AddRigidBody(Description: PhysicsRigidBodyDescription): RigidBodyHandle;
  RemoveRigidBody(Id: RigidBodyHandle): void;
  ChangeEnablePhysics(IsEnable: boolean): void;
};

export type PhysicsWidgetOptions = { Id: string; IsEnablePhysics: boolean };
export type PhysicsRigidBodyDescription = {
  Type: 'Fixed' | 'Dynamic' | 'KinematicPosition' | 'KinematicVelocity';
  Position?: [number, number, number];
};

type PhysicsColliderBaseDescription = {
  Position?: [number, number, number];
  Friction?: number;
  Restitution?: number;
  IsSensor?: boolean;
};

export type PhysicsColliderDescription =
  | (PhysicsColliderBaseDescription & {
      Type: 'Cuboid';
      HalfExtents: [number, number, number];
    })
  | (PhysicsColliderBaseDescription & {
      Type: 'Ball';
      Radius: number;
    })
  | (PhysicsColliderBaseDescription & {
      Type: 'Trimesh';
      Vertices: Float32Array;
      Indices: Uint32Array;
    });

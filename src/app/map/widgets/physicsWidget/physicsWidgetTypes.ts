import type { ColliderHandle, RigidBodyHandle } from '@dimforge/rapier3d-compat';
import BaseWidget from '../baseWidget/baseWidget';
import { WidgetApi } from '../baseWidget/baseWidgetTypes';

export type PhysicsWidgetApi = {
  AddCollider(Description: PhysicsColliderDescription, ParentId?: RigidBodyHandle): ColliderHandle;
  RemoveCollider(Id: ColliderHandle): void;
  AddRigidBody(Description: PhysicsRigidBodyDescription): RigidBodyHandle;
  RemoveRigidBody(Id: RigidBodyHandle): void;
  ChangeEnablePhysics(IsEnable: boolean): void;
  ChangeEnableDebug(IsEnable: boolean): void;
};
export const PhysicsWidgetKey = BaseWidget.CreateWidgetKey<
  WidgetApi<PhysicsWidgetApi> & PhysicsWidgetOptions
>('PhysicsWidget');

export type PhysicsWidgetOptions = {
  Id: string;
  IsEnableDebug: boolean;
  IsEnablePhysics: boolean;
  CoordinateOrigin: [number, number, number];
};
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
export { ColliderHandle };

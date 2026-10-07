import { World } from '@dimforge/rapier3d-compat';
import BaseWidget from '../baseWidget/baseWidget';
import { WidgetApi } from '../baseWidget/baseWidgetTypes';
import type { Object3D } from 'three';
export type PhysicsWidgetApi = {
  AddCollider(Description: PhysicsColliderDescription, ParentId?: number): number;
  RemoveCollider(Id: number): void;
  AddRigidBody(Description: PhysicsRigidBodyDescription): number;
  RemoveRigidBody(Id: number): void;
  AddModelCollider(Model: Object3D, ParentId?: number): number;
  AddModelRigidBody(
    Model: Object3D,
    Type?: PhysicsRigidBodyDescription['Type'],
  ): {
    RigidBodyId: number;
    ColliderId: number;
  };
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
  Rotation?: [number, number, number, number];
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

export type PhysicsRegion = {
  Id: string;
  X: number;
  Y: number;
  Origin: [number, number, number];
  World: World;
};

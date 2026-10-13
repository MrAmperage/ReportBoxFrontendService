import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef } from '@angular/core';

import type {
  ColliderDesc,
  ColliderHandle,
  RigidBodyDesc,
  RigidBodyHandle,
} from '@dimforge/rapier3d-compat';

import { Box3, Matrix4, Mesh, Vector3 } from 'three';

import type { Object3D } from 'three';

import DeckGlService from '../../deckglService/deckglService';

import BaseWidget from '../baseWidget/baseWidget';
import ExportApi from '../baseWidget/ExportApiDecorator';

import PhysicsDebugLayer from './layers/physicsDebugLayer/physicsDebugLayer';

import type { PhysicsDebugLine } from './layers/physicsDebugLayer/physicsDebugLayerTypes';

import {
  PhysicsColliderDescription,
  PhysicsRegion,
  PhysicsRigidBodyDescription,
  PhysicsWidgetOptions,
} from './physicsWidgetTypes';

type PhysicsRigidBodyRecord = {
  RegionId: string;
  Handle: RigidBodyHandle;
  Description: PhysicsRigidBodyDescription;
  ColliderIds: Set<number>;
};

type PhysicsColliderRecord = {
  RegionHandles: Map<string, ColliderHandle>;
  Description: PhysicsColliderDescription;
  ParentId?: number;
};

@Component({
  selector: 'PhysicsWidget',
  templateUrl: './physicsWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PhysicsWidget extends BaseWidget<PhysicsWidgetOptions> {
  constructor(
    private DeckGlServiceInstance: DeckGlService,
    private ElementRefInstance: ElementRef<HTMLDivElement>,
    private ChangeDetectorRefInstance: ChangeDetectorRef,
  ) {
    super(DeckGlServiceInstance, ElementRefInstance, ChangeDetectorRefInstance);
  }

  Options: PhysicsWidgetOptions = {
    Id: 'PhysicsWidget',
    IsEnableDebug: true,
    IsEnablePhysics: true,
    CoordinateOrigin: [0, 0, 0],
  };

  private readonly Regions = new Map<string, PhysicsRegion>();

  private readonly RigidBodies = new Map<number, PhysicsRigidBodyRecord>();

  private readonly Colliders = new Map<number, PhysicsColliderRecord>();

  private readonly RegionSize = 10_000;

  private readonly RegionHaloSize = 100;

  private readonly MaxStepsPerFrame = 5;

  private readonly PhysicsTimeStep = 1 / 60;

  private NextRigidBodyId = 1;

  private NextColliderId = 1;

  private LastPhysicsTime = performance.now();

  private PhysicsAccumulator = 0;

  private PhysicsAnimationFrameId: number | undefined;

  private Rapier!: typeof import('@dimforge/rapier3d-compat');

  private DebugRegionId: string | undefined;

  private DebugCanvas: HTMLCanvasElement | undefined;

  private DebugPointerPosition: [number, number] | undefined;

  private DebugPointerTrackingAnimationFrameId: number | undefined;

  private IsDebugLayerAdded = false;

  override InitWidget(): void {
    this.InitPhysics().then(() => {
      super.InitWidget();
    });
  }

  override DestroyWidget(): void {
    this.DestroyPhysics();

    super.DestroyWidget();
  }

  private async InitPhysics(): Promise<void> {
    this.Rapier = await import('@dimforge/rapier3d-compat');

    await this.Rapier.init();

    const InitViewState = this.DeckGlServiceInstance.DeckGl.props.initialViewState;

    if (InitViewState !== null) {
      this.Options.CoordinateOrigin = [InitViewState.longitude, InitViewState.latitude, 0];
    }

    this.InitDebugPointerTracking();

    if (this.Options.IsEnablePhysics) {
      this.StartPhysics();
    }
  }

  private GetRegionCoordinates(Position: [number, number, number]): [number, number] {
    return [Math.floor(Position[0] / this.RegionSize), Math.floor(Position[1] / this.RegionSize)];
  }

  private GetRegionId(X: number, Y: number): string {
    return `${X}:${Y}`;
  }

  private GetOrCreateRegionByCoordinates(X: number, Y: number): PhysicsRegion {
    const Id = this.GetRegionId(X, Y);

    const ExistingRegion = this.Regions.get(Id);

    if (ExistingRegion !== undefined) {
      return ExistingRegion;
    }

    const Region: PhysicsRegion = {
      Id,

      X,

      Y,

      Origin: [X * this.RegionSize, Y * this.RegionSize, 0],

      World: new this.Rapier.World({
        x: 0,
        y: 0,
        z: -9.81,
      }),
    };

    Region.World.timestep = this.PhysicsTimeStep;

    this.Regions.set(Id, Region);

    try {
      this.AttachStaticCollidersToRegion(Region);
    } catch (Error) {
      this.DestroyRegion(Region.Id);

      throw Error;
    }

    return Region;
  }

  private GetOrCreateRegion(Position: [number, number, number]): PhysicsRegion {
    const [X, Y] = this.GetRegionCoordinates(Position);

    return this.GetOrCreateRegionByCoordinates(X, Y);
  }

  private DestroyRegion(RegionId: string): void {
    const Region = this.Regions.get(RegionId);

    if (Region === undefined) {
      return;
    }

    for (const Record of this.Colliders.values()) {
      Record.RegionHandles.delete(RegionId);
    }

    Region.World.free();

    this.Regions.delete(RegionId);
  }

  private TryRemoveRegion(RegionId: string): void {
    if (this.Options.IsEnableDebug && this.DebugRegionId === RegionId) {
      return;
    }

    for (const Record of this.RigidBodies.values()) {
      if (Record.RegionId === RegionId) {
        return;
      }
    }

    this.DestroyRegion(RegionId);
  }

  private ToRegionPosition(
    Position: [number, number, number],
    Region: PhysicsRegion,
  ): [number, number, number] {
    return [
      Position[0] - Region.Origin[0],

      Position[1] - Region.Origin[1],

      Position[2] - Region.Origin[2],
    ];
  }

  private GetRegionBounds(Region: PhysicsRegion): {
    MinX: number;
    MinY: number;
    MaxX: number;
    MaxY: number;
  } {
    return {
      MinX: Region.Origin[0] - this.RegionHaloSize,

      MinY: Region.Origin[1] - this.RegionHaloSize,

      MaxX: Region.Origin[0] + this.RegionSize + this.RegionHaloSize,

      MaxY: Region.Origin[1] + this.RegionSize + this.RegionHaloSize,
    };
  }

  private GetColliderBounds(Description: PhysicsColliderDescription): {
    MinX: number;
    MinY: number;
    MaxX: number;
    MaxY: number;
  } {
    const Position: [number, number, number] = Description.Position ?? [0, 0, 0];

    switch (Description.Type) {
      case 'Cuboid':
        return {
          MinX: Position[0] - Description.HalfExtents[0],

          MinY: Position[1] - Description.HalfExtents[1],

          MaxX: Position[0] + Description.HalfExtents[0],

          MaxY: Position[1] + Description.HalfExtents[1],
        };

      case 'Ball':
        return {
          MinX: Position[0] - Description.Radius,

          MinY: Position[1] - Description.Radius,

          MaxX: Position[0] + Description.Radius,

          MaxY: Position[1] + Description.Radius,
        };

      case 'Trimesh': {
        let MinX = Infinity;

        let MinY = Infinity;

        let MaxX = -Infinity;

        let MaxY = -Infinity;

        for (let Index = 0; Index < Description.Vertices.length; Index += 3) {
          const X = Description.Vertices[Index] + Position[0];

          const Y = Description.Vertices[Index + 1] + Position[1];

          MinX = Math.min(MinX, X);

          MinY = Math.min(MinY, Y);

          MaxX = Math.max(MaxX, X);

          MaxY = Math.max(MaxY, Y);
        }

        return {
          MinX,
          MinY,
          MaxX,
          MaxY,
        };
      }
    }
  }

  private IsBoundsIntersect(
    First: {
      MinX: number;
      MinY: number;
      MaxX: number;
      MaxY: number;
    },

    Second: {
      MinX: number;
      MinY: number;
      MaxX: number;
      MaxY: number;
    },
  ): boolean {
    return !(
      First.MaxX < Second.MinX ||
      First.MinX > Second.MaxX ||
      First.MaxY < Second.MinY ||
      First.MinY > Second.MaxY
    );
  }

  private CreateTrimeshDescriptionForRegion(
    Description: Extract<
      PhysicsColliderDescription,
      {
        Type: 'Trimesh';
      }
    >,

    Region: PhysicsRegion,
  ): PhysicsColliderDescription | undefined {
    const RegionBounds = this.GetRegionBounds(Region);

    const Position: [number, number, number] = Description.Position ?? [0, 0, 0];

    const RegionVertices: number[] = [];

    const RegionIndices: number[] = [];

    const VertexMap = new Map<number, number>();

    const GetVertexIndex = (SourceIndex: number): number => {
      const ExistingIndex = VertexMap.get(SourceIndex);

      if (ExistingIndex !== undefined) {
        return ExistingIndex;
      }

      const SourceOffset = SourceIndex * 3;

      const X = Description.Vertices[SourceOffset] + Position[0];

      const Y = Description.Vertices[SourceOffset + 1] + Position[1];

      const Z = Description.Vertices[SourceOffset + 2] + Position[2];

      const NewIndex = RegionVertices.length / 3;

      RegionVertices.push(
        X - Region.Origin[0],

        Y - Region.Origin[1],

        Z - Region.Origin[2],
      );

      VertexMap.set(SourceIndex, NewIndex);

      return NewIndex;
    };

    for (let Index = 0; Index < Description.Indices.length; Index += 3) {
      const A = Description.Indices[Index];

      const B = Description.Indices[Index + 1];

      const C = Description.Indices[Index + 2];

      const AOffset = A * 3;

      const BOffset = B * 3;

      const COffset = C * 3;

      const AX = Description.Vertices[AOffset] + Position[0];

      const AY = Description.Vertices[AOffset + 1] + Position[1];

      const BX = Description.Vertices[BOffset] + Position[0];

      const BY = Description.Vertices[BOffset + 1] + Position[1];

      const CX = Description.Vertices[COffset] + Position[0];

      const CY = Description.Vertices[COffset + 1] + Position[1];

      const TriangleBounds = {
        MinX: Math.min(AX, BX, CX),

        MinY: Math.min(AY, BY, CY),

        MaxX: Math.max(AX, BX, CX),

        MaxY: Math.max(AY, BY, CY),
      };

      if (!this.IsBoundsIntersect(TriangleBounds, RegionBounds)) {
        continue;
      }

      RegionIndices.push(GetVertexIndex(A), GetVertexIndex(B), GetVertexIndex(C));
    }

    if (RegionIndices.length === 0) {
      return undefined;
    }

    return {
      Type: 'Trimesh',

      Vertices: Float32Array.from(RegionVertices),

      Indices: Uint32Array.from(RegionIndices),

      Friction: Description.Friction,

      Restitution: Description.Restitution,

      IsSensor: Description.IsSensor,
    };
  }

  private CreateStaticColliderDescriptionForRegion(
    Description: PhysicsColliderDescription,

    Region: PhysicsRegion,
  ): PhysicsColliderDescription | undefined {
    if (Description.Type === 'Trimesh') {
      return this.CreateTrimeshDescriptionForRegion(Description, Region);
    }

    const ColliderBounds = this.GetColliderBounds(Description);

    const RegionBounds = this.GetRegionBounds(Region);

    if (!this.IsBoundsIntersect(ColliderBounds, RegionBounds)) {
      return undefined;
    }

    const Position: [number, number, number] = Description.Position ?? [0, 0, 0];

    return {
      ...Description,

      Position: this.ToRegionPosition(Position, Region),
    };
  }

  private AttachStaticColliderToRegion(
    Record: PhysicsColliderRecord,

    Region: PhysicsRegion,
  ): void {
    if (Record.ParentId !== undefined) {
      return;
    }

    if (Record.RegionHandles.has(Region.Id)) {
      return;
    }

    const RegionDescription = this.CreateStaticColliderDescriptionForRegion(
      Record.Description,
      Region,
    );

    if (RegionDescription === undefined) {
      return;
    }

    const Collider = Region.World.createCollider(this.CreateColliderDescription(RegionDescription));

    Record.RegionHandles.set(Region.Id, Collider.handle);
  }

  private AttachStaticCollidersToRegion(Region: PhysicsRegion): void {
    for (const Record of this.Colliders.values()) {
      if (Record.ParentId !== undefined) {
        continue;
      }

      this.AttachStaticColliderToRegion(Record, Region);
    }
  }

  @ExportApi()
  AddRigidBody(Description: PhysicsRigidBodyDescription): number {
    const GlobalPosition: [number, number, number] = Description.Position ?? [0, 0, 0];

    const Region = this.GetOrCreateRegion(GlobalPosition);

    const RegionPosition = this.ToRegionPosition(GlobalPosition, Region);

    const RigidBody = Region.World.createRigidBody(
      this.CreateRigidBodyDescription({
        ...Description,

        Position: RegionPosition,
      }),
    );

    const Id = this.NextRigidBodyId++;

    this.RigidBodies.set(Id, {
      RegionId: Region.Id,

      Handle: RigidBody.handle,

      Description: {
        ...Description,
      },

      ColliderIds: new Set<number>(),
    });

    return Id;
  }

  @ExportApi()
  RemoveRigidBody(Id: number): void {
    const Record = this.RigidBodies.get(Id);
    if (Record === undefined) {
      return;
    }
    const Region = this.Regions.get(Record.RegionId);
    const IsDebugRegionAffected =
      this.Options.IsEnableDebug && this.DebugRegionId === Record.RegionId;
    if (Region !== undefined) {
      const RigidBody = Region.World.getRigidBody(Record.Handle);
      if (RigidBody != null) {
        Region.World.removeRigidBody(RigidBody);
      }
    }
    for (const ColliderId of Record.ColliderIds) {
      this.Colliders.delete(ColliderId);
    }
    this.RigidBodies.delete(Id);
    if (IsDebugRegionAffected) {
      this.UpdateDebugLayer();
    }
    this.TryRemoveRegion(Record.RegionId);
  }

  @ExportApi()
  AddCollider(Description: PhysicsColliderDescription, ParentId?: number): number {
    if (ParentId !== undefined) {
      const ParentRecord = this.RigidBodies.get(ParentId);

      if (ParentRecord === undefined) {
        throw new Error(`RigidBody ${ParentId} не найден`);
      }

      const Region = this.Regions.get(ParentRecord.RegionId);

      if (Region === undefined) {
        throw new Error(`PhysicsRegion ${ParentRecord.RegionId} не найден`);
      }

      const Parent = Region.World.getRigidBody(ParentRecord.Handle);

      if (Parent == null) {
        throw new Error(`RigidBody ${ParentId} не найден`);
      }

      const Collider = Region.World.createCollider(
        this.CreateColliderDescription(Description),
        Parent,
      );

      const Id = this.NextColliderId++;

      this.Colliders.set(Id, {
        RegionHandles: new Map([[Region.Id, Collider.handle]]),

        Description: {
          ...Description,
        },

        ParentId,
      });

      ParentRecord.ColliderIds.add(Id);

      if (this.Options.IsEnableDebug && this.DebugRegionId === Region.Id) {
        this.UpdateDebugLayer();
      }

      return Id;
    }

    const Id = this.NextColliderId++;

    const Record: PhysicsColliderRecord = {
      RegionHandles: new Map<string, ColliderHandle>(),

      Description: {
        ...Description,
      },
    };

    this.Colliders.set(Id, Record);

    try {
      for (const Region of this.Regions.values()) {
        this.AttachStaticColliderToRegion(Record, Region);
      }

      if (
        this.Options.IsEnableDebug &&
        this.DebugRegionId !== undefined &&
        Record.RegionHandles.has(this.DebugRegionId)
      ) {
        this.UpdateDebugLayer();
      }
    } catch (Error) {
      this.RemoveCollider(Id);

      throw Error;
    }

    return Id;
  }

  @ExportApi()
  RemoveCollider(Id: number): void {
    const Record = this.Colliders.get(Id);

    if (Record === undefined) {
      return;
    }

    const IsDebugRegionAffected =
      this.Options.IsEnableDebug &&
      this.DebugRegionId !== undefined &&
      Record.RegionHandles.has(this.DebugRegionId);

    for (const [RegionId, Handle] of Record.RegionHandles) {
      const Region = this.Regions.get(RegionId);

      if (Region === undefined) {
        continue;
      }

      const Collider = Region.World.getCollider(Handle);

      if (Collider == null) {
        continue;
      }

      Region.World.removeCollider(Collider, true);
    }

    if (Record.ParentId !== undefined) {
      this.RigidBodies.get(Record.ParentId)?.ColliderIds.delete(Id);
    }

    this.Colliders.delete(Id);

    if (IsDebugRegionAffected) {
      this.UpdateDebugLayer();
    }
  }

  GetModelBounds(Model: Object3D): Box3 {
    Model.updateWorldMatrix(true, true);

    const Bounds = new Box3();

    const ModelWorldInverse = Model.matrixWorld.clone().invert();

    Model.traverse((Object) => {
      if (!(Object instanceof Mesh)) {
        return;
      }

      const Geometry = Object.geometry;

      if (Geometry.boundingBox === null) {
        Geometry.computeBoundingBox();
      }

      if (Geometry.boundingBox === null) {
        return;
      }

      const LocalMatrix = new Matrix4().multiplyMatrices(ModelWorldInverse, Object.matrixWorld);

      const MeshBounds = Geometry.boundingBox.clone().applyMatrix4(LocalMatrix);

      Bounds.union(MeshBounds);
    });

    return Bounds;
  }

  private CreateBoxColliderDescription(Model: Object3D): PhysicsColliderDescription {
    const Bounds = this.GetModelBounds(Model);

    if (Bounds.isEmpty()) {
      throw new Error('Невозможно создать Collider: модель не содержит геометрии');
    }

    const Size = Bounds.getSize(new Vector3());

    const Center = Bounds.getCenter(new Vector3());

    const Scale = Model.scale;

    return {
      Type: 'Cuboid',

      HalfExtents: [
        (Size.x * Math.abs(Scale.x)) / 2,

        (Size.y * Math.abs(Scale.y)) / 2,

        (Size.z * Math.abs(Scale.z)) / 2,
      ],

      Position: [Center.x * Scale.x, Center.y * Scale.y, Center.z * Scale.z],
    };
  }

  @ExportApi()
  AddModelCollider(
    Model: Object3D,

    ParentId?: number,
  ): number {
    const Description = this.CreateBoxColliderDescription(Model);

    return this.AddCollider(Description, ParentId);
  }

  @ExportApi()
  AddModelRigidBody(
    Model: Object3D,

    Type: PhysicsRigidBodyDescription['Type'] = 'Dynamic',
  ): {
    RigidBodyId: number;
    ColliderId: number;
  } {
    const RigidBodyId = this.AddRigidBody({
      Type,

      Position: [Model.position.x, Model.position.y, Model.position.z],

      Rotation: [Model.quaternion.x, Model.quaternion.y, Model.quaternion.z, Model.quaternion.w],
    });

    const ColliderId = this.AddModelCollider(Model, RigidBodyId);

    return {
      RigidBodyId,
      ColliderId,
    };
  }

  private CreateColliderDescription(Description: PhysicsColliderDescription): ColliderDesc {
    let ColliderDescription: ColliderDesc;

    switch (Description.Type) {
      case 'Cuboid':
        ColliderDescription = this.Rapier.ColliderDesc.cuboid(...Description.HalfExtents);

        break;

      case 'Ball':
        ColliderDescription = this.Rapier.ColliderDesc.ball(Description.Radius);

        break;

      case 'Trimesh':
        ColliderDescription = this.Rapier.ColliderDesc.trimesh(
          Description.Vertices,
          Description.Indices,
        );

        break;
    }

    if (Description.Position !== undefined) {
      ColliderDescription.setTranslation(...Description.Position);
    }

    if (Description.Friction !== undefined) {
      ColliderDescription.setFriction(Description.Friction);
    }

    if (Description.Restitution !== undefined) {
      ColliderDescription.setRestitution(Description.Restitution);
    }

    if (Description.IsSensor !== undefined) {
      ColliderDescription.setSensor(Description.IsSensor);
    }

    return ColliderDescription;
  }

  private CreateRigidBodyDescription(Description: PhysicsRigidBodyDescription): RigidBodyDesc {
    let RigidBodyDescription: RigidBodyDesc;

    switch (Description.Type) {
      case 'Fixed':
        RigidBodyDescription = this.Rapier.RigidBodyDesc.fixed();

        break;

      case 'Dynamic':
        RigidBodyDescription = this.Rapier.RigidBodyDesc.dynamic();

        break;

      case 'KinematicPosition':
        RigidBodyDescription = this.Rapier.RigidBodyDesc.kinematicPositionBased();

        break;

      case 'KinematicVelocity':
        RigidBodyDescription = this.Rapier.RigidBodyDesc.kinematicVelocityBased();

        break;
    }

    if (Description.Position !== undefined) {
      RigidBodyDescription.setTranslation(...Description.Position);
    }

    if (Description.Rotation !== undefined) {
      RigidBodyDescription.setRotation({
        x: Description.Rotation[0],

        y: Description.Rotation[1],

        z: Description.Rotation[2],

        w: Description.Rotation[3],
      });
    }

    return RigidBodyDescription;
  }

  private MigrateRigidBodies(): void {
    for (const [Id, Record] of this.RigidBodies) {
      if (Record.Description.Type === 'Fixed') {
        continue;
      }

      const CurrentRegion = this.Regions.get(Record.RegionId);

      if (CurrentRegion === undefined) {
        continue;
      }

      const RigidBody = CurrentRegion.World.getRigidBody(Record.Handle);

      if (RigidBody == null) {
        continue;
      }

      const Translation = RigidBody.translation();

      const GlobalPosition: [number, number, number] = [
        Translation.x + CurrentRegion.Origin[0],

        Translation.y + CurrentRegion.Origin[1],

        Translation.z + CurrentRegion.Origin[2],
      ];

      const [RegionX, RegionY] = this.GetRegionCoordinates(GlobalPosition);

      const NewRegionId = this.GetRegionId(RegionX, RegionY);

      if (NewRegionId === CurrentRegion.Id) {
        continue;
      }

      this.MigrateRigidBody(Id, GlobalPosition);
    }
  }

  private MigrateRigidBody(
    Id: number,

    GlobalPosition: [number, number, number],
  ): void {
    const Record = this.RigidBodies.get(Id);

    if (Record === undefined) {
      return;
    }

    const CurrentRegion = this.Regions.get(Record.RegionId);

    if (CurrentRegion === undefined) {
      return;
    }

    const CurrentRigidBody = CurrentRegion.World.getRigidBody(Record.Handle);

    if (CurrentRigidBody == null) {
      return;
    }

    const Rotation = CurrentRigidBody.rotation();

    const LinearVelocity = CurrentRigidBody.linvel();

    const AngularVelocity = CurrentRigidBody.angvel();

    const NewRegion = this.GetOrCreateRegion(GlobalPosition);

    if (NewRegion.Id === CurrentRegion.Id) {
      return;
    }

    const NewPosition = this.ToRegionPosition(GlobalPosition, NewRegion);

    const NewRigidBody = NewRegion.World.createRigidBody(
      this.CreateRigidBodyDescription({
        ...Record.Description,

        Position: NewPosition,

        Rotation: [Rotation.x, Rotation.y, Rotation.z, Rotation.w],
      }),
    );

    NewRigidBody.setLinvel(
      {
        x: LinearVelocity.x,

        y: LinearVelocity.y,

        z: LinearVelocity.z,
      },
      true,
    );

    NewRigidBody.setAngvel(
      {
        x: AngularVelocity.x,

        y: AngularVelocity.y,

        z: AngularVelocity.z,
      },
      true,
    );

    const NewColliderHandles = new Map<number, ColliderHandle>();

    try {
      for (const ColliderId of Record.ColliderIds) {
        const ColliderRecord = this.Colliders.get(ColliderId);

        if (ColliderRecord === undefined) {
          continue;
        }

        const NewCollider = NewRegion.World.createCollider(
          this.CreateColliderDescription(ColliderRecord.Description),
          NewRigidBody,
        );

        NewColliderHandles.set(ColliderId, NewCollider.handle);
      }
    } catch (Error) {
      NewRegion.World.removeRigidBody(NewRigidBody);

      throw Error;
    }

    CurrentRegion.World.removeRigidBody(CurrentRigidBody);

    Record.RegionId = NewRegion.Id;

    Record.Handle = NewRigidBody.handle;

    for (const [ColliderId, Handle] of NewColliderHandles) {
      const ColliderRecord = this.Colliders.get(ColliderId);

      if (ColliderRecord === undefined) {
        continue;
      }

      ColliderRecord.RegionHandles.clear();

      ColliderRecord.RegionHandles.set(NewRegion.Id, Handle);
    }

    this.TryRemoveRegion(CurrentRegion.Id);
  }

  @ExportApi()
  ChangeEnablePhysics(IsEnable: boolean): void {
    if (this.Options.IsEnablePhysics === IsEnable) {
      return;
    }

    this.UpdateOptions({
      IsEnablePhysics: IsEnable,
    });

    if (this.Options.IsEnablePhysics) {
      this.StartPhysics();
    } else {
      this.StopPhysics();
    }
  }

  @ExportApi()
  ChangeEnableDebug(IsEnable: boolean): void {
    if (this.Options.IsEnableDebug === IsEnable) {
      return;
    }

    this.UpdateOptions({
      IsEnableDebug: IsEnable,
    });

    if (!IsEnable) {
      const PreviousRegionId = this.DebugRegionId;

      this.DebugRegionId = undefined;

      this.RemoveDebugLayer();

      if (PreviousRegionId !== undefined) {
        this.TryRemoveRegion(PreviousRegionId);
      }

      return;
    }

    if (this.DebugPointerPosition !== undefined) {
      this.UpdateDebugRegionByPointerPosition(
        this.DebugPointerPosition[0],
        this.DebugPointerPosition[1],
      );
    }
  }

  private InitDebugPointerTracking(): void {
    if (this.DebugCanvas !== undefined) {
      return;
    }

    const Canvas = this.DeckGlServiceInstance.DeckGl.getCanvas();

    if (Canvas === null) {
      this.DebugPointerTrackingAnimationFrameId = requestAnimationFrame(() => {
        this.InitDebugPointerTracking();
      });

      return;
    }

    this.DebugPointerTrackingAnimationFrameId = undefined;

    this.DebugCanvas = Canvas;

    Canvas.addEventListener('pointermove', this.HandleDebugPointerMove);

    Canvas.addEventListener('pointerleave', this.HandleDebugPointerLeave);

    Canvas.addEventListener('wheel', this.HandleDebugWheel);
  }

  private DestroyDebugPointerTracking(): void {
    if (this.DebugPointerTrackingAnimationFrameId !== undefined) {
      cancelAnimationFrame(this.DebugPointerTrackingAnimationFrameId);

      this.DebugPointerTrackingAnimationFrameId = undefined;
    }

    if (this.DebugCanvas !== undefined) {
      this.DebugCanvas.removeEventListener('pointermove', this.HandleDebugPointerMove);

      this.DebugCanvas.removeEventListener('pointerleave', this.HandleDebugPointerLeave);

      this.DebugCanvas.removeEventListener('wheel', this.HandleDebugWheel);
    }

    this.DebugCanvas = undefined;

    this.DebugPointerPosition = undefined;

    this.DebugRegionId = undefined;
  }

  private readonly HandleDebugPointerMove = (Event: PointerEvent): void => {
    const Canvas = this.DebugCanvas;

    if (Canvas === undefined) {
      return;
    }

    const Bounds = Canvas.getBoundingClientRect();

    const X = Event.clientX - Bounds.left;

    const Y = Event.clientY - Bounds.top;

    this.DebugPointerPosition = [X, Y];

    if (!this.Options.IsEnableDebug) {
      return;
    }

    this.UpdateDebugRegionByPointerPosition(X, Y);
  };

  private readonly HandleDebugPointerLeave = (): void => {
    this.DebugPointerPosition = undefined;

    const PreviousRegionId = this.DebugRegionId;

    this.DebugRegionId = undefined;

    this.RemoveDebugLayer();

    if (PreviousRegionId !== undefined) {
      this.TryRemoveRegion(PreviousRegionId);
    }
  };

  private readonly HandleDebugWheel = (): void => {
    if (!this.Options.IsEnableDebug || this.DebugPointerPosition === undefined) {
      return;
    }

    requestAnimationFrame(() => {
      if (this.DebugPointerPosition === undefined || !this.Options.IsEnableDebug) {
        return;
      }

      this.UpdateDebugRegionByPointerPosition(
        this.DebugPointerPosition[0],
        this.DebugPointerPosition[1],
      );
    });
  };

  private UpdateDebugRegionByPointerPosition(
    X: number,

    Y: number,
  ): void {
    const PickInfo = this.DeckGlServiceInstance.DeckGl.pickObject({
      x: X,
      y: Y,

      layerIds: ['TerrainPhysicsLayer'],

      unproject3D: true,
    });

    if (PickInfo === null || !PickInfo.picked || PickInfo.coordinate === undefined) {
      this.ClearDebugRegion();

      return;
    }

    const Coordinate = PickInfo.coordinate;

    const Viewport = PickInfo.viewport ?? this.DeckGlServiceInstance.DeckGl.getViewports()[0];

    if (Viewport === undefined) {
      this.ClearDebugRegion();

      return;
    }

    /*
     * То же преобразование, которое
     * используется TerrainPhysicsLayer:
     *
     * lng/lat
     *   -> WebMercator common coordinates
     *   -> physics meters.
     */
    const [OriginX, OriginY] = Viewport.projectFlat([
      this.Options.CoordinateOrigin[0],

      this.Options.CoordinateOrigin[1],
    ]);

    const [PositionX, PositionY] = Viewport.projectFlat([Coordinate[0], Coordinate[1]]);

    const { metersPerUnit } = Viewport.getDistanceScales(this.Options.CoordinateOrigin);

    const PhysicsPosition: [number, number, number] = [
      (PositionX - OriginX) * metersPerUnit[0],

      (PositionY - OriginY) * metersPerUnit[1],

      (Coordinate[2] ?? 0) - this.Options.CoordinateOrigin[2],
    ];

    const [RegionX, RegionY] = this.GetRegionCoordinates(PhysicsPosition);

    const RegionId = this.GetRegionId(RegionX, RegionY);

    if (this.DebugRegionId === RegionId) {
      return;
    }

    const PreviousRegionId = this.DebugRegionId;

    this.DebugRegionId = RegionId;

    this.GetOrCreateRegionByCoordinates(RegionX, RegionY);

    if (PreviousRegionId !== undefined) {
      this.TryRemoveRegion(PreviousRegionId);
    }

    this.UpdateDebugLayer();
  }

  private ClearDebugRegion(): void {
    const PreviousRegionId = this.DebugRegionId;

    this.DebugRegionId = undefined;

    this.RemoveDebugLayer();

    if (PreviousRegionId !== undefined) {
      this.TryRemoveRegion(PreviousRegionId);
    }
  }

  /*
   * Rapier хранит координаты региона
   * локально.
   *
   * Здесь сначала возвращаем их в
   * глобальные physics meters,
   * затем выполняем ТОЧНО обратное
   * преобразование тому, которое
   * используется TerrainPhysicsLayer.
   *
   * physics meters
   *   -> WebMercator common coordinates
   *   -> lng/lat.
   */
  private GenerateDebugLines(Region: PhysicsRegion): PhysicsDebugLine[] {
    const Viewport = this.DeckGlServiceInstance.DeckGl.getViewports()[0];

    if (Viewport === undefined) {
      return [];
    }

    const [OriginX, OriginY] = Viewport.projectFlat([
      this.Options.CoordinateOrigin[0],

      this.Options.CoordinateOrigin[1],
    ]);

    const { metersPerUnit } = Viewport.getDistanceScales(this.Options.CoordinateOrigin);

    const DebugBuffers = Region.World.debugRender();

    const Lines: PhysicsDebugLine[] = [];

    const ToLngLat = (
      X: number,

      Y: number,

      Z: number,
    ): [number, number, number] => {
      const ProjectedX = OriginX + X / metersPerUnit[0];

      const ProjectedY = OriginY + Y / metersPerUnit[1];

      const [Longitude, Latitude] = Viewport.unprojectFlat([ProjectedX, ProjectedY]);

      return [Longitude, Latitude, Z + this.Options.CoordinateOrigin[2]];
    };

    for (let Index = 0; Index < DebugBuffers.vertices.length; Index += 6) {
      const LineIndex = Index / 6;

      const ColorIndex = LineIndex * 8;

      const Source = ToLngLat(
        DebugBuffers.vertices[Index] + Region.Origin[0],

        DebugBuffers.vertices[Index + 1] + Region.Origin[1],

        DebugBuffers.vertices[Index + 2] + Region.Origin[2],
      );

      const Target = ToLngLat(
        DebugBuffers.vertices[Index + 3] + Region.Origin[0],

        DebugBuffers.vertices[Index + 4] + Region.Origin[1],

        DebugBuffers.vertices[Index + 5] + Region.Origin[2],
      );

      Lines.push({
        Source,

        Target,

        Color: [
          DebugBuffers.colors[ColorIndex] * 255,

          DebugBuffers.colors[ColorIndex + 1] * 255,

          DebugBuffers.colors[ColorIndex + 2] * 255,

          DebugBuffers.colors[ColorIndex + 3] * 255,
        ],
      });
    }

    return Lines;
  }

  private UpdateDebugLayer(): void {
    if (!this.Options.IsEnableDebug || this.DebugRegionId === undefined) {
      this.RemoveDebugLayer();

      return;
    }

    const Region = this.Regions.get(this.DebugRegionId);

    if (Region === undefined) {
      this.RemoveDebugLayer();

      return;
    }

    const Layer = new PhysicsDebugLayer({
      data: this.GenerateDebugLines(Region),
    });

    if (this.IsDebugLayerAdded) {
      this.UpdateLayer(Layer);
    } else {
      this.AddLayer(Layer);

      this.IsDebugLayerAdded = true;
    }
  }

  private RemoveDebugLayer(): void {
    if (!this.IsDebugLayerAdded) {
      return;
    }

    this.RemoveLayer('PhysicsDebugLayer');

    this.IsDebugLayerAdded = false;
  }

  StartPhysics(): void {
    if (this.PhysicsAnimationFrameId !== undefined) {
      return;
    }

    this.LastPhysicsTime = performance.now();

    this.PhysicsAccumulator = 0;

    const Step = (CurrentTime: number) => {
      const DeltaTime = (CurrentTime - this.LastPhysicsTime) / 1000;

      this.LastPhysicsTime = CurrentTime;

      this.PhysicsAccumulator += DeltaTime;

      let Steps = 0;

      while (this.PhysicsAccumulator >= this.PhysicsTimeStep && Steps < this.MaxStepsPerFrame) {
        for (const Region of this.Regions.values()) {
          Region.World.step();
        }

        this.MigrateRigidBodies();

        this.PhysicsAccumulator -= this.PhysicsTimeStep;

        Steps++;
      }

      if (Steps === this.MaxStepsPerFrame) {
        this.PhysicsAccumulator %= this.PhysicsTimeStep;
      }

      if (this.Options.IsEnableDebug && this.DebugRegionId !== undefined) {
        this.UpdateDebugLayer();
      }

      this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
    };

    this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
  }

  StopPhysics(): void {
    if (this.PhysicsAnimationFrameId === undefined) {
      return;
    }

    cancelAnimationFrame(this.PhysicsAnimationFrameId);

    this.PhysicsAnimationFrameId = undefined;
  }

  private DestroyPhysics(): void {
    this.StopPhysics();

    this.DestroyDebugPointerTracking();

    this.RemoveDebugLayer();

    for (const Region of this.Regions.values()) {
      Region.World.free();
    }

    this.Regions.clear();

    this.RigidBodies.clear();

    this.Colliders.clear();

    this.NextRigidBodyId = 1;

    this.NextColliderId = 1;
  }
}

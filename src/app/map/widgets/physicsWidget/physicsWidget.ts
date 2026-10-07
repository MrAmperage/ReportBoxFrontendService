import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef } from '@angular/core';

import type {
  ColliderDesc,
  ColliderHandle,
  RigidBodyDesc,
  RigidBodyHandle,
} from '@dimforge/rapier3d-compat';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import BaseWidget from '../baseWidget/baseWidget';
import ExportApi from '../baseWidget/ExportApiDecorator';
import PhysicsDebugLayer from './layers/physicsDebugLayer/physicsDebugLayer';
import {
  PhysicsColliderDescription,
  PhysicsRigidBodyDescription,
  PhysicsWidgetOptions,
} from './physicsWidgetTypes';
import DeckGlService from '../../deckglService/deckglService';
import type { PhysicsRegion } from './physicsRegion';

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
    IsEnableDebug: false,
    IsEnablePhysics: true,
    CoordinateOrigin: [0, 0, 0],
  };

  private readonly Regions = new Map<string, PhysicsRegion>();
  private readonly RigidBodies = new Map<
    number,
    {
      RegionId: string;
      Handle: RigidBodyHandle;
      Description: PhysicsRigidBodyDescription;
      ColliderIds: Set<number>;
    }
  >();

  private readonly Colliders = new Map<
    number,
    {
      RegionId: string;
      Handle: ColliderHandle;
      Description: PhysicsColliderDescription;
      ParentId?: number;
    }
  >();

  private readonly RegionSize = 10_000;
  private readonly MaxStepsPerFrame = 5;
  private readonly PhysicsTimeStep = 1 / 60;
  private NextRigidBodyId = 1;
  private NextColliderId = 1;
  private LastPhysicsTime = performance.now();
  private PhysicsAccumulator = 0;
  private PhysicsAnimationFrameId: number | undefined = undefined;
  private Rapier!: typeof import('@dimforge/rapier3d-compat');
  override InitWidget(): void {
    this.InitPhysics().then(() => {
      super.InitWidget();
    });
  }
  private async InitPhysics(): Promise<void> {
    this.Rapier = await import('@dimforge/rapier3d-compat');
    await this.Rapier.init();
    const InitViewState = this.DeckGlServiceInstance.DeckGl.props.initialViewState;
    if (InitViewState !== null) {
      this.Options.CoordinateOrigin = [InitViewState.longitude, InitViewState.latitude, 0];
    }
    if (this.Options.IsEnableDebug) {
      this.CreateDebugLayer();
    }
    if (this.Options.IsEnablePhysics) {
      this.StartPhysics();
    }
  }

  override DestroyWidget(): void {
    this.DestroyPhysics();
    super.DestroyWidget();
  }

  private GetRegionCoordinates(Position: [number, number, number]): [number, number] {
    return [Math.floor(Position[0] / this.RegionSize), Math.floor(Position[1] / this.RegionSize)];
  }

  private GetRegionId(X: number, Y: number): string {
    return `${X}:${Y}`;
  }

  private GetOrCreateRegion(Position: [number, number, number]): PhysicsRegion {
    const [X, Y] = this.GetRegionCoordinates(Position);
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
    return Region;
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

  private GetTrimeshCenter(Vertices: Float32Array): [number, number, number] {
    if (Vertices.length < 3) {
      throw new Error('Невозможно создать Trimesh: отсутствуют вершины');
    }

    let MinX = Infinity;
    let MinY = Infinity;
    let MinZ = Infinity;
    let MaxX = -Infinity;
    let MaxY = -Infinity;
    let MaxZ = -Infinity;

    for (let Index = 0; Index < Vertices.length; Index += 3) {
      const X = Vertices[Index];
      const Y = Vertices[Index + 1];
      const Z = Vertices[Index + 2];
      MinX = Math.min(MinX, X);
      MinY = Math.min(MinY, Y);
      MinZ = Math.min(MinZ, Z);
      MaxX = Math.max(MaxX, X);
      MaxY = Math.max(MaxY, Y);
      MaxZ = Math.max(MaxZ, Z);
    }

    return [(MinX + MaxX) / 2, (MinY + MaxY) / 2, (MinZ + MaxZ) / 2];
  }

  private GetColliderGlobalPosition(
    Description: PhysicsColliderDescription,
  ): [number, number, number] {
    if (Description.Position !== undefined) {
      return Description.Position;
    }

    if (Description.Type === 'Trimesh') {
      return this.GetTrimeshCenter(Description.Vertices);
    }

    return [0, 0, 0];
  }

  private ConvertTrimeshVerticesToRegion(
    Vertices: Float32Array,
    Region: PhysicsRegion,
  ): Float32Array {
    const RegionVertices = new Float32Array(Vertices.length);
    for (let Index = 0; Index < Vertices.length; Index += 3) {
      RegionVertices[Index] = Vertices[Index] - Region.Origin[0];
      RegionVertices[Index + 1] = Vertices[Index + 1] - Region.Origin[1];
      RegionVertices[Index + 2] = Vertices[Index + 2] - Region.Origin[2];
    }
    return RegionVertices;
  }

  private PrepareColliderDescription(
    Description: PhysicsColliderDescription,
    Region: PhysicsRegion,
  ): PhysicsColliderDescription {
    if (Description.Type === 'Trimesh') {
      if (Description.Position !== undefined) {
        return {
          ...Description,
          Position: this.ToRegionPosition(Description.Position, Region),
        };
      }
      return {
        ...Description,
        Vertices: this.ConvertTrimeshVerticesToRegion(Description.Vertices, Region),
      };
    }
    const GlobalPosition: [number, number, number] = Description.Position ?? [0, 0, 0];
    return {
      ...Description,
      Position: this.ToRegionPosition(GlobalPosition, Region),
    };
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
        RegionId: Region.Id,
        Handle: Collider.handle,
        Description: {
          ...Description,
        },
        ParentId,
      });
      ParentRecord.ColliderIds.add(Id);
      return Id;
    }

    const GlobalPosition = this.GetColliderGlobalPosition(Description);
    const Region = this.GetOrCreateRegion(GlobalPosition);
    const RegionDescription = this.PrepareColliderDescription(Description, Region);
    const Collider = Region.World.createCollider(this.CreateColliderDescription(RegionDescription));
    const Id = this.NextColliderId++;
    this.Colliders.set(Id, {
      RegionId: Region.Id,
      Handle: Collider.handle,
      Description: {
        ...Description,
      },
    });
    return Id;
  }

  @ExportApi()
  RemoveCollider(Id: number): void {
    const Record = this.Colliders.get(Id);
    if (Record === undefined) {
      return;
    }
    const Region = this.Regions.get(Record.RegionId);
    if (Region !== undefined) {
      const Collider = Region.World.getCollider(Record.Handle);
      if (Collider != null) {
        Region.World.removeCollider(Collider, true);
      }
    }
    if (Record.ParentId !== undefined) {
      this.RigidBodies.get(Record.ParentId)?.ColliderIds.delete(Id);
    }
    this.Colliders.delete(Id);
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
  AddModelCollider(Model: Object3D, ParentId?: number): number {
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
      ColliderRecord.RegionId = NewRegion.Id;
      ColliderRecord.Handle = Handle;
    }
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
    if (this.Options.IsEnableDebug) {
      this.CreateDebugLayer();
    } else {
      this.RemoveLayer('PhysicsDebugLayer');
    }
  }
  private CreateDebugLayer(): void {
    this.AddLayer(new PhysicsDebugLayer(this.Regions.values(), this.Options.CoordinateOrigin));
  }
  private UpdateDebugLayer(): void {
    this.UpdateLayer(new PhysicsDebugLayer(this.Regions.values(), this.Options.CoordinateOrigin));
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
    this.RemoveLayer('PhysicsDebugLayer');
    for (const Region of this.Regions.values()) {
      Region.World.free();
    }
    this.Regions.clear();
    this.RigidBodies.clear();
    this.Colliders.clear();
    this.NextRigidBodyId = 1;
    this.NextColliderId = 1;
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
      if (this.Options.IsEnableDebug) {
        this.UpdateDebugLayer();
      }
      this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
    };
    this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
  }
}

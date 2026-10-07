import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef } from '@angular/core';
import type { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import BaseWidget from '../baseWidget/baseWidget';
import ExportApi from '../baseWidget/ExportApiDecorator';
import PhysicsDebugLayer from './layers/physicsDebugLayer/physicsDebugLayer';
import {
  PhysicsColliderDescription,
  PhysicsColliderId,
  PhysicsModelRigidBody,
  PhysicsRigidBodyDescription,
  PhysicsRigidBodyId,
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
  private readonly RegionSize = 10_000;
  private readonly MaxStepsPerFrame = 5;
  private readonly PhysicsTimeStep = 1 / 60;
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

    const GlobalPosition = Description.Position ?? [0, 0, 0];

    return {
      ...Description,

      Position: this.ToRegionPosition(GlobalPosition, Region),
    };
  }

  @ExportApi()
  AddRigidBody(Description: PhysicsRigidBodyDescription): PhysicsRigidBodyId {
    const GlobalPosition: [number, number, number] = Description.Position ?? [0, 0, 0];
    const Region = this.GetOrCreateRegion(GlobalPosition);
    const RegionPosition = this.ToRegionPosition(GlobalPosition, Region);
    const RigidBody = Region.World.createRigidBody(
      this.CreateRigidBodyDescription({
        ...Description,

        Position: RegionPosition,
      }),
    );

    return {
      RegionId: Region.Id,
      Handle: RigidBody.handle,
    };
  }

  @ExportApi()
  RemoveRigidBody(Id: PhysicsRigidBodyId): void {
    const Region = this.Regions.get(Id.RegionId);

    if (Region === undefined) {
      return;
    }
    const RigidBody = Region.World.getRigidBody(Id.Handle);
    if (RigidBody == null) {
      return;
    }
    Region.World.removeRigidBody(RigidBody);
  }

  @ExportApi()
  AddCollider(
    Description: PhysicsColliderDescription,
    ParentId?: PhysicsRigidBodyId,
  ): PhysicsColliderId {
    if (ParentId !== undefined) {
      const Region = this.Regions.get(ParentId.RegionId);
      if (Region === undefined) {
        throw new Error(`PhysicsRegion ${ParentId.RegionId} не найден`);
      }
      const Parent = Region.World.getRigidBody(ParentId.Handle);
      if (Parent == null) {
        throw new Error(`RigidBody ${ParentId.Handle} не найден в регионе ${ParentId.RegionId}`);
      }
      const Collider = Region.World.createCollider(
        this.CreateColliderDescription(Description),
        Parent,
      );

      return {
        RegionId: Region.Id,
        Handle: Collider.handle,
      };
    }

    const GlobalPosition = this.GetColliderGlobalPosition(Description);
    const Region = this.GetOrCreateRegion(GlobalPosition);
    const RegionDescription = this.PrepareColliderDescription(Description, Region);
    const Collider = Region.World.createCollider(this.CreateColliderDescription(RegionDescription));

    return {
      RegionId: Region.Id,
      Handle: Collider.handle,
    };
  }

  @ExportApi()
  RemoveCollider(Id: PhysicsColliderId): void {
    const Region = this.Regions.get(Id.RegionId);
    if (Region === undefined) {
      return;
    }
    const Collider = Region.World.getCollider(Id.Handle);
    if (Collider == null) {
      return;
    }
    Region.World.removeCollider(Collider, true);
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
  AddModelCollider(Model: Object3D, ParentId?: PhysicsRigidBodyId): PhysicsColliderId {
    const Description = this.CreateBoxColliderDescription(Model);
    return this.AddCollider(Description, ParentId);
  }

  @ExportApi()
  AddModelRigidBody(
    Model: Object3D,
    Type: PhysicsRigidBodyDescription['Type'] = 'Dynamic',
  ): PhysicsModelRigidBody {
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

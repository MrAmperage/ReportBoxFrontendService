import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef } from '@angular/core';

import type {
  ColliderDesc,
  ColliderHandle,
  RigidBodyDesc,
  RigidBodyHandle,
  World,
} from '@dimforge/rapier3d-compat';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import BaseWidget from '../baseWidget/baseWidget';
import ExportApi from '../baseWidget/ExportApiDecorator';
import PhysicsDebugLayer from './layers/physicsDebugLayer/physicsDebugLayer';

import {
  PhysicsColliderDescription,
  PhysicsModelRigidBody,
  PhysicsRigidBodyDescription,
  PhysicsWidgetOptions,
} from './physicsWidgetTypes';
import DeckGlService from '../../deckglService/deckglService';
import { PhysicsRegion } from './physicsRegion';

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
  private readonly RegionSize = 10000;
  private readonly MaxStepsPerFrame = 5;
  private readonly PhysicsTimeStep = 1 / 60;
  private LastPhysicsTime = performance.now();
  private PhysicsAccumulator = 0;
  private PhysicsAnimationFrameId: number | undefined = undefined;
  private World!: World;
  private Rapier!: typeof import('@dimforge/rapier3d-compat');
  override InitWidget(): void {
    this.InitPhysics().then(() => {
      super.InitWidget();
    });
  }

  async InitPhysics(): Promise<void> {
    this.Rapier = await import('@dimforge/rapier3d-compat');
    await this.Rapier.init();
    const InitViewState = this.DeckGlServiceInstance.DeckGl.props.initialViewState;

    if (InitViewState !== null) {
      this.Options.CoordinateOrigin = [InitViewState.longitude, InitViewState.latitude, 0];
    }
    if (this.Options.IsEnableDebug) {
      this.AddLayer(new PhysicsDebugLayer(this.World, this.Options.CoordinateOrigin));
    }

    if (this.Options.IsEnablePhysics) {
      this.StartPhysics();
    }
  }

  override DestroyWidget(): void {
    this.DestroyPhysics();
    super.DestroyWidget();
  }

  @ExportApi()
  AddCollider(Description: PhysicsColliderDescription, ParentId?: RigidBodyHandle): ColliderHandle {
    const Parent = ParentId === undefined ? undefined : this.World.getRigidBody(ParentId);

    if (ParentId !== undefined && Parent == null) {
      throw new Error(`RigidBody ${ParentId} не найден`);
    }

    const Collider = this.World.createCollider(
      this.CreateColliderDescription(Description),
      Parent ?? undefined,
    );

    return Collider.handle;
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
  @ExportApi()
  RemoveCollider(Id: ColliderHandle): void {
    const Collider = this.World.getCollider(Id);
    if (Collider == null) {
      return;
    }

    this.World.removeCollider(Collider, true);
  }

  @ExportApi()
  ChangeEnablePhysics(IsEnable: boolean) {
    this.UpdateOptions({ IsEnablePhysics: IsEnable });
    if (this.Options.IsEnablePhysics) {
      this.StartPhysics();
    } else {
      this.StopPhysics();
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
  @ExportApi()
  AddRigidBody(Description: PhysicsRigidBodyDescription): RigidBodyHandle {
    const RigidBody = this.World.createRigidBody(this.CreateRigidBodyDescription(Description));
    return RigidBody.handle;
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
  AddModelCollider(Model: Object3D, ParentId?: RigidBodyHandle): ColliderHandle {
    const Description = this.CreateBoxColliderDescription(Model);
    return this.AddCollider(Description, ParentId);
  }

  @ExportApi()
  RemoveRigidBody(Id: RigidBodyHandle): void {
    const RigidBody = this.World.getRigidBody(Id);
    if (RigidBody == null) {
      return;
    }
    this.World.removeRigidBody(RigidBody);
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
      this.AddLayer(new PhysicsDebugLayer(this.World, this.Options.CoordinateOrigin));
    } else {
      this.RemoveLayer('PhysicsDebugLayer');
    }
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
  StopPhysics(): void {
    if (this.PhysicsAnimationFrameId === undefined) {
      return;
    }

    cancelAnimationFrame(this.PhysicsAnimationFrameId);

    this.PhysicsAnimationFrameId = undefined;
  }

  DestroyPhysics(): void {
    this.StopPhysics();

    this.RemoveLayer('PhysicsDebugLayer');

    this.World.free();
  }

  StartPhysics(): void {
    if (this.PhysicsAnimationFrameId !== undefined) {
      return;
    }
    this.World.timestep = this.PhysicsTimeStep;
    this.LastPhysicsTime = performance.now();
    this.PhysicsAccumulator = 0;
    const Step = (CurrentTime: number) => {
      const DeltaTime = (CurrentTime - this.LastPhysicsTime) / 1000;
      this.LastPhysicsTime = CurrentTime;
      this.PhysicsAccumulator += DeltaTime;
      let Steps = 0;
      while (this.PhysicsAccumulator >= this.PhysicsTimeStep && Steps < this.MaxStepsPerFrame) {
        this.World.step();
        this.PhysicsAccumulator -= this.PhysicsTimeStep;
        Steps++;
      }
      if (Steps === this.MaxStepsPerFrame) {
        this.PhysicsAccumulator %= this.PhysicsTimeStep;
      }
      if (this.Options.IsEnableDebug) {
        this.UpdateLayer(new PhysicsDebugLayer(this.World, this.Options.CoordinateOrigin));
      }

      this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
    };
    this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
  }
}

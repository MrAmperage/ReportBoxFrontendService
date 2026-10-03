import { ChangeDetectionStrategy, Component } from '@angular/core';

import type {
  ColliderDesc,
  ColliderHandle,
  RigidBodyDesc,
  RigidBodyHandle,
  World,
} from '@dimforge/rapier3d-compat';

import BaseWidget from '../baseWidget/baseWidget';
import ExportApi from '../baseWidget/ExportApiDecorator';
import PhysicsDebugLayer from './layers/physicsDebugLayer/physicsDebugLayer';

import {
  PhysicsColliderDescription,
  PhysicsRigidBodyDescription,
  PhysicsWidgetOptions,
} from './physicsWidgetTypes';

@Component({
  selector: 'PhysicsWidget',
  templateUrl: './physicsWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PhysicsWidget extends BaseWidget<PhysicsWidgetOptions> {
  Options = {
    Id: 'PhysicsWidget',
    IsEnablePhysics: true,
  };
  private readonly MaxStepsPerFrame = 5;
  private readonly PhysicsTimeStep = 1 / 60;
  private LastPhysicsTime = performance.now();
  private PhysicsAccumulator = 0;
  private PhysicsAnimationFrameId: number | undefined = undefined;
  private World!: World;
  private Rapier!: typeof import('@dimforge/rapier3d-compat');
  override InitWidget(): void {
    this.InitPhysics();
    super.InitWidget();
  }

  async InitPhysics(): Promise<void> {
    this.Rapier = await import('@dimforge/rapier3d-compat');

    await this.Rapier.init();

    this.World = new this.Rapier.World({
      x: 0,
      y: 0,
      z: -9.81,
    });

    this.AddLayer(new PhysicsDebugLayer(this.World, [0, 0, 0]));

    this.StartPhysics();
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

  @ExportApi()
  RemoveCollider(Id: ColliderHandle): void {
    const Collider = this.World.getCollider(Id);
    if (Collider == null) {
      return;
    }

    this.World.removeCollider(Collider, true);
  }

  @ExportApi()
  AddRigidBody(Description: PhysicsRigidBodyDescription): RigidBodyHandle {
    const RigidBody = this.World.createRigidBody(this.CreateRigidBodyDescription(Description));
    return RigidBody.handle;
  }

  @ExportApi()
  RemoveRigidBody(Id: RigidBodyHandle): void {
    const RigidBody = this.World.getRigidBody(Id);
    if (RigidBody == null) {
      return;
    }
    this.World.removeRigidBody(RigidBody);
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

    return RigidBodyDescription;
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
      this.UpdateLayer(new PhysicsDebugLayer(this.World, [0, 0, 0]));
      this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
    };
    this.PhysicsAnimationFrameId = requestAnimationFrame(Step);
  }
}

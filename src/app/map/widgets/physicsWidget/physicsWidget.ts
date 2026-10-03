import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { PhysicsWidgetOptions } from './physicsWidgetTypes';
import { Collider, ColliderDesc, RigidBody, World } from '@dimforge/rapier3d-compat';
import ExportApi from '../baseWidget/ExportApiDecorator';

@Component({
  selector: 'PhysicsWidget',
  templateUrl: './physicsWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PhysicsWidget extends BaseWidget<PhysicsWidgetOptions> {
  Options = {
    Id: 'PhysicsWidget',
  };
  World!: World;
  override InitWidget() {
    super.InitWidget();
    this.InitPhysics();
  }

  async InitPhysics() {
    const Rapier = await import('@dimforge/rapier3d-compat');
    await Rapier.init();
    this.World = new Rapier.World({
      x: 0,
      y: 0,
      z: -9.81,
    });
  }

  override DestroyWidget(): void {
    this.DestroyPhysics();
    super.DestroyWidget();
  }
  @ExportApi()
  AddCollider(ColliderDescription: ColliderDesc, Parent?: RigidBody): Collider {
    return this.World.createCollider(ColliderDescription, Parent);
  }

  @ExportApi()
  RemoveCollider(Collider: Collider, WakeUp: boolean = true) {
    this.World.removeCollider(Collider, WakeUp);
  }
  DestroyPhysics() {
    this.World.free();
  }
}

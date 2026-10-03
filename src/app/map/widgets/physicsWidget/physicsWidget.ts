import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { PhysicsWidgetOptions } from './physicsWidgetTypes';
import { init, World } from '@dimforge/rapier3d-compat';

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
  override InitWidget(): void {
    init().then(() => {
      this.World = new World({
        x: 0,
        y: 0,
        z: -9.81,
      });
      super.InitWidget();
    });
  }
}

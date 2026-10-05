import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { TerrainWidgetOptions } from './terrainWidgetTypes';
import TerrainPhysicsLayer from './Layers/TerrainPhysicsLayer/TerrainPhysicsLayer';

@Component({
  selector: 'TerrainWidget',
  templateUrl: './terrainWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TerrainWidget extends BaseWidget<TerrainWidgetOptions> {
  override Options: TerrainWidgetOptions = { Id: 'TerrainWidget' };

  override InitWidget(): void {
    this.AddLayer(new TerrainPhysicsLayer());
    super.InitWidget();
  }
}

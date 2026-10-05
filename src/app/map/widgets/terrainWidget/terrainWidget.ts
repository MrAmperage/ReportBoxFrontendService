import { ChangeDetectionStrategy, Component } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { TerrainWidgetOptions } from './terrainWidgetTypes';

@Component({
  selector: 'TerrainWidget',
  templateUrl: './terrainWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TerrainWidget extends BaseWidget<TerrainWidgetOptions> {
  override Options: TerrainWidgetOptions = { Id: 'TerrainWidget' };
}

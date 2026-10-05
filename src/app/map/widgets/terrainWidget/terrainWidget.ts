import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef } from '@angular/core';
import BaseWidget from '../baseWidget/baseWidget';
import { TerrainWidgetOptions } from './terrainWidgetTypes';
import TerrainPhysicsLayer from './Layers/TerrainPhysicsLayer/TerrainPhysicsLayer';
import { PhysicsWidgetKey, PhysicsWidgetOptions } from '../physicsWidget/physicsWidgetTypes';
import DeckGlService from '../../deckglService/deckglService';

@Component({
  selector: 'TerrainWidget',
  templateUrl: './terrainWidget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TerrainWidget extends BaseWidget<TerrainWidgetOptions> {
  constructor(
    private DeckGlServiceInstance: DeckGlService,
    private ElementRefInstance: ElementRef<HTMLDivElement>,
    private ChangeDetectorRefInstance: ChangeDetectorRef,
  ) {
    super(DeckGlServiceInstance, ElementRefInstance, ChangeDetectorRefInstance);
  }
  override Options: TerrainWidgetOptions = { Id: 'TerrainWidget' };

  override InitWidget(): void {
    super.InitWidget();
    const PhysicsWidgetOptions = this.DeckGlServiceInstance.GetOptions(PhysicsWidgetKey);
    if (PhysicsWidgetOptions !== undefined) {
      const PhysicsWidgetApi = PhysicsWidgetOptions.Api;
      this.AddLayer(new TerrainPhysicsLayer(PhysicsWidgetApi));
    }
  }
}

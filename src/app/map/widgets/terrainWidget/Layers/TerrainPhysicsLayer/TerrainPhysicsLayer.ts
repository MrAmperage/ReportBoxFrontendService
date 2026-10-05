import { TerrainLayer } from 'deck.gl';
import { PhysicsWidgetApi } from '../../../physicsWidget/physicsWidgetTypes';

export default class TerrainPhysicsLayer extends TerrainLayer {
  constructor(PhysicsWidgetApi: PhysicsWidgetApi) {
    console.log(PhysicsWidgetApi);
    super({
      id: 'TerrainPhysicsLayer',
      elevationData: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
      texture: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      material: true,
      elevationDecoder: {
        rScaler: 256,
        gScaler: 1,
        bScaler: 1 / 256,
        offset: -32768,
      },
    });
  }
}

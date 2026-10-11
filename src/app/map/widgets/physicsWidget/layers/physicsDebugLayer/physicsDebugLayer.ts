import { LineLayer, type LineLayerProps } from 'deck.gl';

import type { PhysicsDebugLine } from './physicsDebugLayerTypes';

export default class PhysicsDebugLayer extends LineLayer<PhysicsDebugLine> {
  constructor(Props: Pick<LineLayerProps<PhysicsDebugLine>, 'data' | 'coordinateOrigin'>) {
    super({
      id: 'PhysicsDebugLayer',
      ...Props,
      coordinateSystem: 'meter-offsets',
      getSourcePosition: (Line) => Line.Source,
      getTargetPosition: (Line) => Line.Target,
      getColor: (Line) => Line.Color,
      getWidth: 1,
      widthUnits: 'pixels',
      pickable: false,
    });
  }
}

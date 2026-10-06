import type { DebugRenderBuffers, World } from '@dimforge/rapier3d-compat';
import { LineLayer, LineLayerProps } from 'deck.gl';
import { PhysicsDebugLine } from './physicsDebugLayerTypes';
import { ClipExtension, type ClipExtensionProps } from '@deck.gl/extensions';

export default class PhysicsDebugLayer extends LineLayer<PhysicsDebugLine> {
  constructor(World: World, CoordinateOrigin: [number, number, number]) {
    const DebugBuffers = World.debugRender();
    super({
      id: 'PhysicsDebugLayer',
      data: PhysicsDebugLayer.GenerateLines(DebugBuffers),
      coordinateSystem: 'meter-offsets',
      coordinateOrigin: CoordinateOrigin,
      getSourcePosition: (Line) => Line.Source,
      getTargetPosition: (Line) => Line.Target,
      getColor: (Line) => Line.Color,
      getWidth: 1,
      widthUnits: 'pixels',
      pickable: false,
      extensions: [new ClipExtension()],
      clipBounds: [-15000, -12000, 15000, 12000],
    } as LineLayerProps<PhysicsDebugLine> & ClipExtensionProps);
  }

  static GenerateLines(DebugBuffers: DebugRenderBuffers): PhysicsDebugLine[] {
    const Lines: PhysicsDebugLine[] = [];
    for (let Index = 0; Index < DebugBuffers.vertices.length; Index += 6) {
      const LineIndex = Index / 6;
      const ColorIndex = LineIndex * 8;
      Lines.push({
        Source: [
          DebugBuffers.vertices[Index],
          DebugBuffers.vertices[Index + 1],
          DebugBuffers.vertices[Index + 2],
        ],
        Target: [
          DebugBuffers.vertices[Index + 3],
          DebugBuffers.vertices[Index + 4],
          DebugBuffers.vertices[Index + 5],
        ],
        Color: [
          DebugBuffers.colors[ColorIndex] * 255,
          DebugBuffers.colors[ColorIndex + 1] * 255,
          DebugBuffers.colors[ColorIndex + 2] * 255,
          DebugBuffers.colors[ColorIndex + 3] * 255,
        ],
      });
    }

    return Lines;
  }
}

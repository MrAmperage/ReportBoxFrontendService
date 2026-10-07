import type { DebugRenderBuffers } from '@dimforge/rapier3d-compat';
import { LineLayer } from 'deck.gl';
import { PhysicsDebugLine } from './physicsDebugLayerTypes';
import type { PhysicsRegion } from '../../physicsRegion';
export default class PhysicsDebugLayer extends LineLayer<PhysicsDebugLine> {
  constructor(Regions: Iterable<PhysicsRegion>, CoordinateOrigin: [number, number, number]) {
    const Lines: PhysicsDebugLine[] = [];
    for (const Region of Regions) {
      const DebugBuffers = Region.World.debugRender();
      Lines.push(...PhysicsDebugLayer.GenerateLines(DebugBuffers, Region.Origin));
    }
    super({
      id: 'PhysicsDebugLayer',
      data: Lines,
      coordinateSystem: 'meter-offsets',
      coordinateOrigin: CoordinateOrigin,
      getSourcePosition: (Line) => Line.Source,
      getTargetPosition: (Line) => Line.Target,
      getColor: (Line) => Line.Color,
      getWidth: 1,
      widthUnits: 'pixels',
      pickable: false,
    });
  }
  static GenerateLines(
    DebugBuffers: DebugRenderBuffers,
    Offset: [number, number, number],
  ): PhysicsDebugLine[] {
    const Lines: PhysicsDebugLine[] = [];
    for (let Index = 0; Index < DebugBuffers.vertices.length; Index += 6) {
      const LineIndex = Index / 6;
      const ColorIndex = LineIndex * 8;
      Lines.push({
        Source: [
          DebugBuffers.vertices[Index] + Offset[0],
          DebugBuffers.vertices[Index + 1] + Offset[1],
          DebugBuffers.vertices[Index + 2] + Offset[2],
        ],
        Target: [
          DebugBuffers.vertices[Index + 3] + Offset[0],
          DebugBuffers.vertices[Index + 4] + Offset[1],
          DebugBuffers.vertices[Index + 5] + Offset[2],
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

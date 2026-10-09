import { TerrainLayer } from 'deck.gl';
import type { PhysicsWidgetApi } from '../../../physicsWidget/physicsWidgetTypes';
import type { Mesh } from '@loaders.gl/schema';

export default class TerrainPhysicsLayer extends TerrainLayer {
  private readonly TerrainColliders = new Map<string, number>();
  private readonly PhysicsWidgetApi: PhysicsWidgetApi;
  private readonly CoordinateOrigin: [number, number, number];
  constructor(PhysicsWidgetApi: PhysicsWidgetApi, CoordinateOrigin: [number, number, number]) {
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
      loadOptions: {
        terrain: {
          skirtHeight: 0,
        },
      },
    });
    this.PhysicsWidgetApi = PhysicsWidgetApi;
    this.CoordinateOrigin = CoordinateOrigin;
  }

  private AddTerrainCollider(TileId: string, Vertices: Float32Array, Indices: Uint32Array): void {
    if (this.TerrainColliders.has(TileId)) {
      return;
    }
    const ColliderId = this.PhysicsWidgetApi.AddCollider({
      Type: 'Trimesh',
      Vertices,
      Indices,
      Friction: 0.8,
      Restitution: 0,
    });
    this.TerrainColliders.set(TileId, ColliderId);
  }

  private RemoveTerrainCollider(TileId: string): void {
    const ColliderId = this.TerrainColliders.get(TileId);
    if (ColliderId === undefined) {
      return;
    }
    this.PhysicsWidgetApi.RemoveCollider(ColliderId);
    this.TerrainColliders.delete(TileId);
  }

  private ConvertVerticesToPhysics(Vertices: Float32Array): Float32Array {
    const Viewport = this.context.viewport;
    const [OriginLongitude, OriginLatitude, OriginAltitude] = this.CoordinateOrigin;
    const [OriginX, OriginY] = Viewport.projectFlat([OriginLongitude, OriginLatitude]);
    const { metersPerUnit } = Viewport.getDistanceScales(this.CoordinateOrigin);
    const PhysicsVertices = new Float32Array(Vertices.length);
    for (let Index = 0; Index < Vertices.length; Index += 3) {
      PhysicsVertices[Index] = (Vertices[Index] - OriginX) * metersPerUnit[0];
      PhysicsVertices[Index + 1] = (Vertices[Index + 1] - OriginY) * metersPerUnit[1];
      PhysicsVertices[Index + 2] = Vertices[Index + 2] - OriginAltitude;
    }
    return PhysicsVertices;
  }

  private GetLodStep(): number {
    const Zoom = this.context.viewport.zoom;
    if (Zoom < 8) {
      return 16;
    }
    if (Zoom < 11) {
      return 8;
    }
    if (Zoom < 14) {
      return 4;
    }
    if (Zoom < 16) {
      return 2;
    }
    return 1;
  }

  private SimplifyMesh(
    Vertices: Float32Array,
    Indices: Uint32Array,
    Step: number,
  ): {
    Vertices: Float32Array;
    Indices: Uint32Array;
  } {
    if (Step <= 1) {
      return {
        Vertices,
        Indices,
      };
    }

    const UsedVertices = new Set<number>();

    const SimplifiedTriangles: number[][] = [];

    for (let Index = 0; Index < Indices.length; Index += 3 * Step) {
      if (Index + 2 >= Indices.length) {
        break;
      }
      const A = Indices[Index];
      const B = Indices[Index + 1];
      const C = Indices[Index + 2];
      if (A === B || B === C || A === C) {
        continue;
      }
      UsedVertices.add(A);
      UsedVertices.add(B);
      UsedVertices.add(C);
      SimplifiedTriangles.push([A, B, C]);
    }

    const VertexMap = new Map<number, number>();
    const ResultVertices = new Float32Array(UsedVertices.size * 3);
    let NewVertexIndex = 0;
    for (const OldVertexIndex of UsedVertices) {
      VertexMap.set(OldVertexIndex, NewVertexIndex);
      const OldOffset = OldVertexIndex * 3;
      const NewOffset = NewVertexIndex * 3;
      ResultVertices[NewOffset] = Vertices[OldOffset];
      ResultVertices[NewOffset + 1] = Vertices[OldOffset + 1];
      ResultVertices[NewOffset + 2] = Vertices[OldOffset + 2];
      NewVertexIndex++;
    }

    const ResultIndices = new Uint32Array(SimplifiedTriangles.length * 3);
    let ResultIndex = 0;
    for (const Triangle of SimplifiedTriangles) {
      ResultIndices[ResultIndex++] = VertexMap.get(Triangle[0])!;
      ResultIndices[ResultIndex++] = VertexMap.get(Triangle[1])!;
      ResultIndices[ResultIndex++] = VertexMap.get(Triangle[2])!;
    }
    return {
      Vertices: ResultVertices,
      Indices: ResultIndices,
    };
  }
  override onViewportLoad(Tiles?: Parameters<TerrainLayer['onViewportLoad']>[0]): void {
    super.onViewportLoad(Tiles);
    if (Tiles === undefined) {
      return;
    }
    const ActiveTileIds = new Set(Tiles.map((Tile) => Tile.id));
    for (const [TileId] of this.TerrainColliders) {
      if (ActiveTileIds.has(TileId)) {
        continue;
      }
      this.RemoveTerrainCollider(TileId);
    }
    const LodStep = this.GetLodStep();
    for (const Tile of Tiles) {
      if (this.TerrainColliders.has(Tile.id)) {
        continue;
      }
      const Mesh = Tile.content?.[0] as Mesh | null;
      if (Mesh == null) {
        continue;
      }
      const Position = Mesh.attributes['POSITION'];
      const Indices = Mesh.indices;
      if (Position === undefined || Indices === undefined) {
        continue;
      }
      const Vertices = Position.value as Float32Array;
      const TriangleIndices =
        Indices.value instanceof Uint32Array ? Indices.value : Uint32Array.from(Indices.value);
      const PhysicsVertices = this.ConvertVerticesToPhysics(Vertices);
      const SimplifiedMesh = this.SimplifyMesh(PhysicsVertices, TriangleIndices, LodStep);
      this.AddTerrainCollider(Tile.id, SimplifiedMesh.Vertices, SimplifiedMesh.Indices);
    }
  }
}

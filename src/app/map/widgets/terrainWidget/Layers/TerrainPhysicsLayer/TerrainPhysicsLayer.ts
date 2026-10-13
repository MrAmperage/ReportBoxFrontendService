import { TerrainLayer } from 'deck.gl';
import type { Mesh } from '@loaders.gl/schema';
import type { PhysicsWidgetApi } from '../../../physicsWidget/physicsWidgetTypes';
type TerrainTiles = NonNullable<Parameters<TerrainLayer['onViewportLoad']>[0]>;
type TerrainTile = TerrainTiles[number];
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
      pickable: '3d',
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
      onTileLoad: (Tile: TerrainTile) => {
        this.HandleTileLoad(Tile);
      },
      onTileUnload: (Tile: TerrainTile) => {
        this.HandleTileUnload(Tile);
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

  private HandleTileLoad(Tile: TerrainTile): void {
    if (this.TerrainColliders.has(Tile.id)) {
      return;
    }

    const TerrainMesh = Tile.content?.[0] as Mesh | null;
    if (TerrainMesh == null) {
      return;
    }
    const Position = TerrainMesh.attributes['POSITION'];
    const Indices = TerrainMesh.indices;
    if (Position === undefined || Indices === undefined) {
      return;
    }
    const Vertices = Position.value as Float32Array;
    const TriangleIndices =
      Indices.value instanceof Uint32Array ? Indices.value : Uint32Array.from(Indices.value);
    const PhysicsVertices = this.ConvertVerticesToPhysics(Vertices);
    this.AddTerrainCollider(Tile.id, PhysicsVertices, TriangleIndices);
  }

  private HandleTileUnload(Tile: TerrainTile): void {
    this.RemoveTerrainCollider(Tile.id);
  }

  override onViewportLoad(Tiles?: TerrainTiles): void {
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

    for (const Tile of Tiles) {
      this.HandleTileLoad(Tile);
    }
  }
}

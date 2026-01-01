export interface TileSize {
  width: number;
  height: number;
}

export interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface TileInfo {
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  mouseX: number;
  mouseY: number;
}

export interface SpriteRect {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteExport {
  image: string;
  sprites: Omit<SpriteRect, "id">[];
}

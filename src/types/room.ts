export interface Instance {
  instance_layer_name: string | number;
  obj_name: string;
  x: number;
  y: number;
}

export interface Tile {
  x: number;
  y: number;
  index: number;
  selected?: boolean;
}

export interface TileBrush {
  tiles: Tile[];
  width: number;
  height: number;
  texture: string;
  offsetX: number;
  offsetY: number;
}

export interface Layer {
  name: string;
  depth: number;
  type: 'tile' | 'object';
  visible: boolean;
  tiles: Tile[];
  texture?: string;
}

export interface Room {
  instances: Instance[];
  layers: Layer[];
  width: number;
  height: number;
  name: string;
  index: string;
  type?: string;
  biome?: string;
}

export interface ObjectDefinition {
  name: string;
  width: number;
  height: number;
  color: string;
  sprite?: string;
} 
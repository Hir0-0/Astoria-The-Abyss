// grid.js — tiles, level data and field-of-view
// Equivalente conceitual ao mapa de dungeon do NetHack (struct rm em include/rm.h),
// mas como uma matriz 2D simples de objetos JS.

export const TILE = {
  WALL: 'wall',
  FLOOR: 'floor',
  STAIR_DOWN: 'stair_down',
  STAIR_UP: 'stair_up',
  DOOR: 'door',
  ORE_NODE: 'ore_node',
  HERB_NODE: 'herb_node',
  BASE: 'base',
  STATION_BANCADA: 'station_bancada',
  STATION_FORJA: 'station_forja',
  STATION_ALQUIMISTA: 'station_alquimista',
  STATION_REFINO: 'station_refino',
  BED: 'bed',
};

export const STATION_TILE_TO_ID = {
  [TILE.STATION_BANCADA]: 'bancada',
  [TILE.STATION_FORJA]: 'forja',
  [TILE.STATION_ALQUIMISTA]: 'alquimista',
  [TILE.STATION_REFINO]: 'refino',
  [TILE.BASE]: 'refino', // bases auxiliares oferecem só refino, por design (GDD §2.5)
};

export class Level {
  constructor(width, height, floorNumber, biome) {
    this.width = width;
    this.height = height;
    this.floorNumber = floorNumber;
    this.biome = biome;
    this.tiles = new Array(width * height).fill(null).map(() => ({
      type: TILE.WALL,
      seen: false,
      visible: false,
      monster: null,
      items: [],
    }));
    this.monsters = [];
    this.stairDown = null;
    this.stairUp = null;
    this.bones = null; // {x, y, inventory, stats} — clone pendente neste andar
  }

  idx(x, y) {
    return y * this.width + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  at(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[this.idx(x, y)];
  }

  isWalkable(x, y) {
    const t = this.at(x, y);
    return t && t.type !== TILE.WALL;
  }

  monsterAt(x, y) {
    const t = this.at(x, y);
    return t ? t.monster : null;
  }

  // Field of view simplificado: raio fixo + checagem de linha de visão por Bresenham.
  // Não é shadowcasting completo (como o de Auroria), mas é suficiente para o protótipo.
  computeFOV(px, py, radius) {
    for (const t of this.tiles) t.visible = false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = px + dx;
        const y = py + dy;
        if (!this.inBounds(x, y)) continue;
        if (dx * dx + dy * dy > radius * radius) continue;
        if (this._hasLineOfSight(px, py, x, y)) {
          const t = this.at(x, y);
          t.visible = true;
          t.seen = true;
        }
      }
    }
  }

  _hasLineOfSight(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    while (true) {
      if (x === x1 && y === y1) return true;
      const t = this.at(x, y);
      if (t && t.type === TILE.WALL && !(x === x0 && y === y0)) return false;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
}

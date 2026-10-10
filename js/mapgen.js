// mapgen.js — geração procedural de andares
// Porta conceitual de mklev.c/mkroom.c do NetHack: salas retangulares sem sobreposição
// conectadas por corredores em L, mais escadas.

import { Level, TILE } from './grid.js';
import { BIOMES } from './ecosystem.js';
import { spawnMonster } from './combat.js';

export function generateCity() {
  const width = 30, height = 16;
  const level = new Level(width, height, 0, { name: 'Cidade Principal', monsters: [] });
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      level.at(x, y).type = TILE.FLOOR;
    }
  }
  level.at(5, 4).type = TILE.STATION_BANCADA;
  level.at(9, 4).type = TILE.STATION_FORJA;
  level.at(13, 4).type = TILE.STATION_ALQUIMISTA;
  level.at(17, 4).type = TILE.STATION_REFINO;
  level.at(21, 4).type = TILE.BED;
  const down = { x: width - 4, y: height - 4 };
  level.at(down.x, down.y).type = TILE.STAIR_DOWN;
  level.stairDown = down;
  level.stairUp = { x: 3, y: height - 4 }; // ponto de chegada (sem escada real para "fora")
  level.ecosystemState = { degradation: 0 };
  level.stash = []; // itens enviados automaticamente das bases auxiliares (GDD §2.5)
  return level;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rectsOverlap(a, b, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function carveRoom(level, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      level.at(x, y).type = TILE.FLOOR;
    }
  }
}

function carveCorridor(level, x1, y1, x2, y2) {
  let x = x1, y = y1;
  const horizontalFirst = Math.random() < 0.5;
  const carve = (cx, cy) => {
    if (level.inBounds(cx, cy)) level.at(cx, cy).type = TILE.FLOOR;
  };
  if (horizontalFirst) {
    while (x !== x2) { carve(x, y); x += x < x2 ? 1 : -1; }
    while (y !== y2) { carve(x, y); y += y < y2 ? 1 : -1; }
  } else {
    while (y !== y2) { carve(x, y); y += y < y2 ? 1 : -1; }
    while (x !== x2) { carve(x, y); x += x < x2 ? 1 : -1; }
  }
  carve(x2, y2);
}

export function generateFloor(floorNumber, { width = 60, height = 34 } = {}) {
  // Cada setor (20 andares) tem 2 biomas fixos: metade inicial e metade final do setor
  // (GDD: 5 setores x 2 biomas = 10 biomas no total).
  // Andares 1–20 = setor 1; cada bioma cobre exatamente 10 andares.
  // Subtrair 1 evita deslocar a troca de bioma para os andares 10, 20, 30...
  const floorIndex = Math.max(0, floorNumber - 1);
  const biomeSector = Math.floor(floorIndex / 20);
  const withinSector = floorIndex % 20;
  const biomeIndex = Math.min(BIOMES.length - 1, biomeSector * 2 + (withinSector < 10 ? 0 : 1));
  const biome = BIOMES[biomeIndex] || BIOMES[0];
  const level = new Level(width, height, floorNumber, biome);
  level.ecosystemState = { degradation: 0 }; // 0 (ignorado) .. 100 (degradado)

  const rooms = [];
  const roomCount = rand(6, 10);
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 200) {
    attempts++;
    const w = rand(4, 9);
    const h = rand(3, 6);
    const x = rand(1, width - w - 2);
    const y = rand(1, height - h - 2);
    const room = { x, y, w, h };
    if (rooms.some((r) => rectsOverlap(r, room))) continue;
    rooms.push(room);
    carveRoom(level, room);
  }

  // A grade padrão deve sempre produzir salas; este fallback protege mapas customizados.
  if (rooms.length === 0) {
    const fallbackRoom = { x: 2, y: 2, w: Math.min(8, width - 4), h: Math.min(6, height - 4) };
    rooms.push(fallbackRoom);
    carveRoom(level, fallbackRoom);
  }

  rooms.sort((a, b) => a.x - b.x);
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    const ax = a.x + Math.floor(a.w / 2);
    const ay = a.y + Math.floor(a.h / 2);
    const bx = b.x + Math.floor(b.w / 2);
    const by = b.y + Math.floor(b.h / 2);
    carveCorridor(level, ax, ay, bx, by);
  }

  // Escadas: sobe na primeira sala, desce na última (a menos que seja o andar 100).
  const first = rooms[0];
  const last = rooms[rooms.length - 1];
  const upX = first.x + Math.floor(first.w / 2);
  const upY = first.y + Math.floor(first.h / 2);
  level.at(upX, upY).type = TILE.STAIR_UP;
  level.stairUp = { x: upX, y: upY };

  if (floorNumber < 100) {
    const downX = last.x + Math.floor(last.w / 2);
    const downY = last.y + Math.floor(last.h / 2);
    level.at(downX, downY).type = TILE.STAIR_DOWN;
    level.stairDown = { x: downX, y: downY };
  }

  // Spawns de monstros: densidade cresce com a profundidade, reponderada pelo ecossistema.
  const spawnCount = rand(2, 4) + Math.floor(floorNumber / 10);
  for (let i = 0; i < spawnCount; i++) {
    const room = rooms[rand(1, rooms.length - 2 < 1 ? 1 : rooms.length - 2)];
    if (!room) continue;
    const mx = rand(room.x, room.x + room.w - 1);
    const my = rand(room.y, room.y + room.h - 1);
    const tile = level.at(mx, my);
    if (tile.type === TILE.FLOOR && !tile.monster) {
      const m = spawnMonster(floorNumber, biome, level.ecosystemState);
      m.x = mx;
      m.y = my;
      tile.monster = m;
      level.monsters.push(m);
    }
  }

  level.rooms = rooms;

  // Nós de recurso coletáveis (GDD §2.7) — minério e fibra fúngica.
  const nodeCount = rand(2, 4);
  for (let i = 0; i < nodeCount; i++) {
    const room = rooms[rand(0, rooms.length - 1)];
    if (!room) continue;
    const nx = rand(room.x, room.x + room.w - 1);
    const ny = rand(room.y, room.y + room.h - 1);
    const tile = level.at(nx, ny);
    if (tile.type === TILE.FLOOR && !tile.monster) {
      tile.type = Math.random() < 0.5 ? TILE.ORE_NODE : TILE.HERB_NODE;
    }
  }

  return level;
}

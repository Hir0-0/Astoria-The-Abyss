// render.js — desenho em canvas (glyphs estilo roguelike clássico sobre grid)

import { TILE } from './grid.js';
import { burdenLabel, hungerLabel } from './survival.js';

const TILE_SIZE = 16;
const GLYPHS = {
  [TILE.WALL]: '#',
  [TILE.FLOOR]: '.',
  [TILE.STAIR_DOWN]: '>',
  [TILE.STAIR_UP]: '<',
  [TILE.DOOR]: '+',
  [TILE.ORE_NODE]: '*',
  [TILE.HERB_NODE]: ';',
  [TILE.BASE]: 'o',
  [TILE.STATION_BANCADA]: 'W',
  [TILE.STATION_FORJA]: 'F',
  [TILE.STATION_ALQUIMISTA]: 'A',
  [TILE.STATION_REFINO]: 'R',
  [TILE.BED]: 'Z',
};

const SPECIAL_COLORS = {
  [TILE.ORE_NODE]: '#c9a23a',
  [TILE.HERB_NODE]: '#5ac97a',
  [TILE.BASE]: '#9a7fd8',
  [TILE.STATION_BANCADA]: '#c9c23a',
  [TILE.STATION_FORJA]: '#c9603a',
  [TILE.STATION_ALQUIMISTA]: '#3ac9c0',
  [TILE.STATION_REFINO]: '#c93a6e',
  [TILE.BED]: '#6ec9c9',
};

function mixColor(hexA, hexB, amount) {
  const parse = (hex) => {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  };
  const a = parse(hexA);
  const b = parse(hexB);
  return `#${a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount)
    .toString(16).padStart(2, '0')).join('')}`;
}

export function render(ctx, game) {
  const { level, player } = game;
  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = `${TILE_SIZE}px monospace`;
  ctx.textBaseline = 'top';
  const biomeColor = level.biome.palette || '#8a877d';
  const degradation = level.ecosystemState?.degradation || 0;
  const effectivePalette = degradation >= 67
    ? mixColor(biomeColor, '#a83f46', 0.48)
    : degradation >= 34 ? mixColor(biomeColor, '#827467', 0.32) : biomeColor;

  const viewW = Math.floor(ctx.canvas.width / TILE_SIZE);
  const viewH = Math.floor(ctx.canvas.height / TILE_SIZE);
  const camX = Math.max(0, Math.min(level.width - viewW, player.x - Math.floor(viewW / 2)));
  const camY = Math.max(0, Math.min(level.height - viewH, player.y - Math.floor(viewH / 2)));
  // Mapas menores (como a cidade) ficam centralizados em vez de colados ao canto.
  const offsetX = Math.max(0, Math.floor((viewW - level.width) / 2));
  const offsetY = Math.max(0, Math.floor((viewH - level.height) / 2));

  for (let sy = 0; sy < viewH; sy++) {
    for (let sx = 0; sx < viewW; sx++) {
      const x = camX + sx - offsetX, y = camY + sy - offsetY;
      const tile = level.at(x, y);
      if (!tile || !tile.seen) continue;
      const glyph = GLYPHS[tile.type] || ' ';
      const special = SPECIAL_COLORS[tile.type];
      const baseGlyphColor = tile.type === TILE.WALL
        ? mixColor(effectivePalette, '#d8d6cf', 0.55)
        : mixColor(effectivePalette, '#d8d6cf', 0.16);
      ctx.fillStyle = special
        ? (tile.visible ? (degradation >= 67 ? mixColor(special, '#a83f46', 0.28) : special) : mixColor(special, '#060608', 0.78))
        : (tile.visible ? baseGlyphColor : mixColor(effectivePalette, '#060608', 0.58));
      ctx.fillText(glyph, sx * TILE_SIZE, sy * TILE_SIZE);

      if (tile.visible && tile.monster && tile.monster.hp > 0) {
        ctx.fillStyle = tile.monster.isClone ? '#9a7fd8' : '#c4453e';
        ctx.fillText(tile.monster.glyph, sx * TILE_SIZE, sy * TILE_SIZE);
      }
      if (tile.visible && tile.items && tile.items.length > 0 && !(tile.monster && tile.monster.hp > 0)) {
        ctx.fillStyle = '#c9a23a';
        ctx.fillText('%', sx * TILE_SIZE, sy * TILE_SIZE);
      }
    }
  }

  // Jogador
  const px = (player.x - camX + offsetX) * TILE_SIZE;
  const py = (player.y - camY + offsetY) * TILE_SIZE;
  ctx.fillStyle = player.alive ? '#e8e4d8' : '#555';
  ctx.fillText('@', px, py);
}

export function renderHUD(container, game) {
  const { player, level } = game;
  const s = player.survival;
  const bar = (value, max, color) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `<div class="bar"><div style="width:${pct}%;background:${color}"></div></div>`;
  };

  container.innerHTML = `
    <div class="row"><span>HP</span><span>${Math.max(0, player.hp)}/${player.maxHp}</span></div>
    ${bar(player.hp, player.maxHp, '#c4453e')}
    <div class="row"><span>Fome</span><span>${Math.round(s.hunger)} — ${hungerLabel(s.hunger)}</span></div>
    <div class="row"><span>Stamina</span><span>${Math.round(s.stamina)}</span></div>
    ${bar(s.stamina, s.staminaMax, '#4a8f5c')}
    <div class="row"><span>Peso</span><span>${Math.round(s.weight)}/${s.weightMax} — ${burdenLabel(s.weight, s.weightMax)}</span></div>
    <div class="row"><span>Oxigênio</span><span>${Math.round(s.oxygen)}</span></div>
    ${bar(s.oxygen, s.oxygenMax, '#3a8fc9')}
    <div class="row"><span>Sanidade</span><span>${Math.round(s.sanity)}</span></div>
    ${bar(s.sanity, s.sanityMax, '#c99a3a')}
    <div class="row"><span>Andar</span><span>${game.currentFloor} — ${level.biome.name}</span></div>
  `;
}

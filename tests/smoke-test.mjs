import assert from 'node:assert/strict';
import { Game } from '../js/turnEngine.js';
import { createPlayer } from '../js/player.js';
import { TILE } from '../js/grid.js';
import { addItem } from '../js/items.js';
import { equipCrafted } from '../js/crafting.js';
import { createClone, collectCloneLoot, respawnAtCity } from '../js/clone.js';
import { tickSurvival } from '../js/survival.js';
import { render, renderHUD } from '../js/render.js';

function clearMonsters(level) {
  for (const tile of level.tiles) tile.monster = null;
  level.monsters = [];
}

function canReachTile(level, startX, startY, targetType) {
  const queue = [[startX, startY]];
  const visited = new Set([`${startX},${startY}`]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, y] = queue[cursor];
    if (level.at(x, y)?.type === targetType) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && level.isWalkable(nx, ny)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return false;
}

const quiet = () => {};
const game = new Game(createPlayer(), quiet);

// A distribuição segue 5 setores, 20 andares por setor e 10 andares por bioma.
const biomeBoundaries = [
  [1, 'Grutas Luminosas'], [10, 'Grutas Luminosas'],
  [11, 'Cavernas de Musgo'], [20, 'Cavernas de Musgo'],
  [21, 'Ruínas Fúngicas'], [30, 'Ruínas Fúngicas'],
  [31, 'Estruturas Decrépitas'], [40, 'Estruturas Decrépitas'],
  [41, 'Lagos Submersos'], [50, 'Lagos Submersos'],
  [51, 'Câmaras de Névoa'], [60, 'Câmaras de Névoa'],
  [61, 'Teias Tecno-Orgânicas'], [70, 'Teias Tecno-Orgânicas'],
  [71, 'Abismo Profundo'], [80, 'Abismo Profundo'],
  [81, 'Salões de Cinzas'], [90, 'Salões de Cinzas'],
  [91, 'Núcleo de Gehennom'], [100, 'Núcleo de Gehennom'],
];
for (const [floorNumber, biomeName] of biomeBoundaries) {
  assert.equal(game._getOrCreateFloor(floorNumber).biome.name, biomeName, `bioma no andar ${floorNumber}`);
}

// Todo andar deve ter escada de subida; 1–99 também têm descida; há rota entre escadas.
for (let floorNumber = 0; floorNumber <= 100; floorNumber++) {
  const level = game._getOrCreateFloor(floorNumber);
  assert.ok(level.stairUp, `escada de subida do andar ${floorNumber}`);
  if (floorNumber < 100) assert.ok(level.stairDown, `escada de descida do andar ${floorNumber}`);
  const target = floorNumber === 100 ? TILE.STAIR_UP : TILE.STAIR_DOWN;
  assert.ok(canReachTile(level, level.stairUp.x, level.stairUp.y, target), `conectividade do andar ${floorNumber}`);
  for (const monster of level.monsters) assert.equal(level.at(monster.x, monster.y).monster, monster);
}

// Validar 100 descidas e 100 subidas pelo mesmo caminho de escadas usado pelo jogo.
for (let floorNumber = 0; floorNumber < 100; floorNumber++) {
  const current = game._getOrCreateFloor(floorNumber);
  const next = game._getOrCreateFloor(floorNumber + 1);
  clearMonsters(current);
  clearMonsters(next);
  game.currentFloor = floorNumber;
  game.level = current;
  game.player.x = current.stairDown.x;
  game.player.y = current.stairDown.y;
  game.handleKey('>');
  assert.equal(game.currentFloor, floorNumber + 1, `descer de ${floorNumber}`);
  assert.equal(game.level.at(game.player.x, game.player.y).type, TILE.STAIR_UP);
  game.player.x = game.level.stairUp.x;
  game.player.y = game.level.stairUp.y;
  game.handleKey('<');
  assert.equal(game.currentFloor, floorNumber, `subir de ${floorNumber + 1}`);
  assert.equal(game.level.at(game.player.x, game.player.y).type, TILE.STAIR_DOWN);
}

// Peso máximo não dá softlock: o jogador descarta uma pilha e pode usar a escada.
const overloadedPlayer = createPlayer();
const overloadedGame = new Game(overloadedPlayer, quiet);
addItem(overloadedPlayer, 'ore_bruto', 130); // 260 de peso, acima do limite de 250.
const cityStairs = overloadedGame.level.stairDown;
overloadedPlayer.x = cityStairs.x;
overloadedPlayer.y = cityStairs.y;
overloadedGame.handleKey('>');
assert.equal(overloadedGame.currentFloor, 0, 'peso máximo bloqueia a escada');
overloadedGame.handleKey('d');
assert.equal(overloadedGame.uiMode, 'drop');
overloadedGame.handleKey('1');
assert.equal(overloadedPlayer.survival.weight, 0, 'peso recalculado após descarte');
assert.equal(overloadedGame.level.at(overloadedPlayer.x, overloadedPlayer.y).items[0].qty, 130);
overloadedGame.handleKey('>');
assert.equal(overloadedGame.currentFloor, 1, 'escada liberada após descarte');

// Fast travel cidade ↔ posto e descanso consomem turno sem quebrar o destino.
const basePlayer = createPlayer();
const baseGame = new Game(basePlayer, quiet);
const floorOne = baseGame._getOrCreateFloor(1);
clearMonsters(floorOne);
baseGame.currentFloor = 1;
baseGame.level = floorOne;
const buildTile = floorOne.tiles.findIndex((tile) => tile.type === TILE.FLOOR);
basePlayer.x = buildTile % floorOne.width;
basePlayer.y = Math.floor(buildTile / floorOne.width);
addItem(basePlayer, 'kit_posto_avancado', 1);
baseGame.handleKey('b');
assert.equal(baseGame.bases.length, 1, 'posto construído');
baseGame.handleKey('t');
baseGame.handleKey('1');
assert.equal(baseGame.currentFloor, 0, 'fast travel até a cidade');
baseGame.handleKey('t');
baseGame.handleKey('2');
assert.equal(baseGame.currentFloor, 1, 'fast travel de volta ao posto');
assert.equal(baseGame.level.at(basePlayer.x, basePlayer.y).type, TILE.BASE);
basePlayer.hp = 5;
basePlayer.survival.stamina = 10;
baseGame.handleKey('r');
assert.ok(basePlayer.hp >= 11, 'descanso recupera HP');
assert.equal(basePlayer.survival.stamina, basePlayer.survival.staminaMax, 'descanso recupera stamina');

// Bônus de equipamento não se acumulam ao fabricar/equipar várias vezes.
const equippedPlayer = createPlayer();
equipCrafted(equippedPlayer, 'lamina_improvisada', quiet);
equipCrafted(equippedPlayer, 'lamina_improvisada', quiet);
assert.deepEqual(equippedPlayer.damage, [1, 8]);
equipCrafted(equippedPlayer, 'armadura_fungica', quiet);
assert.equal(equippedPlayer.ac, 8);

// Morte remove os bônus; recuperar o Clone recupera também o equipamento original.
addItem(equippedPlayer, 'lamina_improvisada', 1);
addItem(equippedPlayer, 'armadura_fungica', 1);
const clone = createClone(equippedPlayer, baseGame.level);
respawnAtCity(equippedPlayer, quiet);
assert.deepEqual(equippedPlayer.damage, [1, 6]);
assert.equal(equippedPlayer.ac, 9);
collectCloneLoot(clone, equippedPlayer, quiet);
assert.deepEqual(equippedPlayer.damage, [1, 8]);
assert.equal(equippedPlayer.ac, 8);

// O oxigênio em zero só gera uma mensagem na transição para asfixia, não a cada turno.
const survival = createPlayer().survival;
survival.oxygen = 1;
const oxygenLogs = [];
const tickArgs = { inDeepFloor: false, submerged: true, log: (message) => oxygenLogs.push(message) };
tickSurvival(survival, tickArgs);
tickSurvival(survival, tickArgs);
assert.equal(survival.oxygen, 0);
assert.equal(oxygenLogs.length, 1);

// Smoke test do render sem depender de navegador ou bibliotecas externas.
const drawCalls = { fills: 0, glyphs: 0 };
const context = {
  canvas: { width: 800, height: 560 },
  fillStyle: '', font: '', textBaseline: 'top',
  fillRect: () => { drawCalls.fills++; },
  fillText: () => { drawCalls.glyphs++; },
};
render(context, baseGame);
assert.ok(drawCalls.fills > 0 && drawCalls.glyphs > 0, 'canvas renderiza tiles');
let hudMarkup = '';
renderHUD({ set innerHTML(value) { hudMarkup = value; } }, baseGame);
assert.ok(hudMarkup.includes('Peso') && hudMarkup.includes('Andar'), 'HUD inclui estados do jogador e andar');

console.log(`OK — ${biomeBoundaries.length} fronteiras de bioma; 101 mapas; 200 transições de escada; peso, fast travel, bases, equipamento, Clone, oxigênio e render validados.`);

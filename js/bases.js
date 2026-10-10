// bases.js — bases auxiliares e cidade principal (GDD §2.5)
// Refúgio: regenera HP/Stamina, salva jogo, fast travel. Refinaria: processa minério
// (reaproveita a bancada de refino do crafting.js). Envio automatizado: transporta
// recursos excedentes para a superfície.

import { TILE } from './grid.js';
import { ITEMS, removeItem } from './items.js';

const AUTO_SEND_ITEMS = ['ore_bruto', 'fibra_fungica'];
const AUTO_SEND_KEEP = 3; // mantém até 3 de cada no inventário; o resto é enviado

export function buildBase(game, log) {
  const { level, player } = game;
  const tile = level.at(player.x, player.y);
  if (level.floorNumber === 0) {
    log('Você já está na cidade principal.');
    return;
  }
  if (tile.type !== TILE.FLOOR) {
    log('Só é possível construir um posto avançado em chão livre.');
    return;
  }
  const nearbyMonster = level.monsters.some(
    (m) => m.hp > 0 && Math.max(Math.abs(m.x - player.x), Math.abs(m.y - player.y)) <= 2
  );
  if (nearbyMonster) {
    log('Monstros por perto demais — não é seguro construir aqui.');
    return;
  }
  if (!removeItem(player, 'kit_posto_avancado', 1)) {
    log('Você precisa de um Kit de Posto Avançado para construir uma base.');
    return;
  }
  tile.type = TILE.BASE;
  const base = { floorNumber: level.floorNumber, x: player.x, y: player.y, name: `Posto — Andar ${level.floorNumber}` };
  game.bases.push(base);
  log('Posto avançado construído. Ele oferece descanso, refino e fast travel.');
}

export function restAndSend(game, log) {
  const { level, player } = game;
  const tile = level.at(player.x, player.y);
  const atRest = tile.type === TILE.BASE || tile.type === TILE.BED;
  if (!atRest) {
    log('Não há onde descansar aqui.');
    return;
  }
  player.survival.stamina = player.survival.staminaMax;
  player.hp = Math.min(player.maxHp, player.hp + Math.ceil(player.maxHp * 0.3));
  log('Você descansa e recupera Stamina e parte do HP.');

  if (level.floorNumber !== 0) {
    const city = game.floors.get(0);
    let sentAny = false;
    for (const itemId of AUTO_SEND_ITEMS) {
      const entry = player.inventory.find((i) => i.id === itemId);
      if (entry && entry.qty > AUTO_SEND_KEEP) {
        const surplus = entry.qty - AUTO_SEND_KEEP;
        removeItem(player, itemId, surplus);
        const stashEntry = city.stash.find((i) => i.id === itemId);
        if (stashEntry) stashEntry.qty += surplus;
        else city.stash.push({ id: itemId, qty: surplus });
        sentAny = true;
      }
    }
    if (sentAny) log('Recursos excedentes foram enviados automaticamente para a cidade.');
  }
}

export function listTravelTargets(game) {
  const targets = [{ floorNumber: 0, name: 'Cidade Principal' }];
  for (const base of game.bases) targets.push(base);
  return targets;
}

export function fastTravel(game, targetIndex, log) {
  const targets = listTravelTargets(game);
  const target = targets[targetIndex];
  if (!target) {
    log('Destino inválido.');
    return;
  }
  if (game.player.survival.weight >= game.player.survival.weightMax) {
    log('Peso excessivo bloqueia o fast travel — descarte algo.');
    return;
  }
  const atRest = (() => {
    const t = game.level.at(game.player.x, game.player.y);
    return t.type === TILE.BASE || t.type === TILE.BED;
  })();
  if (!atRest) {
    log('Fast travel só funciona a partir de uma base ou da cidade.');
    return;
  }
  game.currentFloor = target.floorNumber;
  game.level = game._getOrCreateFloor(target.floorNumber);
  game.player.x = target.x ?? game.level.stairUp.x;
  game.player.y = target.y ?? game.level.stairUp.y;
  game.level.computeFOV(game.player.x, game.player.y, 7);
  log(`Você viaja até: ${target.name}.`);
  if (target.floorNumber > 0) log(`Bioma: ${game.level.biome.name}.`);
}

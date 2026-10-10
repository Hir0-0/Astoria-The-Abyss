// combat.js — resolução de combate turn-based (to-hit / AC / dano)
// Porta conceitual de find_roll_to_hit() / mhitu.c / uhitm.c do NetHack.

import { aggressionMultiplier } from './ecosystem.js';

let monsterIdSeq = 1;

export function spawnMonster(floorNumber, biome, ecosystemState) {
  const name = biome.monsters[Math.floor(Math.random() * biome.monsters.length)];
  const mult = aggressionMultiplier({ ecosystemState });
  const baseHp = 4 + Math.floor(floorNumber * 0.8);
  return {
    id: monsterIdSeq++,
    name,
    glyph: name[0].toUpperCase(),
    hp: Math.round(baseHp * mult),
    maxHp: Math.round(baseHp * mult),
    ac: 8 - Math.floor(floorNumber / 15),
    toHit: 2 + Math.floor(floorNumber / 10),
    damage: [1, 4 + Math.floor(floorNumber / 12)],
    aggressive: mult > 1.2 || Math.random() < 0.4,
    x: 0,
    y: 0,
  };
}

function rollDie(n) {
  return Math.floor(Math.random() * n) + 1;
}

// Fórmula clássica estilo NetHack: d20 + bônus de ataque vs AC do alvo (AC menor = melhor).
export function resolveAttack(attackerToHit, targetAC) {
  const roll = rollDie(20);
  const hit = roll + attackerToHit >= 10 + targetAC;
  return { roll, hit };
}

export function playerAttack(player, monster, log) {
  const { roll, hit } = resolveAttack(player.toHit, monster.ac);
  if (!hit) {
    log(`Você ataca ${monster.name} e erra (d20=${roll}).`);
    return;
  }
  const dmg = rollDie(player.damage[1]) + player.damage[0] + player.strBonus;
  monster.hp -= dmg;
  log(`Você acerta ${monster.name} por ${dmg} de dano.`);
  if (monster.hp <= 0) {
    log(`${monster.name} foi derrotado.`);
  }
}

const LOOT_POOL = ['ore_bruto', 'fibra_fungica'];

// Loot simples: ~50% de chance de soltar 1-2 unidades de material bruto (GDD não detalha
// tabelas de loot por monstro; fica como gancho para refinar por bioma depois).
export function rollMonsterLoot() {
  if (Math.random() < 0.5) return null;
  const id = LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)];
  const qty = Math.random() < 0.3 ? 2 : 1;
  return { id, qty };
}

export function monsterAttack(monster, player, log) {
  const { roll, hit } = resolveAttack(monster.toHit, player.ac);
  if (!hit) {
    log(`${monster.name} ataca e erra (d20=${roll}).`);
    return;
  }
  const dmg = rollDie(monster.damage[1]) + monster.damage[0];
  player.hp -= dmg;
  log(`${monster.name} acerta você por ${dmg} de dano.`);
}

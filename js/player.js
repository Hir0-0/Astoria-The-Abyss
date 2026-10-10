// player.js — estado inicial do jogador e atributos-base (independentes do equipamento).

import { createSurvivalState } from './survival.js';

export function createPlayer() {
  return {
    x: 0,
    y: 0,
    hp: 20,
    maxHp: 20,
    baseAC: 9,
    ac: 9,
    baseDamage: [1, 6],
    damage: [1, 6],
    toHit: 3,
    strBonus: 1,
    equipment: { weapon: null, armor: null },
    inventory: [],
    survival: createSurvivalState(),
    alive: true,
  };
}

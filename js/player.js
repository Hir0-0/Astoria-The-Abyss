// player.js — estado do jogador

import { createSurvivalState } from './survival.js';

export function createPlayer() {
  return {
    x: 0,
    y: 0,
    hp: 20,
    maxHp: 20,
    ac: 9,
    toHit: 3,
    damage: [1, 6],
    strBonus: 1,
    inventory: [],
    survival: createSurvivalState(),
    alive: true,
  };
}

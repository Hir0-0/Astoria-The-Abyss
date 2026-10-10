// clone.js — mecânica de Clone (GDD §2.4), equivalente funcional ao bones file do NetHack.
// Ao morrer, o jogador perde o inventário e o equipamento; um Clone surge no local exato,
// carregando os itens e o registro dos equipamentos. Derrotá-lo devolve tudo e restaura os bônus.

import { equipCrafted } from './crafting.js';

let cloneIdSeq = 1;

export function createClone(player, level) {
  const clone = {
    id: `clone-${cloneIdSeq++}`,
    isClone: true,
    name: 'seu Clone',
    glyph: '@',
    hp: player.maxHp,
    maxHp: player.maxHp,
    ac: player.ac,
    toHit: player.toHit,
    damage: [player.damage[0], player.damage[1]],
    aggressive: true,
    x: player.x,
    y: player.y,
    lootInventory: player.inventory.map((s) => ({ ...s })),
    lootEquipment: { ...(player.equipment || { weapon: null, armor: null }) },
  };
  const tile = level.at(player.x, player.y);
  tile.monster = clone;
  level.monsters.push(clone);
  level.bones = { x: player.x, y: player.y, cloneId: clone.id };
  return clone;
}

// Chamado quando o Clone é derrotado em combate (ver combat.js/turnEngine.js).
export function collectCloneLoot(clone, player, log) {
  for (const stack of clone.lootInventory) {
    const entry = player.inventory.find((i) => i.id === stack.id);
    if (entry) entry.qty += stack.qty;
    else player.inventory.push({ id: stack.id, qty: stack.qty });
  }
  if (clone.lootEquipment?.weapon) equipCrafted(player, clone.lootEquipment.weapon, log);
  if (clone.lootEquipment?.armor) equipCrafted(player, clone.lootEquipment.armor, log);
  log('Você recupera seus itens perdidos do Clone derrotado.');
}

export function respawnAtCity(player, log) {
  player.inventory = [];
  player.equipment = { weapon: null, armor: null };
  player.damage = [...(player.baseDamage || [1, 6])];
  player.ac = player.baseAC ?? 9;
  player.hp = player.maxHp;
  player.survival.stamina = player.survival.staminaMax;
  player.survival.weight = 0;
  player.alive = true;
  log('Você desperta de volta na cidade, sem os itens que carregava.');
}

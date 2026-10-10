// clone.js — mecânica de Clone (GDD §2.4), equivalente funcional ao bones file do NetHack.
// Ao morrer, o jogador perde o inventário; um Clone surge no local exato da morte,
// carregando tudo. Derrotá-lo em combate devolve os itens.

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
  log('Você recupera seus itens perdidos do Clone derrotado.');
}

export function respawnAtCity(player, log) {
  player.inventory = [];
  player.hp = player.maxHp;
  player.survival.stamina = player.survival.staminaMax;
  player.survival.weight = 0;
  player.alive = true;
  log('Você desperta de volta na cidade, sem os itens que carregava.');
}

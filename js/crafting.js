// crafting.js — receitas e bancadas (GDD §2.7)
// Sem equivalente direto no NetHack — sistema novo deste GDD.

import { ITEMS, hasItems, removeItem, addItem } from './items.js';

export const STATIONS = {
  bancada: 'Mesa de Trabalho',
  forja: 'Forja',
  alquimista: 'Alquimista',
  refino: 'Bancada de Refino',
};

export const RECIPES = [
  {
    id: 'refinar_barra',
    name: 'Refinar Barra de Metal',
    station: 'refino',
    inputs: [{ item: 'ore_bruto', qty: 3 }],
    output: { item: 'barra_metal', qty: 1 },
  },
  {
    id: 'racao',
    name: 'Preparar Ração Abissal',
    station: 'alquimista',
    inputs: [{ item: 'fibra_fungica', qty: 2 }],
    output: { item: 'racao_abissal', qty: 1 },
  },
  {
    id: 'lamina',
    name: 'Forjar Lâmina Improvisada',
    station: 'forja',
    inputs: [{ item: 'barra_metal', qty: 2 }],
    output: { item: 'lamina_improvisada', qty: 1 },
  },
  {
    id: 'armadura',
    name: 'Costurar Armadura Fúngica',
    station: 'bancada',
    inputs: [{ item: 'fibra_fungica', qty: 3 }],
    output: { item: 'armadura_fungica', qty: 1 },
  },
  {
    id: 'kit_posto',
    name: 'Montar Kit de Posto Avançado',
    station: 'bancada',
    inputs: [{ item: 'barra_metal', qty: 4 }, { item: 'fibra_fungica', qty: 4 }],
    output: { item: 'kit_posto_avancado', qty: 1 },
  },
];

export function recipesForStation(station) {
  // Bases auxiliares (refúgios) só oferecem refino, por design (GDD §2.5).
  return RECIPES.filter((r) => r.station === station);
}

export function craft(player, recipeId, log) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  if (!hasItems(player, recipe.inputs)) {
    log('Faltam materiais para essa receita.');
    return false;
  }
  for (const req of recipe.inputs) removeItem(player, req.item, req.qty);
  addItem(player, recipe.output.item, recipe.output.qty);
  log(`Você fabricou: ${ITEMS[recipe.output.item].name}.`);
  return true;
}

export function refreshEquipmentStats(player) {
  player.equipment ||= { weapon: null, armor: null };
  const baseDamage = player.baseDamage || [1, 6];
  const weapon = ITEMS[player.equipment.weapon];
  const armor = ITEMS[player.equipment.armor];
  player.damage = [baseDamage[0], baseDamage[1] + (weapon?.damageBonus || 0)];
  player.ac = (player.baseAC ?? 9) + (armor?.acBonus || 0);
}

export function equipCrafted(player, itemId, log) {
  const def = ITEMS[itemId];
  if (!def) return false;

  player.equipment ||= { weapon: null, armor: null };
  if (def.damageBonus) {
    player.equipment.weapon = itemId;
    refreshEquipmentStats(player);
    log(`Você equipa ${def.name} (+${def.damageBonus} dano).`);
    return true;
  }

  if (def.acBonus) {
    player.equipment.armor = itemId;
    refreshEquipmentStats(player);
    log(`Você equipa ${def.name} (AC ${player.ac}).`);
    return true;
  }

  return false;
}

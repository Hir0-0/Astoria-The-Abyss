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

export function equipCrafted(player, itemId, log) {
  const def = ITEMS[itemId];
  if (!def) return;
  if (def.damageBonus) {
    player.damage = [player.damage[0], player.damage[1] + def.damageBonus];
    log(`Você equipa ${def.name} (+${def.damageBonus} dano).`);
  }
  if (def.acBonus) {
    player.ac += def.acBonus; // AC menor = melhor, por convenção NetHack
    log(`Você equipa ${def.name} (AC ${player.ac}).`);
  }
}

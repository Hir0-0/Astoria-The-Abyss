// items.js — catálogo de itens (GDD §2.7, §2.9)

export const ITEMS = {
  ore_bruto: { id: 'ore_bruto', name: 'Minério Bruto', weight: 2 },
  fibra_fungica: { id: 'fibra_fungica', name: 'Fibra Fúngica', weight: 1 },
  barra_metal: { id: 'barra_metal', name: 'Barra de Metal', weight: 3 },
  racao_abissal: { id: 'racao_abissal', name: 'Ração Abissal', weight: 1, food: 900 },
  lamina_improvisada: { id: 'lamina_improvisada', name: 'Lâmina Improvisada', weight: 4, damageBonus: 2 },
  armadura_fungica: { id: 'armadura_fungica', name: 'Armadura Fúngica', weight: 5, acBonus: -1 },
  kit_posto_avancado: { id: 'kit_posto_avancado', name: 'Kit de Posto Avançado', weight: 6 },
};

export function addItem(player, itemId, qty = 1) {
  const entry = player.inventory.find((i) => i.id === itemId);
  if (entry) entry.qty += qty;
  else player.inventory.push({ id: itemId, qty });
  recomputeWeight(player);
}

export function removeItem(player, itemId, qty = 1) {
  const entry = player.inventory.find((i) => i.id === itemId);
  if (!entry || entry.qty < qty) return false;
  entry.qty -= qty;
  if (entry.qty <= 0) player.inventory = player.inventory.filter((i) => i !== entry);
  recomputeWeight(player);
  return true;
}

export function hasItems(player, requirements) {
  return requirements.every((req) => {
    const entry = player.inventory.find((i) => i.id === req.item);
    return entry && entry.qty >= req.qty;
  });
}

export function recomputeWeight(player) {
  let total = 0;
  for (const stack of player.inventory) {
    const def = ITEMS[stack.id];
    if (def) total += def.weight * stack.qty;
  }
  player.survival.weight = total;
}

// survival.js — Fome, Stamina, Peso, Oxigênio, Sanidade (GDD §2.3)
// Fome e Peso são portas conceituais de u.uhunger / near_capacity() do NetHack;
// Stamina, Oxigênio e Sanidade são sistemas novos deste GDD.

export const HUNGER_THRESHOLDS = [
  { max: 1000, label: 'Saciado' },
  { max: 2000, label: 'Normal' },
  { max: 2800, label: 'Faminto' },
  { max: 3200, label: 'Faminto Abissal' }, // andares profundos: fome extra (GDD "Fome Abissal")
];

export function createSurvivalState() {
  return {
    hunger: 1500, // decresce: 0 = saciado...alto = faminto; consumido por turno
    stamina: 100,
    staminaMax: 100,
    weight: 0,
    weightMax: 250,
    oxygen: 100,
    oxygenMax: 100,
    sanity: 100,
    sanityMax: 100,
  };
}

export function hungerLabel(hunger) {
  for (const t of HUNGER_THRESHOLDS) {
    if (hunger <= t.max) return t.label;
  }
  return 'Faminto Abissal';
}

export function burdenLabel(weight, weightMax) {
  const ratio = weight / weightMax;
  if (ratio < 0.5) return 'Leve';
  if (ratio < 0.75) return 'Carregado';
  if (ratio < 1.0) return 'Sobrecarregado';
  return 'Impedido'; // bloqueia fast travel e troca de andar, por GDD §2.9
}

// Chamado a cada turno pelo turnEngine.
export function tickSurvival(state, { inDeepFloor, submerged, log }) {
  state.hunger += 1;
  if (inDeepFloor) state.hunger += 0.5; // Fome Abissal

  if (state.stamina < state.staminaMax) state.stamina = Math.min(state.staminaMax, state.stamina + 0.5);

  if (submerged) {
    const oxygenBeforeTick = state.oxygen;
    state.oxygen = Math.max(0, state.oxygen - 2);
    if (oxygenBeforeTick > 0 && state.oxygen === 0) {
      log('Você ficou sem ar! A falta de oxigênio começará a ferir você.');
    }
  } else if (state.oxygen < state.oxygenMax) {
    state.oxygen = Math.min(state.oxygenMax, state.oxygen + 4);
  }

  if (hungerLabel(state.hunger) === 'Faminto Abissal' && state.sanity > 0) {
    state.sanity = Math.max(0, state.sanity - 0.2);
  }
}

export function onDeath_losesSanity(state, amount, log) {
  state.sanity = Math.max(0, state.sanity - amount);
  if (state.sanity < 30) log('Sua mente treme à beira do abismo...');
}

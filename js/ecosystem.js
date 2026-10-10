// ecosystem.js — biomas e degradação dinâmica (Rain World-like, GDD §2.6/3.6)

export const BIOMES = [
  { name: 'Grutas Luminosas', palette: '#2d4a3a', monsters: ['verme-luz', 'morcego'] },
  { name: 'Cavernas de Musgo', palette: '#3a4a2d', monsters: ['aranha-musgo', 'morcego'] },
  { name: 'Ruínas Fúngicas', palette: '#4a3a2d', monsters: ['fungo-ambulante', 'esporo'] },
  { name: 'Estruturas Decrépitas', palette: '#3a3a4a', monsters: ['autômato quebrado', 'escravo-abissal'] },
  { name: 'Lagos Submersos', palette: '#1f3a4a', monsters: ['enguia-das-profundezas', 'crustáceo blindado'] },
  { name: 'Câmaras de Névoa', palette: '#4a2d3a', monsters: ['sombra-rastejante', 'espreitador'] },
  { name: 'Teias Tecno-Orgânicas', palette: '#2d4a4a', monsters: ['drone corrompido', 'tecido vivo'] },
  { name: 'Abismo Profundo', palette: '#1a1a2a', monsters: ['horror abissal', 'eco perdido'] },
  { name: 'Salões de Cinzas', palette: '#4a4a3a', monsters: ['cinza-ambulante', 'guardião caído'] },
  { name: 'Núcleo de Gehennom', palette: '#2a1a1a', monsters: ['devorador', 'avatar do abismo'] },
];

// Estado de degradação por andar: 0-33 Ignorado, 34-66 Explorado/Escasso, 67-100 Degradado.
export function degradationTier(value) {
  if (value < 34) return 'ignorado';
  if (value < 67) return 'escasso';
  return 'degradado';
}

export function applyEcosystemPressure(level, action) {
  if (!level.ecosystemState) level.ecosystemState = { degradation: 0 };
  // Coleta e combate aumentam a degradação; andares pouco visitados tendem a se regenerar.
  if (action === 'harvest' || action === 'kill') {
    level.ecosystemState.degradation = Math.min(100, level.ecosystemState.degradation + 3);
  } else if (action === 'restore') {
    level.ecosystemState.degradation = Math.max(0, level.ecosystemState.degradation - 10);
  }
}

// Multiplicador de agressividade/mutação por tier — usado por combat.js ao gerar monstros.
export function aggressionMultiplier(level) {
  const tier = degradationTier(level.ecosystemState ? level.ecosystemState.degradation : 0);
  return { ignorado: 1, escasso: 1.3, degradado: 1.8 }[tier];
}

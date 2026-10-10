// main.js — bootstrap, controles acessíveis e log limitado do protótipo Astoria.

import { Game } from './turnEngine.js';
import { createPlayer } from './player.js';
import { render, renderHUD } from './render.js';
import { TILE } from './grid.js';

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const logEl = document.getElementById('log');
const logLines = [];
const MAX_LOG_LINES = 80;

function log(message) {
  logLines.push(String(message));
  if (logLines.length > MAX_LOG_LINES) logLines.splice(0, logLines.length - MAX_LOG_LINES);

  // Usar textContent evita interpretar mensagens como HTML e mantém o histórico limitado.
  const fragment = document.createDocumentFragment();
  logLines.forEach((line, index) => {
    const element = document.createElement('div');
    element.className = `line${index === logLines.length - 1 ? ' new' : ''}`;
    element.textContent = line;
    fragment.appendChild(element);
  });
  logEl.replaceChildren(fragment);
  logEl.scrollTop = logEl.scrollHeight;
}

const player = createPlayer();
const game = new Game(player, log);

log('Você desperta na cidade principal. Use as setas ou o teclado numérico para mover.');
log('Encontre a escada ↓ e use o botão Descer (ou >). No dungeon, use ↑ Subir (ou <).');
log('G pegar/colher · E comer · D descartar · C criar · B base · R descansar · T viajar · I inventário.');

function syncControls() {
  const tile = game.level.at(game.player.x, game.player.y);
  const up = document.getElementById('go-up');
  const down = document.getElementById('go-down');
  up.disabled = game.currentFloor === 0 || tile?.type !== TILE.STAIR_UP;
  down.disabled = game.currentFloor >= 100 || tile?.type !== TILE.STAIR_DOWN;
  up.title = up.disabled ? 'Fique sobre uma escada de subida para usar este comando' : 'Subir para o andar anterior';
  down.title = down.disabled ? 'Fique sobre uma escada de descida para usar este comando' : 'Descer para o próximo andar';
}

function draw() {
  render(ctx, game);
  renderHUD(statsEl, game);
  syncControls();
}

document.querySelectorAll('#controls button[data-key]').forEach((button) => {
  button.addEventListener('click', () => {
    game.handleKey(button.dataset.key);
    draw();
  });
});

const HANDLED_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown',
  '.', '>', '<', 'g', 'e', 'b', 'r', 'c', 't', 'i', 'd', 'Escape',
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);

window.addEventListener('keydown', (event) => {
  // Também aceita o teclado numérico quando o Num Lock está desligado.
  const key = event.code?.startsWith('Numpad') && /Numpad[1-9]/.test(event.code)
    ? event.code.slice(-1)
    : event.key;
  if (!HANDLED_KEYS.has(key)) return;
  event.preventDefault();
  game.handleKey(key);
  draw();
});

draw();

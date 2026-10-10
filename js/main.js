// main.js — bootstrap do protótipo Astoria Web

import { Game } from './turnEngine.js';
import { createPlayer } from './player.js';
import { render, renderHUD } from './render.js';

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const logEl = document.getElementById('log');

const logLines = [];
function log(message) {
  logLines.push(message);
  if (logLines.length > 60) logLines.shift();
  logEl.innerHTML = logLines
    .slice()
    .reverse()
    .map((l, i) => `<div class="line${i === 0 ? ' new' : ''}">${l}</div>`)
    .join('');
}

const player = createPlayer();
const game = new Game(player, log);

log('Você desperta na cidade principal. Setas movem, "." espera, ">"/"<" escadas.');
log('"g" colher/pegar, "e" comer, "c" craftar, "b" construir posto, "r" descansar, "t" viajar, "i" inventário.');

function draw() {
  render(ctx, game);
  renderHUD(statsEl, game);
}
draw();

const HANDLED_KEYS = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '.', '>', '<',
  'g', 'e', 'b', 'r', 'c', 't', 'i', 'Escape',
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
];

window.addEventListener('keydown', (e) => {
  if (!HANDLED_KEYS.includes(e.key)) return;
  e.preventDefault();
  game.handleKey(e.key);
  draw();
});

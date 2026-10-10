// turnEngine.js — núcleo do loop turn-based (GDD §Core Loop)
// Cada ação do jogador consome um turno; depois disso monstros agem e o estado
// de sobrevivência avança. Equivalente conceitual ao moveloop() de allmain.c.

import { TILE, STATION_TILE_TO_ID } from './grid.js';
import { playerAttack, monsterAttack, rollMonsterLoot } from './combat.js';
import { tickSurvival, burdenLabel, hungerLabel } from './survival.js';
import { applyEcosystemPressure } from './ecosystem.js';
import { generateFloor, generateCity } from './mapgen.js';
import { addItem, removeItem, ITEMS, recomputeWeight } from './items.js';
import { recipesForStation, craft, equipCrafted } from './crafting.js';
import { buildBase, restAndSend, listTravelTargets, fastTravel } from './bases.js';
import { createClone, collectCloneLoot, respawnAtCity } from './clone.js';

// Apenas setas: evita colisão com as teclas de ação (g/e/b/r/c/t/i) de crafting e bases.
const DIRECTIONS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

export class Game {
  constructor(player, log) {
    this.player = player;
    this.log = log;
    this.floors = new Map();
    this.bases = []; // postos avançados construídos pelo jogador (GDD §2.5)
    this.currentFloor = 0;
    this.level = this._getOrCreateFloor(0);
    this.uiMode = null; // null | 'craft' | 'travel' | 'inventory'
    this.menuOptions = [];
    this._placePlayerAtStairUp();
  }

  _getOrCreateFloor(n) {
    if (!this.floors.has(n)) {
      this.floors.set(n, n === 0 ? generateCity() : generateFloor(n, { sector: Math.floor(n / 20) + 1 }));
    }
    return this.floors.get(n);
  }

  _placePlayerAtStairUp() {
    const stair = this.level.stairUp || { x: 2, y: 2 };
    this.player.x = stair.x;
    this.player.y = stair.y;
    this.level.computeFOV(this.player.x, this.player.y, 7);
  }

  handleKey(key) {
    if (!this.player.alive) return;

    if (this.uiMode) {
      this._handleMenuKey(key);
      return;
    }

    if (key === '.') { this._endTurn(); return; } // esperar
    if (key === '>') { this._useStairs(TILE.STAIR_DOWN); return; }
    if (key === '<') { this._useStairs(TILE.STAIR_UP); return; }
    if (key === 'g') { this._harvestOrPickup(); return; }
    if (key === 'e') { this._eat(); return; }
    if (key === 'b') { buildBase(this, this.log); return; }
    if (key === 'r') { restAndSend(this, this.log); return; }
    if (key === 'c') { this._openCraftMenu(); return; }
    if (key === 't') { this._openTravelMenu(); return; }
    if (key === 'i') { this._openInventory(); return; }

    const dir = DIRECTIONS[key];
    if (!dir) return;

    const [dx, dy] = dir;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    if (burdenLabel(this.player.survival.weight, this.player.survival.weightMax) === 'Impedido') {
      this.log('Você está impedido pelo peso — descarte algo ou volte à superfície.');
      return;
    }

    const monster = this.level.monsterAt(nx, ny);
    if (monster) {
      playerAttack(this.player, monster, this.log);
      if (monster.hp <= 0) {
        this.level.at(nx, ny).monster = null;
        this.level.monsters = this.level.monsters.filter((m) => m !== monster);
        if (monster.isClone) {
          collectCloneLoot(monster, this.player, this.log);
          if (this.level.bones && this.level.bones.cloneId === monster.id) this.level.bones = null;
          recomputeWeight(this.player);
        } else {
          applyEcosystemPressure(this.level, 'kill');
          const loot = rollMonsterLoot();
          if (loot) {
            this.level.at(nx, ny).items.push(loot);
            this.log(`${monster.name} deixou cair algo — "g" para pegar.`);
          }
        }
      }
      this._endTurn();
      return;
    }

    if (this.level.isWalkable(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
      this._endTurn();
    }
  }

  _harvestOrPickup() {
    const tile = this.level.at(this.player.x, this.player.y);
    if (tile.items && tile.items.length > 0) {
      const dropped = tile.items.pop();
      addItem(this.player, dropped.id, dropped.qty);
      this.log(`Você pega: ${ITEMS[dropped.id].name}.`);
      this._endTurn();
      return;
    }
    if (tile.type === TILE.ORE_NODE || tile.type === TILE.HERB_NODE) {
      const itemId = tile.type === TILE.ORE_NODE ? 'ore_bruto' : 'fibra_fungica';
      addItem(this.player, itemId, 1);
      tile.type = TILE.FLOOR;
      applyEcosystemPressure(this.level, 'harvest');
      this.log(`Você coleta: ${ITEMS[itemId].name}.`);
      this._endTurn();
      return;
    }
    this.log('Não há nada para colher ou pegar aqui.');
  }

  _eat() {
    const entry = this.player.inventory.find((i) => i.id === 'racao_abissal');
    if (!entry) {
      this.log('Você não tem comida.');
      return;
    }
    if (hungerLabel(this.player.survival.hunger) === 'Saciado') {
      this.log('Você não está com fome.');
      return;
    }
    removeItem(this.player, 'racao_abissal', 1);
    this.player.survival.hunger = Math.max(0, this.player.survival.hunger - ITEMS.racao_abissal.food);
    this.log('Você come uma Ração Abissal.');
    this._endTurn();
  }

  _openCraftMenu() {
    const tile = this.level.at(this.player.x, this.player.y);
    const stationId = STATION_TILE_TO_ID[tile.type];
    if (!stationId) {
      this.log('Não há uma estação de trabalho aqui.');
      return;
    }
    const recipes = recipesForStation(stationId);
    if (recipes.length === 0) {
      this.log('Essa estação não tem receitas disponíveis.');
      return;
    }
    this.uiMode = 'craft';
    this.menuOptions = recipes.map((r) => ({
      label: `${r.name} (${r.inputs.map((i) => `${i.qty}x ${ITEMS[i.item].name}`).join(', ')})`,
      recipeId: r.id,
    }));
    this.log('Escolha uma receita (número) ou Esc para cancelar:');
    this.menuOptions.forEach((o, i) => this.log(`${i + 1}. ${o.label}`));
  }

  _openTravelMenu() {
    const targets = listTravelTargets(this);
    this.uiMode = 'travel';
    this.menuOptions = targets.map((t, i) => ({ label: t.name, index: i }));
    this.log('Para onde viajar (número) ou Esc para cancelar:');
    this.menuOptions.forEach((o, i) => this.log(`${i + 1}. ${o.label}`));
  }

  _openInventory() {
    if (this.player.inventory.length === 0) {
      this.log('Seu inventário está vazio.');
      return;
    }
    this.log(`Inventário (peso ${Math.round(this.player.survival.weight)}/${this.player.survival.weightMax}):`);
    for (const stack of this.player.inventory) {
      this.log(`- ${ITEMS[stack.id].name} x${stack.qty}`);
    }
  }

  _handleMenuKey(key) {
    if (key === 'Escape') {
      this.uiMode = null;
      this.menuOptions = [];
      this.log('Cancelado.');
      return;
    }
    const n = parseInt(key, 10);
    if (!n || n < 1 || n > this.menuOptions.length) return;
    const option = this.menuOptions[n - 1];

    if (this.uiMode === 'craft') {
      const crafted = craft(this.player, option.recipeId, this.log);
      if (crafted) {
        const recipe = recipesForStation(STATION_TILE_TO_ID[this.level.at(this.player.x, this.player.y).type])
          .find((r) => r.id === option.recipeId);
        if (recipe && (ITEMS[recipe.output.item].damageBonus || ITEMS[recipe.output.item].acBonus)) {
          equipCrafted(this.player, recipe.output.item, this.log);
        }
        this._endTurn();
      }
    } else if (this.uiMode === 'travel') {
      fastTravel(this, option.index, this.log);
      this._endTurn();
    }
    this.uiMode = null;
    this.menuOptions = [];
  }

  _useStairs(type) {
    const tile = this.level.at(this.player.x, this.player.y);
    if (!tile || tile.type !== type) {
      this.log('Não há escadas aqui.');
      return;
    }
    const delta = type === TILE.STAIR_DOWN ? 1 : -1;
    const nextFloor = this.currentFloor + delta;
    if (nextFloor < 0) { this.log('Você está na superfície.'); return; }
    const previousBiome = this.level.biome.name;
    this.currentFloor = nextFloor;
    this.level = this._getOrCreateFloor(nextFloor);
    if (delta === 1) {
      const up = this.level.stairUp || { x: 2, y: 2 };
      this.player.x = up.x; this.player.y = up.y;
    } else {
      const down = this.level.stairDown || { x: 2, y: 2 };
      this.player.x = down.x; this.player.y = down.y;
    }
    this.level.computeFOV(this.player.x, this.player.y, 7);
    this.log(this.currentFloor === 0 ? 'Você retorna à cidade principal.' : `Você desce para o andar ${this.currentFloor}.`);
    if (this.currentFloor > 0 && this.level.biome.name !== previousBiome) {
      this.log(`Você entra em: ${this.level.biome.name}.`);
    }
    this._endTurn();
  }

  _endTurn() {
    // IA simples de monstros: perseguem se agressivos e próximos, senão ficam parados.
    for (const m of [...this.level.monsters]) {
      if (m.hp <= 0) continue;
      const dx = this.player.x - m.x;
      const dy = this.player.y - m.y;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist === 1) {
        monsterAttack(m, this.player, this.log);
        continue;
      }
      if (m.aggressive && dist <= 6) {
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);
        const nx = m.x + stepX;
        const ny = m.y + stepY;
        if (this.level.isWalkable(nx, ny) && !this.level.monsterAt(nx, ny)) {
          this.level.at(m.x, m.y).monster = null;
          m.x = nx; m.y = ny;
          this.level.at(nx, ny).monster = m;
        }
      }
    }

    const submerged = this.level.biome.name === 'Lagos Submersos' && this.currentFloor >= 40;
    tickSurvival(this.player.survival, { inDeepFloor: this.currentFloor >= 60, submerged, log: this.log });

    if (this.player.survival.oxygen <= 0) this.player.hp -= 1;

    this.level.computeFOV(this.player.x, this.player.y, 7);

    if (this.player.hp <= 0 && this.player.alive) {
      this._onPlayerDeath();
    }
  }

  _onPlayerDeath() {
    this.log('Você morreu. Um Clone com seus itens surge neste local...');
    createClone(this.player, this.level); // captura o inventário atual antes de limpá-lo
    respawnAtCity(this.player, this.log);
    this.currentFloor = 0;
    this.level = this._getOrCreateFloor(0);
    this._placePlayerAtStairUp();
  }
}

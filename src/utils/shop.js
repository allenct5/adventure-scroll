// shop.js — Shop data, open/close, render, and purchase logic.

import { RARITY, BASE_SWORD_DAMAGE, BASE_ARROW_DAMAGE, BASE_ORB_DAMAGE, rarityDamage } from '../core/constants.js';
import { player, playerClass, setShopOpen, setGameState, setMouseDown, setLastTime } from '../core/state.js';
import { updateHUD } from './hud.js';

export const WIP_ITEMS = new Set(['phoenix', 'legendSword', 'legendBow', 'legendStaff', 'godMode']);

export const SHOP_ITEMS = [
  { id: 'pu_speed',    name: 'Swift Draught',      cost: 2,   icon: '⚡', limit: 1,   tooltip: 'Doubles your attack speed for 10 seconds.' },
  { id: 'maxHp1',      name: 'Vitality Tonic',     cost: 5,   icon: '❤️', limit: 1,   tooltip: 'Increases your maximum HP by 10, and heals you for 20 HP right now.' },
  { id: 'swordUp1',    name: 'Sharpen Blade',       cost: 10,  icon: '⚔️', limit: 1,   tooltip: 'dynamic_sword' },
  { id: 'bowUp1',      name: 'Recurve String',      cost: 10,  icon: '🏹', limit: 1,   tooltip: 'dynamic_bow' },
  { id: 'staffUp1',    name: 'Arcane Focus',        cost: 10,  icon: '🧙', limit: 1,   tooltip: 'dynamic_staff' },
  { id: 'fullHeal',    name: 'Elixir of Life',      cost: 10,  icon: '🍶', limit: 1,   tooltip: 'Restores your HP to full immediately.' },
  { id: 'fortify',     name: 'Iron Skin',           cost: 12,  icon: '🛡️', limit: 1,   tooltip: 'Reduces all incoming damage by 25% for the duration of the next level.' },
  { id: 'berserker',   name: 'Berserker Rage',      cost: 15,  icon: '👹', limit: 1,   tooltip: 'Increases all damage you deal by 30% for the duration of the next level.' },
  { id: 'soulBind',    name: 'Soul Bind',           cost: 20,  icon: '💀', limit: 1,   tooltip: 'Binds your soul to life. If you take lethal damage, you are instantly revived on the nearest ground with 50% of your max HP, surrounded by a glowing halo.' },
  { id: 'phoenix',     name: 'Phoenix Feather',     cost: 999, icon: '🔥', limit: 1,   tooltip: 'WORK IN PROGRESS' },
  { id: 'legendSword', name: 'Excalibur Shard',     cost: 999, icon: '⚔️', limit: 1,   tooltip: 'WORK IN PROGRESS' },
  { id: 'legendBow',   name: "Artemis' Gift",       cost: 999, icon: '🏹', limit: 1,   tooltip: 'WORK IN PROGRESS' },
  { id: 'legendStaff', name: "Merlin's Tome",       cost: 999, icon: '🧙', limit: 1,   tooltip: 'WORK IN PROGRESS' },
  { id: 'godMode',     name: "Merlin's Blessing",   cost: 999, icon: '🧙', limit: 1,   tooltip: 'WORK IN PROGRESS' },
];

export const shopPurchased = {};
export function clearShopPurchased() { Object.keys(shopPurchased).forEach(k => delete shopPurchased[k]); }

// Imported lazily in openShop/closeShop to avoid circular deps with main.js gameLoop
let _gameLoop = null;
export function registerGameLoop(fn) { _gameLoop = fn; }

export function openShop() {
  setShopOpen(true);
  setMouseDown(false);
  document.getElementById('gameCanvas').classList.remove('merchant-hover');
  document.getElementById('shop-overlay').classList.add('open');
  renderShopGrid();
  document.getElementById('shop-msg').textContent = '';
  setGameState('paused');
}

export function closeShop() {
  setShopOpen(false);
  document.getElementById('shop-overlay').classList.remove('open');
  setGameState('playing');
  setLastTime(0);
  if (_gameLoop) requestAnimationFrame(_gameLoop);
}

export function renderShopGrid() {
  document.getElementById('shop-coin-count').textContent = player.coins;
  document.getElementById('shop-hp-count').textContent   = player.hp;
  document.getElementById('shop-hp-max').textContent     = player.maxHp;
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';

  for (const item of SHOP_ITEMS) {
    if (['swordUp1'].includes(item.id)            && playerClass !== 'warrior') continue;
    if (['bowUp1'].includes(item.id)              && playerClass !== 'archer')  continue;
    if (['staffUp1'].includes(item.id)            && playerClass !== 'mage')    continue;

    const purchased  = shopPurchased[item.id] || 0;
    const soldOut    = purchased >= item.limit;
    const canAfford  = !soldOut && player.coins >= item.cost;
    const borderColor = item.cost >= 40 ? '#ffdd00'
                      : item.cost >= 30 ? '#ff8800'
                      : item.cost >= 20 ? '#4488ff'
                      : item.cost >= 10 ? '#44dd44'
                      : '#aaaaaa';

    const cell = document.createElement('div');
    cell.className = 'shop-cell' + (soldOut ? ' sold-out' : canAfford ? '' : ' cant-afford');
    cell.style.borderColor = borderColor;
    cell.style.boxShadow   = soldOut ? 'none' : `0 0 6px ${borderColor}55`;

    let tooltipHTML = item.tooltip;
    if (item.id === 'swordUp1') {
      const cur = rarityDamage(BASE_SWORD_DAMAGE, player.swordRarity);
      const next = rarityDamage(BASE_SWORD_DAMAGE, Math.min(5, player.swordRarity + 1));
      const pct  = Math.round(((next - cur) / cur) * 100);
      tooltipHTML = `Increases sword damage per hit by ${pct}%.<br><span style="color:#ff5555;text-decoration:line-through">${cur}</span>&nbsp;→&nbsp;<strong style="color:#44ee66">${next}</strong>`;
    } else if (item.id === 'bowUp1') {
      const cur = rarityDamage(BASE_ARROW_DAMAGE, player.bowRarity);
      const next = rarityDamage(BASE_ARROW_DAMAGE, Math.min(5, player.bowRarity + 1));
      const pct  = Math.round(((next - cur) / cur) * 100);
      tooltipHTML = `Increases bow damage per arrow by ${pct}%.<br><span style="color:#ff5555;text-decoration:line-through">${cur}</span>&nbsp;→&nbsp;<strong style="color:#44ee66">${next}</strong>`;
    } else if (item.id === 'staffUp1') {
      const cur = rarityDamage(BASE_ORB_DAMAGE, player.staffRarity);
      const next = rarityDamage(BASE_ORB_DAMAGE, Math.min(5, player.staffRarity + 1));
      const pct  = Math.round(((next - cur) / cur) * 100);
      tooltipHTML = `Increases magic missile damage by ${pct}%.<br><span style="color:#ff5555;text-decoration:line-through">${cur}</span>&nbsp;→&nbsp;<strong style="color:#44ee66">${next}</strong>`;
    }

    const remaining = item.limit - purchased;
    const qtyDisplay = soldOut ? 'x0' : `x${remaining}`;

    cell.innerHTML = `
      <span class="shop-icon">${item.icon}</span>
      <span class="shop-name">${item.name}</span>
      <span class="shop-qty" style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:${soldOut ? '#555566' : '#aaaacc'};letter-spacing:0.05em;">${qtyDisplay}</span>
      <span class="shop-cost">${soldOut ? '' : '🪙 ' + item.cost}</span>
      ${soldOut ? '<span class="sold-out-label">SOLD OUT</span>' : ''}
      <div class="shop-tooltip">${tooltipHTML}</div>
    `;
    if (canAfford) cell.addEventListener('click', () => buyItem(item));
    grid.appendChild(cell);
  }
}

export function buyItem(item) {
  const purchased = shopPurchased[item.id] || 0;
  if (purchased >= item.limit || player.coins < item.cost) return;

  if (WIP_ITEMS.has(item.id)) {
    document.getElementById('shop-msg').textContent = '⚙️ Coming soon!';
    return;
  }

  player.coins -= item.cost;
  shopPurchased[item.id] = purchased + 1;
  const msg = document.getElementById('shop-msg');

  switch (item.id) {
    case 'swordUp1':    player.swordRarity = Math.min(5, player.swordRarity + 1); msg.textContent = `Blade sharpened to ${RARITY[player.swordRarity].name}!`; break;
    case 'bowUp1':      player.bowRarity   = Math.min(5, player.bowRarity   + 1); msg.textContent = `Bow upgraded to ${RARITY[player.bowRarity].name}!`;       break;
    case 'staffUp1':    player.staffRarity = Math.min(5, player.staffRarity + 1); msg.textContent = `Staff focused to ${RARITY[player.staffRarity].name}!`;   break;
    case 'legendSword': player.swordRarity = 5; msg.textContent = 'Sword ascends to Legendary!'; break;
    case 'legendBow':   player.bowRarity   = 5; msg.textContent = 'Bow ascends to Legendary!';   break;
    case 'legendStaff': player.staffRarity = 5; msg.textContent = 'Staff ascends to Legendary!'; break;
    case 'fortify':     player.fortified   = true; msg.textContent = 'Iron Skin — 25% less damage this level!'; break;
    case 'maxHp1':      player.maxHp += 10; player.hp = Math.min(player.maxHp, player.hp + 20); msg.textContent = '+10 Max HP, +20 HP healed!'; break;
    case 'fullHeal':    player.hp = player.maxHp; msg.textContent = 'Fully healed!'; break;
    case 'soulBind':    player.revive = true; msg.textContent = 'Soul Bound — you will rise once!'; break;
    case 'pu_speed':    player.attackSpeedTimer = Math.max(player.attackSpeedTimer, 60 * 10); msg.textContent = 'Attack speed doubled for 10s!'; break;
    case 'phoenix':     player.hp = player.maxHp; player.invincible = 180; msg.textContent = 'Reborn in flame!'; break;
    case 'berserker':   player.damageMult = (player.damageMult || 1) * 1.3; msg.textContent = 'Berserker Rage — +30% damage this level!'; break;
    case 'godMode':     player.swordRarity = Math.min(5, player.swordRarity+1); player.bowRarity = Math.min(5, player.bowRarity+1); player.maxHp += 20; player.hp = Math.min(player.maxHp, player.hp+20); msg.textContent = "Merlin's Blessing descends!"; break;
  }
  updateHUD();
  renderShopGrid();
}

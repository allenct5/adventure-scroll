// hud.js — All DOM/HUD updates and message display.

import { RARITY } from '../core/constants.js';
import { player, playerClass } from '../core/state.js';

const MAX_MANA = 25;

export function updateHUD() {
  const hpPct = Math.max(0, player.hp / player.maxHp) * 100;
  document.getElementById('health-bar').style.width       = `${hpPct}%`;
  document.getElementById('health-bar-text').textContent  = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;
  document.getElementById('health-bar-regen').textContent = player.hpRegen > 0 ? `+${player.hpRegen} HP/s` : '+0 HP/s';
  
  const overshieldPct = Math.max(0, player.overshield / player.maxOvershield) * 100;
  document.getElementById('overshield-bar').style.width       = `${overshieldPct}%`;
  document.getElementById('overshield-bar-text').textContent  = Math.max(0, Math.ceil(player.overshield));

  const soulActive = !!player.revive;
  document.getElementById('soul-bind-label').style.display = soulActive ? 'block' : 'none';
  document.getElementById('health-bar-bg').classList.toggle('soul-bind-active', soulActive);

  const w       = player.weapon;
  const isSword = w === 'sword';
  const isStaff = w === 'staff';
  document.getElementById('weapon-name').textContent = isSword ? 'SWORD' : isStaff ? 'STAFF' : 'BOW';

  const manaWrap = document.getElementById('mana-bar-wrap');
  if (playerClass === 'mage') {
    manaWrap.style.display = 'flex';
    const manaPct = Math.max(0, player.mana / MAX_MANA) * 100;
    document.getElementById('mana-bar').style.width      = `${manaPct}%`;
    document.getElementById('mana-bar-text').textContent = `${Math.max(0, Math.ceil(player.mana))}/${MAX_MANA}`;
    const baseManaRegen = 0.5; // 0.5 mana/s base
    const purchasedManaRegen = player.manaRegen / 10; // convert from per-10s to per-s
    const totalManaRegen = baseManaRegen + purchasedManaRegen;
    document.getElementById('mana-bar-regen').textContent = `+${totalManaRegen.toFixed(1)}/s`;
  } else {
    manaWrap.style.display = 'none';
  }

  const bombDisplay = document.getElementById('bomb-display');
  if (playerClass === 'archer') {
    bombDisplay.style.display = 'block';
    document.getElementById('bomb-count').textContent = player.bombs;
  } else {
    bombDisplay.style.display = 'none';
  }

  const rarity = RARITY[isSword ? player.swordRarity : isStaff ? player.staffRarity : player.bowRarity];
  const rarEl  = document.getElementById('weapon-rarity');
  rarEl.textContent    = `[${rarity.name}]`;
  rarEl.style.color    = rarity.color;
  rarEl.style.textShadow = `0 0 8px ${rarity.color}88`;

  document.getElementById('coin-count').textContent = player.coins;
}

export function showMessage(main, sub, color, durationMs = null) {
  const mt = document.getElementById('message-text');
  const ms = document.getElementById('message-sub');
  mt.textContent       = main;
  mt.style.color       = color || '#ff4444';
  mt.style.textShadow  = `0 0 30px ${color || '#ff4444'}`;
  ms.textContent       = sub;
  mt.style.opacity     = '1';
  ms.style.opacity     = '1';
  
  // Auto-hide after specified duration
  if (durationMs !== null) {
    setTimeout(hideMessage, durationMs);
  }
}

export function hideMessage() {
  document.getElementById('message-text').style.opacity = '0';
  document.getElementById('message-sub').style.opacity  = '0';
}

export function showGameOver(subText) {
  document.getElementById('game-over-sub').textContent = subText;
  document.getElementById('game-over').classList.add('visible');
}

export function hideGameOver() {
  document.getElementById('game-over').classList.remove('visible');
}

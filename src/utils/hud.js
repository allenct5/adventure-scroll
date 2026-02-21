// hud.js — All DOM/HUD updates and message display.

import { RARITY } from './constants.js';
import { player, playerClass } from './state.js';

export function updateHUD() {
  const hpPct = Math.max(0, player.hp / player.maxHp) * 100;
  document.getElementById('health-bar').style.width       = `${hpPct}%`;
  document.getElementById('health-bar-text').textContent  = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;

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
    const maxMana = 25;
    const manaPct = Math.max(0, player.mana / maxMana) * 100;
    document.getElementById('mana-bar').style.width      = `${manaPct}%`;
    document.getElementById('mana-bar-text').textContent = `${Math.max(0, Math.ceil(player.mana))}/${maxMana}`;
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

export function showMessage(main, sub, color) {
  const mt = document.getElementById('message-text');
  const ms = document.getElementById('message-sub');
  mt.textContent       = main;
  mt.style.color       = color || '#ff4444';
  mt.style.textShadow  = `0 0 30px ${color || '#ff4444'}`;
  ms.textContent       = sub;
  mt.style.opacity     = '1';
  ms.style.opacity     = '1';
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

// main.js — Game loop, input handling, game-state transitions, UI wiring.

import { W, H } from './constants.js';
import { merchant } from '../scenes/level.js';
import {
  gameState, setGameState, godMode, setGodMode,
  player, setPlayer, playerClass, setPlayerClass,
  cameraX, setLastTime, lastTime, setZoneCount, setDifficultyLevel,
  zoneCount, difficultyLevel,
  keys, setMouseDown, setMouseRightDown, mousePos,
  shopOpen, clearCombatArrays, clearGroundHistory, resetDropTimes, clearParticles,
} from './state.js';
import { createPlayer, updatePlayer, drawPlayer, drawSwordSwing, drawAimIndicator, killPlayer, registerRespawnFn, registerCheckpointFn } from '../entities/player.js';
import { populateEnemies, updateEnemies, drawEnemies } from '../entities/enemies.js';
import { drawNpcMerlin } from '../entities/npc.js';
import { updateArrows, updatePlayerOrbs, updateFireballs, updateBombs, drawProjectiles } from '../utils/projectiles.js';
import { updatePowerups, drawPowerups } from '../utils/powerups.js';
import { updateCoins, drawCoins } from '../utils/coins.js';
import { updateParticles, drawParticles } from '../utils/particles.js';
import { updateHUD, showMessage, hideMessage, showGameOver, hideGameOver } from '../utils/hud.js';
import { openShop, closeShop, buyItem, clearShopPurchased, registerGameLoop } from '../utils/shop.js';
import { applyZoneBuffs } from '../utils/powerups.js';
import { drawBackground, drawPlatforms, drawHazards, drawCheckpoint, drawMerchant, drawBuffIcons, drawDebugStats, buffIconPositions } from './renderer.js';
import { canvas, ctx } from '../canvas.js';
import { updateMusicForDifficulty, stopMusic, setMusicVolume, setGameVolume, playSfx } from '../utils/audio.js';
import { loadSprites } from '../utils/sprites.js';

// Give shop a reference to gameLoop (avoids circular import at module parse time)
registerGameLoop(gameLoop);

// Give player.js the checkpoint callback
registerCheckpointFn(triggerCheckpoint);
// Give player.js the respawn callback
registerRespawnFn(respawnPlayer);

// --- LEVEL RESET ---
let levelResetTimer = 0;

function drawScene() {
  ctx.clearRect(0, 0, W, H);
  drawBackground(); drawPlatforms(); drawHazards(); drawCheckpoint(); drawNpcMerlin(); drawMerchant();
  drawPowerups(); drawCoins(); drawSwordSwing(); drawAimIndicator();
  drawPlayer(); drawEnemies(); drawProjectiles(); drawParticles();
  applyVignette();
  drawBuffIcons();
  if (statsActive) drawDebugStats();
}

function triggerCheckpoint() {
  if (gameState === 'checkpoint') return;
  setGameState('checkpoint');
  playSfx('levelup');
  showMessage('ONWARD!', 'Level Complete — Journey Forth...', '#44ff88');
  levelResetTimer = 180;
}

function resetLevel() {
  setGameState('playing');
  playSfx('checkpoint_continue');
  setZoneCount(zoneCount + 1);
  setDifficultyLevel(Math.min(5, 1 + Math.floor((zoneCount + 1) / 3)));
  applyZoneBuffs();

  const carry = {
    hp: player.hp, maxHp: player.maxHp, ammo: player.ammo, coins: player.coins,
    weapon: player.weapon, swordRarity: player.swordRarity, bowRarity: player.bowRarity,
    staffRarity: player.staffRarity, mana: player.mana,
    overshield: player.overshield, maxOvershield: player.maxOvershield,
    fortified: player.fortified && !player.fortifiedUsed,
    fortifiedUsed: player.fortified && !player.fortifiedUsed,
    revive: player.revive || false, regenActive: player.regenActive || false,
    attackSpeedTimer: player.attackSpeedTimer, attackSpeedTimerMax: player.attackSpeedTimerMax || 0,
    bombs: player.bombs,
    damageMult: (player.damageMult > 1 && !player.berserkerUsed) ? player.damageMult : 1,
    berserkerUsed: (player.damageMult > 1 && !player.berserkerUsed),
  };

  setPlayer(createPlayer());
  Object.assign(player, carry);

  clearCombatArrays();
  clearParticles();
  populateEnemies();
  resetDropTimes();
  clearGroundHistory();
  clearShopPurchased();
  document.getElementById('difficulty-value').textContent = difficultyLevel;
  updateHUD();
  hideMessage();
  updateMusicForDifficulty(difficultyLevel);
}

function respawnPlayer() {
  clearGroundHistory();
  setPlayer(createPlayer());
  setZoneCount(0); setDifficultyLevel(1);
  document.getElementById('difficulty-value').textContent = '1';
  clearCombatArrays();
  clearParticles();
  populateEnemies();
  resetDropTimes();
  clearShopPurchased();
  updateHUD();
  hideMessage();
  setGameState('playing');
  updateMusicForDifficulty(1);
}

// --- CLASS SELECT ---
function selectClass(cls) {
  setPlayerClass(cls);
  document.getElementById('class-select').style.display = 'none';
  setPlayer(createPlayer());
  populateEnemies();
  setGameState('playing');
  updateHUD();
  updateMusicForDifficulty(difficultyLevel);
}

// --- GAME LOOP ---
function gameLoop(timestamp = 0) {
  const dt = lastTime === 0 ? 1 : Math.min((timestamp - lastTime) * 60 / 1000, 4);
  setLastTime(timestamp);

  if (gameState === 'classSelect') { requestAnimationFrame(gameLoop); return; }

  if (gameState === 'dead') {
    drawScene();
    requestAnimationFrame(gameLoop); return;
  }

  if (gameState === 'paused') {
    drawScene();
    requestAnimationFrame(gameLoop); return;
  }

  if (gameState === 'checkpoint') {
    levelResetTimer -= dt;
    if (levelResetTimer <= 0) resetLevel();
  }

  updatePlayer(dt);
  if (gameState === 'playing') {
    updateEnemies(dt);
    updateArrows(dt);
    updateBombs(dt);
    updatePlayerOrbs(dt);
    updateFireballs(dt);
    updatePowerups(dt);
    updateCoins(dt);
    updateHUD();
  }
  updateParticles(dt);

  drawScene();

  requestAnimationFrame(gameLoop);
}

function applyVignette() {
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
}

// --- INPUT ---
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (gameState === 'playing' || gameState === 'checkpoint') {
      setGameState('paused');
      document.getElementById('pause-overlay').classList.add('visible');
    } else if (gameState === 'paused') {
      setGameState('playing');
      document.getElementById('pause-overlay').classList.remove('visible');
      setLastTime(0);
    }
    return;
  }
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousedown', e => {
  if (e.button === 2) { if (!shopOpen) setMouseRightDown(true); return; }
  if (e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const msx = merchant.x - cameraX;
  if (mx >= msx && mx <= msx + merchant.w && my >= merchant.y && my <= merchant.y + merchant.h) {
    const playerCx   = player.x + player.w / 2;
    const merchantCx = merchant.x + merchant.w / 2;
    const playerFeetY = player.y + player.h;
    const proximityX = Math.abs(playerCx - merchantCx) < 120;
    const proximityY = Math.abs(playerFeetY - (merchant.y + merchant.h)) < 120;
    if (proximityX && proximityY) { openShop(); return; }
  }
  if (!shopOpen) setMouseDown(true);
});
canvas.addEventListener('mouseup', e => {
  if (e.button === 0) setMouseDown(false);
  if (e.button === 2) setMouseRightDown(false);
});
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
  const msx = merchant.x - cameraX;
  const overMerchant = mousePos.x >= msx && mousePos.x <= msx + merchant.w &&
                       mousePos.y >= merchant.y && mousePos.y <= merchant.y + merchant.h;
  canvas.classList.toggle('merchant-hover', overMerchant);
  
  // Check if hovering over a buff icon
  const tooltip = document.getElementById('buff-tooltip');
  let hoveredBuff = null;
  for (const buff of buffIconPositions) {
    if (mousePos.x >= buff.x && mousePos.x <= buff.x + buff.width &&
        mousePos.y >= buff.y && mousePos.y <= buff.y + buff.height) {
      hoveredBuff = buff;
      break;
    }
  }
  
  if (hoveredBuff) {
    tooltip.textContent = hoveredBuff.description;
    tooltip.classList.remove('hidden');
    const iconCenterX = rect.left + hoveredBuff.x + hoveredBuff.width / 2;
    const tooltipY = rect.top + hoveredBuff.y + hoveredBuff.height + 8;
    tooltip.style.left = iconCenterX + 'px';
    tooltip.style.top = tooltipY + 'px';
  } else {
    tooltip.classList.add('hidden');
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// --- UI BUTTONS ---
document.getElementById('card-warrior').addEventListener('click', () => { playSfx('button_press'); selectClass('warrior'); });
document.getElementById('card-archer').addEventListener('click',  () => { playSfx('button_press'); selectClass('archer'); });
document.getElementById('card-mage').addEventListener('click',    () => { playSfx('button_press'); selectClass('mage'); });
document.getElementById('shop-close').addEventListener('click',   closeShop);

document.getElementById('go-retry').addEventListener('click', () => {
  playSfx('button_press'); hideGameOver(); respawnPlayer();
});
document.getElementById('go-menu').addEventListener('click', () => {
  playSfx('button_press'); hideGameOver(); returnToMenu();
});
document.getElementById('pause-menu').addEventListener('click', () => {
  playSfx('button_press');
  document.getElementById('pause-overlay').classList.remove('visible');
  returnToMenu();
});

function returnToMenu() {
  setGameState('classSelect'); setPlayerClass(null); setPlayer(createPlayer());
  clearCombatArrays(); clearParticles(); resetDropTimes(); clearGroundHistory(); clearShopPurchased();
  setZoneCount(0); setDifficultyLevel(1); setGodMode(false);
  document.getElementById('difficulty-value').textContent = '1';
  document.getElementById('cheat-godmode').classList.remove('active');
  document.getElementById('cheat-weapon-upgrade').classList.remove('active');
  document.getElementById('cheat-stats').classList.remove('active');
  statsActive = false;
  document.getElementById('cheat-menu').classList.remove('open');
  updateHUD();
  stopMusic();
  document.getElementById('class-select').style.display = 'flex';
  setLastTime(0);
}

// --- PAUSE VOLUME SLIDERS ---
document.getElementById('game-volume-slider').addEventListener('input', e => {
  setGameVolume(parseFloat(e.target.value));
});
document.getElementById('music-volume-slider').addEventListener('input', e => {
  setMusicVolume(parseFloat(e.target.value));
});

// --- PAUSE / CHEAT MENU ---
document.getElementById('pause-cheat-toggle').addEventListener('click', () => {
  playSfx('button_press');
  document.getElementById('cheat-menu').classList.toggle('open');
});
document.getElementById('cheat-godmode').addEventListener('click', () => {
  playSfx('button_press');
  setGodMode(!godMode);
  document.getElementById('cheat-godmode').classList.toggle('active', godMode);
});
let statsActive = false;
document.getElementById('cheat-stats').addEventListener('click', () => {
  playSfx('button_press');
  statsActive = !statsActive;
  document.getElementById('cheat-stats').classList.toggle('active', statsActive);
});
document.getElementById('cheat-weapon-upgrade').addEventListener('click', () => {
  playSfx('button_press');
  const w = player.weapon;
  if      (w === 'sword') player.swordRarity = Math.min(5, player.swordRarity + 1);
  else if (w === 'bow')   player.bowRarity   = Math.min(5, player.bowRarity   + 1);
  else if (w === 'staff') player.staffRarity = Math.min(5, player.staffRarity + 1);
  updateHUD();
  const btn = document.getElementById('cheat-weapon-upgrade');
  const cur = w === 'sword' ? player.swordRarity : w === 'bow' ? player.bowRarity : player.staffRarity;
  btn.classList.toggle('active', cur >= 5);
  btn.style.boxShadow = '0 0 18px #00ff44';
  setTimeout(() => btn.style.boxShadow = '', 400);
});
document.querySelectorAll('.cheat-diff').forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx('button_press');
    const level = parseInt(btn.dataset.diff);
    setDifficultyLevel(level); setZoneCount((level - 1) * 3);
    document.getElementById('difficulty-value').textContent = level;
    populateEnemies();
    updateMusicForDifficulty(level);
    btn.style.boxShadow = '0 0 18px #00ff44';
    setTimeout(() => btn.style.boxShadow = '', 400);
  });
});

// Expose for any residual inline handlers
window.selectClass = selectClass;
window.closeShop   = closeShop;
window.openShop    = openShop;
window.buyItem     = buyItem;

// Start — load sprites first, then begin the render loop
(async () => {
  await loadSprites();
  gameLoop();
})();

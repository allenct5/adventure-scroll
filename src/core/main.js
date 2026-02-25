// main.js — Game loop, input handling, game-state transitions, UI wiring.

import { W, H } from './constants.js';
import { merchant, loadLevelForDifficulty } from '../scenes/level.js';
import {
  gameState, setGameState, godMode, setGodMode,
  player, setPlayer, playerClass, setPlayerClass,
  activeClassMod, setActiveClassMod, preModWeapon, setPreModWeapon, preModWeaponRarity, setPreModWeaponRarity,
  cameraX, setLastTime, lastTime, setZoneCount, setDifficultyLevel,
  zoneCount, difficultyLevel,
  keys, setMouseDown, setMouseRightDown, mousePos,
  shopOpen, clearCombatArrays, clearGroundHistory, resetDropTimes, clearParticles, activeEvent, setActiveEvent,
  merlinRandomAppearance, setMerlinRandomAppearance,
  kineticBoltConeVisual, setKineticBoltConeVisual,
} from './state.js';
import { createPlayer, updatePlayer, drawPlayer, drawSwordSwing, drawAimIndicator, killPlayer, registerRespawnFn, registerCheckpointFn, applyClassMod, removeClassMod } from '../entities/player.js';
import { populateEnemies, updateEnemies, drawEnemies } from '../entities/enemies.js';
import { drawNpcMerlin, drawNpcTaliesin, npcTaliesin } from '../entities/npc.js';
import { updateArrows, updateCrossbowBolts, updatePlayerOrbs, updateFireballs, updateBombs, drawProjectiles } from '../utils/projectiles.js';
import { updatePowerups, drawPowerups } from '../utils/powerups.js';
import { updateCoins, drawCoins } from '../utils/coins.js';
import { updateParticles, drawParticles } from '../utils/particles.js';
import { updateHUD, showMessage, hideMessage, showGameOver, hideGameOver } from '../utils/hud.js';
import { openShop, closeShop, buyItem, clearShopPurchased, registerGameLoop } from '../utils/shop.js';
import { applyZoneBuffs } from '../utils/powerups.js';
import { drawBackground, drawPlatforms, drawHazards, drawCheckpoint, drawMerchant, drawBuffIcons, drawDebugStats, drawKineticBoltCone, buffIconPositions } from './renderer.js';
import { canvas, ctx } from '../canvas.js';
import { updateMusicForDifficulty, stopMusic, setMusicVolume, setGameVolume, playSfx } from '../utils/audio.js';
import { loadSprites } from '../utils/sprites.js';
import { CLASS_MODS, initializeClassModSpellOverrides, getClassModsForClass } from '../utils/classMods.js';
import { shootLightningSpark, shootLightningBolt, summonWanderingOrc, summonRaisedSkull, shootRapidFireBolts, shootKineticBolt } from '../entities/player.js';

// Initialize class mod spell overrides (fixes circular import issue)
initializeClassModSpellOverrides(shootLightningSpark, shootLightningBolt, summonWanderingOrc, summonRaisedSkull, shootRapidFireBolts, shootKineticBolt);

// Give shop a reference to gameLoop (avoids circular import at module parse time)
registerGameLoop(gameLoop);

// Give player.js the checkpoint callback
registerCheckpointFn(triggerCheckpoint);
// Give player.js the respawn callback
registerRespawnFn(respawnPlayer);

// --- LEVEL RESET ---
let levelResetTimer = 0;
let _tooltipElement = null;

function selectRandomEvent() {
  const rand = Math.random() * 100;
  // Merchant Stall and Taliesin are mutually exclusive
  if (rand < 40) {
    return 'merchantStall'; // 40% chance
  } else if (rand < 60) {
    return 'taliesin'; // 20% chance (only if merchant didn't roll)
  }
  return null; // 40% chance for no event
}

function getTooltipElement() {
  if (!_tooltipElement) _tooltipElement = document.getElementById('buff-tooltip');
  return _tooltipElement;
}

function performCommonCleanup() {
  clearCombatArrays();
  clearParticles();
  populateEnemies();
  resetDropTimes();
  clearShopPurchased();
  updateHUD();
  hideMessage();
}

function drawScene() {
  ctx.clearRect(0, 0, W, H);
  drawBackground(); drawPlatforms(); drawHazards(); drawCheckpoint(); drawNpcMerlin();
  
  // Draw event-based NPCs/objects
  if (activeEvent === 'merchantStall') {
    drawMerchant();
  } else if (activeEvent === 'taliesin') {
    drawNpcTaliesin();
  }
  
  drawPowerups(); drawCoins(); drawSwordSwing(); drawAimIndicator();
  drawPlayer(); drawEnemies(); drawProjectiles(); drawParticles(); drawKineticBoltCone();
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
  loadLevelForDifficulty(difficultyLevel);
  applyZoneBuffs();
  
  // Select the random event for this level
  setActiveEvent(selectRandomEvent());

  // If neither merchant stall nor taliesin events are active, 10% chance Merlin appears anyway
  setMerlinRandomAppearance(activeEvent !== 'merchantStall' && activeEvent !== 'taliesin' && Math.random() < 0.1);

  // Store class mod state before creating new player
  const modState = {
    activeClassMod: activeClassMod,
    preModWeapon: preModWeapon,
    preModWeaponRarity: preModWeaponRarity,
  };

  const carry = {
    hp: player.hp, maxHp: player.maxHp, ammo: player.ammo, coins: player.coins,
    weapon: player.weapon, weaponVariant: player.weaponVariant, swordRarity: player.swordRarity, bowRarity: player.bowRarity,
    staffRarity: player.staffRarity, mana: player.mana,
    overshield: player.overshield, maxOvershield: player.maxOvershield,
    fortified: player.fortified && !player.fortifiedUsed,
    fortifiedUsed: player.fortified && !player.fortifiedUsed,
    revive: player.revive || false, regenActive: player.regenActive || false,
    attackSpeedTimer: player.attackSpeedTimer, attackSpeedTimerMax: player.attackSpeedTimerMax || 0,
    bombs: player.bombs,
    damageMult: (player.damageMult > 1 && !player.berserkerUsed) ? player.damageMult : 1,
    berserkerUsed: (player.damageMult > 1 && !player.berserkerUsed),
    damageReduction: player.damageReduction,
    hpRegen: player.hpRegen,
    manaRegen: player.manaRegen,
  };

  setPlayer(createPlayer());
  Object.assign(player, carry);
  
  // Restore class mod state
  setActiveClassMod(modState.activeClassMod);
  setPreModWeapon(modState.preModWeapon);
  setPreModWeaponRarity(modState.preModWeaponRarity);

  performCommonCleanup();
  clearGroundHistory();
  document.getElementById('difficulty-value').textContent = difficultyLevel;
  updateMusicForDifficulty(difficultyLevel);
}

function respawnPlayer() {
  clearGroundHistory();
  setPlayer(createPlayer());
  setZoneCount(0); 
  setDifficultyLevel(1);
  loadLevelForDifficulty(1);
  setActiveClassMod(null); setPreModWeapon(null); setPreModWeaponRarity(null);
  setActiveEvent(null);
  document.getElementById('difficulty-value').textContent = '1';
  performCommonCleanup();
  setGameState('playing');
  updateMusicForDifficulty(1);
}

// --- CLASS SELECT ---
function selectClass(cls) {
  setPlayerClass(cls);
  document.getElementById('class-select').style.display = 'none';
  setPlayer(createPlayer());
  loadLevelForDifficulty(difficultyLevel);
  clearCombatArrays();
  clearParticles();
  populateEnemies();
  resetDropTimes();
  clearShopPurchased();
  clearGroundHistory();
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
    updateCrossbowBolts(dt);
    updateBombs(dt);
    updatePlayerOrbs(dt);
    updateFireballs(dt);
    updatePowerups(dt);
    updateCoins(dt);
    updateHUD();
  }
  updateParticles(dt);

  // Update kinetic bolt cone visual timer
  if (kineticBoltConeVisual) {
    kineticBoltConeVisual.duration -= dt;
    if (kineticBoltConeVisual.duration <= 0) {
      setKineticBoltConeVisual(null);
    }
  }

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
  
  // Check for Taliesin click first (more specific hitbox)
  const taliesiX = msx + (merchant.w - npcTaliesin.w) / 2;
  const taliesiY = merchant.y + merchant.h - npcTaliesin.h;
  if (activeEvent === 'taliesin' && mx >= taliesiX && mx <= taliesiX + npcTaliesin.w && my >= taliesiY && my <= taliesiY + npcTaliesin.h) {
    const playerCx   = player.x + player.w / 2;
    const taliesinCx = merchant.x + merchant.w / 2;
    const playerFeetY = player.y + player.h;
    const taliesinFeetY = merchant.y + merchant.h;
    const proximityX = Math.abs(playerCx - taliesinCx) < 120;
    const proximityY = Math.abs(playerFeetY - taliesinFeetY) < 120;
    if (proximityX && proximityY) { showFateScreen(); return; }
  }
  // Check for merchant stall click
  if (activeEvent === 'merchantStall' && mx >= msx && mx <= msx + merchant.w && my >= merchant.y && my <= merchant.y + merchant.h) {
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
  
  // Check for merchant stall hover
  const msx = merchant.x - cameraX;
  const overMerchant = activeEvent === 'merchantStall' &&
                       mousePos.x >= msx && mousePos.x <= msx + merchant.w &&
                       mousePos.y >= merchant.y && mousePos.y <= merchant.y + merchant.h;
  canvas.classList.toggle('merchant-hover', overMerchant);
  
  // Check for Taliesin hover
  const taliesiX = msx + (merchant.w - npcTaliesin.w) / 2;
  const taliesiY = merchant.y + merchant.h - npcTaliesin.h;
  const overTaliesin = activeEvent === 'taliesin' &&
                       mousePos.x >= taliesiX && mousePos.x <= taliesiX + npcTaliesin.w &&
                       mousePos.y >= taliesiY && mousePos.y <= taliesiY + npcTaliesin.h;
  canvas.classList.toggle('taliesin-hover', overTaliesin);
  
  // Check if hovering over a buff icon
  let hoveredBuff = null;
  for (const buff of buffIconPositions) {
    if (mousePos.x >= buff.x && mousePos.x <= buff.x + buff.width &&
        mousePos.y >= buff.y && mousePos.y <= buff.y + buff.height) {
      hoveredBuff = buff;
      break;
    }
  }
  
  if (hoveredBuff) {
    const tooltip = getTooltipElement();
    tooltip.textContent = hoveredBuff.description;
    tooltip.classList.remove('hidden');
    const iconCenterX = rect.left + hoveredBuff.x + hoveredBuff.width / 2;
    const tooltipY = rect.top + hoveredBuff.y + hoveredBuff.height + 8;
    tooltip.style.left = iconCenterX + 'px';
    tooltip.style.top = tooltipY + 'px';
  } else {
    getTooltipElement().classList.add('hidden');
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
  setActiveClassMod(null); setPreModWeapon(null); setPreModWeaponRarity(null);
  setActiveEvent(null);
  hideFateScreen();
  document.getElementById('difficulty-value').textContent = '1';
  document.getElementById('cheat-godmode').classList.remove('active');
  document.getElementById('cheat-weapon-upgrade').classList.remove('active');
  document.getElementById('cheat-stats').classList.remove('active');
  statsActive = false;
  document.getElementById('cheat-menu').classList.remove('open');
  document.getElementById('class-mod-overlay').classList.remove('open');
  updateHUD();
  stopMusic();
  document.getElementById('class-select').style.display = 'flex';
  setLastTime(0);
}

// --- FATE SCREEN (Taliesin Event) ---
function showFateScreen() {
  const fateScreen = document.getElementById('fate-screen');
  const fateCards = document.getElementById('fate-cards');
  fateCards.innerHTML = '';
  
  // Get the class mods for the current player class
  const mods = getClassModsForClass(playerClass);
  
  // Create cards for available mods (or placeholder if no mods exist)
  if (mods.length === 0) {
    fateCards.innerHTML = '<div style="color: #999; padding: 20px;">No fates available for this class yet.</div>';
  } else {
    for (const mod of mods) {
      const card = document.createElement('div');
      card.className = 'fate-card';
      card.innerHTML = `
        <span class="fate-card-icon">✨</span>
        <span class="fate-card-name">${mod.displayName}</span>
        <div class="fate-card-desc">${mod.description}</div>
      `;
      card.addEventListener('click', () => {
        playSfx('button_press');
        applyClassMod(mod.id);
        updateHUD();
        hideFateScreen();
      });
      fateCards.appendChild(card);
    }
  }
  
  fateScreen.classList.add('visible');
  setGameState('paused');
}

function hideFateScreen() {
  document.getElementById('fate-screen').classList.remove('visible');
  setGameState('playing');
}

document.getElementById('fate-close').addEventListener('click', () => {
  playSfx('button_press');
  hideFateScreen();
});

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
  const weaponRarityMap = {
    'sword': 'swordRarity',
    'bow': 'bowRarity',
    'crossbow': 'crossbowRarity',
    'staff': 'staffRarity',
  };
  const rarityKey = weaponRarityMap[player.weapon];
  if (rarityKey) {
    player[rarityKey] = Math.min(5, player[rarityKey] + 1);
  }
  updateHUD();
  const btn = document.getElementById('cheat-weapon-upgrade');
  const current = rarityKey ? player[rarityKey] : 0;
  btn.classList.toggle('active', current >= 5);
  btn.style.boxShadow = '0 0 18px #00ff44';
  setTimeout(() => btn.style.boxShadow = '', 400);
});
document.getElementById('debug-money').addEventListener('click', () => {
  playSfx('button_press');
  player.coins += 999;
  updateHUD();
  const btn = document.getElementById('debug-money');
  btn.style.boxShadow = '0 0 18px #00ff44';
  setTimeout(() => btn.style.boxShadow = '', 400);
});
document.querySelectorAll('.cheat-diff').forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx('button_press');
    const level = parseInt(btn.dataset.diff);
    setDifficultyLevel(level); 
    setZoneCount((level - 1) * 3);
    loadLevelForDifficulty(level);
    document.getElementById('difficulty-value').textContent = level;
    populateEnemies();
    updateMusicForDifficulty(level);
    btn.style.boxShadow = '0 0 18px #00ff44';
    setTimeout(() => btn.style.boxShadow = '', 400);
  });
});

// --- CLASS MODS ---
function populateClassModList() {
  const modList = document.getElementById('class-mod-list');
  modList.innerHTML = '';
  
  // Get all mods for current player class
  const currentMods = CLASS_MODS[playerClass] || [];
  
  if (currentMods.length === 0) {
    modList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 20px;">No Class Mods available for this class.</div>';
    return;
  }
  
  currentMods.forEach(mod => {
    const card = document.createElement('div');
    card.className = 'class-mod-card';
    card.innerHTML = `
      <span class="class-mod-card-name">${mod.displayName}</span>
      <span class="class-mod-card-class">${mod.classRequired}</span>
      <div class="class-mod-card-desc">${mod.description}</div>
      <button class="class-mod-card-btn" data-mod-id="${mod.id}">TEST MOD</button>
    `;
    modList.appendChild(card);
    
    card.querySelector('.class-mod-card-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      playSfx('button_press');
      applyClassMod(mod.id);
      updateHUD();
      closeClassModModal();
    });
  });
}

function openClassModModal() {
  playSfx('button_press');
  document.getElementById('class-mod-current-class').textContent = playerClass ? playerClass.toUpperCase() : 'NONE';
  populateClassModList();
  document.getElementById('class-mod-overlay').classList.add('open');
}

function closeClassModModal() {
  document.getElementById('class-mod-overlay').classList.remove('open');
}

document.getElementById('debug-class').addEventListener('click', openClassModModal);
document.getElementById('class-mod-close').addEventListener('click', closeClassModModal);
document.getElementById('class-mod-reset').addEventListener('click', (e) => {
  e.stopPropagation();
  playSfx('button_press');
  removeClassMod();
  updateHUD();
  closeClassModModal();
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

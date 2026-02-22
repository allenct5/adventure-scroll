// powerups.js — Player powerup drops, buff timers, and zone modifier system.
//
// ZONE BUFF SYSTEM
// ─────────────────
// `zoneBuffs` is the single source of truth for all active zone modifiers.
// enemies.js and player.js read from it directly — nothing else needs changing
// when new modifier types are added here.
//
// To add a new modifier type:
//   1. Add a field to zoneBuffs below (default 1.0 = no effect)
//   2. Wire it into applyZoneBuffs() with your difficulty logic
//   3. Read it in the relevant update function (enemies.js / player.js)

import { POWERUP_DROP_COOLDOWN, W } from '../core/constants.js';
import {
  player, playerClass, cameraX,
  powerups, lastDropTime, difficultyLevel,
} from '../core/state.js';
import { rectOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { updateHUD } from './hud.js';

import { ctx } from '../canvas.js';

// ---------------------------------------------------------------------------
// ZONE BUFFS
// ---------------------------------------------------------------------------

export const zoneBuffs = {
  // Enemy modifiers
  enemyDamageMult:      1.0,  // multiplies orc melee hit damage
  enemySpeedMult:       1.0,  // multiplies all enemy base speed
  enemyAttackSpeedMult: 1.0,  // multiplies attack cooldown (lower = faster)

  // Player modifiers — stubs, uncomment when designed
  // playerDamageMult: 1.0,
  // playerSpeedMult:  1.0,
};

/**
 * Called on every zone transition from main.js resetLevel().
 * Resets zoneBuffs to baseline then applies difficulty-driven modifiers.
 *
 * NOTE: buffs are replaced each zone (not accumulated) until a stacking
 * strategy is decided. Change the reset block below to switch behaviour.
 */
export function applyZoneBuffs() {
  // Reset to baseline
  zoneBuffs.enemyDamageMult      = 1.0;
  zoneBuffs.enemySpeedMult       = 1.0;
  zoneBuffs.enemyAttackSpeedMult = 1.0;

  // Populate once zone modifier values are finalised. Example:
  // if (difficultyLevel >= 3) zoneBuffs.enemySpeedMult       = 1.15;
  // if (difficultyLevel >= 4) zoneBuffs.enemyDamageMult      = 1.20;
  // if (difficultyLevel >= 5) zoneBuffs.enemyAttackSpeedMult = 0.80;
}

// ---------------------------------------------------------------------------
// PLAYER POWERUP DROPS
// ---------------------------------------------------------------------------

export function tryDropPowerup(x, y) {
  const roll = Math.random();
  let type = null;
  if      (roll < 0.10) type = 'speedBoost';
  else if (roll < 0.25) type = 'attackSpeed';
  else if (roll < 0.45) type = 'health';
  else if (roll < 0.55) type = 'mana';
  else if (roll < 0.65) type = 'bomb';
  if (!type) return;
  if (type === 'mana' && playerClass !== 'mage')   return;
  if (type === 'bomb' && playerClass !== 'archer') return;
  if (performance.now() - lastDropTime[type] < POWERUP_DROP_COOLDOWN) return;
  lastDropTime[type] = performance.now();
  powerups.push({ x: x - 12, y: y - 10, w: 24, h: 24, type, bobOffset: Math.random() * Math.PI * 2 });
}

export function updatePowerups(dt) {
  player.speedBoostTimer  = Math.max(0, player.speedBoostTimer  - dt);
  player.attackSpeedTimer = Math.max(0, player.attackSpeedTimer - dt);
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (rectOverlap(player, p)) {
      if      (p.type === 'health')      { player.hp = Math.min(player.maxHp, player.hp + 20); updateHUD(); }
      else if (p.type === 'speedBoost')  { player.speedBoostTimer  = Math.max(player.speedBoostTimer,  60 * 7); player.speedBoostTimerMax  = Math.max(player.speedBoostTimerMax,  60 * 7); }
      else if (p.type === 'attackSpeed') { player.attackSpeedTimer = Math.max(player.attackSpeedTimer, 60 * 7); player.attackSpeedTimerMax = Math.max(player.attackSpeedTimerMax, 60 * 7); }
      else if (p.type === 'mana')        { player.mana += 5; updateHUD(); }
      else if (p.type === 'bomb')        { player.bombs = Math.min(5, player.bombs + 2); updateHUD(); }
      const glowCol = p.type === 'health' ? '#ff4466' : p.type === 'speedBoost' ? '#00ff88' : p.type === 'attackSpeed' ? '#ffcc00' : p.type === 'mana' ? '#2288ff' : '#ff8800';
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, glowCol, 10);
      powerups.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// DRAW
// ---------------------------------------------------------------------------

export function drawPowerups() {
  const t = Date.now() * 0.003;
  for (const p of powerups) {
    const sx = p.x - cameraX;
    if (sx > W + 40 || sx < -40) continue;
    const bob = Math.sin(t * 2 + p.bobOffset) * 3;
    const py  = p.y + bob;

    ctx.save();
    ctx.translate(sx + p.w / 2, py + p.h / 2);

    const glow = p.type === 'health' ? '#ff2255' : p.type === 'speedBoost' ? '#00ff88' : p.type === 'attackSpeed' ? '#ffcc00' : p.type === 'mana' ? '#2288ff' : '#ff6600';
    ctx.shadowColor = glow; ctx.shadowBlur = 14 + Math.sin(t * 3 + p.bobOffset) * 4;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;

    if (p.type === 'health') {
      ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-9, -3, -9, -10, 0, -6); ctx.bezierCurveTo(9, -10, 9, -3, 0, 4); ctx.fill();
    } else if (p.type === 'mana') {
      const flaskGrad = ctx.createRadialGradient(-2, 2, 1, 0, 0, 9);
      flaskGrad.addColorStop(0, '#88ccff'); flaskGrad.addColorStop(0.5, '#2266cc'); flaskGrad.addColorStop(1, '#001166');
      ctx.fillStyle = flaskGrad; ctx.shadowColor = '#2288ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.ellipse(0, 3, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#114499'; ctx.fillRect(-3, -7, 6, 5);
      ctx.fillStyle = '#cc8833'; ctx.fillRect(-4, -9, 8, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(-2, 0, 2, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'bomb') {
      ctx.fillStyle = '#333333'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#996633'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, -5); ctx.quadraticCurveTo(7, -9, 4, -12); ctx.stroke();
      ctx.fillStyle = '#ffee44'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(4, -12, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'speedBoost') {
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -6); ctx.lineTo(4, 0); ctx.lineTo(-4, 6); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(8, 0); ctx.lineTo(0, 6); ctx.stroke();
    } else if (p.type === 'attackSpeed') {
      ctx.strokeStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 10;
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.save();
      const swingAngle = Math.sin(t * 4 + p.bobOffset) * 0.45;
      ctx.rotate(swingAngle);
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.stroke();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath(); ctx.arc(0, 10, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
      ctx.lineWidth = 1.5;
      for (let m = 1; m <= 3; m++) {
        ctx.beginPath(); ctx.moveTo(-8 - m * 2, -2); ctx.lineTo(-12 - m * 3, -4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8 - m * 2,  2); ctx.lineTo(-12 - m * 3,  4); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

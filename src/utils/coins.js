// coins.js — Coin drops, physics, collection, and drawing.

import { W } from './constants.js';
import { player, cameraX, coins, lastJackpotTime, setLastJackpotTime } from './state.js';
import { rectOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { spawnJackpotSparkles } from './particles.js';
import { updateHUD } from './hud.js';
import { platforms } from './level.js';

import { ctx } from './canvas.js';

export function dropCoin(x, y) {
  const roll = Math.random();
  let count = 0;
  if      (roll < 0.40) count = 0;
  else if (roll < 0.80) count = 1;
  else {
    const now = performance.now();
    if (now - lastJackpotTime >= 5000) {
      count = 3;
      setLastJackpotTime(now);
    } else {
      count = 1;
    }
  }
  for (let i = 0; i < count; i++) {
    const spread = (i - (count - 1) / 2) * 14;
    coins.push({ x: x - 6 + spread, y: y - 8, w: 12, h: 12, vy: -4 - Math.random() * 2, bobOffset: Math.random() * Math.PI * 2, landed: false });
  }
  if (count === 3) spawnJackpotSparkles(player.x + player.w / 2, player.y - 10);
}

export function updateCoins(dt) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (!c.landed) {
      c.vy += 0.4 * dt;
      c.y  += c.vy * dt;
      for (const p of platforms) {
        if (rectOverlap(c, p) && c.vy > 0) { c.y = p.y - c.h; c.vy = 0; c.landed = true; break; }
      }
    }
    if (rectOverlap(player, c)) {
      player.coins++;
      spawnParticles(c.x + c.w / 2, c.y + c.h / 2, '#ffdd00', 6);
      updateHUD();
      coins.splice(i, 1);
    }
  }
}

export function drawCoins() {
  const t = Date.now() * 0.003;
  for (const c of coins) {
    const sx = c.x - cameraX;
    if (sx > W + 30 || sx < -30) continue;
    const bob = c.landed ? Math.sin(t * 2 + c.bobOffset) * 2 : 0;
    const cy  = c.y + bob;
    ctx.save();
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath(); ctx.ellipse(sx + c.w / 2, cy + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8aa';
    ctx.beginPath(); ctx.ellipse(sx + c.w / 2 - 1, cy + c.h / 2 - 1, c.w / 4, c.h / 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

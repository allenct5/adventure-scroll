// projectiles.js — Update and draw all projectile types.

import {
  BASE_ARROW_DAMAGE, BASE_ORB_DAMAGE, BASE_FIREBALL_DAMAGE,
  BOMB_GRAVITY, BOMB_EXPLODE_RADIUS, rarityDamage, W,
} from './constants.js';
import { platforms } from './level.js';
import {
  player, playerClass, cameraX,
  arrows, fireballsPlayer, playerOrbs, playerBombs, enemyProjectiles, enemies,
} from './state.js';
import { rectOverlap } from './collision.js';
import { spawnParticles, spawnBloodParticles, spawnSparkParticles } from './particles.js';
import { tryDropPowerup } from './powerups.js';
import { dropCoin } from './coins.js';
import { damagePlayer } from './player.js';
import { updateHUD } from './hud.js';

import { ctx } from './canvas.js';

// --- ARROWS ---
export function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.x += a.vx * dt; a.y += a.vy * dt;
    a.vy += 0.08 * dt;
    a.angle = Math.atan2(a.vy, a.vx);
    a.life -= dt;
    let remove = a.life <= 0;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!remove && rectOverlap({x: a.x - 4, y: a.y - 4, w: 8, h: 8}, e)) {
        e.hp -= rarityDamage(BASE_ARROW_DAMAGE, player.bowRarity) * player.damageMult;
        spawnBloodParticles(a.x, a.y); remove = true;
        if (e.hp <= 0) { spawnBloodParticles(e.x + e.w / 2, e.y); tryDropPowerup(e.x + e.w / 2, e.y); dropCoin(e.x + e.w / 2, e.y); enemies.splice(j, 1); }
        break;
      }
    }
    for (const p of platforms) {
      if (!remove && rectOverlap({x: a.x, y: a.y, w: 4, h: 4}, p)) { remove = true; spawnSparkParticles(a.x, a.y); }
    }
    if (remove) arrows.splice(i, 1);
  }
}

// --- STAFF ORBS ---
export function updatePlayerOrbs(dt) {
  for (let i = playerOrbs.length - 1; i >= 0; i--) {
    const o = playerOrbs[i];
    if (o.portalLife !== undefined) o.portalLife = Math.max(0, o.portalLife - dt);
    o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 0.05 * dt; o.life -= dt;
    if (o.life <= 0) { playerOrbs.splice(i, 1); continue; }
    const oRect = {x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2};
    let hitTerrain = false;
    for (const p of platforms) { if (rectOverlap(oRect, p)) { hitTerrain = true; break; } }
    if (hitTerrain) { o.vx = 0; o.vy = 0; o.life = Math.min(o.life, 12); spawnParticles(o.x, o.y, '#ff44ff', 4); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (rectOverlap({x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2}, e)) {
        e.hp -= rarityDamage(BASE_ORB_DAMAGE, player.staffRarity) * player.damageMult;
        spawnParticles(o.x, o.y, '#ff44ff', 8); playerOrbs.splice(i, 1);
        if (e.hp <= 0) { spawnBloodParticles(e.x + e.w / 2, e.y); tryDropPowerup(e.x + e.w / 2, e.y); dropCoin(e.x + e.w / 2, e.y); enemies.splice(j, 1); }
        break;
      }
    }
  }
}

// --- FIREBALLS ---
export function updateFireballs(dt) {
  for (let i = fireballsPlayer.length - 1; i >= 0; i--) {
    const f = fireballsPlayer[i];
    if (f.dissipating) {
      f.dissipateTimer -= dt; f.r = Math.max(0, f.r - 0.5 * dt);
      if (Math.random() < 0.33) spawnParticles(f.x, f.y, Math.random() < 0.5 ? '#ff6600' : '#aaaaaa', 2);
      if (f.dissipateTimer <= 0) { fireballsPlayer.splice(i, 1); }
      continue;
    }
    f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    if (f.life <= 0) { fireballsPlayer.splice(i, 1); continue; }
    if (f.trail) {
      f.trail.push({x: f.x, y: f.y, age: 0});
      for (const t of f.trail) t.age += dt;
      if (f.trail.length > 18) f.trail.shift();
    }
    const fRect = {x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2};
    let hitTerrain = false;
    for (const p of platforms) { if (rectOverlap(fRect, p)) { hitTerrain = true; break; } }
    if (hitTerrain) { f.vx = 0; f.vy = 0; f.dissipating = true; f.dissipateTimer = 30; f.trail = []; spawnParticles(f.x, f.y, '#ff4400', 10); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (rectOverlap({x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2}, e)) {
        e.hp -= rarityDamage(BASE_FIREBALL_DAMAGE, player.staffRarity) * player.damageMult;
        e.burnTimer = 300; e.burnDps = 20 / 300;
        spawnParticles(f.x, f.y, '#ff4400', 10); f.dissipating = true; f.dissipateTimer = 20; f.trail = [];
        if (e.hp <= 0) { spawnBloodParticles(e.x + e.w / 2, e.y); tryDropPowerup(e.x + e.w / 2, e.y); dropCoin(e.x + e.w / 2, e.y); enemies.splice(j, 1); }
        break;
      }
    }
  }
}

// --- BOMBS ---
export function updateBombs(dt) {
  for (let i = playerBombs.length - 1; i >= 0; i--) {
    const b = playerBombs[i];
    if (b.exploded) { b.explodeTimer -= dt; if (b.explodeTimer <= 0) playerBombs.splice(i, 1); continue; }
    b.vx *= Math.pow(0.995, dt); b.vy += BOMB_GRAVITY * dt;
    b.x  += b.vx * dt; b.y  += b.vy * dt; b.life -= dt;
    b.trail.push({x: b.x, y: b.y, age: 0});
    for (const t of b.trail) t.age++;
    if (b.trail.length > 14) b.trail.shift();
    const bRect = {x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2};
    let hitTerrain = false;
    for (const p of platforms) { if (rectOverlap(bRect, p)) { hitTerrain = true; break; } }
    if (hitTerrain || b.life <= 0) { explodeBomb(b); b.exploded = true; b.explodeTimer = 25; }
  }
}

function explodeBomb(b) {
  for (let j = enemies.length - 1; j >= 0; j--) {
    const e = enemies[j];
    if (Math.hypot((e.x + e.w / 2) - b.x, (e.y + e.h / 2) - b.y) <= BOMB_EXPLODE_RADIUS) {
      e.hp -= rarityDamage(30, player.bowRarity) * player.damageMult;
      spawnBloodParticles(e.x + e.w / 2, e.y + e.h / 2);
      if (e.hp <= 0) { spawnBloodParticles(e.x + e.w / 2, e.y + e.h / 2); tryDropPowerup(e.x + e.w / 2, e.y + e.h / 2); dropCoin(e.x + e.w / 2, e.y + e.h / 2); enemies.splice(j, 1); }
    }
  }
  for (let k = 0; k < 3; k++) spawnParticles(b.x, b.y, '#ff6600', 8);
  spawnParticles(b.x, b.y, '#ffcc00', 10); spawnParticles(b.x, b.y, '#ffffff', 5);
}

// --- DRAW ALL PROJECTILES ---
export function drawProjectiles() {
  // Arrows
  for (const a of arrows) {
    const sx = a.x - cameraX;
    ctx.save(); ctx.translate(sx, a.y); ctx.rotate(Math.atan2(a.vy, a.vx));
    ctx.fillStyle = '#ffcc44'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 8;
    ctx.fillRect(-12, -2, 24, 4);
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  }

  // Player staff orbs
  for (const o of playerOrbs) {
    const sx = o.x - cameraX;
    // Draw portal effect if recently spawned
    if (o.portalLife !== undefined && o.portalLife > 0) {
      const portalAlpha = o.portalLife / 25;
      ctx.strokeStyle = `rgba(170, 0, 255, ${portalAlpha * 0.6})`;
      ctx.lineWidth = 3;
      for (let ring = 0; ring < 2; ring++) {
        const ringRadius = 15 + ring * 8;
        ctx.beginPath();
        ctx.arc(sx, o.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(sx, o.y, o.r, 0, Math.PI * 2);
    const ograd = ctx.createRadialGradient(sx, o.y, 0, sx, o.y, o.r);
    ograd.addColorStop(0, '#ffffff'); ograd.addColorStop(0.4, '#ff88ff'); ograd.addColorStop(1, 'rgba(180,0,255,0)');
    ctx.fillStyle = ograd; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
  }

  // Fireballs
  for (const f of fireballsPlayer) {
    const sx    = f.x - cameraX;
    const t     = Date.now() * 0.008;
    const pulse = 1 + Math.sin(t + f.x * 0.1) * 0.15;
    const r     = f.r * pulse;
    if (f.trail && f.trail.length > 1) {
      const MAX_AGE = 18;
      for (let i = 0; i < f.trail.length; i++) {
        const tp   = f.trail[i];
        const frac = i / f.trail.length;
        const ageFrac = 1 - (tp.age / MAX_AGE);
        const tx = tp.x - cameraX;
        ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8 * frac;
        ctx.fillStyle = `rgba(255,${Math.round(180 * frac)},0,${ageFrac * 0.7 * frac})`;
        ctx.beginPath(); ctx.arc(tx, tp.y, Math.max(1, f.r * frac * 0.85), 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    const outerGrad = ctx.createRadialGradient(sx, f.y, 0, sx, f.y, r * 2.5);
    outerGrad.addColorStop(0, 'rgba(255,140,0,0.35)'); outerGrad.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = outerGrad; ctx.beginPath(); ctx.arc(sx, f.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
    const coreGrad = ctx.createRadialGradient(sx - r * 0.3, f.y - r * 0.3, 0, sx, f.y, r);
    coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(0.2, '#ffee44'); coreGrad.addColorStop(0.6, '#ff6600'); coreGrad.addColorStop(1, '#cc2200');
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = f.dissipating ? 4 : 18;
    ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(sx, f.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  // Bombs
  for (const b of playerBombs) {
    const bsx = b.x - cameraX;
    if (b.exploded) {
      const t  = 1 - (b.explodeTimer / 25);
      const eR = BOMB_EXPLODE_RADIUS * t;
      ctx.globalAlpha = (1 - t) * 0.7;
      ctx.strokeStyle = '#ffcc00'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 20; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(bsx, b.y, eR, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.35; ctx.fillStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(bsx, b.y, eR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; continue;
    }
    if (b.trail.length > 1) {
      const MAX_AGE = 14;
      for (let i = 0; i < b.trail.length; i++) {
        const tp = b.trail[i], frac = i / b.trail.length, ageFrac = 1 - (tp.age / MAX_AGE);
        const tx = tp.x - cameraX;
        ctx.fillStyle = `rgba(120,80,40,${ageFrac * 0.5 * frac})`;
        ctx.beginPath(); ctx.arc(tx, tp.y, Math.max(1, b.r * 0.5 * frac), 0, Math.PI * 2); ctx.fill();
      }
    }
    const bombGrad = ctx.createRadialGradient(bsx - b.r * 0.3, b.y - b.r * 0.3, 1, bsx, b.y, b.r);
    bombGrad.addColorStop(0, '#666666'); bombGrad.addColorStop(0.5, '#222222'); bombGrad.addColorStop(1, '#111111');
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8; ctx.fillStyle = bombGrad;
    ctx.beginPath(); ctx.arc(bsx, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    const fuseFlicker = Math.random() > 0.4;
    ctx.shadowColor = fuseFlicker ? '#ffcc00' : '#ff6600'; ctx.shadowBlur = fuseFlicker ? 12 : 6;
    ctx.fillStyle = fuseFlicker ? '#ffee88' : '#ff8800';
    ctx.beginPath(); ctx.arc(bsx + 2, b.y - b.r - 3, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  // Enemy projectiles (magic orbs)
  for (const p of enemyProjectiles) {
    const sx = p.x - cameraX;
    const isEvil   = p.killerType === 'evilMage';
    const isCastle = p.killerType === 'castleMage';
    const innerCol  = isEvil ? '#ff6600' : isCastle ? '#4488ff' : '#ff88ff';
    const outerCol  = isEvil ? 'rgba(200,40,0,0)' : isCastle ? 'rgba(0,60,220,0)' : 'rgba(180,0,255,0)';
    const glowCol   = isEvil ? '#ff3300' : isCastle ? '#0055ff' : '#ff00ff';
    ctx.beginPath(); ctx.arc(sx, p.y, p.r, 0, Math.PI * 2);
    const ograd = ctx.createRadialGradient(sx, p.y, 0, sx, p.y, p.r);
    ograd.addColorStop(0, '#ffffff'); ograd.addColorStop(0.4, innerCol); ograd.addColorStop(1, outerCol);
    ctx.fillStyle = ograd; ctx.shadowColor = glowCol; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
  }
}

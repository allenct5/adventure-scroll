// projectiles.js — Update and draw all projectile types.

import {
  BASE_ARROW_DAMAGE, BASE_CROSSBOW_DAMAGE, BASE_ORB_DAMAGE, BASE_FIREBALL_DAMAGE,
  BOMB_GRAVITY, BOMB_EXPLODE_RADIUS, rarityDamage, W,
  FIREBALL_TRAIL_MAX_LENGTH, BOMB_TRAIL_MAX_LENGTH, FIREBALL_DISSIPATE_CHANCE,
} from '../core/constants.js';
import { platforms } from '../scenes/level.js';
import {
  player, playerClass, cameraX,
  arrows, crossbowBolts, fireballsPlayer, playerOrbs, playerBombs, enemyProjectiles, enemies,
} from '../core/state.js';
import { rectOverlap } from './collision.js';
import { spawnParticles, spawnBloodParticles, spawnSparkParticles } from './particles.js';
import { tryDropPowerup } from './powerups.js';
import { dropCoin } from './coins.js';
import { damagePlayer } from '../entities/player.js';
import { updateHUD } from './hud.js';
import { playSfx } from './audio.js';
import { killEntity } from './entityUtils.js';
import { releaseProjectile, releaseFireball, releaseBomb } from './objectPool.js';  // Phase 3b: Object pooling

import { ctx } from '../canvas.js';

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
        // Skip friendly allies
        if (e.friendly) continue;
        
        e.hp -= rarityDamage(BASE_ARROW_DAMAGE, player.bowRarity) * player.damageMult;
        spawnBloodParticles(a.x, a.y); playSfx('sword_attack'); remove = true;
        if (e.hp <= 0) { killEntity(e, enemies, j); }
        break;
      }
    }
    for (const p of platforms) {
      if (!remove && rectOverlap({x: a.x, y: a.y, w: 4, h: 4}, p)) { remove = true; spawnSparkParticles(a.x, a.y); }
    }
    if (remove) {
      // Phase 3b: Return arrow to pool for reuse
      const removed = arrows.splice(i, 1);
      if (removed.length > 0) releaseProjectile(removed[0]);
    }
  }
}

// --- CROSSBOW BOLTS ---
export function updateCrossbowBolts(dt) {
  for (let i = crossbowBolts.length - 1; i >= 0; i--) {
    const b = crossbowBolts[i];
    
    // Handle launch delay for rapid fire bolts
    if (b.delayTimer !== undefined && b.delayTimer > 0) {
      b.delayTimer -= dt;
      b.life -= dt;
      
      // When delay just expired, reposition bolt to player's current position
      if (b.delayTimer <= 0) {
        b.x = player.x + player.w / 2;
        b.y = player.y + player.h / 2 - 5;
      }
      
      let remove = b.life <= 0;
      if (remove) {
        // Phase 3b: Return bolt to pool for reuse
        const removed = crossbowBolts.splice(i, 1);
        if (removed.length > 0) releaseProjectile(removed[0]);
      }
      continue;  // Skip movement and collision checks while delayed
    }
    
    b.x += b.vx * dt; b.y += b.vy * dt;
    // Don't apply gravity to kinetic bolts (they fly straight)
    if (!b.isKineticBolt) {
      b.vy += 0.06 * dt;
    }
    b.angle = Math.atan2(b.vy, b.vx);
    b.life -= dt;
    let remove = b.life <= 0;
    
    // Determine collision box size (kinetic bolts are 3x larger)
    const collisionSize = b.isKineticBolt ? (b.size || 15) : 5;
    
    // Check enemy collisions
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!remove && rectOverlap({x: b.x - collisionSize, y: b.y - collisionSize, w: collisionSize * 2, h: collisionSize * 2}, e)) {
        // Skip friendly allies
        if (e.friendly) continue;
        
        // For kinetic bolts: skip if already hit this enemy
        if (b.isKineticBolt && b.hitEnemies && b.hitEnemies.has(j)) continue;
        
        // Use custom damage if provided by class mod, otherwise use default
        const damage = b.damage !== undefined ? b.damage : rarityDamage(BASE_CROSSBOW_DAMAGE, player.crossbowRarity);
        e.hp -= damage * player.damageMult;
        
        // Track hit for kinetic bolts
        if (b.isKineticBolt && b.hitEnemies) b.hitEnemies.add(j);
        
        // Apply knockback for kinetic bolts (crowd control)
        if (b.isKineticBolt) {
          const knockbackForce = 8;
          e.vx = Math.cos(b.angle) * knockbackForce;
          e.vy = Math.sin(b.angle) * knockbackForce * 0.5;  // Less vertical knockback
          e.knockbackTimer = 12;
        }
        
        // Apply bleed effect only for regular bolts (kinetic bolts don't apply bleed)
        if (!b.isKineticBolt && b.bleedChance !== undefined && Math.random() < b.bleedChance) {
          // Only apply bleed if not already active (no stacking multiple applications)
          if (!e.bleedTimer || e.bleedTimer <= 0) {
            e.bleedTimer = 300;  // 5 seconds of bleed duration
            // Bleed DPS scales with weapon rarity: 20 + (rarity - 1) * 4, divided by duration
            e.bleedDps = (20 + (player.bowRarity - 1) * 4) / 300;
          }
        }
        
        spawnBloodParticles(b.x, b.y); playSfx('sword_attack');
        
        // Kinetic bolts pass through enemies without being removed
        if (!b.isKineticBolt) {
          remove = true;
        }
        
        if (e.hp <= 0) { killEntity(e, enemies, j); }
        break;
      }
    }
    
    // Check terrain collision (all bolts collide with terrain)
    for (const p of platforms) {
      if (!remove && rectOverlap({x: b.x - collisionSize, y: b.y - collisionSize, w: collisionSize * 2, h: collisionSize * 2}, p)) { 
        remove = true; 
        spawnSparkParticles(b.x, b.y); 
      }
    }
    
    if (remove) {
      // Phase 3b: Return bolt to pool for reuse
      const removed = crossbowBolts.splice(i, 1);
      if (removed.length > 0) releaseProjectile(removed[0]);
    }
  }
}

// --- STAFF ORBS ---
export function updatePlayerOrbs(dt) {
  for (let i = playerOrbs.length - 1; i >= 0; i--) {
    const o = playerOrbs[i];
    if (o.portalLife !== undefined) o.portalLife = Math.max(0, o.portalLife - dt);
    o.x += o.vx * dt; o.y += o.vy * dt; 
    if (!o.isSpark) o.vy += 0.05 * dt;  // Lightning spark travels in straight line, no gravity
    o.life -= dt;
    if (o.life <= 0) {
      // Phase 3b: Return orb to pool for reuse
      const removed = playerOrbs.splice(i, 1);
      if (removed.length > 0) releaseProjectile(removed[0]);
      continue;
    }
    const oRect = {x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2};
    let hitTerrain = false;
    for (const p of platforms) { if (rectOverlap(oRect, p)) { hitTerrain = true; break; } }
    if (hitTerrain) { 
      if (o.isSpark) {
        o.vx = 0; o.vy = 0; o.life = Math.min(o.life, 8); spawnParticles(o.x, o.y, '#00ccff', 8); 
      } else {
        o.vx = 0; o.vy = 0; o.life = Math.min(o.life, 12); spawnParticles(o.x, o.y, '#ff44ff', 4); 
      }
      continue;
    }
    // Check if lightning spark has traveled too far
    if (o.isSpark && o.sparkStartX !== undefined) {
      const distTraveled = Math.hypot(o.x - o.sparkStartX, o.y - o.sparkStartY);
      if (distTraveled >= W * 2 / 3) { o.life = 0; continue; }
    }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (rectOverlap({x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2}, e)) {
        // Check if this projectile has already hit this enemy (for piercing)
        if (o.hitEnemies && o.hitEnemies.has(j)) continue;
        
        // Skip friendly allies
        if (e.friendly) continue;
        
        // Use custom damage if provided (from class mods), otherwise use default
        const dmg = o.damage ?? rarityDamage(BASE_ORB_DAMAGE, player.staffRarity);
        e.hp -= dmg * player.damageMult;
        playSfx('orb_hit'); spawnParticles(o.x, o.y, '#ff44ff', 8);
        
        // Mark this enemy as hit (for piercing spells)
        if (o.hitEnemies) o.hitEnemies.add(j);
        else {
          // Phase 3b: Return orb to pool for reuse
          const removed = playerOrbs.splice(i, 1);
          if (removed.length > 0) releaseProjectile(removed[0]);
        }
        
        if (e.hp <= 0) { killEntity(e, enemies, j); }
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
      if (Math.random() < FIREBALL_DISSIPATE_CHANCE) {
        const dissipateColor = Math.random() < 0.5 ? '#ff6600' : '#aaaaaa';
        spawnParticles(f.x, f.y, dissipateColor, 2);
      }
      if (f.dissipateTimer <= 0) {
        // Phase 3b: Return fireball to pool for reuse
        const removed = fireballsPlayer.splice(i, 1);
        if (removed.length > 0) releaseFireball(removed[0]);
      }
      continue;
    }
    f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.isLightningBolt ? 0 : 0.0575) * dt; f.life -= dt;
    if (f.life <= 0) {
      // Phase 3b: Return fireball to pool for reuse
      const removed = fireballsPlayer.splice(i, 1);
      if (removed.length > 0) releaseFireball(removed[0]);
      continue;
    }
    if (f.trail) {
      f.trailIndex = f.trailIndex ?? 0;
      f.trail[f.trailIndex] = {x: f.x, y: f.y, age: 0};
      f.trailIndex = (f.trailIndex + 1) % FIREBALL_TRAIL_MAX_LENGTH;  // Circular buffer
      for (const t of f.trail) t.age += dt;
    }
    const fRect = f.isLightningBolt 
      ? {x: f.x - f.r, y: 0, w: f.r * 2, h: f.y}  // Lightning bolt from top of screen to impact
      : {x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: (f.boltHeight || f.r * 2)};
    let hitTerrain = false;
    for (const p of platforms) { if (rectOverlap(fRect, p)) { hitTerrain = true; break; } }
    if (hitTerrain) { 
      if (f.isLightningBolt) {
        f.vx = 0; f.vy = 0; f.dissipating = true; f.dissipateTimer = 20;
        spawnParticles(f.x, f.y, '#00ccff', 20); spawnParticles(f.x, f.y, '#ffffff', 10); playSfx('fireball_explode');
      } else {
        f.vx = 0; f.vy = 0; f.dissipating = true; f.dissipateTimer = 30; f.trail = []; spawnParticles(f.x, f.y, '#ff4400', 10); playSfx('fireball_explode');
      }
      continue;
    }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      let isHit = false;
      
      if (f.isLightningBolt) {
        // Lightning bolt uses circle collision at impact point
        const enemyCenterX = e.x + e.w / 2;
        const enemyCenterY = e.y + e.h / 2;
        const dist = Math.hypot(enemyCenterX - f.x, enemyCenterY - f.y);
        isHit = dist <= f.r;  // Check if distance is within the radius
      } else {
        // Regular fireballs use rectangle collision
        const collisionRect = {x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: (f.boltHeight || f.r * 2)};
        isHit = rectOverlap(collisionRect, e);
      }
      
      if (isHit && !e.friendly) {  // Skip friendly allies
        // Lightning bolt dissipates on first enemy contact
        if (f.isLightningBolt) {
          if (!f.hitSomething) {
            f.hitSomething = true;
            const dmg = f.damage ?? rarityDamage(BASE_FIREBALL_DAMAGE, player.staffRarity);
            e.hp -= dmg * player.damageMult;
            spawnBloodParticles(e.x + e.w / 2, e.y);
            spawnParticles(f.x, f.y, '#00ccff', 20); spawnParticles(f.x, f.y, '#ffffff', 10);
            playSfx('fireball_explode');
            f.vx = 0; f.vy = 0; f.dissipating = true; f.dissipateTimer = 15;
            if (e.hp <= 0) { killEntity(e, enemies, j); }
          }
          break;
        } else {
          // Regular fireball behavior
          const dmg = f.damage ?? rarityDamage(BASE_FIREBALL_DAMAGE, player.staffRarity);
          e.hp -= dmg * player.damageMult;
          e.burnTimer = 300; e.burnDps = 20 / 300;
          spawnParticles(f.x, f.y, '#ff4400', 10); f.dissipating = true; f.dissipateTimer = 20; f.trail = []; playSfx('fireball_explode');
          spawnBloodParticles(e.x + e.w / 2, e.y);
          if (e.hp <= 0) { killEntity(e, enemies, j); }
          break;
        }
      }
    }
  }
}

// --- BOMBS ---
export function updateBombs(dt) {
  for (let i = playerBombs.length - 1; i >= 0; i--) {
    const b = playerBombs[i];
    if (b.exploded) {
      b.explodeTimer -= dt;
      if (b.explodeTimer <= 0) {
        // Phase 3b: Return bomb to pool for reuse
        const removed = playerBombs.splice(i, 1);
        if (removed.length > 0) releaseBomb(removed[0]);
      }
      continue;
    }
    b.vx *= Math.pow(0.995, dt); b.vy += BOMB_GRAVITY * dt;
    b.x  += b.vx * dt; b.y  += b.vy * dt; b.life -= dt;
    b.trailIndex = b.trailIndex ?? 0;
    b.trail[b.trailIndex] = {x: b.x, y: b.y, age: 0};
    b.trailIndex = (b.trailIndex + 1) % BOMB_TRAIL_MAX_LENGTH;  // Circular buffer
    for (const t of b.trail) t.age++;
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
      if (e.hp <= 0) { killEntity(e, enemies, j); }
    }
  }
  for (let k = 0; k < 3; k++) spawnParticles(b.x, b.y, '#ff6600', 8);
  spawnParticles(b.x, b.y, '#ffcc00', 10); spawnParticles(b.x, b.y, '#ffffff', 5);
  playSfx('bomb_explode');
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

  // Crossbow bolts
  for (const b of crossbowBolts) {
    const sx = b.x - cameraX;
    ctx.save(); ctx.translate(sx, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    
    if (b.isKineticBolt) {
      // Large kinetic bolt - 3x normal size with glowing effect
      ctx.fillStyle = '#ff6644'; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 20;
      ctx.fillRect(-21, -3.75, 42, 7.5);  // 1.5x dimensions (3x area)
      
      // Glowing core
      ctx.fillStyle = '#ffaa55'; 
      ctx.fillRect(-20, -3, 40, 6);
      
      // Arrow tip (larger)
      ctx.fillStyle = '#661100';
      ctx.beginPath(); ctx.moveTo(21, 0); ctx.lineTo(9, -4.5); ctx.lineTo(9, 4.5); ctx.closePath(); ctx.fill();
      
      // Glow effect
      ctx.strokeStyle = 'rgba(255, 150, 0, 0.4)'; ctx.lineWidth = 3;
      ctx.strokeRect(-20, -3.5, 40, 7);
    } else {
      // Normal crossbow bolt
      ctx.fillStyle = '#cc5533'; ctx.shadowColor = '#ff8833'; ctx.shadowBlur = 10;
      ctx.fillRect(-14, -2.5, 28, 5);
      ctx.fillStyle = '#332200';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -3); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
    }
    
    ctx.shadowBlur = 0; ctx.restore();
  }

  // Player staff orbs
  for (const o of playerOrbs) {
    const sx = o.x - cameraX;
    if (o.isSpark) {
      // Lightning Spark - large cyan/white glowing electrical ball
      const displayRadius = o.r * 2;  // 2x the size of normal orbs
      
      // Large outer glow
      const outerGlow = ctx.createRadialGradient(sx, o.y, 0, sx, o.y, displayRadius * 2.5);
      outerGlow.addColorStop(0, 'rgba(0, 200, 255, 0.4)');
      outerGlow.addColorStop(0.5, 'rgba(0, 150, 200, 0.1)');
      outerGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath(); ctx.arc(sx, o.y, displayRadius * 2.5, 0, Math.PI * 2); ctx.fill();
      
      // Middle glow layer
      const midGlow = ctx.createRadialGradient(sx, o.y, 0, sx, o.y, displayRadius * 1.5);
      midGlow.addColorStop(0, 'rgba(100, 220, 255, 0.6)');
      midGlow.addColorStop(0.6, 'rgba(0, 180, 255, 0.3)');
      midGlow.addColorStop(1, 'rgba(0, 150, 200, 0)');
      ctx.fillStyle = midGlow;
      ctx.beginPath(); ctx.arc(sx, o.y, displayRadius * 1.5, 0, Math.PI * 2); ctx.fill();
      
      // Core gradient - bright white to cyan
      const sparkGrad = ctx.createRadialGradient(sx - displayRadius * 0.3, o.y - displayRadius * 0.3, 0, sx, o.y, displayRadius);
      sparkGrad.addColorStop(0, '#ffffff');
      sparkGrad.addColorStop(0.3, '#ddffff');
      sparkGrad.addColorStop(0.6, '#00ddff');
      sparkGrad.addColorStop(1, '#0088ff');
      ctx.fillStyle = sparkGrad;
      ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 28;
      ctx.beginPath(); ctx.arc(sx, o.y, displayRadius, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      
      // Electric spark details
      const sparkCount = 8;
      for (let s = 0; s < sparkCount; s++) {
        const angle = (s / sparkCount) * Math.PI * 2;
        const sparkLength = displayRadius * (0.8 + Math.sin(Date.now() * 0.01 + s) * 0.4);
        const sparkX = sx + Math.cos(angle) * sparkLength;
        const sparkY = o.y + Math.sin(angle) * sparkLength;
        ctx.strokeStyle = `rgba(100, 220, 255, ${0.6 + Math.sin(Date.now() * 0.008 + s) * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, o.y);
        ctx.lineTo(sparkX, sparkY);
        ctx.stroke();
      }
    } else {
      // Regular staff orb - purple
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
  }

  // Fireballs
  for (const f of fireballsPlayer) {
    const sx    = f.x - cameraX;
    const t     = Date.now() * 0.008;
    const pulse = 1 + Math.sin(t + f.x * 0.1) * 0.15;
    const r     = f.r * pulse;
    if (f.isLightningBolt) {
      // Lightning Bolt - violent descending lightning strike from top of screen to impact
      const sx = f.x - cameraX;
      const boltWidth = f.r * 2;
      const topY = 0;  // Start from top of screen
      const impactY = f.y;  // Current position is the impact point
      const boltLength = impactY - topY;
      const pulseBrightness = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
      
      // Draw jagged lightning bolt shape
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * pulseBrightness})`;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Main bolt path with jagged edges
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      for (let i = 0; i < boltLength; i += 20) {
        const jaggedness = (Math.random() - 0.5) * boltWidth * 0.8;
        ctx.lineTo(sx + jaggedness, topY + i);
      }
      ctx.lineTo(sx, impactY);
      ctx.stroke();
      
      // Bright white core
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseBrightness})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      for (let i = 0; i < boltLength; i += 20) {
        const jaggedness = (Math.random() - 0.5) * boltWidth * 0.4;
        ctx.lineTo(sx + jaggedness, topY + i);
      }
      ctx.lineTo(sx, impactY);
      ctx.stroke();
      
      // Cyan glow surrounding the bolt
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.6 * pulseBrightness})`;
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      for (let i = 0; i < boltLength; i += 20) {
        const jaggedness = (Math.random() - 0.5) * boltWidth;
        ctx.lineTo(sx + jaggedness, topY + i);
      }
      ctx.lineTo(sx, impactY);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Electric branching effects
      const branchCount = 3;
      for (let b = 0; b < branchCount; b++) {
        const startPos = Math.random() * boltLength;
        const branchAngle = (Math.random() - 0.5) * Math.PI * 0.5;
        const baseX = sx + (Math.random() - 0.5) * boltWidth;
        ctx.strokeStyle = `rgba(100, 220, 255, ${0.5 * pulseBrightness})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(baseX, topY + startPos);
        for (let s = 0; s < 40; s += 10) {
          const x = baseX + Math.cos(branchAngle) * s;
          const y = topY + startPos + Math.sin(branchAngle) * s + (Math.random() - 0.5) * 10;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else {
      // Fireball - orange/red effect
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

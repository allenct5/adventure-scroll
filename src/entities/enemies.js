// enemies.js — Enemy spawn, AI update, and drawing.

import { GRAVITY, JUMP_FORCE, ENEMY_SPEED_BASE, W, H, rarityDamage } from '../core/constants.js';
import { platforms, spikes, lavaZones, ENEMY_SPAWN_POINTS, SKULL_SPAWN_POINTS, PLAYER_START_PLATFORM } from '../scenes/level.js';
import {
  player, playerClass, cameraX,
  enemies, playerAllies, enemyProjectiles, difficultyLevel,
} from '../core/state.js';
import { rectOverlap, resolvePlayerPlatforms, hazardAhead, deadlyHazardAhead, measurePitAhead } from '../utils/collision.js';
import { spawnParticles, spawnBloodParticles } from '../utils/particles.js';
import { tryDropPowerup, zoneBuffs } from '../utils/powerups.js';
import { dropCoin } from '../utils/coins.js';
import { damagePlayer } from './player.js';
import { playSfx } from '../utils/audio.js';
import { killEntity, applyHazardDamage, checkOffScreen } from '../utils/entityUtils.js';

import { ctx } from '../canvas.js';
import { getSprite } from '../utils/sprites.js';

const ENRAGE_HP_THRESHOLD  = 0.30; // fraction of maxHp below which orcs enrage
const ENRAGE_SPEED_MULT     = 1.50; // +50% move speed when enraged
const ENRAGE_COOLDOWN_MULT  = 0.70; // -30% attack cooldown when enraged (faster attacks)

// --- ENEMY TYPE SYSTEM ---
export const ENEMY_DISPLAY_NAMES = {
  outdoorOrc:  'Wandering Orc',
  castleOrc:   'Veteran Orc',
  evilOrc:     'Rampaging Orc',
  outdoorMage: 'Crazed Apprentice',
  castleMage:  'Court Wizard',
  evilMage:    'Mad Sorcerer',
  castleSkull: 'Raised Skull',
  evilSkull:   'Blazing Skull',
};

function resolveEnemyVariant(category) {
  if (category === 'orc') {
    if (difficultyLevel <= 2) return 'outdoorOrc';
    if (difficultyLevel <= 4) return 'castleOrc';
    return 'evilOrc';
  } else if (category === 'mage') {
    if (difficultyLevel <= 2) return 'outdoorMage';
    if (difficultyLevel <= 4) return 'castleMage';
    return 'evilMage';
  } else if (category === 'skull') {
    return difficultyLevel >= 5 ? 'evilSkull' : 'castleSkull';
  }
}

export function isOrc(type) {
  return type === 'outdoorOrc' || type === 'castleOrc' || type === 'evilOrc';
}

export function isMage(type) {
  return type === 'outdoorMage' || type === 'castleMage' || type === 'evilMage';
}

export function isSkull(type) {
  return type === 'castleSkull' || type === 'evilSkull';
}

export function spawnEnemy(type = 'outdoorOrc', spawnX = 100, spawnY = 350, staffRarity = 1) {
  const isMageType  = isMage(type);
  const isSkullType = isSkull(type);
  const baseHp      = isMageType ? 60 : isSkullType ? 40 : 80;
  // Apply staff rarity scaling for friendly summons only
  const hpWithRarity = Math.round(baseHp * (1 + (staffRarity - 1) * 0.2));
  // Only apply difficulty scaling if not a friendly summon (i.e., staffRarity = 1 means it's a regular enemy)
  const isSummon = staffRarity > 1;
  const finalHp = isSummon ? hpWithRarity : Math.round(hpWithRarity * Math.pow(1.2, difficultyLevel - 1));
  return {
    x: spawnX, y: spawnY,
    w: isMageType ? 26 : isSkullType ? 28 : 30,
    h: isMageType ? 44 : isSkullType ? 28 : 44,
    vx: 0, vy: 0,
    hp:    finalHp,
    maxHp: finalHp,
    speed: ENEMY_SPEED_BASE + Math.random() * 0.35,
    onGround: false, type,
    attackTimer: 0, fireTimer: isMageType ? 150 : 9999,
    aggroRange: isMageType ? 500 : isSkullType ? 500 : 132,
    facingRight: false,
    state: 'idle', spawnX, spawnY,
    idleTimer: 60, patrolDir: Math.random() < 0.5 ? 1 : -1,
    jumpCooldown: 0,
    sineOffset: Math.random() * Math.PI * 2,
    sineTime: 0,
  };
}

export function populateEnemies() {
  enemies.length = 0;
  const orcType   = resolveEnemyVariant('orc');
  const mageType  = resolveEnemyVariant('mage');
  const skullType = resolveEnemyVariant('skull');
  for (const sp of ENEMY_SPAWN_POINTS) {
    const onStart = sp.x >= PLAYER_START_PLATFORM.x && sp.x <= PLAYER_START_PLATFORM.x + PLAYER_START_PLATFORM.w;
    if (onStart) continue;
    const resolvedType = sp.type === 'melee' ? orcType
                       : sp.type === 'mage'  ? mageType
                       : sp.type;
    // Use spawn Y if provided (e.g., on floating platforms), adjusted for entity height
    // Otherwise spawn on ground platform (y=400, minus 44px entity height = 356)
    const spawnY = sp.y !== undefined ? sp.y - 44 : 356;
    enemies.push(spawnEnemy(resolvedType, sp.x, spawnY));
  }
  const skullCount = difficultyLevel === 3 ? 4 : difficultyLevel === 4 ? 6 : difficultyLevel >= 5 ? 8 : 0;
  for (let i = 0; i < skullCount; i++) {
    const sp = SKULL_SPAWN_POINTS[i];
    enemies.push(spawnEnemy(skullType, sp.x, 200));
  }
}

export function updateEnemies(dt) {
  // Helper: Find nearest hostile enemy for friendly units
  function findNearestHostileTarget(friendlyEnemy) {
    let nearest = null;
    let nearestDist = Infinity;
    const enemyCount = enemies.length;  // Cache length to avoid issues with array iteration
    for (let ei = 0; ei < enemyCount; ei++) {
      const e = enemies[ei];
      if (!e || e === friendlyEnemy || e.friendly) continue;  // Skip self and other friendlies
      const dx = e.x - friendlyEnemy.x;
      const dy = e.y - friendlyEnemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    // --- SKULL ---
    if (isSkull(e.type)) {
      e.sineTime += dt * 0.04;
      
      // Determine target: player if hostile, nearest enemy if friendly (otherwise follow player)
      let targetX, targetY, targetDist;
      let targetEntity = null;  // Store the actual target reference for attack code
      if (e.friendly) {
        targetEntity = findNearestHostileTarget(e);
        if (targetEntity) {
          targetX = targetEntity.x + targetEntity.w / 2;
          targetY = targetEntity.y + targetEntity.h / 2;
        } else {
          targetX = player.x + player.w / 2;
          targetY = player.y + player.h / 2;
        }
      } else {
        targetX = player.x + player.w / 2;
        targetY = player.y + player.h / 2;
        targetEntity = player;  // Hostile skulls target the player
      }
      
      const dx = targetX - (e.x + e.w / 2);
      const dy = targetY - (e.y + e.h / 2);
      const dist = Math.hypot(dx, dy);
      
      if (e.state === 'idle' && e.idleTimer <= 0 && dist < e.aggroRange && (!player.dead || e.friendly)) e.state = 'aggro';
      if (e.state === 'aggro' && (dist > e.aggroRange + 60 || (!e.friendly && player.dead))) { e.state = 'idle'; e.idleTimer = 60; }
      if (e.idleTimer > 0) e.idleTimer -= dt;

      if (e.knockbackTimer > 0) { e.knockbackTimer -= dt; e.vx *= 0.82; e.vy *= 0.82; }
      else if (e.state === 'idle') {
        const PATROL_RANGE = 120;
        const patrolX = e.spawnX + Math.sin(e.sineTime * 0.7 + e.sineOffset) * PATROL_RANGE;
        const patrolY = e.spawnY + Math.sin(e.sineTime * 1.4 + e.sineOffset) * 30;
        e.vx += (patrolX - e.x) * 0.04 * dt; e.vy += (patrolY - e.y) * 0.04 * dt;
        e.vx *= 0.92; e.vy *= 0.92; e.facingRight = e.vx > 0;
      } else if (e.bouncing) {
        e.vx *= Math.pow(0.88, dt); e.vy *= Math.pow(0.88, dt);
        e.bounceTimer -= dt; if (e.bounceTimer <= 0) e.bouncing = false;
      } else {
        const AGGRO_SPEED = 3.5, mag = dist || 1;
        e.vx = (dx / mag) * AGGRO_SPEED;
        e.vy = (dy / mag) * AGGRO_SPEED + Math.sin(e.sineTime * 2.2 + e.sineOffset) * 1.2;
        e.facingRight = dx > 0;
        if (dist < 36 && e.attackTimer <= 0) {
          const attackSpeedMult = (e.friendly && player.staffRarity >= 3) ? 0.833 : 1;  // 20% faster = 1/1.2
          e.attackTimer = 90 * attackSpeedMult;
          // Friendly skulls damage enemies, hostile skulls damage the player or summons
          if (e.friendly && targetEntity && targetEntity !== player) {
            const skillDmg = Math.round(rarityDamage(12, player.staffRarity) * player.summonDamageMult);
            targetEntity.hp -= skillDmg;
            playSfx('axe_attack');
            if (targetEntity.hp <= 0) { spawnBloodParticles(targetEntity.x+targetEntity.w/2, targetEntity.y); tryDropPowerup(targetEntity.x+targetEntity.w/2, targetEntity.y); dropCoin(targetEntity.x+targetEntity.w/2, targetEntity.y); const targetIdx = enemies.indexOf(targetEntity); if (targetIdx !== -1) killEntity(targetEntity, enemies, targetIdx); }
          } else if (!e.friendly) {
            // Hostile skulls try to damage summons first, then player
            let summonHit = false;
            // Check for nearby summons to attack (forward iteration to avoid nested backward loop issues)
            const enemyCountForSkullAttack = enemies.length;  // Cache length
            for (let si = 0; si < enemyCountForSkullAttack; si++) {
              if (si === i) continue;  // Skip self
              if (si >= enemies.length) continue;  // Safeguard
              const summon = enemies[si];
              if (summon && summon.friendly) {
                const sx = summon.x + summon.w / 2, sy = summon.y + summon.h / 2;
                const summonDist = Math.hypot(sx - (e.x + e.w / 2), sy - (e.y + e.h / 2));
                if (summonDist < 36) {
                  const skillDmg = Math.round(8 * Math.pow(1.2, difficultyLevel - 1));
                  summon.hp -= skillDmg;
                  playSfx('axe_attack');
                  if (summon.hp <= 0) { killEntity(summon, enemies, si); }
                  summonHit = true;
                  break;
                }
              }
            }
            if (!summonHit && player.invincible === 0) {
              damagePlayer(Math.round(8 * Math.pow(1.2, difficultyLevel - 1)), e.type);
            }
          }
          const BOUNCE_SPEED = 5.5;
          e.vx = -(dx / mag) * BOUNCE_SPEED; e.vy = -(dy / mag) * BOUNCE_SPEED - 1.5;
          e.bouncing = true; e.bounceTimer = 45;
        }
      }
      if (e.attackTimer > 0) e.attackTimer -= dt;
      if (e.burnTimer > 0) {
        e.burnTimer -= dt; e.hp -= e.burnDps * dt;
        if (e.hp <= 0) { killEntity(e, enemies, i); continue; }
      }
      if (e.bleedTimer > 0) {
        e.bleedTimer -= dt;
        const isMoving = Math.hypot(e.vx, e.vy) > 0.1;
        const bleedDam = e.bleedDps * dt * (isMoving ? 2 : 1);
        e.hp -= bleedDam;
        if (e.hp <= 0) { killEntity(e, enemies, i); continue; }
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      // Environmental damage (spikes, lava) for all enemies including summons
      let hazardKilled = false;
      for (const s of spikes) { 
        if (rectOverlap(e, {x:s.x,y:s.y,w:s.w,h:s.h})) { 
          if (applyHazardDamage(e, 35, enemies, i)) { hazardKilled = true; break; }
        } 
      }
      if (hazardKilled) continue;
      for (const l of lavaZones) { 
        if (rectOverlap(e, l)) { 
          if (applyHazardDamage(e, 999, enemies, i)) continue;
        } 
      }
      if (checkOffScreen(e, enemies, i, H)) continue;
      continue;
    }

    // --- GROUND ENEMIES ---
    e.vy += GRAVITY * 1.7 * dt;
    
    // Determine target for hostile vs friendly (if friendly with no target, follow player)
    let targetX, targetY, targetEntity;
    if (e.friendly) {
      targetEntity = findNearestHostileTarget(e);
      if (targetEntity) {
        targetX = targetEntity.x;
        targetY = targetEntity.y;
      } else {
        targetEntity = player;
        targetX = player.x;
        targetY = player.y;
      }
    } else {
      // For hostile enemies: target nearest summon if in range, otherwise target player
      let nearestSummon = null;
      let nearestSummonDist = Infinity;
      const enemyCount = enemies.length;  // Cache length before iteration
      for (let ei = 0; ei < enemyCount; ei++) {
        const ally = enemies[ei];
        if (ally && ally.friendly) {
          const summonDx = ally.x - e.x;
          const summonDy = ally.y - e.y;
          const summonDist = Math.hypot(summonDx, summonDy);
          if (summonDist < nearestSummonDist && summonDist < 400) {
            nearestSummonDist = summonDist;
            nearestSummon = ally;
          }
        }
      }
      if (nearestSummon) {
        targetEntity = nearestSummon;
        targetX = nearestSummon.x;
        targetY = nearestSummon.y;
      } else {
        targetEntity = player;
        targetX = player.x;
        targetY = player.y;
      }
    }
    
    const dx   = targetX - e.x;
    const dy   = targetY - e.y;
    const dist = Math.hypot(dx, dy);
    const enemyScreenX  = e.x - cameraX;
    const playerOnScreen = (player.x - cameraX) > -50 && (player.x - cameraX) < W + 50;
    const enemyOnScreen  = enemyScreenX > -100 && enemyScreenX < W + 100;
    const meleeAggroRange = 216;
    // Friendly units aggro to nearest hostile target if in range; hostile units aggro if player is visible OR a summon is nearby
    let hasSummonNearby = false;
    if (!e.friendly) {
      const enemyCountForAggro = enemies.length;  // Cache length
      for (let ei = 0; ei < enemyCountForAggro; ei++) {
        const ally = enemies[ei];
        if (ally && ally.friendly) {
          const allyDx = ally.x - e.x;
          const allyDy = ally.y - e.y;
          const allyDist = Math.hypot(allyDx, allyDy);
          if (allyDist < meleeAggroRange) {
            hasSummonNearby = true;
            break;
          }
        }
      }
    }
    
    // Orcs aggro if player is in range and visible; pit avoidance happens during movement, not as aggro gate
    const canAggro = isOrc(e.type) ? (dist < meleeAggroRange && playerOnScreen && enemyOnScreen) : ((playerOnScreen || (hasSummonNearby && enemyOnScreen)) && enemyOnScreen);
    if (e.state === 'idle' && canAggro && (!player.dead || e.friendly)) e.state = 'aggro';
    const stillAggro = isOrc(e.type) ? (dist < meleeAggroRange + 40 && playerOnScreen && enemyOnScreen) : ((playerOnScreen || hasSummonNearby) && !(!e.friendly && player.dead));
    if (e.state === 'aggro' && (!stillAggro || (!e.friendly && player.dead))) { e.state = 'idle'; e.idleTimer = 60; }

    if (e.knockbackTimer > 0) { e.knockbackTimer -= dt; e.vx *= 0.85; }
    else {
      if (e.state === 'idle') {
        if (e.idleTimer > 0) { e.idleTimer--; e.vx *= 0.8; }
        else {
          const PATROL_SPEED = e.speed * 0.585;
          if (e.onGround && hazardAhead(e, e.patrolDir)) { e.patrolDir *= -1; e.x += e.patrolDir * 16; }
          e.vx = e.patrolDir * PATROL_SPEED; e.facingRight = e.patrolDir > 0;
        }
      } else {
        if (!player.dead || e.friendly) {
          const moveDir = dx > 0 ? 1 : -1;
          if (isOrc(e.type)) {
            // Enrage below threshold — set once and never unset
            if (!e.enraged && e.hp / e.maxHp <= ENRAGE_HP_THRESHOLD) {
              e.enraged = true;
            }
            const speedMult   = (e.enraged ? ENRAGE_SPEED_MULT : 1) * zoneBuffs.enemySpeedMult;
            const aggroBonus = e.state === 'aggro' ? 1.4 : 1;  // 40% speed increase when aggroing
            const cooldownMult = (e.enraged ? ENRAGE_COOLDOWN_MULT : 1) * zoneBuffs.enemyAttackSpeedMult;
            const effectiveSpeed = e.speed * speedMult * aggroBonus;

            e.jumpCooldown = Math.max(0, e.jumpCooldown - dt);
            // Recalculate direction towards target (handles player movement)
            const currentDx = targetX - e.x;
            const currentMoveDir = currentDx > 0 ? 1 : -1;
            const deadlyWallAhead = deadlyHazardAhead(e, currentMoveDir);
            
            // During aggro, pursue fearlessly toward target unless blocked by deadly hazards (spikes/lava)
            // Pit avoidance is for patrol mode only, not during aggressive pursuit
            if (deadlyWallAhead) {
              // Stop if facing deadly hazard (spikes/lava)
              e.vx = 0;
            } else {
              // Move toward target without pit fear during aggro
              e.vx = currentMoveDir * effectiveSpeed;
            }
            const targetFeetY = targetEntity.y + targetEntity.h;
            const sameLevel   = targetFeetY > e.y - 10 && targetEntity.y < e.y + e.h + 10;
            if (dist < 42 && e.attackTimer <= 0 && sameLevel) {
              const attackSpeedMult = (e.friendly && player.staffRarity >= 3) ? 0.833 : 1;  // 20% faster = 1/1.2
              e.attackTimer = Math.round(112 * cooldownMult * attackSpeedMult);
              const baseDmg = e.friendly
                ? Math.round(rarityDamage(16, player.staffRarity) * player.summonDamageMult)
                : Math.round(12 * Math.pow(1.2, difficultyLevel - 1) * zoneBuffs.enemyDamageMult);
              playSfx('axe_attack');
              // Friendly orcs damage enemies, hostile orcs damage the player or summons
              if (e.friendly && targetEntity && targetEntity !== player) {
                targetEntity.hp -= baseDmg;
                if (targetEntity.hp <= 0) { spawnBloodParticles(targetEntity.x+targetEntity.w/2, targetEntity.y); tryDropPowerup(targetEntity.x+targetEntity.w/2, targetEntity.y); dropCoin(targetEntity.x+targetEntity.w/2, targetEntity.y); const targetIdx = enemies.indexOf(targetEntity); if (targetIdx !== -1) killEntity(targetEntity, enemies, targetIdx); }
              } else if (!e.friendly) {
                // Hostile orcs try to damage summons first, then player
                let summonHit = false;
                // Use forward iteration to safely handle array access (avoid nested backward loop)
                const enemyCountForOrcAttack = enemies.length;  // Cache length
                for (let si = 0; si < enemyCountForOrcAttack; si++) {
                  if (si === i) continue;  // Skip self
                  if (si >= enemies.length) continue;  // Safeguard in case array was modified
                  const summon = enemies[si];
                  if (summon && summon.friendly) {
                    const sx = summon.x + summon.w / 2, sy = summon.y + summon.h / 2;
                    const summonDist = Math.abs((summon.x + summon.w / 2) - e.x);
                    const summonFeetY = summon.y + summon.h;
                    const sameEnemyLevel = summonFeetY > e.y - 10 && summon.y < e.y + e.h + 10;
                    if (summonDist < 42 && sameEnemyLevel) {
                      summon.hp -= baseDmg;
                      if (summon.hp <= 0) { killEntity(summon, enemies, si); }
                      summonHit = true;
                      break;
                    }
                  }
                }
                if (!summonHit && player.invincible === 0) {
                  damagePlayer(baseDmg, e.type);
                }
              }
            }
          } else {
            // Mage
            const blocked        = e.onGround && hazardAhead(e, moveDir);
            const retreatDir     = -moveDir;
            const retreatBlocked = e.onGround && hazardAhead(e, retreatDir);
            if (dist > 300 && !blocked)             e.vx = moveDir * e.speed * 0.7;
            else if (dist < 150 && !retreatBlocked) e.vx = retreatDir * e.speed * 0.5;
            else e.vx *= 0.8;
            e.fireTimer -= dt;
            if (e.fireTimer <= 0 && dist < e.aggroRange) {
              e.fireTimer = 150;
              const dy2 = (targetY + targetEntity.h / 2) - (e.y + e.h / 2);
              const mag  = Math.sqrt(dx * dx + dy2 * dy2) || 1;
              enemyProjectiles.push({ x: e.x+e.w/2, y: e.y+e.h/2, vx: moveDir*5*(Math.abs(dx)/mag), vy: dy2/mag*5, life: 100, r: 7, killerType: e.type, friendly: e.friendly });
              playSfx('orb_spell');
            }
          }
          e.facingRight = dx > 0;
        }
      }
    }

    if (e.attackTimer > 0) e.attackTimer -= dt;
    if (e.burnTimer > 0) {
      e.burnTimer -= dt; e.hp -= e.burnDps * dt;
      if (e.hp <= 0) { killEntity(e, enemies, i); continue; }
    }
    if (e.bleedTimer > 0) {
      e.bleedTimer -= dt;
      const isMoving = Math.hypot(e.vx, e.vy) > 0.1;
      const bleedDam = e.bleedDps * dt * (isMoving ? 2 : 1);
      e.hp -= bleedDam;
      if (e.hp <= 0) { killEntity(e, enemies, i); continue; }
    }
    e.x += e.vx * dt; e.y += e.vy * dt;
    resolvePlayerPlatforms(e);
    
    // Hostile melee enemies pass through each other, but don't pass through summons
    if (!e.friendly && (isOrc(e.type) || isSkull(e.type))) {
      const enemyCount = enemies.length;  // Cache length to prevent issues during iteration
      for (let j = 0; j < enemyCount; j++) {
        if (i === j) continue;
        if (j >= enemies.length) break;  // Safeguard in case array was modified
        const other = enemies[j];
        // Only separate if the other is a friendly summon; hostile enemies pass through each other
        if (other && other.friendly && rectOverlap(e, other)) {
          const dx = (e.x + e.w / 2) - (other.x + other.w / 2);
          const dy = (e.y + e.h / 2) - (other.y + other.h / 2);
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = (e.w + other.w) / 2 + 2;
          const pushDist = (minDist - dist) / 2;
          e.x += (dx / dist) * pushDist;
          e.y += (dy / dist) * pushDist;
        }
      }
    }
    
    // Environmental damage (spikes, lava) for all enemies including summons
    let hazardKilled = false;
    for (const s of spikes) { 
      if (rectOverlap(e, {x:s.x,y:s.y,w:s.w,h:s.h})) { 
        if (applyHazardDamage(e, 35, enemies, i)) { hazardKilled = true; break; }
      } 
    }
    if (hazardKilled) continue;
    for (const l of lavaZones) { 
      if (rectOverlap(e, l)) { 
        if (applyHazardDamage(e, 999, enemies, i)) continue;
      } 
    }
    if (checkOffScreen(e, enemies, i, H)) continue;
  }

  // Enemy projectiles
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.05 * dt; p.life -= dt;
    if (p.life <= 0) { enemyProjectiles.splice(i, 1); continue; }
    const pRect = {x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2};
    let hitTerrain = false;
    for (const plat of platforms) { if (rectOverlap(pRect, plat)) { hitTerrain = true; break; } }
    const projectileColor = p.killerType === 'evilMage' ? '#ff6600' : p.killerType === 'castleMage' ? '#4488ff' : '#ff88ff';
    if (hitTerrain) { p.vx = 0; p.vy = 0; p.life = Math.min(p.life, 12); spawnParticles(p.x, p.y, projectileColor, 4); continue; }

    // Warrior block / reflect
    if (player.blocking && !player.dead && playerClass === 'warrior') {
      const playerCx = player.x + player.w / 2, playerCy = player.y + player.h / 2;
      const distToPlayer = Math.hypot(p.x - playerCx, p.y - playerCy);
      if (distToPlayer < 60) {
        let target = null, bestDist = Infinity;
        const enemyCountForReflect = enemies.length;  // Cache length
        for (let ei = 0; ei < enemyCountForReflect; ei++) {
          const e = enemies[ei];
          if (e) {
            const d = Math.hypot((e.x+e.w/2) - playerCx, (e.y+e.h/2) - playerCy);
            if (d < bestDist) { bestDist = d; target = e; }
          }
        }
        const REFLECT_SPEED = 7;
        if (target) { const tx = target.x+target.w/2, ty = target.y+target.h/2, mag = Math.hypot(tx-p.x, ty-p.y)||1; p.vx = (tx-p.x)/mag*REFLECT_SPEED; p.vy = (ty-p.y)/mag*REFLECT_SPEED; }
        else { p.vx = -p.vx * 1.5; p.vy = -p.vy * 1.5; }
        p.reflected = true; p.life = 120; playSfx('shield_reflect'); spawnParticles(p.x, p.y, '#aaddff', 10); continue;
      }
    }
    if (player.blocking && !player.dead && playerClass === 'warrior' && rectOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2}, player)) {
      spawnParticles(p.x, p.y, projectileColor, 6); enemyProjectiles.splice(i, 1); continue;
    }
    if (p.reflected) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e && rectOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2}, e)) {
          e.hp -= 18; spawnBloodParticles(p.x, p.y);
          if (e.hp <= 0) { killEntity(e, enemies, j); }
          enemyProjectiles.splice(i, 1); break;
        }
      }
      continue;
    }
    // Friendly projectiles (from summons) damage enemies
    if (p.friendly) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e && !e.friendly && rectOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2}, e)) {
          const dmg = Math.round(rarityDamage(18, player.staffRarity) * player.summonDamageMult);
          e.hp -= dmg;
          spawnBloodParticles(p.x, p.y);
          if (e.hp <= 0) { killEntity(e, enemies, j); }
          playSfx('orb_hit'); spawnParticles(p.x, p.y, projectileColor, 8); enemyProjectiles.splice(i, 1); break;
        }
      }
      continue;
    }
    // Hostile projectiles (from enemies) damage summons
    if (!p.friendly) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e && e.friendly && rectOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2}, e)) {
          const dmg = Math.round(18 * Math.pow(1.2, difficultyLevel - 1));
          e.hp -= dmg;
          spawnBloodParticles(p.x, p.y);
          if (e.hp <= 0) { killEntity(e, enemies, j); }
          playSfx('orb_hit'); spawnParticles(p.x, p.y, projectileColor, 8); enemyProjectiles.splice(i, 1); break;
        }
      }
    }
    if (!player.dead && player.invincible === 0 && rectOverlap({x:p.x-3,y:p.y-3,w:6,h:6}, player)) {
      damagePlayer(Math.round(18 * Math.pow(1.2, difficultyLevel - 1)), p.killerType || null);
      playSfx('orb_hit'); spawnParticles(p.x, p.y, projectileColor, 8); enemyProjectiles.splice(i, 1);
    }
  }
}

// Shared HP bar helper — used by both skull and ground enemy draw paths
function drawEnemyHpBar(sx, e) {
  const hpPct = e.hp / e.maxHp;
  ctx.fillStyle = '#440000'; ctx.fillRect(sx, e.y - 8, e.w, 5);
  ctx.fillStyle = hpPct > 0.5 ? '#44ff44' : '#ff4444'; ctx.fillRect(sx, e.y - 8, e.w * hpPct, 5);
}

export function drawEnemies() {
  for (const e of enemies) {
    const sx = e.x - cameraX;
    if (sx > W + 80 || sx < -80) continue;

    const _eSprite = getSprite('enemy_' + e.type);
    if (_eSprite) {
      ctx.save();
      if (!isSkull(e.type) && !e.facingRight) {
        ctx.translate(sx + e.w, e.y); ctx.scale(-1, 1);
      } else {
        ctx.translate(sx, e.y);
      }
      ctx.drawImage(_eSprite, 0, 0, e.w, e.h);
      ctx.restore();
    } else if (isSkull(e.type)) {
      ctx.save(); ctx.translate(sx + e.w / 2, e.y + e.h / 2);

      const flapAngle  = Math.sin(e.sineTime * 2.2 + e.sineOffset) * 0.45;
      const wingColor0 = e.type === 'evilSkull' ? 'rgba(220,80,0,0.75)'  : 'rgba(150,0,220,0.75)';
      const wingColor1 = e.type === 'evilSkull' ? 'rgba(80,20,0,0)'       : 'rgba(80,0,120,0)';
      const veinColor  = e.type === 'evilSkull' ? 'rgba(180,60,0,0.5)'    : 'rgba(100,0,180,0.5)';

      for (const side of [1, -1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flapAngle);
        const wingGrad = ctx.createRadialGradient(14, -6, 1, 14, -6, 20);
        wingGrad.addColorStop(0, wingColor0); wingGrad.addColorStop(1, wingColor1);
        ctx.fillStyle = wingGrad;
        ctx.beginPath();
        ctx.moveTo(3, -1);
        ctx.bezierCurveTo(10, -16, 28, -12, 26, 1);
        ctx.bezierCurveTo(22, 11, 7, 9, 3, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = veinColor; ctx.lineWidth = 0.6;
        for (let wi = 1; wi <= 3; wi++) {
          ctx.beginPath(); ctx.moveTo(3, 1); ctx.lineTo(8 + wi * 5, -9 + wi * 2); ctx.stroke();
        }
        ctx.restore();
      }
      if (!e.facingRight) ctx.scale(-1, 1);
      const skullGrad = ctx.createRadialGradient(-3, -5, 1, 0, 0, 13);
      skullGrad.addColorStop(0, '#f0eeea'); skullGrad.addColorStop(0.6, '#c8c4b8'); skullGrad.addColorStop(1, '#88857a');
      ctx.fillStyle = skullGrad;
      ctx.shadowColor = e.type === 'evilSkull' ? '#ff4400' : '#cc44ff';
      ctx.shadowBlur = e.state === 'aggro' ? 14 : 6;
      ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.bezierCurveTo(11, 6, 7, 10, 0, 10); ctx.bezierCurveTo(-7, 10, -11, 6, -11, 0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b0ada0'; ctx.fillRect(-8, 4, 16, 5);
      const eyeColor = e.state === 'aggro' ? '#ff2200' : e.type === 'evilSkull' ? '#ff6600' : '#aa44ff';
      ctx.fillStyle = eyeColor; ctx.shadowColor = eyeColor; ctx.shadowBlur = e.state === 'aggro' ? 10 : 5;
      ctx.beginPath(); ctx.ellipse(-4, 0, 3.5, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( 4, 0, 3.5, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(0, 3); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e4da';
      for (let ti = -3; ti <= 3; ti += 2) ctx.fillRect(ti - 0.8, 7, 1.8, 3);
      ctx.strokeStyle = '#555047'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.bezierCurveTo(11, 6, 7, 10, 0, 10); ctx.bezierCurveTo(-7, 10, -11, 6, -11, 0); ctx.closePath(); ctx.stroke();
      ctx.restore();

    } else if (isOrc(e.type)) {
      ctx.save(); ctx.translate(sx, e.y);
      if (!e.facingRight) { ctx.translate(e.w, 0); ctx.scale(-1, 1); }
      const c = e.type === 'castleOrc'
        ? { bodyTop:'#3366cc', bodyBot:'#112255', armor:'#224488', highlight:'#4488ee', legs:'#112244', head:'#4477dd' }
        : e.type === 'evilOrc'
        ? { bodyTop:'#cc2200', bodyBot:'#550800', armor:'#882200', highlight:'#ff4422', legs:'#440800', head:'#dd3311' }
        : { bodyTop:'#44aa33', bodyBot:'#225511', armor:'#336622', highlight:'#88cc44', legs:'#224411', head:'#55cc33' };
      const ebody = ctx.createLinearGradient(0, 0, 0, e.h);
      ebody.addColorStop(0, c.bodyTop); ebody.addColorStop(1, c.bodyBot);
      ctx.fillStyle = ebody; ctx.fillRect(3, 12, e.w-6, e.h-12);
      ctx.fillStyle = c.armor; ctx.fillRect(3, 12, e.w-6, 12);
      ctx.fillStyle = c.highlight; ctx.fillRect(3, 12, e.w-6, 5);
      // Position-based leg animation so it pauses correctly with the game
      const legOff = e.vx !== 0 ? Math.sin(e.x * 0.15) * 4 : 0;
      ctx.fillStyle = c.legs;
      ctx.fillRect(3, e.h-14, 9, 14+legOff); ctx.fillRect(e.w-12, e.h-14, 9, 14-legOff);
      ctx.fillStyle = c.head; ctx.fillRect(5, 0, e.w-10, 14);
      // Eyes — red and glowing when enraged, plain otherwise
      const eyeCol = e.enraged ? '#ff2200' : '#ff2222';
      ctx.fillStyle = eyeCol;
      ctx.shadowColor = eyeCol;
      ctx.shadowBlur  = e.enraged ? 12 + Math.sin(Date.now() * 0.02) * 5 : 0;
      ctx.fillRect(e.w/2-3, 5, 4, 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#888888'; ctx.fillRect(e.w-4, 12, 4, 20);
      ctx.fillStyle = '#aaaaaa';
      ctx.beginPath(); ctx.moveTo(e.w, 10); ctx.lineTo(e.w+14, 18); ctx.lineTo(e.w, 26); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Enrage pulse overlay — drawn outside the saved transform so it aligns with world coords
      if (e.enraged) {
        const pulse = 0.18 + Math.sin(Date.now() * 0.018) * 0.10;
        ctx.save();
        ctx.globalAlpha = pulse;
        const enrageGrad = ctx.createLinearGradient(sx, e.y, sx, e.y + e.h);
        enrageGrad.addColorStop(0, '#ff4400');
        enrageGrad.addColorStop(0.5, '#cc1100');
        enrageGrad.addColorStop(1, '#440000');
        ctx.fillStyle = enrageGrad;
        ctx.fillRect(sx, e.y, e.w, e.h);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    } else {
      // Mage variants
      ctx.save(); ctx.translate(sx, e.y);
      if (!e.facingRight) { ctx.translate(e.w, 0); ctx.scale(-1, 1); }
      const m = e.type === 'castleMage'
        ? { bodyTop:'#ccaa00', bodyBot:'#665500', robe:'#ddbb11', head:'#ffe980', hat:'#332200', staffShaft:'#886600', orb:'#ffee00', orbGlow:'#ffcc00' }
        : e.type === 'evilMage'
        ? { bodyTop:'#cc5500', bodyBot:'#661800', robe:'#ee6600', head:'#ffaa66', hat:'#220800', staffShaft:'#993300', orb:'#ff8800', orbGlow:'#ff6600' }
        : { bodyTop:'#aa44cc', bodyBot:'#440066', robe:'#cc55ee', head:'#ddaaff', hat:'#220033', staffShaft:'#6633aa', orb:'#ff44ff', orbGlow:'#ff44ff' };
      const mgrad = ctx.createLinearGradient(0, 0, 0, e.h);
      mgrad.addColorStop(0, m.bodyTop); mgrad.addColorStop(1, m.bodyBot);
      ctx.fillStyle = mgrad; ctx.fillRect(4, 10, e.w-8, e.h-10);
      ctx.fillStyle = m.robe; ctx.fillRect(2, 24, e.w-4, e.h-24);
      ctx.fillStyle = m.head; ctx.fillRect(6, 0, e.w-12, 12);
      ctx.fillStyle = m.hat; ctx.fillRect(4, -8, e.w-8, 10); ctx.fillRect(8, -16, e.w-16, 10);
      ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 8;
      ctx.fillRect(e.w/2-4, 3, 3, 4); ctx.fillRect(e.w/2+1, 3, 3, 4);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = m.staffShaft; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(e.w-3, 10); ctx.lineTo(e.w-3, e.h-10); ctx.stroke();
      ctx.fillStyle = m.orb; ctx.shadowColor = m.orbGlow; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(e.w-3, 8, 6, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Burn overlay
    if (e.burnTimer > 0) {
      const t = Date.now() * 0.006, pulse = 0.35 + Math.sin(t * 3) * 0.2;
      ctx.save(); ctx.globalAlpha = pulse;
      const burnGrad = ctx.createLinearGradient(sx, e.y, sx, e.y + e.h);
      burnGrad.addColorStop(0, '#ff2200'); burnGrad.addColorStop(0.5, '#880000'); burnGrad.addColorStop(1, '#000000');
      ctx.fillStyle = burnGrad; ctx.fillRect(sx, e.y, e.w, e.h);
      if (Math.random() < 0.25) spawnParticles(e.x + Math.random() * e.w, e.y + Math.random() * e.h * 0.5, Math.random() < 0.5 ? '#ff4400' : '#ff8800', 1);
      ctx.restore();
    }

    // Bleed overlay
    if (e.bleedTimer > 0) {
      const t = Date.now() * 0.006, pulse = 0.4 + Math.sin(t * 2.5) * 0.15;
      ctx.save(); ctx.globalAlpha = pulse;
      const bleedGrad = ctx.createLinearGradient(sx, e.y, sx, e.y + e.h);
      bleedGrad.addColorStop(0, '#dd0000'); bleedGrad.addColorStop(0.5, '#660000'); bleedGrad.addColorStop(1, '#220000');
      ctx.fillStyle = bleedGrad; ctx.fillRect(sx, e.y, e.w, e.h);
      if (Math.random() < 0.15) spawnParticles(e.x + Math.random() * e.w, e.y + e.h + Math.random() * 4, '#8B0000', 1);
      ctx.restore();
    }

    drawEnemyHpBar(sx, e);
  }
}

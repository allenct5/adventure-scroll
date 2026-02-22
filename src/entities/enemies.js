// enemies.js — Enemy spawn, AI update, and drawing.

import { GRAVITY, JUMP_FORCE, ENEMY_SPEED_BASE, W, H } from '../core/constants.js';
import { platforms, ENEMY_SPAWN_POINTS, SKULL_SPAWN_POINTS, PLAYER_START_PLATFORM } from '../scenes/level.js';
import {
  player, playerClass, cameraX,
  enemies, enemyProjectiles, difficultyLevel,
} from '../core/state.js';
import { rectOverlap, resolvePlayerPlatforms, hazardAhead, deadlyHazardAhead, measurePitAhead } from '../utils/collision.js';
import { spawnParticles, spawnBloodParticles } from '../utils/particles.js';
import { tryDropPowerup, zoneBuffs } from '../utils/powerups.js';
import { dropCoin } from '../utils/coins.js';
import { damagePlayer } from './player.js';

import { ctx } from '../canvas.js';

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

function resolveOrcType() {
  if (difficultyLevel <= 2) return 'outdoorOrc';
  if (difficultyLevel <= 4) return 'castleOrc';
  return 'evilOrc';
}

function resolveMageType() {
  if (difficultyLevel <= 2) return 'outdoorMage';
  if (difficultyLevel <= 4) return 'castleMage';
  return 'evilMage';
}

function resolveSkullType() {
  return difficultyLevel >= 5 ? 'evilSkull' : 'castleSkull';
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

export function spawnEnemy(type = 'outdoorOrc', spawnX = 100, spawnY = 350) {
  const isMageType  = isMage(type);
  const isSkullType = isSkull(type);
  const baseHp      = isMageType ? 60 : isSkullType ? 40 : 80;
  return {
    x: spawnX, y: spawnY,
    w: isMageType ? 26 : isSkullType ? 28 : 30,
    h: isMageType ? 44 : isSkullType ? 28 : 44,
    vx: 0, vy: 0,
    hp:    Math.round(baseHp * Math.pow(1.2, difficultyLevel - 1)),
    maxHp: Math.round(baseHp * Math.pow(1.2, difficultyLevel - 1)),
    speed: ENEMY_SPEED_BASE + Math.random() * 0.35,
    onGround: false, type,
    attackTimer: 0, fireTimer: isMageType ? 150 : 9999,
    projectiles: [],
    aggroRange: isMageType ? 500 : isSkullType ? 300 : 220,
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
  const orcType   = resolveOrcType();
  const mageType  = resolveMageType();
  const skullType = resolveSkullType();
  for (const sp of ENEMY_SPAWN_POINTS) {
    const onStart = sp.x >= PLAYER_START_PLATFORM.x && sp.x <= PLAYER_START_PLATFORM.x + PLAYER_START_PLATFORM.w;
    if (onStart) continue;
    const resolvedType = sp.type === 'melee' ? orcType
                       : sp.type === 'mage'  ? mageType
                       : sp.type;
    enemies.push(spawnEnemy(resolvedType, sp.x, 50));
  }
  const skullCount = difficultyLevel === 3 ? 4 : difficultyLevel === 4 ? 6 : difficultyLevel >= 5 ? 8 : 0;
  for (let i = 0; i < skullCount; i++) {
    const sp = SKULL_SPAWN_POINTS[i];
    enemies.push(spawnEnemy(skullType, sp.x, 200));
  }
}

export function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    // --- SKULL ---
    if (isSkull(e.type)) {
      e.sineTime += dt * 0.04;
      const dx   = (player.x + player.w / 2) - (e.x + e.w / 2);
      const dy   = (player.y + player.h / 2) - (e.y + e.h / 2);
      const dist = Math.hypot(dx, dy);
      if (e.state === 'idle' && e.idleTimer <= 0 && dist < e.aggroRange && !player.dead) e.state = 'aggro';
      if (e.state === 'aggro' && (dist > e.aggroRange + 60 || player.dead)) { e.state = 'idle'; e.idleTimer = 60; }
      if (e.idleTimer > 0) e.idleTimer -= dt;

      if (e.knockbackTimer > 0) { e.knockbackTimer -= dt; e.vx *= 0.82; e.vy *= 0.82; }
      else if (e.state === 'idle') {
        const PATROL_RANGE = 120;
        const targetX = e.spawnX + Math.sin(e.sineTime * 0.7 + e.sineOffset) * PATROL_RANGE;
        const targetY = e.spawnY + Math.sin(e.sineTime * 1.4 + e.sineOffset) * 30;
        e.vx += (targetX - e.x) * 0.04 * dt; e.vy += (targetY - e.y) * 0.04 * dt;
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
          e.attackTimer = 90;
          if (player.invincible === 0) damagePlayer(Math.round(8 * Math.pow(1.2, difficultyLevel - 1)), e.type);
          const BOUNCE_SPEED = 5.5;
          e.vx = -(dx / mag) * BOUNCE_SPEED; e.vy = -(dy / mag) * BOUNCE_SPEED - 1.5;
          e.bouncing = true; e.bounceTimer = 45;
        }
      }
      if (e.attackTimer > 0) e.attackTimer -= dt;
      if (e.burnTimer > 0) {
        e.burnTimer -= dt; e.hp -= e.burnDps * dt;
        if (e.hp <= 0) { spawnBloodParticles(e.x+e.w/2, e.y+e.h/2); tryDropPowerup(e.x+e.w/2, e.y); dropCoin(e.x+e.w/2, e.y); enemies.splice(i, 1); continue; }
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.y > H + 100 || e.y < -200) { enemies.splice(i, 1); continue; }
      continue;
    }

    // --- GROUND ENEMIES ---
    e.vy += GRAVITY * 1.7 * dt;
    const dx   = player.x - e.x;
    const dist = Math.abs(dx);
    const enemyScreenX  = e.x - cameraX;
    const playerOnScreen = (player.x - cameraX) > -50 && (player.x - cameraX) < W + 50;
    const enemyOnScreen  = enemyScreenX > -100 && enemyScreenX < W + 100;
    const meleeAggroRange = 180;
    const canAggro = isOrc(e.type) ? (dist < meleeAggroRange && enemyOnScreen) : (playerOnScreen && enemyOnScreen);
    if (e.state === 'idle' && e.idleTimer <= 0 && canAggro && !player.dead) e.state = 'aggro';
    const stillAggro = isOrc(e.type) ? (dist < meleeAggroRange + 40 && enemyOnScreen) : playerOnScreen;
    if (e.state === 'aggro' && (!stillAggro || player.dead)) { e.state = 'idle'; e.idleTimer = 60; }

    if (e.knockbackTimer > 0) { e.knockbackTimer -= dt; e.vx *= 0.85; }
    else {
      if (e.state === 'idle') {
        if (e.idleTimer > 0) { e.idleTimer--; e.vx *= 0.8; }
        else {
          const PATROL_SPEED = e.speed * 0.45;
          if (e.onGround && hazardAhead(e, e.patrolDir)) { e.patrolDir *= -1; e.x += e.patrolDir * 16; }
          e.vx = e.patrolDir * PATROL_SPEED; e.facingRight = e.patrolDir > 0;
        }
      } else {
        if (!player.dead) {
          const moveDir = dx > 0 ? 1 : -1;
          if (isOrc(e.type)) {
            // Enrage below threshold — set once and never unset
            if (!e.enraged && e.hp / e.maxHp <= ENRAGE_HP_THRESHOLD) {
              e.enraged = true;
            }
            const speedMult   = (e.enraged ? ENRAGE_SPEED_MULT : 1) * zoneBuffs.enemySpeedMult;
            const cooldownMult = (e.enraged ? ENRAGE_COOLDOWN_MULT : 1) * zoneBuffs.enemyAttackSpeedMult;
            const effectiveSpeed = e.speed * speedMult;

            e.jumpCooldown = Math.max(0, e.jumpCooldown - dt);
            const deadlyWallAhead = deadlyHazardAhead(e, moveDir);
            const onGroundPlatform = platforms.some(p => p.type === 'ground' && e.x + e.w > p.x && e.x < p.x + p.w && Math.abs((e.y + e.h) - p.y) < 6);
            const pitWidth = e.onGround && onGroundPlatform ? measurePitAhead(e, moveDir) : 0;
            const pitAhead = pitWidth > 0;
            if (pitAhead && e.onGround && e.jumpCooldown <= 0) {
              const jumpVy = JUMP_FORCE * 0.9, g = GRAVITY * 1.7, airTime = (-2 * jumpVy) / g;
              const requiredVx = (pitWidth * 1.2) / airTime;
              e.vy = jumpVy; e.vx = moveDir * Math.max(requiredVx, effectiveSpeed * 1.2); e.jumpCooldown = 70;
            } else if (dist > 38 && !deadlyWallAhead && !pitAhead) {
              e.vx = moveDir * effectiveSpeed;
            } else if (deadlyWallAhead) { e.vx *= 0.8; }
            const playerFeetY = player.y + player.h;
            const sameLevel   = playerFeetY > e.y - 10 && player.y < e.y + e.h + 10;
            if (dist < 42 && e.attackTimer <= 0 && sameLevel) {
              e.attackTimer = Math.round(112 * cooldownMult);
              const baseDmg = Math.round(12 * Math.pow(1.2, difficultyLevel - 1) * zoneBuffs.enemyDamageMult);
              if (player.invincible === 0) damagePlayer(baseDmg, e.type);
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
              const dy2 = (player.y + player.h / 2) - (e.y + e.h / 2);
              const mag  = Math.sqrt(dx * dx + dy2 * dy2) || 1;
              enemyProjectiles.push({ x: e.x+e.w/2, y: e.y+e.h/2, vx: moveDir*5*(Math.abs(dx)/mag), vy: dy2/mag*5, life: 100, r: 7, killerType: e.type });
            }
          }
          e.facingRight = dx > 0;
        }
      }
    }

    if (e.attackTimer > 0) e.attackTimer -= dt;
    if (e.burnTimer > 0) {
      e.burnTimer -= dt; e.hp -= e.burnDps * dt;
      if (e.hp <= 0) { spawnBloodParticles(e.x+e.w/2, e.y); tryDropPowerup(e.x+e.w/2, e.y); dropCoin(e.x+e.w/2, e.y); enemies.splice(i, 1); continue; }
    }
    e.x += e.vx * dt; e.y += e.vy * dt;
    resolvePlayerPlatforms(e);
    if (e.y > H + 100) enemies.splice(i, 1);
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
        for (const e of enemies) { const d = Math.hypot((e.x+e.w/2) - playerCx, (e.y+e.h/2) - playerCy); if (d < bestDist) { bestDist = d; target = e; } }
        const REFLECT_SPEED = 7;
        if (target) { const tx = target.x+target.w/2, ty = target.y+target.h/2, mag = Math.hypot(tx-p.x, ty-p.y)||1; p.vx = (tx-p.x)/mag*REFLECT_SPEED; p.vy = (ty-p.y)/mag*REFLECT_SPEED; }
        else { p.vx = -p.vx * 1.5; p.vy = -p.vy * 1.5; }
        p.reflected = true; p.life = 120; spawnParticles(p.x, p.y, '#aaddff', 10); continue;
      }
    }
    if (player.blocking && !player.dead && playerClass === 'warrior' && rectOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2}, player)) {
      spawnParticles(p.x, p.y, projectileColor, 6); enemyProjectiles.splice(i, 1); continue;
    }
    if (p.reflected) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (rectOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2}, e)) {
          e.hp -= 18; spawnBloodParticles(p.x, p.y);
          if (e.hp <= 0) { spawnBloodParticles(e.x+e.w/2, e.y); tryDropPowerup(e.x+e.w/2, e.y); dropCoin(e.x+e.w/2, e.y); enemies.splice(j, 1); }
          enemyProjectiles.splice(i, 1); break;
        }
      }
      continue;
    }
    if (!player.dead && player.invincible === 0 && rectOverlap({x:p.x-3,y:p.y-3,w:6,h:6}, player)) {
      damagePlayer(Math.round(18 * Math.pow(1.2, difficultyLevel - 1)), p.killerType || null);
      spawnParticles(p.x, p.y, projectileColor, 8); enemyProjectiles.splice(i, 1);
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

    if (isSkull(e.type)) {
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

    drawEnemyHpBar(sx, e);
  }
}

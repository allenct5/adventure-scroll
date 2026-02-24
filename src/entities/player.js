// player.js — Player creation, update, combat, drawing, and death/respawn logic.

import {
  GRAVITY, PLAYER_SPEED, JUMP_FORCE, SWORD_RANGE, SWORD_COOLDOWN,
  ARROW_SPEED, ARROW_COOLDOWN, FIREBALL_SPEED, FIREBALL_COOLDOWN,
  STAFF_ORB_COOLDOWN, LIGHTNING_BOLT_COOLDOWN, BASE_SWORD_DAMAGE, BASE_ARROW_DAMAGE,
  BASE_FIREBALL_DAMAGE, BASE_ORB_DAMAGE, BOMB_GRAVITY, BOMB_EXPLODE_RADIUS,
  RARITY, rarityDamage, W, H, LEVEL_WIDTH,
} from '../core/constants.js';
import { platforms, spikes, lavaZones, checkpoint } from '../scenes/level.js';
import {
  player, setPlayer, playerClass, activeClassMod, cameraX, setCameraX,
  preModWeapon, preModWeaponRarity, setPreModWeapon, setPreModWeaponRarity,
  keys, mouseDown, mouseRightDown, mousePos,
  arrows, fireballsPlayer, playerOrbs, playerBombs, enemies,
  playerGroundHistory, clearGroundHistory, godMode, difficultyLevel,
  setGameState, setMouseRightDown, setActiveClassMod,
} from '../core/state.js';
import { rectOverlap, resolvePlayerPlatforms } from '../utils/collision.js';
import { spawnParticles, spawnBloodParticles, spawnSparkParticles } from '../utils/particles.js';
import { updateHUD, showGameOver } from '../utils/hud.js';
import { playDeathMusic, playSfx } from '../utils/audio.js';
import { tryDropPowerup } from '../utils/powerups.js';
import { dropCoin } from '../utils/coins.js';
import { ENEMY_DISPLAY_NAMES } from './enemies.js';
import { getClassModById } from '../utils/classMods.js';

import { ctx } from '../canvas.js';
import { getSprite } from '../utils/sprites.js';

// Helper: apply attack speed cooldown reduction
function applyCooldown(base) {
  return player.attackSpeedTimer > 0 ? base * 0.8 : base;
}

// Helper: get active class mod (if any)
function getActiveClassMod() {
  if (!activeClassMod) return null;
  const mod = getClassModById(activeClassMod);
  return mod;
}

// Helper: apply class mod and handle weapon changes with rarity preservation
export function applyClassMod(modId) {
  const mod = getClassModById(modId);
  if (!mod) return;
  
  // Save current weapon and rarity before applying mod
  setPreModWeapon(player.weapon);
  
  // Determine rarity of current weapon
  const currentRarity = player.weapon === 'sword' ? player.swordRarity :
                        player.weapon === 'bow' ? player.bowRarity :
                        player.staffRarity;
  setPreModWeaponRarity(currentRarity);
  
  // If mod specifies a weapon override, switch to it and apply saved rarity
  if (mod.weaponOverride) {
    player.weapon = mod.weaponOverride;
    // Apply the saved rarity to the new weapon
    if (mod.weaponOverride === 'sword') player.swordRarity = currentRarity;
    else if (mod.weaponOverride === 'bow') player.bowRarity = currentRarity;
    else if (mod.weaponOverride === 'staff') player.staffRarity = currentRarity;
  }
  
  // Apply weapon variant if specified (e.g., tint color for cloudshaper staff)
  if (mod.weaponVariant) {
    player.weaponVariant = mod.weaponVariant;
  }
  
  // Set active mod in state
  setActiveClassMod(modId);
}

// Helper: remove class mod and restore original weapon/rarity
export function removeClassMod() {
  // Restore original weapon and rarity
  if (preModWeapon && preModWeaponRarity !== null) {
    player.weapon = preModWeapon;
    if (preModWeapon === 'sword') player.swordRarity = preModWeaponRarity;
    else if (preModWeapon === 'bow') player.bowRarity = preModWeaponRarity;
    else if (preModWeapon === 'staff') player.staffRarity = preModWeaponRarity;
  }
  setPreModWeapon(null);
  setPreModWeaponRarity(null);
  
  // Clear weapon variant
  player.weaponVariant = null;
  
  // Clear active mod in state
  setActiveClassMod(null);
}

export function createPlayer() {
  const p = {
    x: 60, y: 340,
    w: 28, h: 44,
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true,
    hp: 100, maxHp: 100,  // overridden per class below
    overshield: 0, maxOvershield: 100,
    weapon: 'sword',
    weaponVariant: null,  // e.g., 'cloudshaper' for tinted staff variants
    ammo: 30,
    mana: 20,
    swordTimer: 0, arrowTimer: 0, staffTimer: 0, staffOrbTimer: 0,
    lightningBoltTimer: 0,
    swingActive: false, swingTimer: 0, swingDuration: 0,
    invincible: 0,
    dead: false, respawnTimer: 0,
    jumpCooldown: 0, jumpHeld: false,
    attackSpeedTimer: 0, attackSpeedTimerMax: 0,
    speedBoostTimer: 0,  speedBoostTimerMax: 0,
    swordRarity: 1, bowRarity: 1, staffRarity: 1,
    droppingThrough: false,
    coins: 0,
    fortified: false, blocking: false,
    stamina: 100, staminaRegenDelay: 0,
    bombs: 0,
    damageMult: 1,
    damageReduction: 0,  // fraction of damage to reduce (0.0 - 1.0)
    hpRegen: 0,  // HP regeneration per second
    lastManaRegenTime: 0,
    lastStaminaRegenTime: 0,
    lastHpRegenTime: 0,
  };
  if (playerClass === 'warrior') { p.weapon = 'sword'; p.swordRarity = 1; p.hp = 120; p.maxHp = 120; p.damageReduction = 0.10; }
  else if (playerClass === 'archer') { p.weapon = 'bow'; p.bowRarity = 1; p.bombs = 5; p.hp = 100; p.maxHp = 100; p.damageReduction = 0.05; }
  else if (playerClass === 'mage')   { p.weapon = 'staff'; p.staffRarity = 1; p.mana = 25; p.hp = 80; p.maxHp = 80; p.damageReduction = 0.00; }
  return p;
}

export function updatePlayer(dt) {
  if (player.dead) {
    player.respawnTimer = Math.max(0, player.respawnTimer - dt);
    if (player.respawnTimer <= 0) respawnPlayer();
    return;
  }
  player.invincible    = Math.max(0, player.invincible - dt);
  player.jumpCooldown  = Math.max(0, player.jumpCooldown - dt);
  if (player.soulBindHalo > 0) player.soulBindHalo = Math.max(0, player.soulBindHalo - dt);
  player.swordTimer    = Math.max(0, player.swordTimer    - 16 * dt);
  player.arrowTimer    = Math.max(0, player.arrowTimer    - 16 * dt);
  player.staffTimer    = Math.max(0, player.staffTimer    - 16 * dt);
  player.staffOrbTimer = Math.max(0, player.staffOrbTimer - 16 * dt);
  player.lightningBoltTimer = Math.max(0, player.lightningBoltTimer - 16 * dt);
  if (player.swingTimer > 0) player.swingTimer -= 16 * dt;
  else player.swingActive = false;

  // Movement
  player.speedBoostTimer = Math.max(0, player.speedBoostTimer - dt);
  const speedMult = player.speedBoostTimer > 0 ? 1.25 : 1;
  if (keys['a'] || keys['arrowleft'])       { player.vx = -PLAYER_SPEED * speedMult; player.facingRight = false; }
  else if (keys['d'] || keys['arrowright']) { player.vx =  PLAYER_SPEED * speedMult; player.facingRight = true;  }
  else { player.vx *= Math.pow(0.75, dt); }

  if ((keys[' '] || keys['space']) && player.onGround && player.jumpCooldown === 0 && !player.jumpHeld) {
    player.vy = JUMP_FORCE;
    player.jumpCooldown = 30;
    player.jumpHeld = true;
    playSfx('jump_sound');
    spawnParticles(player.x + player.w / 2, player.y + player.h, '#aaaaff', 5);
  }
  if (!(keys[' '] || keys['space'])) player.jumpHeld = false;

  if (keys['s'] && player.onGround && !player.droppingThrough) {
    player.droppingThrough = true; player.vy = 4;
  }
  if (player.droppingThrough && !keys['s']) player.droppingThrough = false;

  player.vy += GRAVITY * dt;
  player.x  += player.vx * dt;
  player.y  += player.vy * dt;
  player.x   = Math.max(0, player.x);

  resolvePlayerPlatforms(player);

  if (player.onGround) {
    playerGroundHistory.push({x: player.x, y: player.y});
    if (playerGroundHistory.length > 120) playerGroundHistory.shift();
  }

  if (player.y > H + 100) { killPlayer('pit'); return; }

  for (const s of spikes)    { if (rectOverlap(player, {x:s.x,y:s.y,w:s.w,h:s.h}) && player.invincible === 0) damagePlayer(35, 'environment'); }
  for (const l of lavaZones) { if (rectOverlap(player, l) && player.invincible === 0) damagePlayer(2, 'environment'); }

  if (rectOverlap(player, checkpoint)) triggerCheckpoint();

  // Attack
  if (mouseDown) {
    if (player.weapon === 'sword' && player.swordTimer <= 0) {
      const handX = (player.x + player.w / 2) - cameraX;
      player.facingRight = (mousePos.x - handX) >= 0;
      player.swordTimer  = applyCooldown(SWORD_COOLDOWN);
      player.swingActive = true;
      player.swingTimer  = 700;
      player.swingDuration = 700;
      swordAttack();
    } else if (player.weapon === 'bow' && player.arrowTimer <= 0) {
      player.arrowTimer = applyCooldown(ARROW_COOLDOWN);
      shootArrow();
    } else if (player.weapon === 'staff' && player.staffOrbTimer <= 0) {
      player.staffOrbTimer = applyCooldown(STAFF_ORB_COOLDOWN);
      const classMod = getActiveClassMod();
      if (classMod && classMod.spellOverrides?.leftClick) {
        classMod.spellOverrides.leftClick();
      } else {
        shootStaffOrb();
      }
    }
  }

  if (player.weapon === 'staff' && mouseRightDown && player.staffTimer <= 0) {
    const classMod = getActiveClassMod();
    const manaCost = classMod?.id === 'classMod_Cloudshaper' ? 8 : 5;
    if (player.mana >= manaCost) {
      // Lightning Bolt has its own cooldown
      if (classMod && classMod.spellOverrides?.rightClick) {
        if (classMod.id === 'classMod_Cloudshaper' && player.lightningBoltTimer > 0) {
          // Can't fire - still on cooldown, don't consume mana
          return;
        }
        classMod.spellOverrides.rightClick();
        if (classMod.id === 'classMod_Cloudshaper') player.lightningBoltTimer = LIGHTNING_BOLT_COOLDOWN;
      } else {
        shootFireball();
      }
      player.staffTimer = applyCooldown(FIREBALL_COOLDOWN);
      player.mana -= manaCost; updateHUD();
    }
  }
  if (player.weapon === 'bow' && mouseRightDown && player.bombs > 0) {
    throwBomb();
    setMouseRightDown(false);
  }

  // HP Regen
  if (player.hpRegen > 0 && player.hp < player.maxHp) {
    const now = performance.now();
    if (player.lastHpRegenTime === 0) player.lastHpRegenTime = now;
    const timeSinceLast = now - player.lastHpRegenTime;
    player.hp = Math.min(player.maxHp, player.hp + (player.hpRegen / 1000) * timeSinceLast);
    player.lastHpRegenTime = now;
    updateHUD();
  }

  if (playerClass === 'mage' && player.mana < 25) {
    const now = performance.now();
    if (player.lastManaRegenTime === 0) player.lastManaRegenTime = now;
    const timeSinceLast = now - player.lastManaRegenTime;
    player.mana = Math.min(25, player.mana + (0.5 / 1000) * timeSinceLast);
    player.lastManaRegenTime = now;
    updateHUD();
  }
  if (playerClass === 'warrior' && !player.dead) {
    const wantsBlock = mouseRightDown && player.stamina > 0;
    player.blocking  = wantsBlock;
    const now = performance.now();
    if (player.lastStaminaRegenTime === 0) player.lastStaminaRegenTime = now;
    
    if (player.blocking) {
      player.stamina = Math.max(0, player.stamina - (20 / 1000) * (now - player.lastStaminaRegenTime));
      player.staminaRegenDelay = 600; // 600ms instead of 60 frame-based units
    } else {
      if (player.staminaRegenDelay > 0) player.staminaRegenDelay -= dt;
      else player.stamina = Math.min(100, player.stamina + (20 / 1000) * (now - player.lastStaminaRegenTime));
    }
    player.lastStaminaRegenTime = now;
  } else { player.blocking = false; }

  setCameraX(Math.max(0, Math.min(player.x - W / 3, LEVEL_WIDTH - W)));
}

// --- SWORD ---
export function swordAttack() {
  playSfx('sword_attack');
  const REACH = 6;
  const swordHandX = player.facingRight ? player.x + player.w + REACH : player.x - REACH;
  const swordHandY = player.y + player.h * 0.35;
  const BLADE_LENGTH  = 34;
  const SWORD_OFFSET  = player.facingRight ? -Math.PI / 4 : Math.PI / 4;
  const swordHandScreenX = swordHandX - cameraX;
  const aimAngle = Math.atan2(mousePos.y - swordHandY, mousePos.x - swordHandScreenX);
  const tipX = swordHandX + Math.cos(aimAngle + SWORD_OFFSET) * BLADE_LENGTH;
  const tipY = swordHandY + Math.sin(aimAngle + SWORD_OFFSET) * BLADE_LENGTH;
  spawnSparkParticles(tipX, tipY);

  const hitX    = player.facingRight ? player.x + player.w : player.x - SWORD_RANGE;
  const hitRect = {x: hitX, y: player.y - 10, w: SWORD_RANGE, h: player.h + 20};
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (rectOverlap(hitRect, e)) {
      e.hp -= rarityDamage(BASE_SWORD_DAMAGE, player.swordRarity) * player.damageMult;
      spawnBloodParticles(e.x + e.w / 2, e.y + e.h / 2);
      e.vx = player.facingRight ? 6 : -6;
      e.knockbackTimer = 18;
      if (e.hp <= 0) {
        spawnBloodParticles(e.x + e.w / 2, e.y + e.h / 2);
        tryDropPowerup(e.x + e.w / 2, e.y);
        dropCoin(e.x + e.w / 2, e.y);
        enemies.splice(i, 1);
      }
    }
  }
}

// --- RANGED AIM (shared by bow and staff) ---
export function getAimAngle() {
  const cx = (player.x + player.w / 2) - cameraX;
  const cy = player.y + player.h / 2 - 5;
  const dx = mousePos.x - cx;
  const dy = mousePos.y - cy;
  if (dx > 0) player.facingRight = true;
  else if (dx < 0) player.facingRight = false;
  const rawAngle = Math.atan2(dy, dx);
  const BASE     = player.facingRight ? 0 : Math.PI;
  const MAX_DEV  = Math.PI / 3;
  let diff = rawAngle - BASE;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return BASE + Math.max(-MAX_DEV, Math.min(MAX_DEV, diff));
}

// Aliases kept for any future callers that prefer explicit names
export const getBowAimAngle   = getAimAngle;
export const getStaffAimAngle = getAimAngle;

export function shootArrow() {
  playSfx('bow_attack');
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2 - 5;
  const angle = getAimAngle();
  arrows.push({ x: cx, y: cy, vx: Math.cos(angle) * ARROW_SPEED, vy: Math.sin(angle) * ARROW_SPEED, angle, life: 140, hit: false });
  spawnParticles(cx, cy, '#ffcc44', 4);
}

// --- STAFF ---
export function shootStaffOrb() {
  playSfx('orb_spell');
  const cx    = player.x + player.w / 2;
  const cy    = player.y + player.h / 2 - 1;
  const angle = getAimAngle();
  const speed = 6.5;
  const staffTipDist = 28;
  const portalX = cx + Math.cos(angle) * staffTipDist;
  const portalY = cy + Math.sin(angle) * staffTipDist;
  playerOrbs.push({ x: portalX, y: portalY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 7, life: 100, maxLife: 100, portalLife: 25 });
  spawnParticles(portalX, portalY, '#aa00ff', 8);
  spawnParticles(portalX, portalY, '#ff00ff', 5);
}

export function shootFireball() {
  playSfx('fireball_spell');
  const cx    = player.x + player.w / 2;
  const cy    = player.y + player.h / 2 - 5;
  const angle = getAimAngle();
  const r     = 10;
  const speed = 6.5;
  fireballsPlayer.push({ x: cx + Math.cos(angle) * 20, y: cy + Math.sin(angle) * 20, vx: Math.cos(angle) * FIREBALL_SPEED, vy: Math.sin(angle) * speed, r, life: 220, maxLife: 220, dissipating: false, dissipateTimer: 0, trail: [] });
  spawnParticles(cx, cy, '#ff8833', 6);
}

// --- CLASS MOD SPELLS ---

// Lightning Spark (Cloudshaper left-click replacement)
export function shootLightningSpark() {
  playSfx('orb_spell');
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2 - 1;
  const angle = getAimAngle();
  const speed = 4.5;  // Slow-moving projectile
  const staffTipDist = 28;
  const startX = cx + Math.cos(angle) * staffTipDist;
  const startY = cy + Math.sin(angle) * staffTipDist;
  
  // Lightning Spark: slow-moving ball of lightning that pierces enemies
  playerOrbs.push({
    x: startX, y: startY,
    sparkStartX: startX, sparkStartY: startY,  // Track starting position for distance calculation
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    r: 6,  // Medium-sized lightning ball
    life: 150, maxLife: 150,  // Longer life to compensate for slower speed
    portalLife: 25,
    damage: 30,  // Damage per pierced enemy
    isSpark: true,  // Flag to identify as lightning spark for rendering
    hitEnemies: new Set(),  // Track which enemies this spark has hit for piercing
  });
  
  spawnParticles(startX, startY, '#00ccff', 10);
  spawnParticles(startX, startY, '#ffffff', 6);
}

// Lightning Bolt (Cloudshaper right-click replacement)
export function shootLightningBolt() {
  playSfx('fireball_spell');
  
  // Lightning Bolt: violent bolt crashes down from top of screen at cursor x position
  const targetX = mousePos.x + cameraX;
  const startY = -50;
  const damage = 60;
  
  // Find the impact Y by checking for terrain (both ground and floating platforms) below cursor
  let impactY = H + 50;  // Default to bottom of screen if no terrain
  const boltWidth = 80;  // Same as bolt radius * 2
  const cursorWorldY = mousePos.y;  // No camera Y offset since camera only pans horizontally
  const cursorWorldX = targetX;
  
  for (const platform of platforms) {
    // Check if platform is below cursor and overlaps horizontally with bolt width
    if (platform.y >= cursorWorldY && 
        platform.x < cursorWorldX + boltWidth && 
        platform.x + platform.w > cursorWorldX - boltWidth) {
      // Use the topmost platform we hit
      impactY = Math.min(impactY, platform.y);
    }
  }
  
  // Create the lightning bolt projectile - crashes down from above
  fireballsPlayer.push({
    x: targetX,
    y: impactY,
    vx: 0,
    vy: 0,  // Bolt doesn't move - it's already at impact position
    r: 40,  // Radius for collision circle - 80 pixel diameter
    life: 10,  // Short lifespan
    maxLife: 10,
    dissipating: false,
    dissipateTimer: 0,
    trail: [],
    isLightningBolt: true,  // Flag to identify as lightning bolt
    damage: damage,
    boltHeight: 600,  // Tall rectangular damage field
    hitSomething: false,  // Flag to prevent multiple hits
  });
}

// --- BOMB ---
export function throwBomb() {
  if (player.bombs <= 0) return;
  playSfx('bomb_throw');
  player.bombs--;
  updateHUD();
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const MAX_DIST = W * 0.25;
  const dx   = mousePos.x - (cx - cameraX);
  const dy   = mousePos.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const dir  = player.facingRight ? 1 : -1;
  const FLIGHT_TIME = 90;
  const vx = Math.max(0.5, Math.abs(dx / dist)) * dir * (MAX_DIST / FLIGHT_TIME);
  const vy = Math.min(-1, dy / dist * 8) - 3;
  playerBombs.push({ x: cx, y: cy, vx, vy, r: 10, trail: [], life: 240, exploded: false, explodeTimer: 0 });
  spawnParticles(cx, cy, '#ff8800', 5);
}

// --- DAMAGE / DEATH ---
export function damagePlayer(amount, killerType = null) {
  if (godMode || player.invincible > 0 || player.dead) return;
  let reduction = player.damageReduction + (player.fortified ? 0.25 : 0);
  if (player.blocking && playerClass === 'warrior') {
    reduction += 0.10;
    playSfx('shield_block');
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#88ccff', 8);
  }
  let dmg = Math.round(amount * (1 - reduction));
  
  // Apply damage to overshield first, then HP
  if (player.overshield > 0) {
    const overshieldDamage = Math.min(dmg, player.overshield);
    player.overshield -= overshieldDamage;
    dmg -= overshieldDamage;
  }
  player.hp -= dmg;
  
  player.invincible = 60;
  if (killerType) player._lastKillerType = killerType;
  updateHUD();
  if (player.hp <= 0) killPlayer('damage');
}

export function addOvershield(amount) {
  player.overshield = Math.min(player.overshield + amount, player.maxOvershield);
  updateHUD();
}

export function killPlayer(cause) {
  if (player.dead) return;
  if (player.revive) {
    player.revive    = false;
    player.hp        = Math.floor(player.maxHp * 0.5);
    player.invincible = 180;
    const historyPos = playerGroundHistory.length > 0 ? playerGroundHistory[playerGroundHistory.length - 1] : null;
    if (historyPos) { player.x = historyPos.x; player.y = historyPos.y; }
    else {
      const groundPlatforms = platforms.filter(p => p.type === 'ground');
      let best = groundPlatforms[0], bestDist = Infinity;
      for (const p of groundPlatforms) {
        const dist = Math.abs((p.x + p.w / 2) - (player.x + player.w / 2));
        if (dist < bestDist) { bestDist = dist; best = p; }
      }
      if (best) { player.x = best.x + best.w / 2 - player.w / 2; player.y = best.y - player.h; }
    }
    player.vx = 0; player.vy = 0;
    player.soulBindHalo = 120;
    clearGroundHistory();
    updateHUD();
    return;
  }
  player.dead = true;
  player.respawnTimer = 180;
  if (cause === 'pit') { player.hp = 0; updateHUD(); }
  spawnBloodParticles(player.x + player.w / 2, player.y + player.h / 2);
  spawnBloodParticles(player.x + player.w / 2, player.y + player.h / 2);

  let sub;
  if (cause === 'pit' || cause === 'environment' || player._lastKillerType === 'environment') {
    sub = 'AN UNFORTUNATE JOURNEY';
  } else {
    const killerType    = player._lastKillerType || null;
    const killerDisplay = killerType ? (ENEMY_DISPLAY_NAMES[killerType] || killerType) : null;
    sub = killerDisplay ? `YOU HAVE BEEN SLAIN BY ${killerDisplay}` : 'YOU HAVE BEEN SLAIN';
  }

  playDeathMusic();
  setTimeout(() => { setGameState('dead'); showGameOver(sub); }, 900);
}

// Checkpoint / reset cycle
let _triggerCheckpointFn = null;
export function registerCheckpointFn(fn) { _triggerCheckpointFn = fn; }
function triggerCheckpoint() { if (_triggerCheckpointFn) _triggerCheckpointFn(); }

// Respawn callback (defined in main.js, registered at startup)
let _respawnPlayerFn = null;
export function registerRespawnFn(fn) { _respawnPlayerFn = fn; }
function respawnPlayer() { if (_respawnPlayerFn) _respawnPlayerFn(); }

// --- DRAW ---
export function drawPlayer() {
  if (player.dead) return;
  const sx = player.x - cameraX;

  // Soul Bind halo
  if (player.soulBindHalo > 0) {
    const progress = player.soulBindHalo / 120;
    const t = Date.now() * 0.005;
    for (let r = 0; r < 3; r++) {
      const phase  = (t + r * (Math.PI * 2 / 3)) % (Math.PI * 2);
      const radius = 28 + r * 14 + Math.sin(phase) * 6;
      const alpha  = progress * (0.3 + Math.sin(phase) * 0.15);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx + player.w / 2, player.y + player.h / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120,200,255,${alpha})`;
      ctx.shadowColor = '#88ddff';
      ctx.shadowBlur  = 18 * progress;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.restore();
    }
    const glowAlpha = progress * 0.35;
    const innerGlow = ctx.createRadialGradient(sx + player.w / 2, player.y + player.h / 2, 0, sx + player.w / 2, player.y + player.h / 2, 40);
    innerGlow.addColorStop(0, `rgba(255,240,120,${glowAlpha})`);
    innerGlow.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(sx + player.w / 2 - 40, player.y + player.h / 2 - 40, 80, 80);
  }

  // Overshield protective circle
  if (player.overshield >= 1) {
    const shieldPct = player.overshield / player.maxOvershield;
    const t = Date.now() * 0.002;
    const baseRadius = 32;
    const pulseAmount = Math.sin(t) * 2;
    const radius = baseRadius + pulseAmount;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx + player.w / 2, player.y + player.h / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(68, 204, 255, ${0.25 + shieldPct * 0.15})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner shimmer
    ctx.beginPath();
    ctx.arc(sx + player.w / 2, player.y + player.h / 2, radius - 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(136, 221, 255, ${0.1 + shieldPct * 0.1})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  const flash = player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0;
  if (flash) return;

  ctx.save();
  if (!player.facingRight) {
    ctx.translate(sx + player.w, player.y); ctx.scale(-1, 1); ctx.translate(-player.w / 2, 0);
  } else {
    ctx.translate(sx, player.y);
  }

  // If a sprite is loaded for this player class, draw it and skip procedural rendering
  const _playerSprite = getSprite('player_' + playerClass);
  if (_playerSprite) {
    ctx.drawImage(_playerSprite, 0, 0, player.w, player.h);
  } else {
  // Leg animation: use game-time-independent value so it pauses correctly
  const legAnim = player.vx !== 0 && player.onGround ? Math.sin(player.x * 0.15) * 4 : 0;

  // Body
  if (playerClass === 'mage') {

    // === ROBE BODY ===
    const robeGrad = ctx.createLinearGradient(0, 12, 0, player.h);
    robeGrad.addColorStop(0, '#5500aa');
    robeGrad.addColorStop(0.55, '#3a0078');
    robeGrad.addColorStop(1, '#1a0038');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.lineTo(player.w - 4, 12);
    ctx.lineTo(player.w + 4, player.h);
    ctx.lineTo(-4, player.h);
    ctx.closePath();
    ctx.fill();

    // Center fold (subtle lighter strip)
    ctx.fillStyle = 'rgba(140,50,210,0.2)';
    ctx.beginPath();
    ctx.moveTo(player.w / 2 - 1, 15);
    ctx.lineTo(player.w / 2 + 1, 15);
    ctx.lineTo(player.w / 2 + 3, player.h);
    ctx.lineTo(player.w / 2 - 3, player.h);
    ctx.closePath();
    ctx.fill();

    // Hem trim
    ctx.fillStyle = '#7722bb';
    ctx.fillRect(-4, player.h - 4, player.w + 8, 3);

    // === ARMS / HANDS (drawn before face so face is on top) ===
    // Left arm: back-side forearm visible at left edge, at staff-grip height
    ctx.fillStyle = '#4a0088';
    ctx.fillRect(0, 16, 6, 7);
    ctx.fillStyle = '#6633aa';               // cuff
    ctx.fillRect(-1, 22, 7, 2);
    ctx.fillStyle = '#f5c070';               // hand
    ctx.fillRect(0, 24, 5, 4);

    // Right arm: front-side forearm at right edge, slightly higher
    ctx.fillStyle = '#4a0088';
    ctx.fillRect(player.w - 6, 14, 6, 7);
    ctx.fillStyle = '#6633aa';               // cuff
    ctx.fillRect(player.w - 6, 20, 7, 2);
    ctx.fillStyle = '#f5c070';               // hand
    ctx.fillRect(player.w - 5, 22, 5, 4);

    // === FACE ===
    ctx.fillStyle = '#f5c890';
    ctx.fillRect(7, 3, 14, 11);

    // Eyebrows
    ctx.fillStyle = '#664422';
    ctx.fillRect(9, 5, 4, 1);
    ctx.fillRect(15, 5, 4, 1);

    // Eyes (white + pupil)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 7, 4, 3);
    ctx.fillRect(15, 7, 4, 3);
    ctx.fillStyle = '#223388';
    ctx.fillRect(10, 7, 2, 3);
    ctx.fillRect(16, 7, 2, 3);

    // Nose
    ctx.fillStyle = '#cc9966';
    ctx.fillRect(13, 10, 2, 2);

    // Mouth
    ctx.fillStyle = '#aa5533';
    ctx.fillRect(10, 12, 8, 1);

    // Small beard
    ctx.fillStyle = '#ddddcc';
    ctx.fillRect(8, 13, 12, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 14, 8, 2);

    // === WIZARD HAT ===
    // Brim (drawn first, cone sits on top)
    ctx.fillStyle = '#2d0055';
    ctx.beginPath();
    ctx.ellipse(14, 3, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cone
    const hatGrad = ctx.createLinearGradient(14, -22, 14, 3);
    hatGrad.addColorStop(0, '#1e0040');
    hatGrad.addColorStop(1, '#5500aa');
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(5, 3);
    ctx.lineTo(23, 3);
    ctx.lineTo(14, -22);
    ctx.closePath();
    ctx.fill();

    // Hat band (gold strip over cone base)
    ctx.fillStyle = '#cc9922';
    ctx.fillRect(5, 0, 18, 3);
    ctx.fillStyle = '#ffdd55';              // highlight
    ctx.fillRect(5, 0, 18, 1);

  } else if (playerClass === 'archer') {
    // --- GREEN TIGHTS ---
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(4,  player.h - 22, 10, 22 + legAnim);
    ctx.fillRect(player.w - 14, player.h - 22, 10, 22 - legAnim);
    // Tights highlight
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(6,  player.h - 22, 3, 18 + legAnim);
    ctx.fillRect(player.w - 12, player.h - 22, 3, 18 - legAnim);
    // Brown boots
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(3,  player.h - 7, 12, 7 + legAnim);
    ctx.fillRect(player.w - 15, player.h - 7, 12, 7 - legAnim);
    ctx.fillStyle = '#7a4f2a';
    ctx.fillRect(3,  player.h - 7, 12, 3);
    ctx.fillRect(player.w - 15, player.h - 7, 12, 3);

    // --- BROWN JACKET ---
    const jacketGrad = ctx.createLinearGradient(0, 10, 0, player.h - 18);
    jacketGrad.addColorStop(0, '#8d5524'); jacketGrad.addColorStop(0.5, '#6d3f10'); jacketGrad.addColorStop(1, '#4a2800');
    ctx.fillStyle = jacketGrad;
    ctx.fillRect(3, 12, player.w - 6, player.h - 30);
    // Jacket lapels
    ctx.fillStyle = '#a0692e';
    ctx.fillRect(3, 12, 5, 14);
    ctx.fillRect(player.w - 8, 12, 5, 14);
    // Jacket buttons
    ctx.fillStyle = '#ffcc44';
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      ctx.arc(player.w / 2, 16 + b * 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Belt
    ctx.fillStyle = '#3e2000';
    ctx.fillRect(3, player.h - 22, player.w - 6, 4);
    ctx.fillStyle = '#ccaa44';
    ctx.fillRect(player.w / 2 - 3, player.h - 23, 6, 5);
    // Jacket sleeves
    ctx.fillStyle = '#6d3f10';
    ctx.fillRect(0, 14, 4, 16);
    ctx.fillRect(player.w - 4, 14, 4, 16);
    // Cuffs
    ctx.fillStyle = '#a0692e';
    ctx.fillRect(-1, 28, 5, 3);
    ctx.fillRect(player.w - 4, 28, 5, 3);

    // --- FACE ---
    ctx.fillStyle = '#ffddbb';
    ctx.fillRect(6, 2, player.w - 12, 12);
    // Eyes — sharp, focused
    ctx.fillStyle = '#ffffff'; ctx.fillRect(player.w / 2 - 5, 6, 4, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(player.w / 2 + 1, 6, 4, 3);
    ctx.fillStyle = '#4a3000'; ctx.fillRect(player.w / 2 - 4, 7, 2, 2);
    ctx.fillStyle = '#4a3000'; ctx.fillRect(player.w / 2 + 2, 7, 2, 2);
    // Eyebrows
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(player.w / 2 - 5, 5, 4, 1);
    ctx.fillRect(player.w / 2 + 1, 5, 4, 1);

    // --- GREEN ROBIN HOOD HAT ---
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(2, -2, player.w - 4, 4);
    const archerHatGrad = ctx.createLinearGradient(4, -16, player.w - 4, -2);
    archerHatGrad.addColorStop(0, '#1b5e20'); archerHatGrad.addColorStop(1, '#388e3c');
    ctx.fillStyle = archerHatGrad;
    ctx.beginPath();
    ctx.moveTo(4,           -2);
    ctx.lineTo(player.w - 4, -2);
    ctx.lineTo(player.w - 6, -15);
    ctx.lineTo(6,            -15);
    ctx.closePath();
    ctx.fill();
    // Feather
    ctx.strokeStyle = '#f5f5dc'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.bezierCurveTo(-4, -12, -2, -22, 2, -26);
    ctx.stroke();
    ctx.strokeStyle = '#e0e0c8'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.bezierCurveTo(-2, -10, -1, -20, 3, -24);
    ctx.stroke();
    // Hat band
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(4, -4, player.w - 8, 3);

  } else {
    // --- WARRIOR ---
    // Legs
    ctx.fillStyle = '#888e96';
    ctx.fillRect(4, player.h - 16, 10, 16 + legAnim);
    ctx.fillRect(player.w - 14, player.h - 16, 10, 16 - legAnim);
    // Boot cuffs
    ctx.fillStyle = '#666c74';
    ctx.fillRect(4, player.h - 4, 10, 4);
    ctx.fillRect(player.w - 14, player.h - 4, 10, 4);

    // Blue tunic body
    ctx.fillStyle = '#2255aa';
    ctx.fillRect(4, 12, player.w - 8, player.h - 28);

    // Grey breastplate
    ctx.fillStyle = '#a0a8b0';
    ctx.fillRect(5, 14, player.w - 10, player.h - 34);
    // Breastplate highlight
    ctx.fillStyle = '#c8cdd2';
    ctx.fillRect(6, 15, 5, player.h - 36);

    // --- HELMET ---
    ctx.fillStyle = '#888e96';
    ctx.fillRect(4, 8, player.w - 8, 8);
    ctx.fillStyle = '#a0a8b0';
    ctx.beginPath();
    ctx.moveTo(3, 12);
    ctx.lineTo(player.w - 3, 12);
    ctx.lineTo(player.w - 2, 4);
    ctx.bezierCurveTo(player.w - 2, -5, 2, -5, 2, 4);
    ctx.closePath();
    ctx.fill();
    // Helmet highlight
    ctx.fillStyle = '#c8cdd2';
    ctx.fillRect(5, 1, 5, 9);
    // Visor slit
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect(4, 6, player.w - 8, 4);
    // Visor glint
    ctx.fillStyle = 'rgba(120,180,255,0.45)';
    ctx.fillRect(5, 7, 5, 1);
    // Helmet rim
    ctx.fillStyle = '#888e96';
    ctx.fillRect(3, 10, player.w - 6, 2);
  }
  } // end sprite else
  ctx.restore();

  // Stamina bar (warrior)
  if (playerClass === 'warrior' && (player.blocking || player.stamina < 100)) {
    const BAR_W = 28, BAR_H = 4;
    const barX = sx + (player.w - BAR_W) / 2;
    const barY = player.y - 10;
    const pct  = player.stamina / 100;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(barX - 1, barY - 1, BAR_W + 2, BAR_H + 2);
    ctx.fillStyle = '#223344'; ctx.fillRect(barX, barY, BAR_W, BAR_H);
    const low   = player.stamina <= 20;
    const pulse = low ? 0.5 + Math.sin(Date.now() * 0.015) * 0.5 : 1;
    ctx.fillStyle   = low ? `rgba(255,${Math.round(40 * (1 - pulse))},0,1)` : '#ffcc00';
    ctx.shadowColor = low ? '#ff2200' : '#ffaa00';
    ctx.shadowBlur  = low ? 6 * pulse : 4;
    ctx.fillRect(barX, barY, Math.round(BAR_W * pct), BAR_H);
    ctx.shadowBlur = 0;
  }

  // Lightning Bolt cooldown bar (Cloudshaper mage)
  if (playerClass === 'mage' && getActiveClassMod()?.id === 'classMod_Cloudshaper' && player.lightningBoltTimer > 0) {
    const BAR_W = 28, BAR_H = 4;
    const barX = sx + (player.w - BAR_W) / 2;
    const barY = player.y - 10;
    const pct  = player.lightningBoltTimer / LIGHTNING_BOLT_COOLDOWN;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(barX - 1, barY - 1, BAR_W + 2, BAR_H + 2);
    ctx.fillStyle = '#001a33'; ctx.fillRect(barX, barY, BAR_W, BAR_H);
    ctx.fillStyle = '#0066ff';
    ctx.shadowColor = '#0066ff';
    ctx.shadowBlur = 4;
    ctx.fillRect(barX, barY, Math.round(BAR_W * pct), BAR_H);
    ctx.shadowBlur = 0;
  }

  // Weapon drawing
  if (player.weapon === 'sword') drawSword(sx);
  else if (player.weapon === 'bow') drawBow(sx);
  else if (player.weapon === 'staff') drawStaff(sx);

  // Warrior block crescent
  if (player.blocking && playerClass === 'warrior') {
    const cx = sx + player.w / 2;
    const cy = player.y + player.h * 0.4;
    const aimAngle = Math.atan2(mousePos.y - cy, mousePos.x - cx);
    const RADIUS = 38;
    const SPAN   = Math.PI * 0.9;
    const pulse  = 0.55 + Math.sin(Date.now() * 0.012) * 0.2;

    ctx.save();
    ctx.globalAlpha = 0.18 * pulse;
    const glowGrad = ctx.createRadialGradient(cx, cy, RADIUS * 0.4, cx, cy, RADIUS * 1.3);
    glowGrad.addColorStop(0, '#88ccff');
    glowGrad.addColorStop(1, 'rgba(40,100,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, RADIUS * 1.3, aimAngle - SPAN / 2, aimAngle + SPAN / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.lineCap = 'round';
    // Soft layered glow arcs — outer wide/faint to inner narrow/bright
    const layers = [
      { width: 22, alpha: 0.04, color: '#6699ff' },
      { width: 13, alpha: 0.08, color: '#88aaff' },
      { width:  7, alpha: 0.16, color: '#aaccff' },
      { width:  3, alpha: 0.38, color: '#cce8ff' },
    ];
    for (const layer of layers) {
      ctx.globalAlpha = layer.alpha * pulse;
      ctx.strokeStyle = layer.color;
      ctx.shadowColor = '#88bbff';
      ctx.shadowBlur  = 18;
      ctx.lineWidth   = layer.width;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS, aimAngle - SPAN / 2, aimAngle + SPAN / 2);
      ctx.stroke();
    }
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawSword(sx) {
  const bodyCx = sx + player.w / 2;
  const bodyCy = player.y + player.h * 0.38;
  const facingRight = (mousePos.x - bodyCx) >= 0;
  const REACH      = 6;
  const swordHandX = facingRight ? sx + player.w + REACH : sx - REACH;
  const swordHandY = player.y + player.h * 0.35;
  const shieldHandX = facingRight ? sx + 2 : sx + player.w - 2;
  const shieldHandY = player.y + player.h * 0.42;
  const cursorAngle = Math.atan2(mousePos.y - swordHandY, mousePos.x - swordHandX);
  const SWORD_OFFSET = facingRight ? -Math.PI / 4 : Math.PI / 4;
  let swordAngle;
  if (player.swingActive && player.swingDuration > 0) {
    const progress = 1 - (player.swingTimer / player.swingDuration);
    const eased = progress < 0.35
      ? (progress / 0.35) * (progress / 0.35) * 0.18
      : 0.18 + (1 - Math.pow(1 - (progress - 0.35) / 0.65, 2.2)) * 0.82;
    const arcSpan = Math.PI * 0.85;
    const windUp        = cursorAngle + (facingRight ? -arcSpan * 0.55 : arcSpan * 0.55);
    const followThrough = cursorAngle + (facingRight ?  arcSpan * 0.45 : -arcSpan * 0.45);
    swordAngle = windUp + (followThrough - windUp) * eased + SWORD_OFFSET;
  } else {
    swordAngle = cursorAngle + SWORD_OFFSET;
  }

  // Blade
  ctx.save();
  ctx.translate(swordHandX, swordHandY);
  ctx.rotate(swordAngle);
  const sgrad = ctx.createLinearGradient(34, 0, 0, 0);
  sgrad.addColorStop(0, '#eeeeff'); sgrad.addColorStop(0.3, '#aaaadd'); sgrad.addColorStop(1, '#666699');
  ctx.shadowColor = RARITY[player.swordRarity].color;
  ctx.shadowBlur  = 8;
  ctx.fillStyle = sgrad;
  ctx.beginPath();
  ctx.moveTo(0, -3); ctx.lineTo(34, -1); ctx.lineTo(36, 0); ctx.lineTo(34, 1); ctx.lineTo(0, 3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#888899';
  ctx.fillRect(-4, -4, 8, 8);
  ctx.fillStyle = '#ccaa44';
  ctx.fillRect(-6, -2, 6, 4);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Shield
  ctx.save();
  ctx.translate(shieldHandX, shieldHandY);
  if (facingRight) ctx.scale(-1, 1);
  const rarityColor  = RARITY[player.swordRarity].color;
  const shieldAlpha  = player.blocking ? 0.95 : 0.75;
  ctx.globalAlpha    = shieldAlpha;
  const shieldGrad   = ctx.createLinearGradient(-8, 0, 8, 0);
  shieldGrad.addColorStop(0, '#3355aa'); shieldGrad.addColorStop(0.5, '#5577cc'); shieldGrad.addColorStop(1, '#223388');
  ctx.shadowColor = rarityColor;
  ctx.shadowBlur  = player.blocking ? 14 : 6;
  ctx.fillStyle   = shieldGrad;
  ctx.beginPath();
  ctx.moveTo(2, -18); ctx.lineTo(10, -14); ctx.lineTo(10, 4); ctx.bezierCurveTo(10, 14, 2, 18, 2, 18);
  ctx.bezierCurveTo(2, 18, -6, 14, -6, 4); ctx.lineTo(-6, -14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rarityColor; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(2, -16); ctx.lineTo(9, -12); ctx.lineTo(9, 4);
  ctx.bezierCurveTo(9, 12, 2, 16, 2, 16); ctx.stroke();
  ctx.fillStyle = '#ccaa44';
  ctx.beginPath(); ctx.arc(2, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBow(sx) {
  const cx    = sx + player.w / 2;
  const cy    = player.y + player.h / 2 - 5;
  const angle = getAimAngle();
  const BowRarityColor = RARITY[player.bowRarity].color;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = '#8b5e2a'; ctx.lineWidth = 3;
  ctx.shadowColor = BowRarityColor; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(0, 0, 18, -Math.PI * 0.65, Math.PI * 0.65); ctx.stroke();
  ctx.strokeStyle = '#ffcc88'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
  ctx.shadowBlur = 0;
  // Arrow on bow (always nocked)
  ctx.strokeStyle = '#ddaa44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(20, 0); ctx.stroke();
  ctx.fillStyle = '#ffaa22';
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawStaff(sx) {
  const cx    = sx + player.w / 2;
  const cy    = player.y + player.h / 2 - 5;
  const angle = getAimAngle();
  const rarityColor = RARITY[player.staffRarity].color;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Shaft — tapered wooden pole
  const shaftGrad = ctx.createLinearGradient(0, -3, 0, 3);
  shaftGrad.addColorStop(0, '#c8884a');
  shaftGrad.addColorStop(0.4, '#a0622a');
  shaftGrad.addColorStop(1, '#7a4418');
  ctx.fillStyle = shaftGrad;
  ctx.shadowColor = rarityColor;
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.moveTo(-16, -2.5);
  ctx.lineTo(26,  -1.5);
  ctx.lineTo(26,   1.5);
  ctx.lineTo(-16,  2.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Wood grain lines
  ctx.strokeStyle = 'rgba(80,40,10,0.35)';
  ctx.lineWidth = 0.8;
  for (const gx of [-6, 4, 14]) {
    ctx.beginPath(); ctx.moveTo(gx, -2); ctx.lineTo(gx + 2, 2); ctx.stroke();
  }

  // Knot / cap at the tip
  ctx.fillStyle = '#7a4418';
  ctx.shadowColor = rarityColor;
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.ellipse(26, 0, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Knot highlight
  ctx.fillStyle = '#c8884a';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(24.5, -1, 2, 1.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Binding wrap near the grip
  ctx.strokeStyle = '#553311';
  ctx.lineWidth = 2;
  for (const bx of [-10, -7, -4]) {
    ctx.beginPath(); ctx.moveTo(bx, -2.5); ctx.lineTo(bx, 2.5); ctx.stroke();
  }

  ctx.restore();
}

export function drawSwordSwing() {
  if (!player.swingActive || player.dead || player.weapon !== 'sword') return;
  const progress = player.swingDuration > 0 ? 1 - (player.swingTimer / player.swingDuration) : 0;
  if (progress < 0.1 || progress > 0.85) return;
  const midProgress = (progress - 0.1) / 0.75;
  const alpha = Math.sin(midProgress * Math.PI) * 0.32;
  const sx    = player.x - cameraX;
  const cx    = sx + player.w / 2;
  const cy    = player.y + player.h * 0.38;
  const cursorAngle = Math.atan2(mousePos.y - cy, mousePos.x - cx);
  const arcSpan  = Math.PI * 0.85;
  const startAng = cursorAngle + (player.facingRight ? -arcSpan * 0.55 :  arcSpan * 0.55);
  const endAng   = cursorAngle + (player.facingRight ?  arcSpan * 0.45 : -arcSpan * 0.45);
  const swingColor = RARITY[player.swordRarity].color;
  ctx.save();
  ctx.globalAlpha = alpha;
  const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, SWORD_RANGE);
  sg.addColorStop(0, swingColor); sg.addColorStop(1, swingColor + '00');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, SWORD_RANGE, startAng, endAng, !player.facingRight); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawAimIndicator() {
  if (player.dead) return;
  const isRanged = player.weapon === 'bow' || player.weapon === 'staff';
  if (!isRanged) return;
  const isStaff  = player.weapon === 'staff';
  const cx       = (player.x + player.w / 2) - cameraX;
  const cy       = player.y + player.h / 2 - 5;
  const aimAngle = getAimAngle();
  const BASE     = player.facingRight ? 0 : Math.PI;
  const MAX_DEV  = Math.PI / 3;
  
  // Determine aim indicator color based on weapon and variant
  let arcColor, lineColor;
  if (isStaff) {
    if (player.weaponVariant === 'cloudshaper') {
      arcColor = '#0099ff';
      lineColor = 'rgba(0,153,255,0.7)';
    } else {
      arcColor = '#ff8833';
      lineColor = 'rgba(255,140,50,0.7)';
    }
  } else {
    arcColor = '#ffcc44';
    lineColor = 'rgba(255,220,80,0.7)';
  }

  ctx.save();
  ctx.globalAlpha = 0.18;
  const arcGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
  arcGrad.addColorStop(0, arcColor); arcGrad.addColorStop(1, arcColor + '00');
  ctx.fillStyle = arcGrad;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 80, BASE - MAX_DEV, BASE + MAX_DEV, false); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  const AIM_LEN = 90;
  const ex = cx + Math.cos(aimAngle) * AIM_LEN;
  const ey = cy + Math.sin(aimAngle) * AIM_LEN;
  ctx.setLineDash([5, 6]); ctx.strokeStyle = lineColor; ctx.lineWidth = 1.5;
  ctx.shadowColor = arcColor; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur = 0;
  ctx.fillStyle = lineColor;
  ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

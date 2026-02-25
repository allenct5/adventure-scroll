// constants.js — All tunable game constants. Import this everywhere.

export const W = 900;
export const H = 480;
export const LEVEL_WIDTH = 5129;

export const GRAVITY          = 0.27;
export const PLAYER_SPEED     = 3.0625;
export const JUMP_FORCE       = -8.2;
export const ENEMY_SPEED_BASE = 0.63;

export const SWORD_RANGE       = 60;
export const SWORD_COOLDOWN    = 720;
export const ARROW_SPEED       = 10;
export const ARROW_COOLDOWN    = 720;
export const CROSSBOW_SPEED    = 11;
export const CROSSBOW_COOLDOWN = 1000;
export const FIREBALL_SPEED    = 5.408;
export const FIREBALL_COOLDOWN = 1100;
export const STAFF_ORB_COOLDOWN = 600;
export const LIGHTNING_BOLT_COOLDOWN = 3000;  // 3 seconds
export const ORC_SUMMON_COOLDOWN = 1200;    // 1.2 seconds
export const SKULL_SUMMON_COOLDOWN = 1200;  // 1.2 seconds

export const BASE_SWORD_DAMAGE    = 40;
export const BASE_ARROW_DAMAGE    = 30;
export const BASE_CROSSBOW_DAMAGE = 40;
export const BASE_FIREBALL_DAMAGE = 35;
export const BASE_ORB_DAMAGE      = 18;

export const BOMB_GRAVITY        = 0.207;
export const BOMB_EXPLODE_RADIUS = 60;

export const POWERUP_DROP_COOLDOWN = 8000; // ms

export const RARITY = {
  1: { name: 'Common',    color: '#aaaaaa' },
  2: { name: 'Uncommon',  color: '#44dd44' },
  3: { name: 'Rare',      color: '#4488ff' },
  4: { name: 'Unique',    color: '#ff8800' },
  5: { name: 'Legendary', color: '#ffdd00' },
};

/** Returns damage scaled by rarity tier (each tier adds 20% of base). */
export function rarityDamage(baseDamage, rarity) {
  return Math.round(baseDamage * (1 + (rarity - 1) * 0.2));
}

// --- MAGIC NUMBER CONSTANTS - Extracted for maintainability ---

// Trail and particle effects
export const FIREBALL_TRAIL_MAX_LENGTH = 18;   // Max Trail points for fireballs before wrapping
export const BOMB_TRAIL_MAX_LENGTH = 14;       // Max trail points for bombs before wrapping
export const MAX_PARTICLES = 600;              // Max particles before trimming

// Projectile behavior
export const FIREBALL_DISSIPATE_CHANCE = 0.33;  // Chance to spawn dissipate particles per frame
export const PARTICLE_SPAWN_COUNT_LARGE = 10;   // Large particle spawn on explosion
export const PARTICLE_SPAWN_COUNT_MEDIUM = 8;   // Medium particle spawn
export const PARTICLE_SPAWN_COUNT_SMALL = 5;    // Small particle spawn

// Enemy behavior
export const BURN_PARTICLE_SPAWN_CHANCE = 0.25;  // Chance to spawn burn particles per frame
export const BURN_PARTICLE_SPAWN_COUNT = 1;      // Particles per burn spawn
export const BLEED_PARTICLE_SPAWN_CHANCE = 0.15; // Chance to spawn bleed particles
export const BLEED_PARTICLE_SPAWN_COUNT = 1;     // Particles per bleed spawn

// Knockback physics
export const KNOCKBACK_VELOCITY_MULT = 0.85;     // Knockback velocity decay per frame

// Summon limits and timers
export const SUMMON_LIMIT_MESSAGE_COOLDOWN = 3000;  // ms between showing "summon limit" message


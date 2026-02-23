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
export const FIREBALL_SPEED    = 5.408;
export const FIREBALL_COOLDOWN = 1100;
export const STAFF_ORB_COOLDOWN = 600;
export const LIGHTNING_BOLT_COOLDOWN = 300;  // 5 seconds

export const BASE_SWORD_DAMAGE    = 40;
export const BASE_ARROW_DAMAGE    = 30;
export const BASE_FIREBALL_DAMAGE = 35;
export const BASE_ORB_DAMAGE      = 18;

export const BOMB_GRAVITY        = 0.207;
export const BOMB_EXPLODE_RADIUS = 60;

export const POWERUP_DROP_COOLDOWN = 5000; // ms

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

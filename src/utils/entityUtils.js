// entityUtils.js — Shared entity removal and management helpers to eliminate code duplication

import { enemies, playerAllies } from '../core/state.js';
import { spawnBloodParticles } from './particles.js';
import { tryDropPowerup } from './powerups.js';
import { dropCoin } from './coins.js';

/**
 * Kill an entity (enemy or summon) with full cleanup
 * @param {Object} entity - The entity to kill
 * @param {Array} array - The array containing the entity (enemies or playerAllies)
 * @param {number} index - The index of the entity in the array
 */
export function killEntity(entity, array, index) {
  if (!entity) return;
  
  spawnBloodParticles(entity.x + entity.w / 2, entity.y + entity.h / 2);
  
  // Drop loot if hostile (not friendly)
  if (!entity.friendly) {
    tryDropPowerup(entity.x + entity.w / 2, entity.y + entity.h / 2);
    dropCoin(entity.x + entity.w / 2, entity.y + entity.h / 2);
  }
  
  // Remove from appropriate array
  if (index !== undefined && index >= 0) {
    array.splice(index, 1);
  }
}

/**
 * Apply hazard damage to entity and handle death
 * @param {Object} entity - The entity to damage
 * @param {number} damage - Damage amount
 * @param {Array} array - The array containing the entity
 * @param {number} index - The index for efficient removal
 * @returns {boolean} - True if entity died, false otherwise
 */
export function applyHazardDamage(entity, damage, array, index) {
  if (!entity) return false;
  
  entity.hp -= damage;
  spawnBloodParticles(entity.x + entity.w / 2, entity.y + entity.h / 2);
  
  if (entity.hp <= 0) {
    killEntity(entity, array, index);
    return true;
  }
  return false;
}

/**
 * Check if entity is off-screen or out of bounds and remove if so
 * @param {Object} entity - The entity to check
 * @param {Array} array - The array containing the entity
 * @param {number} index - The index for efficient removal
 * @param {number} screenHeight - Screen height for bounds check
 * @returns {boolean} - True if entity was removed, false otherwise
 */
export function checkOffScreen(entity, array, index, screenHeight = 600) {
  if (entity.y > screenHeight + 100 || entity.y < -200) {
    // Only drop loot if not friendly (summons don't drop)
    if (!entity.friendly && entity.hp > 0) {
      tryDropPowerup(entity.x + entity.w / 2, entity.y + entity.h / 2);
      dropCoin(entity.x + entity.w / 2, entity.y + entity.h / 2);
    }
    array.splice(index, 1);
    return true;
  }
  return false;
}

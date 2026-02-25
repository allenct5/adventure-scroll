// level.js — Level data management: generates or loads levels dynamically

import { generateLevel } from './levelGenerator.js';
import { initializeSpatialGrid } from '../utils/collision.js';  // Phase 3a: Spatial partitioning

let currentLevel = null;

// Initialize with default level
function initializeDefaultLevel() {
  currentLevel = generateLevel(1);
}

/**
 * Load a level for the given difficulty using seeded generation
 */
export function loadLevelForDifficulty(difficulty) {
  currentLevel = generateLevel(difficulty);
  // Mutate the exported arrays to reflect new level
  updateExportedArrays();
  return currentLevel;
}

/**
 * Get the current level data
 */
export function getLevel() {
  if (!currentLevel) initializeDefaultLevel();
  return currentLevel;
}

/**
 * Get the current level's environment type (outdoor, castle, lava)
 */
export function getEnvironment() {
  if (!currentLevel) initializeDefaultLevel();
  return currentLevel?.environment || 'outdoor';
}

// Exported arrays that will be mutated when levels load
export const platforms = [];
export const spikes = [];
export const lavaZones = [];
export let checkpoint = { x: 4609, y: 310, w: 50, h: 90 };
export let merchant = { x: 4189, y: 200, w: 80, h: 60 };
export let PLAYER_START_PLATFORM = { x: 0, y: 400, w: 320, h: 80 };
export const ENEMY_SPAWN_POINTS = [];
export const SKULL_SPAWN_POINTS = [];

/**
 * Update all exported arrays when level changes
 */
function updateExportedArrays() {
  if (!currentLevel) return;

  // Clear and refill platforms
  platforms.length = 0;
  platforms.push(...currentLevel.platforms);

  // Clear and refill spikes
  spikes.length = 0;
  spikes.push(...currentLevel.spikes);

  // Clear and refill lava zones
  lavaZones.length = 0;
  lavaZones.push(...currentLevel.lavaZones);

  // Update checkpoint and merchant
  checkpoint = currentLevel.checkpoint;
  merchant = currentLevel.merchant;

  // Update player start platform
  PLAYER_START_PLATFORM = currentLevel.platforms.find(p => p.type === 'ground') || { x: 0, y: 400, w: 320, h: 80 };

  // Clear and refill enemy spawns
  ENEMY_SPAWN_POINTS.length = 0;
  ENEMY_SPAWN_POINTS.push(...currentLevel.enemySpawns);

  // Generate skull spawns from enemy spawns
  SKULL_SPAWN_POINTS.length = 0;
  const skullSpawns = currentLevel.enemySpawns
    .filter((_, i) => i % 2 === 0)
    .map(spawn => ({ x: spawn.x, type: 'skull' }));
  SKULL_SPAWN_POINTS.push(...skullSpawns);
  
  // Phase 3a: Rebuild spatial grid for new level obstacles
  initializeSpatialGrid();
}

// Initialize default level on module load
initializeDefaultLevel();
updateExportedArrays();

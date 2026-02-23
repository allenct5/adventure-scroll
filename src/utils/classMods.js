// classMods.js — Class Mod definitions. Class Mods modify the loadout/abilities of player classes.

/**
 * Class Mod structure:
 * {
 *   id: 'classMod_<name>',                // unique identifier (backend name)
 *   displayName: 'Display Name',          // shown to player
 *   classRequired: 'mage|warrior|archer', // which class this mod is for
 *   description: 'Brief description',     // what changes
 *   weaponOverride: 'staff|bow|sword',    // optional - changes equipped weapon
 *   spellOverrides: {                     // spells this mod overrides
 *     leftClick: function,  // optional - imported from player.js
 *     rightClick: function, // optional - imported from player.js
 *   }
 * }
 * 
 * WEAPON RARITY PRESERVATION:
 * When weaponOverride is specified, the new weapon inherits the rarity
 * from the previously equipped weapon. When the mod is unequipped,
 * the original weapon and rarity are restored.
 */

import { shootLightningSpark, shootLightningBolt } from '../entities/player.js';

// Mage Class Mods
export const classMod_Cloudshaper = {
  id: 'classMod_Cloudshaper',
  displayName: 'Cloudshaper',
  classRequired: 'mage',
  description: 'Transform your orbs into lightning sparks and your fireball into a massive lightning bolt.',
  spellOverrides: {
    leftClick: shootLightningSpark,
    rightClick: shootLightningBolt,
  },
};

// All available class mods, organized by class
export const CLASS_MODS = {
  mage: [classMod_Cloudshaper],
  archer: [],
  warrior: [],
};

/**
 * Get a class mod by ID
 */
export function getClassModById(id) {
  for (const classKey in CLASS_MODS) {
    const mods = CLASS_MODS[classKey];
    for (const mod of mods) {
      if (mod.id === id) return mod;
    }
  }
  return null;
}

/**
 * Get all class mods for a specific class
 */
export function getClassModsForClass(classType) {
  return CLASS_MODS[classType] || [];
}

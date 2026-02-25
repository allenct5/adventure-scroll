// classMods.js — Class Mod definitions. Class Mods modify the loadout/abilities of player classes.

/**
 * Class Mod structure:
 * {
 *   id: 'classMod_<name>',                // unique identifier (backend name)
 *   displayName: 'Display Name',          // shown to player
 *   classRequired: 'mage|warrior|archer', // which class this mod is for
 *   description: 'Brief description',     // what changes
 *   weaponOverride: 'staff|bow|sword',    // optional - changes equipped weapon
 *   colorOverride: {                      // optional - color tints for player appearance
 *     'colorHex': 'newColorHex',          // mapping of original colors to replacement colors
 *   },
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
 * 
 * COLOR TINTING:
 * When colorOverride is specified, the player's appearance colors are tinted
 * according to the mapping. This is useful for changing robes, armor, hats, etc.
 */

// Mage Class Mods
export const classMod_Cloudshaper = {
  id: 'classMod_Cloudshaper',
  displayName: 'Cloudshaper',
  classRequired: 'mage',
  description: 'Harness the power of lightning, bending it to your will.',
  weaponOverride: 'staff',
  weaponVariant: 'cloudshaper',
  colorOverride: {
    // Robe colors: purple → deep blue (electrical theme)
    '#5500aa': '#0044ff',  // primary robe color
    '#3a0078': '#002288',  // darker robe
    '#1a0038': '#001144',  // darkest robe
    '#7722bb': '#0055dd',  // robe hem
    // Hat colors: purple → deep blue
    '#2d0055': '#001155',  // hat brim
    '#1e0040': '#000a22',  // hat gradient top
  },
  spellOverrides: {
    leftClick: null,  // Will be set by initializeClassMods()
    rightClick: null, // Will be set by initializeClassMods()
  },
};

export const classMod_Summoner = {
  id: 'classMod_Summoner',
  displayName: 'Summoner',
  classRequired: 'mage',
  description: 'Raise the fallen to wreak havoc in your name.',
  weaponOverride: 'staff',
  weaponVariant: 'summoner',
  colorOverride: {
    // Robe colors: purple → crimson red (blood/dark summoning theme)
    '#5500aa': '#cc0000',  // primary robe color
    '#3a0078': '#770000',  // darker robe
    '#1a0038': '#330000',  // darkest robe
    '#7722bb': '#ff3333',  // robe hem
    // Hat colors: purple → crimson red
    '#2d0055': '#550000',  // hat brim
    '#1e0040': '#220000',  // hat gradient top
  },
  spellOverrides: {
    leftClick: null,  // Will be set by initializeClassMods()
    rightClick: null, // Will be set by initializeClassMods()
  },
};

// All available class mods, organized by class
export const CLASS_MODS = {
  mage: [classMod_Cloudshaper, classMod_Summoner],
  archer: [],
  warrior: [],
};

/**
 * Apply color tinting from a color override map
 * Maps canvas fillStyle colors to new colors based on the override map
 */
export function applyColorOverride(originalColor, colorOverride) {
  if (!colorOverride || !colorOverride[originalColor]) {
    return originalColor;
  }
  return colorOverride[originalColor];
}

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
/**
 * Initialize class mod spell overrides (must be called after player functions are loaded)
 * This avoids circular import issues by setting up spell function references after both modules are loaded.
 */
export function initializeClassModSpellOverrides(shootLightningSpark, shootLightningBolt, summonWanderingOrc, summonRaisedSkull) {
  classMod_Cloudshaper.spellOverrides.leftClick = shootLightningSpark;
  classMod_Cloudshaper.spellOverrides.rightClick = shootLightningBolt;
  
  classMod_Summoner.spellOverrides.leftClick = summonWanderingOrc;
  classMod_Summoner.spellOverrides.rightClick = summonRaisedSkull;
}
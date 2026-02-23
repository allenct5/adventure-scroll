// CLASS MODS SYSTEM - Documentation and Examples

/**
 * CLASS MODS OVERVIEW
 * 
 * Class Mods are special loadouts that modify a player's equipped spells and abilities.
 * When activated, a Class Mod can override the left-click and/or right-click spells
 * of a player's active class.
 * 
 * CURRENT CLASS MODS:
 * - Mage: classMod_Cloudshaper ("Cloudshaper")
 */

// Import these to work with class mods:
// import { activeClassMod, setActiveClassMod } from '../core/state.js';
// import { getClassModById, getClassModsForClass, classMod_Cloudshaper } from '../utils/classMods.js';

/**
 * EXAMPLE: Activating a Class Mod
 * 
 * To activate the Cloudshaper mod for the Mage:
 * 
 *   import { setActiveClassMod } from '../core/state.js';
 *   import { classMod_Cloudshaper } from '../utils/classMods.js';
 *   
 *   // Activate the mod
 *   setActiveClassMod(classMod_Cloudshaper.id);  // 'classMod_Cloudshaper'
 * 
 * This should be called when:
 * - Player equips a class mod from the shop
 * - Player loads a saved game with a class mod active
 * - A level starts with a class mod effect
 */

/**
 * EXAMPLE: Getting All Mods for a Class
 * 
 *   import { getClassModsForClass } from '../utils/classMods.js';
 *   
 *   const mageMods = getClassModsForClass('mage');
 *   mageMods.forEach(mod => {
 *     console.log(`${mod.displayName}: ${mod.description}`);
 *   });
 */

/**
 * CLOUDSHAPER MOD - Mage Class
 * 
 * Display Name: "Cloudshaper"
 * Backend ID: "classMod_Cloudshaper"
 * 
 * SPELL CHANGES:
 * 
 * Left-Click (replaces Magic Orb):
 *   - Spell: Lightning Spark
 *   - Description: Fast-moving lightning projectiles
 *   - Speed: 9 (vs 6.5 for default orb)
 *   - Size: 5 radius (vs 7 for default orb)
 *   - Damage: 24 (vs 18 for default orb)
 *   - Visual: Cyan (#00ccff) and white particles
 *   - Created by: shootLightningSpark() in player.js
 * 
 * Right-Click (replaces Fireball):
 *   - Spell: Lightning Bolt
 *   - Description: Area damage projectile that triggers at cursor location
 *   - Radius: 60 pixels
 *   - Damage: 45 (vs 35 for default fireball)
 *   - Duration: 30ms (nearly instantaneous)
 *   - Visual: Cyan (#00ccff) and white particles
 *   - Created by: shootLightningBolt() in player.js
 *   - Note: Creates a stationary area effect at the cursor position
 * 
 * IMPLEMENTATION FLOW:
 * 1. Player clicks/right-clicks
 * 2. player.js updatePlayer() checks if mouseDown/mouseRightDown
 * 3. For staff left-click: calls getActiveClassMod()
 * 4. If mod exists with spellOverrides.leftClick, calls that function
 * 5. Otherwise, calls default shootStaffOrb()
 * 6. Same logic for right-click with shootFireball()
 */

/**
 * ADDING NEW CLASS MODS
 * 
 * To create a new class mod:
 * 
 * 1. In src/utils/classMods.js:
 *    - Add new spell functions in player.js (e.g., shootNewSpell)
 *    - Create class mod object with id, displayName, classRequired, description
 *    - Add spellOverrides.leftClick and/or spellOverrides.rightClick
 *    - Add to CLASS_MODS export
 * 
 * 2. In src/entities/player.js:
 *    - Export the new spell override functions (export function shootNewSpell() { ... })
 *    - These functions work with player, playerOrbs, fireballsPlayer, etc.
 * 
 * 3. Import in classMods.js:
 *    - import { shootNewSpell } from '../entities/player.js';
 * 
 * EXAMPLE Class Mod Structure:
 * 
 * export const classMod_FireMage = {
 *   id: 'classMod_FireMage',
 *   displayName: 'Fire Mage',
 *   classRequired: 'mage',
 *   description: 'Supercharge your fire spells with increased damage and spread.',
 *   spellOverrides: {
 *     leftClick: shootEnhancedOrb,      // Custom spell function
 *     rightClick: shootInfernoBlast,    // Custom spell function
 *   },
 * };
 */

/**
 * COLLISION & DAMAGE APPLICATION
 * 
 * Lightning Spark (uses playerOrbs array):
 * - Existing orb collision detection applies
 * - Damage value (24) should be used when projectile hits enemies
 * - isSpark flag can be used for custom rendering or effects
 * 
 * Lightning Bolt (uses fireballsPlayer array):
 * - Uses existing fireball collision detection (area-based)
 * - damage field (45) should be used in collision calculations
 * - isLightningBolt flag identifies this as an area effect
 * - Maximum range is the radius (60 pixels)
 * 
 * NOTE: Collision detection code in other modules may need updates
 * to properly apply the damage field from projectiles if it's not
 * already implemented.
 */

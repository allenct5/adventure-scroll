// INTEGRATION EXAMPLE - How to use Class Mods with Weapon Rarity Preservation

/**
 * RECOMMENDED: Use applyClassMod() and removeClassMod()
 * 
 * These functions handle weapon changes and rarity preservation automatically.
 * Always use these instead of setActiveClassMod() directly!
 */

/**
 * EXAMPLE 1: Simple Test
 * 
 * Add this to your main.js or a test function:
 */

function testCloudshperMod() {
  import { applyClassMod } from './entities/player.js';
  import { classMod_Cloudshaper } from './utils/classMods.js';
  
  // Activate the Cloudshaper mod using applyClassMod
  applyClassMod(classMod_Cloudshaper.id);
  console.log('Cloudshaper mod activated!');
}

/**
 * EXAMPLE 2: In a Shop/Menu System
 * 
 * Show available class mods and let player select one:
 */

function displayClassModsForPlayer(playerClass) {
  import { getClassModsForClass } from './utils/classMods.js';
  
  const mods = getClassModsForClass(playerClass);
  
  mods.forEach((mod, index) => {
    console.log(`${index + 1}. ${mod.displayName}`);
    console.log(`   ${mod.description}`);
    console.log(`   ID: ${mod.id}`);
  });
}

function equipClassMod(modId) {
  import { applyClassMod, removeClassMod } from './entities/player.js';
  
  if (modId) {
    applyClassMod(modId);  // Use applyClassMod, not setActiveClassMod
    console.log(`Equipped class mod: ${modId}`);
  } else {
    removeClassMod();  // Use removeClassMod to properly restore weapon/rarity
    console.log('Unequipped class mod');
  }
}

/**
 * EXAMPLE 3: Level Start - Auto-equip Class Mod
 * 
 * Add to level initialization:
 */

function startLevel(levelConfig) {
  // ... existing level setup code ...
  
  // If level specifies a class mod bonus
  if (levelConfig.classModBonus) {
    import { applyClassMod } from './entities/player.js';
    import { getClassModById } from './utils/classMods.js';
    
    const mod = getClassModById(levelConfig.classModBonus);
    if (mod) {
      applyClassMod(mod.id);  // Use applyClassMod
      console.log(`Level bonus: ${mod.displayName} activated!`);
    }
  }
}

/**
 * EXAMPLE 4: Game Start - Load Saved Class Mod
 * 
 * When loading game state:
 */

function loadGameState(saveData) {
  import { applyClassMod } from './entities/player.js';
  
  // Restore the player's equipped class mod
  if (saveData.activeClassMod) {
    applyClassMod(saveData.activeClassMod);  // Use applyClassMod
  }
}

/**
 * EXAMPLE 5: Save Game
 * 
 * When saving game state:
 */

function saveGameState() {
  import { activeClassMod } from './core/state.js';
  
  const saveData = {
    // ... other save data ...
    activeClassMod: activeClassMod,  // Save the currently equipped mod
  };
  
  return saveData;
}

/**
 * EXAMPLE 6: Check Which Mod is Active
 * 
 * Get details about the current mod:
 */

function getCurrentModInfo() {
  import { activeClassMod } from './core/state.js';
  import { getClassModById } from './utils/classMods.js';
  
  if (activeClassMod) {
    const mod = getClassModById(activeClassMod);
    if (mod) {
      return {
        name: mod.displayName,
        description: mod.description,
        class: mod.classRequired,
        weaponOverride: mod.weaponOverride || null,
      };
    }
  }
  
  return null;
}

/**
 * EXAMPLE 7: Create a Shop UI Item
 * 
 * For displaying a class mod in a shop:
 */

function createClassModShopItem(mod) {
  return {
    type: 'classMod',
    id: mod.id,
    displayName: mod.displayName,
    description: mod.description,
    classRequired: mod.classRequired,
    weaponOverride: mod.weaponOverride,
    price: calculateModPrice(mod),  // Your pricing logic
    onPurchase: (playerData) => {
      import { applyClassMod } from './entities/player.js';
      
      // Equip the mod when purchased using applyClassMod
      applyClassMod(mod.id);
      
      // Notify player
      console.log(`Purchased and equipped: ${mod.displayName}`);
      return playerData;
    },
  };
}

/**
 * EXAMPLE 8: Testing All Mods
 * 
 * Cycle through available mods for a class:
 */

function testAllModsForClass(playerClass) {
  import { getClassModsForClass } from './utils/classMods.js';
  import { applyClassMod, removeClassMod } from './entities/player.js';
  
  const mods = getClassModsForClass(playerClass);
  
  if (mods.length === 0) {
    console.log(`No class mods available for ${playerClass}`);
    return;
  }
  
  // Test each mod
  mods.forEach((mod, index) => {
    setTimeout(() => {
      // Remove previous mod first
      if (index > 0) removeClassMod();
      
      applyClassMod(mod.id);  // Use applyClassMod
      console.log(`Testing [${index + 1}/${mods.length}]: ${mod.displayName}`);
      console.log(mod.description);
    }, index * 5000);  // 5 seconds between each
  });
}

/**
 * WEAPON RARITY PRESERVATION - HOW IT WORKS
 * =============================================
 * 
 * The system automatically preserves weapon rarity when class mods
 * change the active weapon.
 * 
 * SCENARIO: Mage has staff at rarity 3, then equips a mod that uses bow
 * 
 * STEP-BY-STEP:
 * 1. Mod specifies: weaponOverride: 'bow'
 * 2. applyClassMod(modId) is called
 * 3. Current weapon (staff) is saved to preModWeapon
 * 4. Current rarity (3) is saved to preModWeaponRarity
 * 5. Player.weapon is changed to 'bow'
 * 6. Player.bowRarity is set to 3 (inherited from previous weapon)
 * 7. Player now uses bow with rarity 3
 * 
 * RESTORING:
 * 8. removeClassMod() is called
 * 9. Original weapon (staff) is restored
 * 10. Original rarity (3) is restored to staffRarity
 * 11. Player is back to using staff at rarity 3
 * 
 * KEY POINTS:
 * - Each weapon tracks its own rarity independently
 *   - player.swordRarity
 *   - player.bowRarity
 *   - player.staffRarity
 * - Class mods transfer rarity from old weapon to new weapon
 * - Original weapon state is preserved in preModWeapon/preModWeaponRarity
 * - Switching back restores everything perfectly
 */

/**
 * WORKFLOW: Equipping, Switching, and Removing Mods
 * ===================================================
 * 
 * SCENARIO A: Equip a single mod, then remove it
 * 
 *   applyClassMod('classMod_Cloudshaper');   // Apply mod
 *   // ... play with mod ...
 *   removeClassMod();                        // Remove mod, restore original
 * 
 * 
 * SCENARIO B: Switch between two different mods
 * 
 *   applyClassMod('classMod_FireMage');    // Apply first mod
 *   // ... play ...
 *   removeClassMod();                      // IMPORTANT: Remove first
 *   applyClassMod('classMod_FrostMage');   // THEN apply second
 * 
 *   // WRONG - don't do this:
 *   applyClassMod('classMod_FireMage');
 *   applyClassMod('classMod_FrostMage');   // ❌ Skipped removeClassMod()
 * 
 * 
 * SCENARIO C: Level bonus auto-applies mod
 * 
 *   // At level start:
 *   applyClassMod(levelBonusModId);
 *   
 *   // At level end or when transitioning:
 *   removeClassMod();
 *   
 *   // OR if switching to different level bonus:
 *   removeClassMod();
 *   applyClassMod(newLevelBonusModId);
 */

/**
 * USAGE NOTES & BEST PRACTICES
 * =============================
 * 
 * ✅ DO USE:
 *    - applyClassMod(modId)     when equipping a mod
 *    - removeClassMod()         when removing a mod
 * 
 * ⚠️  AVOID:
 *    - setActiveClassMod(id) directly
 *    - setActiveClassMod(null) directly
 * 
 * WHY?
 *    - setActiveClassMod only changes state
 *    - applyClassMod/removeClassMod also handle weapon changes and rarity
 * 
 * 2. Always removeClassMod() before applying a different mod
 * 3. The system automatically preserves ALL weapon rarity across changes
 * 5. Weapon rarity transfers 1-to-1 from source to target weapon
 */



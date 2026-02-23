// INTEGRATION EXAMPLE - How to use Cloudshaper Class Mod

/**
 * EXAMPLE 1: Simple Test
 * 
 * Add this to your main.js or a test function:
 */

function testCloudshperMod() {
  import { setActiveClassMod } from './core/state.js';
  import { classMod_Cloudshaper } from './utils/classMods.js';
  
  // Activate the Cloudshaper mod
  setActiveClassMod(classMod_Cloudshaper.id);
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
  import { setActiveClassMod } from './core/state.js';
  
  // Validate that mod exists
  if (modId) {
    setActiveClassMod(modId);
    console.log(`Equipped class mod: ${modId}`);
  } else {
    setActiveClassMod(null);
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
    import { setActiveClassMod } from './core/state.js';
    import { getClassModById } from './utils/classMods.js';
    
    const mod = getClassModById(levelConfig.classModBonus);
    if (mod) {
      setActiveClassMod(mod.id);
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
  import { setActiveClassMod } from './core/state.js';
  
  // Restore the player's equipped class mod
  if (saveData.activeClassMod) {
    setActiveClassMod(saveData.activeClassMod);
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
    price: calculateModPrice(mod),  // Your pricing logic
    onPurchase: (playerData) => {
      import { setActiveClassMod } from './core/state.js';
      
      // Equip the mod when purchased
      setActiveClassMod(mod.id);
      
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
  import { setActiveClassMod } from './core/state.js';
  
  const mods = getClassModsForClass(playerClass);
  
  if (mods.length === 0) {
    console.log(`No class mods available for ${playerClass}`);
    return;
  }
  
  // Test each mod
  mods.forEach((mod, index) => {
    setTimeout(() => {
      setActiveClassMod(mod.id);
      console.log(`Testing [${index + 1}/${mods.length}]: ${mod.displayName}`);
      console.log(mod.description);
    }, index * 5000);  // 5 seconds between each
  });
}

/**
 * USAGE NOTES:
 * 
 * 1. Always import at the function level or module top
 * 2. Use setActiveClassMod(null) to disable a mod
 * 3. The mod only applies when the player's weapon matches the class
 * 4. Changing classes automatically keeps/unsets mods as appropriate
 * 5. Different mods can have different spell overrides (not just left/right)
 */

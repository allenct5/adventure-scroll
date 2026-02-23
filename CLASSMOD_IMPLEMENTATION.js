// CLASS MODS IMPLEMENTATION SUMMARY

/*
  FEATURE: Class Mods System
  FIRST MOD: Cloudshaper (Mage Class)
  
  WHAT WAS CREATED:
  ==================
  
  1. NEW FILE: src/utils/classMods.js
     - Defines the class mods system
     - Exports classMod_Cloudshaper with all its properties
     - Helper functions: getClassModById(), getClassModsForClass()
     - Stores all available mods in CLASS_MODS object
  
  2. STATE MANAGEMENT: src/core/state.js (UPDATED)
     - Added export: activeClassMod = null
     - Added function: setActiveClassMod(v)
     - Tracks which class mod is currently active
  
  3. PLAYER SPELLS: src/entities/player.js (UPDATED & EXPANDED)
     - Added import: activeClassMod from state.js
     - Added import: getClassModById from classMods.js  
     - Added function: getActiveClassMod() helper
     - Updated left-click staff attack to check for class mod
     - Updated right-click staff attack to check for class mod
     - Added new spell: shootLightningSpark() [26 lines]
     - Added new spell: shootLightningBolt() [25 lines]
  
  4. COLLISION SYSTEM: src/utils/projectiles.js (UPDATED)
     - Updated updatePlayerOrbs() to use o.damage if provided
     - Updated updateFireballs() to use f.damage if provided
     - Falls back to default rarityDamage calculations if no custom damage
  
  5. DOCUMENTATION: docs/CLASS_MODS_GUIDE.md (NEW)
     - Complete guide on class mod system
     - Cloudshaper mod details
     - Examples of how to activate and use mods
     - Instructions for adding new class mods
  
  
  CLOUDSHAPER MOD DETAILS:
  ========================
  
  ID: classMod_Cloudshaper
  Display Name: "Cloudshaper"
  Class: Mage
  Description: "Transform your orbs into lightning sparks and your fireball into a massive lightning bolt."
  
  LEFT-CLICK SPELL: Lightning Spark
  - Replaces: Magic Orb
  - Speed: 9 (default orb: 6.5)
  - Projectile Size: 5 radius (default orb: 7)
  - Damage: 24 (default orb: 18)
  - Color: Cyan (#00ccff) and white particles
  - Effect: Fast-moving lightning projectile
  - Implementation: shootLightningSpark() in player.js
  
  RIGHT-CLICK SPELL: Lightning Bolt
  - Replaces: Fireball
  - Trigger: Area effect at cursor location
  - Radius: 60 pixels
  - Damage: 45 (default fireball: 35)
  - Duration: 30ms (nearly instantaneous)
  - Color: Cyan (#00ccff) and white particles
  - Effect: Stationary area damage effect
  - Implementation: shootLightningBolt() in player.js
  
  
  HOW TO ACTIVATE THE MOD:
  ========================
  
  Anywhere in your game code (e.g., in main.js, a shop system, or test code):
  
    import { setActiveClassMod } from './core/state.js';
    import { classMod_Cloudshaper } from './utils/classMods.js';
    
    // Activate Cloudshaper
    setActiveClassMod(classMod_Cloudshaper.id);  // Sets to 'classMod_Cloudshaper'
  
  Once activated, all Mage left-click attacks will use Lightning Spark
  and all right-click attacks will use Lightning Bolt.
  
  
  HOW TO DEACTIVATE:
  ===================
  
    import { setActiveClassMod } from './core/state.js';
    setActiveClassMod(null);  // Returns to default spells
  
  
  TESTING THE MOD:
  =================
  
  To test the Cloudshaper mod in your game:
  
  1. Start the game and select Mage as your class
  2. Add this code to your initialization or in a test function:
     
     import { setActiveClassMod } from './core/state.js';
     import { classMod_Cloudshaper } from './utils/classMods.js';
     setActiveClassMod(classMod_Cloudshaper.id);
  
  3. In-game, as a Mage:
     - Left-click: Should fire cyan/white lightning sparks (faster, smaller orbs)
     - Right-click: Should create area effect lightning bolts at cursor (42% more damage)
  
  
  TECHNICAL DETAILS:
  ===================
  
  CIRCULAR DEPENDENCY RESOLUTION:
  - classMods.js imports spell functions FROM player.js
  - player.js imports class mod utilities FROM classMods.js
  - This works because spell functions are defined in player.js first
  - When player.js attacks, it calls the functions from the mod
  
  DAMAGE APPLICATION:
  - Lightning Spark projectiles use playerOrbs array
  - Lightning Bolt projectiles use fireballsPlayer array
  - Both carry a damage property
  - Collision code checks for projectile.damage field
  - If not present, falls back to default damage calculations
  - All damage is multiplied by player.damageMult and applied to enemy.hp
  
  PROJECTILE PROPERTIES ADDED:
  - isSpark: true (on Lightning Spark orbs) - for future rendering effects
  - isLightningBolt: true (on Lightning Bolt fireballs) - for future rendering/effects
  - damage: custom value - used instead of default calculations
  
  
  FILES MODIFIED:
  =================
  src/core/state.js (4 lines added)
  src/entities/player.js (51 lines added, 1 import added)
  src/utils/projectiles.js (4 lines changed total)
  src/utils/classMods.js (NEW FILE - 57 lines)
  docs/CLASS_MODS_GUIDE.md (NEW FILE - documentation)
  
  
  WHAT'S NOT YET IMPLEMENTED:
  ============================
  
  (Beyond the scope of initial class mod system creation)
  
  1. UI/Shop Integration
     - No UI exists to select or equip class mods
     - Would need to add class mod selection screen/shop
  
  2. Persistence
     - No save/load system for equipped class mods
     - Would need to store activeClassMod in save data
  
  3. Visual Effects
     - isSpark and isLightningBolt flags are set but not used for rendering
     - Could create specialized rendering for these spell types
  
  4. Sound Effects
     - Uses existing 'orb_spell' and 'fireball_spell' sounds
     - Could add specialized lightning sound effects
  
  5. Balancing
     - Cloudshaper values are initial estimates
     - Could be adjusted based on playtesting
*/

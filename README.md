# ⚔ Adventure Scroll

A fast-paced browser-based action game where you choose your class and battle through a dynamic level filled with enemies, hazards, and treasure.

## Features

- **Three Player Classes**: Choose between Warrior, Archer, or Mage, each with unique weapons and abilities
- **Dynamic Combat System**: 
  - Sword swings, bow attacks with unlimited arrows, and magical projectiles
  - Mana and stamina mechanics
  - Power-ups and temporary boosts
- **Hazardous Environments**: Navigate deadly spikes, lava zones, and bottomless pits
- **Weapon Progression**: Find rare weapon drops to increase your damage and unlock new abilities
- **Shop System**: Spend coins collected from enemies to upgrade health and purchase power-ups
- **Checkpoint System**: Progress through the level and return to your last checkpoint when defeated
- **Difficulty Scaling**: Enemy difficulty increases as you progress further into the level

## How to Play

1. Open `index.html` in a web browser
2. Select your player class:
   - **Warrior** (⚔️): High health, blocking ability with shield
   - **Archer** (🏹): Medium health, unlimited arrows, bombs
   - **Mage** (🔮): Lower health, magical staff with mana-based attacks
3. Use **A/D** or **Arrow Keys** to move
4. **Space** to jump
5. **S** to drop through platforms
6. **Left Click** for primary attack
7. **Right Click** for secondary ability (shield block, bombs, or fireballs)
8. **ESC** to pause

## Project Structure

```
src/
├── core/
│   ├── constants.js      # Game constants and balancing values
│   ├── main.js           # Game loop and state management
│   ├── renderer.js       # Rendering functions for environments
│   ├── state.js          # Global game state
│   └── canvas.js         # Canvas context export
├── entities/
│   ├── player.js         # Player mechanics and combat
│   └── enemies.js        # Enemy AI and behavior
├── utils/
│   ├── collision.js      # Collision detection
│   ├── coins.js          # Coin system
│   ├── hud.js            # UI and HUD updates
│   ├── particles.js      # Particle effects
│   ├── powerups.js       # Power-up mechanics
│   ├── projectiles.js    # All projectile types
│   └── shop.js           # Shop system
└── scenes/
    └── level.js          # Level data and layout
```

## Development

The game is built with vanilla JavaScript and HTML5 Canvas. All game mechanics are self-contained in modular files for easy modification and extension.

To modify game balancing, edit `src/core/constants.js`.

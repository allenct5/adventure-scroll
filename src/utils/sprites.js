// Sprite manifest — maps sprite keys to file paths under assets/sprites/
const SPRITE_PATHS = {
  // Player classes
  player_warrior: 'assets/sprites/player/warrior.png',
  player_archer:  'assets/sprites/player/archer.png',
  player_mage:    'assets/sprites/player/mage.png',

  // Enemies
  enemy_outdoorOrc:  'assets/sprites/enemy/orc_outdoor.png',
  enemy_castleOrc:   'assets/sprites/enemy/orc_castle.png',
  enemy_evilOrc:     'assets/sprites/enemy/orc_evil.png',
  enemy_outdoorMage: 'assets/sprites/enemy/mage_outdoor.png',
  enemy_castleMage:  'assets/sprites/enemy/mage_castle.png',
  enemy_evilMage:    'assets/sprites/enemy/mage_evil.png',
  enemy_castleSkull: 'assets/sprites/enemy/skull_castle.png',
  enemy_evilSkull:   'assets/sprites/enemy/skull_evil.png',

  // NPCs
  npc_merlin: 'assets/sprites/npc/merlin.png',
};

// Registry of loaded HTMLImageElement objects (null = not available)
const spriteRegistry = {};

/**
 * Attempts to load a single image. Resolves with the image on success,
 * or null if the file is missing or fails to load.
 */
function tryLoad(key, path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      spriteRegistry[key] = img;
      resolve(img);
    };
    img.onerror = () => {
      spriteRegistry[key] = null;
      resolve(null);
    };
    img.src = path;
  });
}

/**
 * Loads all sprites defined in SPRITE_PATHS. Missing files are silently
 * ignored — getSprite() will return null for those keys.
 * Call this once during game initialization and await it before starting
 * the render loop.
 */
export async function loadSprites() {
  await Promise.all(
    Object.entries(SPRITE_PATHS).map(([key, path]) => tryLoad(key, path))
  );
}

/**
 * Returns the loaded HTMLImageElement for a sprite key, or null if the
 * sprite was not found / not yet loaded.
 * @param {string} key - A key from SPRITE_PATHS (e.g. 'player_warrior')
 * @returns {HTMLImageElement|null}
 */
export function getSprite(key) {
  return spriteRegistry[key] ?? null;
}

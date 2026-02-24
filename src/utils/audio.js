// audio.js — Background music and SFX management.

const outdoorMusic = new Audio('assets/audio/music/242932_Overworld_Theme.mp3');
outdoorMusic.loop = true;
outdoorMusic.volume = 0.1;

const defeatMusic = new Audio('assets/audio/music/1280915_Defeat--2023.mp3');
defeatMusic.loop = false;
defeatMusic.volume = 0.1;

let currentTrack = null;
export let gameVolume = 0.5;
let musicVolume = 0.05;

export function setMusicVolume(v) {
  musicVolume = v;
  if (currentTrack) currentTrack.volume = musicVolume;
}

export function setGameVolume(v) {
  gameVolume = v;
}

function playTrack(track) {
  if (currentTrack === track) return;
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
  currentTrack = track;
  if (track) {
    track.volume = musicVolume;
    track.play().catch(() => {});
  }
}

export function stopMusic() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
    currentTrack = null;
  }
}

// Plays the appropriate track (or silence) for the given difficulty level.
// Difficulty 1–2: outdoor overworld theme.
// Difficulty 3+:  no music (castle interior, etc.).
export function updateMusicForDifficulty(diff) {
  if (diff <= 2) {
    playTrack(outdoorMusic);
  } else {
    stopMusic();
  }
}

export function playDeathMusic() {
  playTrack(defeatMusic);
}

// --- SFX SYSTEM ---
// Minimum ms between replays per sound — prevents muddy overlap at high attack speeds.
// Attack sounds are set to ~70-75% of the fastest possible cooldown for that weapon.
const SFX_MIN_INTERVAL = {
  sword_attack:        450,   // fastest sword cooldown ~600ms real
  axe_attack:          450,   // fastest orc attack cooldown ~1870ms real; per-slot so two orcs can overlap
  bow_attack:          450,   // fastest arrow cooldown ~600ms real
  bomb_throw:          500,
  shield_block:          0,
  shield_reflect:      300,   // multiple orbs can enter range in same frame; debounce collapses them
  jump_sound:          150,   // allows player + nearby enemy jumps to both sound
  bomb_explode:        150,   // explosions can briefly stack
  fireball_spell:      700,   // fastest fireball cooldown ~917ms real
  fireball_explode:    150,
  orb_spell:           250,   // fastest orb cooldown ~347ms real
  orb_hit:             150,   // can briefly overlap if player and enemy orbs hit simultaneously
  button_press:          0,
  checkpoint_continue:   0,
  coindrop_jackpot:      0,
  single_coin_pickup:    0,
  powerup_pickup:        0,
  levelup:               0,
  shop_open:             0,
  shop_purchase:         0,
};

const SFX_FILES = {
  sword_attack:       'assets/audio/sfx/attacks/sword_attack.mp3',
  axe_attack:         'assets/audio/sfx/attacks/axe_attack.mp3',
  bow_attack:         'assets/audio/sfx/attacks/bow_attack.mp3',
  bomb_throw:         'assets/audio/sfx/attacks/bomb_throw.mp3',
  shield_block:       'assets/audio/sfx/attacks/shield_block.mp3',
  shield_reflect:     'assets/audio/sfx/attacks/shield_reflect.mp3',
  jump_sound:         'assets/audio/sfx/attacks/jump_sound.mp3',
  bomb_explode:       'assets/audio/sfx/attacks/bomb_explode.mp3',
  fireball_spell:     'assets/audio/sfx/spells/fireball_spell.mp3',
  fireball_explode:   'assets/audio/sfx/spells/fireball_explode.mp3',
  orb_spell:          'assets/audio/sfx/spells/orb_spell.mp3',
  orb_hit:            'assets/audio/sfx/spells/orb_hit.mp3',
  button_press:       'assets/audio/sfx/ui/button_press.mp3',
  checkpoint_continue:'assets/audio/sfx/ui/checkpoint_continue.mp3',
  coindrop_jackpot:   'assets/audio/sfx/ui/coindrop_jackpot.mp3',
  single_coin_pickup: 'assets/audio/sfx/ui/single_coin_pickup.mp3',
  powerup_pickup:     'assets/audio/sfx/ui/powerup_pickup.mp3',
  levelup:            'assets/audio/sfx/ui/levelup.mp3',
  shop_open:          'assets/audio/sfx/ui/shop_open.mp3',
  shop_purchase:      'assets/audio/sfx/ui/shop_purchase.mp3',
};

// Sounds that need more than one simultaneous instance (e.g. multiple enemies attacking at once).
// Player attack sounds are single-instance (only one player); enemy sounds are pooled at 2.
const SFX_POOL_SIZES = {
  axe_attack:  2,
  orb_spell:   2,
  jump_sound:  2,
};

const sfxPool = {};
const sfxLastPlayed = {};

for (const [name, path] of Object.entries(SFX_FILES)) {
  const size = SFX_POOL_SIZES[name] ?? 1;
  sfxPool[name] = Array.from({ length: size }, () => {
    const a = new Audio(path);
    a.volume = 0.4;
    return a;
  });
}

export function playSfx(name) {
  const pool = sfxPool[name];
  if (!pool) return;
  const now = performance.now();
  const minInterval = SFX_MIN_INTERVAL[name] ?? 0;

  // Pick the slot that is out of debounce and was played longest ago.
  // For single-instance sounds the pool has one entry so behaviour is identical to before.
  let bestIdx = -1, bestAge = -1;
  for (let i = 0; i < pool.length; i++) {
    const key = pool.length > 1 ? `${name}_${i}` : name;
    const age = now - (sfxLastPlayed[key] ?? -Infinity);
    if (age >= minInterval && age > bestAge) { bestIdx = i; bestAge = age; }
  }
  if (bestIdx === -1) return;

  const key = pool.length > 1 ? `${name}_${bestIdx}` : name;
  sfxLastPlayed[key] = now;
  const sound = pool[bestIdx];
  sound.volume = 0.4 * gameVolume;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

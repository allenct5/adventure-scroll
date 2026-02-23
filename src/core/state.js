// state.js — All shared mutable game state. Every module imports from here.
// Use the set* helpers to update values so consumers stay in sync.

export let playerClass = null;
export let activeClassMod = null; // Current class mod applied to player
export let gameState   = 'classSelect';
export let godMode     = false;
export let cameraX     = 0;
export let frameCount  = 0;
export let lastTime    = 0;

export let zoneCount      = 0;
export let difficultyLevel = 1;
export let shopOpen        = false;

export let player    = null; // set by player.js createPlayer()
export let enemies   = [];
export let arrows    = [];
export let fireballsPlayer = [];
export let playerOrbs = [];
export let playerBombs = [];
export let enemyProjectiles = [];
export let particles = [];
export let powerups  = [];
export let coins     = [];

export let keys          = {};
export let mouseDown     = false;
export let mouseRightDown = false;
export let mousePos      = {x: 0, y: 0};

export let playerGroundHistory = [];
export let lastDropTime = { attackSpeed: -Infinity, health: -Infinity, ammo: -Infinity, mana: -Infinity, bomb: -Infinity };
export let lastJackpotTime = -Infinity;

// --- Setters (keeps module references valid for primitive values) ---
export function setPlayerClass(v)     { playerClass = v; }
export function setActiveClassMod(v)  { activeClassMod = v; }
export function setGameState(v)       { gameState = v; }
export function setGodMode(v)         { godMode = v; }
export function setCameraX(v)         { cameraX = v; }
export function setFrameCount(v)      { frameCount = v; }
export function setLastTime(v)        { lastTime = v; }
export function setZoneCount(v)       { zoneCount = v; }
export function setDifficultyLevel(v) { difficultyLevel = v; }
export function setShopOpen(v)        { shopOpen = v; }
export function setPlayer(v)          { player = v; }
export function setMouseDown(v)       { mouseDown = v; }
export function setMouseRightDown(v)  { mouseRightDown = v; }
export function setLastJackpotTime(v) { lastJackpotTime = v; }

export function resetDropTimes() {
  lastDropTime = { attackSpeed: -Infinity, health: -Infinity, ammo: -Infinity, mana: -Infinity, bomb: -Infinity };
}
export function resetJackpotTime() { lastJackpotTime = -Infinity; }

export function clearCombatArrays() {
  enemies.length = 0;
  arrows.length = 0;
  fireballsPlayer.length = 0;
  playerOrbs.length = 0;
  playerBombs.length = 0;
  enemyProjectiles.length = 0;
  powerups.length = 0;
  coins.length = 0;
}
export function clearParticles() { particles.length = 0; }
export function clearGroundHistory() { playerGroundHistory.length = 0; }

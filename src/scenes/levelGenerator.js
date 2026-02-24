// levelGenerator.js — Seeded level generation based on difficulty
// Uses difficulty to seed randomization, ensuring consistent but varying levels per difficulty

/**
 * Ensure Math.clamp is available
 */
if (!Math.clamp) {
  Math.clamp = (value, min, max) => Math.min(Math.max(value, min), max);
}

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  // Linear congruential generator for deterministic randomness
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Random integer between min (inclusive) and max (exclusive)
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Random float between min and max
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  // Pick random element from array
  pick(arr) {
    return arr[this.nextInt(0, arr.length)];
  }

  // Shuffle array in place
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/**
 * Map difficulty to environment name and generation parameters
 */
export function getDifficultyConfig(difficulty) {
  const configs = {
    1: { environment: 'outdoor', seed: 1000, platformDensity: 0.5, hazardDensity: 0.3 },
    2: { environment: 'outdoor', seed: 2000, platformDensity: 0.6, hazardDensity: 0.4 },
    3: { environment: 'castle', seed: 3000, platformDensity: 0.65, hazardDensity: 0.5 },
    4: { environment: 'castle', seed: 4000, platformDensity: 0.75, hazardDensity: 0.6 },
    5: { environment: 'lava', seed: 5000, platformDensity: 0.8, hazardDensity: 0.7 },
  };

  return configs[Math.clamp(difficulty, 1, 5)] || configs[1];
}

/**
 * Generate complete level layout for a given difficulty
 */
export function generateLevel(difficulty) {
  const config = getDifficultyConfig(difficulty);
  const rng = new SeededRandom(config.seed);

  const level = {
    environment: config.environment,
    difficulty,
    platforms: generatePlatforms(rng, config.platformDensity),
    spikes: generateSpikes(rng, config.hazardDensity),
    lavaZones: generateLavaZones(rng, config.hazardDensity, difficulty),
    enemySpawns: generateEnemySpawns(rng, difficulty),
    checkpoint: getCheckpointForDifficulty(difficulty),
    merchant: getMerchantLocation(),
  };

  return level;
}

/**
 * Generate ground platforms with 4 evenly-spaced pits
 */
function generatePlatforms(rng, platformDensity) {
  const LEVEL_WIDTH = 5129;
  const GROUND_Y = 400;
  const GROUND_H = 80;
  const platforms = [];

  // Define 4 pit locations (evenly spaced across level, ~220px wide = jumpable)
  const pitPositions = [300, 940, 1580, 2220];
  const pitGaps = [520, 1160, 1800, 2440];

  // Ground sections between pits
  const groundSections = [
    { x: 0, w: pitPositions[0], start: true },
    { x: pitGaps[0], w: pitPositions[1] - pitGaps[0] },
    { x: pitGaps[1], w: pitPositions[2] - pitGaps[1] },
    { x: pitGaps[2], w: pitPositions[3] - pitGaps[2] },
    { x: pitGaps[3], w: LEVEL_WIDTH - pitGaps[3], end: true },
  ];

  groundSections.forEach((section) => {
    const width = section.w - 10; // Slight variation
    platforms.push({
      x: section.x,
      y: GROUND_Y,
      w: width,
      h: GROUND_H,
      type: 'ground',
    });
  });

  // Add merchant platform at fixed location
  platforms.push({
    x: 4149,
    y: 400,
    w: 160,
    h: 18,
    type: 'platform',
    isMerchantPlatform: true,
  });

  // Generate floating platforms with density variation
  const floatingCount = Math.floor(20 * platformDensity) + rng.nextInt(-2, 2);
  const floatingPlatforms = generateFloatingPlatforms(rng, floatingCount, pitPositions, pitGaps);
  platforms.push(...floatingPlatforms);

  return platforms;
}

/**
 * Generate floating platforms avoiding pit zones
 */
function generateFloatingPlatforms(rng, count, pitPositions, pitGaps) {
  const platforms = [];
  const platformWidths = [80, 90, 100, 110];
  const platformHeights = 18;
  const yRange = { min: 250, max: 320 };

  // Define safe zones (between pits)
  const safeZones = [
    { x: 0, w: pitPositions[0] },
    { x: pitGaps[0], w: pitPositions[1] - pitGaps[0] },
    { x: pitGaps[1], w: pitPositions[2] - pitGaps[1] },
    { x: pitGaps[2], w: pitPositions[3] - pitGaps[2] },
    { x: pitGaps[3], w: 5129 - pitGaps[3] },
  ];

  for (let i = 0; i < count; i++) {
    const zone = rng.pick(safeZones);
    const w = rng.pick(platformWidths);
    const x = zone.x + rng.nextInt(20, Math.max(zone.w - w - 20, zone.x + w + 20));
    const y = rng.nextInt(yRange.min, yRange.max);

    // Avoid overlap with other platforms
    const overlaps = platforms.some(
      (p) => !(p.x + p.w < x || p.x > x + w || p.y + platformHeights < y || p.y > y + platformHeights)
    );

    if (!overlaps) {
      platforms.push({
        x: Math.max(0, Math.min(x, 5129 - w)),
        y,
        w,
        h: platformHeights,
        type: 'platform',
      });
    }
  }

  return platforms;
}

/**
 * Generate spike hazards with difficulty scaling
 */
function generateSpikes(rng, hazardDensity) {
  const spikes = [];
  const pitPositions = [300, 940, 1580, 2220];
  const pitGaps = [520, 1160, 1800, 2440];

  // Place spikes near pit edges
  const spikeCount = Math.floor(5 * hazardDensity);
  for (let i = 0; i < spikeCount; i++) {
    const pitIndex = i % pitPositions.length;
    const x = (i < pitPositions.length) ? pitGaps[pitIndex] - 60 : rng.nextInt(0, 5129);
    const width = rng.nextInt(50, 90);

    spikes.push({
      x: Math.max(0, Math.min(x, 5129 - width)),
      y: 466,
      w: width,
      h: 14,
    });
  }

  return spikes;
}

/**
 * Generate lava zones with difficulty scaling
 */
function generateLavaZones(rng, hazardDensity, difficulty) {
  const lavaZones = [];

  // Difficulty 5 (lava cave) has more lava
  if (difficulty === 5) {
    const lavaCount = Math.floor(3 + hazardDensity * 2);
    for (let i = 0; i < lavaCount; i++) {
      lavaZones.push({
        x: rng.nextInt(0, 5000),
        y: 452,
        w: rng.nextInt(60, 100),
        h: 28,
      });
    }
  } else if (difficulty >= 3) {
    const lavaCount = Math.floor(2 * hazardDensity);
    for (let i = 0; i < lavaCount; i++) {
      lavaZones.push({
        x: rng.nextInt(1000, 4000),
        y: 452,
        w: rng.nextInt(60, 80),
        h: 28,
      });
    }
  }

  return lavaZones;
}

/**
 * Generate enemy spawn points avoiding pit zones and start platform
 */
function generateEnemySpawns(rng, difficulty) {
  const spawns = [];
  const pitPositions = [300, 940, 1580, 2220];
  const pitGaps = [520, 1160, 1800, 2440];
  const PLAYER_START_PLATFORM = { x: 0, w: 320 };

  // Spawn count increases with difficulty
  const spawnCount = 10 + Math.floor(difficulty * 2);
  const enemyTypes = ['melee', 'mage'];

  // Define safe zones for spawning (skip first zone since it's a pit)
  const safeZones = [
    { x: pitGaps[0], w: pitPositions[1] - pitGaps[0] },
    { x: pitGaps[1], w: pitPositions[2] - pitGaps[1] },
    { x: pitGaps[2], w: pitPositions[3] - pitGaps[2] },
    { x: pitGaps[3], w: 5129 - pitGaps[3] },
  ];

  for (let i = 0; i < spawnCount; i++) {
    const zone = rng.pick(safeZones);
    const x = zone.x + rng.nextInt(20, Math.max(zone.w - 40, zone.x + 40));
    const type = rng.pick(enemyTypes);

    // Higher difficulty favors mages
    const mageChance = 30 + difficulty * 10;
    if (rng.nextInt(0, 100) < mageChance) {
      spawns.push({ x, type: 'mage' });
    } else {
      spawns.push({ x, type: 'melee' });
    }
  }

  return spawns;
}

/**
 * Fixed checkpoint location per difficulty (slightly varied)
 */
function getCheckpointForDifficulty(difficulty) {
  // Checkpoint always near end but varies slightly
  return {
    x: 4609,
    y: 310,
    w: 50,
    h: 90,
  };
}

/**
 * Fixed merchant location
 */
function getMerchantLocation() {
  return {
    x: 4189,
    y: 200,
    w: 80,
    h: 60,
  };
}

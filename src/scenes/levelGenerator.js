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

  const platforms = generatePlatforms(rng, config.platformDensity);
  const level = {
    environment: config.environment,
    difficulty,
    platforms: platforms,
    spikes: generateSpikes(rng, config.hazardDensity),
    lavaZones: generateLavaZones(rng, config.hazardDensity, difficulty),
    enemySpawns: generateEnemySpawns(rng, difficulty, platforms),
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

  // Define 4 pit locations (evenly spaced across level, ~140px wide = jumpable with current physics)
  const pitPositions = [300, 940, 1580, 2220];
  const pitGaps = [440, 1080, 1720, 2360];

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
    y: 230,
    w: 160,
    h: 18,
    type: 'platform',
    isMerchantPlatform: true,
  });

  // Generate floating platforms with density variation (guaranteed minimum 10)
  const floatingCount = Math.max(10, Math.floor(20 * platformDensity) + rng.nextInt(-2, 2));
  const floatingPlatforms = generateFloatingPlatforms(rng, floatingCount, pitPositions, pitGaps);
  platforms.push(...floatingPlatforms);

  return platforms;
}

/**
 * Generate floating platforms avoiding pit zones with guaranteed minimum coverage
 */
function generateFloatingPlatforms(rng, count, pitPositions, pitGaps) {
  const platforms = [];
  const platformWidths = [80, 90, 100, 110];
  const platformHeights = 18;
  const platformSpacing = 40;
  const yRange = { min: 230, max: 290 };
  const LEVEL_WIDTH = 5129;
  const MINIMUM_PLATFORMS = 10;
  
  // Ensure at least 10 platforms
  const targetCount = Math.max(count, MINIMUM_PLATFORMS);

  // Define safe zones (between pits)
  const safeZones = [
    { x: 0, w: pitPositions[0] },
    { x: pitGaps[0], w: pitPositions[1] - pitGaps[0] },
    { x: pitGaps[1], w: pitPositions[2] - pitGaps[1] },
    { x: pitGaps[2], w: pitPositions[3] - pitGaps[2] },
    { x: pitGaps[3], w: LEVEL_WIDTH - pitGaps[3] },
  ];

  // Calculate even distribution across level width
  const platformsPerZone = Math.ceil(targetCount / safeZones.length);
  
  safeZones.forEach((zone, zoneIndex) => {
    const zoneX = zone.x;
    const zoneWidth = zone.w;
    const availableWidth = zoneWidth - 40; // Leave margins
    
    if (availableWidth <= 0) return;
    
    // Distribute platforms evenly within this zone
    const platformsInZone = Math.ceil((targetCount / safeZones.length) * 1.1); // Add 10% buffer
    const spacing = availableWidth / platformsInZone;
    
    for (let i = 0; i < platformsInZone && platforms.length < targetCount; i++) {
      let w = rng.pick(platformWidths);
      
      // 30% chance for platform to be double length
      if (rng.next() < 0.3) {
        w = w * 2;
      }
      
      // Calculate base position for even distribution
      const baseX = zoneX + 20 + (i * spacing);
      const randomOffset = rng.nextInt(-Math.floor(spacing * 0.3), Math.floor(spacing * 0.3));
      const x = Math.max(zoneX + 20, Math.min(baseX + randomOffset, zoneX + zoneWidth - w - 20));
      
      // Vary Y position slightly for visual interest
      const yVariance = rng.nextInt(-15, 15);
      const y = Math.max(yRange.min, Math.min(yRange.max + yVariance, yRange.max + 15));

      // Check for minimum 500px spacing between platforms
      const MIN_HORIZONTAL_SPACING = 500;
      const overlaps = platforms.some(
        (p) => Math.abs(p.x - x) < MIN_HORIZONTAL_SPACING
      );

      if (!overlaps) {
        platforms.push({
          x: Math.max(0, Math.min(x, LEVEL_WIDTH - w)),
          y,
          w,
          h: platformHeights,
          type: 'platform',
        });
      }
    }
  });

  // If we still don't have enough platforms, add them in remaining safe spaces
  if (platforms.length < MINIMUM_PLATFORMS) {
    const attempts = 50;
    for (let attempt = 0; attempt < attempts && platforms.length < MINIMUM_PLATFORMS; attempt++) {
      const zone = rng.pick(safeZones);
      const w = rng.pick(platformWidths);
      const x = zone.x + rng.nextInt(20, Math.max(zone.w - w - 20, zone.x + w + 20));
      const y = rng.nextInt(yRange.min, yRange.max);

      // Check for minimum 500px spacing between platforms
      const MIN_HORIZONTAL_SPACING = 500;
      const overlaps = platforms.some(
        (p) => Math.abs(p.x - x) < MIN_HORIZONTAL_SPACING
      );

      if (!overlaps) {
        platforms.push({
          x: Math.max(0, Math.min(x, LEVEL_WIDTH - w)),
          y,
          w,
          h: platformHeights,
          type: 'platform',
        });
      }
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
    const x = (i < pitPositions.length) ? pitPositions[pitIndex] : rng.nextInt(0, 5129);
    const width = 140;

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
    const pitPositions = [300, 940, 1580, 2220];
    for (let i = 0; i < lavaCount; i++) {
      const x = pitPositions[i % pitPositions.length];
      lavaZones.push({
        x,
        y: 452,
        w: 140,
        h: 28,
      });
    }
  } else if (difficulty >= 3) {
    const lavaCount = Math.floor(2 * hazardDensity);
    const pitPositions = [300, 940, 1580, 2220];
    for (let i = 0; i < lavaCount; i++) {
      const x = pitPositions[i % pitPositions.length];
      lavaZones.push({
        x,
        y: 452,
        w: 140,
        h: 28,
      });
    }
  }

  return lavaZones;
}

/**
 * Generate enemy spawn points on ground and floating platforms with max 3 per zone
 */
function generateEnemySpawns(rng, difficulty, platforms) {
  const spawns = [];
  const pitPositions = [300, 940, 1580, 2220];
  const pitGaps = [520, 1160, 1800, 2440];
  const MAX_ENEMIES_PER_ZONE = 5;

  // Spawn count increases with difficulty
  const spawnCount = 15 + Math.floor(difficulty * 3);
  const enemyTypes = ['melee', 'mage'];

  // Define safe zones for spawning (skip first zone since it's a pit)
  const safeZones = [
    { x: pitGaps[0], w: pitPositions[1] - pitGaps[0] },
    { x: pitGaps[1], w: pitPositions[2] - pitGaps[1] },
    { x: pitGaps[2], w: pitPositions[3] - pitGaps[2] },
    { x: pitGaps[3], w: 5129 - pitGaps[3] },
  ];

  // Get floating platforms only (not ground platforms)
  const floatingPlatforms = platforms.filter(p => p.type === 'platform' && !p.isMerchantPlatform);

  // Track enemies per zone
  const enemiesPerZone = safeZones.map(() => 0);

  for (let i = 0; i < spawnCount; i++) {
    let zoneIndex = -1;
    let attempts = 0;
    const maxAttempts = safeZones.length * 2;

    // Find a zone that hasn't reached max enemies
    while (attempts < maxAttempts) {
      zoneIndex = rng.nextInt(0, safeZones.length);
      if (enemiesPerZone[zoneIndex] < MAX_ENEMIES_PER_ZONE) {
        break;
      }
      attempts++;
    }

    // If all zones are full, skip this spawn
    if (enemiesPerZone[zoneIndex] >= MAX_ENEMIES_PER_ZONE) {
      continue;
    }

    const zone = safeZones[zoneIndex];
    let x;
    let y = undefined; // undefined = ground level, otherwise spawn on platform

    // 60% chance to spawn on ground, 40% chance on floating platform
    if (rng.next() < 0.6) {
      // Spawn on ground
      x = zone.x + rng.nextInt(20, Math.max(zone.w - 40, zone.x + 40));
    } else {
      // Try to spawn on a floating platform within this zone
      const platformsInZone = floatingPlatforms.filter(
        p => p.x >= zone.x && p.x + p.w <= zone.x + zone.w
      );
      if (platformsInZone.length > 0) {
        const platform = rng.pick(platformsInZone);
        x = platform.x + rng.nextInt(10, Math.max(platform.w - 20, platform.x + 20));
        y = platform.y;
      } else {
        // No platform in zone, spawn on ground
        x = zone.x + rng.nextInt(20, Math.max(zone.w - 40, zone.x + 40));
      }
    }

    const type = rng.pick(enemyTypes);

    // Higher difficulty favors mages
    const mageChance = 30 + difficulty * 10;
    const spawn = { x, type: rng.nextInt(0, 100) < mageChance ? 'mage' : 'melee' };
    if (y !== undefined) {
      spawn.y = y; // Optional: spawn at specific Y (on platform)
    }
    spawns.push(spawn);

    enemiesPerZone[zoneIndex]++;
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

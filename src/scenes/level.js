// level.js — Static level data: platforms, hazards, spawn points, merchant, checkpoint.

export const platforms = [
  // Main ground sections (with gaps = pits)
  {x:0,    y:400, w:320, h:80, type:'ground'},
  {x:380,  y:400, w:364, h:80, type:'ground'},
  {x:804,  y:400, w:200, h:80, type:'ground'},
  {x:1064, y:400, w:455, h:80, type:'ground'},
  {x:1519, y:400, w:520, h:80, type:'ground'},
  {x:2109, y:400, w:390, h:80, type:'ground'},
  {x:2499, y:400, w:325, h:80, type:'ground'},
  {x:2894, y:400, w:455, h:80, type:'ground'},
  {x:3419, y:400, w:390, h:80, type:'ground'},
  {x:3809, y:400, w:520, h:80, type:'ground'},
  {x:4409, y:400, w:520, h:80, type:'ground'},
  // Floating platforms
  {x:400,  y:310, w:100, h:18, type:'platform'},
  {x:550,  y:270, w:100, h:18, type:'platform'},
  {x:824,  y:320, w:90,  h:18, type:'platform'},
  {x:1134, y:310, w:110, h:18, type:'platform'},
  {x:1284, y:260, w:90,  h:18, type:'platform'},
  {x:1579, y:310, w:100, h:18, type:'platform'},
  {x:1749, y:270, w:90,  h:18, type:'platform'},
  {x:2149, y:310, w:100, h:18, type:'platform'},
  {x:2309, y:270, w:80,  h:18, type:'platform'},
  {x:2559, y:310, w:90,  h:18, type:'platform'},
  {x:2954, y:290, w:100, h:18, type:'platform'},
  {x:3094, y:250, w:80,  h:18, type:'platform'},
  {x:3459, y:310, w:110, h:18, type:'platform'},
  {x:3619, y:270, w:90,  h:18, type:'platform'},
  {x:3889, y:310, w:100, h:18, type:'platform'},
  {x:4049, y:260, w:90,  h:18, type:'platform'},
  {x:4459, y:310, w:100, h:18, type:'platform'},
  {x:4149, y:260, w:160, h:18, type:'platform'}, // merchant platform
];

export const spikes = [
  {x:320,  y:466, w:60, h:14},
  {x:744,  y:466, w:60, h:14},
  {x:1004, y:466, w:60, h:14},
  {x:2824, y:466, w:70, h:14},
  {x:4329, y:466, w:80, h:14},
];

export const lavaZones = [
  {x:2039, y:452, w:70, h:28},
  {x:3349, y:452, w:70, h:28},
];

export const checkpoint = {x: 4609, y: 310, w: 50, h: 90};

export const merchant = {x: 4189, y: 200, w: 80, h: 60};

// The first ground platform — enemies must never spawn here
export const PLAYER_START_PLATFORM = platforms[0];

export const ENEMY_SPAWN_POINTS = [
  {x: 430,  type: 'melee'},
  {x: 580,  type: 'melee'},
  {x: 884,  type: 'melee'},
  {x: 1144, type: 'mage'},
  {x: 1284, type: 'melee'},
  {x: 1609, type: 'melee'},
  {x: 1779, type: 'mage'},
  {x: 2169, type: 'melee'},
  {x: 2339, type: 'melee'},
  {x: 2579, type: 'mage'},
  {x: 2974, type: 'melee'},
  {x: 3114, type: 'melee'},
  {x: 3479, type: 'mage'},
  {x: 3639, type: 'melee'},
  {x: 3909, type: 'melee'},
  {x: 4069, type: 'mage'},
];

export const SKULL_SPAWN_POINTS = [
  {x:  500, type: 'skull'},
  {x: 1050, type: 'skull'},
  {x: 1650, type: 'skull'},
  {x: 2300, type: 'skull'},
  {x: 2850, type: 'skull'},
  {x: 3400, type: 'skull'},
  {x: 3900, type: 'skull'},
  {x: 4300, type: 'skull'},
];

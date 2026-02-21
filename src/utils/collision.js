// collision.js — Collision detection and platform resolution helpers.

import { platforms, spikes, lavaZones } from './level.js';

export function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

export function resolvePlayerPlatforms(entity) {
  entity.onGround = false;
  for (const p of platforms) {
    if (rectOverlap(entity, p)) {
      if (p.type === 'platform') {
        if (entity.droppingThrough === true) continue;
        const overlapTop = (entity.y + entity.h) - p.y;
        if (entity.vy >= 0 && overlapTop > 0 && overlapTop <= entity.vy + 6) {
          entity.y     = p.y - entity.h;
          entity.vy    = 0;
          entity.onGround = true;
        }
      } else {
        const overlapLeft   = (entity.x + entity.w) - p.x;
        const overlapRight  = (p.x + p.w) - entity.x;
        const overlapTop    = (entity.y + entity.h) - p.y;
        const overlapBottom = (p.y + p.h) - entity.y;
        const minOverlap    = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapTop && entity.vy >= 0) {
          entity.y = p.y - entity.h; entity.vy = 0; entity.onGround = true;
        } else if (minOverlap === overlapBottom && entity.vy < 0) {
          entity.y = p.y + p.h; entity.vy = 0;
        } else if (minOverlap === overlapLeft) {
          entity.x = p.x - entity.w; entity.vx = 0;
        } else if (minOverlap === overlapRight) {
          entity.x = p.x + p.w; entity.vx = 0;
        }
      }
    }
  }
}

/** Returns true if moving in dir would step into a pit, spike, or lava. */
export function hazardAhead(entity, dir) {
  const PROBE_X = 10;
  const PROBE_Y = 12;
  const leadX   = dir > 0 ? entity.x + entity.w + PROBE_X : entity.x - PROBE_X;
  const footY   = entity.y + entity.h;

  const groundProbe = {x: leadX - 4, y: footY + 2, w: 8, h: PROBE_Y + 4};
  let groundFound = false;
  for (const p of platforms) {
    if (rectOverlap(groundProbe, p)) { groundFound = true; break; }
  }
  if (!groundFound && entity.onGround) return true;

  const spikeProbe = {x: leadX - 6, y: footY - 16, w: 12, h: 20};
  for (const s of spikes)    { if (rectOverlap(spikeProbe, {x:s.x, y:s.y, w:s.w, h:s.h})) return true; }
  for (const l of lavaZones) { if (rectOverlap(spikeProbe, l)) return true; }
  return false;
}

/** Like hazardAhead but only blocks on actual deadly tiles (spikes/lava), not pits. */
export function deadlyHazardAhead(entity, dir) {
  const PROBE_X  = 10;
  const leadX    = dir > 0 ? entity.x + entity.w + PROBE_X : entity.x - PROBE_X;
  const footY    = entity.y + entity.h;
  const spikeProbe = {x: leadX - 6, y: footY - 16, w: 12, h: 20};
  for (const s of spikes)    { if (rectOverlap(spikeProbe, {x:s.x, y:s.y, w:s.w, h:s.h})) return true; }
  for (const l of lavaZones) { if (rectOverlap(spikeProbe, l)) return true; }
  return false;
}

/** Measures the pixel width of a pit directly ahead of the entity. Returns 0 if none. */
export function measurePitAhead(entity, dir) {
  const footY   = entity.y + entity.h;
  const STEP    = 6;
  const MAX_SCAN = 300;
  const probeH  = 20;
  let inPit = false, pitStart = 0;

  for (let offset = 8; offset <= MAX_SCAN; offset += STEP) {
    const probeX      = dir > 0 ? entity.x + entity.w + offset : entity.x - offset;
    const groundProbe = {x: probeX - 3, y: footY + 2, w: 6, h: probeH};
    let groundFound = false;
    for (const p of platforms) {
      if (rectOverlap(groundProbe, p)) { groundFound = true; break; }
    }
    if (!inPit && !groundFound)   { inPit = true; pitStart = offset; }
    else if (inPit && groundFound) { return offset - pitStart; }
  }
  return inPit ? MAX_SCAN : 0;
}

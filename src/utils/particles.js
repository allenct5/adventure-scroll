// particles.js — Particle spawning, update, and draw.

import { particles, cameraX } from '../core/state.js';
import { ctx } from '../canvas.js';
import { MAX_PARTICLES } from '../core/constants.js';
import { createParticle, releaseParticle, createParticleBurst } from './objectPool.js';  // Phase 3b: Object pooling

export function spawnParticles(x, y, color, count = 8) {
  // Phase 3b: Use object pool for particle creation
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 1 + Math.random() * 4;
    const p = createParticle(
      x, y,
      Math.cos(angle) * spd,
      Math.sin(angle) * spd - 1,
      30 + Math.random() * 20,
      50,
      color,
      2 + Math.random() * 3
    );
    particles.push(p);
  }
  // Trim to cap after all particles added (single operation instead of repeated shifts)
  if (particles.length > MAX_PARTICLES) {
    particles.splice(0, particles.length - MAX_PARTICLES);
  }
}

export function spawnBloodParticles(x, y)  { spawnParticles(x, y, '#ff3333', 10); }
export function spawnSparkParticles(x, y)  { spawnParticles(x, y, '#ffcc44', 6); }

// Helper: Spawn two sets of particles at once (Phase 2 consolidation)
export function spawnDualParticles(x, y, color1, count1, color2, count2) {
  spawnParticles(x, y, color1, count1);
  spawnParticles(x, y, color2, count2);
}

export function spawnJackpotSparkles(x, y) {
  const colors = ['#ffee00','#ffffff','#ffaa00','#ffffa0','#ff88ff','#88ffff'];
  const sparkles = [];
  
  // Phase 3b: Use object pool for sparkle creation
  for (let i = 0; i < 22; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const spd   = 1.5 + Math.random() * 4.5;
    const sparkle = createParticle(
      x, y,
      Math.cos(angle) * spd,
      Math.sin(angle) * spd,
      45 + Math.random() * 35,
      80,
      colors[Math.floor(Math.random() * colors.length)],
      2.5 + Math.random() * 3
    );
    sparkle.type = 'sparkle';
    sparkle.rotation = Math.random() * Math.PI * 2;
    sparkle.rotSpeed = (Math.random() - 0.5) * 0.3;
    sparkles.push(sparkle);
  }
  
  for (let i = 0; i < 6; i++) {
    const gleam = createParticle(
      x + (Math.random() - 0.5) * 20,
      y - Math.random() * 10,
      (Math.random() - 0.5) * 1.2,
      -1 - Math.random() * 2,
      50 + Math.random() * 30,
      80,
      '#ffffff',
      4 + Math.random() * 3
    );
    gleam.type = 'gleam';
    gleam.rotation = Math.random() * Math.PI * 2;
    gleam.rotSpeed = (Math.random() - 0.5) * 0.15;
    sparkles.push(gleam);
  }
  
  // Trim to cap before bulk push
  const overflow = (particles.length + sparkles.length) - MAX_PARTICLES;
  if (overflow > 0) {
    const removed = particles.splice(0, overflow);
    for (const p of removed) {
      releaseParticle(p);
    }
  }
  particles.push(...sparkles);
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.15 * dt;
    p.life -= dt;
    if (p.rotation !== undefined) p.rotation += p.rotSpeed * dt;
    if (p.life <= 0) {
      // Phase 3b: Return particle to pool for reuse
      const removed = particles.splice(i, 1);
      if (removed.length > 0) {
        releaseParticle(removed[0]);
      }
    }
  }
}

export function drawParticles() {
  // Phase 3d: Batch rendering - Group particles by type and color to minimize canvas state changes
  
  // Separate particles by type for batch processing
  const circles = [];     // Simple circular particles (grouped by color)
  const sparkles = [];    // Sparkle type particles
  const gleams = [];      // Gleam type particles
  
  for (const p of particles) {
    if (p.type === 'sparkle') {
      sparkles.push(p);
    } else if (p.type === 'gleam') {
      gleams.push(p);
    } else {
      circles.push(p);
    }
  }
  
  // Batch 1: Draw all circles grouped by color (minimizes fillStyle changes)
  if (circles.length > 0) {
    // Sort or group circles by color
    const circlesByColor = new Map();
    for (const p of circles) {
      if (!circlesByColor.has(p.color)) {
        circlesByColor.set(p.color, []);
      }
      circlesByColor.get(p.color).push(p);
    }
    
    // Draw each color batch together
    for (const [color, batch] of circlesByColor) {
      ctx.fillStyle = color;
      for (const p of batch) {
        const sx = p.x - cameraX;
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Batch 2: Draw sparkles (each needs save/restore and rotation)
  if (sparkles.length > 0) {
    for (const p of sparkles) {
      const sx = p.x - cameraX;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      
      ctx.save();
      ctx.translate(sx, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      const r = p.size * alpha;
      ctx.beginPath();
      for (let pt = 0; pt < 8; pt++) {
        const a = (pt / 8) * Math.PI * 2;
        const rad = pt % 2 === 0 ? r : r * 0.4;
        pt === 0
          ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
          : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
  
  // Batch 3: Draw gleams (each needs save/restore and rotation)
  if (gleams.length > 0) {
    for (const p of gleams) {
      const sx = p.x - cameraX;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      
      ctx.save();
      ctx.translate(sx, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = '#ffff88';
      ctx.shadowBlur = 10;
      const r = p.size * alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.18, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
  
  ctx.globalAlpha = 1;
}

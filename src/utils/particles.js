// particles.js — Particle spawning, update, and draw.

import { particles, cameraX } from '../core/state.js';
import { ctx } from '../canvas.js';

const MAX_PARTICLES = 600;

export function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 1 + Math.random() * 4;
    // If at cap, overwrite the oldest slot instead of splicing
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function spawnBloodParticles(x, y)  { spawnParticles(x, y, '#ff3333', 10); }
export function spawnSparkParticles(x, y)  { spawnParticles(x, y, '#ffcc44', 6); }

export function spawnJackpotSparkles(x, y) {
  const colors = ['#ffee00','#ffffff','#ffaa00','#ffffa0','#ff88ff','#88ffff'];
  const sparkles = [];
  for (let i = 0; i < 22; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const spd   = 1.5 + Math.random() * 4.5;
    sparkles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 45 + Math.random() * 35,
      maxLife: 80,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2.5 + Math.random() * 3,
      type: 'sparkle',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
  for (let i = 0; i < 6; i++) {
    sparkles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - Math.random() * 10,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -1 - Math.random() * 2,
      life: 50 + Math.random() * 30,
      maxLife: 80,
      color: '#ffffff',
      size: 4 + Math.random() * 3,
      type: 'gleam',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
    });
  }
  // Trim to cap before bulk push
  const overflow = (particles.length + sparkles.length) - MAX_PARTICLES;
  if (overflow > 0) particles.splice(0, overflow);
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
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles() {
  for (const p of particles) {
    const sx    = p.x - cameraX;
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;

    if (p.type === 'sparkle') {
      ctx.save();
      ctx.translate(sx, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 6;
      const r = p.size * alpha;
      ctx.beginPath();
      for (let pt = 0; pt < 8; pt++) {
        const a   = (pt / 8) * Math.PI * 2;
        const rad = pt % 2 === 0 ? r : r * 0.4;
        pt === 0
          ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
          : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (p.type === 'gleam') {
      ctx.save();
      ctx.translate(sx, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle   = p.color;
      ctx.shadowColor = '#ffff88';
      ctx.shadowBlur  = 10;
      const r = p.size * alpha;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.18, r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// renderer.js — Environment drawing: background, platforms, hazards, checkpoint, merchant.

import {
  W, H, LEVEL_WIDTH,
  PLAYER_SPEED, SWORD_COOLDOWN, ARROW_COOLDOWN, STAFF_ORB_COOLDOWN,
  BASE_SWORD_DAMAGE, BASE_ARROW_DAMAGE, BASE_FIREBALL_DAMAGE, rarityDamage,
} from './constants.js';
import { platforms, spikes, lavaZones, checkpoint, merchant } from '../scenes/level.js';
import { cameraX, difficultyLevel, player } from './state.js';

import { ctx } from '../canvas.js';

export function drawBackground() {
  const t = Date.now() * 0.001;

  if (difficultyLevel <= 2) {
    // OUTDOOR
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a3a6e'); sky.addColorStop(0.5, '#3d6fa8'); sky.addColorStop(0.8, '#c97c3a'); sky.addColorStop(1, '#e8a055');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    const sunX = W * 0.75, sunY = 60;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90);
    sunGlow.addColorStop(0, 'rgba(255,240,180,0.9)'); sunGlow.addColorStop(0.3, 'rgba(255,200,80,0.5)'); sunGlow.addColorStop(1, 'rgba(255,160,0,0)');
    ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff8c0'; ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    const cloudSeeds = [0, 180, 340, 520, 710, 870];
    for (let i = 0; i < cloudSeeds.length; i++) {
      const cx = ((cloudSeeds[i] - cameraX * 0.08 + LEVEL_WIDTH) % LEVEL_WIDTH) * (W / LEVEL_WIDTH);
      const cy = 55 + (i % 3) * 30, cw = 60 + i * 18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw * 0.5, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cw * 0.25, cy - 10, cw * 0.3, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - cw * 0.2, cy - 6, cw * 0.25, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const FAR_PARALLAX = 0.15;
    ctx.fillStyle = '#4a8c3f';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 50) {
      const wx = x + cameraX * FAR_PARALLAX;
      ctx.lineTo(x, 260 + Math.sin(wx * 0.008) * 70 + Math.sin(wx * 0.005) * 40);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    if (difficultyLevel === 2) {
      const castleDefs = [
        {wx:635,bw:52,kh:55,th:38},{wx:1332,bw:38,kh:40,th:28},
        {wx:2167,bw:68,kh:72,th:52},{wx:2976,bw:44,kh:46,th:32},
        {wx:3689,bw:62,kh:64,th:46},{wx:4549,bw:36,kh:38,th:26},
      ];
      for (const cd of castleDefs) {
        const sx = cd.wx - cameraX * FAR_PARALLAX;
        if (sx > W + 120 || sx < -120) continue;
        const hillY = 260 + Math.sin(cd.wx * 0.008) * 70 + Math.sin(cd.wx * 0.005) * 40;
        const baseY = hillY + 12;
        const bw = cd.bw, kh = cd.kh, th = cd.th, tw = Math.round(bw * 0.28), wall = Math.round(bw * 0.18), kw = Math.round(bw * 0.36), bslot = Math.floor(tw / 5);
        ctx.fillStyle = '#2a5c25';
        ctx.fillRect(sx-bw/2+tw, baseY-wall, bw/2-tw-bw*0.08, wall);
        ctx.fillRect(sx+bw*0.08, baseY-wall, bw/2-tw-bw*0.08, wall);
        ctx.fillRect(sx-bw/2, baseY-th, tw, th);
        for (let b = 0; b < 3; b++) ctx.fillRect(sx-bw/2+b*(bslot*2), baseY-th-bslot*1.4, bslot, bslot*1.4);
        ctx.fillRect(sx+bw/2-tw, baseY-th, tw, th);
        for (let b = 0; b < 3; b++) ctx.fillRect(sx+bw/2-tw+b*(bslot*2), baseY-th-bslot*1.4, bslot, bslot*1.4);
        ctx.fillRect(sx-kw/2, baseY-kh, kw, kh);
        const kbslot = Math.floor(kw / 5);
        for (let b = 0; b < 3; b++) ctx.fillRect(sx-kw/2+b*(kbslot*2), baseY-kh-kbslot*1.4, kbslot, kbslot*1.4);
        ctx.beginPath(); ctx.moveTo(sx-kw/2-2, baseY-kh); ctx.lineTo(sx, baseY-kh-kw*0.55); ctx.lineTo(sx+kw/2+2, baseY-kh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a3a18';
        ctx.fillRect(sx-3, baseY-kh+Math.round(kh*0.25), 6, Math.round(kh*0.18));
        ctx.fillRect(sx-3, baseY-kh+Math.round(kh*0.55), 6, Math.round(kh*0.18));
        const gw = Math.round(kw*0.32), gh = Math.round(kh*0.28);
        ctx.fillRect(sx-gw/2, baseY-gh, gw, gh);
        ctx.beginPath(); ctx.arc(sx, baseY-gh, gw/2, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#2a5c25';
      }
    }

    ctx.fillStyle = '#2e6b28';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) {
      const wx = x + cameraX * 0.35;
      ctx.lineTo(x, 320 + Math.sin(wx * 0.012) * 55 + Math.sin(wx * 0.008) * 30);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  } else if (difficultyLevel <= 4) {
    // CASTLE INTERIOR
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#1a1510'); wall.addColorStop(0.5, '#2a2018'); wall.addColorStop(1, '#0e0c08');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);

    const CASTLE_PARALLAX = 0.15;
    const wallScroll = (cameraX * CASTLE_PARALLAX) % 72;
    ctx.strokeStyle = 'rgba(60,50,35,0.6)'; ctx.lineWidth = 1;
    const blockH = 36, blockW = 72;
    for (let row = 0; row * blockH < H - 80; row++) {
      const offset = (row % 2 === 0) ? 0 : blockW / 2;
      for (let col = -2; col * blockW < W + blockW * 2; col++)
        ctx.strokeRect(col * blockW + offset - wallScroll, row * blockH, blockW, blockH);
    }

    const worldWindowSpacing = W / 4;
    const windowXs = [];
    for (let i = -1; i < 7; i++) {
      const wwx = i * worldWindowSpacing + worldWindowSpacing * 0.3 - (cameraX * CASTLE_PARALLAX % worldWindowSpacing);
      if (wwx < -60 || wwx > W + 60) continue;
      windowXs.push(wwx);
      const wy = 40, ww = 22, wh = 80;
      const shaft = ctx.createLinearGradient(wwx + ww/2, wy, wwx + ww/2, wy + wh * 3);
      shaft.addColorStop(0, 'rgba(180,160,80,0.18)'); shaft.addColorStop(1, 'rgba(180,160,80,0)');
      ctx.fillStyle = shaft;
      ctx.beginPath(); ctx.moveTo(wwx-20, wy+wh*3); ctx.lineTo(wwx+ww+20, wy+wh*3); ctx.lineTo(wwx+ww, wy); ctx.lineTo(wwx, wy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a6e8a';
      ctx.beginPath(); ctx.rect(wwx, wy+wh*0.25, ww, wh*0.75); ctx.arc(wwx+ww/2, wy+wh*0.25, ww/2, Math.PI, 0); ctx.fill();
    }
    for (let i = 0; i < windowXs.length - 1; i++) {
      const tx = (windowXs[i] + windowXs[i+1]) / 2 + 11, ty = 230;
      const flicker1 = Math.sin(t * 4.3 + i * 2.1) * 0.3;
      const flicker2 = Math.sin(t * 6.7 + i * 1.4) * 0.25;
      const flicker3 = Math.sin(t * 2.1 + i * 0.8) * 0.2;
      const flicker = 0.75 + flicker1 + flicker2 + flicker3;

      const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 70 * flicker);
      glow.addColorStop(0, `rgba(255,180,60,${0.25*flicker})`);
      glow.addColorStop(0.5, `rgba(255,100,20,${0.12*flicker})`);
      glow.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(tx-70, ty-70, 140, 140);

      ctx.fillStyle = '#5a4020'; ctx.fillRect(tx-4, ty+8, 8, 20);
      ctx.fillStyle = '#3a2810'; ctx.fillRect(tx-7, ty+6, 14, 6);

      for (let layer = 0; layer < 2; layer++) {
        const layerPhase = layer * 0.5;
        const layerWave = Math.sin(t*5+i*1.2+layerPhase)*0.2 + Math.sin(t*3.1+i*0.7+layerPhase)*0.15;
        const layerIntensity = 1.0 - layer * 0.4;
        const baseHue = 120 + Math.sin(t*8+i*1.7+layerPhase)*50;
        const flameHeight = 12*flicker + 4*layerWave;
        const flameWidth = 5 + Math.sin(t*3.3+i+layerPhase)*2.5;

        ctx.fillStyle = `rgba(255,${Math.max(60,baseHue|0)},0,${0.7*layerIntensity})`;
        ctx.beginPath();
        ctx.ellipse(tx, ty-flameHeight, flameWidth, flameHeight, Math.sin(t*4+i+layerPhase)*0.4, 0, Math.PI*2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255,240,120,0.9)';
      ctx.beginPath();
      ctx.ellipse(tx, ty-2, 2.5, 5*flicker, 0, 0, Math.PI*2);
      ctx.fill();
    }

  } else {
    // LAVA CAVE
    const cave = ctx.createLinearGradient(0, 0, 0, H);
    cave.addColorStop(0, '#0a0400'); cave.addColorStop(0.4, '#150800'); cave.addColorStop(1, '#1a0500');
    ctx.fillStyle = cave; ctx.fillRect(0, 0, W, H);
    const lavaGlow = ctx.createLinearGradient(0, H*0.6, 0, H);
    lavaGlow.addColorStop(0, 'rgba(180,50,0,0)'); lavaGlow.addColorStop(1, 'rgba(220,80,0,0.35)');
    ctx.fillStyle = lavaGlow; ctx.fillRect(0, 0, W, H);

    ctx.save();
    const veinDefs = [
      {y:80,amp:6,freq:0.018,phase:0.0,speed:0.6},{y:145,amp:4,freq:0.022,phase:1.2,speed:0.9},
      {y:210,amp:7,freq:0.014,phase:2.5,speed:0.7},{y:275,amp:5,freq:0.020,phase:0.8,speed:1.1},
      {y:330,amp:4,freq:0.016,phase:3.1,speed:0.8},
    ];
    for (let vi = 0; vi < veinDefs.length; vi++) {
      const v = veinDefs[vi], pulse = 0.5 + Math.sin(t * v.speed + v.phase) * 0.35;
      const g = Math.round(40 + pulse * 60);
      ctx.strokeStyle = `rgba(255,${g},0,${0.55+pulse*0.35})`; ctx.lineWidth = 1.5 + pulse * 1.5;
      ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 6 + pulse * 10;
      ctx.beginPath();
      const scrollOffset = cameraX * 0.1;
      for (let x = -10; x <= W + 10; x += 6) {
        const wx = x + scrollOffset, wy = v.y + Math.sin(wx * v.freq + v.phase + t * v.speed) * v.amp;
        x === -10 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();

    const STAL_PARALLAX = 0.2, STAL_TILE = 920;
    const stalDefs = [
      {ox:30,h:40,w:10},{ox:110,h:62,w:16},{ox:200,h:84,w:22},
      {ox:310,h:40,w:14},{ox:390,h:106,w:28},{ox:490,h:62,w:16},
      {ox:590,h:84,w:20},{ox:680,h:40,w:12},{ox:790,h:106,w:26},{ox:880,h:62,w:18},
    ];
    const stalScroll = (cameraX * STAL_PARALLAX) % STAL_TILE;
    for (let tile = -1; tile <= 1; tile++) {
      for (let i = 0; i < stalDefs.length; i++) {
        const sd = stalDefs[i], sx = sd.ox - stalScroll + tile * STAL_TILE;
        if (sx + sd.w < -10 || sx > W + 10) continue;
        ctx.fillStyle = '#1e1008';
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx+sd.w, 0); ctx.lineTo(sx+sd.w/2, sd.h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(255,80,0,${0.3+Math.sin(t*1.5+i)*0.1})`;
        ctx.beginPath(); ctx.arc(sx+sd.w/2, sd.h-4, 3, 0, Math.PI*2); ctx.fill();
      }
    }

    ctx.fillStyle = '#120800';
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let x = 0; x <= W; x += 30) {
      const wx = x + cameraX * 0.2;
      ctx.lineTo(x, 18 + Math.sin(wx * 0.02) * 12 + Math.sin(wx * 0.011) * 8);
    }
    ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
  }
}

export function drawPlatforms() {
  // Hoist timestamp outside the loop — doesn't meaningfully change per-platform
  const t = Date.now() * 0.001;
  for (const p of platforms) {
    const sx = p.x - cameraX;
    if (sx > W + 50 || sx + p.w < -50) continue;

    if (difficultyLevel <= 2) {
      if (p.type === 'ground') {
        const ggrad = ctx.createLinearGradient(sx, p.y, sx, p.y+p.h);
        ggrad.addColorStop(0, '#5a3a1a'); ggrad.addColorStop(0.12, '#4a2e12'); ggrad.addColorStop(1, '#2a1a08');
        ctx.fillStyle = ggrad; ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = '#3a8c2a'; ctx.fillRect(sx, p.y, p.w, 7);
        ctx.fillStyle = '#4aaa35'; ctx.fillRect(sx, p.y, p.w, 3);
        ctx.strokeStyle = '#55bb3a'; ctx.lineWidth = 1.5;
        for (let bx = sx + 4; bx < sx + p.w - 4; bx += 8) {
          ctx.beginPath(); ctx.moveTo(bx, p.y+1); ctx.lineTo(bx-2, p.y-5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx+3, p.y+1); ctx.lineTo(bx+5, p.y-4); ctx.stroke();
        }
      } else {
        const fgrad = ctx.createLinearGradient(sx, p.y, sx, p.y+p.h);
        fgrad.addColorStop(0, '#8b5e2a'); fgrad.addColorStop(1, '#5a3a14');
        ctx.fillStyle = fgrad; ctx.beginPath(); ctx.roundRect(sx, p.y, p.w, p.h, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(40,20,5,0.35)'; ctx.lineWidth = 1;
        for (let gx = sx + 10; gx < sx + p.w - 4; gx += 12) { ctx.beginPath(); ctx.moveTo(gx, p.y+2); ctx.lineTo(gx+2, p.y+p.h-2); ctx.stroke(); }
        ctx.strokeStyle = '#c88c44'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx+3, p.y+1); ctx.lineTo(sx+p.w-3, p.y+1); ctx.stroke();
      }
    } else if (difficultyLevel <= 4) {
      if (p.type === 'ground') {
        const ggrad = ctx.createLinearGradient(sx, p.y, sx, p.y+p.h);
        ggrad.addColorStop(0, '#5a5040'); ggrad.addColorStop(0.1, '#4a4235'); ggrad.addColorStop(1, '#252018');
        ctx.fillStyle = ggrad; ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(20,18,12,0.7)'; ctx.lineWidth = 1;
        for (let fx = sx; fx < sx + p.w; fx += 48) ctx.strokeRect(fx, p.y, 48, 20);
        for (let fx = sx + 24; fx < sx + p.w; fx += 48) ctx.strokeRect(fx, p.y+20, 48, 20);
        ctx.strokeStyle = '#7a6a55'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.moveTo(sx, p.y+1); ctx.lineTo(sx+p.w, p.y+1); ctx.stroke(); ctx.shadowBlur = 0;
      } else {
        const fgrad = ctx.createLinearGradient(sx, p.y, sx, p.y+p.h);
        fgrad.addColorStop(0, '#6a5a48'); fgrad.addColorStop(1, '#38301f');
        ctx.fillStyle = fgrad; ctx.beginPath(); ctx.roundRect(sx, p.y, p.w, p.h, 2); ctx.fill();
        ctx.fillStyle = '#2a2218'; ctx.fillRect(sx, p.y, 10, p.h); ctx.fillRect(sx+p.w-10, p.y, 10, p.h);
        ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 1.5; ctx.strokeRect(sx+1, p.y+1, p.w-2, p.h-2);
        ctx.strokeStyle = '#aa9070'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx+2, p.y+1); ctx.lineTo(sx+p.w-2, p.y+1); ctx.stroke();
      }
    } else {
      if (p.type === 'ground') {
        const ggrad = ctx.createLinearGradient(sx, p.y, sx, p.y+p.h);
        ggrad.addColorStop(0, '#2a1a08'); ggrad.addColorStop(0.08, '#1e1005'); ggrad.addColorStop(1, '#0a0500');
        ctx.fillStyle = ggrad; ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.save(); ctx.strokeStyle = `rgba(255,${60+Math.sin(t*2)*20|0},0,0.8)`; ctx.lineWidth = 1.5; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 6;
        for (let vx = sx + 15; vx < sx + p.w - 10; vx += 55) {
          ctx.beginPath(); ctx.moveTo(vx, p.y+2); ctx.lineTo(vx+8, p.y+12); ctx.lineTo(vx+4, p.y+22); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = `rgba(255,80,0,${0.5+Math.sin(t*1.5)*0.15})`; ctx.lineWidth = 2;
        ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(sx, p.y+1); ctx.lineTo(sx+p.w, p.y+1); ctx.stroke(); ctx.shadowBlur = 0;
      } else {
        const fgrad = ctx.createLinearGradient(sx, p.y, sx, p.y+p.h);
        fgrad.addColorStop(0, '#3a2010'); fgrad.addColorStop(1, '#1a0c04');
        ctx.fillStyle = fgrad; ctx.beginPath(); ctx.roundRect(sx, p.y, p.w, p.h, 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,70,0,${0.55+Math.sin(t*2)*0.2})`; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(80,40,10,0.5)'; ctx.lineWidth = 1;
        for (let rx = sx + 8; rx < sx + p.w - 4; rx += 16) { ctx.beginPath(); ctx.moveTo(rx, p.y+3); ctx.lineTo(rx+5, p.y+p.h-3); ctx.stroke(); }
      }
    }
  }
}

export function drawHazards() {
  const t = Date.now() * 0.001;
  for (const s of spikes) {
    const sx = s.x - cameraX;
    if (sx > W + 50 || sx + s.w < -50) continue;
    if      (difficultyLevel <= 2) { ctx.fillStyle = '#8a7a50'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 4; }
    else if (difficultyLevel <= 4) { ctx.fillStyle = '#5a5a6a'; ctx.shadowColor = '#aaaacc'; ctx.shadowBlur = 5; }
    else                           { ctx.fillStyle = '#1a0a04'; ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 10; }
    for (let i = 0; i < s.w; i += 12) {
      ctx.beginPath(); ctx.moveTo(sx+i, s.y+s.h); ctx.lineTo(sx+i+6, s.y); ctx.lineTo(sx+i+12, s.y+s.h); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  for (const l of lavaZones) {
    const sx = l.x - cameraX;
    if (sx > W + 50 || sx + l.w < -50) continue;
    const lgrad = ctx.createLinearGradient(sx, l.y, sx, l.y+l.h);
    lgrad.addColorStop(0, '#ff6600'); lgrad.addColorStop(0.5, '#ff2200'); lgrad.addColorStop(1, '#880000');
    ctx.fillStyle = lgrad; ctx.fillRect(sx, l.y, l.w, l.h);
    ctx.fillStyle = '#ff8800'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 12;
    for (let i = 0; i < 3; i++) {
      const bx = sx + (i+1) * (l.w / 4), by = l.y + 8 + Math.sin(t * 2 + i) * 5;
      ctx.beginPath(); ctx.arc(bx, by, 5 + Math.sin(t*3+i)*2, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

export function drawCheckpoint() {
  const sx = checkpoint.x - cameraX;
  if (sx > W + 100 || sx < -100) return;
  ctx.strokeStyle = '#888888'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(sx+25, checkpoint.y+checkpoint.h); ctx.lineTo(sx+25, checkpoint.y); ctx.stroke();
  ctx.fillStyle = `hsl(${Date.now()*0.1%360}, 80%, 60%)`;
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.moveTo(sx+25, checkpoint.y); ctx.lineTo(sx+55, checkpoint.y+15); ctx.lineTo(sx+25, checkpoint.y+30); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 11px Share Tech Mono'; ctx.textAlign = 'center';
  ctx.fillText('CHECKPOINT', sx+25, checkpoint.y-8); ctx.textAlign = 'left';
}

export function drawMerchant() {
  const sx = merchant.x - cameraX;
  if (sx > W + 120 || sx < -120) return;
  const t = Date.now() * 0.002;

  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(sx, merchant.y, 8, merchant.h);
  ctx.fillRect(sx + merchant.w - 8, merchant.y, 8, merchant.h);

  const awningGrad = ctx.createLinearGradient(sx, merchant.y - 18, sx, merchant.y);
  awningGrad.addColorStop(0, '#cc3311'); awningGrad.addColorStop(1, '#881100');
  ctx.fillStyle = awningGrad;
  ctx.beginPath(); ctx.moveTo(sx-6, merchant.y); ctx.lineTo(sx+merchant.w+6, merchant.y); ctx.lineTo(sx+merchant.w, merchant.y-18); ctx.lineTo(sx, merchant.y-18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ff6633'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const ax = sx + 4 + i * (merchant.w / 3.5);
    ctx.beginPath(); ctx.moveTo(ax, merchant.y-18); ctx.lineTo(ax-4, merchant.y); ctx.stroke();
  }

  ctx.fillStyle = '#7a5230'; ctx.fillRect(sx+4, merchant.y+merchant.h-18, merchant.w-8, 10);
  ctx.fillStyle = '#9a7250'; ctx.fillRect(sx+4, merchant.y+merchant.h-20, merchant.w-8, 4);

  const items = ['#ff4466','#44aaff','#ffcc00'];
  for (let i = 0; i < 3; i++) {
    const ix = sx + 14 + i * 22, iy = merchant.y + merchant.h - 30;
    ctx.fillStyle = items[i]; ctx.shadowColor = items[i]; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.roundRect(ix, iy, 10, 12, 2); ctx.fill();
    ctx.fillStyle = '#ffffff44'; ctx.fillRect(ix+2, iy+2, 3, 4); ctx.shadowBlur = 0;
  }

  const pulse = 0.7 + Math.sin(t * 3) * 0.3;
  ctx.fillStyle = `rgba(255,220,80,${pulse})`; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 12 * pulse;
  ctx.font = 'bold 9px Share Tech Mono'; ctx.textAlign = 'center';
  ctx.fillText('[ SHOP ]', sx + merchant.w / 2, merchant.y - 24); ctx.textAlign = 'left'; ctx.shadowBlur = 0;
}

export function drawBuffIcons() {
  if (player.dead) return;

  const ICON_SIZE = 36;
  const GAP       = 4;
  const MARGIN    = 10;

  const active = [];
  if (player.speedBoostTimer > 0)  active.push({ type: 'speed',    timer: player.speedBoostTimer,  timerMax: player.speedBoostTimerMax  || 1 });
  if (player.attackSpeedTimer > 0) active.push({ type: 'atkspeed', timer: player.attackSpeedTimer, timerMax: player.attackSpeedTimerMax || 1 });
  if (player.fortified)            active.push({ type: 'fortify',  timer: null });
  if (player.damageMult > 1)       active.push({ type: 'berserk',  timer: null });
  if (player.revive)               active.push({ type: 'revive',   timer: null });

  if (active.length === 0) return;

  const COLORS = {
    speed:    '#00ff88',
    atkspeed: '#ffcc00',
    fortify:  '#4488ff',
    berserk:  '#ff3322',
    revive:   '#cc88ff',
  };

  ctx.save();

  for (let i = 0; i < active.length; i++) {
    const { type, timer } = active[i];
    const ix    = MARGIN + i * (ICON_SIZE + GAP);
    const iy    = MARGIN;
    const color = COLORS[type];
    const cx    = ix + ICON_SIZE / 2;
    const cy    = iy + ICON_SIZE / 2;

    // Dark background
    ctx.globalAlpha = 0.80;
    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.roundRect(ix, iy, ICON_SIZE, ICON_SIZE, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Colored border glow
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.roundRect(ix, iy, ICON_SIZE, ICON_SIZE, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Clip icon art to the icon square
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ix, iy, ICON_SIZE, ICON_SIZE, 4);
    ctx.clip();

    if (type === 'speed') {
      // Boot silhouette facing right with trailing motion lines
      ctx.fillStyle   = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 4;
      ctx.fillRect(cx - 3, cy - 12, 7, 11);       // shin
      ctx.fillRect(cx - 5, cy - 1,  14, 6);        // foot sole
      ctx.beginPath();                              // rounded toe
      ctx.arc(cx + 9, cy + 2, 3.5, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Trailing motion lines to the left
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(cx - 14, cy - 6); ctx.lineTo(cx - 7, cy - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 14, cy - 3); ctx.lineTo(cx - 6, cy - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 13, cy    ); ctx.lineTo(cx - 5, cy    ); ctx.stroke();
      ctx.globalAlpha = 1;

    } else if (type === 'atkspeed') {
      // Diagonal sword + sweep arc lines
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle   = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(2.5, 8); ctx.lineTo(-2.5, 8); ctx.closePath(); // blade
      ctx.fill();
      ctx.fillRect(-7, 6, 14, 3);                  // crossguard
      ctx.fillStyle  = '#aa8833';
      ctx.shadowBlur = 0;
      ctx.fillRect(-2, 9, 4, 6);                   // handle
      ctx.restore();
      // Sweep arc (motion implied)
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, 14, -Math.PI * 0.85, -Math.PI * 0.1); ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.lineWidth   = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, 10, -Math.PI * 0.75, -Math.PI * 0.15); ctx.stroke();
      ctx.globalAlpha = 1;

    } else if (type === 'fortify') {
      // Kite shield with cross emblem
      ctx.lineWidth   = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 5;
      // Filled shield body (translucent)
      ctx.fillStyle   = color;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 10, cy - 7); ctx.lineTo(cx + 10, cy + 3);
      ctx.bezierCurveTo(cx + 10, cy + 11, cx, cy + 15, cx, cy + 15);
      ctx.bezierCurveTo(cx - 10, cy + 15, cx - 10, cy + 11, cx - 10, cy + 3);
      ctx.lineTo(cx - 10, cy - 7); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      // Shield outline
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 10, cy - 7); ctx.lineTo(cx + 10, cy + 3);
      ctx.bezierCurveTo(cx + 10, cy + 11, cx, cy + 15, cx, cy + 15);
      ctx.bezierCurveTo(cx - 10, cy + 15, cx - 10, cy + 11, cx - 10, cy + 3);
      ctx.lineTo(cx - 10, cy - 7); ctx.closePath(); ctx.stroke();
      ctx.shadowBlur  = 0;
      // Cross emblem
      ctx.fillStyle = color;
      ctx.fillRect(cx - 1, cy - 7, 2, 12);
      ctx.fillRect(cx - 5, cy - 1, 10, 2);

    } else if (type === 'berserk') {
      // Two crossed slash lines
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8;
      ctx.beginPath(); ctx.moveTo(cx - 11, cy - 11); ctx.lineTo(cx + 11, cy + 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 11, cy - 11); ctx.lineTo(cx - 11, cy + 11); ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (type === 'revive') {
      // Floating soul: halo above + glowing orb + wispy tail
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 7, 2.5, 0, 0, Math.PI * 2); // halo
      ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
      ctx.beginPath(); ctx.arc(cx, cy - 1, 6, 0, Math.PI * 2); ctx.fill(); // orb
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 5);
      ctx.bezierCurveTo(cx - 4, cy + 9, cx + 4, cy + 12, cx, cy + 15); // wispy tail
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // end clip

    // Timer countdown text (timed buffs only)
    if (timer !== null) {
      const secs = Math.ceil(timer / 60);
      ctx.font        = 'bold 9px "Share Tech Mono", monospace';
      ctx.textAlign   = 'right';
      ctx.fillStyle   = '#ffffff';
      ctx.globalAlpha = 0.88;
      ctx.fillText(`${secs}s`, ix + ICON_SIZE - 3, iy + ICON_SIZE - 3);
      ctx.globalAlpha = 1;
      ctx.textAlign   = 'left';

      // Duration drain bar below the icon
      const pct  = Math.max(0, timer / active[i].timerMax);
      const BAR_H = 4;
      const barY  = iy + ICON_SIZE + 3;
      ctx.fillStyle = '#111122';
      ctx.fillRect(ix, barY, ICON_SIZE, BAR_H);
      ctx.fillStyle   = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 4;
      ctx.fillRect(ix, barY, Math.round(ICON_SIZE * pct), BAR_H);
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
}

export function drawDebugStats() {
  const isSword = player.weapon === 'sword';
  const isStaff = player.weapon === 'staff';

  // currMovSpd: base speed * speed boost multiplier
  const currMovSpd = PLAYER_SPEED * (player.speedBoostTimer > 0 ? 1.25 : 1);

  // currAttSpd: attacks per second. Timers decrement at 16 units/frame × 60fps = 960 units/sec.
  // Attack speed buff reduces the reset cooldown by ×0.8, so effective rate is ×1.25.
  const baseCooldown = isSword ? SWORD_COOLDOWN : isStaff ? STAFF_ORB_COOLDOWN : ARROW_COOLDOWN;
  const effectiveCooldown = player.attackSpeedTimer > 0 ? baseCooldown * 0.8 : baseCooldown;
  const currAttSpd = 960 / effectiveCooldown;

  // currWepDmg: rarity-scaled base damage × damage multiplier
  const baseDmg = isSword ? BASE_SWORD_DAMAGE : isStaff ? BASE_FIREBALL_DAMAGE : BASE_ARROW_DAMAGE;
  const rarity   = isSword ? player.swordRarity : isStaff ? player.staffRarity : player.bowRarity;
  const currWepDmg = Math.round(rarityDamage(baseDmg, rarity) * player.damageMult);

  const panelW = 178, panelH = 76, panelX = W - panelW - 8, panelY = 8;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#080c12';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#00ff4466';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.font = 'bold 9px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00ff44';
  ctx.textAlign = 'left';
  ctx.fillText('— DEBUG STATS —', panelX + 8, panelY + 15);

  ctx.font = '9px "Share Tech Mono", monospace';
  ctx.fillStyle = '#aaffcc';
  ctx.fillText(`ATK SPD  : ${currAttSpd.toFixed(2)} atk/s`, panelX + 8, panelY + 33);
  ctx.fillText(`MOV SPD  : ${currMovSpd.toFixed(4)}`,        panelX + 8, panelY + 49);
  ctx.fillText(`WEP DMG  : ${currWepDmg}`,                   panelX + 8, panelY + 65);

  ctx.restore();
}

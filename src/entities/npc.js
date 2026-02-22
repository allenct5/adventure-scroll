// npc.js — Static NPC definitions and drawing.

import { W } from '../core/constants.js';
import { merchant } from '../scenes/level.js';
import { cameraX } from '../core/state.js';
import { ctx } from '../canvas.js';

export const npcMerlin = {w: 28, h: 44};

export const NPC_DISPLAY_NAMES = {
  npcMerlin: 'Magnificent Merlin',
};

export function drawNpcMerlin() {
  const nw = npcMerlin.w, nh = npcMerlin.h;
  const msx = merchant.x - cameraX;
  if (msx > W + 60 || msx < -60) return;
  // Centered horizontally behind the stall; feet aligned to the counter top
  const sx = msx + (merchant.w - nw) / 2;
  const sy = merchant.y - nh;

  ctx.save();
  ctx.translate(sx, sy);

  // --- ROBE ---
  const robeGrad = ctx.createLinearGradient(0, 10, 0, nh);
  robeGrad.addColorStop(0, '#2244aa'); robeGrad.addColorStop(0.5, '#1a3388'); robeGrad.addColorStop(1, '#0d1f55');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(2, 12); ctx.lineTo(nw - 2, 12); ctx.lineTo(nw + 2, nh); ctx.lineTo(-2, nh);
  ctx.closePath(); ctx.fill();

  // Robe highlight / fold
  ctx.fillStyle = 'rgba(100,140,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(nw / 2 - 2, 14); ctx.lineTo(nw / 2 + 2, 14); ctx.lineTo(nw / 2 + 4, nh); ctx.lineTo(nw / 2 - 4, nh);
  ctx.closePath(); ctx.fill();

  // Robe hem trim
  ctx.fillStyle = '#aabbff';
  ctx.fillRect(-2, nh - 5, nw + 4, 3);

  // Belt / sash
  ctx.fillStyle = '#ccaa44'; ctx.fillRect(3, nh * 0.52, nw - 6, 5);
  ctx.fillStyle = '#ffdd88'; ctx.fillRect(nw / 2 - 3, nh * 0.52, 6, 5);

  // Sleeves
  ctx.fillStyle = '#1a3388';
  ctx.fillRect(0, 14, 5, 18); ctx.fillRect(nw - 5, 14, 5, 18);
  // Sleeve cuffs
  ctx.fillStyle = '#aabbff';
  ctx.fillRect(-1, 30, 6, 3); ctx.fillRect(nw - 5, 30, 6, 3);

  // --- FACE ---
  ctx.fillStyle = '#ffddbb';
  ctx.fillRect(6, 2, nw - 12, 12);

  // Eyes
  ctx.fillStyle = '#ffffff'; ctx.fillRect(nw / 2 - 5, 6, 4, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(nw / 2 + 1, 6, 4, 3);
  ctx.fillStyle = '#4466ff'; ctx.fillRect(nw / 2 - 4, 7, 2, 2);
  ctx.fillStyle = '#4466ff'; ctx.fillRect(nw / 2 + 2, 7, 2, 2);

  // Eyebrows — bushy white
  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(nw / 2 - 6, 5, 5, 2); ctx.fillRect(nw / 2 + 1, 5, 5, 2);

  // --- BEARD ---
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.moveTo(6, 13); ctx.lineTo(nw - 6, 13); ctx.lineTo(nw - 2, 26);
  ctx.quadraticCurveTo(nw / 2, 32, 2, 26);
  ctx.closePath(); ctx.fill();
  // Beard highlight streaks
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(nw / 2 - 2, 14, 2, 10); ctx.fillRect(nw / 2 + 3, 15, 1, 8); ctx.fillRect(nw / 2 - 6, 15, 1, 7);
  // Moustache
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(nw / 2 - 4, 12, 8, 2);

  // --- WIZARD HAT ---
  // Brim
  ctx.fillStyle = '#1a2266';
  ctx.beginPath();
  ctx.ellipse(nw / 2, 2, nw / 2 + 1, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4455cc'; ctx.lineWidth = 1; ctx.stroke();

  // Cone
  const hatGrad = ctx.createLinearGradient(4, -28, nw - 4, 2);
  hatGrad.addColorStop(0, '#2233aa'); hatGrad.addColorStop(1, '#111644');
  ctx.fillStyle = hatGrad;
  ctx.beginPath();
  ctx.moveTo(3, 2); ctx.lineTo(nw - 3, 2); ctx.lineTo(nw / 2 + 3, -28); ctx.lineTo(nw / 2 - 1, -28);
  ctx.closePath(); ctx.fill();

  // Hat band
  ctx.fillStyle = '#ccaa44';
  ctx.fillRect(4, -2, nw - 8, 3);

  // Star on hat
  ctx.fillStyle = '#ffdd44'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 4;
  const starX = nw / 2 + 1, starY = -14, starR = 3.5;
  ctx.beginPath();
  for (let pt = 0; pt < 10; pt++) {
    const a   = (pt / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = pt % 2 === 0 ? starR : starR * 0.42;
    pt === 0 ? ctx.moveTo(starX + Math.cos(a) * rad, starY + Math.sin(a) * rad)
             : ctx.lineTo(starX + Math.cos(a) * rad, starY + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();

  // Name label
  const namePulse = 0.75 + Math.sin(Date.now() * 0.004) * 0.25;
  ctx.fillStyle = `rgba(255,220,80,${namePulse})`; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8 * namePulse;
  ctx.font = 'bold 9px Share Tech Mono'; ctx.textAlign = 'center';
  ctx.fillText(NPC_DISPLAY_NAMES.npcMerlin, sx + nw / 2, sy - 38);
  ctx.textAlign = 'left'; ctx.shadowBlur = 0;
}

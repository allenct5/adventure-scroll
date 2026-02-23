// npc.js — Static NPC definitions and drawing.

import { W } from '../core/constants.js';
import { merchant } from '../scenes/level.js';
import { cameraX } from '../core/state.js';
import { ctx } from '../canvas.js';
import { getSprite } from '../utils/sprites.js';

export const npcMerlin = {w: 28, h: 44, showName: false};
export const npcTaliesin = {w: 28, h: 44, showName: false};

export const NPC_DISPLAY_NAMES = {
  npcMerlin: 'Magnificent Merlin',
  npcTaliesin: 'Taliesin, Bard of Legend',
};

export function drawNpcMerlin() {
  const nw = npcMerlin.w, nh = npcMerlin.h;
  const msx = merchant.x - cameraX;
  if (msx > W + 60 || msx < -60) return;
  // Centered horizontally behind the stall; feet aligned to the platform surface
  const sx = msx + (merchant.w - nw) / 2;
  const sy = merchant.y + merchant.h - nh;

  ctx.save();
  ctx.translate(sx, sy);

  const _merlinSprite = getSprite('npc_merlin');
  if (_merlinSprite) {
    ctx.drawImage(_merlinSprite, 0, 0, nw, nh);
  } else {
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
  } // end sprite else

  ctx.restore();

  // Name label
  if (npcMerlin.showName) {
    const namePulse = 0.75 + Math.sin(Date.now() * 0.004) * 0.25;
    ctx.fillStyle = `rgba(255,220,80,${namePulse})`; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8 * namePulse;
    ctx.font = 'bold 9px Share Tech Mono'; ctx.textAlign = 'center';
    ctx.fillText(NPC_DISPLAY_NAMES.npcMerlin, sx + nw / 2, sy - 38);
    ctx.textAlign = 'left'; ctx.shadowBlur = 0;
  }
}

export function drawNpcTaliesin() {
  const nw = npcTaliesin.w, nh = npcTaliesin.h;
  const msx = merchant.x - cameraX;
  if (msx > W + 60 || msx < -60) return;
  // Centered horizontally behind the stall; feet aligned to the platform surface
  const sx = msx + (merchant.w - nw) / 2;
  const sy = merchant.y + merchant.h - nh;

  ctx.save();
  ctx.translate(sx, sy);

  const _taliesiSprite = getSprite('npc_taliesin');
  if (_taliesiSprite) {
    ctx.drawImage(_taliesiSprite, 0, 0, nw, nh);
  } else {
  // --- SHOES (Brown) ---
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(2, nh - 5, nw - 4, 5);
  ctx.fillStyle = '#8b5a00';
  ctx.fillRect(2, nh - 4, 3, 2);
  ctx.fillRect(nw - 5, nh - 4, 3, 2);

  // --- PANTS (Yellow) ---
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath();
  ctx.moveTo(2, nh - 9);
  ctx.lineTo(nw - 2, nh - 9);
  ctx.lineTo(nw - 1, nh - 5);
  ctx.lineTo(1, nh - 5);
  ctx.closePath();
  ctx.fill();
  // Pants folds
  ctx.fillStyle = '#ddbb22';
  ctx.fillRect(nw / 2 - 2, nh - 8, 1, 3);
  ctx.fillRect(nw / 2 + 1, nh - 7, 1, 2);

  // --- DOUBLET (Purple) ---
  ctx.fillStyle = '#7733bb';
  ctx.beginPath();
  ctx.moveTo(2, 18);
  ctx.lineTo(nw - 2, 18);
  ctx.lineTo(nw - 1, nh - 9);
  ctx.lineTo(1, nh - 9);
  ctx.closePath();
  ctx.fill();
  // Doublet highlights
  ctx.fillStyle = '#aa55ff';
  ctx.fillRect(nw / 2 - 3, 20, 6, 8);
  // Doublet buttons
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(nw / 2 - 1, 24, 2, 2);
  ctx.fillRect(nw / 2 - 1, 30, 2, 2);
  ctx.fillRect(nw / 2 - 1, 36, 2, 2);

  // --- CLOAK (Green) ---
  ctx.fillStyle = '#228844';
  // Left side of cloak
  ctx.beginPath();
  ctx.moveTo(1, 16);
  ctx.lineTo(8, 14);
  ctx.lineTo(8, nh - 9);
  ctx.lineTo(1, nh - 8);
  ctx.closePath();
  ctx.fill();
  // Right side of cloak
  ctx.beginPath();
  ctx.moveTo(nw - 1, 16);
  ctx.lineTo(nw - 8, 14);
  ctx.lineTo(nw - 8, nh - 9);
  ctx.lineTo(nw - 1, nh - 8);
  ctx.closePath();
  ctx.fill();
  // Cloak folds
  ctx.fillStyle = '#1a6b33';
  ctx.fillRect(3, 16, 2, nh - 25);
  ctx.fillRect(nw - 5, 16, 2, nh - 25);

  // --- ARMS (Purple sleeves beneath cloak) ---
  ctx.fillStyle = '#6633aa';
  ctx.fillRect(0, 20, 3, 16);
  ctx.fillRect(nw - 3, 20, 3, 16);

  // --- NECK ---
  ctx.fillStyle = '#ffddbb';
  ctx.fillRect(nw / 2 - 2, 13, 4, 4);

  // --- FACE ---
  ctx.fillStyle = '#ffddbb';
  ctx.fillRect(5, 2, nw - 10, 12);

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(nw / 2 - 5, 6, 3, 3);
  ctx.fillRect(nw / 2 + 2, 6, 3, 3);
  ctx.fillStyle = '#2a5a2a';
  ctx.fillRect(nw / 2 - 4, 7, 2, 2);
  ctx.fillRect(nw / 2 + 3, 7, 2, 2);

  // Eyebrows
  ctx.fillStyle = '#8b6f47';
  ctx.fillRect(nw / 2 - 5, 5, 3, 1);
  ctx.fillRect(nw / 2 + 2, 5, 3, 1);

  // Mouth - charming smile
  ctx.fillStyle = '#dd8844';
  ctx.beginPath();
  ctx.arc(nw / 2, 11, 2, 0, Math.PI, true);
  ctx.fill();

  // --- FEATHERED GREEN CAP ---
  // Cap base
  ctx.fillStyle = '#1a8844';
  ctx.beginPath();
  ctx.ellipse(nw / 2, 2, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0a6633'; ctx.lineWidth = 1; ctx.stroke();

  // Cap feathers
  ctx.fillStyle = '#22aa55';
  // Left feather
  ctx.beginPath();
  ctx.moveTo(nw / 2 - 5, 1);
  ctx.quadraticCurveTo(nw / 2 - 8, -6, nw / 2 - 6, -12);
  ctx.lineTo(nw / 2 - 5, -10);
  ctx.quadraticCurveTo(nw / 2 - 7, -5, nw / 2 - 4, 1);
  ctx.closePath();
  ctx.fill();
  // Center feather
  ctx.fillStyle = '#1a8844';
  ctx.beginPath();
  ctx.moveTo(nw / 2, 0);
  ctx.quadraticCurveTo(nw / 2 + 1, -8, nw / 2, -14);
  ctx.lineTo(nw / 2 + 1, -13);
  ctx.quadraticCurveTo(nw / 2, -8, nw / 2 + 1, 0);
  ctx.closePath();
  ctx.fill();
  // Right feather
  ctx.fillStyle = '#22aa55';
  ctx.beginPath();
  ctx.moveTo(nw / 2 + 5, 1);
  ctx.quadraticCurveTo(nw / 2 + 8, -6, nw / 2 + 6, -12);
  ctx.lineTo(nw / 2 + 5, -10);
  ctx.quadraticCurveTo(nw / 2 + 7, -5, nw / 2 + 4, 1);
  ctx.closePath();
  ctx.fill();

  // --- LUTE (Wooden Brown, held in hands) ---
  // Lute body (right side)
  ctx.fillStyle = '#8b6f47';
  ctx.beginPath();
  ctx.ellipse(nw - 7, nh / 2, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6b5437'; ctx.lineWidth = 1; ctx.stroke();
  // Lute neck
  ctx.fillStyle = '#a0826d';
  ctx.fillRect(nw - 10, 22, 3, 14);
  // Lute headstock
  ctx.fillStyle = '#8b6f47';
  ctx.beginPath();
  ctx.moveTo(nw - 10, 20);
  ctx.lineTo(nw - 7, 17);
  ctx.lineTo(nw - 6, 20);
  ctx.closePath();
  ctx.fill();
  // Lute strings
  ctx.strokeStyle = '#ffdd88'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const offset = -3 + i * 2;
    ctx.beginPath();
    ctx.moveTo(nw - 7 + offset, 20);
    ctx.lineTo(nw - 8 + offset, nh / 2 - 1);
    ctx.stroke();
  }
  // Right hand
  ctx.fillStyle = '#ffddbb';
  ctx.beginPath();
  ctx.ellipse(nw - 11, 32, 2, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();

  } // end sprite else

  ctx.restore();

  // Name label
  if (npcTaliesin.showName) {
    const namePulse = 0.75 + Math.sin(Date.now() * 0.004) * 0.25;
    ctx.fillStyle = `rgba(200,150,255,${namePulse})`; ctx.shadowColor = '#bb88ff'; ctx.shadowBlur = 8 * namePulse;
    ctx.font = 'bold 9px Share Tech Mono'; ctx.textAlign = 'center';
    ctx.fillText(NPC_DISPLAY_NAMES.npcTaliesin, sx + nw / 2, sy - 38);
    ctx.textAlign = 'left'; ctx.shadowBlur = 0;
  }
}

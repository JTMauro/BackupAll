// Valley Casino — "link" family slot machines: Thunderbolt Link: Pirate's Plunder, Big Bad Breeze, Drum of Fortune.
// Same look and controls as games/slots.js (that engine is not exported, so the parts needed are adapted here).
// Everything is drawn procedurally. The math layer below is pure: one call plans a whole spin, features included,
// so the screen only reveals an outcome that is already settled (and leaving mid-feature pays what is owed).
import * as K from './_kit.js';

const TAU = Math.PI * 2;
const FD = '"Bungee", Impact, "Arial Black", sans-serif';
const FS = 'Georgia, "Times New Roman", serif';

// =====================================================================================================
// Painting helpers (symbols are drawn in a 100x100 box)
// =====================================================================================================
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function lin(c, x0, y0, x1, y1, st) { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rad(c, x0, y0, r0, x1, y1, r1, st) { const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function text(c, s, x, y, size, { font = FD, fill = '#fff', stroke = null, sw = 0, weight = '' } = {}) {
  c.font = `${weight} ${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (stroke) { c.lineWidth = sw; c.strokeStyle = stroke; c.strokeText(s, x, y); }
  c.fillStyle = fill; c.fillText(s, x, y);
}
const GOLD = [[0, '#fff3b0'], [.3, '#f7c948'], [.6, '#b07a12'], [.85, '#f3d36b'], [1, '#8a5a00']];
const gold = (c, y0 = 0, y1 = 100) => lin(c, 0, y0, 0, y1, GOLD);
function sparkle(c, x, y, r, col = '#fff') {
  c.save(); c.fillStyle = col; c.globalAlpha = .9; c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); c.restore();
}
function disc(c, a, b, ring = null, r = 45) {
  c.beginPath(); c.arc(50, 50, r, 0, TAU); c.fillStyle = rad(c, 42, 36, 4, 50, 50, r + 2, [[0, a], [1, b]]); c.fill();
  if (ring) { c.lineWidth = 3.5; c.strokeStyle = ring === 'gold' ? gold(c) : ring; c.stroke(); }
}
function royal(c, ch, a, b, edge, ink = '#140a00') {
  const size = ch.length > 1 ? 50 : 66, y = 54;
  c.font = `bold ${size}px ${FS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 10; c.strokeStyle = ink; c.strokeText(ch, 50, y);
  c.lineWidth = 4.5; c.strokeStyle = edge; c.strokeText(ch, 50, y);
  c.fillStyle = lin(c, 0, y - size * .45, 0, y + size * .45, [[0, a], [1, b]]); c.fillText(ch, 50, y);
  c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .35; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(46, y - size * .25, size * .32, size * .1, -.2, 0, TAU); c.fill(); c.restore();
}

// ---------------------------------------------------------------- Pirate's Plunder
function pCaptain(c) {
  disc(c, '#2fd8c8', '#062236', 'gold');
  c.save(); c.beginPath(); c.arc(50, 50, 43, 0, TAU); c.clip();
  c.beginPath(); c.moveTo(10, 100); c.quadraticCurveTo(16, 74, 50, 72); c.quadraticCurveTo(84, 74, 90, 100); c.closePath(); c.fillStyle = lin(c, 0, 72, 0, 100, [[0, '#d0182a'], [1, '#5a0610']]); c.fill();
  c.strokeStyle = '#f7c948'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(36, 76); c.lineTo(44, 100); c.moveTo(64, 76); c.lineTo(56, 100); c.stroke();
  c.beginPath(); c.ellipse(50, 54, 18, 21, 0, 0, TAU); c.fillStyle = rad(c, 45, 46, 2, 50, 54, 22, [[0, '#ffdcbc'], [1, '#c98a5e']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#5a2a10'; c.stroke();
  c.fillStyle = '#2a1608';
  c.beginPath(); c.moveTo(32, 54); c.quadraticCurveTo(33, 84, 50, 88); c.quadraticCurveTo(67, 84, 68, 54); c.quadraticCurveTo(63, 70, 50, 69); c.quadraticCurveTo(37, 70, 32, 54); c.fill();
  c.beginPath(); c.moveTo(50, 63); c.quadraticCurveTo(39, 57, 31, 65); c.quadraticCurveTo(41, 62, 50, 66.5); c.quadraticCurveTo(59, 62, 69, 65); c.quadraticCurveTo(61, 57, 50, 63); c.fill();
  c.beginPath(); c.arc(57.5, 50, 2.8, 0, TAU); c.fillStyle = '#111'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(58.3, 49.2, .9, 0, TAU); c.fill();
  c.strokeStyle = '#2a1608'; c.lineWidth = 2; c.beginPath(); c.moveTo(53, 45); c.quadraticCurveTo(58, 42.5, 63, 45); c.stroke();
  c.strokeStyle = '#111'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(31, 41); c.lineTo(69, 58); c.stroke();
  c.beginPath(); c.ellipse(42.5, 50, 6.2, 5.2, .3, 0, TAU); c.fillStyle = '#111'; c.fill();
  c.strokeStyle = '#8a4a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(50, 50); c.quadraticCurveTo(47, 57, 51, 58); c.stroke();
  const hat = () => { c.beginPath(); c.moveTo(8, 42); c.quadraticCurveTo(28, 30, 50, 35); c.quadraticCurveTo(72, 30, 92, 42); c.quadraticCurveTo(84, 12, 50, 9); c.quadraticCurveTo(16, 12, 8, 42); c.closePath(); };
  hat(); c.fillStyle = lin(c, 0, 9, 0, 42, [[0, '#3a3a44'], [1, '#0b0b10']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#000'; c.stroke();
  c.strokeStyle = '#f7c948'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(10, 41); c.quadraticCurveTo(28, 29, 50, 34); c.quadraticCurveTo(72, 29, 90, 41); c.stroke();
  c.strokeStyle = '#e8303a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(70, 26); c.bezierCurveTo(80, 14, 90, 14, 96, 6); c.stroke();
  c.fillStyle = '#f4f1e6'; c.beginPath(); c.arc(50, 20, 5.2, 0, TAU); c.fill(); c.fillRect(47.2, 23, 5.6, 4);
  c.fillStyle = '#111'; c.beginPath(); c.arc(48, 20, 1.3, 0, TAU); c.arc(52, 20, 1.3, 0, TAU); c.fill();
  c.strokeStyle = '#f4f1e6'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(41, 24); c.lineTo(59, 31); c.moveTo(59, 24); c.lineTo(41, 31); c.stroke();
  c.restore();
}
function pParrot(c) {
  disc(c, '#1f6a8a', '#041a2a', '#2ad4c4');
  c.save(); c.beginPath(); c.arc(50, 50, 43, 0, TAU); c.clip();
  c.fillStyle = '#5a3a1a'; rr(c, 6, 82, 88, 7, 3); c.fill();
  c.beginPath(); c.moveTo(34, 70); c.quadraticCurveTo(22, 88, 16, 100); c.lineTo(30, 100); c.quadraticCurveTo(36, 86, 44, 76); c.closePath(); c.fillStyle = lin(c, 0, 70, 0, 100, [[0, '#2a7ae8'], [1, '#0a2a8a']]); c.fill();
  c.beginPath(); c.ellipse(48, 58, 17, 25, -.25, 0, TAU); c.fillStyle = rad(c, 44, 48, 3, 48, 58, 26, [[0, '#ff6a5a'], [1, '#a00818']]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#4a0006'; c.stroke();
  c.beginPath(); c.moveTo(40, 50); c.quadraticCurveTo(26, 64, 34, 84); c.quadraticCurveTo(46, 74, 52, 56); c.closePath(); c.fillStyle = lin(c, 30, 50, 50, 84, [[0, '#f7d23a'], [.4, '#2fb84a'], [1, '#1a5ad8']]); c.fill(); c.stroke();
  c.beginPath(); c.arc(56, 32, 15, 0, TAU); c.fillStyle = rad(c, 52, 26, 2, 56, 32, 16, [[0, '#ff8a6a'], [1, '#c4101e']]); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(60, 31, 6.5, 5.5, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(61, 31, 2.6, 0, TAU); c.fillStyle = '#111'; c.fill();
  c.beginPath(); c.moveTo(67, 26); c.quadraticCurveTo(86, 24, 82, 44); c.quadraticCurveTo(78, 38, 70, 40); c.closePath(); c.fillStyle = lin(c, 67, 26, 82, 44, [[0, '#f2e6c8'], [1, '#5a4a3a']]); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#2a1a0a'; c.stroke();
  c.beginPath(); c.moveTo(68, 38); c.quadraticCurveTo(74, 46, 70, 46); c.quadraticCurveTo(66, 44, 67, 39); c.fillStyle = '#3a2a1a'; c.fill();
  c.restore();
}
function cutlass(c) {
  c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(30, -10, 58, -2); c.quadraticCurveTo(46, 4, 0, 4); c.closePath();
  c.fillStyle = lin(c, 0, -8, 0, 4, [[0, '#ffffff'], [.5, '#b8c4cc'], [1, '#5a6a74']]); c.fill(); c.lineWidth = 1.3; c.strokeStyle = '#1a2a34'; c.stroke();
  c.beginPath(); c.arc(-4, 0, 9, -1.9, 1.9); c.lineWidth = 3; c.strokeStyle = gold(c, -10, 10); c.stroke();
  rr(c, -20, -3, 16, 6, 3); c.fillStyle = '#5a2a10'; c.fill(); c.beginPath(); c.arc(-21, 0, 3.5, 0, TAU); c.fillStyle = '#f7c948'; c.fill();
}
function pSwords(c) {
  disc(c, '#7a2a1a', '#1a0604', '#f7c948');
  c.save(); c.translate(50, 54); c.rotate(-.75); c.translate(-18, 0); cutlass(c); c.restore();
  c.save(); c.translate(50, 54); c.scale(-1, 1); c.rotate(-.75); c.translate(-18, 0); cutlass(c); c.restore();
  sparkle(c, 30, 26, 6);
}
function pCompass(c) {
  c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.fillStyle = lin(c, 6, 6, 94, 94, [[0, '#ffe6a0'], [.45, '#b8862a'], [1, '#5a3a08']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#2a1a04'; c.stroke();
  c.beginPath(); c.arc(50, 50, 35, 0, TAU); c.fillStyle = rad(c, 44, 40, 3, 50, 50, 36, [[0, '#fff8e0'], [1, '#d8c49a']]); c.fill(); c.lineWidth = 1.5; c.stroke();
  c.strokeStyle = 'rgba(60,40,10,.5)'; c.lineWidth = 1; for (let k = 0; k < 16; k++) { const a = k * TAU / 16; c.beginPath(); c.moveTo(50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30); c.lineTo(50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34); c.stroke(); }
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 - Math.PI / 2, L = k % 2 ? 18 : 29, w = k % 2 ? 4 : 6;
    c.beginPath(); c.moveTo(50 + Math.cos(a) * L, 50 + Math.sin(a) * L); c.lineTo(50 + Math.cos(a + 1.57) * w, 50 + Math.sin(a + 1.57) * w); c.lineTo(50, 50); c.closePath(); c.fillStyle = k === 0 ? '#d0182a' : k % 2 ? '#0d5a6a' : '#1a2a4a'; c.fill();
    c.beginPath(); c.moveTo(50 + Math.cos(a) * L, 50 + Math.sin(a) * L); c.lineTo(50 + Math.cos(a - 1.57) * w, 50 + Math.sin(a - 1.57) * w); c.lineTo(50, 50); c.closePath(); c.fillStyle = k === 0 ? '#ff6a6a' : k % 2 ? '#2ad4c4' : '#4a6a9a'; c.fill();
  }
  c.beginPath(); c.arc(50, 50, 3.5, 0, TAU); c.fillStyle = gold(c, 46, 54); c.fill();
  text(c, 'N', 50, 11, 9, { fill: '#2a1a04' });
}
function pMap(c) {
  c.save(); c.translate(50, 48); c.rotate(-.06); c.translate(-50, -48);
  rr(c, 10, 14, 80, 62, 4); c.fillStyle = lin(c, 10, 14, 90, 76, [[0, '#f6e6b8'], [.5, '#e2c88a'], [1, '#b8945a']]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#5a3a14'; c.stroke();
  for (const x of [10, 90]) { c.beginPath(); c.ellipse(x, 45, 5, 33, 0, 0, TAU); c.fillStyle = lin(c, x - 5, 0, x + 5, 0, [[0, '#8a6a34'], [.5, '#f6e6b8'], [1, '#8a6a34']]); c.fill(); c.stroke(); }
  c.fillStyle = '#4aa86a'; c.beginPath(); c.moveTo(22, 40); c.quadraticCurveTo(30, 24, 46, 30); c.quadraticCurveTo(54, 42, 40, 48); c.quadraticCurveTo(24, 52, 22, 40); c.fill();
  c.beginPath(); c.moveTo(60, 54); c.quadraticCurveTo(70, 44, 80, 54); c.quadraticCurveTo(76, 66, 64, 64); c.closePath(); c.fill();
  c.setLineDash([3, 3]); c.strokeStyle = '#a0141e'; c.lineWidth = 2; c.beginPath(); c.moveTo(34, 38); c.bezierCurveTo(46, 60, 54, 30, 68, 56); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#c0101e'; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 52); c.lineTo(73, 61); c.moveTo(73, 52); c.lineTo(64, 61); c.stroke();
  c.restore();
  rr(c, 8, 74, 84, 18, 6); c.fillStyle = lin(c, 0, 74, 0, 92, [[0, '#2ad4c4'], [1, '#0a4a5a']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#f7c948'; c.stroke();
  text(c, 'FREE GAMES', 50, 83.5, 10.5, { fill: '#fff', stroke: '#03202a', sw: 2.5 });
}
function pFlagWild(c) {
  c.strokeStyle = '#6a4a1a'; c.lineWidth = 4; c.beginPath(); c.moveTo(14, 6); c.lineTo(14, 96); c.stroke();
  c.beginPath(); c.moveTo(16, 10); c.bezierCurveTo(40, 2, 60, 18, 92, 8); c.lineTo(90, 66); c.bezierCurveTo(60, 76, 40, 60, 16, 68); c.closePath();
  c.fillStyle = lin(c, 16, 0, 92, 0, [[0, '#2a2a30'], [.5, '#111116'], [1, '#2a2a30']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#000'; c.stroke();
  c.fillStyle = '#f4f1e6'; c.beginPath(); c.arc(53, 30, 11, 0, TAU); c.fill(); rr(c, 47, 37, 12, 8, 2); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.ellipse(49, 30, 3, 3.5, 0, 0, TAU); c.ellipse(57, 30, 3, 3.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#f4f1e6'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(34, 44); c.lineTo(72, 58); c.moveTo(72, 44); c.lineTo(34, 58); c.stroke();
  rr(c, 4, 68, 92, 24, 6); c.fillStyle = lin(c, 0, 68, 0, 92, [[0, '#ff5a5a'], [.5, '#c40018'], [1, '#6a0010']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#f7c948'; c.stroke();
  text(c, 'WILD', 50, 81, 19, { fill: gold(c, 70, 92), stroke: '#2a0004', sw: 4 });
}
function pDoubloon(c) {
  c.beginPath(); c.arc(50, 50, 47, 0, TAU); c.fillStyle = rad(c, 50, 50, 30, 50, 50, 48, [[0, 'rgba(42,212,196,.55)'], [1, 'rgba(42,212,196,0)']]); c.fill();
  c.beginPath(); c.arc(50, 50, 38, 0, TAU); c.fillStyle = rad(c, 40, 36, 3, 50, 50, 40, [[0, '#fff6c0'], [.45, '#f2be3a'], [1, '#9a6200']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#6a4000'; c.stroke();
  c.beginPath(); c.arc(50, 50, 31, 0, TAU); c.lineWidth = 1.5; c.strokeStyle = 'rgba(120,70,0,.6)'; c.stroke();
  c.strokeStyle = 'rgba(150,95,10,.45)'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(50, 28); c.lineTo(50, 72); c.moveTo(40, 36); c.lineTo(60, 36); c.moveTo(32, 60); c.quadraticCurveTo(50, 80, 68, 60); c.stroke();
  c.beginPath(); c.arc(50, 25, 4, 0, TAU); c.stroke();
  sparkle(c, 70, 26, 6);
}
function pCannon(c) { // cannonball variant drawn under jackpot labels on the hold board
  c.beginPath(); c.arc(50, 50, 36, 0, TAU); c.fillStyle = rad(c, 38, 36, 3, 50, 50, 38, [[0, '#8a94a8'], [.5, '#2a3040'], [1, '#05070c']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#2ad4c4'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(38, 34, 9, 5, -.6, 0, TAU); c.fill();
}
// ---------------------------------------------------------------- Big Bad Breeze
function pPig(c, hat) {
  disc(c, '#dff3ff', '#7cc8ff', '#ffffff', 45);
  const pink = (y0, y1) => lin(c, 0, y0, 0, y1, [[0, '#ffd0e0'], [1, '#f07ab4']]);
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 14, 32); c.lineTo(50 + s * 32, 18); c.lineTo(50 + s * 30, 42); c.closePath(); c.fillStyle = pink(18, 42); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#a0346a'; c.stroke(); }
  c.beginPath(); c.ellipse(50, 56, 31, 28, 0, 0, TAU); c.fillStyle = rad(c, 42, 46, 4, 50, 56, 32, [[0, '#ffe4ee'], [.6, '#ffa8cc'], [1, '#e2609a']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#a0346a'; c.stroke();
  c.fillStyle = 'rgba(255,90,140,.35)'; c.beginPath(); c.ellipse(29, 64, 6, 4, 0, 0, TAU); c.ellipse(71, 64, 6, 4, 0, 0, TAU); c.fill();
  for (const x of [39, 61]) { c.beginPath(); c.ellipse(x, 50, 4.2, 5, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(x + .6, 51, 2.6, 0, TAU); c.fillStyle = '#2a1020'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 1.4, 50, .9, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(50, 65, 12, 8.5, 0, 0, TAU); c.fillStyle = '#ff8ab8'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#a0346a'; c.stroke();
  c.fillStyle = '#a0346a'; c.beginPath(); c.ellipse(45.5, 65, 2.2, 3.2, 0, 0, TAU); c.ellipse(54.5, 65, 2.2, 3.2, 0, 0, TAU); c.fill();
  c.strokeStyle = '#a0346a'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(42, 77); c.quadraticCurveTo(50, 82, 58, 77); c.stroke();
  if (hat === 'straw') {
    c.beginPath(); c.ellipse(50, 30, 34, 8, 0, 0, TAU); c.fillStyle = lin(c, 0, 22, 0, 38, [[0, '#ffe68a'], [1, '#c9a23a']]); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#7a5a10'; c.stroke();
    c.beginPath(); c.moveTo(32, 30); c.quadraticCurveTo(34, 10, 50, 10); c.quadraticCurveTo(66, 10, 68, 30); c.closePath(); c.fillStyle = lin(c, 0, 10, 0, 30, [[0, '#fff0a8'], [1, '#d8b04a']]); c.fill(); c.stroke();
    c.fillStyle = '#e8304a'; c.fillRect(33, 23, 34, 5);
    c.strokeStyle = 'rgba(122,90,16,.5)'; c.lineWidth = .8; for (let x = 36; x < 66; x += 4) { c.beginPath(); c.moveTo(x, 13); c.lineTo(x - 1, 22); c.stroke(); }
  } else if (hat === 'wood') {
    c.beginPath(); c.moveTo(28, 34); c.quadraticCurveTo(30, 12, 50, 12); c.quadraticCurveTo(70, 12, 72, 34); c.closePath(); c.fillStyle = lin(c, 0, 12, 0, 34, [[0, '#5aa8ff'], [1, '#1a5ab8']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#0a2a6a'; c.stroke();
    c.beginPath(); c.moveTo(60, 32); c.quadraticCurveTo(80, 30, 88, 36); c.quadraticCurveTo(76, 40, 60, 37); c.closePath(); c.fillStyle = '#1a4aa0'; c.fill(); c.stroke();
    c.save(); c.translate(26, 46); c.rotate(-1.1); rr(c, -2, -12, 4, 24, 1); c.fillStyle = '#ffd34a'; c.fill(); c.fillStyle = '#e8a86a'; c.beginPath(); c.moveTo(-2, 12); c.lineTo(0, 17); c.lineTo(2, 12); c.fill(); c.restore();
  } else {
    c.beginPath(); c.moveTo(26, 34); c.quadraticCurveTo(28, 8, 50, 8); c.quadraticCurveTo(72, 8, 74, 34); c.closePath(); c.fillStyle = lin(c, 0, 8, 0, 34, [[0, '#fff27a'], [1, '#e8a800']]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#7a5000'; c.stroke();
    rr(c, 20, 31, 60, 6, 3); c.fillStyle = '#f2b800'; c.fill(); c.stroke();
    c.fillStyle = '#fff8c0'; rr(c, 46, 9, 8, 22, 3); c.fill();
  }
}
function pHouse(c, kind) {
  c.beginPath(); c.ellipse(50, 92, 40, 5, 0, 0, TAU); c.fillStyle = 'rgba(40,90,40,.35)'; c.fill();
  if (kind === 'mansion') {
    rr(c, 10, 44, 80, 46, 2); c.fillStyle = lin(c, 0, 44, 0, 90, [[0, '#fff8f0'], [1, '#f2c8d8']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#8a4a6a'; c.stroke();
    c.beginPath(); c.moveTo(4, 46); c.lineTo(50, 14); c.lineTo(96, 46); c.closePath(); c.fillStyle = gold(c, 14, 46); c.fill(); c.lineWidth = 2; c.strokeStyle = '#6a4000'; c.stroke();
    c.fillStyle = '#ffffff'; for (const x of [20, 34, 62, 76]) { c.fillRect(x - 2.5, 50, 5, 38); }
    c.strokeStyle = 'rgba(138,74,106,.6)'; c.lineWidth = 1; for (const x of [20, 34, 62, 76]) { c.strokeRect(x - 2.5, 50, 5, 38); }
    rr(c, 43, 64, 14, 26, 6); c.fillStyle = '#c0185a'; c.fill();
    c.beginPath(); c.arc(50, 34, 6, 0, TAU); c.fillStyle = '#7cc8ff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#6a4000'; c.stroke();
    sparkle(c, 82, 20, 8); sparkle(c, 16, 30, 5);
    return;
  }
  const wall = kind === 'straw' ? ['#ffe68a', '#d8a83a'] : kind === 'wood' ? ['#d89a5a', '#8a5222'] : ['#e86a4a', '#a0301a'];
  const roof = kind === 'straw' ? ['#fff0a0', '#c99a2a'] : kind === 'wood' ? ['#9a5a2a', '#4a2a10'] : ['#7a8494', '#3a4250'];
  rr(c, 18, 46, 64, 44, 2); c.fillStyle = lin(c, 0, 46, 0, 90, [[0, wall[0]], [1, wall[1]]]); c.fill();
  c.save(); rr(c, 18, 46, 64, 44, 2); c.clip();
  if (kind === 'straw') { c.strokeStyle = 'rgba(140,100,20,.55)'; c.lineWidth = 1; for (let x = 20; x < 82; x += 3.2) { c.beginPath(); c.moveTo(x, 46); c.lineTo(x + 1.5, 90); c.stroke(); } }
  else if (kind === 'wood') { c.strokeStyle = 'rgba(70,35,10,.7)'; c.lineWidth = 1.4; for (let y = 52; y < 90; y += 7) { c.beginPath(); c.moveTo(18, y); c.lineTo(82, y); c.stroke(); } c.fillStyle = 'rgba(70,35,10,.6)'; for (let y = 49; y < 90; y += 7) { c.beginPath(); c.arc(22, y, .9, 0, TAU); c.arc(78, y, .9, 0, TAU); c.fill(); } }
  else { c.strokeStyle = 'rgba(255,230,210,.7)'; c.lineWidth = 1.2; for (let y = 46, k = 0; y < 90; y += 6, k++) { c.beginPath(); c.moveTo(18, y); c.lineTo(82, y); c.stroke(); for (let x = 18 + (k % 2) * 6; x < 82; x += 12) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 6); c.stroke(); } } }
  c.restore();
  c.lineWidth = 2; c.strokeStyle = '#5a2a10'; rr(c, 18, 46, 64, 44, 2); c.stroke();
  if (kind === 'brick') { c.fillStyle = lin(c, 0, 0, 0, 1, [[0, '#a0301a'], [1, '#a0301a']]); c.fillStyle = '#8a2a14'; c.fillRect(64, 18, 9, 18); c.strokeRect(64, 18, 9, 18); }
  c.beginPath(); c.moveTo(10, 48); c.lineTo(50, 14); c.lineTo(90, 48); c.closePath(); c.fillStyle = lin(c, 0, 14, 0, 48, [[0, roof[0]], [1, roof[1]]]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#3a2008'; c.stroke();
  if (kind === 'straw') { c.strokeStyle = 'rgba(120,80,10,.6)'; c.lineWidth = 1; for (let k = 0; k < 9; k++) { const x = 16 + k * 8.5; c.beginPath(); c.moveTo(50, 16); c.lineTo(x, 47); c.stroke(); } }
  rr(c, 42, 64, 16, 26, 7); c.fillStyle = kind === 'brick' ? '#3a5ad8' : '#6a3a14'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#2a1404'; c.stroke();
  c.beginPath(); c.arc(54, 78, 1.4, 0, TAU); c.fillStyle = '#ffd34a'; c.fill();
  for (const x of [24, 64]) { rr(c, x, 54, 12, 11, 2); c.fillStyle = '#bfe6ff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#2a1404'; c.stroke(); c.beginPath(); c.moveTo(x + 6, 54); c.lineTo(x + 6, 65); c.moveTo(x, 59.5); c.lineTo(x + 12, 59.5); c.stroke(); }
}
// The wolf. puff 0..1 puffs his cheeks out; open 0..1 rounds his mouth for the blow.
function pWolf(c, puff = 0, open = 0, bg = true) {
  if (bg) disc(c, '#c8b8e8', '#4a3a6a', '#ffffff', 45);
  const fur = lin(c, 0, 10, 0, 90, [[0, '#a8b0bc'], [1, '#4a5260']]);
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 12, 30); c.lineTo(50 + s * 30, 4); c.lineTo(50 + s * 34, 38); c.closePath(); c.fillStyle = fur; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#1a1e26'; c.stroke();
    c.beginPath(); c.moveTo(50 + s * 18, 30); c.lineTo(50 + s * 29, 12); c.lineTo(50 + s * 30, 34); c.closePath(); c.fillStyle = '#e8a0b8'; c.fill(); }
  c.beginPath(); c.moveTo(50, 20); c.bezierCurveTo(76, 20, 86, 40, 82, 58); c.lineTo(88, 66); c.lineTo(74, 70); c.bezierCurveTo(66, 86, 34, 86, 26, 70); c.lineTo(12, 66); c.lineTo(18, 58); c.bezierCurveTo(14, 40, 24, 20, 50, 20); c.closePath();
  c.fillStyle = fur; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1a1e26'; c.stroke();
  if (puff > 0) for (const s of [-1, 1]) {
    const r = 6 + puff * 13; c.beginPath(); c.arc(50 + s * (18 + puff * 6), 64, r, 0, TAU); c.fillStyle = rad(c, 50 + s * (16 + puff * 6), 60, 1, 50 + s * (18 + puff * 6), 64, r, [[0, '#ffd8e4'], [.5, '#e894b0'], [1, '#8a5a6a']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#1a1e26'; c.stroke();
  }
  c.beginPath(); c.ellipse(50, 66, 16, 13, 0, 0, TAU); c.fillStyle = lin(c, 0, 54, 0, 80, [[0, '#e8ecf2'], [1, '#a8b0bc']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#1a1e26'; c.stroke();
  for (const x of [38, 62]) { c.beginPath(); c.ellipse(x, 44, 6, 5, 0, 0, TAU); c.fillStyle = '#ffd34a'; c.fill(); c.lineWidth = 1.4; c.stroke(); c.beginPath(); c.ellipse(x, 44, 1.8, 4, 0, 0, TAU); c.fillStyle = '#111'; c.fill(); }
  c.strokeStyle = '#1a1e26'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 36); c.lineTo(44, 40); c.moveTo(70, 36); c.lineTo(56, 40); c.stroke();
  c.beginPath(); c.ellipse(50, 58, 6, 4, 0, 0, TAU); c.fillStyle = '#111'; c.fill();
  if (open > .05) { c.beginPath(); c.ellipse(50, 72, 4 + open * 2, 3 + open * 5, 0, 0, TAU); c.fillStyle = '#4a0a1a'; c.fill(); c.lineWidth = 1.4; c.stroke(); }
  else { c.beginPath(); c.moveTo(40, 71); c.quadraticCurveTo(50, 76, 60, 71); c.lineWidth = 1.8; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(43, 72); c.lineTo(45, 77); c.lineTo(47, 73); c.moveTo(53, 73); c.lineTo(55, 77); c.lineTo(57, 72); c.fill(); }
}
function pPiggyWild(c) {
  disc(c, '#ffe0f0', '#f07ab4', 'gold', 46);
  c.beginPath(); c.ellipse(50, 46, 34, 24, 0, 0, TAU); c.fillStyle = rad(c, 40, 36, 3, 50, 46, 35, [[0, '#fff6c0'], [.5, '#f7c948'], [1, '#a06a00']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a3a00'; c.stroke();
  c.beginPath(); c.ellipse(84, 46, 5, 8, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(36, 26); c.lineTo(42, 14); c.lineTo(50, 24); c.fillStyle = '#f2b830'; c.fill(); c.stroke();
  rr(c, 40, 22, 20, 4, 2); c.fillStyle = '#5a3a00'; c.fill();
  c.beginPath(); c.arc(68, 40, 2.4, 0, TAU); c.fillStyle = '#3a2000'; c.fill();
  rr(c, 4, 64, 92, 26, 7); c.fillStyle = lin(c, 0, 64, 0, 90, [[0, '#9ad8ff'], [1, '#2a7ad8']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
  text(c, 'WILD', 50, 78, 21, { fill: '#fff', stroke: '#c0185a', sw: 5 });
  sparkle(c, 20, 30, 6);
}
function pBlueprint(c) {
  rr(c, 8, 12, 84, 64, 4); c.fillStyle = lin(c, 0, 12, 0, 76, [[0, '#3a8ae8'], [1, '#1a4aa8']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#0a2a6a'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = .8; for (let x = 14; x < 92; x += 6) { c.beginPath(); c.moveTo(x, 12); c.lineTo(x, 76); c.stroke(); } for (let y = 18; y < 76; y += 6) { c.beginPath(); c.moveTo(8, y); c.lineTo(92, y); c.stroke(); }
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(30, 42); c.lineTo(50, 24); c.lineTo(70, 42); c.moveTo(34, 38); c.lineTo(34, 64); c.lineTo(66, 64); c.lineTo(66, 38); c.moveTo(46, 64); c.lineTo(46, 50); c.lineTo(54, 50); c.lineTo(54, 64); c.stroke();
  c.beginPath(); c.ellipse(92, 44, 6, 32, 0, 0, TAU); c.fillStyle = lin(c, 86, 0, 98, 0, [[0, '#1a4aa8'], [.5, '#8ac8ff'], [1, '#0a2a6a']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#0a2a6a'; c.stroke();
  rr(c, 6, 74, 88, 20, 7); c.fillStyle = lin(c, 0, 74, 0, 94, [[0, '#ff9ac8'], [1, '#d0306a']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
  text(c, 'BONUS', 50, 84.5, 14, { fill: '#fff', stroke: '#6a0a3a', sw: 3.5 });
}
// ---------------------------------------------------------------- Drum of Fortune
function drumBody(c, label) {
  c.beginPath(); c.ellipse(50, 74, 38, 12, 0, 0, Math.PI); c.lineTo(12, 30); c.ellipse(50, 30, 38, 12, 0, Math.PI, 0, true); c.closePath();
  c.fillStyle = lin(c, 12, 0, 88, 0, [[0, '#5a0006'], [.3, '#d8182a'], [.55, '#ff5a4a'], [.8, '#b0101e'], [1, '#4a0004']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#2a0002'; c.stroke();
  c.strokeStyle = gold(c, 30, 80); c.lineWidth = 3.5; for (const y of [38, 66]) { c.beginPath(); c.ellipse(50, y, 38, 12, 0, .05, Math.PI - .05); c.stroke(); }
  c.fillStyle = '#ffe08a'; for (let k = 0; k < 9; k++) { const a = .2 + k * (Math.PI - .4) / 8; c.beginPath(); c.arc(50 + Math.cos(a) * 38, 38 + Math.sin(a) * 12, 2.2, 0, TAU); c.arc(50 + Math.cos(a) * 38, 66 + Math.sin(a) * 12, 2.2, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(50, 30, 38, 12, 0, 0, TAU); c.fillStyle = rad(c, 44, 27, 2, 50, 30, 38, [[0, '#fff8e0'], [1, '#e8c890']]); c.fill(); c.lineWidth = 3; c.strokeStyle = gold(c, 18, 42); c.stroke();
  if (label) text(c, label, 50, 31, 13, { fill: '#c0101e', stroke: '#fff3c0', sw: 2 });
}
function pDrumWild(c) {
  c.beginPath(); c.arc(50, 52, 47, 0, TAU); c.fillStyle = rad(c, 50, 52, 10, 50, 52, 48, [[0, 'rgba(255,210,80,.6)'], [1, 'rgba(255,150,0,0)']]); c.fill();
  c.strokeStyle = '#7a3a10'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(70, 6); c.lineTo(56, 26); c.moveTo(30, 6); c.lineTo(42, 24); c.stroke();
  c.fillStyle = '#d8182a'; c.beginPath(); c.arc(70, 6, 4.5, 0, TAU); c.arc(30, 6, 4.5, 0, TAU); c.fill();
  c.save(); c.translate(0, 6); drumBody(c, ''); c.restore();
  rr(c, 8, 54, 84, 24, 7); c.fillStyle = lin(c, 0, 54, 0, 78, [[0, '#fff3b0'], [.5, '#f7c948'], [1, '#a06a00']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a0004'; c.stroke();
  text(c, 'WILD', 50, 67, 20, { fill: '#c0101e', stroke: '#fff3c0', sw: 3 });
}
function pLion(c) {
  disc(c, '#ffcc33', '#a05000', '#c0101e');
  c.save(); c.beginPath(); c.arc(50, 50, 43, 0, TAU); c.clip();
  c.fillStyle = '#fff6e0'; for (let k = 0; k < 18; k++) { const a = k * TAU / 18; c.beginPath(); c.ellipse(50 + Math.cos(a) * 36, 54 + Math.sin(a) * 34, 7, 4, a, 0, TAU); c.fill(); }
  c.beginPath(); c.moveTo(50, 12); c.bezierCurveTo(80, 12, 86, 40, 80, 60); c.bezierCurveTo(74, 82, 26, 82, 20, 60); c.bezierCurveTo(14, 40, 20, 12, 50, 12); c.closePath();
  c.fillStyle = lin(c, 0, 12, 0, 82, [[0, '#ff4a3a'], [1, '#9a0010']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#3a0004'; c.stroke();
  c.beginPath(); c.moveTo(50, 8); c.lineTo(56, 22); c.lineTo(44, 22); c.closePath(); c.fillStyle = gold(c, 8, 22); c.fill();
  c.strokeStyle = '#ffd34a'; c.lineWidth = 3; c.beginPath(); c.moveTo(26, 34); c.quadraticCurveTo(36, 26, 46, 34); c.moveTo(54, 34); c.quadraticCurveTo(64, 26, 74, 34); c.stroke();
  for (const x of [36, 64]) { c.beginPath(); c.arc(x, 44, 9, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#111'; c.stroke(); c.beginPath(); c.arc(x + 1, 45, 4.5, 0, TAU); c.fillStyle = '#111'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 2.5, 43.5, 1.5, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(50, 58, 9, 6, 0, 0, TAU); c.fillStyle = gold(c, 52, 64); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a0004'; c.stroke();
  c.beginPath(); c.moveTo(30, 66); c.quadraticCurveTo(50, 80, 70, 66); c.quadraticCurveTo(50, 74, 30, 66); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.restore();
}
function pFirecrackers(c) {
  disc(c, '#5a0a10', '#1a0204', '#f7c948');
  c.strokeStyle = '#7a4a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(50, 8); c.quadraticCurveTo(54, 18, 50, 24); c.stroke();
  const tube = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); rr(c, -7, -22, 14, 44, 3); c.fillStyle = lin(c, -7, 0, 7, 0, [[0, '#8a0010'], [.45, '#ff4a3a'], [1, '#7a0010']]); c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#2a0002'; c.stroke(); c.fillStyle = '#f7c948'; c.fillRect(-7, -16, 14, 3); c.fillRect(-7, 13, 14, 3); c.restore(); };
  tube(34, 58, -.35); tube(66, 58, .35); tube(42, 54, -.12); tube(58, 54, .12); tube(50, 52, 0);
  c.fillStyle = '#ffe08a'; for (const [x, y, r] of [[50, 22, 7], [40, 16, 4], [62, 18, 4.5], [56, 10, 3]]) sparkle(c, x, y, r, '#ffe9a0');
  rr(c, 40, 74, 20, 8, 3); c.fillStyle = gold(c, 74, 82); c.fill();
}
function pEnvelope(c) {
  disc(c, '#ffe9a0', '#c98a12', '#c0101e');
  rr(c, 24, 14, 52, 74, 5); c.fillStyle = lin(c, 24, 0, 76, 0, [[0, '#a00010'], [.5, '#ff3a2a'], [1, '#a00010']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#3a0004'; c.stroke();
  c.beginPath(); c.moveTo(24, 20); c.quadraticCurveTo(50, 46, 76, 20); c.lineTo(76, 18); c.quadraticCurveTo(76, 14, 72, 14); c.lineTo(28, 14); c.quadraticCurveTo(24, 14, 24, 18); c.closePath(); c.fillStyle = '#c0101e'; c.fill(); c.stroke();
  c.beginPath(); c.arc(50, 34, 9, 0, TAU); c.fillStyle = gold(c, 25, 43); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#6a3a00'; c.stroke();
  c.strokeStyle = '#f7c948'; c.lineWidth = 2; c.beginPath(); c.arc(50, 64, 12, 0, TAU); c.stroke(); c.beginPath(); c.rect(45, 59, 10, 10); c.stroke();
}
function pCoinCN(c) {
  c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.fillStyle = rad(c, 40, 36, 4, 50, 50, 46, [[0, '#fff6c0'], [.45, '#f2be3a'], [1, '#8a5200']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#5a3200'; c.stroke();
  c.beginPath(); c.arc(50, 50, 36, 0, TAU); c.lineWidth = 2; c.strokeStyle = 'rgba(110,60,0,.6)'; c.stroke();
  rr(c, 38, 38, 24, 24, 2); c.fillStyle = '#7a0a10'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#8a5200'; c.stroke();
  c.fillStyle = 'rgba(110,60,0,.55)'; for (const [x, y] of [[50, 24], [50, 76], [24, 50], [76, 50]]) { rr(c, x - 5, y - 5, 10, 10, 2); c.fill(); }
  sparkle(c, 72, 26, 7);
}
function pIngotSym(c, label = true) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = rad(c, 50, 50, 10, 50, 50, 47, [[0, 'rgba(255,220,100,.6)'], [1, 'rgba(255,160,0,0)']]); c.fill();
  c.beginPath(); c.ellipse(50, 42, 20, 17, 0, Math.PI, 0); c.closePath(); c.fillStyle = rad(c, 44, 30, 2, 50, 40, 24, [[0, '#fff7c8'], [.5, '#f7c948'], [1, '#a0680a']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a3500'; c.stroke();
  c.beginPath(); c.moveTo(6, 38); c.quadraticCurveTo(14, 80, 50, 82); c.quadraticCurveTo(86, 80, 94, 38); c.quadraticCurveTo(72, 54, 50, 54); c.quadraticCurveTo(28, 54, 6, 38); c.closePath();
  c.fillStyle = lin(c, 0, 38, 0, 82, [[0, '#fff2a8'], [.35, '#f2b92e'], [1, '#8a5200']]); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(28, 62, 10, 3.5, .5, 0, TAU); c.fill();
  sparkle(c, 72, 24, 8); sparkle(c, 22, 30, 5);
  if (label) { rr(c, 10, 80, 80, 16, 6); c.fillStyle = '#c0101e'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#ffe08a'; c.stroke(); text(c, 'SCATTER', 50, 88.5, 10, { fill: '#ffe08a' }); }
}

// =====================================================================================================
// Math
// =====================================================================================================
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// A reel strip from symbol counts, deterministically shuffled. `stacks` adds solid blocks ({cap:[4,4]} = two blocks of 4).
// `spaced` symbols are kept at least 3 apart; no other symbol may run 3 deep unless it is stacked or listed in `runs`.
function buildStrip(counts, seed, spaced = [], stacks = {}, runs = []) {
  const rnd = mulberry(seed), okRun = new Set([...Object.keys(stacks), ...runs]);
  for (let attempt = 0; attempt < 20000; attempt++) {
    const toks = []; for (const [s, n] of Object.entries(counts)) for (let i = 0; i < n; i++) toks.push([s]);
    for (const [s, arr] of Object.entries(stacks)) for (const k of arr) toks.push(Array(k).fill(s));
    for (let i = toks.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [toks[i], toks[j]] = [toks[j], toks[i]]; }
    const a = toks.flat(), L = a.length; let ok = true;
    for (let i = 0; i < L && ok; i++) if (spaced.includes(a[i])) for (let d = 1; d < 3; d++) if (spaced.includes(a[(i + d) % L])) ok = false;
    for (let i = 0; i < L && ok; i++) if (!okRun.has(a[i]) && a[i] === a[(i + 1) % L] && a[i] === a[(i + 2) % L]) ok = false;
    if (ok) return { strip: a };
  }
  throw new Error('strip build failed');
}
const mod = (a, n) => ((a % n) + n) % n;
function spinGrid(defs, R) {
  const stops = defs.map(d => R(d.strip.length));
  return { stops, grid: stops.map((s, i) => { const st = defs[i].strip; return [0, 1, 2].map(r => st[(s + r) % st.length]); }) };
}
function pickW(R, table, total) { let x = R(total); for (const [v, w] of table) { if (x < w) return v; x -= w; } return table[table.length - 1][0]; }
const tot = t => t.reduce((a, b) => a + b[1], 0);
const cellsOf = (grid, s) => { const out = []; grid.forEach((col, i) => col.forEach((x, r) => { if (x === s) out.push([i, r]); })); return out; };

const LINES25 = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0],
  [1, 0, 1, 0, 1], [1, 2, 1, 2, 1], [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [0, 2, 0, 2, 0]];

// Left-to-right line win. Symbols without a pay entry (scatters, coins, houses, wolves) break the line.
function lineWin(M, syms) {
  const W = M.wild; let tgt = null, n = 0;
  for (const s of syms) {
    if (s === W) { n++; continue; }
    if (!M.pays[s]) break;
    if (tgt === null) { tgt = s; n++; continue; }
    if (s === tgt) { n++; continue; }
    break;
  }
  let best = null;
  if (tgt && M.pays[tgt][n]) best = { sym: tgt, n, pay: M.pays[tgt][n] };
  let wn = 0; while (wn < syms.length && syms[wn] === W) wn++;
  if (wn && M.pays[W] && M.pays[W][wn] && (!best || M.pays[W][wn] > best.pay)) best = { sym: W, n: wn, pay: M.pays[W][wn] };
  return best;
}
// Lines: pays are per line, multiplied by the coin (the bet per line).
function evalLines(M, grid, nLines, coin) {
  const wins = []; let pay = 0;
  for (let li = 0; li < nLines; li++) {
    const L = LINES25[li], b = lineWin(M, L.map((r, i) => grid[i][r])); if (!b) continue;
    const p = b.pay * coin; pay += p;
    wins.push({ line: li, cells: L.slice(0, b.n).map((r, i) => [i, r]), pay: p, sym: b.sym, n: b.n, label: `${b.n}× ${M.names[b.sym]}` });
  }
  return { wins, pay };
}
// 243 ways: pays are credits for a 50-credit bet, times the number of ways. All pays are multiples of 5 and every
// bet is a multiple of 10, so dollars = pay × ways × bet / 50 is always a whole number.
function evalWays(M, grid, bet, mult = 1) {
  const wins = []; let pay = 0;
  for (const s of Object.keys(M.pays)) {
    let ways = 1, n = 0; const cells = [];
    for (let i = 0; i < 5; i++) { const rows = [0, 1, 2].filter(r => grid[i][r] === s || (grid[i][r] === M.wild && i > 0)); if (!rows.length) break; ways *= rows.length; n++; rows.forEach(r => cells.push([i, r])); }
    if (!M.pays[s][n]) continue;
    const p = M.pays[s][n] * ways * bet / 50 * mult; pay += p;
    wins.push({ line: -1, cells, pay: p, sym: s, n, ways, label: `${n}× ${M.names[s]}${ways > 1 ? ` · ${ways} ways` : ''}${mult > 1 ? ` · ×${mult}` : ''}` });
  }
  wins.sort((a, b) => b.pay - a.pay);
  return { wins, pay };
}

// ---------------------------------------------------------------- Thunderbolt Link: Pirate's Plunder
const PL_PAYS = {
  wild: { 5: 1000 }, cap: { 3: 100, 4: 300, 5: 1000 }, parrot: { 3: 60, 4: 200, 5: 600 }, swords: { 3: 50, 4: 150, 5: 500 }, compass: { 3: 40, 4: 120, 5: 400 },
  A: { 3: 25, 4: 75, 5: 250 }, K: { 3: 25, 4: 60, 5: 200 }, Q: { 3: 15, 4: 50, 5: 150 }, J: { 3: 15, 4: 40, 5: 125 }, T: { 3: 15, 4: 40, 5: 100 }
};
const PL_C = { cap: 2, parrot: 4, swords: 5, compass: 5, A: 6, K: 6, Q: 7, J: 7, T: 7, coin: 9 };
const PL_FC = { parrot: 4, swords: 5, compass: 5, A: 6, K: 6, Q: 7, J: 7, T: 7, coin: 9 };
const PL_SP = ['wild', 'map'], PL_RUN = ['coin'];
const PL_BASE = [
  buildStrip({ ...PL_C }, 101, PL_SP, { cap: [3] }, PL_RUN),
  buildStrip({ ...PL_C, wild: 3, map: 4 }, 102, PL_SP, { cap: [3] }, PL_RUN),
  buildStrip({ ...PL_C, wild: 3, map: 4 }, 103, PL_SP, { cap: [3] }, PL_RUN),
  buildStrip({ ...PL_C, wild: 3, map: 4 }, 104, PL_SP, { cap: [3] }, PL_RUN),
  buildStrip({ ...PL_C, wild: 3 }, 105, PL_SP, { cap: [3] }, PL_RUN)];
const PL_FREE = [ // free games: the captain arrives in big stacks
  buildStrip({ ...PL_FC }, 111, PL_SP, { cap: [4, 4, 4] }, PL_RUN),
  buildStrip({ ...PL_FC, wild: 3, map: 4 }, 112, PL_SP, { cap: [4, 4, 4] }, PL_RUN),
  buildStrip({ ...PL_FC, wild: 3, map: 4 }, 113, PL_SP, { cap: [4, 4, 4] }, PL_RUN),
  buildStrip({ ...PL_FC, wild: 3, map: 4 }, 114, PL_SP, { cap: [4, 4, 4] }, PL_RUN),
  buildStrip({ ...PL_FC, wild: 3 }, 115, PL_SP, { cap: [4, 4, 4] }, PL_RUN)];
// Link coin values: × total bet, or a jackpot.
const PL_COIN = [[{ m: 1 }, 300], [{ m: 2 }, 250], [{ m: 3 }, 160], [{ m: 4 }, 100], [{ m: 5 }, 80], [{ m: 8 }, 40], [{ m: 10 }, 24], [{ m: 15 }, 10],
  [{ j: 'MINI' }, 14], [{ j: 'MINOR' }, 4], [{ j: 'MAJOR' }, 1]];
const PL_COIN_T = tot(PL_COIN);
const PL_HOLD_Q = 355; // chance (per 10,000) that an empty spot lands a coin on a respin
const PL_FIXED = { MINI: 10, MINOR: 25 };
const PL_PROG = { MAJOR: { key: 'vc.link.major', seed: 100, rate: .004 }, GRAND: { key: 'vc.link.grand', seed: 1000, rate: .002 } }; // meters are × total bet
const PL_FS = 12;
const plCoin = R => ({ ...pickW(R, PL_COIN, PL_COIN_T) });
// value of one coin in dollars; MAJOR pays the meter and resets it
function plCoinAmt(v, bet, meters) {
  if (v.m) return v.m * bet;
  if (PL_FIXED[v.j]) return PL_FIXED[v.j] * bet;
  const amt = Math.floor(meters.MAJOR * bet); meters.MAJOR = PL_PROG.MAJOR.seed; meters.hit = true; return amt;
}
function plHold(R, vals, bet, meters) {
  const cells = Array(15).fill(null); vals.forEach((col, i) => col.forEach((v, r) => { if (v) cells[i * 3 + r] = v; }));
  const init = cells.slice(), steps = []; let respins = 3;
  while (respins > 0 && cells.some(c => !c)) {
    const got = [];
    for (let k = 0; k < 15; k++) if (!cells[k] && R(10000) < PL_HOLD_Q) { cells[k] = plCoin(R); got.push(k); }
    respins = got.length ? 3 : respins - 1; steps.push(got.map(k => [k, cells[k]]));
  }
  const amts = cells.map(v => v ? plCoinAmt(v, bet, meters) : 0);
  const full = cells.every(Boolean);
  let grand = 0; if (full) { grand = Math.floor(meters.GRAND * bet); meters.GRAND = PL_PROG.GRAND.seed; meters.hit = true; }
  return { init, steps, cells, amts, full, grand, total: amts.reduce((a, b) => a + b, 0) + grand };
}
function plSpin(R, o, free) {
  const { stops, grid } = spinGrid(free ? PL_FREE : PL_BASE, R);
  const { wins, pay } = evalLines(PLUNDER, grid, o.lines, o.coin);
  const vals = grid.map(col => col.map(s => s === 'coin' ? plCoin(R) : null));
  const nc = vals.flat().filter(Boolean).length, maps = cellsOf(grid, 'map');
  const s = { stops, grid, vals, wins, pay, maps, fs: maps.length >= 3 ? PL_FS : 0, hold: null, total: pay };
  if (nc >= 6) { s.hold = plHold(R, vals, o.coin * o.lines, o.meters); s.total += s.hold.total; }
  return s;
}
// One paid game: the base spin plus everything it triggers. o = { coin, lines, meters }
function plPlan(R, o) {
  const spin = plSpin(R, o, false), free = []; let total = spin.total;
  if (spin.fs) { let left = spin.fs; while (left > 0 && free.length < 240) { left--; const s = plSpin(R, o, true); if (s.fs) left += PL_FS; free.push(s); total += s.total; } }
  return { spin, free, total };
}

// ---------------------------------------------------------------- Big Bad Breeze
const BR_PAYS = {
  wild: { 5: 1000 }, pigB: { 3: 75, 4: 300, 5: 750 }, pigW: { 3: 60, 4: 200, 5: 600 }, pigS: { 3: 45, 4: 150, 5: 450 },
  A: { 3: 15, 4: 60, 5: 225 }, K: { 3: 15, 4: 45, 5: 200 }, Q: { 3: 10, 4: 40, 5: 150 }, J: { 3: 10, 4: 30, 5: 120 }, T: { 3: 10, 4: 25, 5: 100 }
};
const BR_C = { pigB: 3, pigW: 4, pigS: 5, A: 6, K: 6, Q: 7, J: 7, T: 7, hS: 3, hW: 2, hB: 2 };
const BR_FC = { pigB: 3, pigW: 4, pigS: 5, A: 6, K: 6, Q: 7, J: 7, T: 7, hS: 4, hW: 3, hB: 3 };
const BR_SP = ['wild', 'bonus', 'wolf'];
const BR_BASE = [
  buildStrip({ ...BR_C, bonus: 4 }, 201, BR_SP),
  buildStrip({ ...BR_C, wild: 3 }, 202, BR_SP),
  buildStrip({ ...BR_C, wild: 3, bonus: 4 }, 203, BR_SP),
  buildStrip({ ...BR_C, wild: 3 }, 204, BR_SP),
  buildStrip({ ...BR_C, bonus: 4, wolf: 1 }, 205, BR_SP)];
const BR_FREE = [
  buildStrip({ ...BR_FC }, 211, BR_SP),
  buildStrip({ ...BR_FC, wild: 3 }, 212, BR_SP),
  buildStrip({ ...BR_FC, wild: 3 }, 213, BR_SP),
  buildStrip({ ...BR_FC, wild: 3 }, 214, BR_SP),
  buildStrip({ ...BR_FC, wolf: 3 }, 215, BR_SP)];
const BR_JP = { MINI: 15, MINOR: 40, MAJOR: 200, GRAND: 1000 };
const BR_STRAW = [[{ m: 1 }, 50], [{ m: 2 }, 30], [{ m: 3 }, 12], [{ m: 5 }, 6], [{ m: 10 }, 2]];
const BR_WOOD = [[{ m: 2 }, 40], [{ m: 3 }, 25], [{ m: 5 }, 18], [{ m: 8 }, 9], [{ m: 10 }, 5], [{ m: 15 }, 2], [{ m: 25 }, 1]];
const BR_MANSION = [[{ j: 'MINI' }, 500], [{ m: 25 }, 300], [{ j: 'MINOR' }, 150], [{ m: 100 }, 40], [{ j: 'MAJOR' }, 9], [{ j: 'GRAND' }, 1]];
const BR_UPG = { base: 100, free: 150 }; // per 1,000: chance a brick house becomes a mansion when the wolf blows
const BR_PICK = [[6, 40], [8, 35], [10, 18], [15, 7]];
const brAmt = (v, bet) => (v.m || BR_JP[v.j]) * bet;
function brSpin(R, o, free) {
  const { stops, grid } = spinGrid(free ? BR_FREE : BR_BASE, R), bet = o.coin * o.lines;
  const { wins, pay } = evalLines(BREEZE, grid, o.lines, o.coin);
  const s = { stops, grid, wins, pay, wolf: null, bonus: null, total: pay };
  const wr = grid[4].indexOf('wolf');
  if (wr >= 0) {
    const houses = []; let wp = 0;
    grid.forEach((col, i) => col.forEach((x, r) => {
      if (x === 'hS' || x === 'hW') { const v = { ...pickW(R, x === 'hS' ? BR_STRAW : BR_WOOD, tot(x === 'hS' ? BR_STRAW : BR_WOOD)) }; const amt = brAmt(v, bet); wp += amt; houses.push({ i, r, kind: x, v, amt }); }
      else if (x === 'hB') { if (R(1000) < (free ? BR_UPG.free : BR_UPG.base)) { const v = { ...pickW(R, BR_MANSION, tot(BR_MANSION)) }; const amt = brAmt(v, bet); wp += amt; houses.push({ i, r, kind: x, mansion: true, v, amt }); } else houses.push({ i, r, kind: x, amt: 0 }); }
    }));
    s.wolf = { row: wr, houses, pay: wp }; s.total += wp;
  }
  const bc = cellsOf(grid, 'bonus');
  if (!free && bc.length >= 3) { const n = pickW(R, BR_PICK, tot(BR_PICK)); s.bonus = { cells: bc, n, others: [pickW(R, BR_PICK, tot(BR_PICK)), pickW(R, BR_PICK, tot(BR_PICK))] }; }
  return s;
}
function brPlan(R, o) {
  const spin = brSpin(R, o, false), free = []; let total = spin.total;
  if (spin.bonus) for (let k = 0; k < spin.bonus.n; k++) { const s = brSpin(R, o, true); free.push(s); total += s.total; }
  return { spin, free, total };
}

// ---------------------------------------------------------------- Drum of Fortune
const DR_PAYS = {
  lion: { 3: 80, 4: 240, 5: 800 }, fire: { 3: 65, 4: 160, 5: 640 }, env: { 3: 50, 4: 130, 5: 480 }, coin: { 3: 40, 4: 95, 5: 320 },
  A: { 3: 25, 4: 65, 5: 240 }, K: { 3: 25, 4: 65, 5: 200 }, Q: { 3: 15, 4: 50, 5: 160 }, J: { 3: 15, 4: 40, 5: 160 }, T: { 3: 10, 4: 30, 5: 120 }, N: { 3: 10, 4: 25, 5: 120 }
};
const DR_C = { lion: 3, fire: 4, env: 5, coin: 5, A: 6, K: 6, Q: 7, J: 7, T: 8, N: 8, ingot: 2 };
const DR_SP = ['wild', 'ingot'];
const DR_REELS = [
  buildStrip({ ...DR_C }, 301, DR_SP),
  buildStrip({ ...DR_C, wild: 3 }, 302, DR_SP),
  buildStrip({ ...DR_C, wild: 3 }, 303, DR_SP),
  buildStrip({ ...DR_C, wild: 3 }, 304, DR_SP),
  buildStrip({ ...DR_C }, 305, DR_SP)];
const DR_SCAT = { 3: 2, 4: 10, 5: 50 }; // × total bet
// Free-games volatility options. Each has the same average (spins × average multiplier = 30).
const DR_OPTS = [{ n: 15, mults: [1, 2, 3], name: 'Lantern Parade', tip: 'Most spins, gentle multipliers' },
  { n: 10, mults: [2, 3, 4], name: 'Lion Dance', tip: 'Balanced' },
  { n: 5, mults: [3, 5, 10], name: 'Thunder Drums', tip: 'Fewest spins, wildest multipliers' }];
const DR_TIERS = ['GRAND', 'MAJOR', 'MINOR', 'MINI', 'MINI-ER'];
const DR_JP = { GRAND: 1000, MAJOR: 150, MINOR: 40, MINI: 15, 'MINI-ER': 5 };
const DR_TIER_W = [['GRAND', 1], ['MAJOR', 9], ['MINOR', 60], ['MINI', 280], ['MINI-ER', 650]];
const DR_DRUM_P = 90; // per 10,000 paid spins: the drum bonus starts at random
function drPick(R, bet) {
  const tier = pickW(R, DR_TIER_W, tot(DR_TIER_W)), decoys = [];
  for (const t of DR_TIERS) if (t !== tier) { const n = R(3); for (let k = 0; k < n; k++) decoys.push(t); }
  const pre = [tier, tier, ...decoys];
  for (let i = pre.length - 1; i > 0; i--) { const j = R(i + 1); [pre[i], pre[j]] = [pre[j], pre[i]]; }
  const seq = [...pre, tier], left = [];
  for (const t of DR_TIERS) { const used = seq.filter(x => x === t).length; for (let k = used; k < 3; k++) left.push(t); }
  for (let i = left.length - 1; i > 0; i--) { const j = R(i + 1); [left[i], left[j]] = [left[j], left[i]]; }
  return { tier, seq, left, amt: DR_JP[tier] * bet };
}
function drSpin(R, o, mult = 0) {
  const free = mult > 0, bet = o.coin * o.units, { stops, grid } = spinGrid(DR_REELS, R);
  const { wins, pay } = evalWays(DRUM, grid, bet, mult || 1);
  const sc = cellsOf(grid, 'ingot'); let sp = 0;
  if (DR_SCAT[sc.length]) { sp = DR_SCAT[sc.length] * bet * (mult || 1); wins.push({ line: -1, cells: sc, pay: sp, sym: 'ingot', label: `${sc.length}× Gold Ingot${mult > 1 ? ` · ×${mult}` : ''}`, scatter: true }); }
  const s = { stops, grid, wins, pay: pay + sp, mult, fs: !free && sc.length >= 3, drum: null, total: pay + sp };
  if (!free && R(10000) < DR_DRUM_P) { s.drum = drPick(R, bet); s.total += s.drum.amt; }
  return s;
}
const drPlan = (R, o) => { const spin = drSpin(R, o); return { spin, free: [], total: spin.total }; };
function drPlanFree(R, o, opt) {
  const O = DR_OPTS[opt], free = []; let total = 0;
  for (let k = 0; k < O.n; k++) { const s = drSpin(R, o, O.mults[R(O.mults.length)]); free.push(s); total += s.total; }
  return { free, total };
}

// Theoretical returns from Monte Carlo runs of the plan functions above (6M+ paid spins each, every feature included).
const RTP = {
  'slot-plunder': 'About 95.0%, progressive growth included (12M-spin Monte Carlo: line wins 61.6%; Hold &amp; Spin 20.8%, 1 in 118 spins; free games 12.0%, 1 in 182; meter growth 0.6%)',
  'slot-breeze': 'About 94.7% (6M-spin Monte Carlo: line wins 57.4%; wolf prizes 22.4%, the wolf lands 1 spin in 19; free games 15.0%, 1 in 110)',
  'slot-drum': 'About 94.8% (6M-spin Monte Carlo: ways and scatters 68.6%; free games 15.6%, 1 in 133; drum bonus 10.7%, 1 in 111). Each free-games choice returns between 94.6% and 95.0% overall'
};

// =====================================================================================================
// Machine definitions
// =====================================================================================================
const rp = (ch, a, b, e, ink) => c => royal(c, ch, a, b, e, ink);
const PLUNDER = {
  id: 'slot-plunder', kind: 'plunder', order: 110, title: "Thunderbolt Link: Pirate's Plunder",
  blurb: '25 lines. Six doubloons start Hold & Spin for four jackpots; treasure maps sail into free games with stacked captains.',
  theme: { cabinet: '#12305e', accent: '#2ad4c4', glass: '#041022' }, reelBg: [[0, '#020a18'], [.5, '#0b3a52'], [1, '#020a18']],
  lines: true, unitName: 'LINES', unitSteps: [1, 5, 10, 15, 20, 25], defUnits: 25, maxUnits: 25,
  wild: 'wild', pays: PL_PAYS, reels: PL_BASE, freeReels: PL_FREE, plan: plPlan,
  names: { wild: 'Jolly Roger Wild', cap: 'Captain', parrot: 'Parrot', swords: 'Cutlasses', compass: 'Compass', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', map: 'Treasure Map', coin: 'Doubloon' },
  paint: { wild: pFlagWild, cap: pCaptain, parrot: pParrot, swords: pSwords, compass: pCompass, map: pMap, coin: pDoubloon, ball: pCannon,
    A: rp('A', '#7af0e0', '#0a6a7a', '#f7c948'), K: rp('K', '#ffd34a', '#a0500a', '#fff2b0'), Q: rp('Q', '#ff8a7a', '#8a0a1a', '#f7c948'), J: rp('J', '#9ad0ff', '#0a3a8a', '#f7c948'), T: rp('10', '#c8a8ff', '#4a1a8a', '#f7c948') },
  jackpots: [['GRAND', 'g'], ['MAJOR', 'mj'], ['MINOR', 'mn'], ['MINI', 'mi']]
};
const BREEZE = {
  id: 'slot-breeze', kind: 'breeze', order: 111, title: 'Big Bad Breeze',
  blurb: '25 lines. When the wolf lands he blows straw and wood houses away to reveal cash; bricks can turn into mansions.',
  theme: { cabinet: '#f07ab4', accent: '#7cc8ff', glass: '#10284a' }, reelBg: [[0, '#8ccaf2'], [.5, '#e8f6ff'], [1, '#8ccaf2']], light: true,
  lines: true, unitName: 'LINES', unitSteps: [1, 5, 10, 15, 20, 25], defUnits: 25, maxUnits: 25,
  wild: 'wild', pays: BR_PAYS, reels: BR_BASE, freeReels: BR_FREE, plan: brPlan,
  names: { wild: 'Piggy Bank Wild', pigB: 'Brick Pig', pigW: 'Wood Pig', pigS: 'Straw Pig', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', hS: 'Straw House', hW: 'Wood House', hB: 'Brick House', mansion: 'Mansion', wolf: 'Big Bad Wolf', bonus: 'Blueprint' },
  paint: { wild: pPiggyWild, pigB: c => pPig(c, 'brick'), pigW: c => pPig(c, 'wood'), pigS: c => pPig(c, 'straw'), hS: c => pHouse(c, 'straw'), hW: c => pHouse(c, 'wood'), hB: c => pHouse(c, 'brick'), mansion: c => pHouse(c, 'mansion'), wolf: c => pWolf(c), bonus: pBlueprint,
    A: rp('A', '#ff9ac8', '#c0185a', '#ffffff', '#5a0a2a'), K: rp('K', '#9ad8ff', '#1a5ab8', '#ffffff', '#0a2a5a'), Q: rp('Q', '#ffe07a', '#c08a00', '#ffffff', '#5a3a00'), J: rp('J', '#a8f0a8', '#2a8a3a', '#ffffff', '#0a3a10'), T: rp('10', '#d8b8ff', '#6a3ab8', '#ffffff', '#2a0a5a') },
  jackpots: [['GRAND', 'g'], ['MAJOR', 'mj'], ['MINOR', 'mn'], ['MINI', 'mi']]
};
const DRUM = {
  id: 'slot-drum', kind: 'drum', order: 112, title: 'Drum of Fortune',
  blurb: '243 ways. Gold ingots start free games at the volatility you choose; the drums can strike any spin for a jackpot pick.',
  theme: { cabinet: '#a50d12', accent: '#ffcc33', glass: '#2a0303' }, reelBg: [[0, '#1a0204'], [.5, '#5a0a10'], [1, '#1a0204']],
  lines: false, unitName: 'BET', unitSteps: [10, 20, 30, 40, 50], defUnits: 30, maxUnits: 50,
  wild: 'wild', pays: DR_PAYS, reels: DR_REELS, freeReels: DR_REELS, plan: drPlan,
  names: { wild: 'Drum Wild', lion: 'Lion Dance', fire: 'Firecrackers', env: 'Red Envelope', coin: 'Lucky Coin', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', N: '9', ingot: 'Gold Ingot' },
  paint: { wild: pDrumWild, lion: pLion, fire: pFirecrackers, env: pEnvelope, coin: pCoinCN, ingot: pIngotSym,
    A: rp('A', '#ffe08a', '#c0101e', '#f7c948'), K: rp('K', '#ffe08a', '#b0400a', '#f7c948'), Q: rp('Q', '#ffd0a0', '#a0101e', '#f7c948'), J: rp('J', '#fff0b0', '#c07a00', '#f7c948'), T: rp('10', '#ffc0a0', '#901010', '#f7c948'), N: rp('9', '#ffe0a0', '#a05a00', '#f7c948') },
  jackpots: [['GRAND', 'g'], ['MAJOR', 'mj'], ['MINOR', 'mn'], ['MINI', 'mi'], ['MINI-ER', 'me']]
};
const MACHINES = [PLUNDER, BREEZE, DRUM];

export const _math = { MACHINES, plPlan, brPlan, drPlan, drPlanFree, PL_PROG, PL_FIXED, BR_JP, DR_JP, DR_OPTS, DR_TIER_W, DR_DRUM_P, LINES25, evalLines, evalWays, spinGrid, RTP };

// =====================================================================================================
// Sound: K.tone plus a filtered-noise voice for drums, gongs, cannon and wind
// =====================================================================================================
function noise(dur, { vol = .2, delay = 0, hp = 200, lp = 6000, attack = .005, sweep = 0 } = {}) {
  const a = K.audioCtx(); if (!a || K.isMuted()) return;
  const t = a.currentTime + delay, n = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = buf;
  const f1 = a.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
  const f2 = a.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(lp, t); if (sweep) f2.frequency.exponentialRampToValueAtTime(Math.max(60, lp + sweep), t + dur);
  const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f1).connect(f2).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + .05);
}
const SND = {
  drum(delay = 0, big = false) { K.tone(big ? 62 : 92, big ? .7 : .38, { type: 'sine', vol: big ? .5 : .34, slide: -36, delay }); K.tone(big ? 130 : 180, .12, { type: 'triangle', vol: .12, slide: -80, delay }); noise(big ? .25 : .12, { vol: .28, hp: 60, lp: 900, delay }); },
  rim(delay = 0) { K.tone(820, .05, { type: 'square', vol: .05, delay }); noise(.05, { vol: .2, hp: 2500, lp: 9000, delay }); },
  gong(delay = 0) {
    [[98, 3.4, .16], [147, 3, .1], [211, 2.6, .08], [293, 2.2, .06], [401, 1.8, .045], [557, 1.3, .03], [743, .9, .02]].forEach(([f, d, v]) => K.tone(f, d, { type: 'sine', vol: v, delay, slide: -f * .04 }));
    noise(1.6, { vol: .09, hp: 300, lp: 3000, delay, attack: .01, sweep: -2000 }); K.tone(49, 1.4, { type: 'sine', vol: .2, delay });
  },
  cymbal(delay = 0) { noise(.7, { vol: .13, hp: 5000, lp: 14000, delay }); },
  cannon(delay = 0) { K.tone(66, .6, { type: 'sine', vol: .45, slide: -36, delay }); noise(.6, { vol: .4, hp: 30, lp: 900, delay, sweep: -700 }); noise(.08, { vol: .3, hp: 1500, lp: 8000, delay }); },
  thunder(delay = 0) { noise(1.4, { vol: .32, hp: 25, lp: 420, delay, attack: .02 }); noise(.12, { vol: .25, hp: 1200, lp: 9000, delay }); K.tone(44, 1.1, { vol: .2, delay }); },
  clink(delay = 0, f = 1) { K.tone(2100 * f, .09, { type: 'triangle', vol: .08, delay }); K.tone(3150 * f, .07, { type: 'sine', vol: .05, delay: delay + .02 }); },
  inhale() { noise(1, { vol: .14, hp: 500, lp: 700, attack: .85, sweep: 2600 }); },
  blow() { noise(1.5, { vol: .34, hp: 120, lp: 2600, attack: .04, sweep: -2100 }); noise(1.2, { vol: .12, hp: 2000, lp: 7000, delay: .1, attack: .1 }); },
  growl() { K.tone(96, .45, { type: 'sawtooth', vol: .06, slide: -30 }); K.tone(101, .45, { type: 'sawtooth', vol: .05, slide: -34 }); },
  oink(delay = 0) { K.tone(430, .12, { type: 'sawtooth', vol: .05, slide: -170, delay }); K.tone(380, .1, { type: 'square', vol: .03, slide: -120, delay: delay + .13 }); }
};

// =====================================================================================================
// Styles
// =====================================================================================================
function injectLk() {
  K.injectStyles();
  if (document.getElementById('lk-style')) return;
  const s = document.createElement('style'); s.id = 'lk-style';
  s.textContent = `
.lk-screen{--cab:#12305e;--acc:#2ad4c4;--glass:#041022;position:absolute;inset:0;display:flex;flex-direction:column;color:#f6efe0;font-family:"Chakra Petch",system-ui,sans-serif;font-size:14px;
  background:radial-gradient(ellipse 120% 70% at 50% 0%,color-mix(in srgb,var(--cab) 45%,#000) 0%,#06050a 72%);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.lk-screen *{box-sizing:border-box}
.lk-top{position:relative;z-index:3;display:flex;align-items:center;gap:8px;padding:8px max(12px,env(safe-area-inset-left,0px));padding-top:max(8px,env(safe-area-inset-top,0px));background:linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.35));border-bottom:1px solid rgba(255,255,255,.1)}
.lk-ttl{flex:1;min-width:0;display:grid}.lk-ttl b{font:400 clamp(14px,2.2vw,20px) "Bungee",Impact,sans-serif;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lk-ttl small{font-size:11px;color:#bfb6a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lk-ib{font:600 13px "Chakra Petch",system-ui,sans-serif;color:#f6efe0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;min-height:36px;cursor:pointer;flex:none}
.lk-ib:hover{border-color:var(--acc)}.lk-ib:focus-visible,.lk-btn:focus-visible,.lk-pick-b:focus-visible,.lk-opt:focus-visible,.lk-gc:focus-visible{outline:2px solid #fff;outline-offset:2px}
.lk-stage{position:relative;z-index:1;flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch;padding:10px 12px 12px}
.lk-cab{position:relative;flex:0 1 880px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-radius:26px 26px 16px 16px;
  background:linear-gradient(90deg,color-mix(in srgb,var(--cab) 45%,#000),var(--cab) 10%,color-mix(in srgb,var(--cab) 72%,#fff) 50%,var(--cab) 90%,color-mix(in srgb,var(--cab) 45%,#000));
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),inset 0 0 0 6px rgba(0,0,0,.35),inset 0 2px 30px rgba(255,255,255,.15),0 24px 60px rgba(0,0,0,.75)}
.lk-breeze .lk-cab{background:linear-gradient(90deg,#b0407a,#f07ab4 12%,#ffc0dc 50%,#f07ab4 88%,#b0407a);box-shadow:inset 0 0 0 3px #7cc8ff,inset 0 0 0 7px rgba(255,255,255,.4),0 24px 60px rgba(0,0,0,.7)}
.lk-drum .lk-cab{background:repeating-linear-gradient(90deg,rgba(255,204,51,.08) 0 2px,transparent 2px 18px),linear-gradient(90deg,#4a0204,#a50d12 12%,#e0322a 50%,#a50d12 88%,#4a0204);box-shadow:inset 0 0 0 3px #ffcc33,inset 0 0 0 7px #5a0204,inset 0 0 0 9px #c99a2a,0 24px 60px rgba(0,0,0,.8)}
.lk-marq{position:relative;flex:none;display:grid;place-items:center;gap:4px;text-align:center;padding:8px 12px 10px;border-radius:16px 16px 10px 10px;overflow:hidden;
  background:radial-gradient(ellipse at 50% 120%,color-mix(in srgb,var(--acc) 35%,transparent),transparent 70%),linear-gradient(var(--glass),#000);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),inset 0 0 20px #000}
.lk-breeze .lk-marq{background:radial-gradient(ellipse at 50% 130%,rgba(255,255,255,.35),transparent 70%),linear-gradient(#2a6ab8,#10284a)}
.lk-logo{display:grid;justify-items:center;font:400 clamp(20px,4vw,40px)/1 "Bungee",Impact,sans-serif;letter-spacing:.02em;background:linear-gradient(#fff 0%,var(--acc) 45%,color-mix(in srgb,var(--acc) 55%,#000) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 10px color-mix(in srgb,var(--acc) 60%,transparent));max-width:100%;white-space:nowrap}
.lk-logo small{font-size:.42em;letter-spacing:.3em;background:linear-gradient(#fff,#ffe24a);-webkit-background-clip:text;background-clip:text}
.lk-breeze .lk-logo{background-image:linear-gradient(#fff 0%,#ffd0e6 40%,#f07ab4 100%);filter:drop-shadow(0 2px 0 #7a1a4a) drop-shadow(0 0 10px rgba(124,200,255,.8))}
.lk-drum .lk-logo{background-image:linear-gradient(#fff6c0 0%,#ffcc33 45%,#a06a00 100%);filter:drop-shadow(0 2px 0 #3a0000) drop-shadow(0 0 12px rgba(255,80,40,.7))}
.lk-marq-x{font-size:12px;color:#e9dfc8;min-height:1.2em;font-weight:600;letter-spacing:.04em}
.lk-bulbs{position:absolute;left:8px;right:8px;height:8px;display:flex;justify-content:space-between;pointer-events:none}.lk-bulbs.t{top:3px}.lk-bulbs.b{bottom:3px}
.lk-bulbs i{width:6px;height:6px;border-radius:50%;background:#fff6c8;box-shadow:0 0 6px var(--acc);animation:lk-chase 1.2s steps(1) infinite;opacity:.25}
.lk-bulbs i:nth-child(3n+1){animation-delay:-.4s}.lk-bulbs i:nth-child(3n+2){animation-delay:-.8s}
.lk-screen.winning .lk-bulbs i{animation-duration:.36s}
@keyframes lk-chase{0%{opacity:1}33%{opacity:.25}}
.lk-jps{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;width:min(100%,640px)}
.lk-jp{display:grid;justify-items:center;padding:3px 4px 4px;border-radius:8px;background:linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.45));border:1.5px solid currentColor;min-width:0;box-shadow:0 0 10px color-mix(in srgb,currentColor 35%,transparent),inset 0 0 8px rgba(0,0,0,.6)}
.lk-jp span{font:400 clamp(9px,1.5vw,12px)/1.1 "Bungee",Impact,sans-serif;letter-spacing:.06em;white-space:nowrap}
.lk-jp b{font:400 clamp(9px,1.6vw,14px)/1.35 "Press Start 2P",monospace;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-variant-numeric:tabular-nums;text-shadow:0 0 6px currentColor}
.lk-jp.g{color:#ffd34a}.lk-jp.mj{color:#ff6a5a}.lk-jp.mn{color:#7ad0ff}.lk-jp.mi{color:#9dffb0}.lk-jp.me{color:#e0a8ff}
.lk-jp.prog b{color:#ffe9a0}.lk-jp.hit{animation:lk-jphit .5s 6}
@keyframes lk-jphit{50%{background:currentColor;}}
.lk-reelwrap{position:relative;flex:1 1 0;min-height:0}
.lk-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px;border-radius:14px;background:linear-gradient(#fff2b0,#b07a12 40%,#f3d36b 60%,#8a5a00);
  box-shadow:0 0 0 2px #111,0 0 0 4px var(--acc),0 0 26px color-mix(in srgb,var(--acc) 45%,transparent),0 10px 20px rgba(0,0,0,.6)}
.lk-plunder .lk-frame{background:linear-gradient(#bff6f0,#1a8a8a 40%,#7ae8de 60%,#0a4a5a)}
.lk-breeze .lk-frame{background:linear-gradient(#fff,#f07ab4 40%,#ffd0e6 60%,#c0407a)}
.lk-cv{display:block;border-radius:6px;background:#0a0a0a;touch-action:manipulation;cursor:pointer}
.lk-ovl{position:absolute;inset:8px;display:grid;place-items:center;pointer-events:none;border-radius:6px;overflow:hidden}
.lk-card{padding:14px 22px;border-radius:14px;background:rgba(0,0,0,.8);border:2px solid var(--acc);text-align:center;box-shadow:0 0 30px color-mix(in srgb,var(--acc) 60%,transparent);animation:lk-pop .35s cubic-bezier(.3,1.6,.5,1);max-width:94%}
.lk-card b{display:block;font:400 clamp(18px,4vw,38px)/1.1 "Bungee",Impact,sans-serif;color:var(--acc);text-shadow:0 0 14px color-mix(in srgb,var(--acc) 70%,transparent)}
.lk-card span{font-size:clamp(12px,1.8vw,16px);color:#fff}
@keyframes lk-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.lk-meters{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lk-led{background:linear-gradient(#000,#120a0a);border:2px solid #2a2a2a;border-radius:8px;padding:4px 6px 5px;text-align:center;box-shadow:inset 0 0 10px #000;min-width:0}
.lk-led span{display:block;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#9c927d}
.lk-led b{display:block;font:400 clamp(11px,2vw,17px)/1.3 "Press Start 2P",monospace;color:#ff4130;text-shadow:0 0 8px rgba(255,40,20,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.lk-led.win b{color:#4dff6a;text-shadow:0 0 8px rgba(40,255,80,.8)}
.lk-msg{flex:none;min-height:1.5em;text-align:center;font-weight:600;font-size:clamp(13px,1.8vw,16px);color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lk-msg.win{color:#9dffb0}.lk-msg.lose{color:#ffb0a8}.lk-msg.gold{color:#ffe08a}
.lk-breeze .lk-msg{color:#4a0a30;text-shadow:0 1px 0 rgba(255,255,255,.7)}.lk-breeze .lk-msg.win{color:#05602a}.lk-breeze .lk-msg.gold{color:#8a1050}.lk-breeze .lk-msg.lose{color:#a00010}
.lk-deck{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;padding:8px;border-radius:12px;background:linear-gradient(#1a1a1a,#050505);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 3px 0 rgba(0,0,0,.6)}
.lk-grp{display:flex;align-items:center;gap:6px}.lk-grp>span{font-size:10px;letter-spacing:.12em;color:#9c927d;font-weight:700}
.lk-btn{font:700 14px "Chakra Petch",system-ui,sans-serif;color:#fff;background:linear-gradient(#444,#161616);border:1px solid rgba(255,255,255,.25);border-radius:10px;min-height:44px;min-width:44px;padding:0 12px;cursor:pointer;box-shadow:0 3px 0 #000;letter-spacing:.03em}
.lk-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #000}.lk-btn:disabled{opacity:.4;cursor:not-allowed}
.lk-seg{display:flex;border-radius:10px;overflow:hidden;box-shadow:0 3px 0 #000}.lk-seg .lk-btn{border-radius:0;box-shadow:none;min-width:46px;padding:0 8px}
.lk-seg .lk-btn.on{background:linear-gradient(color-mix(in srgb,var(--acc) 85%,#fff),color-mix(in srgb,var(--acc) 70%,#000));color:#160c00;border-color:var(--acc)}
.lk-units{min-width:30px;text-align:center;font:400 14px "Press Start 2P",monospace;color:var(--acc)}
.lk-btn.lk-auto.on{background:linear-gradient(#2a8a3a,#0a3a14);border-color:#7dff9a}
.lk-spin{min-width:128px;min-height:56px;border-radius:30px;font:400 20px "Bungee",Impact,sans-serif;color:#0a1a1a;border:2px solid color-mix(in srgb,var(--acc) 60%,#fff);
  background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.75),transparent 45%),linear-gradient(color-mix(in srgb,var(--acc) 90%,#fff),color-mix(in srgb,var(--acc) 60%,#000));
  box-shadow:0 4px 0 #000,0 0 18px color-mix(in srgb,var(--acc) 55%,transparent)}
.lk-spin.stop{background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.6),transparent 45%),linear-gradient(#ff6a5a,#8a0a10);color:#fff;border-color:#ffb0a8}
.lk-spin kbd{display:block;font:7px "Press Start 2P",monospace;opacity:.6;margin-top:-2px}
.lk-pt{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.8);display:grid;place-items:center;padding:12px}
.lk-pt[hidden]{display:none}
.lk-pt-in{position:relative;width:min(780px,100%);max-height:100%;overflow:auto;background:linear-gradient(#1b1610,#0e0b07);border:1px solid var(--acc);border-radius:14px;padding:16px 18px;line-height:1.45}
.lk-pt-x{position:sticky;top:0;float:right;z-index:2;background:#000}
.lk-pt h3{font:400 22px "Bungee",Impact,sans-serif;color:var(--acc);margin:.1em 0 .4em}.lk-pt h4{color:var(--acc);margin:1em 0 .3em;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.lk-pt table{border-collapse:collapse;width:100%;font-size:13px}.lk-pt td,.lk-pt th{border-bottom:1px solid rgba(255,255,255,.1);padding:4px 6px;text-align:right;font-variant-numeric:tabular-nums}
.lk-pt td:first-child,.lk-pt th:first-child{text-align:left}.lk-pt th{color:var(--acc);font-size:12px}
.lk-pt img{width:40px;height:40px;vertical-align:middle;margin-right:2px;background:rgba(255,255,255,.06);border-radius:6px}
.lk-paygrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.lk-pg{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border-radius:8px;padding:6px}.lk-pg img{width:52px;height:52px;flex:none}
.lk-pg div{font-size:12px;line-height:1.35}.lk-pg b{color:var(--acc)}
.lk-linegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px}.lk-linegrid figure{margin:0;text-align:center;font-size:11px;color:#bfb6a6}.lk-linegrid canvas{width:66px;height:40px;display:block;margin:0 auto 2px}
.lk-fx{position:absolute;inset:0;pointer-events:none;z-index:35;overflow:hidden}
.lk-coin{position:absolute;top:-40px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c0,#f7c948 40%,#a0680a 100%);box-shadow:inset 0 0 0 3px #c98a12,0 2px 4px rgba(0,0,0,.5);animation:lk-fall linear forwards}
.lk-breeze .lk-coin:nth-child(3n){background:radial-gradient(circle at 35% 30%,#fff,#ffb0d4 40%,#c0407a 100%);box-shadow:inset 0 0 0 3px #f07ab4}
@keyframes lk-fall{0%{transform:translateY(0) rotateY(0)}100%{transform:translateY(110vh) rotateY(1080deg)}}
/* feature layers */
.lk-layer{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:16px;background:radial-gradient(ellipse at 50% 40%,color-mix(in srgb,var(--cab) 70%,#000) 0%,rgba(0,0,0,.92) 75%);animation:lk-in .4s ease-out;overflow:auto}
@keyframes lk-in{from{opacity:0}to{opacity:1}}
.lk-lin{display:grid;justify-items:center;gap:12px;width:min(820px,100%)}
.lk-lin h2{margin:0;font:400 clamp(24px,5vw,46px)/1.05 "Bungee",Impact,sans-serif;color:var(--acc);text-align:center;text-shadow:0 3px 0 #000,0 0 18px color-mix(in srgb,var(--acc) 60%,transparent)}
.lk-lin p{margin:0;text-align:center;color:#f6efe0;font-size:clamp(13px,1.9vw,16px)}
.lk-picks{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(8px,2vw,20px);width:100%}
.lk-pick-b{position:relative;display:grid;justify-items:center;gap:6px;padding:10px 6px 12px;border-radius:16px;border:2px solid rgba(255,255,255,.6);background:linear-gradient(#bfe6ff,#e8f6ff);cursor:pointer;color:#10284a;font:700 clamp(12px,1.8vw,15px) "Chakra Petch",sans-serif;min-width:0;overflow:hidden}
.lk-pick-b canvas{width:min(150px,100%);aspect-ratio:1;display:block}
.lk-pick-b em{font-style:normal;font:400 clamp(13px,2.4vw,22px)/1.1 "Bungee",Impact,sans-serif;color:#c0185a;min-height:1.2em;text-align:center}
.lk-pick-b.blow canvas{animation:lk-blow 1s .45s ease-in forwards}.lk-pick-b.dim{opacity:.55;filter:saturate(.5)}
.lk-pick-b.won{box-shadow:0 0 0 4px #fff,0 0 30px #f07ab4}
@keyframes lk-blow{0%{transform:none}15%{transform:translateX(4px) rotate(2deg)}30%{transform:translateX(-4px) rotate(-2deg)}100%{transform:translate(-160%,-40%) rotate(-50deg) scale(.4);opacity:0}}
.lk-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(8px,2vw,16px);width:100%}
.lk-opt{display:grid;justify-items:center;gap:4px;padding:14px 8px;border-radius:16px;border:2px solid #ffcc33;background:linear-gradient(#c0101e,#5a0006);color:#fff;cursor:pointer;min-width:0;font:600 13px "Chakra Petch",sans-serif;box-shadow:0 0 18px rgba(255,204,51,.3)}
.lk-opt:hover{filter:brightness(1.15)}
.lk-opt big{font:400 clamp(30px,6vw,54px)/1 "Bungee",Impact,sans-serif;color:#ffcc33;text-shadow:0 3px 0 #3a0000}
.lk-opt b{font:400 clamp(11px,1.8vw,15px) "Bungee",Impact,sans-serif;color:#ffe9a0;text-align:center}
.lk-opt i{font-style:normal;font:400 clamp(9px,1.4vw,12px) "Press Start 2P",monospace;color:#fff;background:rgba(0,0,0,.4);padding:4px 6px;border-radius:6px;white-space:nowrap}
.lk-opt small{color:#ffd8c0;text-align:center}
.lk-opt kbd{font:9px "Press Start 2P",monospace;opacity:.6}
.lk-wolfmini{width:96px;height:96px;margin-bottom:-6px}
.lk-drumcv{width:min(260px,60vw);aspect-ratio:1;display:block}
.lk-drumcv.beat{animation:lk-beat .3s ease-out}
@keyframes lk-beat{30%{transform:scale(1.12) rotate(-2deg)}}
.lk-tiers{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:100%}
.lk-tier{display:grid;justify-items:center;gap:2px;padding:4px 2px;border-radius:8px;background:rgba(0,0,0,.55);border:1.5px solid currentColor;min-width:0}
.lk-tier span{font:400 clamp(9px,1.6vw,13px) "Bungee",Impact,sans-serif;white-space:nowrap}.lk-tier b{font:400 clamp(8px,1.4vw,12px) "Press Start 2P",monospace;color:#fff;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.lk-tier u{display:flex;gap:3px;text-decoration:none}.lk-tier u i{width:9px;height:9px;border-radius:50%;border:1.5px solid currentColor}.lk-tier u i.on{background:currentColor;box-shadow:0 0 6px currentColor}
.lk-tier.won{animation:lk-jphit .4s 8;color:#fff}
.lk-board{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(6px,1.4vw,12px);width:min(620px,100%)}
.lk-gc{position:relative;aspect-ratio:1;border:0;padding:0;border-radius:50%;background:none;cursor:pointer;perspective:500px}
.lk-gc canvas{width:100%;height:100%;display:block;transition:transform .35s}
.lk-gc .em{position:absolute;inset:6%;border-radius:50%;display:grid;place-items:center;font:400 clamp(8px,1.7vw,14px)/1 "Bungee",Impact,sans-serif;text-align:center;color:#fff;transform:rotateY(90deg);transition:transform .35s .3s;
  background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--tc) 50%,#fff),var(--tc) 55%,color-mix(in srgb,var(--tc) 50%,#000));border:3px solid #ffcc33;text-shadow:0 2px 0 rgba(0,0,0,.6);box-shadow:0 0 12px var(--tc)}
.lk-gc.open canvas{transform:rotateY(90deg)}.lk-gc.open .em{transform:none}.lk-gc.ghost .em{opacity:.45;filter:saturate(.4)}.lk-gc.hit .em{box-shadow:0 0 0 3px #fff,0 0 24px #ffe24a;animation:lk-jphit .4s 6}
.lk-bw{position:absolute;inset:0;z-index:36;display:grid;place-items:center;background:radial-gradient(circle,rgba(0,0,0,.35),rgba(0,0,0,.82));cursor:pointer;animation:lk-in .3s}
.lk-bw-in{display:grid;justify-items:center;gap:6px;text-align:center}
.lk-bw .t{font:400 clamp(34px,9vw,96px)/1 "Bungee",Impact,sans-serif;background:linear-gradient(#fff,#ffe24a 40%,#ff8a00);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #000) drop-shadow(0 0 22px #ff9a00);animation:lk-pulse .6s ease-in-out infinite alternate}
.lk-bw .n{font:400 clamp(22px,6vw,60px)/1.2 "Press Start 2P",monospace;color:#fff;text-shadow:0 0 14px var(--acc),0 4px 0 #000;font-variant-numeric:tabular-nums}
.lk-bw small{color:#cfc6b4;font-size:12px}
.lk-bw .t.up{animation:lk-pop .4s cubic-bezier(.3,1.6,.5,1),lk-pulse .6s .4s ease-in-out infinite alternate}
@keyframes lk-pulse{from{transform:scale(1)}to{transform:scale(1.07)}}
.lk-shake{animation:lk-shake .35s}
@keyframes lk-shake{20%{transform:translate(-5px,2px)}40%{transform:translate(5px,-2px)}60%{transform:translate(-3px,1px)}80%{transform:translate(3px,0)}}
@media (max-width:560px){.lk-ttl small{display:none}.lk-stage{padding:6px 6px 8px}.lk-cab{padding:8px;gap:6px;border-radius:18px 18px 12px 12px}.lk-marq{padding:7px 6px 9px}.lk-marq-x{font-size:11px}
  .lk-spin{min-width:104px;font-size:18px;min-height:52px}.lk-deck{gap:6px;padding:6px}.lk-btn{padding:0 9px;font-size:13px}.lk-seg .lk-btn{min-width:42px}.lk-spin kbd{display:none}.lk-jps{gap:4px}.lk-jp{padding:2px 2px 3px}
  .lk-tiers{gap:3px}.lk-picks{gap:6px}.lk-opt{padding:10px 4px}}
@media (max-width:560px) and (min-height:700px){.lk-marq{padding:16px 8px 18px;gap:10px}.lk-logo{font-size:32px}.lk-jp{padding:5px 2px 6px}.lk-jp b{font-size:11px}.lk-jp span{font-size:11px}.lk-marq-x{font-size:12px}.lk-meters{gap:6px}.lk-led{padding:6px 4px 7px}.lk-deck{padding:10px 6px}.lk-btn{min-height:48px}.lk-spin{min-height:58px;min-width:120px}}
@media (prefers-reduced-motion:reduce){.lk-bulbs i{animation:none;opacity:.8}.lk-coin{display:none}.lk-bw .t{animation:none}.lk-layer{animation:none}}
`;
  document.head.appendChild(s);
}

// =====================================================================================================
// Sprites + small helpers
// =====================================================================================================
function renderSymbol(M, sym, w, h, dpr) {
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
  const p = M.paint[sym]; if (!p) return cv;
  const c = cv.getContext('2d'); const s = Math.min(w, h) * .88;
  c.scale(dpr, dpr); c.translate((w - s) / 2, (h - s) / 2); c.scale(s / 100, s / 100);
  c.save(); try { p(c); } catch (e) { /* never break the reels on a paint error */ } c.restore();
  return cv;
}
function blurSprite(src) {
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const c = cv.getContext('2d');
  const n = 7, spread = src.height * .24;
  for (let i = 0; i < n; i++) { c.globalAlpha = i === (n >> 1) ? .5 : .28; c.drawImage(src, 0, (i / (n - 1) - .5) * spread); }
  return cv;
}
function paintCanvas(cv, fn, px) { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = px * dpr; cv.height = px * dpr; const c = cv.getContext('2d'); c.scale(dpr * px / 100, dpr * px / 100); try { fn(c); } catch (e) { /* ignore */ } }
const thumb = (M, sym, px = 64) => renderSymbol(M, sym, px, px, 1).toDataURL();
const LINE_COLORS = ['#ff3b3b', '#ffd23b', '#3bff6a', '#3bc8ff', '#ff3bd8', '#ff8a3b', '#a03bff', '#3bffd8', '#d8ff3b', '#ff3b8a', '#3b6aff', '#ffb03b', '#6aff3b', '#ff6a6a', '#3bffb0', '#b03bff', '#fff23b', '#3b9cff', '#ff3bb0', '#9cff3b', '#ff9a6a', '#6affea', '#ea6aff', '#c8ff6a', '#6a9aff'];
const fmtShort = d => d >= 100000 ? '$' + Math.round(d / 1000) + 'K' : d >= 10000 ? '$' + (d / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : K.fmt(d);
const fmtTiny = d => d >= 1000 ? '$' + (d / 1000).toFixed(d >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : K.fmt(d);
const fmtCents = d => '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const easeOutBack = t => { const c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const JP_COL = { GRAND: '#e8a800', MAJOR: '#d81a2a', MINOR: '#1a6ad8', MINI: '#1a9a4a', 'MINI-ER': '#8a3ac8' };
function loadMeters() {
  const m = {};
  for (const [j, p] of Object.entries(PL_PROG)) { let v = p.seed; try { const x = parseFloat(localStorage.getItem(p.key)); if (isFinite(x) && x >= p.seed && x < p.seed * 100) v = x; } catch (e) { /* storage unavailable */ } m[j] = v; }
  return m;
}
function saveMeters(m) { for (const [j, p] of Object.entries(PL_PROG)) { try { localStorage.setItem(p.key, m[j].toFixed(4)); } catch (e) { /* storage unavailable */ } } }
const LOGO = { plunder: ['Thunderbolt Link', "Pirate's Plunder"], breeze: ['', 'Big Bad Breeze'], drum: ['', 'Drum of Fortune'] };

// =====================================================================================================
// The machine screen
// =====================================================================================================
function mountLink(M, root, api) {
  injectLk();
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const sleep = ms => new Promise(r => later(r, ms));
  const R = K.rand, PL = M.kind === 'plunder', BR = M.kind === 'breeze', DR = M.kind === 'drum';
  root.innerHTML = '';
  const el = document.createElement('div'); el.className = `lk-screen lk-${M.kind}`;
  el.style.setProperty('--cab', M.theme.cabinet); el.style.setProperty('--acc', M.theme.accent); el.style.setProperty('--glass', M.theme.glass);
  const bulbs = n => '<i></i>'.repeat(n), [lg1, lg2] = LOGO[M.kind];
  el.innerHTML = `
  <header class="lk-top">
    <button type="button" class="lk-ib lk-leave">&#8249; Floor</button>
    <div class="lk-ttl"><b></b><small></small></div>
    <button type="button" class="lk-ib lk-pt-b">Paytable</button>
  </header>
  <main class="lk-stage">
    <div class="lk-cab">
      <div class="lk-marq"><div class="lk-bulbs t">${bulbs(24)}</div>
        <div class="lk-logo">${lg1 ? `<small>${lg1}</small>` : ''}<span>${lg2}</span></div>
        <div class="lk-jps">${M.jackpots.map(([j, c]) => `<div class="lk-jp ${c}${PL && PL_PROG[j] ? ' prog' : ''}"><span>${j}</span><b data-j="${j}"></b></div>`).join('')}</div>
        <div class="lk-marq-x"></div>
        <div class="lk-bulbs b">${bulbs(24)}</div></div>
      <div class="lk-reelwrap"><div class="lk-frame"><canvas class="lk-cv" aria-label="Reels" role="img"></canvas><div class="lk-ovl"></div></div></div>
      <div class="lk-meters"><div class="lk-led"><span>CREDITS</span><b class="m-cred"></b></div><div class="lk-led"><span>BET</span><b class="m-bet"></b></div><div class="lk-led win"><span>WIN</span><b class="m-win">$0</b></div></div>
      <div class="lk-msg" aria-live="polite"></div>
      <div class="lk-deck">
        <div class="lk-grp"><span>COIN</span><div class="lk-seg">${[1, 5, 25].map(v => `<button type="button" class="lk-btn" data-coin="${v}">$${v}</button>`).join('')}</div></div>
        <div class="lk-grp"><span>${M.unitName}</span><button type="button" class="lk-btn lk-dn" aria-label="Less">&minus;</button><b class="lk-units"></b><button type="button" class="lk-btn lk-up" aria-label="More">+</button></div>
        <button type="button" class="lk-btn lk-max">MAX BET</button>
        <button type="button" class="lk-btn lk-auto">AUTO</button>
        <button type="button" class="lk-btn lk-spin">SPIN<kbd>SPACE</kbd></button>
      </div>
    </div>
  </main>
  <div class="lk-pt" hidden><div class="lk-pt-in" role="dialog" aria-label="Paytable"><button type="button" class="lk-ib lk-pt-x">Close</button><div class="lk-pt-body"></div></div></div>
  <div class="lk-fx"></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  $('.lk-ttl b').textContent = M.title; $('.lk-ttl small').textContent = M.blurb;
  const cv = $('.lk-cv'), ctx = cv.getContext('2d'), wrap = $('.lk-reelwrap'), ovl = $('.lk-ovl'), mx = $('.lk-marq-x');
  const mCred = $('.m-cred'), mBet = $('.m-bet'), mWin = $('.m-win'), msgEl = $('.lk-msg');
  const spinBtn = $('.lk-spin'), autoBtn = $('.lk-auto'), maxBtn = $('.lk-max'), upBtn = $('.lk-up'), dnBtn = $('.lk-dn');
  const coinBtns = [...el.querySelectorAll('[data-coin]')];

  // ------------------------------------------------------------------ state
  let coin = 1, units = M.defUnits, busy = false, auto = 0, mode = 'base', owed = 0, roundWon = 0, featBet = 0;
  let defs = M.reels;
  const reels = defs.map(d => { const L = d.strip.length; return { L, pos: R(L), state: 'idle', v: 0, t0: 0, from: 0, to: 0, dur: 0, stopAt: 0, target: 0, speed: 0, p0: 0, antic: false }; });
  let vals = null, hl = null, hold = null, wolfFx = null, curGrid = null, fsMult = 0;
  let meters = PL ? loadMeters() : null, frozen = null;
  let win = { from: 0, to: 0, t0: 0, dur: 0, shown: 0, lastTick: 0 };
  let dirty = true, pendingFree = null, picker = null, skipBig = null;

  const totalBet = () => coin * units;
  const fBet = () => featBet || totalBet();
  const steps = M.unitSteps;
  function msg(t, kind = '') { msgEl.textContent = t; msgEl.className = 'lk-msg ' + kind; }
  function syncControls() {
    const locked = busy || mode !== 'base';
    coinBtns.forEach(b => { const on = +b.dataset.coin === coin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.disabled = locked; });
    $('.lk-units').textContent = units;
    upBtn.disabled = dnBtn.disabled = maxBtn.disabled = locked;
    const spinning = reels.some(r => r.state !== 'idle');
    spinBtn.disabled = mode !== 'base' || (busy && !spinning);
    spinBtn.classList.toggle('stop', spinning && mode === 'base');
    spinBtn.firstChild.textContent = spinning && mode === 'base' ? 'STOP' : 'SPIN';
    autoBtn.classList.toggle('on', auto > 0); autoBtn.textContent = auto > 0 ? `STOP ${auto}` : 'AUTO';
    autoBtn.disabled = mode !== 'base' && !(auto > 0);
    mBet.textContent = K.fmt(mode === 'base' ? totalBet() : 0);
    updJps();
  }
  const setCred = b => { mCred.textContent = K.fmt(b); };
  setCred(api.balance);
  const unsubBal = api.onBalance ? api.onBalance(setCred) : null;
  // money: every planned dollar is added to `owed` up front and paid as it is revealed (or on unmount)
  function pay(x) { x = Math.min(Math.round(x), owed); if (!(x > 0)) return 0; owed -= x; api.win(x); roundWon += x; rollWin(roundWon, Math.floor(win.shown)); return x; }

  // ------------------------------------------------------------------ jackpot plaques
  function jpValue(j) {
    const b = fBet();
    if (PL) return PL_FIXED[j] ? PL_FIXED[j] * b : (frozen || meters)[j] * b;
    return (BR ? BR_JP : DR_JP)[j] * b;
  }
  function updJps() { el.querySelectorAll('.lk-jps [data-j]').forEach(x => { const j = x.dataset.j; x.textContent = PL && PL_PROG[j] ? (el.clientWidth < 600 ? K.fmt(Math.floor(jpValue(j))) : fmtCents(jpValue(j))) : el.clientWidth < 600 && M.jackpots.length > 4 ? fmtTiny(jpValue(j)) : fmtShort(jpValue(j)); }); }
  function flashJp(j) { const p = el.querySelector(`.lk-jps [data-j="${j}"]`); if (p) { p.parentNode.classList.remove('hit'); void p.offsetWidth; p.parentNode.classList.add('hit'); } }

  // ------------------------------------------------------------------ geometry + sprites
  let G = { cw: 100, ch: 100, gap: 5, W: 300, H: 300, dpr: 1 };
  let sprites = {}, blurs = {}, bgGrad = null, shadeGrad = null;
  const syms = Object.keys(M.paint);
  function layout() {
    const r = wrap.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const FR = 16, gap = 5, n = 5, rows = 3;
    const aw = r.width - FR, ah = r.height - FR;
    const cw = Math.max(30, Math.min((aw - (n - 1) * gap) / n, ah / rows * 1.0));
    const ch = Math.max(26, Math.min(ah / rows, cw / (el.clientWidth < 600 ? .64 : .74)));
    const W = Math.round(n * cw + (n - 1) * gap), H = Math.round(rows * ch), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W === G.W && H === G.H && dpr === G.dpr && sprites[syms[0]]) return;
    G = { cw, ch, gap, W, H, dpr };
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    buildSprites();
  }
  function buildSprites() {
    sprites = {}; blurs = {};
    for (const s of syms) { sprites[s] = renderSymbol(M, s, G.cw, G.ch, G.dpr); blurs[s] = blurSprite(sprites[s]); }
    bgGrad = lin(ctx, 0, 0, 0, G.H, M.reelBg);
    shadeGrad = lin(ctx, 0, 0, 0, G.H, M.light ? [[0, 'rgba(40,60,120,.3)'], [.2, 'rgba(0,0,0,0)'], [.8, 'rgba(0,0,0,0)'], [1, 'rgba(40,60,120,.3)']]
      : [[0, 'rgba(0,0,0,.55)'], [.2, 'rgba(0,0,0,0)'], [.45, 'rgba(255,255,255,.06)'], [.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]);
    dirty = true;
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) buildSprites(); });

  // ------------------------------------------------------------------ paytable overlay
  const pt = $('.lk-pt');
  function openPaytable() {
    const th = s => thumb(M, s, 80), b = totalBet();
    const pg = (s, body) => `<div class="lk-pg"><img src="${th(s)}" alt="${M.names[s]}"><div><b>${M.names[s]}</b><br>${body}</div></div>`;
    const payRows = s => [5, 4, 3, 2].filter(n => M.pays[s][n]).map(n => `${n}× ${M.pays[s][n]}`).join('<br>');
    let h = `<h3>${M.title}</h3>`;
    if (PL) h += `<p>5 reels, 25 lines; the bet per line is the coin value. Line wins pay left to right and are multiplied by the coin value. The <b>Jolly Roger Wild</b> (reels 2–5) substitutes for everything except Doubloons and Treasure Maps.</p>
      <h4>Hold &amp; Spin</h4><p><b>Six or more Doubloons</b> anywhere lock in place and give <b>3 respins</b>. Only the empty spots spin. Every new Doubloon locks and <b>resets the respins to 3</b>. Each Doubloon carries a cash value of ×1 to ×15 the total bet, or a jackpot: <b>MINI ×${PL_FIXED.MINI}</b>, <b>MINOR ×${PL_FIXED.MINOR}</b> or the progressive <b>MAJOR</b>. Fill all 15 spots to win the progressive <b>GRAND</b> on top of everything.</p>
      <h4>Progressive jackpots</h4><p>MAJOR and GRAND grow with every paid spin (${PL_PROG.MAJOR.rate * 100}% and ${PL_PROG.GRAND.rate * 100}% of each bet), are shown at your current bet, and reset to ×${PL_PROG.MAJOR.seed} and ×${PL_PROG.GRAND.seed} when won. The meters are shared by every Thunderbolt Link machine on the floor.</p>
      <h4>Free games</h4><p><b>Three Treasure Maps</b> (reels 2, 3 and 4) award <b>${PL_FS} free games</b> on special reels where the <b>Captain lands in stacks of four</b>. Three more Maps add ${PL_FS} games. Hold &amp; Spin can trigger during free games.</p>`;
    if (BR) h += `<p>5 reels, 25 lines; the bet per line is the coin value. The <b>Piggy Bank Wild</b> (reels 2–4) substitutes for the pigs and card symbols.</p>
      <h4>The Big Bad Wolf</h4><p>The Wolf lands only on reel 5. When he does, he huffs and puffs: every <b>Straw House</b> (×1 to ×10 the total bet) and <b>Wood House</b> (×2 to ×25) on the screen is blown away to reveal its cash prize. <b>Brick Houses</b> stand firm, but sometimes become a <b>Mansion</b> that reveals ×25, ×100 or a jackpot: <b>MINI ×${BR_JP.MINI}</b>, <b>MINOR ×${BR_JP.MINOR}</b>, <b>MAJOR ×${BR_JP.MAJOR}</b> or <b>GRAND ×${BR_JP.GRAND}</b>.</p>
      <h4>Pick-a-House bonus</h4><p>Collect <b>three Blueprints</b> (reels 1, 3 and 5) and pick one of three houses. The wolf blows it down to reveal <b>6, 8, 10 or 15 free games</b>. Free games use reels with more houses and wolves, and Mansions appear more often.</p>`;
    if (DR) h += `<p>5 reels, <b>243 ways</b>: a win is any run of matching symbols on adjacent reels from the left, in any row. Pays are for a 50-credit bet and scale with your bet; each way pays separately. The <b>Drum Wild</b> (reels 2–4) substitutes for every symbol except the Gold Ingot.</p>
      <h4>Free games: you choose</h4><p><b>Three or more Gold Ingots</b> anywhere pay a scatter prize and start free games. Pick your volatility: ${DR_OPTS.map(o => `<b>${o.name}</b> — ${o.n} games, each with a random ×${o.mults.join(', ×')} multiplier`).join('; ')}. All three are worth the same on average.</p>
      <h4>Drum bonus</h4><p>On any paid spin the drums can strike at random (about 1 spin in ${Math.round(10000 / DR_DRUM_P)}). Pick gold coins until you match <b>three jackpot symbols</b>: ${DR_TIERS.map(t => `<b>${t} ×${DR_JP[t]}</b>`).join(', ')} the total bet.</p>`;
    h += `<h4>${DR ? 'Way pays (credits, 50-credit bet)' : 'Line pays (× bet per line)'}</h4><div class="lk-paygrid">`;
    if (M.pays[M.wild]) h += pg(M.wild, `Substitutes · ${DR ? 'reels 2–4' : BR ? 'reels 2–4' : 'reels 2–5'}<br>${payRows(M.wild)}`);
    else h += pg(M.wild, `Substitutes · reels 2–4`);
    for (const s of Object.keys(M.pays)) if (s !== M.wild) h += pg(s, payRows(s));
    if (PL) h += pg('coin', '6+ anywhere<br>Hold &amp; Spin') + pg('map', `Reels 2, 3, 4<br>3 = ${PL_FS} free games`);
    if (BR) h += pg('wolf', 'Reel 5 only<br>blows houses down') + pg('hS', 'Cash ×1–×10') + pg('hW', 'Cash ×2–×25') + pg('hB', 'May become a Mansion') + pg('mansion', 'Cash or jackpot') + pg('bonus', 'Reels 1, 3, 5<br>3 = Pick-a-House');
    if (DR) h += pg('ingot', `Anywhere<br>${[5, 4, 3].map(n => `${n}× ${DR_SCAT[n]}× total`).join('<br>')}<br>3+ = free games`);
    h += `</div>`;
    h += `<h4>Jackpots at your ${K.fmt(b)} bet</h4><table><tr><th>Jackpot</th><th>Value</th></tr>${M.jackpots.map(([j]) => `<tr><td>${j}</td><td>${PL && PL_PROG[j] ? fmtCents(jpValue(j)) + ' (progressive)' : K.fmt(jpValue(j))}</td></tr>`).join('')}</table>`;
    if (!DR) h += `<h4>Paylines</h4><div class="lk-linegrid">${LINES25.map((_, i) => `<figure><canvas data-line="${i}" width="132" height="80"></canvas>Line ${i + 1}</figure>`).join('')}</div>`;
    h += `<h4>Theoretical return</h4><p>${RTP[M.id]}. Every outcome, including every feature, is decided by a cryptographic RNG the moment you spin; the animation only reveals it. If you leave in the middle of a feature, its full result is paid to you.</p>
      <h4>Controls</h4><p>Space or SPIN to play (press again to stop the reels early). Choose the coin and ${M.unitName.toLowerCase()}, or MAX BET to bet the most and spin. AUTO plays 25 games and stops on a feature or a big win.</p>`;
    $('.lk-pt-body').innerHTML = h;
    el.querySelectorAll('.lk-pt canvas[data-line]').forEach(c => {
      const g = c.getContext('2d'), L = LINES25[+c.dataset.line], cw = 132 / 5, chh = 80 / 3;
      g.fillStyle = '#000'; g.fillRect(0, 0, 132, 80);
      for (let i = 0; i < 5; i++) for (let r = 0; r < 3; r++) { g.fillStyle = L[i] === r ? LINE_COLORS[+c.dataset.line] : '#2a2a2a'; g.fillRect(i * cw + 2, r * chh + 2, cw - 4, chh - 4); }
    });
    pt.hidden = false; $('.lk-pt-x').focus();
  }
  $('.lk-pt-b').addEventListener('click', () => { K.sfx.button(); pt.hidden ? openPaytable() : (pt.hidden = true); });
  $('.lk-pt-x').addEventListener('click', () => { pt.hidden = true; });
  pt.addEventListener('click', e => { if (e.target === pt) pt.hidden = true; });
  $('.lk-leave').addEventListener('click', () => { K.sfx.button(); api.exit(); });

  // ------------------------------------------------------------------ bet controls
  coinBtns.forEach(b => b.addEventListener('click', () => { if (busy || mode !== 'base') return; coin = +b.dataset.coin; K.sfx.chip(); syncControls(); }));
  const stepUnits = d => { const i = steps.indexOf(units); units = steps[Math.max(0, Math.min(steps.length - 1, i + d))]; K.sfx.chip(); syncControls(); if (M.lines) showLinesPreview(); };
  upBtn.addEventListener('click', () => !busy && stepUnits(1));
  dnBtn.addEventListener('click', () => !busy && stepUnits(-1));
  maxBtn.addEventListener('click', () => { if (busy || mode !== 'base') return; units = M.maxUnits; K.sfx.chip(); syncControls(); spin(); });
  spinBtn.addEventListener('click', () => { K.sfx.button(); spin(); });
  autoBtn.addEventListener('click', () => { K.sfx.button(); if (auto > 0) { auto = 0; syncControls(); return; } auto = 25; syncControls(); if (!busy) spin(); });
  cv.addEventListener('click', () => { if (busy) quickStop(); });
  function showLinesPreview() { hl = { wins: LINES25.slice(0, units).map((L, i) => ({ line: i, cells: [], pay: 0, preview: true })), t0: performance.now(), preview: true }; dirty = true; later(() => { if (hl && hl.preview) { hl = null; dirty = true; } }, 1400); }

  const onKey = e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape' && !pt.hidden) { pt.hidden = true; return; }
    const sp = e.code === 'Space' || e.key === ' ';
    if (skipBig && (sp || e.key === 'Enter')) { e.preventDefault(); skipBig(); return; }
    if (picker) { if (sp || e.key === 'Enter') { e.preventDefault(); if (!e.repeat && pt.hidden) picker.random(); } else if (picker.key) picker.key(e.key); return; }
    if (sp) { e.preventDefault(); if (e.repeat || !pt.hidden) return; if (win.shown < win.to && !busy) { win.shown = win.to; win.dur = 0; return; } spin(); }
  };
  window.addEventListener('keydown', onKey);

  // ------------------------------------------------------------------ win meter roll-up
  function rollWin(to, from = 0) { const bet = Math.max(1, fBet()); win = { from, to, t0: performance.now(), dur: Math.min(3600, 350 + Math.sqrt(Math.max(0, to - from) / bet) * 420), shown: from, lastTick: 0 }; }
  function updWin(now) {
    if (win.shown >= win.to) return;
    const t = win.dur ? Math.min(1, (now - win.t0) / win.dur) : 1;
    win.shown = t >= 1 ? win.to : win.from + (win.to - win.from) * (1 - Math.pow(1 - t, 2));
    mWin.textContent = K.fmt(Math.floor(win.shown));
    if (now - win.lastTick > 75 && t < 1) { win.lastTick = now; K.tone(1400 + 600 * t, .03, { type: 'square', vol: .03 }); }
    if (t >= 1) mWin.textContent = K.fmt(win.to);
  }
  const setWinMeter = v => { win = { from: v, to: v, t0: 0, dur: 0, shown: v, lastTick: 0 }; mWin.textContent = K.fmt(v); };

  // ------------------------------------------------------------------ reels
  const VMAX = 26;
  let reelsDone = null, anticTone = 0;
  function setDefs(d) { defs = d; reels.forEach((r, i) => { r.L = d[i].strip.length; r.pos = mod(Math.floor(r.pos), r.L); }); dirty = true; }
  function startReels(targets, anticFrom = 99) {
    const now = performance.now();
    reels.forEach((r, i) => {
      r.state = 'windup'; r.t0 = now + i * 55; r.p0 = r.pos; r.v = 0; r.target = targets[i];
      r.stopAt = now + 700 + i * 230 + (i >= anticFrom ? (i - anticFrom + 1) * 1100 : 0);
      r.antic = i >= anticFrom;
    });
    K.tone(160, .35, { type: 'sawtooth', vol: .03, slide: 260 });
    const p = new Promise(res => { reelsDone = res; }); syncControls(); return p;
  }
  function quickStop() { const now = performance.now(); let k = 0; reels.forEach(r => { if (r.state === 'windup' || r.state === 'spin') { r.stopAt = Math.min(r.stopAt, now + k++ * 70); r.antic = false; } }); }
  function beginStop(r, now) { r.state = 'stop'; r.t0 = now; r.dur = 400; r.from = r.pos; const D = Math.max(2, r.v * r.dur / 1000 / 3.2); r.to = r.target + r.L * Math.floor((r.pos - D - r.target) / r.L); }
  function updReels(now, dt) {
    let any = false;
    reels.forEach((r, i) => {
      if (r.state === 'idle') return; any = true;
      if (r.state === 'windup') { if (now < r.t0) return; const t = (now - r.t0) / 130; if (t >= 1) { r.state = 'spin'; r.v = 6; } else r.pos = r.p0 + .28 * Math.sin(t * Math.PI); r.speed = 0; return; }
      if (r.state === 'spin') {
        // suspense: an anticipating reel speeds up, then slows right down before it lands
        const left = r.stopAt - now;
        const vt = r.antic ? (left > 900 ? VMAX * 1.3 : Math.max(7, VMAX * 1.3 * left / 900)) : VMAX;
        r.v = r.v < vt ? Math.min(vt, r.v + 70 * dt) : Math.max(vt, r.v - 40 * dt); r.pos -= r.v * dt; r.speed = r.v;
        if (now >= r.stopAt) beginStop(r, now);
        return;
      }
      if (r.state === 'stop') {
        const t = Math.min(1, (now - r.t0) / r.dur), prev = r.pos;
        r.pos = r.from + (r.to - r.from) * easeOutBack(t); r.speed = dt > 0 ? Math.abs(r.pos - prev) / dt : 0;
        if (t >= 1) { r.pos = mod(r.target, r.L); r.state = 'idle'; r.antic = false; r.speed = 0; K.sfx.reelStop(); onReelStopped(i); if (reels.every(q => q.state === 'idle')) syncControls(); }
      }
    });
    if (reels.some(r => r.antic && r.state === 'spin') && now - anticTone > 140) { anticTone = now; K.tone(500 + (now / 3 % 400), .1, { type: 'triangle', vol: .05 }); if (DR) SND.rim(); }
    if (any && reels.every(r => r.state === 'idle') && reelsDone) { const f = reelsDone; reelsDone = null; f(); }
    return any;
  }
  function onReelStopped(i) {
    if (!curGrid) return;
    const col = curGrid[i];
    if (PL) { if (col.includes('coin')) SND.clink(0, 1 + col.filter(s => s === 'coin').length * .08); if (col.includes('map')) K.tone(1046, .18, { type: 'triangle', vol: .1 }); }
    if (BR) { if (col.includes('wolf')) SND.growl(); if (col.includes('bonus')) K.tone(1318, .16, { type: 'triangle', vol: .1 }); if (i < 4 && col.some(s => s === 'pigB' || s === 'pigW' || s === 'pigS') && K.rand(4) === 0) SND.oink(); }
    if (DR) { SND.drum(0, false); if (col.includes('ingot')) { K.tone(1175, .3, { type: 'triangle', vol: .1 }); K.tone(1568, .25, { type: 'sine', vol: .06, delay: .06 }); } }
  }
  function anticFor(grid) {
    if (PL) {
      const coins = k => grid.slice(0, k).flat().filter(s => s === 'coin').length;
      if (coins(3) >= 4) return 3; if (coins(4) >= 5) return 4;
      if (grid[1].includes('map') && grid[2].includes('map')) return 3;
    }
    if (BR) {
      if (grid[0].includes('bonus') && grid[2].includes('bonus')) return 4;
      if (grid.slice(0, 4).flat().filter(s => s === 'hS' || s === 'hW' || s === 'hB').length >= 3) return 4;
    }
    if (DR) { let n = 0; for (let i = 0; i < 4; i++) { n += grid[i].filter(s => s === 'ingot').length; if (n >= 2) return i + 1; } }
    return 99;
  }

  // ------------------------------------------------------------------ drawing
  const cellX = i => i * (G.cw + G.gap), cellY = r => r * G.ch;
  function drawReel(i, now) {
    const r = reels[i], d = defs[i], x = cellX(i), { cw, ch } = G;
    ctx.save(); ctx.beginPath(); ctx.rect(x, 0, cw, G.H); ctx.clip();
    ctx.fillStyle = bgGrad; ctx.fillRect(x, 0, cw, G.H);
    const base = Math.floor(r.pos), frac = r.pos - base, blur = r.speed > 7;
    for (let k = 0; k <= 3; k++) {
      const sym = d.strip[mod(base + k, r.L)], img = blur ? blurs[sym] : sprites[sym];
      if (img) ctx.drawImage(img, x, (k - frac) * ch, cw, ch);
    }
    if (r.state === 'idle' && vals && vals[i]) for (let k = 0; k < 3; k++) if (vals[i][k]) drawCoinVal(vals[i][k], x, k * ch);
    ctx.fillStyle = shadeGrad; ctx.fillRect(x, 0, cw, G.H);
    if (r.antic) { const a = .45 + .3 * Math.sin(now / 90); ctx.strokeStyle = M.light ? `rgba(240,60,140,${a})` : `rgba(255,220,80,${a})`; ctx.lineWidth = 6; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14; ctx.strokeRect(x + 3, 3, cw - 6, G.H - 6); }
    ctx.restore();
  }
  function plate(label, x, y, fsz, fill, ink = 'rgba(255,255,255,.95)') {
    ctx.save(); ctx.font = `400 ${fsz}px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, fsz * .3); ctx.strokeStyle = ink; ctx.strokeText(label, x, y); ctx.fillStyle = fill; ctx.fillText(label, x, y); ctx.restore();
  }
  function drawCoinVal(v, x, y) {
    const { cw, ch } = G, s = Math.min(cw, ch), t = v.j || fmtShort(v.m * fBet());
    plate(t, x + cw / 2, y + ch / 2 + 1, Math.round(s * (v.j ? .17 : t.length > 4 ? .2 : .24)), v.j ? JP_COL[v.j] : '#0a3a4a');
  }
  function drawHighlights(now) {
    if (!hl) return;
    const { wins } = hl, cyc = wins.length > 1 && !hl.preview, all = (now - hl.t0) < 1600 || !cyc;
    const showing = all ? wins : [wins[Math.floor((now - hl.t0 - 1600) / 1300) % wins.length]];
    const pulse = .6 + .4 * Math.sin(now / 130);
    if (!all) {
      ctx.save(); ctx.fillStyle = M.light ? 'rgba(30,40,80,.4)' : 'rgba(0,0,0,.5)'; const on = new Set(); showing.forEach(w => w.cells.forEach(([i, r]) => on.add(i + ',' + r)));
      for (let i = 0; i < 5; i++) for (let r = 0; r < 3; r++) if (!on.has(i + ',' + r)) ctx.fillRect(cellX(i), cellY(r), G.cw, G.ch);
      ctx.restore();
    }
    showing.forEach((w, k) => {
      const col = w.line >= 0 ? LINE_COLORS[w.line] : w.scatter ? '#ffe24a' : LINE_COLORS[(wins.indexOf(w) * 3 + 2) % LINE_COLORS.length];
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (w.line >= 0) {
        const L = LINES25[w.line]; ctx.globalAlpha = .9; ctx.lineWidth = Math.max(3, G.ch * .045);
        ctx.beginPath(); L.forEach((r, i) => { const px = cellX(i) + G.cw / 2, py = cellY(r) + G.ch / 2; if (i === 0) ctx.moveTo(px - G.cw / 2, py); ctx.lineTo(px, py); if (i === L.length - 1) ctx.lineTo(px + G.cw / 2, py); }); ctx.stroke();
      }
      ctx.globalAlpha = pulse; ctx.lineWidth = Math.max(3, G.ch * .05);
      for (const [i, r] of w.cells) { rr(ctx, cellX(i) + 3, cellY(r) + 3, G.cw - 6, G.ch - 6, 8); ctx.stroke(); }
      ctx.restore();
      if (!all && w.pay > 0) {
        const [i, r] = w.cells[w.cells.length - 1], label = K.fmt(w.pay), fs = Math.max(12, Math.round(Math.min(G.cw, G.ch) * .18));
        ctx.save(); ctx.font = `400 ${fs}px ${FD}`; const tw = ctx.measureText(label).width + fs;
        const px = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, cellX(i) + G.cw / 2)), py = Math.min(G.H - fs, cellY(r) + G.ch - fs * .9);
        ctx.fillStyle = 'rgba(0,0,0,.82)'; rr(ctx, px - tw / 2, py - fs * .75, tw, fs * 1.5, fs * .5); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, px, py + 1); ctx.restore();
      }
    });
    if (!all) { const w = showing[0]; if (w && w.label && hl.lastShown !== w) { hl.lastShown = w; msg(`${w.line >= 0 ? `Line ${w.line + 1}: ` : ''}${w.label} — ${K.fmt(w.pay)}`, 'win'); } }
  }
  function drawHold(now) {
    const { cw, ch } = G;
    ctx.fillStyle = '#020a14'; ctx.fillRect(0, 0, G.W, G.H);
    for (let i = 0; i < 5; i++) for (let r = 0; r < 3; r++) {
      const idx = i * 3 + r, x = cellX(i), y = cellY(r), v = hold.cells[idx];
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
      ctx.fillStyle = lin(ctx, 0, y, 0, y + ch, [[0, '#04182a'], [.5, '#0b3a52'], [1, '#04182a']]); ctx.fillRect(x, y, cw, ch);
      if (v) {
        const pop = hold.pop[idx] ? Math.max(0, 1 - (now - hold.pop[idx]) / 350) : 0, sc = 1 + pop * .3;
        ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(sc, sc); ctx.drawImage(v.j ? sprites.ball : sprites.coin, -cw / 2, -ch / 2, cw, ch); ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        if (v.j) plate(v.j, x + cw / 2, y + ch / 2 + 1, Math.round(Math.min(cw, ch) * .17), JP_COL[v.j], '#fff'); else drawCoinVal(v, x, y);
        if (hold.flash === idx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.shadowColor = '#2ad4c4'; ctx.shadowBlur = 16; ctx.strokeRect(x + 3, y + 3, cw - 6, ch - 6); }
      } else if (hold.spinning.has(idx)) {
        const off = ((now / 1000 * 9 + idx * .37) % 2) - 1;
        ctx.globalAlpha = .6; ctx.drawImage(blurs.coin, x, y + off * ch * 1.4, cw, ch); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(42,212,196,.55)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
      ctx.restore();
    }
    // respin pips
    const pr = Math.max(5, G.ch * .05);
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(G.W / 2 + (k - 1) * pr * 3, pr * 1.6, pr, 0, TAU); ctx.fillStyle = k < hold.respins ? '#2ad4c4' : 'rgba(255,255,255,.15)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  }
  // ---- the wolf: zoom in, cheeks puff up, then he blows a gale across the reels
  const WOLF_T = { zoom: 450, puff: 1450, blowEnd: 2900, end: 3400 };
  function drawWolf(now, dt) {
    const F = wolfFx, T = now - F.t0, { cw, ch } = G, wx = cellX(4) + cw / 2, wy = cellY(F.row) + ch / 2;
    for (const h of F.houses) {
      const x = cellX(h.i), y = cellY(h.r), hit = WOLF_T.puff + 60 + (4 - h.i) * 130;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
      const shake = T > WOLF_T.puff && T < hit + 400 ? Math.sin(T / 22 + h.r) * Math.min(4, (T - WOLF_T.puff) / 60) : 0;
      if (h.kind !== 'hB') {
        ctx.fillStyle = bgGrad; ctx.fillRect(x, y, cw, ch);
        if (T < hit + 900) {
          const k = Math.max(0, (T - hit) / 800);
          ctx.globalAlpha = Math.max(0, 1 - k * 1.1); ctx.translate(x + cw / 2 + shake - k * k * cw * 2.6, y + ch / 2 - k * ch * .6); ctx.rotate(-k * 1.6); ctx.scale(1 - k * .3, 1 - k * .3);
          ctx.drawImage(sprites[h.kind], -cw / 2, -ch / 2, cw, ch);
          if (k > 0 && !h.burst) { h.burst = true; for (let q = 0; q < 14; q++) F.parts.push({ x: x + cw * (.2 + Math.random() * .6), y: y + ch * (.3 + Math.random() * .6), vx: -(200 + Math.random() * 500), vy: (Math.random() - .6) * 160, life: 1, bit: h.kind === 'hS' ? '#f2d060' : '#a0602a', w: 2 + Math.random() * 5 }); }
        }
      } else {
        const up = h.mansion && T > hit + 300;
        if (up) { ctx.fillStyle = bgGrad; ctx.fillRect(x, y, cw, ch); ctx.drawImage(sprites.mansion, x, y, cw, ch); const f = Math.max(0, 1 - (T - hit - 300) / 500); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(x, y, cw, ch); } }
        else if (shake) { ctx.fillStyle = bgGrad; ctx.fillRect(x, y, cw, ch); ctx.drawImage(sprites.hB, x + shake * .5, y, cw, ch); }
      }
      ctx.restore();
      if (h.amt > 0 && T > hit + (h.mansion ? 600 : 300)) {
        const k = Math.min(1, (T - hit - (h.mansion ? 600 : 300)) / 260), s = easeOutBack(k), label = h.v.j || fmtShort(h.amt);
        ctx.save(); ctx.translate(x + cw / 2, y + ch * (h.mansion ? .78 : .5)); ctx.scale(s, s);
        const fs = Math.round(Math.min(cw, ch) * (h.v.j ? .17 : .22)); ctx.font = `400 ${fs}px ${FD}`; const tw = ctx.measureText(label).width + fs * .9;
        rr(ctx, -tw / 2, -fs * .8, tw, fs * 1.6, fs * .5); ctx.fillStyle = h.v.j ? JP_COL[h.v.j] : '#c0185a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1); ctx.restore();
      }
    }
    // gusts and flying straw
    if (T > WOLF_T.puff && T < WOLF_T.blowEnd) for (let q = 0; q < 7; q++) { const y0 = wy + ch * .2 + (Math.random() - .5) * ch * .25, vx = -(G.W * (1 + Math.random() * .9)); F.parts.push({ x: wx - cw * .25, y: y0, vx, vy: (Math.random() * G.H - y0) * -vx / (wx + 1), life: 1.15, len: 14 + Math.random() * 36 }); }
    ctx.save(); ctx.lineCap = 'round';
    for (const p of F.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * (p.bit ? .8 : 1.1);
      if (p.bit) { p.vy += 300 * dt; ctx.fillStyle = p.bit; ctx.globalAlpha = Math.max(0, p.life); ctx.fillRect(p.x, p.y, p.w, 1.6); continue; }
      const a = Math.max(0, Math.min(1, p.life)), sl = p.vy / -p.vx;
      ctx.globalAlpha = a * .55; ctx.strokeStyle = '#4a8ad8'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + p.len * .5, p.y - 5 - sl * p.len * .5, p.x + p.len, p.y - sl * p.len); ctx.stroke();
      ctx.globalAlpha = a * .95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    }
    F.parts = F.parts.filter(p => p.life > 0 && p.x > -60);
    ctx.restore();
    // the wolf himself
    if (T < WOLF_T.end) {
      let sc = 1, puff = 0, open = 0;
      if (T < WOLF_T.zoom) sc = 1 + .5 * easeOutBack(T / WOLF_T.zoom);
      else if (T < WOLF_T.puff) { sc = 1.5 + .06 * Math.sin(T / 60); const k = (T - WOLF_T.zoom) / (WOLF_T.puff - WOLF_T.zoom); puff = Math.min(1, k * 1.15) * (1 + .06 * Math.sin(T / 45)); }
      else if (T < WOLF_T.blowEnd) { sc = 1.5; const k = (T - WOLF_T.puff) / (WOLF_T.blowEnd - WOLF_T.puff); puff = Math.max(0, 1 - k * 1.3); open = 1; }
      else sc = 1.5 - .5 * (T - WOLF_T.blowEnd) / (WOLF_T.end - WOLF_T.blowEnd);
      const s = Math.min(cw, ch) * .88 * sc, px = wx - (sc - 1) * cw * .35, py = Math.max(s / 2, Math.min(G.H - s / 2, wy));
      ctx.save(); ctx.translate(px - s / 2, py - s / 2); ctx.scale(s / 100, s / 100); pWolf(ctx, puff, open, true); ctx.restore();
    }
  }
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const moving = updReels(now, dt); updWin(now);
    const wolfLive = wolfFx && (now - wolfFx.t0 < WOLF_T.end + 1500 || wolfFx.parts.length);
    if (!(moving || hl || dirty || mode === 'hold' || wolfLive || reels.some(r => r.antic))) return;
    dirty = false;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, G.W, G.H);
    if (mode === 'hold' && hold) { drawHold(now); return; }
    for (let i = 0; i < 5; i++) drawReel(i, now);
    if (wolfFx) drawWolf(now, dt);
    drawHighlights(now);
  }

  // ------------------------------------------------------------------ effects
  function card(title, sub, ms = 1800) { ovl.innerHTML = `<div class="lk-card"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; if (ms) later(() => { ovl.innerHTML = ''; }, ms); }
  function coinShower(n = 28) {
    const fx = $('.lk-fx');
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'lk-coin'; c.style.left = (Math.random() * 100) + '%'; c.style.animationDuration = (1.4 + Math.random() * 1.4) + 's'; c.style.animationDelay = (Math.random() * .8) + 's'; const s = 20 + Math.random() * 18; c.style.width = c.style.height = s + 'px'; fx.appendChild(c); later(() => c.remove(), 3400); }
  }
  function shake() { const c = $('.lk-cab'); c.classList.remove('lk-shake'); void c.offsetWidth; c.classList.add('lk-shake'); }
  // Big-win celebration: the amount counts up and the title steps BIG -> MEGA -> EPIC as it passes each mark.
  function bigWin(amount, bet) {
    const x = amount / Math.max(1, bet); if (x < 10 || !alive) return Promise.resolve();
    const tiers = [[10, 'BIG WIN'], [25, 'MEGA WIN'], [50, 'EPIC WIN']];
    const ov = document.createElement('div'); ov.className = 'lk-bw'; ov.innerHTML = `<div class="lk-bw-in"><b class="t">BIG WIN</b><b class="n">$0</b><small>Tap or press Space to skip</small></div>`;
    el.appendChild(ov); el.classList.add('winning');
    const tEl = ov.querySelector('.t'), nEl = ov.querySelector('.n'), dur = Math.min(7000, 2400 + Math.sqrt(x) * 520), t0 = performance.now();
    let tier = 0, lastTick = 0; K.sfx.bigWin(); coinShower(30);
    return new Promise(res => {
      let done = false;
      const finish = () => { if (done) return; done = true; skipBig = null; nEl.textContent = K.fmt(amount); tEl.textContent = tiers.filter(t => x >= t[0]).pop()[1]; later(() => { ov.remove(); el.classList.remove('winning'); res(); }, 1300); };
      skipBig = finish; ov.addEventListener('pointerdown', finish);
      const step = () => {
        if (done) return;
        const t = Math.min(1, (performance.now() - t0) / dur), v = amount * (1 - Math.pow(1 - t, 2.2));
        nEl.textContent = K.fmt(Math.floor(v));
        while (tier + 1 < tiers.length && v / bet >= tiers[tier + 1][0]) { tier++; tEl.textContent = tiers[tier][1]; tEl.classList.remove('up'); void tEl.offsetWidth; tEl.classList.add('up'); coinShower(24); K.sfx.bigWin(); if (DR) SND.gong(); }
        const now = performance.now(); if (now - lastTick > 85) { lastTick = now; K.tone(900 + 900 * t, .03, { type: 'square', vol: .035 }); }
        if (t >= 1) finish(); else later(step, 33);
      };
      step();
    });
  }
  function winText(s) {
    if (s.wins.length === 1) { const w = s.wins[0]; return `${w.line >= 0 ? `Line ${w.line + 1}: ` : ''}${w.label} pays ${K.fmt(w.pay)}`; }
    return `${s.wins.length} wins pay ${K.fmt(s.pay)}`;
  }
  const featureMsg = t => { mx.textContent = t; };

  // ------------------------------------------------------------------ one spin's reveal (base or free)
  async function playSpin(s) {
    hl = null; wolfFx = null; dirty = true; curGrid = s.grid; vals = PL ? s.vals : null;
    await startReels(s.stops, anticFor(s.grid));
    if (!alive) return null;
    dirty = true; let paid = 0;
    if (s.wins.length) { paid += pay(s.pay); hl = { wins: s.wins, t0: performance.now() }; msg(winText(s), 'win'); if (s.pay >= fBet() * 3) K.sfx.win(); else K.tone(988, .12, { type: 'triangle', vol: .08 }); }
    if (BR && s.wolf) {
      if (s.wins.length) await sleep(1200);
      if (!alive) return null;
      const keep = hl; hl = null;
      wolfFx = { t0: performance.now(), row: s.wolf.row, houses: s.wolf.houses.map(h => ({ ...h })), parts: [] };
      msg('The Big Bad Wolf huffs…', 'gold'); SND.growl(); later(SND.inhale, WOLF_T.zoom); later(() => { SND.blow(); msg('…and he PUFFS!', 'gold'); }, WOLF_T.puff);
      await sleep(WOLF_T.end + 250); if (!alive) return null;
      const n = s.wolf.houses.filter(h => h.amt > 0).length, mans = s.wolf.houses.filter(h => h.mansion);
      if (mans.length) { const j = mans.find(h => h.v.j); if (j) { flashJp(j.v.j); card(`${j.v.j}!`, `The mansion pays ${K.fmt(j.amt)}`, 2000); } }
      if (s.wolf.pay > 0) { paid += pay(s.wolf.pay); msg(`Blown away! ${n} house${n > 1 ? 's' : ''} paid ${K.fmt(s.wolf.pay)}`, 'win'); K.sfx.win(); K.sfx.chips(6); }
      else msg(s.wolf.houses.length ? 'The brick houses stood firm!' : 'Nothing here to blow down!', '');
      hl = keep; if (hl) hl.t0 = performance.now() - 1600;
      await sleep(900);
    }
    return paid;
  }

  // ------------------------------------------------------------------ the paid spin
  async function spin() {
    if (!alive || mode !== 'base') return;
    if (busy) { quickStop(); return; }
    if (!pt.hidden) pt.hidden = true;
    const bet = totalBet();
    if (!api.bet(bet)) { msg(`Not enough credits for a ${K.fmt(bet)} bet — lower the coin or ${M.unitName.toLowerCase()}.`, 'lose'); K.sfx.lose(); auto = 0; syncControls(); return; }
    busy = true; ovl.innerHTML = ''; setWinMeter(0); roundWon = 0; featBet = bet;
    const o = { coin, lines: units, units };
    if (PL) { meters = loadMeters(); meters.MAJOR += PL_PROG.MAJOR.rate; meters.GRAND += PL_PROG.GRAND.rate; frozen = { ...meters }; o.meters = meters; }
    const plan = M.plan(R, o);
    if (PL) saveMeters(meters); // jackpot resets inside this plan are stored at once
    owed += plan.total;
    if (DR && plan.spin.fs) pendingFree = o;
    msg('Good luck!', '');
    const base = await playSpin(plan.spin);
    if (base == null) return;
    const trig = plan.spin.hold || plan.spin.fs || plan.spin.bonus || plan.spin.drum;
    if (!plan.spin.wins.length && !(plan.spin.wolf && plan.spin.wolf.pay)) msg(trig ? 'Feature!' : 'No win — try again.', trig ? 'gold' : '');
    let feat = false;
    if (plan.spin.hold) { feat = true; await sleep(700); await runHold(plan.spin.hold); }
    if (DR && plan.spin.drum) { feat = true; await sleep(500); await runDrumBonus(plan.spin.drum); }
    if (PL && plan.spin.fs) { feat = true; await runFree(plan.free, { title: `${PL_FS} FREE GAMES`, sub: 'The Captain sails in stacks!' }); }
    if (BR && plan.spin.bonus) { feat = true; await runPickHouse(plan.spin.bonus); await runFree(plan.free, { title: `${plan.free.length} FREE GAMES`, sub: 'More houses, more wolves' }); }
    if (DR && plan.spin.fs) { feat = true; await runDrumFree(plan.spin); }
    if (!alive) return;
    if (owed > 0) pay(owed);
    frozen = null; featBet = 0;
    if (feat) { mode = 'base'; setDefs(M.reels); featureMsg(''); }
    syncControls();
    if (roundWon >= bet * 10) await bigWin(roundWon, bet);
    else if (feat && roundWon > 0) { K.sfx.bigWin(); }
    if (!alive) return;
    if (feat) msg(`Feature paid ${K.fmt(roundWon)} in total`, 'win');
    busy = false; syncControls();
    if (auto > 0) {
      auto--; syncControls();
      if (roundWon >= bet * 25 || feat) { auto = 0; syncControls(); msg(feat ? `Auto play stopped for the feature — it paid ${K.fmt(roundWon)}.` : 'Auto play stopped on a big win.', 'gold'); }
      else if (auto > 0) later(() => { if (!busy && auto > 0) spin(); }, roundWon > 0 ? 900 : 380);
    }
  }

  // ------------------------------------------------------------------ free games (Plunder, Breeze)
  async function runFree(list, { title, sub }) {
    if (!alive) return;
    K.sfx.bigWin(); if (PL) SND.thunder(); card(title, sub, 2200); el.classList.add('winning');
    await sleep(2300); if (!alive) return;
    mode = 'free'; hl = null; setDefs(M.freeReels); syncControls();
    let total = list.length;
    const start = roundWon;
    for (let k = 0; k < list.length && alive; k++) {
      const s = list[k];
      featureMsg(`FREE GAME ${k + 1} of ${total} · WON ${K.fmt(roundWon - start)}`); msg(`Free game ${k + 1} of ${total}`, 'gold');
      const p = await playSpin(s); if (p == null) return;
      if (s.hold) { await sleep(600); await runHold(s.hold); if (!alive) return; mode = 'free'; syncControls(); }
      if (PL && s.fs) { total += PL_FS; card(`+${PL_FS} FREE GAMES`, 'Another treasure map!', 1600); K.sfx.bigWin(); await sleep(1600); }
      featureMsg(`FREE GAME ${k + 1} of ${total} · WON ${K.fmt(roundWon - start)}`);
      await sleep(s.pay > 0 || s.wolf ? Math.min(2000, win.dur + 400) : 600);
    }
    if (!alive) return;
    el.classList.remove('winning');
    card('FREE GAMES COMPLETE', `You won ${K.fmt(roundWon - start)}`, 2400); K.sfx.win(); msg(`Free games paid ${K.fmt(roundWon - start)}`, 'win');
    await sleep(2500);
  }

  // ------------------------------------------------------------------ Hold & Spin (Plunder)
  async function runHold(h) {
    if (!alive) return;
    const prev = mode, n0 = h.init.filter(Boolean).length;
    hold = { cells: h.init.slice(), spinning: new Set(), pop: {}, flash: -1, respins: 3 };
    SND.cannon(); shake(); K.sfx.bigWin(); card('HOLD & SPIN', `${n0} doubloons locked · 3 respins`, 2000);
    await sleep(2100); if (!alive) return;
    mode = 'hold'; hl = null; syncControls(); dirty = true;
    for (const step of h.steps) {
      hold.respins--;
      msg(`Respins left: ${hold.respins} · ${hold.cells.filter(Boolean).length} doubloons`, 'gold');
      featureMsg(`HOLD & SPIN · ${hold.cells.filter(Boolean).length} OF 15 · FILL THEM ALL FOR THE GRAND`);
      const empties = hold.cells.map((c, i) => c ? -1 : i).filter(i => i >= 0), got = new Map(step);
      empties.forEach(i => hold.spinning.add(i));
      K.tone(200, .4, { type: 'sawtooth', vol: .025, slide: 300 });
      await sleep(550);
      for (const i of empties) {
        if (!alive) return;
        hold.spinning.delete(i);
        if (got.has(i)) { hold.cells[i] = got.get(i); hold.pop[i] = performance.now(); SND.clink(0, 1 + hold.cells.filter(Boolean).length * .03); if (got.get(i).j) SND.cannon(); await sleep(170); }
        else await sleep(45);
      }
      if (step.length) { hold.respins = 3; msg(`+${step.length} doubloon${step.length > 1 ? 's' : ''}! Respins reset to 3`, 'win'); }
      else K.sfx.reelStop();
      await sleep(650);
    }
    if (!alive) return;
    msg('Collecting doubloons…', 'gold');
    for (let idx = 0; idx < 15; idx++) {
      const v = hold.cells[idx]; if (!v) continue;
      hold.flash = idx; pay(h.amts[idx]); SND.clink(0, .8 + idx * .04);
      if (v.j) { flashJp(v.j); card(v.j, K.fmt(h.amts[idx]), 1300); K.sfx.win(); await sleep(1000); }
      await sleep(240); if (!alive) return;
    }
    hold.flash = -1;
    if (h.full) { flashJp('GRAND'); card('GRAND JACKPOT!', K.fmt(h.grand), 3500); K.banner(el, 'GRAND!'); SND.thunder(); SND.cannon(.3); K.sfx.bigWin(); coinShower(80); pay(h.grand); await sleep(2200); }
    const tt = h.total;
    card('HOLD & SPIN WIN', K.fmt(tt), 2400); msg(`Hold & Spin paid ${K.fmt(tt)}`, 'win'); K.sfx.win();
    await sleep(2500); if (!alive) return;
    if (PL) { frozen = { ...frozen, ...(h.full ? { GRAND: PL_PROG.GRAND.seed } : {}), ...(h.cells.some(c => c && c.j === 'MAJOR') ? { MAJOR: PL_PROG.MAJOR.seed } : {}) }; updJps(); }
    mode = prev; hold = null; dirty = true; syncControls();
  }

  // ------------------------------------------------------------------ feature layers (full-screen pickers)
  function layer(html) { const d = document.createElement('div'); d.className = 'lk-layer'; d.innerHTML = `<div class="lk-lin">${html}</div>`; el.appendChild(d); return d; }

  // Pick-a-House (Breeze): the award is already decided; the house you pick only reveals it.
  async function runPickHouse(b) {
    if (!alive) return;
    hl = { wins: [{ line: -1, cells: b.cells, pay: 0, scatter: true, label: 'Three Blueprints' }], t0: performance.now() };
    K.sfx.bigWin(); SND.oink(); SND.oink(.3); card('PICK-A-HOUSE BONUS', 'Three blueprints!', 2000);
    await sleep(2100); if (!alive) return;
    mode = 'pick'; syncControls();
    const kinds = ['straw', 'wood', 'brick'];
    const L = layer(`<canvas class="lk-wolfmini"></canvas><h2>PICK A HOUSE</h2><p>The wolf will blow it down to reveal your free games.</p>
      <div class="lk-picks">${kinds.map((k, i) => `<button type="button" class="lk-pick-b" data-i="${i}"><canvas></canvas><span>${k[0].toUpperCase() + k.slice(1)} house</span><em></em></button>`).join('')}</div><p class="lk-tip">Tap a house (or press Space)</p>`);
    const btns = [...L.querySelectorAll('.lk-pick-b')];
    btns.forEach((bt, i) => paintCanvas(bt.querySelector('canvas'), c => pHouse(c, kinds[i]), 150));
    const wm = L.querySelector('.lk-wolfmini'), wolfPose = (pf, op) => paintCanvas(wm, c => pWolf(c, pf, op), 96); wolfPose(0, 0);
    await new Promise(res => {
      const choose = i => {
        if (!picker) return; picker = null;
        btns[i].classList.add('blow', 'won'); SND.inhale(); later(SND.blow, 500);
        [[.4, 0, 0], [.8, 0, 150], [1, 0, 300], [.6, 1, 520], [.2, 1, 900], [0, 0, 1500]].forEach(([pf, op, t]) => later(() => wolfPose(pf, op), t));
        later(() => { btns[i].querySelector('em').textContent = `${b.n} FREE GAMES`; K.sfx.win(); }, 1000);
        later(() => { let k = 0; btns.forEach((bt, j) => { if (j !== i) { bt.classList.add('dim'); bt.querySelector('em').textContent = `${b.others[k++]} games`; } }); }, 1700);
        later(res, 3200);
      };
      picker = { random: () => choose(K.rand(3)) };
      btns.forEach((bt, i) => bt.addEventListener('click', () => choose(i)));
    });
    if (!alive) return;
    L.remove(); hl = null;
  }

  // Drum bonus: drums strike, then pick gold coins until three jackpot symbols match.
  async function runDrumBonus(d) {
    if (!alive) return;
    const prev = mode; mode = 'pick'; syncControls();
    const L = layer(`<h2>DRUM BONUS</h2><canvas class="lk-drumcv"></canvas><p>The festival drums are calling…</p>`);
    const dc = L.querySelector('canvas'); paintCanvas(dc, c => { c.translate(0, 8); drumBody(c, 'BONUS'); }, 260);
    for (let k = 0; k < 4; k++) later(() => { dc.classList.remove('beat'); void dc.offsetWidth; dc.classList.add('beat'); SND.drum(0, k === 3); if (k === 3) SND.cymbal(.05); }, k * 330);
    later(() => SND.gong(), 1400);
    await sleep(2300); if (!alive) return;
    const bet = fBet();
    L.querySelector('.lk-lin').innerHTML = `<h2>MATCH 3 TO WIN</h2>
      <div class="lk-tiers">${DR_TIERS.map(t => `<div class="lk-tier" data-t="${t}" style="color:${JP_COL[t] === '#e8a800' ? '#ffd34a' : JP_COL[t] === '#d81a2a' ? '#ff6a5a' : JP_COL[t] === '#1a6ad8' ? '#7ad0ff' : JP_COL[t] === '#1a9a4a' ? '#9dffb0' : '#e0a8ff'}"><span>${t}</span><b>${fmtShort(DR_JP[t] * bet)}</b><u><i></i><i></i><i></i></u></div>`).join('')}</div>
      <div class="lk-board">${Array.from({ length: 15 }, (_, i) => `<button type="button" class="lk-gc" data-i="${i}" aria-label="Gold coin ${i + 1}"><canvas></canvas><div class="em"></div></button>`).join('')}</div><p>Pick a gold coin (or press Space)</p>`;
    const coins = [...L.querySelectorAll('.lk-gc')];
    coins.forEach(b => paintCanvas(b.querySelector('canvas'), c => pCoinCN(c), 110));
    const found = {}; let k = 0;
    const show = (b, t, ghost) => { const em = b.querySelector('.em'); em.textContent = t; em.style.setProperty('--tc', JP_COL[t]); b.classList.add('open'); if (ghost) b.classList.add('ghost'); b.disabled = true; };
    await new Promise(res => {
      const open = b => {
        if (!picker || b.disabled) return;
        const t = d.seq[k++]; show(b, t); found[t] = (found[t] || 0) + 1;
        const tier = L.querySelector(`.lk-tier[data-t="${t}"]`); tier.querySelectorAll('i').forEach((p, j) => p.classList.toggle('on', j < found[t]));
        SND.drum(0, found[t] === 2); SND.clink(.05, 1 + found[t] * .15);
        if (k >= d.seq.length) {
          picker = null; tier.classList.add('won'); coins.filter(c => c.classList.contains('open') && c.querySelector('.em').textContent === t).forEach(c => c.classList.add('hit'));
          later(() => { const rest = coins.filter(c => !c.disabled); rest.forEach((c, j) => show(c, d.left[j], true)); SND.gong(); }, 900);
          later(res, 2600);
        }
      };
      picker = { random: () => { const free = coins.filter(c => !c.disabled); if (free.length) open(free[K.rand(free.length)]); } };
      coins.forEach(b => b.addEventListener('click', () => open(b)));
    });
    if (!alive) return;
    L.remove(); mode = prev; syncControls();
    flashJp(d.tier); pay(d.amt); card(`${d.tier} JACKPOT`, K.fmt(d.amt), 2600); if (d.tier === 'GRAND' || d.tier === 'MAJOR') { K.banner(el, d.tier + '!'); SND.gong(.4); } coinShower(d.tier === 'GRAND' || d.tier === 'MAJOR' ? 70 : 30); K.sfx.bigWin();
    msg(`Drum bonus: ${d.tier} pays ${K.fmt(d.amt)}`, 'win');
    await sleep(2700);
  }

  // Free games with a volatility choice (Drum)
  async function runDrumFree(s) {
    if (!alive) return;
    hl = { wins: s.wins.filter(w => w.scatter), t0: performance.now() }; dirty = true;
    SND.gong(); K.sfx.bigWin(); card('FREE GAMES!', 'Gold ingots — choose your festival', 2000);
    await sleep(2100); if (!alive) return;
    mode = 'pick'; syncControls();
    const L = layer(`<h2>CHOOSE YOUR FREE GAMES</h2><p>All three are worth the same on average — pick the ride you like.</p>
      <div class="lk-opts">${DR_OPTS.map((o, i) => `<button type="button" class="lk-opt" data-i="${i}"><big>${o.n}</big><b>${o.name}</b><i>×${o.mults.join(' ×')}</i><small>${o.tip}</small><kbd>${i + 1}</kbd></button>`).join('')}</div>`);
    const opt = await new Promise(res => {
      const go = i => { if (!picker) return; picker = null; SND.drum(0, true); SND.cymbal(.1); res(i); };
      picker = { random: () => go(1), key: k => { if (/^[123]$/.test(k)) go(+k - 1); } };
      L.querySelectorAll('.lk-opt').forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
    });
    if (!alive) return;
    L.remove();
    const o = pendingFree, f = drPlanFree(R, o, opt); pendingFree = null; owed += f.total;
    const O = DR_OPTS[opt]; mode = 'free'; hl = null; syncControls();
    card(`${O.n} FREE GAMES`, `${O.name} · ×${O.mults.join(' ×')}`, 1800); await sleep(1900);
    const start = roundWon;
    for (let k = 0; k < f.free.length && alive; k++) {
      const fs = f.free[k]; fsMult = fs.mult;
      featureMsg(`FREE GAME ${k + 1} of ${O.n} · ×${fs.mult} · WON ${K.fmt(roundWon - start)}`); msg(`Free game ${k + 1} of ${O.n} — wins ×${fs.mult}`, 'gold');
      card(`×${fs.mult}`, '', 650); SND.drum(0, fs.mult >= 5); await sleep(500);
      const p = await playSpin(fs); if (p == null) return;
      featureMsg(`FREE GAME ${k + 1} of ${O.n} · ×${fs.mult} · WON ${K.fmt(roundWon - start)}`);
      await sleep(fs.pay > 0 ? Math.min(2000, win.dur + 400) : 550);
    }
    if (!alive) return;
    fsMult = 0;
    SND.gong(); card('FREE GAMES COMPLETE', `You won ${K.fmt(roundWon - start)}`, 2400); msg(`Free games paid ${K.fmt(roundWon - start)}`, 'win');
    await sleep(2500);
  }

  // ------------------------------------------------------------------ boot
  if (PL) vals = reels.map((r, i) => [0, 1, 2].map(k => defs[i].strip[mod(Math.floor(r.pos) + k, r.L)] === 'coin' ? { ...pickW(R, PL_COIN, PL_COIN_T) } : null)); // show values on the opening screen
  syncControls(); setWinMeter(0); layout(); raf = requestAnimationFrame(frame);
  msg(M.lines ? `${units} lines · ${K.fmt(coin)} per line — press SPIN or Space` : `243 ways · ${K.fmt(totalBet())} bet — press SPIN or Space`);
  return {
    unmount() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); ro.disconnect();
      window.removeEventListener('keydown', onKey); if (unsubBal) unsubBal();
      // Leaving mid-feature: the outcome was settled when the spin started, so pay whatever is still owed.
      if (pendingFree) { owed += drPlanFree(R, pendingFree, 0).total; pendingFree = null; }
      if (owed > 0) { const x = Math.round(owed); owed = 0; api.win(x); }
      reelsDone = null; picker = null; skipBig = null; root.innerHTML = '';
    }
  };
}

// =====================================================================================================
// Exports
// =====================================================================================================
export const machines = MACHINES.map(M => ({
  id: M.id, title: M.title, kind: 'slot', order: M.order, blurb: M.blurb, theme: { ...M.theme, reels: 5 },
  mount(root, api) { return mountLink(M, root, api); }
}));
export const [piratesPlunder, bigBadBreeze, drumOfFortune] = machines;
export default machines[0];

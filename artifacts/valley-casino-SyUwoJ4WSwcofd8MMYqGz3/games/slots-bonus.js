// Valley Casino — bonus slot machines: Spin-A-Fortune (top-box prize wheel), Boardwalk Riches (board-game bonus)
// and Party Presents (pick-a-present bonus + Quick Strike scatter pays).
// Same family as games/slots.js (same cabinet, meters, deck and paytable layout), but self-contained.
// Everything is drawn procedurally (canvas symbols, CSS cabinet). The math is pure and exported as `_math`
// so it can be simulated in node; every outcome (reel stops, wheel segment, dice, presents) comes from K.rand.
import * as K from './_kit.js';

const TAU = Math.PI * 2;
const FD = '"Bungee", Impact, "Arial Black", sans-serif';
const FS = 'Georgia, "Times New Roman", serif';

// =====================================================================================================
// Painting helpers (all symbols are drawn in a 100x100 box)
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
function star(c, cx, cy, n, r1, r2, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = k < 0 ? 0 : 255, p = Math.abs(k);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p); return `rgb(${r},${g},${b})`;
}
function shadow(c, y = 92, w = 40) { c.fillStyle = 'rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(50, y, w, 5, 0, 0, TAU); c.fill(); }

// ---------------------------------------------------------------- shared classics
function pBars(c, n, st = {}) {
  const body = st.body || '#151515', edge = st.edge || '#f2f2f2', tx = st.text || '#ffffff', acc = st.acc || '#c0c0c0';
  const H = n === 1 ? 30 : n === 2 ? 25 : 21, gap = n === 3 ? 4 : 6, tot = n * H + (n - 1) * gap, y0 = 50 - tot / 2;
  for (let k = 0; k < n; k++) {
    const y = y0 + k * (H + gap);
    rr(c, 6, y, 88, H, 5); c.fillStyle = lin(c, 0, y, 0, y + H, [[0, '#4a4a4a'], [.45, body], [1, '#000']]); c.fill();
    c.lineWidth = 3; c.strokeStyle = edge; c.stroke();
    rr(c, 10, y + 3.5, 80, H - 7, 3); c.lineWidth = 1; c.strokeStyle = acc; c.stroke();
    text(c, 'BAR', 50, y + H / 2 + 1, H * .72, { fill: tx, stroke: '#000', sw: 2 });
  }
}
function sevenPath(c) { c.beginPath(); c.moveTo(18, 12); c.lineTo(84, 12); c.lineTo(84, 25); c.bezierCurveTo(68, 42, 58, 62, 56, 90); c.lineTo(33, 90); c.bezierCurveTo(35, 66, 46, 46, 61, 30); c.lineTo(38, 30); c.lineTo(36, 36); c.lineTo(18, 36); c.closePath(); }
function pSeven(c, o = {}) {
  c.lineJoin = 'round';
  sevenPath(c); c.lineWidth = 11; c.strokeStyle = o.dark || '#160000'; c.stroke();
  c.lineWidth = 6; c.strokeStyle = o.edge || '#fff'; c.stroke();
  c.fillStyle = lin(c, 0, 12, 0, 90, [[0, o.top || '#ff4b3a'], [1, o.bot || '#8a0008']]); c.fill();
  c.save(); sevenPath(c); c.clip(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(46, 14, 46, 10, -.08, 0, TAU); c.fill(); c.restore();
  sparkle(c, 80, 16, 6, '#fff7c0');
}
function gemPath(c) { c.beginPath(); c.moveTo(30, 16); c.lineTo(70, 16); c.lineTo(90, 38); c.lineTo(50, 92); c.lineTo(10, 38); c.closePath(); }
function pGem(c, light, dark, edge = '#0b1d3a') {
  gemPath(c); c.fillStyle = lin(c, 10, 16, 90, 92, [[0, '#fbf2ff'], [.35, light], [1, dark]]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = edge; c.lineJoin = 'round'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2; c.beginPath();
  c.moveTo(10, 38); c.lineTo(90, 38); c.moveTo(30, 16); c.lineTo(38, 38); c.lineTo(50, 92); c.lineTo(62, 38); c.lineTo(70, 16); c.moveTo(38, 38); c.lineTo(50, 16); c.lineTo(62, 38); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(30, 16); c.lineTo(50, 16); c.lineTo(38, 38); c.lineTo(10, 38); c.closePath(); c.fill();
  sparkle(c, 74, 24, 8);
}
function pRoyal(c, ch, a, b, edge = '#f5d27a') {
  const size = ch.length > 1 ? 52 : 68;
  c.font = `bold ${size}px ${FS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const y = 54;
  c.lineWidth = 10; c.strokeStyle = '#140a00'; c.strokeText(ch, 50, y);
  c.lineWidth = 4.5; c.strokeStyle = edge; c.strokeText(ch, 50, y);
  c.fillStyle = lin(c, 0, y - size * .45, 0, y + size * .45, [[0, a], [1, b]]); c.fillText(ch, 50, y);
  c.save(); c.globalAlpha = .35; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(46, y - size * .25, size * .32, size * .1, -.2, 0, TAU); c.fill(); c.restore();
}

// ---------------------------------------------------------------- Spin-A-Fortune symbols
const WHEEL_PAL = ['#7b2ff7', '#e8173a', '#1f8fff', '#ffcc33', '#27b04a', '#ff4fa8', '#00b3a4', '#ff8a00'];
function pMiniWheel(c, cx, cy, r, n = 12) {
  const s = TAU / n;
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fillStyle = gold(c, cy - r, cy + r); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a1a00'; c.stroke();
  for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r * .86, i * s, (i + 1) * s); c.closePath(); c.fillStyle = WHEEL_PAL[i % WHEEL_PAL.length]; c.fill(); c.lineWidth = .8; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke(); }
  for (let i = 0; i < n; i++) { const a = i * s; c.beginPath(); c.arc(cx + Math.cos(a) * r * .93, cy + Math.sin(a) * r * .93, r * .045, 0, TAU); c.fillStyle = '#fff'; c.fill(); }
  c.beginPath(); c.arc(cx, cy, r * .2, 0, TAU); c.fillStyle = rad(c, cx - r * .05, cy - r * .05, 1, cx, cy, r * .2, [[0, '#fff6c0'], [1, '#b07a12']]); c.fill(); c.lineWidth = 1; c.strokeStyle = '#3a1a00'; c.stroke();
}
function pWildMult(c, m) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = gold(c, 4, 96); c.fill(); c.lineWidth = 2; c.strokeStyle = '#2a1040'; c.stroke();
  c.beginPath(); c.arc(50, 50, 40, 0, TAU);
  c.fillStyle = rad(c, 42, 34, 4, 50, 50, 42, m === 3 ? [[0, '#ff8ae0'], [.6, '#b0108a'], [1, '#4a0040']] : [[0, '#c4a0ff'], [.6, '#6a2ad0'], [1, '#22085a']]); c.fill();
  c.save(); c.beginPath(); c.arc(50, 50, 40, 0, TAU); c.clip(); c.globalAlpha = .16; c.fillStyle = '#fff';
  for (let i = 0; i < 12; i += 2) { c.beginPath(); c.moveTo(50, 50); c.arc(50, 50, 40, i * TAU / 12, (i + 1) * TAU / 12); c.closePath(); c.fill(); } c.restore();
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16; c.beginPath(); c.arc(50 + Math.cos(a) * 43, 50 + Math.sin(a) * 43, 1.8, 0, TAU); c.fillStyle = i % 2 ? '#fff7d0' : '#ff5a8a'; c.fill(); }
  text(c, m + 'X', 50, 41, 36, { fill: gold(c, 22, 60), stroke: '#1a0630', sw: 7 });
  rr(c, 13, 60, 74, 20, 6); c.fillStyle = lin(c, 0, 60, 0, 80, [[0, '#ff5a5a'], [.5, '#c40018'], [1, '#6a0010']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#ffd34a'; c.stroke();
  text(c, 'WILD', 50, 70.5, 15, { fill: '#fff', stroke: '#3a0008', sw: 3 });
  sparkle(c, 78, 18, 7);
}
function pSpinSym(c) {
  star(c, 50, 50, 16, 49, 39); c.fillStyle = rad(c, 50, 50, 10, 50, 50, 49, [[0, '#fff2a0'], [.6, '#ffb000'], [1, '#d03000']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#6a1000'; c.stroke();
  pMiniWheel(c, 50, 50, 33, 12);
  rr(c, 8, 40, 84, 21, 7); c.fillStyle = lin(c, 0, 40, 0, 61, [[0, '#a24bff'], [.5, '#5a0fb0'], [1, '#2a0060']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#ffd34a'; c.stroke();
  text(c, 'SPIN', 50, 51.5, 18, { fill: gold(c, 42, 60), stroke: '#1a0030', sw: 4 });
  sparkle(c, 82, 20, 7); sparkle(c, 18, 80, 5);
}
const BAR_ROYAL = { body: '#2a0a4a', edge: '#ffd54a', text: '#fff', acc: '#c08aff' };

// ---------------------------------------------------------------- Boardwalk Riches symbols
function pHotel(c) {
  shadow(c, 93, 38);
  rr(c, 22, 22, 56, 70, 4); c.fillStyle = lin(c, 22, 0, 78, 0, [[0, '#7a0a12'], [.4, '#e8303a'], [1, '#6a0810']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#2a0004'; c.stroke();
  rr(c, 18, 18, 64, 8, 2); c.fillStyle = '#f4f4f4'; c.fill(); c.lineWidth = 1.5; c.stroke();
  rr(c, 27, 3, 46, 15, 3); c.fillStyle = gold(c, 3, 18); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a2200'; c.stroke();
  text(c, 'HOTEL', 50, 11, 9.5, { fill: '#5a0a00' });
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
    rr(c, 28 + k * 16, 31 + r * 11, 12, 7, 1.5); c.fillStyle = (r * 3 + k) % 4 === 1 ? '#3a4a7a' : lin(c, 0, 31 + r * 11, 0, 38 + r * 11, [[0, '#fff6c0'], [1, '#ffc840']]); c.fill();
  }
  c.beginPath(); c.rect(36, 75, 28, 5); c.fillStyle = '#fff'; c.fill(); for (let x = 36; x < 64; x += 7) { c.fillStyle = '#1a9a4a'; c.fillRect(x, 75, 3.5, 5); }
  rr(c, 43, 80, 14, 12, 2); c.fillStyle = '#3a1a00'; c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(25, 26, 5, 64);
}
function pHouse(c) {
  shadow(c, 92, 40);
  rr(c, 63, 18, 10, 22, 1); c.fillStyle = lin(c, 63, 0, 73, 0, [[0, '#7a2a1a'], [1, '#c4553a']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a0a00'; c.stroke();
  rr(c, 21, 46, 58, 44, 3); c.fillStyle = lin(c, 0, 46, 0, 90, [[0, '#4ad07a'], [1, '#0a7a3a']]); c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#043a18'; c.stroke();
  c.beginPath(); c.moveTo(10, 50); c.lineTo(50, 13); c.lineTo(90, 50); c.closePath(); c.fillStyle = lin(c, 0, 13, 0, 50, [[0, '#1aa050'], [1, '#05501f']]); c.fill(); c.lineJoin = 'round'; c.lineWidth = 3.5; c.strokeStyle = '#fff'; c.stroke();
  rr(c, 43, 63, 14, 27, 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#043a18'; c.stroke();
  c.beginPath(); c.arc(54, 77, 1.4, 0, TAU); c.fillStyle = '#c8a000'; c.fill();
  for (const x of [27, 61]) { rr(c, x, 55, 12, 12, 1); c.fillStyle = lin(c, 0, 55, 0, 67, [[0, '#d8f4ff'], [1, '#6ab0e0']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); c.beginPath(); c.moveTo(x + 6, 55); c.lineTo(x + 6, 67); c.moveTo(x, 61); c.lineTo(x + 12, 61); c.lineWidth = 1.2; c.stroke(); }
  c.beginPath(); c.arc(50, 36, 5, 0, TAU); c.fillStyle = '#fff6c0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
}
function pCar(c) {
  shadow(c, 86, 44);
  const body = () => { c.beginPath(); c.moveTo(5, 72); c.lineTo(6, 59); c.quadraticCurveTo(8, 50, 21, 49); c.lineTo(42, 48); c.quadraticCurveTo(48, 39, 55, 47); c.lineTo(84, 49); c.quadraticCurveTo(95, 51, 95, 62); c.lineTo(95, 72); c.closePath(); };
  c.beginPath(); c.moveTo(60, 48); c.lineTo(67, 33); c.lineTo(72, 34); c.lineTo(67, 48); c.closePath(); c.fillStyle = 'rgba(180,230,255,.55)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#e8e8e8'; c.stroke();
  body(); c.fillStyle = lin(c, 0, 45, 0, 72, [[0, '#ff7a7a'], [.4, '#e0101e'], [1, '#6a0008']]); c.fill(); c.lineJoin = 'round'; c.lineWidth = 2.2; c.strokeStyle = '#2a0004'; c.stroke();
  c.strokeStyle = '#f4f4f4'; c.lineWidth = 2; c.beginPath(); c.moveTo(10, 61); c.lineTo(92, 61); c.stroke();
  c.fillStyle = '#5a0008'; c.beginPath(); c.ellipse(33, 48, 9, 2.5, 0, 0, TAU); c.fill();
  for (const x of [25, 75]) {
    c.beginPath(); c.arc(x, 72, 14, Math.PI, 0); c.fillStyle = '#1a0004'; c.fill();
    c.beginPath(); c.arc(x, 73, 11, 0, TAU); c.fillStyle = '#111'; c.fill();
    c.beginPath(); c.arc(x, 73, 6.5, 0, TAU); c.fillStyle = rad(c, x - 2, 71, 1, x, 73, 6.5, [[0, '#fff'], [.6, '#bbb'], [1, '#666']]); c.fill();
    c.beginPath(); c.arc(x, 73, 2, 0, TAU); c.fillStyle = '#e0101e'; c.fill();
  }
  rr(c, 88, 64, 9, 5, 2); c.fillStyle = '#ddd'; c.fill(); rr(c, 3, 64, 8, 5, 2); c.fill();
  c.beginPath(); c.arc(91, 55, 3, 0, TAU); c.fillStyle = '#fff6a0'; c.fill(); c.fillStyle = '#ff3030'; c.fillRect(6, 55, 3, 4);
  sparkle(c, 82, 44, 5);
}
function pTopHat(c) {
  c.beginPath(); c.ellipse(50, 84, 42, 9, 0, 0, TAU); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
  c.beginPath(); c.ellipse(50, 74, 43, 11, 0, 0, TAU); c.fillStyle = lin(c, 7, 0, 93, 0, [[0, '#050505'], [.5, '#3a3a3a'], [1, '#050505']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#000'; c.stroke();
  const crown = () => { c.beginPath(); c.moveTo(27, 18); c.quadraticCurveTo(50, 12, 73, 18); c.lineTo(69, 72); c.quadraticCurveTo(50, 78, 31, 72); c.closePath(); };
  crown(); c.fillStyle = lin(c, 27, 0, 73, 0, [[0, '#0a0a0a'], [.32, '#4e4e4e'], [.55, '#1a1a1a'], [1, '#000']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#000'; c.stroke();
  c.save(); crown(); c.clip(); c.fillStyle = lin(c, 0, 55, 0, 68, [[0, '#2fd06a'], [1, '#0a6a2a']]); c.fillRect(20, 55, 60, 13); c.restore();
  c.strokeStyle = '#ffd54a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(29.5, 55); c.quadraticCurveTo(50, 59, 70.5, 55); c.moveTo(30.4, 68); c.quadraticCurveTo(50, 72, 69.6, 68); c.stroke();
  c.beginPath(); c.ellipse(50, 17, 23, 5.5, 0, 0, TAU); c.fillStyle = '#2e2e2e'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#000'; c.stroke();
  c.beginPath(); c.ellipse(50, 74, 43, 11, 0, .15, Math.PI - .15); c.lineWidth = 3; c.strokeStyle = '#5a5a5a'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(35, 21); c.lineTo(41, 20); c.lineTo(39, 66); c.lineTo(34, 65); c.closePath(); c.fill();
  sparkle(c, 72, 26, 6);
}
function pBag(c) {
  shadow(c, 93, 34);
  const body = () => { c.beginPath(); c.moveTo(38, 35); c.bezierCurveTo(12, 46, 10, 92, 50, 92); c.bezierCurveTo(90, 92, 88, 46, 62, 35); c.closePath(); };
  body(); c.fillStyle = rad(c, 40, 55, 4, 50, 64, 44, [[0, '#f2dca0'], [.6, '#c49a4a'], [1, '#6a4a12']]); c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#3a2400'; c.stroke();
  c.beginPath(); c.moveTo(39, 35); c.lineTo(31, 13); c.quadraticCurveTo(41, 19, 50, 14); c.quadraticCurveTo(59, 19, 69, 13); c.lineTo(61, 35); c.closePath(); c.fillStyle = lin(c, 0, 13, 0, 35, [[0, '#e8cc88'], [1, '#a07a2a']]); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(50, 35, 14, 4, 0, 0, TAU); c.lineWidth = 4; c.strokeStyle = '#1a8a3a'; c.stroke();
  text(c, '$', 50, 66, 38, { fill: lin(c, 0, 48, 0, 84, [[0, '#3aea7a'], [1, '#0a6a2a']]), stroke: '#063a14', sw: 5 });
  for (const [x, y] of [[80, 86], [86, 81], [74, 90]]) { c.beginPath(); c.ellipse(x, y, 7, 3, 0, 0, TAU); c.fillStyle = gold(c, y - 3, y + 3); c.fill(); c.lineWidth = 1; c.strokeStyle = '#6a4a00'; c.stroke(); }
}
function pDeedWild(c) {
  rr(c, 13, 6, 74, 88, 7); c.fillStyle = lin(c, 0, 6, 0, 94, [[0, '#ffffff'], [1, '#e6efe0']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#0a5a2a'; c.stroke();
  rr(c, 17, 10, 66, 80, 5); c.lineWidth = 1.2; c.strokeStyle = '#c9a43a'; c.stroke();
  rr(c, 20, 13, 60, 28, 4); c.fillStyle = lin(c, 0, 13, 0, 41, [[0, '#2fd06a'], [1, '#0a6a2a']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#043a18'; c.stroke();
  text(c, 'WILD', 50, 28, 21, { fill: '#fff', stroke: '#043a18', sw: 4 });
  text(c, 'TITLE DEED', 50, 50, 8.5, { font: FS, fill: '#0a5a2a', weight: 'bold' });
  c.strokeStyle = '#9ab09a'; c.lineWidth = 1.2; c.beginPath(); for (const y of [58, 64, 70]) { c.moveTo(25, y); c.lineTo(75, y); } c.stroke();
  star(c, 50, 81, 5, 8, 3.4); c.fillStyle = gold(c, 73, 89); c.fill(); c.lineWidth = 1; c.strokeStyle = '#6a4a00'; c.stroke();
  sparkle(c, 80, 12, 6);
}
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function pDie(c, x, y, s, rot, v, col = '#d01020') {
  c.save(); c.translate(x, y); c.rotate(rot);
  rr(c, -s / 2 + 2, -s / 2 + 4, s, s, s * .2); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
  rr(c, -s / 2, -s / 2, s, s, s * .2); c.fillStyle = lin(c, -s / 2, -s / 2, s / 2, s / 2, [[0, '#ff8080'], [.45, col], [1, '#4a0006']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#2a0004'; c.stroke();
  rr(c, -s / 2 + 3, -s / 2 + 3, s - 6, s - 6, s * .16); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
  for (const [px, py] of PIPS[v]) { c.beginPath(); c.arc(px * s * .26, py * s * .26, s * .085, 0, TAU); c.fillStyle = rad(c, px * s * .26 - 1, py * s * .26 - 1, .5, px * s * .26, py * s * .26, s * .085, [[0, '#fff'], [1, '#ccc']]); c.fill(); }
  c.restore();
}
function pDiceSym(c) {
  c.beginPath(); c.arc(50, 46, 44, 0, TAU); c.fillStyle = rad(c, 50, 46, 4, 50, 46, 44, [[0, 'rgba(255,255,255,.55)'], [.6, 'rgba(60,220,120,.25)'], [1, 'rgba(0,120,60,0)']]); c.fill();
  pDie(c, 33, 42, 38, -.28, 5); pDie(c, 66, 50, 38, .22, 6);
  rr(c, 9, 76, 82, 19, 6); c.fillStyle = lin(c, 0, 76, 0, 95, [[0, '#2fd06a'], [1, '#05501f']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
  text(c, 'BONUS', 50, 86, 13, { fill: '#fff', stroke: '#043a18', sw: 3 });
  sparkle(c, 84, 18, 7);
}

// ---------------------------------------------------------------- Party Presents symbols
const PINK = '#ff2d95', TEAL = '#19e3d2';
function pCake(c) {
  c.beginPath(); c.ellipse(50, 89, 43, 7, 0, 0, TAU); c.fillStyle = lin(c, 0, 82, 0, 96, [[0, '#ffffff'], [1, '#9aa']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#567'; c.stroke();
  const tier = (x, y, w, h, a, b) => {
    rr(c, x, y, w, h, 5); c.fillStyle = lin(c, 0, y, 0, y + h, [[0, a], [1, b]]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#3a0024'; c.stroke();
    c.beginPath(); c.moveTo(x + 2, y + 2); for (let k = 0; k <= 6; k++) { const xx = x + 2 + k * (w - 4) / 6; c.quadraticCurveTo(xx - (w - 4) / 12, y + 9 + (k % 2) * 3, xx, y + 5); } c.lineTo(x + w - 2, y + 2); c.closePath(); c.fillStyle = '#fff'; c.fill();
  };
  tier(14, 58, 72, 29, '#ff7ac0', '#c0106a'); tier(27, 36, 46, 24, '#5ff5e8', '#0a9a8e');
  const sp = ['#ffd34a', '#7a2ff0', '#fff', '#1f8fff']; for (let i = 0; i < 14; i++) { c.fillStyle = sp[i % 4]; c.save(); c.translate(19 + (i * 37) % 62, 71 + (i * 13) % 13); c.rotate(i); c.fillRect(-2, -.8, 4, 1.6); c.restore(); }
  for (const x of [38, 50, 62]) {
    rr(c, x - 2.5, 18, 5, 18, 1); c.fillStyle = lin(c, x - 2.5, 0, x + 2.5, 0, [[0, '#fff'], [1, '#ccd']]); c.fill();
    c.strokeStyle = PINK; c.lineWidth = 1.2; c.beginPath(); for (let y = 21; y < 36; y += 5) { c.moveTo(x - 2.5, y); c.lineTo(x + 2.5, y - 2.5); } c.stroke();
    c.beginPath(); c.arc(x, 12, 6, 0, TAU); c.fillStyle = 'rgba(255,200,60,.35)'; c.fill();
    c.beginPath(); c.moveTo(x, 5); c.quadraticCurveTo(x + 4.5, 12, x, 16); c.quadraticCurveTo(x - 4.5, 12, x, 5); c.fillStyle = lin(c, 0, 5, 0, 16, [[0, '#fff6a0'], [1, '#ff7a00']]); c.fill();
  }
}
function balloon(c, x, y, rx, ry, a, b) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = rad(c, x - rx * .35, y - ry * .4, 1, x, y, ry * 1.1, [[0, '#fff'], [.2, a], [1, b]]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
  c.beginPath(); c.moveTo(x, y + ry - 1); c.lineTo(x - 3, y + ry + 5); c.lineTo(x + 3, y + ry + 5); c.closePath(); c.fillStyle = b; c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x - rx * .4, y - ry * .45, rx * .18, ry * .28, -.5, 0, TAU); c.fill();
}
function pBalloons(c) {
  c.strokeStyle = '#ddd'; c.lineWidth = 1.2; c.beginPath();
  c.moveTo(30, 62); c.quadraticCurveTo(36, 80, 50, 97); c.moveTo(70, 60); c.quadraticCurveTo(62, 80, 50, 97); c.moveTo(50, 52); c.quadraticCurveTo(46, 76, 50, 97); c.stroke();
  balloon(c, 29, 38, 18, 22, '#ff5ab0', '#a0005a'); balloon(c, 71, 36, 18, 22, '#40f0e0', '#008a80'); balloon(c, 50, 27, 19, 23, '#ffe060', '#c08000');
}
function pHorn(c) {
  const cone = () => { c.beginPath(); c.moveTo(12, 55); c.lineTo(12, 63); c.lineTo(70, 82); c.lineTo(70, 36); c.closePath(); };
  cone(); c.fillStyle = lin(c, 0, 36, 0, 82, [[0, '#5ff5e8'], [1, '#077a70']]); c.fill();
  c.save(); cone(); c.clip(); c.fillStyle = PINK; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(14 + k * 11, 0); c.lineTo(20 + k * 11, 0); c.lineTo(28 + k * 11, 100); c.lineTo(22 + k * 11, 100); c.closePath(); c.fill(); } c.restore();
  cone(); c.lineJoin = 'round'; c.lineWidth = 2; c.strokeStyle = '#1a0030'; c.stroke();
  const fr = ['#ffd34a', PINK, '#fff', TEAL];
  for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + i * Math.PI / 13; c.strokeStyle = fr[i % 4]; c.lineWidth = 2.5; c.beginPath(); c.moveTo(70 + Math.cos(a) * 6, 59 + Math.sin(a) * 21); c.lineTo(70 + Math.cos(a) * 17, 59 + Math.sin(a) * 30); c.stroke(); }
  c.beginPath(); c.ellipse(70, 59, 7, 23, 0, 0, TAU); c.fillStyle = gold(c, 36, 82); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#5a3a00'; c.stroke();
  rr(c, 3, 54, 11, 10, 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#1a0030'; c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.lineCap = 'round'; for (const r of [6, 12]) { c.beginPath(); c.arc(86, 59, r, -.7, .7); c.stroke(); }
}
function pDisco(c) {
  c.strokeStyle = '#ccc'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(50, 0); c.lineTo(50, 16); c.stroke();
  c.save(); c.beginPath(); c.arc(50, 54, 37, 0, TAU); c.clip();
  c.fillStyle = '#556'; c.fillRect(0, 0, 100, 100);
  const pal = ['#f0f4ff', '#c8d0e0', '#9aa4b8', '#e8f0ff', '#ff9ad0', '#8af5ec', '#d8e0f0'];
  for (let y = 17; y < 92; y += 6.5) { const w = Math.sqrt(Math.max(0, 37 * 37 - (y + 3 - 54) ** 2)); for (let x = 50 - w - 6; x < 50 + w; x += 6.5) { c.fillStyle = pal[Math.abs(Math.round(x * 7 + y * 13)) % pal.length]; c.fillRect(x + .6, y + .6, 5.3, 5.3); } }
  c.fillStyle = rad(c, 38, 40, 4, 50, 54, 40, [[0, 'rgba(255,255,255,.35)'], [.7, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,30,.6)']]); c.fillRect(0, 0, 100, 100);
  c.restore();
  c.beginPath(); c.arc(50, 54, 37, 0, TAU); c.lineWidth = 2; c.strokeStyle = '#223'; c.stroke();
  sparkle(c, 36, 38, 9); sparkle(c, 68, 70, 6, '#bff'); sparkle(c, 82, 26, 7, '#ffd0f0');
}
function pPartyHat(c) {
  const cone = () => { c.beginPath(); c.moveTo(50, 12); c.lineTo(80, 84); c.quadraticCurveTo(50, 96, 20, 84); c.closePath(); };
  cone(); c.fillStyle = lin(c, 20, 0, 80, 0, [[0, '#c0106a'], [.5, '#ff5ab0'], [1, '#a00058']]); c.fill();
  c.save(); cone(); c.clip(); const dots = [[44, 34, TEAL], [56, 48, '#ffd34a'], [40, 58, '#fff'], [62, 68, TEAL], [34, 76, '#ffd34a'], [52, 80, '#fff'], [48, 64, TEAL], [66, 82, '#fff']];
  for (const [x, y, col] of dots) { c.beginPath(); c.arc(x, y, 3.6, 0, TAU); c.fillStyle = col; c.fill(); } c.restore();
  cone(); c.lineJoin = 'round'; c.lineWidth = 2; c.strokeStyle = '#3a0024'; c.stroke();
  for (let i = 0; i < 9; i++) { const t = i / 8, x = 21 + t * 58, y = 84 + Math.sin(t * Math.PI) * 7; c.beginPath(); c.arc(x, y, 4.2, 0, TAU); c.fillStyle = i % 2 ? '#ffd34a' : TEAL; c.fill(); }
  for (const [x, y, r, col] of [[44, 10, 6, TEAL], [56, 10, 6, '#fff'], [50, 5, 6, '#ffd34a'], [50, 12, 5, PINK]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
}
function pPartyWild(c) {
  star(c, 50, 50, 14, 49, 34); c.fillStyle = rad(c, 50, 50, 6, 50, 50, 49, [[0, '#fff'], [.35, '#ff8ad0'], [1, '#b0005a']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = TEAL; c.stroke();
  c.beginPath(); c.arc(50, 50, 30, 0, TAU); c.fillStyle = lin(c, 0, 20, 0, 80, [[0, '#2a0a4a'], [1, '#0a0420']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#ffd34a'; c.stroke();
  const cf = ['#ffd34a', TEAL, PINK, '#fff']; for (let i = 0; i < 18; i++) { c.save(); c.translate(50 + Math.cos(i * 2.4) * 22, 50 + Math.sin(i * 2.4) * 22); c.rotate(i); c.fillStyle = cf[i % 4]; c.fillRect(-2.5, -1, 5, 2); c.restore(); }
  text(c, 'WILD', 50, 51, 20, { fill: lin(c, 0, 40, 0, 62, [[0, '#fff'], [1, TEAL]]), stroke: '#1a0030', sw: 4 });
}
function pGift(c, box = ['#5ff5e8', '#077a70'], rib = PINK, tag = '') {
  shadow(c, 92, 38);
  rr(c, 16, 42, 68, 48, 4); c.fillStyle = lin(c, 16, 0, 84, 0, [[0, box[1]], [.45, box[0]], [1, box[1]]]); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke();
  c.fillStyle = rib; c.fillRect(44, 42, 12, 48);
  rr(c, 11, 31, 78, 14, 3); c.fillStyle = lin(c, 0, 31, 0, 45, [[0, box[0]], [1, box[1]]]); c.fill(); c.stroke(); c.fillStyle = rib; c.fillRect(44, 31, 12, 14);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(20, 46, 6, 40);
  for (const s of [-1, 1]) { c.save(); c.translate(50, 30); c.rotate(s * .55); c.beginPath(); c.ellipse(s * 13, -6, 13, 8, 0, 0, TAU); c.fillStyle = rib; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke(); c.beginPath(); c.ellipse(s * 13, -6, 6, 3.5, 0, 0, TAU); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(); c.restore(); }
  c.beginPath(); c.arc(50, 30, 5.5, 0, TAU); c.fillStyle = rib; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
  if (tag) { rr(c, 57, 60, 30, 13, 3); c.fillStyle = gold(c, 60, 73); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#5a3a00'; c.stroke(); text(c, tag, 72, 67, 8, { fill: '#3a0024' }); }
}
function pPresent(c) { c.beginPath(); c.arc(50, 56, 46, 0, TAU); c.fillStyle = rad(c, 50, 56, 6, 50, 56, 46, [[0, 'rgba(255,240,140,.6)'], [1, 'rgba(255,45,149,0)']]); c.fill(); pGift(c, ['#5ff5e8', '#077a70'], PINK, 'BONUS'); sparkle(c, 84, 22, 7); sparkle(c, 16, 26, 5); }
function boltPath(c) { c.beginPath(); c.moveTo(57, 8); c.lineTo(26, 55); c.lineTo(46, 55); c.lineTo(36, 93); c.lineTo(76, 42); c.lineTo(55, 42); c.lineTo(67, 8); c.closePath(); }
function pBolt(c) {
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.fillStyle = rad(c, 50, 45, 4, 50, 50, 46, [[0, '#3a2a8a'], [1, '#0a0420']]); c.fill(); c.lineWidth = 3; c.strokeStyle = TEAL; c.stroke();
  c.save(); c.shadowColor = '#ffe24a'; c.shadowBlur = 12; boltPath(c); c.fillStyle = lin(c, 0, 8, 0, 93, [[0, '#ffffff'], [.3, '#fff27a'], [1, '#ff9a00']]); c.fill(); c.restore();
  boltPath(c); c.lineJoin = 'round'; c.lineWidth = 2.2; c.strokeStyle = '#6a2a00'; c.stroke();
  sparkle(c, 78, 22, 6); sparkle(c, 24, 78, 5, '#bff');
}
function pPooper(c) {
  for (let i = 0; i < 5; i++) { c.strokeStyle = '#7ab0ff'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(24 + i * 13, 74 + (i % 2) * 6); c.lineTo(20 + i * 13, 86 + (i % 2) * 6); c.stroke(); }
  c.beginPath(); c.arc(30, 52, 17, Math.PI * .5, Math.PI * 1.5); c.arc(44, 34, 18, Math.PI, Math.PI * 1.85); c.arc(66, 38, 18, Math.PI * 1.2, Math.PI * 1.95); c.arc(74, 54, 15, -Math.PI * .5, Math.PI * .5); c.closePath();
  c.fillStyle = lin(c, 0, 16, 0, 70, [[0, '#b8bcc8'], [1, '#5a5e6a']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#2a2c34'; c.stroke();
  c.strokeStyle = '#1a1a22'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(36, 40); c.lineTo(46, 44); c.moveTo(64, 40); c.lineTo(54, 44); c.stroke();
  c.beginPath(); c.arc(42, 48, 2.6, 0, TAU); c.arc(58, 48, 2.6, 0, TAU); c.fillStyle = '#1a1a22'; c.fill();
  c.beginPath(); c.arc(50, 63, 8, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
}

// =====================================================================================================
// Math
// =====================================================================================================
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Video reel strip from symbol counts, deterministically shuffled. gaps[sym] = minimum distance between two copies of sym.
function buildStrip(counts, seed, gaps = {}) {
  const rnd = mulberry(seed);
  for (let attempt = 0; attempt < 20000; attempt++) {
    const a = []; for (const [s, n] of Object.entries(counts)) for (let i = 0; i < n; i++) a.push(s);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const L = a.length; let ok = true;
    for (let i = 0; i < L && ok; i++) { const g = gaps[a[i]]; if (g) for (let d = 1; d < g; d++) if (a[(i + d) % L] === a[i]) { ok = false; break; } }
    for (let i = 0; i < L && ok; i++) if (!gaps[a[i]] && a[i] === a[(i + 1) % L] && a[i] === a[(i + 2) % L]) ok = false;
    if (ok) return { strip: a };
  }
  throw new Error('strip build failed');
}
function classicReel(order, w) { const strip = [], weights = []; for (const s of order) { strip.push(s, 'blank'); weights.push(w[s], w.blank); } return { strip, weights }; }
function finalize(cfg) {
  for (const d of cfg.reelDefs) { if (d.weights) { d.cum = []; let t = 0; for (const w of d.weights) { t += w; d.cum.push(t); } d.total = t; } }
  return cfg;
}
function spinStops(cfg, R) {
  return cfg.reelDefs.map(d => {
    if (!d.weights) return R(d.strip.length);
    const x = R(d.total); let lo = 0, hi = d.cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (d.cum[m] > x) hi = m; else lo = m + 1; }
    return lo;
  });
}
const mod = (a, n) => ((a % n) + n) % n;
function topOf(cfg, i, stop) { return mod(stop - (cfg.centerStop ? 1 : 0), cfg.reelDefs[i].strip.length); }
function gridOf(cfg, stops) { return stops.map((s, i) => { const st = cfg.reelDefs[i].strip, t = topOf(cfg, i, s); return Array.from({ length: cfg.rows }, (_, r) => st[(t + r) % st.length]); }); }
function pickW(R, table) { let tot = 0; for (const e of table) tot += e[1]; let x = R(tot); for (const e of table) { if (x < e[1]) return e[0]; x -= e[1]; } return table[0][0]; }

// ---------------------------------------------------------------- Spin-A-Fortune: 3 reels, 1 line, multiplier wilds, prize wheel
const WILDV = { w2: 2, w3: 3 };
function evalWheelLine(cfg, syms, coins) {
  const isW = s => WILDV[s] > 0, nW = syms.filter(isW).length;
  let best = null;
  for (const rule of cfg.rules) {
    let ok = true, mult = 1, cells = [0, 1, 2];
    if (rule.k === 'exact') ok = rule.s.every((x, i) => syms[i] === x);
    else if (rule.k === 'seq') {
      if (nW === 3) ok = false;
      else for (let i = 0; i < 3; i++) {
        const s = syms[i], rs = rule.s[i];
        if (s === rs || (rs[0] === '@' && cfg.groups[rs.slice(1)].includes(s))) continue;
        if (isW(s)) { mult *= WILDV[s]; continue; }
        ok = false; break;
      }
    } else if (rule.k === 'wild') { ok = nW === rule.n; cells = [0, 1, 2].filter(i => isW(syms[i])); mult = cells.reduce((m, i) => m * WILDV[syms[i]], 1); }
    if (!ok) continue;
    if (rule.noMult) mult = 1;
    const p = rule.pay * coins * mult;
    if (!best || p > best.pay) best = { pay: p, rule, mult, cells };
  }
  return best;
}
function evalWheel(cfg, grid, units) {
  const syms = [0, 1, 2].map(i => grid[i][1]);
  const b = evalWheelLine(cfg, syms, units);
  const wins = []; let coins = 0;
  if (b) { coins = b.pay; wins.push({ line: 0, cells: b.cells.map(i => [i, 1]), pay: b.pay, label: b.rule.name + (b.mult > 1 ? ` ×${b.mult}` : '') }); }
  const res = { wins, coins };
  if (syms[2] === 'spin') res.wheel = true;
  return res;
}
// The prize wheel: 24 equal segments; each segment has a hidden stop weight. Values are multiples of the total bet.
const WHEEL = [[1000, 1], [25, 12], [50, 6], [30, 10], [100, 3], [25, 12], [40, 8], [75, 4], [25, 12], [200, 2], [30, 10], [50, 6],
  [25, 12], [500, 1], [40, 8], [30, 10], [150, 2], [25, 12], [60, 5], [35, 9], [250, 2], [30, 10], [45, 7], [25, 12]].map(([v, w]) => ({ v, w }));
const WHEEL_TOTAL = WHEEL.reduce((a, s) => a + s.w, 0);
function wheelPick(R) { let x = R(WHEEL_TOTAL); for (let i = 0; i < WHEEL.length; i++) { if (x < WHEEL[i].w) return i; x -= WHEEL[i].w; } return 1; }

// ---------------------------------------------------------------- 5-reel video evaluation (Boardwalk, Party)
function evalLine5(cfg, syms) {
  const W = cfg.wild; let tgt = null, n = 0;
  for (const s of syms) {
    if (cfg.special.includes(s)) break;
    if (s === W) { n++; continue; }
    if (tgt === null) { tgt = s; n++; continue; }
    if (s === tgt) { n++; continue; }
    break;
  }
  let best = null;
  if (tgt && cfg.pays[tgt] && cfg.pays[tgt][n]) best = { sym: tgt, n, pay: cfg.pays[tgt][n] };
  let wn = 0; while (wn < syms.length && syms[wn] === W) wn++;
  if (wn && cfg.pays[W] && cfg.pays[W][wn] && (!best || cfg.pays[W][wn] > best.pay)) best = { sym: W, n: wn, pay: cfg.pays[W][wn] };
  return best;
}
function cellsOf(grid, sym) { const out = []; grid.forEach((col, i) => col.forEach((s, r) => { if (s === sym) out.push([i, r]); })); return out; }
function evalVideo(cfg, grid, units, mult = 1) {
  const wins = []; let coins = 0;
  for (let li = 0; li < units; li++) {
    const L = cfg.lines[li], syms = L.map((r, i) => grid[i][r]);
    const b = evalLine5(cfg, syms); if (!b) continue;
    const p = b.pay * mult; coins += p;
    wins.push({ line: li, cells: L.slice(0, b.n).map((r, i) => [i, r]), pay: p, label: `${b.n}× ${cfg.names[b.sym]}` });
  }
  const res = { wins, coins: 0 };
  if (cfg.scatter) {
    const cells = cellsOf(grid, cfg.scatter), n = cells.length, sp = cfg.scatterPay[n];
    if (sp) { const p = sp * units * mult; coins += p; wins.push({ line: -1, cells, pay: p, label: `${n}× ${cfg.names[cfg.scatter]}`, scatter: true }); }
    if (n >= cfg.trigger) res.bonus = true;
  }
  if (cfg.strike) {
    const cells = cellsOf(grid, cfg.strike), n = cells.length, sp = cfg.strikePay[n];
    if (sp) { const p = sp * units * mult; coins += p; wins.push({ line: -1, cells, pay: p, label: `${n} QUICK STRIKE`, scatter: true, strike: true }); res.strike = n; }
  }
  res.coins = coins;
  return res;
}

// ---------------------------------------------------------------- Boardwalk board bonus (square loop of 20 spaces)
const BOARD = [
  { t: 'start', name: 'START' },
  { t: 'prop', name: 'Pier Ave', v: 2, col: '#8a4a1a' },
  { t: 'prop', name: 'Sandy Ln', v: 2, col: '#8a4a1a' },
  { t: 'prize', name: 'PRIZE' },
  { t: 'prop', name: 'Gull St', v: 3, col: '#4ab8e8' },
  { t: 'jail', name: 'JAIL' },
  { t: 'prop', name: 'Dune Way', v: 3, col: '#4ab8e8' },
  { t: 'fs', name: 'FREE SPINS', v: 4 },
  { t: 'prop', name: 'Shell Ct', v: 4, col: '#d83a9a' },
  { t: 'adv', name: 'ADVANCE', v: 3 },
  { t: 'corner', name: 'BEACH CLUB', v: 15 },
  { t: 'prop', name: 'Tide Blvd', v: 5, col: '#f08a1a' },
  { t: 'prize', name: 'PRIZE' },
  { t: 'prop', name: 'Coral Pl', v: 5, col: '#f08a1a' },
  { t: 'prop', name: 'Harbor Rd', v: 6, col: '#e02a2a' },
  { t: 'fs', name: 'FREE SPINS', v: 8 },
  { t: 'prop', name: 'Marina Dr', v: 8, col: '#e8c81a' },
  { t: 'adv', name: 'ADVANCE', v: 3 },
  { t: 'prop', name: 'Ocean Dr', v: 10, col: '#1a9a4a' },
  { t: 'prop', name: 'Grand Pier', v: 15, col: '#1a3aa0' }];
const BOARD_PASS = 5, BOARD_ROLLS = 5, BOARD_FS_MULT = 2, FS_RETRIGGER = 5;
const MYSTERY = [[2, 30], [3, 26], [5, 20], [10, 10], [20, 4], [50, 1]];
function boardPlay(R) {
  let pos = 0, rolls = BOARD_ROLLS, total = 0, fs = 0, guard = 0; const turns = [];
  while (rolls > 0 && guard++ < 80) {
    const d = [1 + R(6), 1 + R(6)], dbl = d[0] === d[1];
    if (!dbl) rolls--;
    const t = { d, dbl, steps: [] };
    let move = d[0] + d[1];
    for (let hop = 0; hop < 4 && move > 0; hop++) {
      const path = []; let pass = 0;
      for (let k = 0; k < move; k++) { pos = (pos + 1) % BOARD.length; path.push(pos); if (pos === 0) pass += BOARD_PASS; }
      const sp = BOARD[pos], st = { path, pos, pass, amt: 0, fs: 0, t: sp.t, adv: hop > 0 };
      move = 0;
      if (sp.t === 'prop' || sp.t === 'corner') st.amt = sp.v;
      else if (sp.t === 'prize') st.amt = pickW(R, MYSTERY);
      else if (sp.t === 'fs') st.fs = sp.v;
      else if (sp.t === 'jail') { st.lost = rolls > 0 ? 1 : 0; rolls = Math.max(0, rolls - 1); }
      else if (sp.t === 'adv') move = sp.v;
      total += pass + st.amt; fs += st.fs; t.steps.push(st);
    }
    t.rollsLeft = rolls; turns.push(t);
  }
  return { turns, total, fs };
}

// ---------------------------------------------------------------- Party Presents pick bonus
const PARTY_PRIZES = [1, 2, 2, 3, 3, 4, 5, 5, 8, 10, 15, 30];
const PARTY_POOPERS = 3;
function partyPlay(R) {
  const a = [...PARTY_PRIZES, ...Array(PARTY_POOPERS).fill(0)];
  for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  if (a[0] === 0) { const idx = []; a.forEach((v, i) => { if (v > 0) idx.push(i); }); const j = idx[R(idx.length)]; [a[0], a[j]] = [a[j], a[0]]; } // never a pooper first
  let total = 0, k = 0; while (a[k] > 0) total += a[k++];
  return { seq: a, picks: k + 1, total };
}

// =====================================================================================================
// Machine definitions
// =====================================================================================================
const LINE1 = [[1, 1, 1]];
const LINES20 = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0]];
const LINES30 = [[1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 0, 0, 0, 0], [3, 3, 3, 3, 3], [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 2, 3, 2, 1], [2, 1, 0, 1, 2], [0, 1, 1, 1, 0], [3, 2, 2, 2, 3],
  [1, 0, 0, 0, 1], [2, 3, 3, 3, 2], [1, 2, 2, 2, 1], [2, 1, 1, 1, 2], [0, 0, 1, 0, 0], [3, 3, 2, 3, 3], [1, 1, 0, 1, 1], [2, 2, 3, 2, 2], [1, 1, 2, 1, 1], [2, 2, 1, 2, 2],
  [0, 1, 0, 1, 0], [3, 2, 3, 2, 3], [1, 0, 1, 0, 1], [2, 3, 2, 3, 2], [1, 2, 1, 2, 1], [2, 1, 2, 1, 2], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0], [0, 0, 1, 2, 3], [3, 3, 2, 1, 0]];

// Reel-stop weights (virtual reel mapping), tuned by exact enumeration + Monte Carlo to the RTPs listed in RTP below.
const ORDER_SF = ['w3', 'bar1', 'seven', 'bar2', 'gem', 'bar1', 'w2', 'bar3', 'seven', 'bar2', 'bar1'];
const ORDER_SF3 = ['w3', 'bar1', 'seven', 'spin', 'bar2', 'gem', 'bar1', 'w2', 'bar3', 'spin', 'seven', 'bar2', 'bar1'];
const W_SF = { w3: 1, w2: 2, gem: 2, seven: 3, bar3: 3, bar2: 4, bar1: 5, blank: 5 };
const W_SF3 = { w3: 3, w2: 7, gem: 7, seven: 10, bar3: 10, bar2: 14, bar1: 17, blank: 17, spin: 1 };
const CFG_WHEEL = finalize({
  id: 'slot-wheel', title: 'Spin-A-Fortune', order: 120, blurb: '3 reels, 1 line. 2X and 3X wilds multiply; SPIN on reel 3 spins the giant prize wheel for up to 1000× your bet.',
  theme: { cabinet: '#5b1a8f', accent: '#ffcc33', glass: '#14052a' }, style: 'royal', reelBg: 'ivory', cellAspect: 1.25, aspectMin: 1.0, topbox: true,
  reels: 3, rows: 3, centerStop: true, lines: LINE1, betMode: 'coins', maxUnits: 3, defUnits: 3, unitName: 'COINS',
  reelDefs: [classicReel(ORDER_SF, W_SF), classicReel(ORDER_SF, W_SF), classicReel(ORDER_SF3, W_SF3)],
  groups: { bar: ['bar1', 'bar2', 'bar3'] },
  rules: [
    { k: 'exact', s: ['w3', 'w3', 'w3'], pay: 1600, name: 'Three 3X Wilds', noMult: true },
    { k: 'wild', n: 3, pay: 400, name: 'Three Wilds', noMult: true },
    { k: 'seq', s: ['gem', 'gem', 'gem'], pay: 100, name: 'Three Fortune Gems' },
    { k: 'seq', s: ['seven', 'seven', 'seven'], pay: 40, name: 'Three 7s' },
    { k: 'seq', s: ['bar3', 'bar3', 'bar3'], pay: 25, name: 'Three Triple BARs' },
    { k: 'seq', s: ['bar2', 'bar2', 'bar2'], pay: 15, name: 'Three Double BARs' },
    { k: 'seq', s: ['bar1', 'bar1', 'bar1'], pay: 10, name: 'Three BARs' },
    { k: 'seq', s: ['@bar', '@bar', '@bar'], pay: 4, name: 'Any 3 BARs' },
    { k: 'wild', n: 2, pay: 5, name: 'Two Wilds' },
    { k: 'wild', n: 1, pay: 1, name: 'Any Wild' }],
  names: { w3: '3X Wild', w2: '2X Wild', gem: 'Fortune Gem', seven: '7', bar3: 'Triple BAR', bar2: 'Double BAR', bar1: 'BAR', spin: 'SPIN' },
  paint: { w3: c => pWildMult(c, 3), w2: c => pWildMult(c, 2), gem: c => pGem(c, '#c27aff', '#3a0a7a', '#1a0630'), seven: c => pSeven(c, { top: '#ff4b3a', bot: '#8a0008', edge: '#ffe08a', dark: '#1a0630' }),
    bar3: c => pBars(c, 3, BAR_ROYAL), bar2: c => pBars(c, 2, BAR_ROYAL), bar1: c => pBars(c, 1, BAR_ROYAL), spin: pSpinSym },
  evaluate: evalWheel,
  antic(g) {
    const a = g[0][1], b = g[1][1], w = s => !!WILDV[s], bar = s => /^bar/.test(s);
    if (a === 'blank' || b === 'blank') return 99;
    return (w(a) || w(b) || a === b || (bar(a) && bar(b))) ? 2 : 99;
  }
});

const BW_BASE = { hotel: 2, house: 3, car: 3, hat: 4, bag: 4, A: 5, K: 5, Q: 6, J: 6, T: 7 };
const BW_DICE = 3, BW_WILDS = 3;
const CFG_BOARD = finalize({
  id: 'slot-board', title: 'Boardwalk Riches', order: 121, blurb: '5 reels, 20 lines. Three dice start the board bonus: roll around the boardwalk collecting property prizes.',
  theme: { cabinet: '#0e7a3e', accent: '#f4fff6', glass: '#03200f' }, style: 'board', reelBg: 'board', cellAspect: 1.0, aspectMin: .74,
  reels: 5, rows: 3, centerStop: false, lines: LINES20, betMode: 'lines', maxUnits: 20, defUnits: 20, unitName: 'LINES', unitSteps: [1, 5, 10, 15, 20],
  reelDefs: [
    buildStrip({ ...BW_BASE, dice: BW_DICE }, 41, { dice: 3 }),
    buildStrip({ ...BW_BASE, wild: BW_WILDS }, 42, { wild: 3 }),
    buildStrip({ ...BW_BASE, dice: BW_DICE + 1, wild: BW_WILDS }, 43, { dice: 3, wild: 3 }),
    buildStrip({ ...BW_BASE, wild: BW_WILDS }, 44, { wild: 3 }),
    buildStrip({ ...BW_BASE, dice: BW_DICE }, 45, { dice: 3 })],
  wild: 'wild', scatter: 'dice', special: ['dice'], scatterPay: { 3: 3 }, trigger: 3, boardBonus: true,
  pays: {
    hotel: { 2: 5, 3: 60, 4: 250, 5: 1000 }, house: { 3: 40, 4: 150, 5: 600 }, car: { 3: 35, 4: 120, 5: 500 }, hat: { 3: 25, 4: 80, 5: 300 }, bag: { 3: 25, 4: 70, 5: 250 },
    A: { 3: 15, 4: 50, 5: 200 }, K: { 3: 15, 4: 50, 5: 200 }, Q: { 3: 10, 4: 40, 5: 150 }, J: { 3: 9, 4: 30, 5: 120 }, T: { 3: 7, 4: 30, 5: 100 }
  },
  names: { wild: 'Deed Wild', hotel: 'Hotel', house: 'House', car: 'Convertible', hat: 'Top Hat', bag: 'Money Bag', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', dice: 'Dice' },
  paint: { wild: pDeedWild, hotel: pHotel, house: pHouse, car: pCar, hat: pTopHat, bag: pBag, dice: pDiceSym,
    A: c => pRoyal(c, 'A', '#8affb0', '#0a6a2a', '#ffffff'), K: c => pRoyal(c, 'K', '#ffffff', '#5a8a6a', '#2fd06a'), Q: c => pRoyal(c, 'Q', '#7ad8ff', '#0a4a8a', '#ffffff'),
    J: c => pRoyal(c, 'J', '#ffd38a', '#a0500a', '#ffffff'), T: c => pRoyal(c, '10', '#ff9a9a', '#8a0a1a', '#ffffff') },
  evaluate: evalVideo,
  antic: g => (g[0].includes('dice') && g[2].includes('dice')) ? 4 : 99
});

const PP_BASE = { cake: 2, balloons: 3, horn: 3, disco: 4, phat: 4, A: 5, K: 5, Q: 6, J: 6, T: 7 };
const PP_PRESENTS = 3, PP_WILDS = 3, PP_BOLTS = 3;
const CFG_PARTY = finalize({
  id: 'slot-party', title: 'Party Presents', order: 122, blurb: '5×4, 30 lines. Quick Strike bolts pay anywhere; three presents open the gift-pick party bonus.',
  theme: { cabinet: '#ff2d95', accent: '#19e3d2', glass: '#2a0420' }, style: 'party', reelBg: 'party', cellAspect: 1.0, aspectMin: .74,
  reels: 5, rows: 4, centerStop: false, lines: LINES30, betMode: 'lines', maxUnits: 30, defUnits: 30, unitName: 'LINES', unitSteps: [1, 5, 10, 20, 30],
  reelDefs: [
    buildStrip({ ...PP_BASE, bolt: PP_BOLTS }, 51, { bolt: 2 }),
    buildStrip({ ...PP_BASE, bolt: PP_BOLTS, wild: PP_WILDS, present: PP_PRESENTS }, 52, { bolt: 2, wild: 4, present: 4 }),
    buildStrip({ ...PP_BASE, bolt: PP_BOLTS, wild: PP_WILDS, present: PP_PRESENTS }, 53, { bolt: 2, wild: 4, present: 4 }),
    buildStrip({ ...PP_BASE, bolt: PP_BOLTS, wild: PP_WILDS, present: PP_PRESENTS }, 54, { bolt: 2, wild: 4, present: 4 }),
    buildStrip({ ...PP_BASE, bolt: PP_BOLTS }, 55, { bolt: 2 })],
  wild: 'wild', scatter: 'present', special: ['present', 'bolt'], scatterPay: { 3: 2 }, trigger: 3, partyBonus: true,
  strike: 'bolt', strikePay: { 3: 2, 4: 4, 5: 10, 6: 30, 7: 100, 8: 400, 9: 1500, 10: 1500 },
  pays: {
    cake: { 2: 3, 3: 50, 4: 200, 5: 1000 }, balloons: { 3: 30, 4: 120, 5: 500 }, horn: { 3: 25, 4: 100, 5: 400 }, disco: { 3: 20, 4: 60, 5: 250 }, phat: { 3: 15, 4: 50, 5: 200 },
    A: { 3: 10, 4: 30, 5: 120 }, K: { 3: 10, 4: 30, 5: 120 }, Q: { 3: 7, 4: 25, 5: 100 }, J: { 3: 5, 4: 20, 5: 80 }, T: { 3: 5, 4: 15, 5: 80 }
  },
  names: { wild: 'Party Wild', cake: 'Cake', balloons: 'Balloons', horn: 'Party Horn', disco: 'Disco Ball', phat: 'Party Hat', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', present: 'Present', bolt: 'Quick Strike' },
  paint: { wild: pPartyWild, cake: pCake, balloons: pBalloons, horn: pHorn, disco: pDisco, phat: pPartyHat, present: pPresent, bolt: pBolt,
    A: c => pRoyal(c, 'A', '#ff8ad0', '#a0005a', TEAL), K: c => pRoyal(c, 'K', '#8af5ec', '#007a70', PINK), Q: c => pRoyal(c, 'Q', '#ffe08a', '#b06a00', TEAL),
    J: c => pRoyal(c, 'J', '#c8a0ff', '#4a10a0', TEAL), T: c => pRoyal(c, '10', '#a0ffb0', '#0a7a3a', PINK) },
  evaluate: evalVideo,
  antic(g) {
    let from = 99;
    if (g[1].includes('present') && g[2].includes('present')) from = 3;
    let b = 0; for (let i = 0; i < 5; i++) { b += g[i].filter(s => s === 'bolt').length; if (i < 4 && b >= 3) { from = Math.min(from, i + 1); break; } }
    return from;
  }
});
const CFGS = [CFG_WHEEL, CFG_BOARD, CFG_PARTY];
// Theoretical returns (see _math.simulate): 10M spins each, all bonuses and free spins included.
const RTP = {
  'slot-wheel': '94.05% at any coin count (exact enumeration; 10M-spin Monte Carlo 93.7%). Prize wheel 1 in 175 spins, averaging 48× the bet',
  'slot-board': '≈95.0% (10M-spin Monte Carlo incl. board bonus and free spins). Board bonus 1 in 123 spins',
  'slot-party': '≈95.0% (10M-spin Monte Carlo incl. Quick Strike and the party bonus). Party bonus 1 in 91 spins' };

// ---------------------------------------------------------------- pure play (simulation + settling an interrupted bonus)
function pureSpin(cfg, R, units, mult = 1) { return cfg.evaluate(cfg, gridOf(cfg, spinStops(cfg, R)), units, mult); }
function pureFree(cfg, R, n, units, mult) {
  let coins = 0, left = n, guard = 0;
  while (left > 0 && guard++ < 1000) { left--; const r = pureSpin(cfg, R, units, mult); coins += r.coins; if (r.bonus) left += FS_RETRIGGER; }
  return coins;
}
// Returns { rtp, hit, bonusRate, parts } over N spins at `units` (coins or lines) with a coin of 1.
function simulate(cfg, R, N, units = cfg.maxUnits) {
  let ret = 0, hits = 0, bonuses = 0; const parts = { base: 0, bonus: 0, fs: 0 };
  for (let k = 0; k < N; k++) {
    const r = pureSpin(cfg, R, units); let x = r.coins; parts.base += r.coins;
    if (r.wheel) { const v = WHEEL[wheelPick(R)].v * units; x += v; parts.bonus += v; bonuses++; }
    if (r.bonus && cfg.boardBonus) { const b = boardPlay(R); x += b.total * units; parts.bonus += b.total * units; bonuses++; if (b.fs) { const f = pureFree(cfg, R, b.fs, units, BOARD_FS_MULT); x += f; parts.fs += f; } }
    if (r.bonus && cfg.partyBonus) { const p = partyPlay(R); x += p.total * units; parts.bonus += p.total * units; bonuses++; }
    if (x > 0) hits++; ret += x;
  }
  const b = N * units;
  return { rtp: ret / b, hit: hits / N, bonusRate: bonuses / N, parts: { base: parts.base / b, bonus: parts.bonus / b, fs: parts.fs / b } };
}
export const _math = { CFGS, WHEEL, BOARD, spinStops, gridOf, evalWheel, evalVideo, wheelPick, boardPlay, partyPlay, pureSpin, pureFree, simulate, mulberry, RTP };

// =====================================================================================================
// Styles
// =====================================================================================================
function injectSb() {
  K.injectStyles();
  if (document.getElementById('sb-style')) return;
  const s = document.createElement('style'); s.id = 'sb-style';
  s.textContent = `
.sb-screen{--cab:#5b1a8f;--acc:#ffcc33;--glass:#14052a;position:absolute;inset:0;display:flex;flex-direction:column;color:#f6efe0;font-family:"Chakra Petch",system-ui,sans-serif;font-size:14px;
  background:radial-gradient(ellipse 120% 70% at 50% 0%,color-mix(in srgb,var(--cab) 40%,#000) 0%,#07050a 70%);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.sb-screen *{box-sizing:border-box}
.sb-top{position:relative;z-index:3;display:flex;align-items:center;gap:8px;padding:8px max(12px,env(safe-area-inset-left,0px));padding-top:max(8px,env(safe-area-inset-top,0px));background:linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.35));border-bottom:1px solid rgba(255,255,255,.1)}
.sb-ttl{flex:1;min-width:0;display:grid}.sb-ttl b{font:400 clamp(15px,2.2vw,20px) "Bungee",Impact,sans-serif;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-ttl small{font-size:11px;color:#bfb6a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-ib{font:600 13px "Chakra Petch",system-ui,sans-serif;color:#f6efe0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;min-height:36px;cursor:pointer}
.sb-ib:hover{border-color:var(--acc)}.sb-ib:focus-visible,.sb-btn:focus-visible,.sb-gift:focus-visible{outline:2px solid #fff;outline-offset:2px}
.sb-stage{position:relative;z-index:1;flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch;padding:10px 12px 12px}
.sb-cab{position:relative;flex:0 1 860px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-radius:26px 26px 16px 16px;
  background:linear-gradient(90deg,color-mix(in srgb,var(--cab) 45%,#000),var(--cab) 10%,color-mix(in srgb,var(--cab) 72%,#fff) 50%,var(--cab) 90%,color-mix(in srgb,var(--cab) 45%,#000));
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),inset 0 0 0 6px rgba(0,0,0,.35),inset 0 2px 30px rgba(255,255,255,.15),0 24px 60px rgba(0,0,0,.75)}
.sb-royal .sb-cab{background:linear-gradient(90deg,#1e0638,#5b1a8f 12%,#8a3ad0 50%,#5b1a8f 88%,#1e0638);box-shadow:inset 0 0 0 2px #ffcc33,inset 0 0 0 6px #2a0a4a,inset 0 0 0 8px #b08a2a,inset 0 2px 30px rgba(255,220,120,.2),0 24px 60px rgba(0,0,0,.8)}
.sb-board .sb-cab{background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 2px,transparent 2px 18px),linear-gradient(90deg,#033a1a,#0e7a3e 12%,#22a85a 50%,#0e7a3e 88%,#033a1a);box-shadow:inset 0 0 0 3px #fff,inset 0 0 0 7px #0a4a24,inset 0 0 0 9px rgba(255,255,255,.6),0 24px 60px rgba(0,0,0,.8)}
.sb-party .sb-cab{background:radial-gradient(circle at 20% 30%,rgba(25,227,210,.35) 0 3px,transparent 4px) 0 0/34px 34px,radial-gradient(circle at 70% 70%,rgba(255,230,90,.35) 0 2.5px,transparent 3.5px) 0 0/26px 26px,linear-gradient(90deg,#5a0030,#ff2d95 14%,#ff7ac0 50%,#ff2d95 86%,#5a0030);
  box-shadow:inset 0 0 0 2px #19e3d2,inset 0 0 22px rgba(25,227,210,.5),0 0 28px rgba(255,45,149,.45),0 24px 60px rgba(0,0,0,.8)}
.sb-marq{position:relative;flex:none;display:grid;place-items:center;text-align:center;padding:10px 14px;border-radius:16px 16px 10px 10px;min-height:56px;overflow:hidden;
  background:radial-gradient(ellipse at 50% 120%,color-mix(in srgb,var(--acc) 35%,transparent),transparent 70%),linear-gradient(var(--glass),#000);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),inset 0 0 20px #000}
.sb-logo{position:relative;z-index:1;font:400 clamp(22px,4.4vw,42px)/1 "Bungee",Impact,sans-serif;letter-spacing:.02em;background:linear-gradient(#fff 0%,var(--acc) 45%,color-mix(in srgb,var(--acc) 55%,#000) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 10px color-mix(in srgb,var(--acc) 60%,transparent))}
.sb-board .sb-logo{background-image:linear-gradient(#fff 0%,#fff 50%,#9affc0 100%);filter:drop-shadow(0 2px 0 #043a18) drop-shadow(0 0 8px rgba(80,255,150,.5))}
.sb-party .sb-logo{background-image:linear-gradient(#fff 0%,#19e3d2 50%,#ff7ac0 100%);filter:drop-shadow(0 2px 0 #3a0024) drop-shadow(0 0 10px rgba(25,227,210,.6))}
.sb-marq-x{position:relative;z-index:1;font-size:12px;color:#e9dfc8;margin-top:4px;min-height:0}
.sb-topbox{min-height:clamp(110px,19vh,170px);align-content:end;padding-bottom:8px}
.sb-topcv{position:absolute;inset:0;width:100%;height:100%;display:block}
.sb-topbox .sb-logo{padding:2px 14px 4px;border-radius:12px;background-color:rgba(20,5,42,.55);-webkit-background-clip:text;background-clip:text}
.sb-topbox::after{content:"";position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(transparent,rgba(10,2,24,.85));pointer-events:none}
.sb-topbox .sb-logo,.sb-topbox .sb-marq-x{z-index:2}
.sb-bulbs{position:absolute;z-index:2;left:8px;right:8px;height:8px;display:flex;justify-content:space-between;pointer-events:none}.sb-bulbs.t{top:4px}.sb-bulbs.b{bottom:4px}
.sb-bulbs i{width:6px;height:6px;border-radius:50%;background:#fff6c8;box-shadow:0 0 6px #ffd34a;animation:sb-chase 1.2s steps(1) infinite;opacity:.25}
.sb-party .sb-bulbs i:nth-child(2n){background:#bffff8;box-shadow:0 0 6px #19e3d2}
.sb-bulbs i:nth-child(3n+1){animation-delay:-.4s}.sb-bulbs i:nth-child(3n+2){animation-delay:-.8s}
.sb-screen.winning .sb-bulbs i{animation-duration:.36s}
@keyframes sb-chase{0%{opacity:1}33%{opacity:.25}}
.sb-glass{flex:none;display:none;padding:6px 10px;border-radius:10px;background:linear-gradient(color-mix(in srgb,var(--glass) 80%,#000),#000);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
.sb-glass table{width:100%;border-collapse:collapse;font-size:12px}.sb-glass td{padding:1px 6px;text-align:right;color:#e9dfc8;font-variant-numeric:tabular-nums}
.sb-glass td:first-child{text-align:left;white-space:nowrap}.sb-glass td img{width:22px;height:22px;vertical-align:middle;margin-right:1px}
.sb-glass td.on{color:var(--acc);font-weight:700;background:rgba(255,255,255,.07)}.sb-glass th{font-size:10px;color:#9c927d;text-align:right;padding:0 6px;font-weight:600}
.sb-glass .sb-two{display:grid;gap:0 14px}
@media (min-height:900px) and (min-width:640px){.sb-has-glass .sb-glass{display:block}}
.sb-reelwrap{position:relative;flex:1 1 0;min-height:0}
.sb-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px;border-radius:14px;background:linear-gradient(#fff2b0,#b07a12 40%,#f3d36b 60%,#8a5a00);
  box-shadow:0 0 0 2px #111,0 0 0 4px var(--acc),0 0 26px color-mix(in srgb,var(--acc) 45%,transparent),0 10px 20px rgba(0,0,0,.6)}
.sb-board .sb-frame{background:linear-gradient(#ffffff,#9ab0a0 45%,#f4f4f4 55%,#6a8a72)}
.sb-party .sb-frame{background:linear-gradient(#8af5ec,#0a9a8e 45%,#5ff5e8 55%,#077a70)}
.sb-cv{display:block;border-radius:6px;background:#0a0a0a;touch-action:manipulation;cursor:pointer}
.sb-one .sb-frame::before,.sb-one .sb-frame::after{content:"";position:absolute;top:50%;width:0;height:0;border:9px solid transparent;transform:translateY(-50%)}
.sb-one .sb-frame::before{left:-6px;border-left-color:#e3102c;filter:drop-shadow(0 0 3px #f00)}.sb-one .sb-frame::after{right:-6px;border-right-color:#e3102c;filter:drop-shadow(0 0 3px #f00)}
.sb-ovl{position:absolute;inset:8px;display:grid;place-items:center;pointer-events:none;border-radius:6px;overflow:hidden}
.sb-card{padding:14px 22px;border-radius:14px;background:rgba(0,0,0,.8);border:2px solid var(--acc);text-align:center;box-shadow:0 0 30px color-mix(in srgb,var(--acc) 60%,transparent);animation:sb-pop .35s cubic-bezier(.3,1.6,.5,1);max-width:94%}
.sb-card b{display:block;font:400 clamp(20px,4vw,38px)/1.1 "Bungee",Impact,sans-serif;color:var(--acc);text-shadow:0 0 14px color-mix(in srgb,var(--acc) 70%,transparent)}
.sb-card span{font-size:clamp(12px,1.8vw,16px);color:#fff}
.sb-card em{display:block;font:400 clamp(24px,6vw,54px)/1.15 "Press Start 2P",monospace;font-style:normal;color:#fff;text-shadow:0 0 12px #ffd34a,0 3px 0 #000;margin-top:8px;font-variant-numeric:tabular-nums;white-space:nowrap}
.sb-card.sb-big{padding:16px 26px;background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--acc) 30%,#000),rgba(0,0,0,.9) 70%)}
.sb-card.sb-big b{font-size:clamp(26px,5.4vw,52px);animation:sb-throb .6s ease-in-out infinite alternate}
@keyframes sb-throb{to{transform:scale(1.07)}}
@keyframes sb-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.sb-meters{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sb-led{background:linear-gradient(#000,#120a0a);border:2px solid #2a2a2a;border-radius:8px;padding:4px 6px 5px;text-align:center;box-shadow:inset 0 0 10px #000;min-width:0}
.sb-led span{display:block;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#9c927d}
.sb-led b{display:block;font:400 clamp(11px,2vw,17px)/1.3 "Press Start 2P",monospace;color:#ff4130;text-shadow:0 0 8px rgba(255,40,20,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.sb-led.win b{color:#4dff6a;text-shadow:0 0 8px rgba(40,255,80,.8)}
.sb-msg{flex:none;min-height:1.5em;text-align:center;font-weight:600;font-size:clamp(13px,1.8vw,16px);color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-msg.win{color:#9dffb0}.sb-msg.lose{color:#ffb0a8}.sb-msg.gold{color:var(--acc)}
.sb-board .sb-msg.gold{color:#fff}
.sb-deck{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;padding:8px;border-radius:12px;background:linear-gradient(#1a1a1a,#050505);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 3px 0 rgba(0,0,0,.6)}
.sb-grp{display:flex;align-items:center;gap:6px}.sb-grp>span{font-size:10px;letter-spacing:.12em;color:#9c927d;font-weight:700}
.sb-btn{font:700 14px "Chakra Petch",system-ui,sans-serif;color:#fff;background:linear-gradient(#444,#161616);border:1px solid rgba(255,255,255,.25);border-radius:10px;min-height:44px;min-width:44px;padding:0 12px;cursor:pointer;box-shadow:0 3px 0 #000;letter-spacing:.03em}
.sb-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #000}.sb-btn:disabled{opacity:.4;cursor:not-allowed}
.sb-seg{display:flex;border-radius:10px;overflow:hidden;box-shadow:0 3px 0 #000}.sb-seg .sb-btn{border-radius:0;box-shadow:none;min-width:46px;padding:0 8px}
.sb-seg .sb-btn.on{background:linear-gradient(color-mix(in srgb,var(--acc) 85%,#fff),color-mix(in srgb,var(--acc) 70%,#000));color:#160c00;border-color:var(--acc)}
.sb-units{min-width:34px;text-align:center;font:400 14px "Press Start 2P",monospace;color:var(--acc)}
.sb-btn.sb-auto.on{background:linear-gradient(#2a8a3a,#0a3a14);border-color:#7dff9a}
.sb-spin{min-width:128px;min-height:56px;border-radius:30px;font:400 20px "Bungee",Impact,sans-serif;color:#1a0c00;border:2px solid color-mix(in srgb,var(--acc) 60%,#fff);
  background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.75),transparent 45%),linear-gradient(color-mix(in srgb,var(--acc) 90%,#fff),color-mix(in srgb,var(--acc) 60%,#000));
  box-shadow:0 4px 0 #000,0 0 18px color-mix(in srgb,var(--acc) 55%,transparent)}
.sb-board .sb-spin{color:#043a18}
.sb-spin.stop{background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.6),transparent 45%),linear-gradient(#ff6a5a,#8a0a10);color:#fff;border-color:#ffb0a8}
.sb-spin kbd{display:block;font:7px "Press Start 2P",monospace;opacity:.6;margin-top:-2px}
.sb-lever{position:relative;flex:none;width:60px;align-self:center;height:min(360px,58%);margin-left:-4px;cursor:grab;touch-action:none}
.sb-lev-mount{position:absolute;left:0;top:calc(62% - 38px);width:34px;height:76px;border-radius:0 14px 14px 0;background:linear-gradient(90deg,#555,#eee 40%,#999 70%,#444);box-shadow:0 4px 10px rgba(0,0,0,.6)}
.sb-royal .sb-lev-mount{background:linear-gradient(90deg,#5a3c12,#f1d79a 40%,#9a7434 70%,#3a2408)}
.sb-lev-rod{position:absolute;left:24px;width:10px;border-radius:5px;background:linear-gradient(90deg,#666,#fff 45%,#888)}
.sb-lev-ball{position:absolute;left:14px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 8%,var(--knob,#e3102c) 30%,color-mix(in srgb,var(--knob,#e3102c) 40%,#000) 100%);box-shadow:0 4px 8px rgba(0,0,0,.6)}
.sb-royal .sb-lev-ball{--knob:#a24bff}.sb-board .sb-lev-ball{--knob:#2fd06a}.sb-party .sb-lev-ball{--knob:#19e3d2}
@media (max-width:720px){.sb-lever{display:none}}
.sb-pt{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:12px}
.sb-pt[hidden]{display:none}
.sb-pt-in{position:relative;width:min(760px,100%);max-height:100%;overflow:auto;background:linear-gradient(#1b1610,#0e0b07);border:1px solid var(--acc);border-radius:14px;padding:16px 18px;line-height:1.45}
.sb-pt-x{position:sticky;top:0;float:right;z-index:2;background:#000}
.sb-pt h3{font:400 22px "Bungee",Impact,sans-serif;color:var(--acc);margin:.1em 0 .4em}.sb-pt h4{color:var(--acc);margin:1em 0 .3em;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.sb-pt table{border-collapse:collapse;width:100%;font-size:14px}.sb-pt td,.sb-pt th{border-bottom:1px solid rgba(255,255,255,.1);padding:4px 6px;text-align:right;font-variant-numeric:tabular-nums}
.sb-pt td:first-child,.sb-pt th:first-child{text-align:left}.sb-pt th{color:var(--acc);font-size:12px}
.sb-pt img{width:40px;height:40px;vertical-align:middle;margin-right:2px;background:rgba(255,255,255,.06);border-radius:6px}
.sb-pt .sb-paygrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.sb-pt .sb-pg{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border-radius:8px;padding:6px}.sb-pt .sb-pg img{width:52px;height:52px;flex:none}
.sb-pt .sb-pg div{font-size:12px;line-height:1.35}.sb-pt .sb-pg b{color:var(--acc)}
.sb-pt .sb-linegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px}.sb-pt .sb-linegrid figure{margin:0;text-align:center;font-size:11px;color:#bfb6a6}.sb-pt .sb-linegrid canvas{width:66px;height:44px;display:block;margin:0 auto 2px}
.sb-pt .sb-chips{display:flex;flex-wrap:wrap;gap:6px}.sb-pt .sb-chips span{padding:3px 9px;border-radius:12px;background:rgba(255,255,255,.08);font-size:12px;font-variant-numeric:tabular-nums}
.sb-pt .sb-chips span b{color:var(--acc)}
.sb-fx{position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden}
.sb-coin{position:absolute;top:-40px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c0,#f7c948 40%,#a0680a 100%);box-shadow:inset 0 0 0 3px #c98a12,0 2px 4px rgba(0,0,0,.5);animation:sb-fall linear forwards}
@keyframes sb-fall{0%{transform:translateY(0) rotateY(0)}100%{transform:translateY(110vh) rotateY(1080deg)}}
@media (max-width:560px){.sb-ttl small{display:none}.sb-stage{padding:6px 6px 8px}.sb-cab{padding:8px;gap:6px;border-radius:18px 18px 12px 12px}.sb-marq{min-height:46px;padding:8px}.sb-marq-x{font-size:11px}
  .sb-spin{min-width:104px;font-size:18px;min-height:52px}.sb-deck{gap:6px;padding:6px}.sb-btn{padding:0 9px;font-size:13px}.sb-seg .sb-btn{min-width:42px}.sb-spin kbd{display:none}}
@media (max-width:560px) and (min-height:700px){.sb-marq{min-height:84px;padding:14px 10px}.sb-logo{font-size:30px}.sb-topbox{min-height:132px}.sb-meters{gap:6px}.sb-led b{font-size:13px}.sb-deck{padding:10px 6px}.sb-btn{min-height:48px}.sb-spin{min-height:58px;min-width:120px}}
/* bonus overlays (cover the stage; the top bar stays usable) */
.sb-bonus{position:absolute;inset:0;z-index:20;overflow:hidden;animation:sb-in .45s ease-out}
.sb-bonus.out{animation:sb-outk .35s ease-in forwards}
@keyframes sb-in{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
@keyframes sb-outk{to{opacity:0;transform:scale(.97)}}
.sb-res{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:6}
.sb-hud{display:grid;justify-items:center;gap:6px;padding:8px 12px;border-radius:14px;background:rgba(0,0,0,.45);border:1px solid color-mix(in srgb,var(--acc) 70%,transparent);text-align:center}
.sb-hud>b{font:400 clamp(18px,3.4vw,28px) "Bungee",Impact,sans-serif;color:var(--acc);text-shadow:0 2px 0 #000,0 0 12px color-mix(in srgb,var(--acc) 60%,transparent)}
.sb-stats{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:8px;width:100%}
.sb-stats span{display:grid;justify-items:center;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.1em;color:#e8dcff;text-align:center}
.sb-stats i{font:400 clamp(11px,2vw,16px) "Press Start 2P",monospace;font-style:normal;color:#fff;margin-top:4px;white-space:nowrap}
.sb-tip{padding:8px 16px;border-radius:20px;background:rgba(0,0,0,.55);color:#fff;font-weight:600;font-size:clamp(13px,1.8vw,16px);text-align:center;max-width:calc(100% - 24px)}
/* wheel */
.sb-wov{background:radial-gradient(ellipse at 50% 45%,#6a24b0 0%,#2a0a50 45%,#0a0216 100%)}
.sb-wcv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer;touch-action:manipulation}
.sb-whud{position:absolute;left:50%;top:8px;transform:translateX(-50%);width:min(560px,calc(100% - 20px));z-index:2}
.sb-wfoot{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;z-index:2;width:calc(100% - 20px)}
.sb-wgo{min-width:170px}
@media (min-width:900px){.sb-whud{left:22px;top:50%;transform:translateY(-50%);width:230px}.sb-whud .sb-stats{grid-auto-flow:row}.sb-wfoot{left:auto;right:22px;bottom:50%;transform:translateY(50%);width:230px}}
/* board */
.sb-bov{display:grid;place-items:center;padding:6px;background:radial-gradient(ellipse at 50% 40%,#16904c,#063a1c 70%,#021a0c)}
.sb-bd{position:relative;display:grid;grid-template-columns:1.25fr repeat(4,1fr) 1.25fr;grid-template-rows:1.25fr repeat(4,1fr) 1.25fr;gap:2px;background:#0b3d20;border:3px solid #fff;border-radius:10px;padding:3px;box-shadow:0 0 0 3px #0a4a24,0 18px 40px rgba(0,0,0,.6)}
.sb-sq{position:relative;min-width:0;min-height:0;background:linear-gradient(#f6fbf4,#dcebd8);color:#0b2a16;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;text-align:center;padding:0 1px 2px;font-size:var(--fz,11px);line-height:1.05}
.sb-sq.sb-corner{background:linear-gradient(#e8f8ea,#bfe0c4)}
.sb-band{display:block;align-self:stretch;flex:none;height:22%;border-bottom:1px solid rgba(0,0,0,.4)}
.sb-sqn{font-weight:700;padding:1px 1px 0;overflow:hidden;max-width:100%}
.sb-sqv{font:400 calc(var(--fz,11px)*1.05) "Bungee",Impact,sans-serif;color:#0a6a2a;white-space:nowrap}
.sb-ic{flex:1 1 auto;min-height:0;width:auto;max-width:86%;aspect-ratio:1;margin-top:2px}
.sb-sq.hit{animation:sb-hit 1.2s ease-out}
@keyframes sb-hit{0%,40%{background:#fff7a0;box-shadow:inset 0 0 0 3px #ffd34a,0 0 16px #ffe24a}100%{}}
.sb-sq.trail{background:#d8ffe4}
.sb-mid{grid-row:2/6;grid-column:2/6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(4px,1.2vmin,12px);position:relative;background:radial-gradient(ellipse at 50% 35%,#1ea85a,#0a4a26);border-radius:8px;padding:6px;overflow:hidden}
.sb-mid .sb-hud{background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.6);padding:6px 8px;width:100%}
.sb-mid .sb-hud>b{color:#fff;font-size:clamp(14px,3vmin,28px)}
.sb-dice{display:flex;gap:14px;min-height:var(--ds,54px);align-items:center;cursor:pointer}
.sb-roll{min-width:120px}
.sb-blog{font-size:clamp(11px,1.9vmin,16px);text-align:center;color:#fff;min-height:2.5em;font-weight:600;text-shadow:0 1px 2px #000}
.sb-token{position:absolute;left:0;top:0;z-index:3;transition:transform .2s ease-in-out;pointer-events:none;filter:drop-shadow(0 4px 3px rgba(0,0,0,.6))}
.sb-token canvas{width:100%;height:100%;display:block}
.sb-token.hop canvas{animation:sb-hop .22s ease-out}
@keyframes sb-hop{0%{transform:none}45%{transform:translateY(-34%) scale(1.08)}100%{transform:none}}
.sb-float{position:absolute;z-index:5;font:400 clamp(12px,2.4vmin,20px) "Bungee",Impact,sans-serif;color:#ffe24a;text-shadow:0 2px 0 #000,0 0 8px #000;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);animation:sb-float 1.4s ease-out forwards}
@keyframes sb-float{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-190%)}}
/* party */
.sb-pov{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,1.4vh,14px);padding:10px;
  background:repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 14px,transparent 14px 40px),radial-gradient(ellipse at 50% 30%,#ff4fa8 0%,#8a0a5a 45%,#1a0420 100%)}
.sb-pov .sb-hud{width:min(620px,100%);border-color:#19e3d2;background:rgba(20,0,30,.5)}
.sb-pov .sb-hud>b{color:#fff;text-shadow:0 2px 0 #3a0024,0 0 14px #19e3d2}
.sb-conf{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:7}
.sb-gifts{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(6px,1.4vmin,14px);width:min(720px,100%,calc((100vh - 290px) * 5 / 3))}
@media (max-aspect-ratio:4/5){.sb-gifts{grid-template-columns:repeat(3,1fr);width:min(400px,100%,calc((100vh - 300px) * 3 / 5))}}
.sb-gift{position:relative;aspect-ratio:1;border:0;background:none;padding:0;cursor:pointer;border-radius:12px;transition:transform .15s}
.sb-gift:hover:not(:disabled){transform:translateY(-4px) rotate(-2deg)}
.sb-gift:disabled{cursor:default}
.sb-gift canvas{width:100%;height:100%;display:block}
.sb-gift.shake canvas{animation:sb-shake .35s}
@keyframes sb-shake{25%{transform:rotate(-8deg) scale(1.05)}50%{transform:rotate(7deg) scale(1.1)}75%{transform:rotate(-4deg)}}
.sb-gift.open canvas{animation:sb-pop .35s cubic-bezier(.3,1.6,.5,1)}
.sb-gift.ghost{opacity:.5;filter:saturate(.4)}
.sb-gv{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);font:400 clamp(12px,2.6vmin,22px) "Bungee",Impact,sans-serif;color:#fff;text-shadow:0 2px 0 #3a0024,0 0 8px #000;white-space:nowrap;pointer-events:none}
.sb-gift.pooper .sb-gv{color:#c8d0ff;font-size:clamp(9px,1.6vmin,14px)}
@media (prefers-reduced-motion:reduce){.sb-bonus,.sb-gift canvas{animation:none!important}.sb-bulbs i{animation:none;opacity:.8}.sb-coin{display:none}.sb-card.sb-big b{animation:none}}
`;
  document.head.appendChild(s);
}

// =====================================================================================================
// Sprite rendering
// =====================================================================================================
function renderSymbol(cfg, sym, w, h, dpr) {
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
  const p = cfg.paint[sym]; if (!p) return cv;
  const c = cv.getContext('2d'); const s = Math.min(w, h) * .86;
  c.scale(dpr, dpr); c.translate((w - s) / 2, (h - s) / 2); c.scale(s / 100, s / 100);
  c.save(); try { p(c); } catch (e) { /* never break the reels on a paint error */ } c.restore();
  return cv;
}
function blurSprite(src) {
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const c = cv.getContext('2d');
  const n = 7, spread = src.height * .22;
  for (let i = 0; i < n; i++) { c.globalAlpha = i === (n >> 1) ? .5 : .28; c.drawImage(src, 0, (i / (n - 1) - .5) * spread); }
  return cv;
}
function paintBox(fn, px, dpr = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.round(px * dpr);
  const c = cv.getContext('2d'); c.scale(px * dpr / 100, px * dpr / 100); try { fn(c); } catch (e) { /* ignore */ } return cv;
}
function thumb(cfg, sym, px = 64) { return renderSymbol(cfg, sym, px, px, 1).toDataURL(); }

const LINE_COLORS = ['#ff3b3b', '#ffd23b', '#3bff6a', '#3bc8ff', '#ff3bd8', '#ff8a3b', '#a03bff', '#3bffd8', '#d8ff3b', '#ff3b8a', '#3b6aff', '#ffb03b', '#6aff3b', '#ff6a6a', '#3bffb0',
  '#b03bff', '#fff23b', '#3b9cff', '#ff3bb0', '#9cff3b', '#ffffff', '#ff9cf0', '#9cf0ff', '#f0ff9c', '#ffa07a', '#7affa0', '#a07aff', '#ff7aa0', '#7aa0ff', '#e0e0a0'];
const fmtShort = d => d >= 100000 ? '$' + Math.round(d / 1000) + 'K' : d >= 10000 ? '$' + (d / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : K.fmt(d);
const easeOutBack = t => { const c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const SEG_COL = { 25: '#6a2cf0', 30: '#1f7fff', 35: '#00a89a', 40: '#27b04a', 45: '#ff8a00', 50: '#e8173a', 60: '#ff4fa8', 75: '#e8b400', 100: '#00a8d8', 150: '#9a3dff', 200: '#ff6a00', 250: '#ff2d55', 500: '#c8c8d8', 1000: '#ffd700' };

// The prize-wheel face, centred at (0,0) with radius r. labels[i] is the text on segment i.
function paintWheelFace(c, r, labels) {
  const N = WHEEL.length, s = TAU / N;
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = rad(c, 0, 0, r * .9, 0, 0, r, [[0, '#fff0b0'], [.45, '#e0a82a'], [1, '#6a4400']]); c.fill();
  for (let i = 0; i < N; i++) {
    const a0 = i * s - Math.PI / 2, a1 = a0 + s, v = WHEEL[i].v, col = SEG_COL[v];
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r * .92, a0, a1); c.closePath();
    c.fillStyle = v === 1000 ? rad(c, 0, 0, r * .2, 0, 0, r * .92, [[0, '#fff8d0'], [.5, '#ffd700'], [.85, '#b07a12'], [1, '#6a4400']]) : rad(c, 0, 0, r * .15, 0, 0, r * .92, [[0, shade(col, .45)], [.55, col], [1, shade(col, -.35)]]);
    c.fill(); c.lineWidth = Math.max(1, r * .01); c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
    if (v >= 500) { c.save(); c.clip(); c.globalAlpha = .25; c.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(Math.cos(a0 + s / 2) * r * (.3 + k * .17), Math.sin(a0 + s / 2) * r * (.3 + k * .17), r * .02, 0, TAU); c.fill(); } c.restore(); }
  }
  if (labels) for (let i = 0; i < N; i++) {
    const a = (i + .5) * s - Math.PI / 2, v = WHEEL[i].v, lbl = labels[i];
    c.save(); c.rotate(a);
    let fs = r * .1; c.font = `400 ${fs}px ${FD}`; const w = c.measureText(lbl).width; if (w > r * .5) { fs *= r * .5 / w; c.font = `400 ${fs}px ${FD}`; }
    c.textAlign = 'right'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const dark = v === 1000 || v === 500 || v === 75;
    c.lineWidth = Math.max(2, fs * .22); c.strokeStyle = dark ? 'rgba(255,255,255,.85)' : 'rgba(20,0,40,.85)'; c.strokeText(lbl, r * .86, 0);
    c.fillStyle = dark ? '#1a0630' : '#fff'; c.fillText(lbl, r * .86, 0);
    c.restore();
  }
  c.beginPath(); c.arc(0, 0, r * .92, 0, TAU); c.lineWidth = Math.max(2, r * .018); c.strokeStyle = '#3a2200'; c.stroke();
  for (let j = 0; j < N; j++) {
    const a = j * s - Math.PI / 2, x = Math.cos(a) * r * .955, y = Math.sin(a) * r * .955, pr = Math.max(2, r * .024);
    c.beginPath(); c.arc(x, y, pr, 0, TAU); c.fillStyle = rad(c, x - pr * .3, y - pr * .3, pr * .1, x, y, pr, [[0, '#ffffff'], [.6, '#c0c0c8'], [1, '#55556a']]); c.fill();
  }
  const hr = r * .2;
  c.beginPath(); c.arc(0, 0, hr, 0, TAU); c.fillStyle = rad(c, -hr * .3, -hr * .3, hr * .1, 0, 0, hr, [[0, '#fff6c0'], [.5, '#f7c948'], [1, '#8a5a00']]); c.fill(); c.lineWidth = Math.max(1.5, r * .012); c.strokeStyle = '#3a2200'; c.stroke();
  c.beginPath(); c.arc(0, 0, hr * .72, 0, TAU); c.fillStyle = rad(c, 0, -hr * .2, 1, 0, 0, hr * .72, [[0, '#a24bff'], [1, '#2a0060']]); c.fill();
  star(c, 0, 0, 5, hr * .5, hr * .22); c.fillStyle = gold(c, -hr * .5, hr * .5); c.fill();
}

// =====================================================================================================
// The machine screen
// =====================================================================================================
function mountMachine(cfg, root, api) {
  injectSb();
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const sleep = ms => new Promise(r => later(r, ms));
  const R = K.rand;
  const isVideo = cfg.reels === 5;
  const observers = [];
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = `sb-screen sb-${cfg.style}${cfg.lines.length === 1 ? ' sb-one' : ''}${cfg.reels === 3 ? ' sb-has-glass' : ''}`;
  el.style.setProperty('--cab', cfg.theme.cabinet); el.style.setProperty('--acc', cfg.theme.accent); el.style.setProperty('--glass', cfg.theme.glass);
  const bulbs = n => `<i></i>`.repeat(n);
  el.innerHTML = `
  <header class="sb-top">
    <button type="button" class="sb-ib sb-leave">&#8249; Floor</button>
    <div class="sb-ttl"><b></b><small></small></div>
    <button type="button" class="sb-ib sb-pt-b">Paytable</button>
  </header>
  <main class="sb-stage">
    <div class="sb-cab">
      <div class="sb-marq${cfg.topbox ? ' sb-topbox' : ''}">${cfg.topbox ? '<canvas class="sb-topcv" aria-hidden="true"></canvas>' : ''}<div class="sb-bulbs t">${bulbs(22)}</div><div class="sb-logo"></div><div class="sb-marq-x"></div><div class="sb-bulbs b">${bulbs(22)}</div></div>
      <div class="sb-glass"></div>
      <div class="sb-reelwrap"><div class="sb-frame"><canvas class="sb-cv" aria-label="Reels" role="img"></canvas><div class="sb-ovl"></div></div></div>
      <div class="sb-meters"><div class="sb-led"><span>CREDITS</span><b class="m-cred"></b></div><div class="sb-led"><span>BET</span><b class="m-bet"></b></div><div class="sb-led win"><span>WIN</span><b class="m-win">$0</b></div></div>
      <div class="sb-msg" aria-live="polite"></div>
      <div class="sb-deck">
        <div class="sb-grp"><span>COIN</span><div class="sb-seg">${[1, 5, 25].map(v => `<button type="button" class="sb-btn" data-coin="${v}">$${v}</button>`).join('')}</div></div>
        <div class="sb-grp"><span>${cfg.unitName}</span><button type="button" class="sb-btn sb-dn" aria-label="Fewer">&minus;</button><b class="sb-units"></b><button type="button" class="sb-btn sb-up" aria-label="More">+</button></div>
        <button type="button" class="sb-btn sb-max">MAX BET</button>
        <button type="button" class="sb-btn sb-auto">AUTO</button>
        <button type="button" class="sb-btn sb-spin">SPIN<kbd>SPACE</kbd></button>
      </div>
    </div>
    <div class="sb-lever" title="Pull the lever"><div class="sb-lev-mount"></div><div class="sb-lev-rod"></div><div class="sb-lev-ball"></div></div>
  </main>
  <div class="sb-pt" hidden><div class="sb-pt-in"><button type="button" class="sb-ib sb-pt-x">Close</button><div class="sb-pt-body"></div></div></div>
  <div class="sb-fx"></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  $('.sb-ttl b').textContent = cfg.title; $('.sb-ttl small').textContent = cfg.blurb; $('.sb-logo').textContent = cfg.title;
  const stage = $('.sb-stage');
  const cv = $('.sb-cv'), ctx = cv.getContext('2d'), wrap = $('.sb-reelwrap'), ovl = $('.sb-ovl');
  const mCred = $('.m-cred'), mBet = $('.m-bet'), mWin = $('.m-win'), msgEl = $('.sb-msg');
  const spinBtn = $('.sb-spin'), autoBtn = $('.sb-auto'), maxBtn = $('.sb-max'), upBtn = $('.sb-up'), dnBtn = $('.sb-dn');
  const coinBtns = [...el.querySelectorAll('[data-coin]')];

  // ------------------------------------------------------------------ state
  let coin = 1, units = cfg.defUnits, busy = false, auto = 0, mode = 'base';
  let fsLeft = 0, fsTotal = 0, fsWon = 0, fsUnits = 0, fsCoin = 0, fsMultCur = 1;
  let wheel = null, board = null, party = null;
  // Money already decided but not yet paid; settled on unmount so leaving mid-feature never loses a prize.
  const owed = { line: 0, bonus: 0, fsN: 0, fsMult: 1, fsUnits: 0, fsCoin: 0 };
  const reels = cfg.reelDefs.map((d, i) => { const L = d.strip.length, top = topOf(cfg, i, R(L)); return { L, pos: top, state: 'idle', v: 0, t0: 0, from: 0, to: 0, dur: 0, stopAt: 0, target: null, speed: 0, p0: 0, antic: false }; });
  let hl = null;
  let win = { from: 0, to: 0, t0: 0, dur: 0, shown: 0, lastTick: 0 };
  let lever = { a: 0, anim: null, drag: null };
  let dirty = true, bw = null, bwSeq = 0;

  const totalBet = () => coin * units;
  const steps = cfg.unitSteps || Array.from({ length: cfg.maxUnits }, (_, i) => i + 1);
  function msg(t, kind = '') { msgEl.textContent = t; msgEl.className = 'sb-msg ' + kind; }
  function syncControls() {
    const locked = busy || mode !== 'base';
    coinBtns.forEach(b => { const on = +b.dataset.coin === coin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.disabled = locked; });
    $('.sb-units').textContent = units;
    upBtn.disabled = dnBtn.disabled = maxBtn.disabled = locked;
    const spinning = reels.some(r => r.state !== 'idle');
    spinBtn.disabled = mode !== 'base' || (busy && !spinning);
    spinBtn.classList.toggle('stop', spinning && mode === 'base');
    spinBtn.firstChild.textContent = spinning && mode === 'base' ? 'STOP' : 'SPIN';
    autoBtn.classList.toggle('on', auto > 0); autoBtn.textContent = auto > 0 ? `STOP ${auto}` : 'AUTO';
    autoBtn.disabled = mode !== 'base' && !(auto > 0);
    mBet.textContent = K.fmt(mode === 'free' ? 0 : totalBet());
    updateGlass();
  }
  const setCred = b => { mCred.textContent = K.fmt(b); };
  setCred(api.balance);
  const unsubBal = api.onBalance ? api.onBalance(setCred) : null;

  // ------------------------------------------------------------------ geometry + sprites
  let G = { cw: 100, ch: 100, gap: 6, W: 300, H: 300, dpr: 1 };
  let sprites = {}, blurs = {}, bgGrad = null, shadeGrad = null;
  const syms = Object.keys(cfg.paint);
  function layout() {
    const r = wrap.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const FR = 16, gap = isVideo ? 5 : 8, n = cfg.reels, rows = cfg.rows;
    const aw = r.width - FR, ah = r.height - FR;
    const cw = Math.max(30, Math.min((aw - (n - 1) * gap) / n, ah / rows * cfg.cellAspect));
    const ch = Math.max(26, Math.min(ah / rows, cw / cfg.aspectMin));
    const W = Math.round(n * cw + (n - 1) * gap), H = Math.round(rows * ch), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W === G.W && H === G.H && dpr === G.dpr && sprites[syms[0]]) return;
    G = { cw, ch, gap, W, H, dpr };
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    buildSprites();
  }
  function buildSprites() {
    sprites = {}; blurs = {};
    for (const s of syms) { sprites[s] = renderSymbol(cfg, s, G.cw, G.ch, G.dpr); blurs[s] = blurSprite(sprites[s]); }
    const BG = {
      ivory: [[0, '#6d6458'], [.16, '#e9e2d2'], [.5, '#fffdf6'], [.84, '#e9e2d2'], [1, '#6d6458']],
      board: [[0, '#02160a'], [.5, '#0e4a28'], [1, '#02160a']],
      party: [[0, '#14021c'], [.5, '#3e0a4a'], [1, '#14021c']]
    }[cfg.reelBg];
    bgGrad = lin(ctx, 0, 0, 0, G.H, BG);
    shadeGrad = lin(ctx, 0, 0, 0, G.H, [[0, 'rgba(0,0,0,.55)'], [.2, 'rgba(0,0,0,0)'], [.45, 'rgba(255,255,255,.06)'], [.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]);
    dirty = true; buildGlass();
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap); observers.push(ro);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) { buildSprites(); topFace = null; if (wheel) wheel.face = null; } });

  // ------------------------------------------------------------------ glass paytable (Spin-A-Fortune)
  const ruleIcons = (rule, img) => rule.k === 'wild' ? Array.from({ length: rule.n }, () => `<img src="${img('w2')}" alt="">`).join('') + `<small> any</small>`
    : rule.s.map(x => x[0] === '@' ? `<img src="${img('bar1')}" alt="">` : `<img src="${img(x)}" alt="">`).join('') + (rule.s.some(x => x[0] === '@') ? '<small> any</small>' : '');
  function buildGlass() {
    const g = $('.sb-glass'); if (cfg.reels !== 3) return;
    const th = {}; const img = s => (th[s] = th[s] || thumb(cfg, s, 44));
    const rows = cfg.rules.map(rule => `<tr><td>${ruleIcons(rule, img)}</td>${[1, 2, 3].map(n => `<td data-u="${n}">${(rule.pay * n).toLocaleString()}${rule.noMult ? '' : ''}</td>`).join('')}</tr>`);
    const head = `<tr><th></th>${[1, 2, 3].map(n => `<th>${n} COIN${n > 1 ? 'S' : ''}</th>`).join('')}</tr>`;
    const per = Math.ceil(rows.length / 2);
    g.innerHTML = `<div class="sb-two" style="grid-template-columns:1fr 1fr">${[0, 1].map(k => `<table>${head}${rows.slice(k * per, k * per + per).join('')}</table>`).join('')}</div>`;
    updateGlass();
  }
  function updateGlass() { if (cfg.reels !== 3) return; el.querySelectorAll('.sb-glass [data-u]').forEach(td => td.classList.toggle('on', +td.dataset.u === units)); }

  // ------------------------------------------------------------------ paytable overlay
  const pt = $('.sb-pt');
  function openPaytable() {
    const th = s => thumb(cfg, s, 80), box = fn => paintBox(fn, 80).toDataURL();
    let h = `<h3>${cfg.title}</h3>`;
    if (cfg.id === 'slot-wheel') {
      h += `<p>Three reels, one center payline. Bet 1–3 coins; the coin is $1, $5 or $25, and every pay below is multiplied by your coins. The <b>2X</b> and <b>3X Wilds</b> substitute for every symbol except SPIN and multiply the win they are in: a 2X and a 3X together pay <b>×6</b>; two 3X pay <b>×9</b>. Any BAR mix pays Any 3 BARs.</p>
      <p><img src="${th('spin')}" alt=""> <b>SPIN</b> appears only on reel 3. When it stops on the payline, the giant prize wheel in the top box lights up. Press SPIN to spin it and win <b>25× to 1000× your total bet</b>.</p>
      <h4>Pays (coins)</h4><table><tr><th>Combination</th><th>1 coin</th><th>2 coins</th><th>3 coins</th></tr>`;
      for (const rule of cfg.rules) h += `<tr><td>${ruleIcons(rule, th)}<br><small>${rule.name}${rule.noMult ? ' (not multiplied)' : rule.k === 'wild' ? ' (× wild multipliers)' : ''}</small></td>${[1, 2, 3].map(n => `<td>${(rule.pay * n).toLocaleString()}</td>`).join('')}</tr>`;
      h += `</table><h4>Prize wheel (× total bet)</h4><div class="sb-chips">${WHEEL.map(s => `<span><b>${s.v}×</b></span>`).join('')}</div>
        <p>The wheel has ${WHEEL.length} segments. Its average prize is ${(WHEEL.reduce((a, s) => a + s.v * s.w, 0) / WHEEL_TOTAL).toFixed(1)}× the total bet.</p>`;
    } else {
      h += cfg.id === 'slot-board'
        ? `<p>5 reels, 20 lines; the coin is the bet per line. Line wins pay left to right on adjacent reels. The <b>Deed Wild</b> (reels 2–4) substitutes for everything but the Dice.</p>
           <p><b>Board bonus:</b> <img src="${th('dice')}" alt=""> Dice land only on reels 1, 3 and 5. Three of them pay 3× the total bet and open the boardwalk: a square loop of 20 spaces. You get <b>${BOARD_ROLLS} rolls</b> of two dice and move the top hat around the board; <b>doubles give an extra roll</b>. Every landing pays:
           <b>property</b> spaces pay their prize, <b>PRIZE</b> spaces reveal 2× to 50×, <b>BEACH CLUB</b> pays 10×, <b>ADVANCE</b> moves you 3 more spaces, <b>FREE SPINS</b> adds 4 or 8 free spins (played after the board with every win <b>×${BOARD_FS_MULT}</b>), and <b>JAIL</b> costs you a roll. Passing or landing on START pays ${BOARD_PASS}×. All board prizes are × the total bet. Three Dice during free spins add ${FS_RETRIGGER} more.</p>`
        : `<p>5 reels, 4 rows, 30 lines; the coin is the bet per line. Line wins pay left to right on adjacent reels. The <b>Party Wild</b> (reels 2–4) substitutes for everything but Presents and Quick Strike bolts.</p>
           <p><b>Quick Strike:</b> <img src="${th('bolt')}" alt=""> lightning bolts pay anywhere on the screen: ${Object.entries(cfg.strikePay).filter(([n]) => n <= 9).map(([n, v]) => `${n} pay ${v}×`).join(', ')} the total bet.</p>
           <p><b>Party bonus:</b> <img src="${th('present')}" alt=""> Presents land on reels 2, 3 and 4. Three of them pay 2× the total bet and throw a party: <b>15 wrapped gifts</b>. Pick them one at a time; each one pays credits (${Math.min(...PARTY_PRIZES)}× to ${Math.max(...PARTY_PRIZES)}× the total bet) until you open a <img src="${box(pPooper)}" alt=""> <b>Party Pooper</b> (${PARTY_POOPERS} are hidden; your first pick is never one).</p>`;
      h += `<h4>Line pays (× bet per line)</h4><div class="sb-paygrid">`;
      h += `<div class="sb-pg"><img src="${th(cfg.wild)}" alt=""><div><b>${cfg.names[cfg.wild]}</b><br>Substitutes · reels 2–4</div></div>`;
      for (const [s, p] of Object.entries(cfg.pays)) h += `<div class="sb-pg"><img src="${th(s)}" alt="${cfg.names[s]}"><div><b>${cfg.names[s]}</b><br>${[5, 4, 3, 2].filter(n => p[n]).map(n => `${n}× ${p[n]}`).join('<br>')}</div></div>`;
      h += `<div class="sb-pg"><img src="${th(cfg.scatter)}" alt=""><div><b>${cfg.names[cfg.scatter]}</b><br>3 pay ${cfg.scatterPay[3]}× total<br>+ ${cfg.boardBonus ? 'board' : 'party'} bonus</div></div>`;
      if (cfg.strike) h += `<div class="sb-pg"><img src="${th(cfg.strike)}" alt=""><div><b>Quick Strike</b><br>${[9, 8, 7, 6, 5, 4, 3].map(n => `${n}× ${cfg.strikePay[n]}× total`).join('<br>')}</div></div>`;
      h += `</div><h4>Paylines</h4><div class="sb-linegrid">${cfg.lines.map((_, i) => `<figure><canvas data-line="${i}" width="132" height="88"></canvas>Line ${i + 1}</figure>`).join('')}</div>`;
    }
    h += `<h4>Theoretical return</h4><p>${RTP[cfg.id]}. Every outcome, including bonus prizes, is decided by a cryptographic RNG; the animation only reveals it. If you leave in the middle of a feature, its remaining prize is paid automatically.</p>
      <h4>Controls</h4><p>Space or SPIN to play (press again to stop the reels early; during a big-win count-up it skips ahead). Choose the coin value and ${cfg.unitName.toLowerCase()}, or MAX BET to bet the maximum and spin. AUTO plays 25 games and stops on a big win or a feature. In a bonus, Space spins the wheel, rolls the dice or opens a present.</p>`;
    $('.sb-pt-body').innerHTML = h;
    el.querySelectorAll('.sb-pt canvas[data-line]').forEach(c => {
      const g = c.getContext('2d'), L = cfg.lines[+c.dataset.line], rows = cfg.rows, cw = 132 / 5, chh = 88 / rows;
      g.fillStyle = '#000'; g.fillRect(0, 0, 132, 88);
      for (let i = 0; i < 5; i++) for (let r = 0; r < rows; r++) { g.fillStyle = L[i] === r ? LINE_COLORS[+c.dataset.line] : '#2a2a2a'; g.fillRect(i * cw + 2, r * chh + 2, cw - 4, chh - 4); }
    });
    pt.hidden = false; $('.sb-pt-x').focus();
  }
  $('.sb-pt-b').addEventListener('click', () => { K.sfx.button(); pt.hidden ? openPaytable() : (pt.hidden = true); });
  $('.sb-pt-x').addEventListener('click', () => { pt.hidden = true; });
  pt.addEventListener('click', e => { if (e.target === pt) pt.hidden = true; });
  $('.sb-leave').addEventListener('click', () => { K.sfx.button(); api.exit(); });

  // ------------------------------------------------------------------ bet controls
  coinBtns.forEach(b => b.addEventListener('click', () => { if (busy || mode !== 'base') return; coin = +b.dataset.coin; K.sfx.chip(); syncControls(); }));
  const stepUnits = d => { const i = steps.indexOf(units); units = steps[(i + d + steps.length) % steps.length]; K.sfx.chip(); syncControls(); if (cfg.lines.length > 1) showLinesPreview(); };
  upBtn.addEventListener('click', () => !busy && mode === 'base' && stepUnits(1));
  dnBtn.addEventListener('click', () => !busy && mode === 'base' && stepUnits(-1));
  maxBtn.addEventListener('click', () => { if (busy || mode !== 'base') return; units = cfg.maxUnits; K.sfx.chip(); syncControls(); spin(); });
  spinBtn.addEventListener('click', () => { K.sfx.button(); spin(); });
  autoBtn.addEventListener('click', () => { K.sfx.button(); if (auto > 0) { auto = 0; syncControls(); return; } if (mode !== 'base') return; auto = 25; syncControls(); if (!busy) spin(); });
  cv.addEventListener('click', () => { if (busy) { if (bw) skipCount(); else quickStop(); } });
  function showLinesPreview() { hl = { wins: cfg.lines.slice(0, units).map((L, i) => ({ line: i, cells: [], pay: 0, preview: true })), t0: performance.now(), preview: true }; dirty = true; later(() => { if (hl && hl.preview) { hl = null; dirty = true; } }, 1400); }

  const onKey = e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape' && !pt.hidden) { pt.hidden = true; return; }
    const sp = e.code === 'Space' || e.key === ' ';
    if (!sp && !(e.key === 'Enter' && mode !== 'base')) return;
    if (e.target && e.target.tagName === 'BUTTON' && e.key === 'Enter') return;
    e.preventDefault(); if (e.repeat || !pt.hidden) return;
    if (bw) { skipCount(); return; }
    if (mode === 'wheel') { wheelSpin(); return; }
    if (mode === 'board') { boardRoll(); return; }
    if (mode === 'party') { partyPickRandom(); return; }
    if (mode !== 'base') return;
    if (win.shown < win.to && !busy) { win.shown = win.to; win.dur = 0; return; }
    spin();
  };
  window.addEventListener('keydown', onKey);

  // ------------------------------------------------------------------ lever
  const levEl = $('.sb-lever'), rod = $('.sb-lev-rod'), ball = $('.sb-lev-ball');
  function setLever(a) {
    const H = levEl.clientHeight || 300, piv = H * .62, Lr = H * .56, e = Math.cos(Math.min(1, a) * Math.PI * .92);
    if (e >= 0) { rod.style.top = (piv - Lr * e) + 'px'; rod.style.height = Math.max(4, Lr * e) + 'px'; }
    else { rod.style.top = piv + 'px'; rod.style.height = (-Lr * e) + 'px'; }
    ball.style.top = (piv - Lr * e - 15) + 'px'; ball.style.transform = `scale(${1 + .4 * (1 - Math.abs(e))})`;
  }
  setLever(0);
  levEl.addEventListener('pointerdown', e => { if (busy || mode !== 'base') return; levEl.setPointerCapture(e.pointerId); lever.drag = { y0: e.clientY, a: 0, moved: false }; lever.anim = null; });
  levEl.addEventListener('pointermove', e => { if (!lever.drag) return; const H = levEl.clientHeight || 300; const a = Math.max(0, Math.min(1, (e.clientY - lever.drag.y0) / (H * .9))); if (a > .05) lever.drag.moved = true; lever.drag.a = a; lever.a = a; setLever(a); if (a > .85) releaseLever(true); });
  const releaseLever = (fire) => { if (!lever.drag) return; const d = lever.drag; lever.drag = null; if (fire || !d.moved || d.a > .5) { pullLever(d.a); spin(); } else { lever.anim = { t0: performance.now(), from: d.a, phase: 'up' }; } };
  levEl.addEventListener('pointerup', () => releaseLever(false));
  levEl.addEventListener('pointercancel', () => { lever.drag = null; lever.anim = { t0: performance.now(), from: lever.a, phase: 'up' }; });
  function pullLever(from = 0) { lever.anim = { t0: performance.now(), from, phase: 'down' }; K.tone(90, .12, { type: 'square', vol: .05 }); }
  function updLever(now) {
    const A = lever.anim; if (!A) return;
    if (A.phase === 'down') { const t = Math.min(1, (now - A.t0) / 160); lever.a = A.from + (1 - A.from) * t * t; if (t >= 1) { A.phase = 'hold'; A.t0 = now; K.sfx.reelStop(); } }
    else if (A.phase === 'hold') { if (now - A.t0 > 70) { A.phase = 'up'; A.t0 = now; A.from = 1; } }
    else { const t = Math.min(1, (now - A.t0) / 420); lever.a = A.from * (1 - easeOutBack(t)); if (t >= 1) { lever.a = 0; lever.anim = null; } }
    setLever(Math.max(0, lever.a));
  }

  // ------------------------------------------------------------------ win meter roll-up + big-win count-up
  function rollWin(to, from = 0) { const bet = Math.max(1, mode === 'free' ? fsUnits * fsCoin : totalBet()); win = { from, to, t0: performance.now(), dur: Math.min(4200, 350 + Math.sqrt(Math.max(0, to - from) / bet) * 420), shown: from, lastTick: 0 }; }
  function updWin(now) {
    if (win.shown >= win.to) return;
    const t = win.dur ? Math.min(1, (now - win.t0) / win.dur) : 1;
    win.shown = t >= 1 ? win.to : win.from + (win.to - win.from) * (1 - Math.pow(1 - t, 2));
    mWin.textContent = K.fmt(Math.floor(win.shown));
    if (now - win.lastTick > 75 && t < 1 && !bw) { win.lastTick = now; K.tone(1400 + 600 * t, .03, { type: 'square', vol: .035 }); }
    if (t >= 1) mWin.textContent = K.fmt(win.to);
  }
  const setWinMeter = v => { win = { from: v, to: v, t0: 0, dur: 0, shown: v, lastTick: 0 }; mWin.textContent = K.fmt(v); };
  // A title card whose number counts up from $0. host defaults to the reel overlay; bonus screens pass their own. Returns the count duration.
  function countCard(amount, x, title, host = ovl) {
    const tier = title || (x >= 100 ? 'EPIC WIN!' : x >= 40 ? 'MEGA WIN!' : 'BIG WIN!');
    host.innerHTML = `<div class="sb-card sb-big"><b>${tier}</b><em>$0</em></div>`;
    const dur = Math.min(5200, 900 + Math.sqrt(Math.max(1, x)) * 330), id = ++bwSeq;
    bw = { id, el: host.querySelector('em'), host, to: amount, t0: performance.now(), dur, last: 0 };
    later(() => { if (bw && bw.id === id) { bw = null; host.innerHTML = ''; } }, dur + 1900);
    return dur;
  }
  function updCount(now) {
    if (!bw) return;
    const t = Math.min(1, (now - bw.t0) / bw.dur);
    bw.el.textContent = K.fmt(t >= 1 ? bw.to : Math.floor(bw.to * (1 - Math.pow(1 - t, 2.2))));
    if (t < 1 && now - bw.last > 65) { bw.last = now; K.tone(900 + 1100 * t, .03, { type: 'square', vol: .03 }); }
    if (t >= 1 && !bw.landed) { bw.landed = true; K.tone(1568, .25, { type: 'triangle', vol: .1 }); K.sfx.chips(6); }
  }
  function skipCount() { if (bw) bw.t0 = performance.now() - bw.dur; if (win.shown < win.to) { win.shown = win.to; win.dur = 0; mWin.textContent = K.fmt(win.to); } }

  // ------------------------------------------------------------------ reels animation
  const VMAX = isVideo ? 26 : 20;
  let reelsDone = null, anticTone = 0;
  function startReels(targets, anticFrom = 99) {
    const now = performance.now();
    reels.forEach((r, i) => {
      r.state = 'windup'; r.t0 = now + i * 55; r.p0 = r.pos; r.v = 0; r.target = targets[i];
      r.stopAt = now + (isVideo ? 700 : 820) + i * (isVideo ? 230 : 380) + (i >= anticFrom ? (i - anticFrom + 1) * 1000 : 0);
      r.antic = i >= anticFrom;
    });
    K.tone(160, .35, { type: 'sawtooth', vol: .03, slide: 260 });
    const p = new Promise(res => { reelsDone = res; }); syncControls(); return p;
  }
  function quickStop() {
    const now = performance.now(); let k = 0;
    reels.forEach(r => { if (r.state === 'windup' || r.state === 'spin') { r.stopAt = Math.min(r.stopAt, now + k++ * 70); r.antic = false; } });
  }
  function beginStop(r, now) {
    r.state = 'stop'; r.t0 = now; r.dur = 380; r.from = r.pos;
    const D = Math.max(2, r.v * r.dur / 1000 / 3.2);
    r.to = r.target + r.L * Math.floor((r.pos - D - r.target) / r.L);
  }
  function updReels(now, dt) {
    let any = false;
    reels.forEach((r, i) => {
      if (r.state === 'idle') return; any = true;
      if (r.state === 'windup') { if (now < r.t0) return; const t = (now - r.t0) / 130; if (t >= 1) { r.state = 'spin'; r.v = 6; } else r.pos = r.p0 + .28 * Math.sin(t * Math.PI); r.speed = 0; return; }
      if (r.state === 'spin') {
        r.v = Math.min(r.antic && now > r.stopAt - 1300 ? VMAX * 1.35 : VMAX, r.v + 70 * dt); r.pos -= r.v * dt; r.speed = r.v;
        if (now >= r.stopAt) beginStop(r, now);
        return;
      }
      if (r.state === 'stop') {
        const t = Math.min(1, (now - r.t0) / r.dur), prev = r.pos;
        r.pos = r.from + (r.to - r.from) * easeOutBack(t); r.speed = dt > 0 ? Math.abs(r.pos - prev) / dt : 0;
        if (t >= 1) { r.pos = mod(r.target, r.L); r.state = 'idle'; r.antic = false; r.speed = 0; K.sfx.reelStop(); onReelStopped(i); if (reels.every(q => q.state === 'idle')) syncControls(); }
      }
    });
    if (reels.some(r => r.antic && r.state === 'spin') && now - anticTone > 140) { anticTone = now; K.tone(500 + (now / 3 % 400), .1, { type: 'triangle', vol: .05 }); }
    if (any && reels.every(r => r.state === 'idle') && reelsDone) { const f = reelsDone; reelsDone = null; f(); }
    return any;
  }
  let curGrid = null;
  function onReelStopped(i) {
    if (!curGrid) return;
    const col = curGrid[i];
    if (cfg.scatter && col.includes(cfg.scatter)) { K.tone(1046 + i * 120, .2, { type: 'triangle', vol: .1 }); K.tone(1318 + i * 120, .14, { type: 'sine', vol: .06, delay: .05 }); }
    if (cfg.strike && col.includes(cfg.strike)) K.tone(1700, .14, { type: 'sawtooth', vol: .045, slide: -1350 });
    if (cfg.topbox && i === 2 && col[1] === 'spin') { [784, 988, 1175, 1568].forEach((f, k) => K.tone(f, .16, { type: 'triangle', vol: .1, delay: k * .06 })); }
  }

  // ------------------------------------------------------------------ drawing
  const cellX = i => i * (G.cw + G.gap), cellY = r => r * G.ch;
  function drawReel(i, now) {
    const r = reels[i], d = cfg.reelDefs[i], x = cellX(i), { cw, ch } = G;
    ctx.save(); ctx.beginPath(); ctx.rect(x, 0, cw, G.H); ctx.clip();
    ctx.fillStyle = bgGrad; ctx.fillRect(x, 0, cw, G.H);
    const base = Math.floor(r.pos), frac = r.pos - base, blur = r.speed > 7;
    for (let k = 0; k <= cfg.rows; k++) {
      const sym = d.strip[mod(base + k, r.L)], img = blur ? blurs[sym] : sprites[sym];
      if (img) ctx.drawImage(img, x, (k - frac) * ch, cw, ch);
    }
    ctx.fillStyle = shadeGrad; ctx.fillRect(x, 0, cw, G.H);
    if (r.antic) { const a = .35 + .25 * Math.sin(now / 90); ctx.strokeStyle = `rgba(255,220,80,${a})`; ctx.lineWidth = 6; ctx.strokeRect(x + 3, 3, cw - 6, G.H - 6); }
    ctx.restore();
  }
  function drawLabel(label, cx, cy, col) {
    const fs = Math.max(12, Math.round(Math.min(G.cw, G.ch) * .18));
    ctx.save(); ctx.font = `400 ${fs}px ${FD}`; const tw = ctx.measureText(label).width + fs;
    const px = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, cx)), py = Math.min(G.H - fs * .8, Math.max(fs * .8, cy));
    ctx.fillStyle = 'rgba(0,0,0,.82)'; rr(ctx, px - tw / 2, py - fs * .75, tw, fs * 1.5, fs * .5); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, px, py + 1); ctx.restore();
  }
  function drawHighlights(now) {
    if (!hl) return;
    const { wins } = hl, cyc = wins.length > 1 && !hl.preview, all = (now - hl.t0) < 1600 || !cyc;
    const showing = all ? wins : [wins[Math.floor((now - hl.t0 - 1600) / 1300) % wins.length]];
    const pulse = .6 + .4 * Math.sin(now / 130);
    if (!all) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; const on = new Set(); showing.forEach(w => w.cells.forEach(([i, r]) => on.add(i + ',' + r)));
      for (let i = 0; i < cfg.reels; i++) for (let r = 0; r < cfg.rows; r++) if (!on.has(i + ',' + r)) ctx.fillRect(cellX(i), cellY(r), G.cw, G.ch);
      ctx.restore();
    }
    for (const w of showing) {
      const col = w.line >= 0 ? (cfg.lines.length === 1 ? '#ffe24a' : LINE_COLORS[w.line]) : w.strike ? '#ffe24a' : TEAL;
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (w.line >= 0) {
        const L = cfg.lines[w.line]; ctx.globalAlpha = .9; ctx.lineWidth = Math.max(3, G.ch * .045);
        ctx.beginPath(); L.forEach((r, i) => { const px = cellX(i) + G.cw / 2, py = cellY(r) + G.ch / 2; if (i === 0) ctx.moveTo(px - G.cw / 2, py); ctx.lineTo(px, py); if (i === L.length - 1) ctx.lineTo(px + G.cw / 2, py); }); ctx.stroke();
      }
      ctx.globalAlpha = pulse; ctx.lineWidth = Math.max(3, G.ch * .05);
      for (const [i, r] of w.cells) { ctx.beginPath(); rr(ctx, cellX(i) + 3, cellY(r) + 3, G.cw - 6, G.ch - 6, 8); ctx.stroke(); }
      ctx.restore();
      if (!all && w.pay > 0) { const [i, r] = w.cells[w.cells.length - 1]; drawLabel(K.fmt(w.pay * (hl.coin || coin)), cellX(i) + G.cw / 2, cellY(r) + G.ch - Math.min(G.cw, G.ch) * .16, col); }
    }
    if (all && !hl.preview && wins.length) {
      const tot = wins.reduce((a, w) => a + w.pay, 0) * (hl.coin || coin);
      if (tot > 0) drawLabel(K.fmt(tot), G.W / 2, cfg.rows === 3 && cfg.reels === 3 ? G.ch * 2.62 : G.H / 2, '#ffe24a');
    }
    if (!all) { const w = showing[0]; if (w && w.label && hl.lastShown !== w) { hl.lastShown = w; msg(`${w.line >= 0 && cfg.lines.length > 1 ? `Line ${w.line + 1}: ` : ''}${w.label} — ${K.fmt(w.pay * (hl.coin || coin))}`, 'win'); } }
  }

  // ------------------------------------------------------------------ top box wheel (Spin-A-Fortune marquee)
  const topCv = $('.sb-topcv'); let topFace = null, topKey = '', topLast = 0;
  function wheelLabels(bet$) { return WHEEL.map(s => fmtShort(s.v * bet$)); }
  function faceCanvas(r, dpr, bet$, labels = true) {
    const pad = 2, size = Math.ceil((r + pad) * 2 * dpr), cvF = document.createElement('canvas'); cvF.width = cvF.height = size;
    const c = cvF.getContext('2d'); c.scale(dpr, dpr); c.translate(r + pad, r + pad); paintWheelFace(c, r, labels ? wheelLabels(bet$) : null);
    return { cv: cvF, r, pad };
  }
  function drawBulbRing(c, cx, cy, rr0, n, now, fast, flash) {
    const ph = Math.floor(now / (fast ? 55 : 150));
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n - Math.PI / 2, x = cx + Math.cos(a) * rr0, y = cy + Math.sin(a) * rr0;
      const on = flash ? (Math.floor(now / 160) + i) % 2 === 0 : (i + ph) % 4 < 2;
      const br = Math.max(2.2, rr0 * .02);
      if (on) { c.beginPath(); c.arc(x, y, br * 2.4, 0, TAU); c.fillStyle = 'rgba(255,230,120,.25)'; c.fill(); }
      c.beginPath(); c.arc(x, y, br, 0, TAU); c.fillStyle = on ? '#fffbe0' : '#7a5a2a'; c.fill();
    }
  }
  function drawTopbox(now) {
    if (!topCv || now - topLast < 33) return; topLast = now;
    const w = topCv.clientWidth, h = topCv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w < 10 || h < 10) return;
    if (topCv.width !== Math.round(w * dpr) || topCv.height !== Math.round(h * dpr)) { topCv.width = Math.round(w * dpr); topCv.height = Math.round(h * dpr); topFace = null; }
    const r = Math.min(w * .44, h * 1.05), key = `${r}|${dpr}|${totalBet()}`;
    if (!topFace || topKey !== key) { topFace = faceCanvas(r, dpr, totalBet(), r > 80); topKey = key; }
    const c = topCv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * .2 + r, th = now / 1000 * .12;
    c.save(); c.globalAlpha = .1; c.translate(cx, cy); c.rotate(-th * .5); c.fillStyle = '#ffd34a';
    for (let i = 0; i < 18; i++) { c.rotate(TAU / 18); c.beginPath(); c.moveTo(0, 0); c.lineTo(-r * .2, -r * 2.2); c.lineTo(r * .2, -r * 2.2); c.closePath(); c.fill(); } c.restore();
    c.beginPath(); c.arc(cx, cy, r * 1.08, 0, TAU); c.fillStyle = '#2a0a4a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#ffcc33'; c.stroke();
    c.save(); c.translate(cx, cy); c.rotate(th); const F = topFace; c.drawImage(F.cv, -(F.r + F.pad), -(F.r + F.pad), (F.r + F.pad) * 2, (F.r + F.pad) * 2); c.restore();
    drawBulbRing(c, cx, cy, r * 1.04, 44, now, el.classList.contains('winning'), false);
    drawPointer(c, cx, cy, r, 0);
  }
  function drawPointer(c, cx, cy, r, ang) {
    const px = cx, py = cy - r * 1.13;
    c.save(); c.translate(px, py); c.rotate(ang);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = r * .04; c.shadowOffsetY = r * .015;
    c.beginPath(); c.moveTo(-r * .08, 0); c.quadraticCurveTo(0, -r * .07, r * .08, 0); c.lineTo(r * .02, r * .24); c.lineTo(0, r * .27); c.lineTo(-r * .02, r * .24); c.closePath();
    c.fillStyle = lin(c, -r * .08, 0, r * .08, 0, [[0, '#7a0010'], [.45, '#ff3a4a'], [1, '#8a0010']]); c.fill();
    c.shadowColor = 'transparent'; c.lineWidth = Math.max(1.5, r * .012); c.strokeStyle = '#ffd34a'; c.stroke();
    c.beginPath(); c.arc(0, 0, r * .035, 0, TAU); c.fillStyle = rad(c, -r * .01, -r * .01, 1, 0, 0, r * .035, [[0, '#fff6c0'], [1, '#a07010']]); c.fill(); c.strokeStyle = '#3a2200'; c.lineWidth = 1; c.stroke();
    c.restore();
  }

  // ------------------------------------------------------------------ frame loop
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const moving = updReels(now, dt); updLever(now); updWin(now); updCount(now);
    if (cfg.topbox) drawTopbox(now);
    if (wheel) drawWheel(now, dt);
    if (party) drawConfetti(now, dt);
    if (!(moving || hl || dirty || reels.some(r => r.antic))) return;
    dirty = false;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, G.W, G.H);
    for (let i = 0; i < cfg.reels; i++) drawReel(i, now);
    if (cfg.lines.length === 1 && !hl) { ctx.save(); ctx.strokeStyle = 'rgba(227,16,44,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, G.H / 2); ctx.lineTo(G.W, G.H / 2); ctx.stroke(); ctx.restore(); }
    drawHighlights(now);
  }

  // ------------------------------------------------------------------ effects + sounds
  function card(title, sub, ms = 1800) { bw = null; ovl.innerHTML = `<div class="sb-card"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; if (ms) later(() => { ovl.innerHTML = ''; }, ms); }
  function coinShower(n = 28) {
    const fx = $('.sb-fx');
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'sb-coin'; c.style.left = (Math.random() * 100) + '%'; c.style.animationDuration = (1.4 + Math.random() * 1.4) + 's'; c.style.animationDelay = (Math.random() * .8) + 's'; const s = 20 + Math.random() * 18; c.style.width = c.style.height = s + 'px'; fx.appendChild(c); later(() => c.remove(), 3400); }
  }
  function celebrate(amount, bet) {
    const x = amount / Math.max(1, bet);
    el.classList.add('winning'); later(() => el.classList.remove('winning'), 2600);
    if (x >= 12) { K.sfx.bigWin(); coinShower(x >= 40 ? 48 : 26); return countCard(amount, x); }
    K.sfx.win(); return 0;
  }
  function fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => K.tone(f, .16, { type: 'square', vol: .06, delay: i * .09 })); K.tone(1568, .5, { type: 'triangle', vol: .08, delay: .63 }); }
  function partyHorn(d = 0) {
    K.tone(330, .5, { type: 'sawtooth', vol: .06, slide: 160, delay: d }); K.tone(334, .5, { type: 'square', vol: .03, slide: 165, delay: d });
    K.tone(495, .25, { type: 'sawtooth', vol: .04, slide: -60, delay: d + .5 });
  }
  function pooperSound() { K.tone(240, .32, { type: 'sawtooth', vol: .06, slide: -70 }); K.tone(180, .55, { type: 'sawtooth', vol: .06, slide: -70, delay: .34 }); }
  function floatText(host, x, y, t, col) {
    const f = document.createElement('div'); f.className = 'sb-float'; f.textContent = t; f.style.left = x + 'px'; f.style.top = y + 'px'; if (col) f.style.color = col;
    host.appendChild(f); later(() => f.remove(), 1500);
  }

  // ------------------------------------------------------------------ play
  async function spinOnce({ free = false } = {}) {
    const u = free ? fsUnits : units, cv$ = free ? fsCoin : coin, bet$ = u * cv$;
    hl = null; dirty = true;
    const stops = spinStops(cfg, R), grid = gridOf(cfg, stops);
    curGrid = grid;
    const res = cfg.evaluate(cfg, grid, u, free ? fsMultCur : 1);
    res.paid = res.coins * cv$; res.bet = bet$;
    owed.line = res.paid;
    if (!free) {
      // bonus outcomes are decided now, together with the reel stops
      if (res.wheel) { res.wheelIdx = wheelPick(R); res.bonusPay = WHEEL[res.wheelIdx].v * bet$; }
      if (res.bonus && cfg.boardBonus) { res.board = boardPlay(R); res.bonusPay = res.board.total * bet$; if (res.board.fs) Object.assign(owed, { fsN: res.board.fs, fsMult: BOARD_FS_MULT, fsUnits: u, fsCoin: cv$ }); }
      if (res.bonus && cfg.partyBonus) { res.party = partyPlay(R); res.bonusPay = res.party.total * bet$; }
      owed.bonus = res.bonusPay || 0;
    } else if (res.bonus) owed.fsN += FS_RETRIGGER;
    syncControls();
    await startReels(stops.map((s, i) => topOf(cfg, i, s)), cfg.antic(grid));
    if (!alive) return null;
    dirty = true;
    if (res.paid > 0) api.win(res.paid);
    owed.line = 0;
    if (res.wins.length) hl = { wins: res.wins, t0: performance.now(), coin: cv$ };
    return res;
  }
  async function spin() {
    if (!alive || mode !== 'base') return;
    if (busy) { if (bw) skipCount(); else quickStop(); return; }
    if (!pt.hidden) pt.hidden = true;
    const bet = totalBet();
    if (!api.bet(bet)) { msg(`Not enough chips for a ${K.fmt(bet)} bet — lower the coin or ${cfg.unitName.toLowerCase()}.`, 'lose'); K.sfx.lose(); auto = 0; syncControls(); return; }
    busy = true; bw = null; ovl.innerHTML = ''; setWinMeter(0);
    if (lever.a === 0 && !lever.anim) pullLever(0);
    msg('Good luck!', '');
    const res = await spinOnce();
    if (!res) return;
    let total = res.paid;
    if (total > 0) {
      rollWin(total); const d = celebrate(total, bet); msg(winText(res, coin), 'win');
      await sleep(Math.min(d ? d + 900 : 2600, Math.max(win.dur, d) + 250));
    } else msg(res.wheel || res.board || res.party ? 'Bonus!' : 'No win — try again.', res.wheel || res.board || res.party ? 'gold' : '');
    if (!alive) return;
    if (res.wheel) total += await runWheel(res);
    if (res.board) total += await runBoard(res);
    if (res.party) total += await runParty(res);
    if (!alive) return;
    busy = false; mode = 'base'; syncControls();
    if (auto > 0) {
      auto--; syncControls();
      if (total >= bet * 100 || res.wheel || res.board || res.party) { auto = 0; syncControls(); msg('Auto play stopped on a feature.', 'gold'); }
      else if (auto > 0) later(() => { if (!busy && auto > 0) spin(); }, total > 0 ? 900 : 380);
    }
  }
  function winText(res, cvv) {
    if (res.wins.length === 1) { const w = res.wins[0]; return `${w.label} pays ${K.fmt(w.pay * cvv)}`; }
    return `${res.wins.length} wins pay ${K.fmt(res.paid)}`;
  }

  async function runFreeSpins(n, mult) {
    mode = 'free'; fsLeft = n; fsTotal = n; fsWon = 0; fsUnits = units; fsCoin = coin; fsMultCur = mult; syncControls();
    Object.assign(owed, { fsN: n, fsMult: mult, fsUnits, fsCoin });
    fanfare(); card(`${n} FREE SPINS`, `All wins ×${mult}`, 2200); el.classList.add('winning');
    const mx = $('.sb-marq-x');
    await sleep(2300);
    while (fsLeft > 0 && alive) {
      fsLeft--; owed.fsN = fsLeft; mx.textContent = `FREE SPIN ${fsTotal - fsLeft} of ${fsTotal} · WINS ×${mult} · WON ${K.fmt(fsWon)}`;
      msg(`Free spin ${fsTotal - fsLeft} of ${fsTotal}`, 'gold');
      const res = await spinOnce({ free: true }); if (!res) return fsWon;
      if (res.paid > 0) { rollWin(fsWon + res.paid, fsWon); fsWon += res.paid; msg(winText(res, fsCoin), 'win'); K.sfx.win(); }
      if (res.bonus) { fsLeft += FS_RETRIGGER; fsTotal += FS_RETRIGGER; owed.fsN = fsLeft; card(`+${FS_RETRIGGER} FREE SPINS`, 'Retriggered!', 1600); fanfare(); await sleep(1600); }
      mx.textContent = `FREE SPIN ${fsTotal - fsLeft} of ${fsTotal} · WINS ×${mult} · WON ${K.fmt(fsWon)}`;
      await sleep(res.paid > 0 ? Math.min(2200, win.dur + 500) : 650);
    }
    if (!alive) return fsWon;
    owed.fsN = 0; el.classList.remove('winning');
    const d = countCard(fsWon, fsWon / Math.max(1, fsUnits * fsCoin), 'FREE SPINS WIN'); setWinMeter(fsWon);
    fanfare(); mx.textContent = ''; msg(`Free spins paid ${K.fmt(fsWon)}`, 'win');
    await sleep(d + 1600);
    mode = 'base'; hl = null; dirty = true; syncControls();
    return fsWon;
  }

  // ------------------------------------------------------------------ Spin-A-Fortune prize wheel
  function makeWheel(bet$, idx) {
    const o = document.createElement('div'); o.className = 'sb-bonus sb-wov';
    o.innerHTML = `<canvas class="sb-wcv" role="img" aria-label="Prize wheel"></canvas>
      <div class="sb-whud sb-hud"><b>PRIZE WHEEL</b><div class="sb-stats"><span>BET<i>${K.fmt(bet$)}</i></span><span>TOP PRIZE<i>${fmtShort(1000 * bet$)}</i></span></div></div>
      <div class="sb-wfoot"><div class="sb-tip">Tap the wheel or press Space</div><button type="button" class="sb-btn sb-spin sb-wgo">SPIN</button></div>
      <div class="sb-res"></div>`;
    stage.appendChild(o);
    const Wh = { el: o, cv: o.querySelector('canvas'), btn: o.querySelector('.sb-wgo'), tip: o.querySelector('.sb-tip'), res: o.querySelector('.sb-res'), W: 0, H: 0, dpr: 1, r: 100, cx: 0, cy: 0,
      theta: -(idx + 12.5) * TAU / WHEEL.length + R(WHEEL.length) * TAU / WHEEL.length, idx, bet: bet$, face: null, anim: null, spun: false, defl: 0, peg: 0, clickT: 0, lit: -1, done: null };
    Wh.peg = Math.floor(Wh.theta / (TAU / WHEEL.length));
    Wh.cv.addEventListener('pointerdown', () => wheelSpin());
    Wh.btn.addEventListener('click', () => { K.sfx.button(); wheelSpin(); });
    return Wh;
  }
  function wheelSpin() {
    const Wh = wheel; if (!Wh || Wh.spun || !alive) return;
    Wh.spun = true; Wh.btn.disabled = true; Wh.tip.textContent = 'Round and round it goes…';
    const N = WHEEL.length, s = TAU / N, i = Wh.idx, v = WHEEL[i].v;
    const next = WHEEL[(i - 1 + N) % N].v, prev = WHEEL[(i + 1) % N].v;
    // Near-miss drama: when the segment after the prize is a bigger prize, the wheel creeps right up to that peg, teeters, and rocks back.
    const near = next >= 250 && next > v, passed = !near && prev >= 250 && prev > v;
    const f = near ? .3 + R(12) / 100 : passed ? .8 + R(8) / 100 : .22 + R(56) / 100;
    const base = -(i + f) * s, cur = Wh.theta;
    const tgt = base + TAU * Math.ceil((cur - base) / TAU) + TAU * (5 + R(2));
    const now = performance.now(), back = cur - s * .55;
    const segs = [{ a: cur, b: back, d: 520, e: easeInOut }];
    if (near) { const over = tgt + (f - .035) * s; segs.push({ a: back, b: over, d: 9200, e: t => 1 - Math.pow(1 - t, 3.4) }, { a: over, b: over, d: 650, e: t => t }, { a: over, b: tgt, d: 1100, e: easeInOut }); }
    else segs.push({ a: back, b: tgt, d: passed ? 9600 : 8200, e: t => 1 - Math.pow(1 - t, passed ? 3.8 : 3.2) });
    Wh.anim = { t0: now, segs, near };
    K.tone(140, .5, { type: 'sawtooth', vol: .04, slide: 200 });
  }
  function updWheel(now, dt) {
    const Wh = wheel, A = Wh.anim; if (!A) return;
    let t = now - A.t0, k = 0;
    while (k < A.segs.length - 1 && t > A.segs[k].d) { t -= A.segs[k].d; k++; }
    const S = A.segs[k], u = Math.min(1, t / S.d), prevTh = Wh.theta;
    Wh.theta = S.a + (S.b - S.a) * S.e(u);
    const s = TAU / WHEEL.length, peg = Math.floor(Wh.theta / s);
    if (peg !== Wh.peg) {
      const speed = Math.abs(Wh.theta - prevTh) / Math.max(.001, dt);
      if (now - Wh.clickT > 28) { Wh.clickT = now; K.tone(2300 + Math.min(900, speed * 60), .018, { type: 'square', vol: Math.min(.07, .03 + speed * .004) }); }
      Wh.peg = peg;
    }
    if (k === A.segs.length - 1 && u >= 1) { Wh.anim = null; Wh.lit = Wh.idx; if (Wh.done) { const f = Wh.done; Wh.done = null; f(); } }
  }
  function drawWheel(now, dt) {
    const Wh = wheel; updWheel(now, dt);
    const w = Wh.cv.clientWidth, h = Wh.cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w < 10 || h < 10) return;
    if (w !== Wh.W || h !== Wh.H || dpr !== Wh.dpr) {
      Wh.W = w; Wh.H = h; Wh.dpr = dpr; Wh.cv.width = Math.round(w * dpr); Wh.cv.height = Math.round(h * dpr);
      const wide = w >= 900, topM = wide ? 14 : Wh.el.querySelector('.sb-whud').offsetHeight + 16, botM = wide ? 14 : Wh.el.querySelector('.sb-wfoot').offsetHeight + 16;
      const avail = Math.max(120, h - topM - botM);
      Wh.r = Math.max(60, Math.min((wide ? w - 540 : w) * .455, avail / 2.32)); Wh.cx = w / 2; Wh.cy = topM + avail / 2 + Wh.r * .06; Wh.face = null;
    }
    if (!Wh.face) Wh.face = faceCanvas(Wh.r, dpr, Wh.bet);
    const c = Wh.cv.getContext('2d'), { cx, cy, r } = Wh, s = TAU / WHEEL.length;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    // light rays
    c.save(); c.translate(cx, cy); c.rotate(now / 9000); c.fillStyle = 'rgba(255,215,90,.07)';
    for (let i = 0; i < 16; i++) { c.rotate(TAU / 16); c.beginPath(); c.moveTo(0, 0); c.lineTo(-r * .3, -Math.hypot(w, h)); c.lineTo(r * .3, -Math.hypot(w, h)); c.closePath(); c.fill(); } c.restore();
    // static outer frame with chasing bulbs
    c.beginPath(); c.arc(cx, cy, r * 1.1, 0, TAU); c.fillStyle = rad(c, cx, cy, r, cx, cy, r * 1.1, [[0, '#14052a'], [.5, '#4a1a80'], [1, '#1a0636']]); c.fill();
    c.lineWidth = Math.max(2, r * .014); c.strokeStyle = '#ffcc33'; c.stroke();
    c.beginPath(); c.arc(cx, cy, r * 1.005, 0, TAU); c.lineWidth = Math.max(1.5, r * .008); c.strokeStyle = '#ffe9a0'; c.stroke();
    const spinning = !!Wh.anim && Wh.anim.segs.length;
    drawBulbRing(c, cx, cy, r * 1.053, 48, now, spinning, Wh.lit >= 0);
    // the wheel itself
    c.save(); c.translate(cx, cy); c.rotate(Wh.theta);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = r * .06;
    const F = Wh.face; c.drawImage(F.cv, -(F.r + F.pad), -(F.r + F.pad), (F.r + F.pad) * 2, (F.r + F.pad) * 2);
    c.shadowColor = 'transparent';
    if (Wh.lit >= 0) {
      const a0 = Wh.lit * s - Math.PI / 2, pulse = .5 + .5 * Math.sin(now / 110);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r * .92, a0, a0 + s); c.closePath();
      c.fillStyle = `rgba(255,255,255,${.12 + .28 * pulse})`; c.fill(); c.lineWidth = r * .022; c.strokeStyle = `rgba(255,230,90,${.6 + .4 * pulse})`; c.stroke();
    }
    c.restore();
    // pointer deflection from the peg that is about to pass under it
    const x = mod(Wh.theta, s), d = s - x, z = s * .42;
    const target = d < z ? 1 - d / z : 0;
    Wh.defl = target > Wh.defl ? target : Wh.defl * Math.pow(.0009, dt);
    drawPointer(c, cx, cy, r, -Wh.defl * .5);
    // glass shine
    c.save(); c.beginPath(); c.arc(cx, cy, r * .92, 0, TAU); c.clip();
    c.fillStyle = lin(c, cx - r, cy - r, cx + r * .2, cy + r * .2, [[0, 'rgba(255,255,255,.18)'], [.5, 'rgba(255,255,255,0)']]); c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
  }
  async function runWheel(res) {
    const bet$ = res.bet, prize = res.bonusPay;
    K.banner(el, 'SPIN THE WHEEL!'); el.classList.add('winning'); fanfare();
    msg('SPIN on the payline: the prize wheel lights up!', 'gold');
    await sleep(1900); if (!alive) return 0;
    ovl.innerHTML = ''; bw = null;
    mode = 'wheel'; syncControls();
    wheel = makeWheel(bet$, res.wheelIdx);
    msg('Spin the wheel!', 'gold');
    if (auto > 0) later(() => wheelSpin(), 1500);
    await new Promise(r => { wheel.done = r; });
    if (!alive) return 0;
    api.win(prize); owed.bonus = 0;
    rollWin(prize); K.sfx.bigWin(); coinShower(44); fanfare();
    wheel.tip.textContent = `${WHEEL[res.wheelIdx].v}× the bet!`;
    const d = countCard(prize, prize / bet$, 'WHEEL WIN!', wheel.res);
    msg(`Wheel prize: ${WHEEL[res.wheelIdx].v}× bet = ${K.fmt(prize)}`, 'win');
    await sleep(d + 1700); if (!alive) return prize;
    wheel.el.classList.add('out'); await sleep(360); if (!alive) return prize;
    wheel.el.remove(); wheel = null; el.classList.remove('winning');
    mode = 'base'; dirty = true; syncControls();
    return prize;
  }

  // ------------------------------------------------------------------ Boardwalk board bonus
  const boardRC = i => i <= 5 ? [6, 6 - i] : i <= 10 ? [6 - (i - 5), 1] : i <= 15 ? [1, 1 + (i - 10)] : [1 + (i - 15), 6];
  const ICONS = {
    start(c) { c.fillStyle = '#e02a2a'; c.beginPath(); c.moveTo(8, 50); c.lineTo(46, 18); c.lineTo(46, 36); c.lineTo(92, 36); c.lineTo(92, 64); c.lineTo(46, 64); c.lineTo(46, 82); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = '#5a0008'; c.stroke(); },
    jail(c) { rr(c, 10, 10, 80, 80, 8); c.fillStyle = '#f08a1a'; c.fill(); rr(c, 22, 22, 56, 56, 4); c.fillStyle = '#2a2a3a'; c.fill(); c.fillStyle = '#ddd'; for (let x = 28; x < 76; x += 11) c.fillRect(x, 22, 5, 56); c.lineWidth = 3; c.strokeStyle = '#3a1a00'; c.strokeRect(10, 10, 80, 80); },
    corner(c) { c.strokeStyle = '#5a3a1a'; c.lineWidth = 5; c.beginPath(); c.moveTo(50, 40); c.lineTo(58, 92); c.stroke(); c.beginPath(); c.moveTo(6, 44); c.quadraticCurveTo(50, -12, 94, 44); c.closePath(); c.fillStyle = lin(c, 6, 0, 94, 0, [[0, '#e02a2a'], [.33, '#e02a2a'], [.33, '#fff'], [.66, '#fff'], [.66, '#e02a2a']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a0008'; c.stroke(); c.beginPath(); c.arc(82, 80, 12, 0, TAU); c.fillStyle = '#ffd34a'; c.fill(); },
    fs(c) { c.lineWidth = 9; c.strokeStyle = '#1a9a4a'; c.lineCap = 'round'; c.beginPath(); c.arc(50, 50, 32, -.4, Math.PI * 1.55); c.stroke(); c.fillStyle = '#1a9a4a'; c.beginPath(); c.moveTo(88, 20); c.lineTo(86, 52); c.lineTo(58, 34); c.closePath(); c.fill(); text(c, 'FREE', 50, 52, 20, { fill: '#e02a2a' }); },
    adv(c) { c.fillStyle = '#1a3aa0'; c.beginPath(); c.moveTo(10, 36); c.lineTo(56, 36); c.lineTo(56, 16); c.lineTo(92, 50); c.lineTo(56, 84); c.lineTo(56, 64); c.lineTo(10, 64); c.closePath(); c.fill(); text(c, '3', 36, 51, 26, { fill: '#fff' }); },
    prize(c) { c.beginPath(); c.arc(50, 50, 40, 0, TAU); c.fillStyle = gold(c, 10, 90); c.fill(); c.lineWidth = 3; c.strokeStyle = '#6a4400'; c.stroke(); text(c, '?', 50, 54, 56, { fill: '#1a6a2a', stroke: '#fff', sw: 4 }); }
  };
  function sqInner(sp, bet$) {
    if (sp.t === 'prop') return `<i class="sb-band" style="background:${sp.col}"></i><span class="sb-sqn">${sp.name}</span><b class="sb-sqv">${fmtShort(sp.v * bet$)}</b>`;
    const lbl = { start: `START`, jail: 'JAIL', corner: 'BEACH CLUB', fs: `+${sp.v} SPINS`, adv: 'ADVANCE 3', prize: 'PRIZE' }[sp.t];
    const sub = { start: `+${fmtShort(BOARD_PASS * bet$)}`, jail: 'lose a roll', corner: fmtShort(sp.v * bet$), fs: 'FREE', adv: '', prize: '2×–50×' }[sp.t];
    return `<canvas class="sb-ic" data-ic="${sp.t}" width="96" height="96"></canvas><span class="sb-sqn">${lbl}</span>${sub ? `<b class="sb-sqv">${sub}</b>` : ''}`;
  }
  function makeBoard(play, bet$) {
    const o = document.createElement('div'); o.className = 'sb-bonus sb-bov';
    o.innerHTML = `<div class="sb-bd">${BOARD.map((sp, i) => { const [r, c] = boardRC(i); return `<div class="sb-sq${i % 5 === 0 ? ' sb-corner' : ''}" data-i="${i}" style="grid-row:${r};grid-column:${c}">${sqInner(sp, bet$)}</div>`; }).join('')}
      <div class="sb-mid"><div class="sb-hud"><b>BOARDWALK BONUS</b><div class="sb-stats"><span>ROLLS<i data-k="r">${BOARD_ROLLS}</i></span><span>WON<i data-k="w">$0</i></span><span>SPINS<i data-k="f">0</i></span></div></div>
        <div class="sb-dice" title="Roll"><span></span><span></span></div>
        <button type="button" class="sb-btn sb-spin sb-roll">ROLL</button>
        <div class="sb-blog" aria-live="polite">Roll the dice! Doubles roll again.</div></div>
      <div class="sb-token"><canvas width="140" height="140"></canvas></div><div class="sb-res"></div></div>`;
    stage.appendChild(o);
    o.querySelectorAll('canvas[data-ic]').forEach(cvI => { const g = cvI.getContext('2d'); g.scale(.96, .96); try { ICONS[cvI.dataset.ic](g); } catch (e) { /* ignore */ } });
    const tk = o.querySelector('.sb-token canvas').getContext('2d'); tk.scale(1.4, 1.4); pTopHat(tk);
    const bd = o.querySelector('.sb-bd');
    const B = { el: o, bd, cells: [...o.querySelectorAll('.sb-sq')], token: o.querySelector('.sb-token'), dice: [...o.querySelectorAll('.sb-dice span')], btn: o.querySelector('.sb-roll'), log: o.querySelector('.sb-blog'),
      res: o.querySelector('.sb-res'), pos: 0, ti: 0, play, won: 0, fs: 0, rolls: BOARD_ROLLS, busy: false, done: null, bet: bet$, ds: 54 };
    const fit = () => {
      const sz = Math.floor(Math.max(200, Math.min(o.clientWidth, o.clientHeight) - 12));
      bd.style.width = bd.style.height = sz + 'px'; bd.style.setProperty('--fz', Math.max(8, Math.min(14, sz / 44)) + 'px');
      B.ds = Math.round(Math.max(34, Math.min(70, sz * .1))); bd.style.setProperty('--ds', B.ds + 'px');
      B.dice.forEach((d, k) => { const v = d.firstChild ? +d.firstChild.dataset.v || 1 : [3, 4][k]; setDie(d, v); });
      placeToken(B.pos, false);
    };
    const roB = new ResizeObserver(fit); roB.observe(o); observers.push(roB);
    B.btn.addEventListener('click', () => { K.sfx.button(); boardRoll(); });
    o.querySelector('.sb-dice').addEventListener('click', () => boardRoll());
    board = B; fit();
    return B;
  }
  function setDie(slot, v, cls = '') { const d = K.dieEl(v, { color: '#d01020', size: board ? board.ds : 54 }); if (cls) d.classList.add(cls); slot.replaceChildren(d); }
  function placeToken(i, hop = true) {
    const B = board; if (!B) return; const cell = B.cells[i]; const ts = Math.min(cell.offsetWidth, cell.offsetHeight) * .78;
    B.token.style.width = B.token.style.height = ts + 'px';
    const x = cell.offsetLeft + cell.offsetWidth / 2 - ts / 2, y = cell.offsetTop + cell.offsetHeight / 2 - ts * .55;
    B.token.style.transform = `translate(${x}px,${y}px)`;
    if (hop) { B.token.classList.remove('hop'); void B.token.offsetWidth; B.token.classList.add('hop'); }
  }
  function boardStats() { const B = board, q = k => B.el.querySelector(`[data-k="${k}"]`); q('r').textContent = B.rolls; q('w').textContent = fmtShort(B.won); q('f').textContent = B.fs; }
  function cellFloat(i, t, col) { const B = board, cell = B.cells[i]; floatText(B.bd, cell.offsetLeft + cell.offsetWidth / 2, cell.offsetTop + cell.offsetHeight / 2, t, col); }
  function cellHit(i) { const c = board.cells[i]; c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); }
  async function tumble(slot, v, ms) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { setDie(slot, 1 + R(6), 'rolling'); await sleep(75); if (!alive || !board) return; }
    setDie(slot, v, 'land');
  }
  async function boardRoll() {
    const B = board; if (!B || B.busy || !alive || B.ti >= B.play.turns.length) return;
    B.busy = true; B.btn.disabled = true;
    const t = B.play.turns[B.ti++];
    B.log.textContent = 'Rolling…'; K.sfx.dice();
    await Promise.all([tumble(B.dice[0], t.d[0], 820), tumble(B.dice[1], t.d[1], 980)]);
    if (!alive || board !== B) return;
    B.log.textContent = `${t.d[0]} + ${t.d[1]} = ${t.d[0] + t.d[1]}${t.dbl ? ' · DOUBLES! Extra roll' : ''}`;
    if (t.dbl) { [784, 988, 1319].forEach((f, k) => K.tone(f, .14, { type: 'triangle', vol: .09, delay: k * .07 })); }
    await sleep(420);
    for (const st of t.steps) {
      if (st.adv) { B.log.textContent = 'ADVANCE 3 spaces!'; await sleep(380); }
      for (const p of st.path) {
        if (!alive || board !== B) return;
        B.pos = p; placeToken(p); B.cells[p].classList.add('trail'); later(() => B.cells[p].classList.remove('trail'), 500);
        K.tone(420 + (p % 5) * 70, .07, { type: 'triangle', vol: .07 });
        if (p === 0) { B.won += BOARD_PASS * B.bet; cellFloat(0, `+${fmtShort(BOARD_PASS * B.bet)}`, '#fff'); K.sfx.chips(4); boardStats(); }
        await sleep(250);
      }
      const sp = BOARD[st.pos]; cellHit(st.pos);
      if (st.amt) {
        B.won += st.amt * B.bet; cellFloat(st.pos, `+${fmtShort(st.amt * B.bet)}`);
        B.log.textContent = `${sp.t === 'prize' ? `PRIZE: ${st.amt}×` : sp.name} pays ${K.fmt(st.amt * B.bet)}`;
        K.sfx.chips(5); K.tone(988, .14, { type: 'triangle', vol: .1 }); K.tone(1319, .18, { type: 'triangle', vol: .08, delay: .1 });
      } else if (st.fs) { B.fs += st.fs; cellFloat(st.pos, `+${st.fs} SPINS`, '#9dffb0'); B.log.textContent = `+${st.fs} free spins (wins ×${BOARD_FS_MULT})!`; fanfare(); }
      else if (sp.t === 'jail') { cellFloat(st.pos, 'JAIL!', '#ff8a80'); B.log.textContent = st.lost ? 'JAIL! You lose a roll.' : 'JAIL!'; K.sfx.lose(); }
      else if (sp.t === 'adv') { cellFloat(st.pos, 'ADVANCE!', '#bfe0ff'); K.tone(660, .1, { type: 'square', vol: .06 }); K.tone(990, .14, { type: 'square', vol: .06, delay: .1 }); }
      else if (sp.t === 'start') B.log.textContent = `START pays ${K.fmt(BOARD_PASS * B.bet)}`;
      B.rolls = t.rollsLeft; boardStats();
      await sleep(sp.t === 'adv' ? 450 : 750);
    }
    if (!alive || board !== B) return;
    B.rolls = t.rollsLeft; boardStats(); B.busy = false;
    if (B.ti >= B.play.turns.length) { B.btn.disabled = true; B.log.textContent = 'Out of rolls!'; later(() => { if (B.done) { const f = B.done; B.done = null; f(); } }, 700); return; }
    B.btn.disabled = false; B.btn.textContent = t.dbl ? 'ROLL AGAIN' : 'ROLL';
    if (auto > 0) later(() => boardRoll(), 900);
  }
  async function runBoard(res) {
    const play = res.board, bet$ = res.bet;
    K.banner(el, 'BOARD BONUS!'); fanfare(); el.classList.add('winning');
    msg('Three dice: roll around the boardwalk!', 'gold');
    await sleep(1900); if (!alive) return 0;
    el.classList.remove('winning'); ovl.innerHTML = ''; bw = null;
    mode = 'board'; syncControls();
    const B = makeBoard(play, bet$);
    if (auto > 0) later(() => boardRoll(), 1300);
    await new Promise(r => { B.done = r; });
    if (!alive) return 0;
    const won = play.total * bet$;
    if (won > 0) api.win(won); owed.bonus = 0;
    rollWin(won); fanfare(); coinShower(30);
    const d = countCard(won, won / bet$, 'BOARD BONUS WIN', B.res);
    msg(`Board bonus paid ${K.fmt(won)}${play.fs ? ` · ${play.fs} free spins at ×${BOARD_FS_MULT}` : ''}`, 'win');
    await sleep(d + 1700); if (!alive) return won;
    B.el.classList.add('out'); await sleep(360); if (!alive) return won;
    B.el.remove(); board = null; mode = 'base'; dirty = true; syncControls();
    if (play.fs > 0) return won + await runFreeSpins(play.fs, BOARD_FS_MULT);
    return won;
  }

  // ------------------------------------------------------------------ Party Presents pick bonus
  const GIFT_COLS = [[['#5ff5e8', '#077a70'], PINK], [['#ff7ac0', '#a0005a'], TEAL], [['#ffe060', '#b07a00'], '#7a2ff0'], [['#b48aff', '#4a10a0'], '#ffd34a'], [['#7affa0', '#0a7a3a'], PINK]];
  function makeParty(play, bet$) {
    const o = document.createElement('div'); o.className = 'sb-bonus sb-pov';
    o.innerHTML = `<canvas class="sb-conf" aria-hidden="true"></canvas>
      <div class="sb-hud"><b>PARTY PRESENTS</b><div class="sb-stats"><span>OPENED<i data-k="n">0</i></span><span>PARTY WIN<i data-k="w">$0</i></span><span>POOPERS<i>${PARTY_POOPERS}</i></span></div></div>
      <div class="sb-gifts">${Array.from({ length: 15 }, (_, i) => `<button type="button" class="sb-gift" aria-label="Present ${i + 1}"><canvas width="160" height="160"></canvas><span class="sb-gv"></span></button>`).join('')}</div>
      <div class="sb-tip">Pick presents until a Party Pooper shows up!</div><div class="sb-res"></div>`;
    stage.appendChild(o);
    const gifts = [...o.querySelectorAll('.sb-gift')];
    gifts.forEach((g, i) => { const [box, rib] = GIFT_COLS[i % GIFT_COLS.length]; const c = g.querySelector('canvas').getContext('2d'); c.scale(1.6, 1.6); pGift(c, box, rib); g.addEventListener('click', () => partyPick(i)); });
    const P = { el: o, gifts, conf: o.querySelector('.sb-conf'), tip: o.querySelector('.sb-tip'), res: o.querySelector('.sb-res'), play, bet: bet$, k: 0, won: 0, over: false, lock: false, parts: [], done: null, W: 0, H: 0 };
    party = P;
    return P;
  }
  function paintOpened(g, i, v) {
    const c = g.querySelector('canvas').getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 160, 160); c.scale(1.6, 1.6);
    if (v === 0) { pPooper(c); return; }
    const [box, rib] = GIFT_COLS[i % GIFT_COLS.length];
    c.beginPath(); c.arc(50, 46, 40, 0, TAU); c.fillStyle = rad(c, 50, 46, 4, 50, 46, 40, [[0, 'rgba(255,250,200,.9)'], [1, 'rgba(255,220,90,0)']]); c.fill();
    rr(c, 18, 52, 64, 38, 4); c.fillStyle = lin(c, 18, 0, 82, 0, [[0, box[1]], [.45, box[0]], [1, box[1]]]); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
    c.fillStyle = rib; c.fillRect(44, 52, 12, 38);
    c.save(); c.translate(70, 34); c.rotate(.5); rr(c, -30, -7, 60, 13, 3); c.fillStyle = lin(c, 0, -7, 0, 6, [[0, box[0]], [1, box[1]]]); c.fill(); c.stroke(); c.restore();
    for (let k = 0; k < 6; k++) { c.save(); c.translate(30 + k * 8, 30 - (k % 3) * 6); c.rotate(k); c.fillStyle = [PINK, TEAL, '#ffd34a', '#fff'][k % 4]; c.fillRect(-3, -1.2, 6, 2.4); c.restore(); }
  }
  function confettiBurst(x, y, n = 60, power = 1) {
    const P = party; if (!P) return; const cols = [PINK, TEAL, '#ffd34a', '#ffffff', '#7a2ff0', '#7affa0'];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, sp = (240 + Math.random() * 420) * power; P.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * TAU, vr: (Math.random() - .5) * 14, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, col: cols[i % cols.length], life: 2.6 + Math.random() * 1.2 }); }
  }
  function drawConfetti(now, dt) {
    const P = party, cvC = P.conf, w = cvC.clientWidth, h = cvC.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== P.W || h !== P.H) { P.W = w; P.H = h; cvC.width = Math.round(w * dpr); cvC.height = Math.round(h * dpr); }
    const c = cvC.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    if (P.parts.length > 900) P.parts.splice(0, P.parts.length - 900);
    P.parts = P.parts.filter(p => (p.life -= dt) > 0 && p.y < h + 30);
    for (const p of P.parts) {
      p.vy += 900 * dt; p.vx *= Math.pow(.25, dt); p.vy *= Math.pow(.5, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.scale(1, Math.abs(Math.cos(p.r * 1.7)) + .15); c.globalAlpha = Math.min(1, p.life); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
    }
  }
  function giftCenter(g) { const a = g.getBoundingClientRect(), b = party.el.getBoundingClientRect(); return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2]; }
  function partyStats() { const P = party, q = k => P.el.querySelector(`[data-k="${k}"]`); q('n').textContent = P.k; q('w').textContent = fmtShort(P.won); }
  function partyPick(i) {
    const P = party; if (!P || P.over || P.lock || !alive) return;
    const g = P.gifts[i]; if (g.classList.contains('open')) return;
    P.lock = true; g.disabled = true; g.classList.add('shake'); K.tone(600, .08, { type: 'triangle', vol: .06 }); K.tone(760, .08, { type: 'triangle', vol: .06, delay: .1 });
    const v = P.play.seq[P.k++];
    later(() => {
      if (party !== P) return;
      g.classList.remove('shake'); g.classList.add('open'); paintOpened(g, i, v);
      const [x, y] = giftCenter(g);
      if (v === 0) {
        g.classList.add('pooper'); g.querySelector('.sb-gv').textContent = 'PARTY POOPER'; pooperSound(); P.over = true;
        P.tip.textContent = `Party Pooper! The party paid ${K.fmt(P.won)}`; partyStats();
        later(() => { if (party !== P) return; let k = P.k; P.gifts.forEach((gg, j) => { if (gg.classList.contains('open')) return; const vv = P.play.seq[k++]; gg.disabled = true; gg.classList.add('open', 'ghost'); if (vv === 0) gg.classList.add('pooper'); paintOpened(gg, j, vv); gg.querySelector('.sb-gv').textContent = vv ? fmtShort(vv * P.bet) : 'POOPER'; }); }, 900);
        later(() => { if (P.done) { const f = P.done; P.done = null; f(); } }, 2600);
        return;
      }
      P.won += v * P.bet; g.querySelector('.sb-gv').textContent = fmtShort(v * P.bet); partyStats();
      confettiBurst(x, y, 50 + Math.min(80, v * 6), v >= 10 ? 1.3 : 1); partyHorn(); K.sfx.chips(4);
      if (v >= 10) { K.banner(P.el, `${v}× BET!`); }
      P.tip.textContent = `${fmtShort(v * P.bet)}! Pick another present`;
      later(() => { if (party === P) P.lock = false; if (auto > 0) later(partyPickRandom, 700); }, 380);
    }, 380);
  }
  function partyPickRandom() { const P = party; if (!P || P.over || P.lock) return; const free = P.gifts.map((g, i) => g.classList.contains('open') ? -1 : i).filter(i => i >= 0); if (free.length) partyPick(free[Math.floor(Math.random() * free.length)]); }
  async function runParty(res) {
    const play = res.party, bet$ = res.bet;
    K.banner(el, "IT'S A PARTY!"); partyHorn(); partyHorn(.6); el.classList.add('winning');
    msg('Three presents: party time!', 'gold');
    await sleep(1900); if (!alive) return 0;
    el.classList.remove('winning'); ovl.innerHTML = ''; bw = null;
    mode = 'party'; syncControls();
    const P = makeParty(play, bet$);
    later(() => { if (party === P) { confettiBurst(P.el.clientWidth * .2, P.el.clientHeight * .9, 90, 1.4); confettiBurst(P.el.clientWidth * .8, P.el.clientHeight * .9, 90, 1.4); } }, 120);
    if (auto > 0) later(partyPickRandom, 1500);
    await new Promise(r => { P.done = r; });
    if (!alive) return 0;
    const won = play.total * bet$;
    api.win(won); owed.bonus = 0;
    rollWin(won); fanfare(); confettiBurst(P.el.clientWidth / 2, P.el.clientHeight * .7, 160, 1.6);
    const d = countCard(won, won / bet$, 'PARTY WIN!', P.res);
    msg(`Party bonus paid ${K.fmt(won)}`, 'win');
    await sleep(d + 1700); if (!alive) return won;
    P.el.classList.add('out'); await sleep(360); if (!alive) return won;
    P.el.remove(); party = null; mode = 'base'; dirty = true; syncControls();
    return won;
  }

  // ------------------------------------------------------------------ boot
  syncControls(); setWinMeter(0); layout(); raf = requestAnimationFrame(frame);
  msg(cfg.betMode === 'lines' ? `${units} lines · ${K.fmt(coin)} per line — press SPIN or Space` : `Bet ${units} coin${units > 1 ? 's' : ''} · press SPIN or Space`);
  return {
    unmount() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); observers.forEach(o => o.disconnect());
      window.removeEventListener('keydown', onKey); reelsDone = null;
      // Pay anything already decided: a line win still spinning, an unfinished bonus, and remaining free spins (played out instantly).
      let due = owed.line + owed.bonus;
      if (owed.fsN > 0) due += pureFree(cfg, R, owed.fsN, owed.fsUnits, owed.fsMult) * owed.fsCoin;
      owed.line = owed.bonus = owed.fsN = 0;
      if (unsubBal) unsubBal();
      if (due > 0) { api.win(due); if (api.toast) api.toast(`${cfg.title}: feature completed automatically, paid ${K.fmt(due)}`); }
      wheel = board = party = null; root.innerHTML = '';
    }
  };
}

// =====================================================================================================
// Exports
// =====================================================================================================
export const machines = CFGS.map(cfg => ({
  id: cfg.id, title: cfg.title, kind: 'slot', order: cfg.order, blurb: cfg.blurb, theme: { ...cfg.theme, reels: cfg.reels },
  mount(root, api) { return mountMachine(cfg, root, api); }
}));
export const [spinAFortune, boardwalkRiches, partyPresents] = machines;
export default machines[0];

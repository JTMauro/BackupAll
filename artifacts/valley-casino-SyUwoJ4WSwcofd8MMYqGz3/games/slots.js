// Valley Casino — slot machine engine + six themed machines.
// Everything (reels, symbols, cabinet) is drawn procedurally: canvas for reels/symbols, CSS for the cabinet.
// Math (strips, paytables, evaluation, features) is pure and exported as `_math` so it can be simulated in node.
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

// ---------------------------------------------------------------- classic symbols
function pCherry(c) {
  c.lineCap = 'round'; c.strokeStyle = '#3f6b1a'; c.lineWidth = 4.2;
  c.beginPath(); c.moveTo(57, 13); c.quadraticCurveTo(40, 30, 32, 54); c.stroke();
  c.beginPath(); c.moveTo(57, 13); c.quadraticCurveTo(66, 32, 68, 50); c.stroke();
  c.save(); c.translate(58, 15); c.rotate(-.45);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(13, -12, 29, 0); c.quadraticCurveTo(13, 12, 0, 0);
  c.fillStyle = lin(c, 0, -8, 0, 8, [[0, '#9be55a'], [1, '#2f7a12']]); c.fill(); c.strokeStyle = '#1f4a0c'; c.lineWidth = 1.4; c.stroke();
  c.beginPath(); c.moveTo(3, 0); c.lineTo(25, 0); c.strokeStyle = 'rgba(20,60,10,.7)'; c.lineWidth = 1; c.stroke();
  c.restore();
  const ball = (x, y, r) => {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.fillStyle = rad(c, x - r * .35, y - r * .4, r * .1, x, y, r, [[0, '#ff9a9a'], [.35, '#e3102c'], [1, '#5a0010']]); c.fill();
    c.lineWidth = 1.6; c.strokeStyle = '#3a0008'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(x - r * .38, y - r * .42, r * .3, r * .15, -.7, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(60,0,10,.6)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y - r + 2, 3, .2, Math.PI - .2); c.stroke();
  };
  ball(32, 68, 18); ball(68, 64, 18);
}
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
function pFlames(c) {
  const fl = [[14, 50], [28, 76], [44, 92], [60, 84], [76, 72], [90, 50], [52, 64]];
  for (const [x, h] of fl) {
    c.beginPath(); c.moveTo(x - 12, 97); c.bezierCurveTo(x - 14, 97 - h * .5, x + 6, 97 - h * .62, x + 1, 97 - h); c.bezierCurveTo(x + 13, 97 - h * .55, x + 13, 97 - h * .3, x + 12, 97); c.closePath();
    c.fillStyle = lin(c, 0, 97, 0, 97 - h, [[0, 'rgba(255,50,0,.95)'], [.5, 'rgba(255,140,0,.9)'], [1, 'rgba(255,240,100,.8)']]); c.fill();
  }
}
function pSeven(c, o = {}) {
  if (o.flame) pFlames(c);
  c.lineJoin = 'round';
  sevenPath(c); c.lineWidth = 11; c.strokeStyle = o.dark || '#160000'; c.stroke();
  c.lineWidth = 6; c.strokeStyle = o.edge || '#fff'; c.stroke();
  c.fillStyle = lin(c, 0, 12, 0, 90, [[0, o.top || '#ff4b3a'], [1, o.bot || '#8a0008']]); c.fill();
  c.save(); sevenPath(c); c.clip(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(46, 14, 46, 10, -.08, 0, TAU); c.fill(); c.restore();
  if (o.flame) sparkle(c, 80, 16, 7, '#fff7c0');
}
function gemPath(c) { c.beginPath(); c.moveTo(30, 16); c.lineTo(70, 16); c.lineTo(90, 38); c.lineTo(50, 92); c.lineTo(10, 38); c.closePath(); }
function pGem(c, light, dark, edge = '#0b1d3a') {
  gemPath(c); c.fillStyle = lin(c, 10, 16, 90, 92, [[0, '#f2fdff'], [.35, light], [1, dark]]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = edge; c.lineJoin = 'round'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2; c.beginPath();
  c.moveTo(10, 38); c.lineTo(90, 38); c.moveTo(30, 16); c.lineTo(38, 38); c.lineTo(50, 92); c.lineTo(62, 38); c.lineTo(70, 16); c.moveTo(38, 38); c.lineTo(50, 16); c.lineTo(62, 38); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(30, 16); c.lineTo(50, 16); c.lineTo(38, 38); c.lineTo(10, 38); c.closePath(); c.fill();
  sparkle(c, 74, 24, 8);
}
function pDD(c) {
  pGem(c, '#62cdff', '#0a46a8');
  rr(c, 3, 44, 94, 22, 5); c.fillStyle = lin(c, 0, 44, 0, 66, [[0, '#ff5a5a'], [.5, '#c40018'], [1, '#6a0010']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#ffd34a'; c.stroke();
  text(c, 'WILD', 50, 56, 17, { fill: '#fff', stroke: '#3a0008', sw: 3 });
}

// ---------------------------------------------------------------- Liberty Bell (vintage)
function hatch(c, pathFn, col = 'rgba(0,0,0,.18)') { c.save(); pathFn(); c.clip(); c.strokeStyle = col; c.lineWidth = .8; c.beginPath(); for (let x = -100; x < 200; x += 4) { c.moveTo(x, 0); c.lineTo(x + 100, 100); } c.stroke(); c.restore(); }
function engrave(c, pathFn, fillA, fillB, ink = '#2a1606') {
  pathFn(); c.fillStyle = lin(c, 0, 10, 0, 90, [[0, fillA], [1, fillB]]); c.fill();
  hatch(c, pathFn);
  pathFn(); c.lineWidth = 2.6; c.strokeStyle = ink; c.lineJoin = 'round'; c.stroke();
  c.save(); c.translate(50, 50); c.scale(.8, .8); c.translate(-50, -50); pathFn(); c.restore(); c.lineWidth = 1; c.strokeStyle = 'rgba(255,236,200,.55)'; c.stroke();
}
const heartPath = c => () => { c.beginPath(); c.moveTo(50, 88); c.bezierCurveTo(20, 66, 7, 48, 11, 32); c.bezierCurveTo(15, 15, 39, 11, 50, 30); c.bezierCurveTo(61, 11, 85, 15, 89, 32); c.bezierCurveTo(93, 48, 80, 66, 50, 88); c.closePath(); };
const diamondPath = c => () => { c.beginPath(); c.moveTo(50, 8); c.quadraticCurveTo(64, 32, 86, 50); c.quadraticCurveTo(64, 68, 50, 92); c.quadraticCurveTo(36, 68, 14, 50); c.quadraticCurveTo(36, 32, 50, 8); c.closePath(); };
const spadePath = c => () => { c.beginPath(); c.moveTo(50, 8); c.bezierCurveTo(62, 28, 91, 40, 89, 60); c.bezierCurveTo(87, 76, 64, 79, 54, 66); c.quadraticCurveTo(56, 82, 68, 92); c.lineTo(32, 92); c.quadraticCurveTo(44, 82, 46, 66); c.bezierCurveTo(36, 79, 13, 76, 11, 60); c.bezierCurveTo(9, 40, 38, 28, 50, 8); c.closePath(); };
function pHeartV(c) { engrave(c, heartPath(c), '#b52a22', '#5e0d0d'); }
function pDiamondV(c) { engrave(c, diamondPath(c), '#c03a26', '#621008'); }
function pSpadeV(c) { engrave(c, spadePath(c), '#3d3530', '#0d0a08', '#000'); }
function pHorseshoe(c) {
  const path = () => { c.beginPath(); c.moveTo(25, 14); c.lineTo(22, 52); c.arc(50, 54, 28, Math.PI, 0, true); c.lineTo(75, 14); };
  c.lineCap = 'butt'; c.lineJoin = 'round';
  path(); c.lineWidth = 19; c.strokeStyle = '#1b130b'; c.stroke();
  path(); c.lineWidth = 14; c.strokeStyle = lin(c, 20, 0, 80, 100, [[0, '#d8d2c4'], [.4, '#7b7365'], [.7, '#bdb5a5'], [1, '#4a4338']]); c.stroke();
  path(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.4)'; c.stroke();
  c.fillStyle = '#1b130b';
  for (const a of [.12, .3, .5, .7, .88]) { const ang = Math.PI - a * Math.PI; c.beginPath(); c.arc(50 + Math.cos(ang) * 28, 54 + Math.sin(ang) * 28, 2.2, 0, TAU); c.fill(); }
  for (const y of [22, 36]) { c.beginPath(); c.arc(23.6, y, 2.1, 0, TAU); c.arc(76.4, y, 2.1, 0, TAU); c.fill(); }
  rr(c, 14, 8, 20, 8, 2); c.fill(); rr(c, 66, 8, 20, 8, 2); c.fill();
}
function pBell(c) {
  rr(c, 22, 8, 56, 10, 3); c.fillStyle = lin(c, 0, 8, 0, 18, [[0, '#8a5a2b'], [1, '#3a210c']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#1e1005'; c.stroke();
  c.fillStyle = '#2a1606'; c.fillRect(46, 17, 8, 5);
  const body = () => { c.beginPath(); c.moveTo(38, 21); c.bezierCurveTo(29, 22, 28, 36, 27, 50); c.bezierCurveTo(26, 66, 20, 74, 11, 80); c.lineTo(89, 80); c.bezierCurveTo(80, 74, 74, 66, 73, 50); c.bezierCurveTo(72, 36, 71, 22, 62, 21); c.closePath(); };
  body(); c.fillStyle = lin(c, 11, 0, 89, 0, [[0, '#3f230b'], [.28, '#b98236'], [.48, '#f2d08e'], [.68, '#9c6526'], [1, '#2f1a07']]); c.fill();
  c.lineWidth = 2.4; c.strokeStyle = '#1e1005'; c.stroke();
  c.save(); body(); c.clip();
  c.strokeStyle = 'rgba(40,20,5,.65)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(20, 33); c.quadraticCurveTo(50, 37, 80, 33); c.moveTo(18, 68); c.quadraticCurveTo(50, 73, 82, 68); c.stroke();
  text(c, 'LIBERTY', 50, 42, 7.5, { font: FS, fill: 'rgba(50,25,5,.85)', weight: 'bold' });
  c.strokeStyle = '#1a0c02'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(53, 48); c.lineTo(50, 54); c.lineTo(54, 58); c.lineTo(49, 66); c.lineTo(52, 72); c.lineTo(48, 79); c.stroke();
  c.restore();
  c.beginPath(); c.ellipse(50, 80, 39, 5.5, 0, 0, TAU); c.fillStyle = lin(c, 11, 0, 89, 0, [[0, '#2a1606'], [.5, '#a26c2c'], [1, '#2a1606']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#1e1005'; c.stroke();
  c.beginPath(); c.arc(50, 88, 6, 0, TAU); c.fillStyle = rad(c, 48, 86, 1, 50, 88, 6, [[0, '#d9a85a'], [1, '#4a2a0c']]); c.fill(); c.stroke();
}

// ---------------------------------------------------------------- Pharaoh's Gold
function pPharaoh(c) {
  const nemes = () => { c.beginPath(); c.moveTo(50, 7); c.bezierCurveTo(71, 7, 79, 18, 79, 34); c.lineTo(91, 82); c.lineTo(65, 82); c.lineTo(62, 46); c.lineTo(38, 46); c.lineTo(35, 82); c.lineTo(9, 82); c.lineTo(21, 34); c.bezierCurveTo(21, 18, 29, 7, 50, 7); c.closePath(); };
  nemes(); c.fillStyle = gold(c, 7, 82); c.fill();
  c.save(); nemes(); c.clip(); c.fillStyle = lin(c, 0, 0, 0, 100, [[0, '#2f6be0'], [1, '#0d2a7a']]);
  for (let y = 12; y < 84; y += 7.5) c.fillRect(0, y, 100, 3.6); c.restore();
  nemes(); c.lineWidth = 2.2; c.strokeStyle = '#2a1600'; c.lineJoin = 'round'; c.stroke();
  const face = () => { c.beginPath(); c.moveTo(35, 29); c.lineTo(65, 29); c.bezierCurveTo(67, 52, 62, 70, 50, 75); c.bezierCurveTo(38, 70, 33, 52, 35, 29); c.closePath(); };
  face(); c.fillStyle = lin(c, 35, 0, 65, 0, [[0, '#b77a22'], [.5, '#f6cf7a'], [1, '#a86a18']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#3a2000'; c.stroke();
  rr(c, 33, 26, 34, 6, 2); c.fillStyle = gold(c, 26, 32); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(50, 14); c.quadraticCurveTo(55, 20, 50, 27); c.quadraticCurveTo(45, 20, 50, 14); c.fillStyle = '#d4232a'; c.fill(); c.stroke();
  for (const [x, d] of [[43, -1], [57, 1]]) {
    c.beginPath(); c.ellipse(x, 42, 5, 2.4, 0, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(x, 42, 1.8, 0, TAU); c.fillStyle = '#111'; c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x - 5 * d, 42); c.quadraticCurveTo(x, 38, x + 5 * d, 42); c.lineTo(x + 9 * d, 41); c.stroke();
    c.beginPath(); c.moveTo(x - 5, 37); c.quadraticCurveTo(x, 34, x + 6, 36.5); c.lineWidth = 1.4; c.stroke();
  }
  c.strokeStyle = '#6a3a00'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(50, 45); c.lineTo(48, 55); c.lineTo(51, 56); c.moveTo(45, 62); c.quadraticCurveTo(50, 64, 55, 62); c.stroke();
  rr(c, 45.5, 72, 9, 16, 2.5); c.fillStyle = lin(c, 0, 72, 0, 88, [[0, '#2f6be0'], [.5, '#f7c948'], [1, '#2f6be0']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#2a1600'; c.stroke();
}
function pAnkh(c) {
  c.lineJoin = 'round';
  c.beginPath(); c.ellipse(50, 28, 13, 17, 0, 0, TAU); c.lineWidth = 13; c.strokeStyle = '#2a1600'; c.stroke(); c.lineWidth = 8; c.strokeStyle = gold(c, 10, 46); c.stroke();
  const bar = () => { c.beginPath(); c.moveTo(16, 43); c.lineTo(84, 43); c.lineTo(84, 54); c.lineTo(16, 54); c.closePath(); };
  const shaft = () => { c.beginPath(); c.moveTo(44, 50); c.lineTo(56, 50); c.lineTo(62, 93); c.lineTo(38, 93); c.closePath(); };
  for (const p of [shaft, bar]) { p(); c.fillStyle = gold(c, 40, 95); c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#2a1600'; c.stroke(); }
  c.beginPath(); c.arc(50, 48.5, 4.5, 0, TAU); c.fillStyle = rad(c, 49, 47, 1, 50, 48.5, 4.5, [[0, '#ff8a8a'], [1, '#8a0010']]); c.fill(); c.lineWidth = 1.2; c.stroke();
  sparkle(c, 66, 16, 6);
}
function pEye(c) {
  c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.fillStyle = rad(c, 40, 36, 4, 50, 50, 46, [[0, '#4f86f0'], [1, '#0c1f5c']]); c.fill(); c.lineWidth = 4; c.strokeStyle = gold(c); c.stroke();
  c.strokeStyle = '#f7c948'; c.fillStyle = '#f7c948'; c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = 5; c.beginPath(); c.moveTo(20, 33); c.quadraticCurveTo(50, 20, 82, 31); c.stroke();
  c.beginPath(); c.moveTo(18, 49); c.quadraticCurveTo(50, 30, 80, 48); c.quadraticCurveTo(50, 63, 18, 49); c.closePath(); c.fillStyle = '#fbf3df'; c.fill(); c.lineWidth = 3.5; c.stroke();
  c.beginPath(); c.arc(50, 47, 8.5, 0, TAU); c.fillStyle = '#111'; c.fill(); c.lineWidth = 2; c.stroke();
  c.lineWidth = 3.5; c.beginPath(); c.moveTo(80, 48); c.lineTo(91, 47); c.stroke();
  c.beginPath(); c.moveTo(42, 58); c.lineTo(38, 84); c.stroke();
  c.beginPath(); c.moveTo(56, 58); c.quadraticCurveTo(62, 74, 72, 76); c.quadraticCurveTo(80, 76, 78, 69); c.quadraticCurveTo(75, 64, 70, 68); c.stroke();
  sparkle(c, 46, 44, 3);
}
function pScarab(c) {
  c.beginPath(); c.arc(50, 15, 10, 0, TAU); c.fillStyle = rad(c, 47, 12, 1, 50, 15, 10, [[0, '#ffd27a'], [1, '#d4400a']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#4a1a00'; c.stroke();
  c.strokeStyle = '#2a1600'; c.lineWidth = 3; c.lineCap = 'round';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 14, 50); c.lineTo(50 + s * 30, 44); c.lineTo(50 + s * 36, 36); c.moveTo(50 + s * 18, 64); c.lineTo(50 + s * 34, 64); c.lineTo(50 + s * 40, 70); c.moveTo(50 + s * 14, 80); c.lineTo(50 + s * 28, 86); c.lineTo(50 + s * 30, 94); c.stroke();
    c.beginPath(); c.moveTo(50 + s * 6, 30); c.lineTo(50 + s * 10, 22); c.stroke(); }
  c.beginPath(); c.ellipse(50, 33, 9, 6, 0, 0, TAU); c.fillStyle = '#1a3a3a'; c.fill(); c.lineWidth = 1.6; c.stroke();
  c.beginPath(); c.ellipse(50, 44, 17, 9, 0, 0, TAU); c.fillStyle = lin(c, 33, 0, 67, 0, [[0, '#0a4f6e'], [.5, '#38e0c0'], [1, '#0a4f6e']]); c.fill(); c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50, 52); c.bezierCurveTo(50 + s * 26, 52, 50 + s * 26, 84, 50, 90); c.closePath(); c.fillStyle = lin(c, 50 + s * 24, 0, 50, 0, [[0, '#06384f'], [.6, '#22b8a4'], [1, '#7ff5df']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#f7c948'; c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(40, 58); c.quadraticCurveTo(36, 68, 40, 78); c.stroke();
}
function pPyramid(c) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = rad(c, 50, 40, 5, 50, 50, 48, [[0, '#ffd58a'], [.6, '#e0742a'], [1, '#5a1a2a']]); c.fill();
  c.save(); c.translate(50, 30); c.strokeStyle = 'rgba(255,240,180,.7)'; c.lineWidth = 2; for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(14, 0); c.lineTo(22, 0); c.stroke(); } c.restore();
  c.beginPath(); c.arc(50, 30, 11, 0, TAU); c.fillStyle = '#fff2b0'; c.fill();
  c.beginPath(); c.moveTo(50, 22); c.lineTo(88, 76); c.lineTo(50, 76); c.closePath(); c.fillStyle = lin(c, 50, 0, 88, 0, [[0, '#b07a12'], [1, '#6a4206']]); c.fill();
  c.beginPath(); c.moveTo(50, 22); c.lineTo(50, 76); c.lineTo(12, 76); c.closePath(); c.fillStyle = lin(c, 12, 0, 50, 0, [[0, '#ffe08a'], [1, '#e4ac3a']]); c.fill();
  c.strokeStyle = 'rgba(90,50,0,.45)'; c.lineWidth = .9; c.beginPath(); for (let y = 31; y < 76; y += 7) { const hw = (y - 22) / 54 * 38; c.moveTo(50 - hw, y); c.lineTo(50 + hw, y); } c.stroke();
  c.beginPath(); c.moveTo(50, 22); c.lineTo(88, 76); c.lineTo(12, 76); c.closePath(); c.lineWidth = 2; c.strokeStyle = '#3a2200'; c.stroke();
  rr(c, 10, 74, 80, 17, 5); c.fillStyle = lin(c, 0, 74, 0, 91, [[0, '#1d4fb8'], [1, '#0a1f5c']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#f7c948'; c.stroke();
  text(c, 'SCATTER', 50, 83.5, 11, { fill: '#ffe08a', stroke: '#000', sw: 2 });
}
function pWildCartouche(c, label = 'WILD', inner = ['#8a1420', '#3a0610']) {
  rr(c, 12, 6, 76, 88, 30); c.fillStyle = gold(c, 6, 94); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#3a2200'; c.stroke();
  rr(c, 19, 13, 62, 74, 24); c.fillStyle = lin(c, 0, 13, 0, 87, [[0, inner[0]], [1, inner[1]]]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#ffe08a'; c.stroke();
  text(c, label, 50, 52, 21, { fill: gold(c, 40, 64), stroke: '#1a0800', sw: 4 });
  c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(50, 20); c.lineTo(55, 30); c.lineTo(50, 36); c.lineTo(45, 30); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(50, 68); c.lineTo(55, 74); c.lineTo(50, 82); c.lineTo(45, 74); c.closePath(); c.fill();
  sparkle(c, 72, 18, 7);
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

// ---------------------------------------------------------------- Dragon Pearls
function pDragon(c) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = rad(c, 42, 38, 4, 50, 50, 48, [[0, '#ff5a3a'], [.7, '#a0060e'], [1, '#4a0006']]); c.fill(); c.lineWidth = 4; c.strokeStyle = gold(c); c.stroke();
  c.save(); c.beginPath(); c.arc(50, 50, 43, 0, TAU); c.clip();
  const head = () => { c.beginPath(); c.moveTo(22, 70); c.bezierCurveTo(22, 50, 32, 36, 46, 31); c.lineTo(34, 13); c.lineTo(53, 26); c.lineTo(57, 9); c.lineTo(63, 27); c.bezierCurveTo(71, 27, 77, 31, 81, 37); c.lineTo(90, 39); c.lineTo(88, 47); c.lineTo(72, 50); c.lineTo(88, 58); c.lineTo(80, 65); c.bezierCurveTo(67, 64, 59, 62, 54, 67); c.bezierCurveTo(48, 73, 44, 82, 42, 94); c.lineTo(30, 92); c.lineTo(31, 82); c.lineTo(18, 86); c.lineTo(24, 76); c.lineTo(12, 76); c.closePath(); };
  head(); c.fillStyle = lin(c, 20, 10, 80, 90, [[0, '#fff1a8'], [.4, '#f5c33b'], [1, '#a86a00']]); c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#5a1800'; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = '#5a1800'; c.beginPath(); c.moveTo(72, 50); c.lineTo(88, 47); c.lineTo(88, 58); c.closePath(); c.fill();
  c.fillStyle = '#fff'; for (const x of [76, 81, 85]) { c.beginPath(); c.moveTo(x, 48.5); c.lineTo(x + 2, 52); c.lineTo(x + 4, 48); c.fill(); }
  c.beginPath(); c.ellipse(65, 37, 4.5, 3.2, -.2, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(66, 37, 2, 0, TAU); c.fillStyle = '#c4000c'; c.fill();
  c.strokeStyle = '#5a1800'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(58, 33); c.quadraticCurveTo(66, 29, 74, 34); c.stroke();
  c.strokeStyle = '#ffe9a0'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(86, 43); c.bezierCurveTo(96, 46, 92, 58, 99, 62); c.moveTo(80, 61); c.bezierCurveTo(84, 72, 76, 78, 82, 86); c.stroke();
  c.strokeStyle = 'rgba(90,24,0,.55)'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(34 + i * 3, 50 + i * 8); c.quadraticCurveTo(42 + i * 3, 48 + i * 8, 46 + i * 2, 54 + i * 8); } c.stroke();
  c.restore();
}
function pKoi(c) {
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.fillStyle = rad(c, 50, 50, 10, 50, 50, 46, [[0, 'rgba(60,160,190,.0)'], [.8, 'rgba(40,140,180,.35)'], [1, 'rgba(20,80,120,.6)']]); c.fill();
  c.strokeStyle = 'rgba(180,240,255,.35)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(50, 50, 40, 40, 0, .3, 2.2); c.stroke();
  c.save(); c.translate(50, 52); c.rotate(-.42);
  const body = () => { c.beginPath(); c.moveTo(-38, 0); c.bezierCurveTo(-26, -19, 14, -19, 24, -5); c.lineTo(42, -19); c.quadraticCurveTo(36, 0, 42, 19); c.lineTo(24, 5); c.bezierCurveTo(14, 19, -26, 19, -38, 0); c.closePath(); };
  c.beginPath(); c.moveTo(-10, -12); c.quadraticCurveTo(0, -30, 14, -10); c.closePath(); c.fillStyle = 'rgba(255,140,60,.85)'; c.fill();
  c.beginPath(); c.moveTo(-14, 10); c.quadraticCurveTo(-8, 26, 2, 12); c.closePath(); c.fill();
  body(); c.fillStyle = lin(c, 0, -18, 0, 18, [[0, '#fff8ee'], [1, '#f2d9c2']]); c.fill();
  c.save(); body(); c.clip(); c.fillStyle = lin(c, -30, 0, 30, 0, [[0, '#ff5a1a'], [1, '#e8380a']]);
  c.beginPath(); c.ellipse(-20, -6, 12, 9, .3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(4, 6, 12, 8, -.2, 0, TAU); c.fill(); c.beginPath(); c.ellipse(30, -2, 10, 14, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(120,40,0,.3)'; c.lineWidth = .8; for (let x = -22; x < 20; x += 6) for (let y = -10; y <= 10; y += 6) { c.beginPath(); c.arc(x, y, 3.2, -.9, .9); c.stroke(); }
  c.restore();
  body(); c.lineWidth = 2; c.strokeStyle = '#6a2200'; c.stroke();
  c.beginPath(); c.arc(-28, -4, 2.6, 0, TAU); c.fillStyle = '#111'; c.fill();
  c.strokeStyle = '#6a2200'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-36, 3); c.quadraticCurveTo(-42, 8, -40, 14); c.stroke();
  c.restore();
}
function pLantern(c) {
  c.strokeStyle = '#3a2200'; c.lineWidth = 2; c.beginPath(); c.moveTo(50, 2); c.lineTo(50, 14); c.stroke();
  c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.fillStyle = rad(c, 50, 50, 8, 50, 50, 46, [[0, 'rgba(255,190,80,.45)'], [1, 'rgba(255,120,0,0)']]); c.fill();
  c.beginPath(); c.ellipse(50, 50, 34, 32, 0, 0, TAU); c.fillStyle = rad(c, 44, 42, 4, 50, 50, 36, [[0, '#ffd27a'], [.35, '#f2301c'], [1, '#7a0006']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#4a0004'; c.stroke();
  c.strokeStyle = 'rgba(80,0,4,.55)'; c.lineWidth = 1.4; for (const k of [12, 24]) { c.beginPath(); c.ellipse(50, 50, k, 32, 0, 0, TAU); c.stroke(); }
  c.beginPath(); c.moveTo(50, 18); c.lineTo(50, 82); c.stroke();
  for (const y of [12, 80]) { rr(c, 32, y, 36, 9, 3); c.fillStyle = gold(c, y, y + 9); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#3a2200'; c.stroke(); }
  c.strokeStyle = '#f7c948'; c.lineWidth = 1.6; c.beginPath(); for (const x of [44, 48, 52, 56]) { c.moveTo(x, 89); c.lineTo(x + (x - 50) * .2, 99); } c.stroke();
  c.beginPath(); c.arc(50, 50, 9, 0, TAU); c.lineWidth = 2; c.strokeStyle = '#ffd34a'; c.stroke();
  c.beginPath(); c.moveTo(44, 50); c.lineTo(56, 50); c.moveTo(50, 44); c.lineTo(50, 56); c.stroke();
}
function pIngot(c) {
  c.beginPath(); c.ellipse(50, 48, 21, 18, 0, Math.PI, 0); c.closePath(); c.fillStyle = rad(c, 44, 36, 2, 50, 46, 24, [[0, '#fff7c8'], [.5, '#f7c948'], [1, '#a0680a']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a3500'; c.stroke();
  c.beginPath(); c.moveTo(8, 44); c.quadraticCurveTo(16, 84, 50, 86); c.quadraticCurveTo(84, 84, 92, 44); c.quadraticCurveTo(72, 58, 50, 58); c.quadraticCurveTo(28, 58, 8, 44); c.closePath();
  c.fillStyle = lin(c, 0, 44, 0, 86, [[0, '#fff2a8'], [.35, '#f2b92e'], [1, '#8a5200']]); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(30, 66, 10, 3.5, .5, 0, TAU); c.fill();
  sparkle(c, 70, 30, 8); sparkle(c, 22, 40, 5);
}
function pPearl(c) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = rad(c, 50, 50, 20, 50, 50, 47, [[0, 'rgba(255,230,160,.55)'], [1, 'rgba(255,200,80,0)']]); c.fill();
  c.beginPath(); c.arc(50, 50, 34, 0, TAU); c.fillStyle = rad(c, 40, 36, 3, 50, 50, 36, [[0, '#ffffff'], [.4, '#f4eaf5'], [.75, '#d6c4e6'], [1, '#8f7aa8']]); c.fill();
  c.lineWidth = 2.5; c.strokeStyle = gold(c, 16, 84); c.stroke();
  c.save(); c.beginPath(); c.arc(50, 50, 34, 0, TAU); c.clip(); c.globalAlpha = .25; c.fillStyle = lin(c, 16, 84, 84, 16, [[0, '#ff9ad5'], [.5, '#9ee7ff'], [1, '#ffe48a']]); c.fillRect(0, 0, 100, 100); c.restore();
  c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(38, 34, 9, 5, -.6, 0, TAU); c.fill();
}
function pJade(c) {
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.fillStyle = rad(c, 40, 36, 4, 50, 50, 46, [[0, '#a8f5c4'], [.55, '#1e9a5a'], [1, '#063a20']]); c.fill(); c.lineWidth = 5; c.strokeStyle = gold(c); c.stroke();
  c.beginPath(); c.arc(50, 50, 36, 0, TAU); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,240,180,.7)'; c.stroke();
  text(c, 'WILD', 50, 53, 23, { fill: gold(c, 40, 66), stroke: '#062a14', sw: 5 });
  sparkle(c, 74, 24, 7);
}

// ---------------------------------------------------------------- Mega Valley
function pMega(c) {
  c.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU - Math.PI / 2, r = i % 2 ? 37 : 48; c.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r); } c.closePath();
  c.fillStyle = rad(c, 50, 40, 4, 50, 50, 48, [[0, '#ffb0f4'], [.5, '#c21fb0'], [1, '#3a0a6b']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffd54a'; c.lineJoin = 'round'; c.stroke();
  text(c, 'MEGA', 50, 46, 24, { fill: gold(c, 34, 58), stroke: '#22003a', sw: 5 });
  text(c, 'VALLEY', 50, 65, 11, { fill: '#fff', stroke: '#22003a', sw: 3 });
  sparkle(c, 76, 22, 6);
}

// ---------------------------------------------------------------- Fishbowl Fortune (aquarium)
function bubble(c, x, y, r) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  c.fillStyle = rad(c, x - r * .35, y - r * .35, r * .1, x, y, r, [[0, 'rgba(255,255,255,.75)'], [.55, 'rgba(160,230,255,.12)'], [1, 'rgba(200,245,255,.45)']]); c.fill();
  c.lineWidth = Math.max(.8, r * .12); c.strokeStyle = 'rgba(220,250,255,.85)'; c.stroke();
}
function pGoldfish(c, wag = 0) {
  c.save(); c.translate(32, 50); c.rotate(wag * .22);
  c.beginPath(); c.moveTo(6, 0); c.quadraticCurveTo(-6, -7, -26, -27); c.quadraticCurveTo(-17, -8, -13, 0); c.quadraticCurveTo(-17, 8, -26, 27); c.quadraticCurveTo(-6, 7, 6, 0); c.closePath();
  c.fillStyle = lin(c, 6, 0, -26, 0, [[0, 'rgba(255,120,20,.95)'], [1, 'rgba(255,200,90,.65)']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#a33a00'; c.stroke();
  c.strokeStyle = 'rgba(160,50,0,.45)'; c.lineWidth = .8; c.beginPath(); for (const a of [-20, -10, 10, 20]) { c.moveTo(2, 0); c.lineTo(-22, a); } c.stroke();
  c.restore();
  c.beginPath(); c.moveTo(42, 34); c.quadraticCurveTo(50, 14, 68, 33); c.closePath(); c.fillStyle = 'rgba(255,140,40,.9)'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#a33a00'; c.stroke();
  c.beginPath(); c.moveTo(48, 66); c.quadraticCurveTo(46, 80, 38, 82); c.quadraticCurveTo(50, 78, 58, 67); c.closePath(); c.fillStyle = 'rgba(255,150,50,.85)'; c.fill(); c.stroke();
  c.beginPath(); c.ellipse(56, 50, 27, 18, 0, 0, TAU); c.fillStyle = rad(c, 62, 42, 2, 56, 50, 30, [[0, '#ffe08a'], [.45, '#ff8a1a'], [1, '#c43e00']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#8a2a00'; c.stroke();
  c.beginPath(); c.ellipse(58, 59, 17, 6, 0, 0, TAU); c.fillStyle = 'rgba(255,235,190,.45)'; c.fill();
  c.strokeStyle = 'rgba(150,40,0,.35)'; c.lineWidth = .9; for (let x = 40; x < 66; x += 6) for (let y = 42; y <= 56; y += 7) { c.beginPath(); c.arc(x, y, 3.2, -1, 1); c.stroke(); }
  c.strokeStyle = 'rgba(140,40,0,.7)'; c.lineWidth = 1.4; c.beginPath(); c.arc(66, 50, 11, -1.1, 1.1); c.stroke();
  c.beginPath(); c.ellipse(57, 58, 7, 3.5, .6, 0, TAU); c.fillStyle = 'rgba(255,170,70,.9)'; c.fill();
  c.beginPath(); c.arc(73, 45, 4.6, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(74, 45, 2.6, 0, TAU); c.fillStyle = '#111'; c.fill();
  c.beginPath(); c.arc(73, 44, 1, 0, TAU); c.fillStyle = '#fff'; c.fill();
  c.beginPath(); c.arc(82, 52, 1.8, 0, TAU); c.strokeStyle = '#8a2a00'; c.lineWidth = 1.2; c.stroke();
}
function pGoldfishSym(c) { bubble(c, 86, 22, 5); bubble(c, 92, 10, 3); pGoldfish(c); }
function pAngelfish(c) {
  const fin = (a, b, d) => { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], d[0], d[1]); c.quadraticCurveTo(28, 50, a[0], a[1] + (a[1] < 50 ? 20 : -20)); c.closePath(); c.fillStyle = 'rgba(255,240,160,.55)'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#6a5a20'; c.stroke(); };
  fin([46, 20], [32, 2], [18, 2]); fin([46, 80], [32, 98], [18, 98]);
  c.beginPath(); c.moveTo(32, 44); c.lineTo(12, 32); c.lineTo(17, 50); c.lineTo(12, 68); c.lineTo(32, 56); c.closePath(); c.fillStyle = 'rgba(255,240,160,.6)'; c.fill(); c.stroke();
  const body = () => { c.beginPath(); c.moveTo(82, 50); c.quadraticCurveTo(64, 18, 44, 18); c.quadraticCurveTo(30, 30, 30, 50); c.quadraticCurveTo(30, 70, 44, 82); c.quadraticCurveTo(64, 82, 82, 50); c.closePath(); };
  body(); c.fillStyle = lin(c, 30, 20, 80, 80, [[0, '#fffbe0'], [.5, '#f2e08a'], [1, '#b89a3a']]); c.fill();
  c.save(); body(); c.clip(); c.fillStyle = 'rgba(20,20,30,.85)';
  for (const [x, w] of [[38, 6], [52, 7], [66, 5]]) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x - 4, 50, x, 100); c.lineTo(x + w, 100); c.quadraticCurveTo(x + w - 4, 50, x + w, 0); c.fill(); }
  c.restore(); body(); c.lineWidth = 1.8; c.strokeStyle = '#5a4a10'; c.stroke();
  c.beginPath(); c.arc(72, 45, 3.6, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(73, 45, 2, 0, TAU); c.fillStyle = '#b01010'; c.fill();
  bubble(c, 88, 26, 4);
}
function pPuffer(c) {
  c.fillStyle = '#8a5a12';
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, x = 50 + Math.cos(a) * 30, y = 52 + Math.sin(a) * 30; c.beginPath(); c.moveTo(x + Math.cos(a + 1.57) * 3, y + Math.sin(a + 1.57) * 3); c.lineTo(50 + Math.cos(a) * 39, 52 + Math.sin(a) * 39); c.lineTo(x - Math.cos(a + 1.57) * 3, y - Math.sin(a + 1.57) * 3); c.fill(); }
  c.beginPath(); c.moveTo(22, 52); c.lineTo(8, 40); c.lineTo(10, 64); c.closePath(); c.fillStyle = 'rgba(240,200,90,.85)'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#6a4a10'; c.stroke();
  c.beginPath(); c.arc(50, 52, 31, 0, TAU); c.fillStyle = rad(c, 56, 40, 3, 50, 52, 33, [[0, '#fff6c0'], [.5, '#f2c64a'], [1, '#a8741a']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#6a4a10'; c.stroke();
  c.beginPath(); c.ellipse(52, 68, 22, 11, 0, 0, Math.PI); c.fillStyle = 'rgba(255,250,230,.6)'; c.fill();
  c.fillStyle = 'rgba(110,70,20,.55)'; for (const [x, y, r] of [[36, 40, 3], [44, 32, 2.5], [30, 54, 2.5], [40, 50, 2], [56, 30, 2]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(46, 62, 7, 4, -.6, 0, TAU); c.fillStyle = 'rgba(240,200,90,.9)'; c.fill();
  for (const x of [58, 72]) { c.beginPath(); c.arc(x, 42, 6.5, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#6a4a10'; c.stroke(); c.beginPath(); c.arc(x + 1.5, 43, 3.4, 0, TAU); c.fillStyle = '#111'; c.fill(); c.beginPath(); c.arc(x + .5, 41.5, 1.1, 0, TAU); c.fillStyle = '#fff'; c.fill(); }
  c.beginPath(); c.ellipse(78, 58, 3.5, 2.6, 0, 0, TAU); c.fillStyle = '#7a2a10'; c.fill();
}
function pSeahorse(c) {
  const p = () => { c.beginPath(); c.moveTo(44, 13); c.quadraticCurveTo(56, 6, 63, 16); c.lineTo(83, 20); c.lineTo(84, 27); c.lineTo(64, 28); c.quadraticCurveTo(71, 40, 67, 52); c.quadraticCurveTo(65, 68, 55, 75); c.quadraticCurveTo(47, 81, 49, 88); c.quadraticCurveTo(52, 97, 43, 96); c.quadraticCurveTo(34, 94, 37, 87); c.quadraticCurveTo(40, 83, 44, 86); c.quadraticCurveTo(38, 77, 41, 65); c.quadraticCurveTo(32, 49, 38, 35); c.quadraticCurveTo(35, 22, 44, 13); c.closePath(); };
  c.beginPath(); c.moveTo(38, 42); c.quadraticCurveTo(24, 50, 37, 62); c.closePath(); c.fillStyle = 'rgba(255,220,140,.7)'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#8a4a10'; c.stroke();
  p(); c.fillStyle = lin(c, 30, 10, 80, 90, [[0, '#ffe39a'], [.5, '#ff9a3a'], [1, '#c45a10']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#7a3a08'; c.lineJoin = 'round'; c.stroke();
  c.save(); p(); c.clip(); c.strokeStyle = 'rgba(120,50,0,.45)'; c.lineWidth = 1.2; for (let y = 32; y < 84; y += 5) { c.beginPath(); c.moveTo(30, y); c.quadraticCurveTo(52, y + 3, 72, y - 2); c.stroke(); } c.restore();
  c.fillStyle = '#7a3a08'; for (const [x, y] of [[48, 10], [54, 8], [60, 11]]) { c.beginPath(); c.moveTo(x - 2, y + 4); c.lineTo(x, y - 3); c.lineTo(x + 2, y + 4); c.fill(); }
  c.beginPath(); c.arc(58, 20, 3.3, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(59, 20, 1.8, 0, TAU); c.fillStyle = '#111'; c.fill();
  bubble(c, 86, 40, 4); bubble(c, 80, 54, 2.5);
}
function pChest(c) {
  c.beginPath(); c.moveTo(14, 48); c.lineTo(20, 22); c.lineTo(80, 22); c.lineTo(86, 48); c.closePath(); c.fillStyle = lin(c, 0, 22, 0, 48, [[0, '#4a2a10'], [1, '#2a1406']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#1a0a02'; c.stroke();
  for (const [x, y, r] of [[32, 46, 7], [44, 42, 7], [56, 44, 7], [68, 46, 7], [38, 38, 6], [52, 36, 6], [62, 38, 6], [50, 30, 5]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = rad(c, x - 2, y - 2, 1, x, y, r, [[0, '#fff6c0'], [.5, '#f7c948'], [1, '#a0680a']]); c.fill(); c.lineWidth = 1; c.strokeStyle = '#7a4a00'; c.stroke(); }
  c.beginPath(); c.moveTo(28, 34); c.lineTo(33, 28); c.lineTo(38, 34); c.lineTo(33, 40); c.closePath(); c.fillStyle = '#e8102c'; c.fill();
  c.beginPath(); c.moveTo(66, 30); c.lineTo(71, 25); c.lineTo(76, 30); c.lineTo(71, 35); c.closePath(); c.fillStyle = '#2a8aff'; c.fill();
  rr(c, 12, 46, 76, 40, 5); c.fillStyle = lin(c, 0, 46, 0, 86, [[0, '#a8642a'], [.5, '#7a4216'], [1, '#4a2408']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#2a1406'; c.stroke();
  c.strokeStyle = 'rgba(40,20,5,.5)'; c.lineWidth = 1; c.beginPath(); for (const y of [58, 70]) { c.moveTo(14, y); c.lineTo(86, y); } c.stroke();
  c.fillStyle = gold(c, 46, 86); for (const x of [18, 76]) { c.fillRect(x, 46, 6, 40); }
  rr(c, 43, 54, 14, 18, 3); c.fill(); c.fillStyle = '#2a1406'; c.beginPath(); c.arc(50, 61, 2.5, 0, TAU); c.fill(); c.fillRect(49, 61, 2, 6);
  sparkle(c, 80, 18, 7); bubble(c, 22, 14, 4);
}
function pBowl(c) {
  const bowl = () => { c.beginPath(); c.moveTo(30, 18); c.bezierCurveTo(4, 30, 4, 84, 50, 90); c.bezierCurveTo(96, 84, 96, 30, 70, 18); c.closePath(); };
  bowl(); c.fillStyle = 'rgba(200,240,255,.18)'; c.fill();
  c.save(); bowl(); c.clip(); c.fillStyle = lin(c, 0, 34, 0, 92, [[0, 'rgba(70,190,230,.85)'], [1, 'rgba(10,70,130,.95)']]); c.fillRect(0, 34, 100, 66);
  c.fillStyle = '#d8b878'; c.beginPath(); c.ellipse(50, 92, 40, 9, 0, 0, TAU); c.fill();
  c.strokeStyle = '#2aa84a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(24, 86); c.quadraticCurveTo(18, 70, 26, 60); c.moveTo(76, 86); c.quadraticCurveTo(84, 72, 76, 62); c.stroke();
  c.save(); c.translate(26, 34); c.scale(.5, .5); pGoldfish(c, .3); c.restore();
  c.restore();
  c.beginPath(); c.ellipse(50, 34, 32, 4, 0, 0, TAU); c.strokeStyle = 'rgba(220,250,255,.6)'; c.lineWidth = 1.2; c.stroke();
  bowl(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(220,250,255,.9)'; c.stroke();
  c.beginPath(); c.ellipse(50, 18, 21, 4, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = 'rgba(235,252,255,.95)'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(50, 56, 34, 3.5, 4.2); c.stroke();
  rr(c, 12, 64, 76, 20, 6); c.fillStyle = lin(c, 0, 64, 0, 84, [[0, '#ffd27a'], [1, '#e07a10']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#7a3a00'; c.stroke();
  text(c, 'WILD', 50, 75, 16, { fill: '#b01010', stroke: '#fff3c0', sw: 3 });
}
function pFeeder(c) {
  c.fillStyle = 'rgba(255,170,60,.95)';
  for (const [x, y, w, a] of [[64, 74, 5, .4], [72, 82, 4, 1.2], [80, 90, 5, 2], [70, 92, 3, .8], [84, 78, 4, 2.6], [60, 88, 4, 1.7], [88, 94, 3, .3]]) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = ['#ffb030', '#ff6a3a', '#7ad04a', '#ffe060'][Math.round(a * 3) % 4]; c.fillRect(-w / 2, -w / 3, w, w * .66); c.restore(); }
  c.save(); c.translate(42, 44); c.rotate(-.55);
  rr(c, -17, -30, 34, 62, 7); c.fillStyle = lin(c, -17, 0, 17, 0, [[0, '#c46a00'], [.4, '#ffd060'], [1, '#a04a00']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a2a00'; c.stroke();
  rr(c, -19, -38, 38, 11, 3); c.fillStyle = lin(c, -19, 0, 19, 0, [[0, '#8a0a10'], [.4, '#ff4a4a'], [1, '#6a0008']]); c.fill(); c.stroke();
  rr(c, -14, -16, 28, 32, 4); c.fillStyle = '#fff6e0'; c.fill(); c.lineWidth = 1; c.stroke();
  text(c, 'FISH', 0, -7, 9, { fill: '#0a5a8a' }); text(c, 'FOOD', 0, 6, 9, { fill: '#e04a10' });
  c.restore();
  rr(c, 6, 80, 50, 15, 5); c.fillStyle = lin(c, 0, 80, 0, 95, [[0, '#ffb030'], [1, '#c45a00']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#5a2a00'; c.stroke();
  text(c, 'BONUS', 31, 88, 10, { fill: '#fff', stroke: '#5a2a00', sw: 2 });
}
function pPebble(c, ch, a, b) {
  c.beginPath(); c.ellipse(50, 56, 41, 33, -.08, 0, TAU); c.fillStyle = rad(c, 38, 40, 4, 50, 56, 44, [[0, a], [1, b]]); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
  c.fillStyle = 'rgba(0,0,0,.12)'; for (const [x, y] of [[30, 64], [62, 72], [70, 46], [40, 76], [24, 50]]) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(36, 38, 14, 6, -.4, 0, TAU); c.fill();
  const size = ch.length > 1 ? 36 : 46;
  c.font = `bold ${size}px ${FS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(ch, 51.5, 59.5);
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText(ch, 50, 58);
  bubble(c, 84, 18, 6); bubble(c, 74, 8, 3.5);
}

// =====================================================================================================
// Math
// =====================================================================================================
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// A video reel strip from symbol counts, deterministically shuffled; `spaced` symbols are kept >= 3 apart (max one per window).
function buildStrip(counts, seed, spaced = []) {
  const rnd = mulberry(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const a = []; for (const [s, n] of Object.entries(counts)) for (let i = 0; i < n; i++) a.push(s);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const L = a.length; let ok = true;
    for (let i = 0; i < L && ok; i++) if (spaced.includes(a[i])) for (let d = 1; d < 3; d++) if (spaced.includes(a[(i + d) % L])) ok = false;
    for (let i = 0; i < L && ok; i++) if (a[i] === a[(i + 1) % L] && a[i] === a[(i + 2) % L] && !/pearl/.test(a[i])) ok = false; // no 3-stacks of normal symbols
    if (ok) return { strip: a };
  }
  throw new Error('strip build failed');
}
// A classic physical reel: each symbol is followed by a blank; every stop has a weight (virtual reel mapping).
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

function payOf(rule, coins) { return Array.isArray(rule.pay) ? rule.pay[coins - 1] : rule.pay * coins; }
function matchSym(cfg, rs, s) {
  if (rs === '*' || rs === s) return 1;
  if (rs[0] === '@' && cfg.groups[rs.slice(1)].includes(s)) return 1;
  if (cfg.wild && s === cfg.wild) return 2;
  return 0;
}
function evalLine3(cfg, syms, coins) {
  let best = null;
  for (const rule of cfg.rules) {
    let w = 0, ok = true;
    if (rule.k === 'seq') { for (let i = 0; i < 3; i++) { const m = matchSym(cfg, rule.s[i], syms[i]); if (!m) { ok = false; break; } if (m === 2) w++; } }
    else { let n = 0; for (const s of syms) { if (s === rule.s) n++; else if (cfg.wild && s === cfg.wild) { n++; w++; } } ok = n >= rule.n; }
    if (!ok) continue;
    const mult = rule.noMult ? 1 : cfg.wildMult ? cfg.wildMult[w] : 1;
    if (!mult) continue;
    const p = payOf(rule, coins) * mult;
    if (!best || p > best.pay) best = { pay: p, rule, mult };
  }
  return best;
}
function evalLine5(cfg, syms) {
  const W = cfg.wild; let tgt = null, n = 0;
  for (const s of syms) {
    if (s === cfg.scatter || s === cfg.bonus) break;
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
// Evaluate a grid. units = coins (coins mode) or active lines. Returns coin amounts (1 coin = coin value in $).
function evaluate(cfg, grid, units, mult = 1) {
  const wins = []; let coins = 0; let jackpot = false;
  const nl = cfg.betMode === 'coins' ? 1 : units;
  for (let li = 0; li < nl; li++) {
    const L = cfg.lines[li], syms = L.map((r, i) => grid[i][r]);
    if (cfg.reels === 3) {
      const b = evalLine3(cfg, syms, cfg.betMode === 'coins' ? units : 1);
      if (!b || !(b.pay > 0)) continue;
      const idx = b.rule.k === 'seq' ? [0, 1, 2].filter(i => b.rule.s[i] !== '*') : [0, 1, 2].filter(i => syms[i] === b.rule.s || syms[i] === cfg.wild);
      const wildOnly = b.rule.k === 'count' && !syms.includes(b.rule.s);
      const w = { line: li, cells: idx.map(i => [i, L[i]]), pay: b.pay * mult, label: wildOnly ? `${idx.length > 1 ? 'Two Wilds' : 'Wild'} ×${b.mult}` : b.rule.name + (b.mult > 1 ? ` ×${b.mult}` : '') };
      if (b.rule.jackpot && cfg.progressive && li === 0 && units === cfg.maxUnits) { w.jackpot = true; w.pay = 0; w.label = 'MEGA VALLEY JACKPOT'; jackpot = true; }
      coins += w.pay; wins.push(w);
    } else {
      const b = evalLine5(cfg, syms);
      if (!b) continue;
      const p = b.pay * mult; coins += p;
      wins.push({ line: li, cells: L.slice(0, b.n).map((r, i) => [i, r]), pay: p, sym: b.sym, n: b.n, label: `${b.n}× ${cfg.names[b.sym]}` });
    }
  }
  const res = { wins, coins, jackpot, fs: 0, hold: null };
  if (cfg.scatter) {
    const cells = []; grid.forEach((col, i) => col.forEach((s, r) => { if (s === cfg.scatter) cells.push([i, r]); }));
    const n = cells.length;
    if (cfg.scatterPay[n]) { const p = cfg.scatterPay[n] * (cfg.betMode === 'coins' ? units : units) * mult; res.coins += p; wins.push({ line: -1, cells, pay: p, label: `${n}× ${cfg.names[cfg.scatter]}`, scatter: true }); }
    if (cfg.freeSpins && cfg.freeSpins[n]) res.fs = cfg.freeSpins[n];
    if (cfg.pickBonus && n >= 3) res.pick = true;
  }
  if (cfg.bonus) {
    const cells = []; grid.forEach((col, i) => col.forEach((s, r) => { if (s === cfg.bonus) cells.push([i, r]); }));
    if (cells.length >= cfg.holdMin) res.hold = cells;
  }
  return res;
}
// Hold & Spin (Dragon Pearls): pearl values are multiples of TOTAL bet; some are fixed jackpots.
const PEARL_VALS = [[1, 350], [2, 280], [3, 150], [5, 100], [8, 60], [10, 30], [15, 15], ['MINI', 10], ['MINOR', 4], ['MAJOR', 1]];
const PEARL_TOTAL = PEARL_VALS.reduce((a, b) => a + b[1], 0);
const JP_MULT = { MINI: 20, MINOR: 50, MAJOR: 200, GRAND: 1000 };
function pearlValue(R) { let x = R(PEARL_TOTAL); for (const [v, w] of PEARL_VALS) { if (x < w) return typeof v === 'number' ? { m: v } : { m: JP_MULT[v], j: v }; x -= w; } return { m: 1 }; }
function holdRespin(cells, R, q) { const got = []; for (let i = 0; i < cells.length; i++) if (!cells[i] && R(10000) < q) { cells[i] = pearlValue(R); got.push(i); } return got; }
// Goldfish pick bonus (Fishbowl Fortune): each picked fish reveals one prize. Collect ends the round (never on the first pick).
const PICK_MAX = 8;
const PICK_TABLE = [[{ t: 'cash', m: 2 }, 16], [{ t: 'cash', m: 3 }, 14], [{ t: 'cash', m: 5 }, 10], [{ t: 'cash', m: 10 }, 6], [{ t: 'cash', m: 25 }, 2], [{ t: 'cash', m: 50 }, 1],
  [{ t: 'spins', n: 5 }, 14], [{ t: 'spins', n: 10 }, 4], [{ t: 'mult', n: 1 }, 12], [{ t: 'collect' }, 14]];
const PICK_TOTAL = PICK_TABLE.reduce((a, b) => a + b[1], 0);
function fishPick(R, first = false) {
  for (;;) { let x = R(PICK_TOTAL); for (const [v, w] of PICK_TABLE) { if (x < w) { if (first && v.t === 'collect') break; return { ...v }; } x -= w; } }
}

// =====================================================================================================
// Machine definitions
// =====================================================================================================
const LINE1 = [[1, 1, 1]];
const LINES3 = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
const LINES20 = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0]];
const BAR_CLASSIC = { body: '#141414', edge: '#f2f2f2', text: '#fff', acc: '#888' };

// Reel-stop weights (virtual reel mapping), tuned by exact enumeration to the RTPs listed in RTP below.
const W_SEVENS = { seven: 2, bar3: 3, bar2: 2, bar1: 4, cherry: 2, blank: 4 };
const W_DD = { dd: 2, seven: 3, bar3: 2, bar2: 3, bar1: 4, cherry: 1, blank: 4 };
const W_LB = { bell: 2, heart: 2, diamond: 3, spade: 2, horseshoe: 3 };
const W_MV = { mega: 2, seven: 1, bar3: 2, bar2: 2, bar1: 2, cherry: 1, blank: 7 };
const GF_FEEDERS = 4, GF_WILDS = 3;
const ORDER_7 = ['seven', 'bar1', 'cherry', 'bar3', 'bar1', 'bar2', 'cherry', 'bar1', 'bar2', 'bar3', 'bar1'];
const CFG_SEVENS = finalize({
  id: 'slot-sevens', title: 'Blazing 7s', blurb: 'Classic 3-reel, 1 line. Three Blazing 7s at max coins pays 5,000.',
  theme: { cabinet: '#b3001b', accent: '#ffd000', glass: '#1a0004' }, style: 'chrome', reelBg: 'ivory', cellAspect: 1.25, aspectMin: 1.0,
  reels: 3, rows: 3, centerStop: true, lines: LINE1, betMode: 'coins', maxUnits: 3, defUnits: 3, unitName: 'COINS',
  reelDefs: [
    classicReel(ORDER_7, W_SEVENS), classicReel(ORDER_7, W_SEVENS), classicReel(ORDER_7, W_SEVENS)],
  groups: { bar: ['bar1', 'bar2', 'bar3'] },
  rules: [
    { k: 'seq', s: ['seven', 'seven', 'seven'], pay: [1000, 2000, 5000], name: 'Three Blazing 7s' },
    { k: 'seq', s: ['bar3', 'bar3', 'bar3'], pay: 100, name: 'Three Triple BARs' },
    { k: 'seq', s: ['bar2', 'bar2', 'bar2'], pay: 50, name: 'Three Double BARs' },
    { k: 'seq', s: ['bar1', 'bar1', 'bar1'], pay: 25, name: 'Three BARs' },
    { k: 'seq', s: ['@bar', '@bar', '@bar'], pay: 10, name: 'Any 3 BARs', any: true },
    { k: 'count', s: 'cherry', n: 3, pay: 25, name: 'Three Cherries' },
    { k: 'count', s: 'cherry', n: 2, pay: 5, name: 'Any 2 Cherries' },
    { k: 'count', s: 'cherry', n: 1, pay: 2, name: 'Any Cherry' }],
  names: { seven: 'Blazing 7', bar3: 'Triple BAR', bar2: 'Double BAR', bar1: 'BAR', cherry: 'Cherry' },
  paint: { seven: c => pSeven(c, { flame: true, top: '#ff3a2a', bot: '#8a0008', edge: '#fff4c0' }), bar3: c => pBars(c, 3, BAR_CLASSIC), bar2: c => pBars(c, 2, BAR_CLASSIC), bar1: c => pBars(c, 1, BAR_CLASSIC), cherry: pCherry },
  rulesHtml: `<p>One center payline. Bet 1–3 coins; the coin value is $1, $5 or $25. Pays shown are in coins. Cherries pay anywhere on the line. <b>Three Blazing 7s at 3 coins pays 5,000 coins</b>.</p>`
});

const ORDER_DD = ['dd', 'bar1', 'cherry', 'bar3', 'seven', 'bar2', 'bar1', 'cherry', 'bar2', 'bar3', 'bar1'];
const CFG_DIAMOND = finalize({
  id: 'slot-diamond', title: 'Diamond Doubler', blurb: 'Wild diamonds double a win — two of them quadruple it.',
  theme: { cabinet: '#123a8c', accent: '#7fd8ff', glass: '#03102a' }, style: 'chrome', reelBg: 'ivory', cellAspect: 1.25, aspectMin: 1.0,
  reels: 3, rows: 3, centerStop: true, lines: LINE1, betMode: 'coins', maxUnits: 3, defUnits: 3, unitName: 'COINS',
  reelDefs: [
    classicReel(ORDER_DD, W_DD), classicReel(ORDER_DD, W_DD), classicReel(ORDER_DD, W_DD)],
  groups: { bar: ['bar1', 'bar2', 'bar3'] }, wild: 'dd', wildMult: [1, 2, 4, 0],
  rules: [
    { k: 'seq', s: ['dd', 'dd', 'dd'], pay: [1000, 2000, 5000], name: 'Three Diamonds', noMult: true },
    { k: 'seq', s: ['seven', 'seven', 'seven'], pay: 80, name: 'Three 7s' },
    { k: 'seq', s: ['bar3', 'bar3', 'bar3'], pay: 40, name: 'Three Triple BARs' },
    { k: 'seq', s: ['bar2', 'bar2', 'bar2'], pay: 25, name: 'Three Double BARs' },
    { k: 'seq', s: ['bar1', 'bar1', 'bar1'], pay: 10, name: 'Three BARs' },
    { k: 'seq', s: ['@bar', '@bar', '@bar'], pay: 5, name: 'Any 3 BARs', any: true },
    { k: 'count', s: 'cherry', n: 3, pay: 10, name: 'Three Cherries' },
    { k: 'count', s: 'cherry', n: 2, pay: 5, name: 'Any 2 Cherries' },
    { k: 'count', s: 'cherry', n: 1, pay: 2, name: 'Any Cherry' }],
  names: { dd: 'Diamond Wild', seven: '7', bar3: 'Triple BAR', bar2: 'Double BAR', bar1: 'BAR', cherry: 'Cherry' },
  paint: { dd: pDD, seven: c => pSeven(c, { top: '#ff4b3a', bot: '#8a0008', edge: '#fff' }), bar3: c => pBars(c, 3, BAR_CLASSIC), bar2: c => pBars(c, 2, BAR_CLASSIC), bar1: c => pBars(c, 1, BAR_CLASSIC), cherry: pCherry },
  rulesHtml: `<p>One center payline, 1–3 coins. The <b>Diamond Wild</b> substitutes for every symbol (it counts as a cherry too). One wild in a win pays <b>×2</b>, two wilds pay <b>×4</b>. Three wilds pay the top award.</p>`
});

const ORDER_LB = ['horseshoe', 'spade', 'heart', 'diamond', 'bell', 'horseshoe', 'spade', 'diamond', 'heart', 'spade'];
const lbW = (o) => { const w = []; for (const s of ORDER_LB) w.push(o[s]); return w; };
const CFG_LIBERTY = finalize({
  id: 'slot-liberty', title: 'Liberty Bell', blurb: 'The 1899 original: horseshoes, bells and card suits. Pull the lever.',
  theme: { cabinet: '#5a3a1e', accent: '#c9a45c', glass: '#2b1d0e' }, style: 'wood', reelBg: 'paper', cellAspect: 1.15, aspectMin: .95,
  reels: 3, rows: 3, centerStop: true, lines: LINE1, betMode: 'coins', maxUnits: 3, defUnits: 1, unitName: 'COINS',
  reelDefs: [
    { strip: ORDER_LB.slice(), weights: lbW(W_LB) }, { strip: ORDER_LB.slice(), weights: lbW(W_LB) }, { strip: ORDER_LB.slice(), weights: lbW(W_LB) }],
  groups: {},
  rules: [
    { k: 'seq', s: ['bell', 'bell', 'bell'], pay: [50, 100, 200], name: 'Three Liberty Bells' },
    { k: 'seq', s: ['heart', 'heart', 'heart'], pay: 25, name: 'Three Hearts' },
    { k: 'seq', s: ['diamond', 'diamond', 'diamond'], pay: 20, name: 'Three Diamonds' },
    { k: 'seq', s: ['spade', 'spade', 'spade'], pay: 15, name: 'Three Spades' },
    { k: 'seq', s: ['horseshoe', 'horseshoe', 'horseshoe'], pay: 10, name: 'Three Horseshoes' },
    { k: 'seq', s: ['horseshoe', 'horseshoe', '*'], pay: 2, name: 'Two Horseshoes', any: true }],
  names: { bell: 'Liberty Bell', heart: 'Heart', diamond: 'Diamond', spade: 'Spade', horseshoe: 'Horseshoe' },
  paint: { bell: pBell, heart: pHeartV, diamond: pDiamondV, spade: pSpadeV, horseshoe: pHorseshoe },
  rulesHtml: `<p>Charles Fey's 1899 Liberty Bell, restored. One center line, 1–3 coins. Two horseshoes on the first two reels pay regardless of the third. <b>Three Liberty Bells at 3 coins pays 200</b>.</p>`
});

const PH_BASE = { pharaoh: 2, ankh: 3, eye: 3, scarab: 4, A: 5, K: 5, Q: 6, J: 6, T: 7 };
const CFG_PHARAOH = finalize({
  id: 'slot-pharaoh', title: "Pharaoh's Gold", blurb: '5 reels, 20 lines. Pyramids scatter into 10 free spins with every win tripled.',
  theme: { cabinet: '#0f2a6b', accent: '#f2c14e', glass: '#0b0f24' }, style: 'video', reelBg: 'lapis', cellAspect: 1.0, aspectMin: .74,
  reels: 5, rows: 3, centerStop: false, lines: LINES20, betMode: 'lines', maxUnits: 20, defUnits: 20, unitName: 'LINES', unitSteps: [1, 5, 10, 15, 20],
  reelDefs: [
    buildStrip({ ...PH_BASE, scatter: 2 }, 11, ['scatter', 'wild']),
    buildStrip({ ...PH_BASE, scatter: 2, wild: 2 }, 12, ['scatter', 'wild']),
    buildStrip({ ...PH_BASE, scatter: 2, wild: 2 }, 13, ['scatter', 'wild']),
    buildStrip({ ...PH_BASE, scatter: 1, wild: 2 }, 14, ['scatter', 'wild']),
    buildStrip({ ...PH_BASE, scatter: 2, wild: 2 }, 15, ['scatter', 'wild'])],
  wild: 'wild', scatter: 'scatter', scatterPay: { 3: 2, 4: 10, 5: 50 }, freeSpins: { 3: 10, 4: 10, 5: 10 }, fsMult: 3,
  pays: {
    wild: { 5: 1000 }, pharaoh: { 2: 5, 3: 50, 4: 250, 5: 1000 }, ankh: { 3: 40, 4: 150, 5: 600 }, eye: { 3: 30, 4: 100, 5: 400 }, scarab: { 3: 25, 4: 80, 5: 300 },
    A: { 3: 15, 4: 50, 5: 200 }, K: { 3: 15, 4: 50, 5: 200 }, Q: { 3: 10, 4: 40, 5: 150 }, J: { 3: 10, 4: 30, 5: 150 }, T: { 3: 8, 4: 30, 5: 100 }
  },
  names: { wild: 'Wild', pharaoh: 'Pharaoh', ankh: 'Ankh', eye: 'Eye of Horus', scarab: 'Scarab', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', scatter: 'Pyramid' },
  paint: { wild: c => pWildCartouche(c), pharaoh: pPharaoh, ankh: pAnkh, eye: pEye, scarab: pScarab, scatter: pPyramid,
    A: c => pRoyal(c, 'A', '#ff6a5a', '#8a0a10'), K: c => pRoyal(c, 'K', '#6ab0ff', '#0a2a8a'), Q: c => pRoyal(c, 'Q', '#d38bff', '#4a0a8a'), J: c => pRoyal(c, 'J', '#7af08a', '#0a6a2a'), T: c => pRoyal(c, '10', '#ffc65a', '#8a4a0a') },
  rulesHtml: `<p>5 reels, 20 lines; bet per line is the coin value. Line wins pay left to right on consecutive reels and are multiplied by the coin value. <b>Wild</b> (reels 2–5) substitutes for everything but the Pyramid. <b>Pyramid</b> scatters pay anywhere ×total bet, and 3 or more award <b>10 free spins with all wins ×3</b>. Free spins can retrigger.</p>`
});

const DR_BASE = { dragon: 2, koi: 3, lantern: 3, ingot: 4, A: 5, K: 5, Q: 6, J: 6, T: 6, pearl: 8 };
const CFG_DRAGON = finalize({
  id: 'slot-dragon', title: 'Dragon Pearls', blurb: '5 reels, 20 lines. Six or more pearls start Hold & Spin for the GRAND jackpot.',
  theme: { cabinet: '#9e0f12', accent: '#f7c548', glass: '#1a0507' }, style: 'video', reelBg: 'crimson', cellAspect: 1.0, aspectMin: .74,
  reels: 5, rows: 3, centerStop: false, lines: LINES20, betMode: 'lines', maxUnits: 20, defUnits: 20, unitName: 'LINES', unitSteps: [1, 5, 10, 15, 20],
  reelDefs: [
    buildStrip({ ...DR_BASE }, 21, ['wild']),
    buildStrip({ ...DR_BASE, wild: 3 }, 22, ['wild']),
    buildStrip({ ...DR_BASE, wild: 3 }, 23, ['wild']),
    buildStrip({ ...DR_BASE, wild: 3 }, 24, ['wild']),
    buildStrip({ ...DR_BASE, wild: 3 }, 25, ['wild'])],
  wild: 'wild', bonus: 'pearl', holdMin: 6, holdQ: 350,
  pays: {
    dragon: { 3: 75, 4: 300, 5: 1000 }, koi: { 3: 50, 4: 150, 5: 600 }, lantern: { 3: 40, 4: 100, 5: 400 }, ingot: { 3: 30, 4: 80, 5: 300 },
    A: { 3: 20, 4: 50, 5: 200 }, K: { 3: 15, 4: 50, 5: 200 }, Q: { 3: 12, 4: 40, 5: 150 }, J: { 3: 10, 4: 30, 5: 120 }, T: { 3: 10, 4: 30, 5: 100 }
  },
  names: { wild: 'Jade Wild', dragon: 'Dragon', koi: 'Koi', lantern: 'Lantern', ingot: 'Gold Ingot', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', pearl: 'Pearl' },
  paint: { wild: pJade, dragon: pDragon, koi: pKoi, lantern: pLantern, ingot: pIngot, pearl: pPearl,
    A: c => pRoyal(c, 'A', '#ff7a4a', '#9a0a0a', '#ffd34a'), K: c => pRoyal(c, 'K', '#ffd34a', '#a0500a', '#fff2b0'), Q: c => pRoyal(c, 'Q', '#ff8ad0', '#8a0a5a', '#ffd34a'), J: c => pRoyal(c, 'J', '#7af0c0', '#0a6a4a', '#ffd34a'), T: c => pRoyal(c, '10', '#9ad0ff', '#0a3a8a', '#ffd34a') },
  rulesHtml: `<p>5 reels, 20 lines; bet per line is the coin value. <b>Jade Wild</b> (reels 2–5) substitutes for all symbols except Pearls.</p>
  <p><b>Hold &amp; Spin:</b> 6 or more Pearls anywhere lock in place and you get 3 respins. Every new Pearl locks and resets the respins to 3. Each Pearl shows a cash value (×1 to ×15 the total bet) or a jackpot: <b>MINI ×20, MINOR ×50, MAJOR ×200</b>. Fill all 15 spots to win the <b>GRAND ×1000</b> on top.</p>`
});

const ORDER_MV = ['mega', 'bar1', 'cherry', 'bar2', 'seven', 'bar1', 'bar3', 'cherry', 'bar2', 'bar1', 'seven'];
const PROG_KEY = 'vc.progressive', PROG_SEED = 10000, PROG_RATE = .015;
const MV_BARS = { body: '#2a0a4a', edge: '#ffd54a', text: '#fff', acc: '#ff6ae8' };
const CFG_MEGA = finalize({
  id: 'slot-mega', title: 'Mega Valley', blurb: 'Progressive jackpot. Three MEGA symbols on the center line with all 5 lines bet wins the meter.',
  theme: { cabinet: '#4b148f', accent: '#ffcc33', glass: '#0e0420' }, style: 'neon', reelBg: 'night', cellAspect: 1.2, aspectMin: .95,
  reels: 3, rows: 3, centerStop: true, lines: LINES3, betMode: 'lines', maxUnits: 5, defUnits: 5, unitName: 'LINES', progressive: true,
  reelDefs: [
    classicReel(ORDER_MV, W_MV), classicReel(ORDER_MV, W_MV), classicReel(ORDER_MV, W_MV)],
  groups: { bar: ['bar1', 'bar2', 'bar3'] },
  rules: [
    { k: 'seq', s: ['mega', 'mega', 'mega'], pay: 1000, name: 'Three MEGA', jackpot: true },
    { k: 'seq', s: ['seven', 'seven', 'seven'], pay: 100, name: 'Three 7s' },
    { k: 'seq', s: ['bar3', 'bar3', 'bar3'], pay: 50, name: 'Three Triple BARs' },
    { k: 'seq', s: ['bar2', 'bar2', 'bar2'], pay: 25, name: 'Three Double BARs' },
    { k: 'seq', s: ['bar1', 'bar1', 'bar1'], pay: 10, name: 'Three BARs' },
    { k: 'seq', s: ['@bar', '@bar', '@bar'], pay: 4, name: 'Any 3 BARs', any: true },
    { k: 'seq', s: ['cherry', 'cherry', 'cherry'], pay: 20, name: 'Three Cherries' },
    { k: 'seq', s: ['cherry', 'cherry', '*'], pay: 5, name: 'Two Cherries (left)', any: true },
    { k: 'seq', s: ['cherry', '*', '*'], pay: 2, name: 'Cherry (left)', any: true }],
  names: { mega: 'MEGA', seven: '7', bar3: 'Triple BAR', bar2: 'Double BAR', bar1: 'BAR', cherry: 'Cherry' },
  paint: { mega: pMega, seven: c => pSeven(c, { top: '#6ad8ff', bot: '#0a2a9a', edge: '#e8f4ff', dark: '#000a20' }), bar3: c => pBars(c, 3, MV_BARS), bar2: c => pBars(c, 2, MV_BARS), bar1: c => pBars(c, 1, MV_BARS), cherry: pCherry },
  rulesHtml: `<p>3 reels, 5 lines (center, top, bottom and both diagonals); each line costs one coin. <b>Three MEGA on the center line with all 5 lines bet wins the progressive jackpot</b> — any other three-MEGA line pays 1,000 coins. ${PROG_RATE * 100}% of every bet on this machine feeds the meter, which is shared across the casino floor and resets to ${K.fmt(PROG_SEED)} when hit.</p>`
});

const GF_BASE = { goldfish: 2, angel: 3, puffer: 3, seahorse: 4, chest: 4, A: 5, K: 5, Q: 6, J: 6, T: 7 };
const CFG_GOLDFISH = finalize({
  id: 'slot-goldfish', title: 'Fishbowl Fortune', blurb: '5 reels, 20 lines. Three Fish Feeders start the Goldfish bonus: pick fish for credits, free spins and multipliers.',
  theme: { cabinet: '#0a5a8a', accent: '#ffb030', glass: '#03202e' }, style: 'video', reelBg: 'aqua', cellAspect: 1.0, aspectMin: .74,
  reels: 5, rows: 3, centerStop: false, lines: LINES20, betMode: 'lines', maxUnits: 20, defUnits: 20, unitName: 'LINES', unitSteps: [1, 5, 10, 15, 20],
  reelDefs: [
    buildStrip({ ...GF_BASE, feeder: GF_FEEDERS }, 31, ['feeder', 'bowl']),
    buildStrip({ ...GF_BASE, bowl: GF_WILDS }, 32, ['feeder', 'bowl']),
    buildStrip({ ...GF_BASE, feeder: GF_FEEDERS, bowl: GF_WILDS }, 33, ['feeder', 'bowl']),
    buildStrip({ ...GF_BASE, bowl: GF_WILDS }, 34, ['feeder', 'bowl']),
    buildStrip({ ...GF_BASE, feeder: GF_FEEDERS }, 35, ['feeder', 'bowl'])],
  wild: 'bowl', scatter: 'feeder', scatterPay: { 3: 2 }, pickBonus: true, wildText: 'reels 2, 3 and 4', scatterText: 'Reels 1, 3, 5 only<br>3 = Goldfish bonus',
  pays: {
    goldfish: { 2: 5, 3: 50, 4: 250, 5: 1000 }, angel: { 3: 40, 4: 150, 5: 500 }, puffer: { 3: 30, 4: 100, 5: 400 }, seahorse: { 3: 25, 4: 80, 5: 300 }, chest: { 3: 20, 4: 60, 5: 250 },
    A: { 3: 15, 4: 50, 5: 200 }, K: { 3: 15, 4: 50, 5: 200 }, Q: { 3: 10, 4: 40, 5: 150 }, J: { 3: 10, 4: 30, 5: 150 }, T: { 3: 8, 4: 30, 5: 100 }
  },
  names: { bowl: 'Fishbowl Wild', goldfish: 'Goldfish', angel: 'Angelfish', puffer: 'Pufferfish', seahorse: 'Seahorse', chest: 'Treasure Chest', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', feeder: 'Fish Feeder' },
  paint: { bowl: pBowl, goldfish: pGoldfishSym, angel: pAngelfish, puffer: pPuffer, seahorse: pSeahorse, chest: pChest, feeder: pFeeder,
    A: c => pPebble(c, 'A', '#f4d2b0', '#9a6a4a'), K: c => pPebble(c, 'K', '#cfe6f0', '#5a7a8a'), Q: c => pPebble(c, 'Q', '#e8d0f0', '#7a5a8a'), J: c => pPebble(c, 'J', '#d6f0c8', '#5a8a4a'), T: c => pPebble(c, '10', '#f0e6c0', '#8a7a4a') },
  rulesHtml: `<p>5 reels, 20 lines; bet per line is the coin value. Line wins pay left to right. The <b>Fishbowl Wild</b> (reels 2–4) substitutes for every symbol except the Fish Feeder.</p>
  <p><b>Goldfish bonus:</b> the <b>Fish Feeder</b> appears only on reels 1, 3 and 5. Three Feeders pay 2× the total bet and fill the screen with a fish tank. Pick goldfish one at a time (up to ${PICK_MAX} picks). Each fish hides a <b>credit prize</b> (2× to 50× the total bet), <b>+5 or +10 free spins</b>, or <b>+1× multiplier</b>. A <b>Collect</b> fish ends the picking (never on your first pick). Free spins won then play with the multiplier you built up (starting at 1×); three Feeders during free spins add 5 more spins.</p>`
});
const CFGS = [CFG_SEVENS, CFG_DIAMOND, CFG_LIBERTY, CFG_PHARAOH, CFG_DRAGON, CFG_MEGA, CFG_GOLDFISH];
// Theoretical returns: exact enumeration for 3-reel games, 2M-spin Monte Carlo for video/progressive. Shown on each paytable.
const RTP = { 'slot-sevens': '94.7% at 3 coins · 93.5% at 1–2 coins (exact)', 'slot-diamond': '95.1% at 3 coins · 93.8% at 1–2 coins (exact)', 'slot-liberty': '95.1% at 3 coins · 94.2% at 1–2 coins (exact)', 'slot-pharaoh': '94.2% (free spins 1 in 69)', 'slot-dragon': '93.5% (Hold & Spin 1 in 69)', 'slot-mega': '90.6% base game plus the progressive: ≈93.6% at $1 coin, ≈91.7% at $25 coin', 'slot-goldfish': '≈95.9% (Goldfish bonus 1 in 72; 5M-spin Monte Carlo)' };

export const _math = { CFGS, buildStrip, finalize, fishPick, PICK_MAX, spinStops, gridOf, evaluate, pearlValue, holdRespin, JP_MULT, PROG_SEED, PROG_RATE, RTP };

// =====================================================================================================
// Styles
// =====================================================================================================
function injectSl() {
  K.injectStyles();
  if (document.getElementById('sl-style')) return;
  const s = document.createElement('style'); s.id = 'sl-style';
  s.textContent = `
.sl-screen{--cab:#b3001b;--acc:#ffd000;--glass:#1a0004;position:absolute;inset:0;display:flex;flex-direction:column;color:#f6efe0;font-family:"Chakra Petch",system-ui,sans-serif;font-size:14px;
  background:radial-gradient(ellipse 120% 70% at 50% 0%,color-mix(in srgb,var(--cab) 40%,#000) 0%,#07050a 70%);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.sl-screen *{box-sizing:border-box}
.sl-top{position:relative;z-index:3;display:flex;align-items:center;gap:8px;padding:8px max(12px,env(safe-area-inset-left,0px));padding-top:max(8px,env(safe-area-inset-top,0px));background:linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.35));border-bottom:1px solid rgba(255,255,255,.1)}
.sl-ttl{flex:1;min-width:0;display:grid}.sl-ttl b{font:400 clamp(15px,2.2vw,20px) "Bungee",Impact,sans-serif;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-ttl small{font-size:11px;color:#bfb6a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-ib{font:600 13px "Chakra Petch",system-ui,sans-serif;color:#f6efe0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;min-height:36px;cursor:pointer}
.sl-ib:hover{border-color:var(--acc)}.sl-ib:focus-visible,.sl-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.sl-stage{position:relative;z-index:1;flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch;padding:10px 12px 12px}
.sl-cab{position:relative;flex:0 1 860px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-radius:26px 26px 16px 16px;
  background:linear-gradient(90deg,color-mix(in srgb,var(--cab) 45%,#000),var(--cab) 10%,color-mix(in srgb,var(--cab) 72%,#fff) 50%,var(--cab) 90%,color-mix(in srgb,var(--cab) 45%,#000));
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),inset 0 0 0 6px rgba(0,0,0,.35),inset 0 2px 30px rgba(255,255,255,.15),0 24px 60px rgba(0,0,0,.75)}
.sl-wood .sl-cab{background:repeating-linear-gradient(93deg,rgba(0,0,0,.09) 0 2px,transparent 2px 7px,rgba(255,220,170,.05) 7px 9px,transparent 9px 15px),linear-gradient(90deg,#2e1a0a,#6b4423 22%,#83572f 50%,#6b4423 78%,#2e1a0a);
  box-shadow:inset 0 0 0 3px #c9a45c,inset 0 0 0 7px #3a230f,inset 0 0 0 9px #8a6a34,0 24px 60px rgba(0,0,0,.8)}
.sl-neon .sl-cab{background:linear-gradient(160deg,#2a0a4f,#12052a 55%,#2a0a4f);box-shadow:inset 0 0 0 2px var(--acc),inset 0 0 26px rgba(255,79,216,.35),0 0 26px rgba(255,79,216,.45),0 24px 60px rgba(0,0,0,.8)}
.sl-marq{position:relative;flex:none;display:grid;place-items:center;text-align:center;padding:10px 14px;border-radius:16px 16px 10px 10px;min-height:56px;overflow:hidden;
  background:radial-gradient(ellipse at 50% 120%,color-mix(in srgb,var(--acc) 35%,transparent),transparent 70%),linear-gradient(var(--glass),#000);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),inset 0 0 20px #000}
.sl-logo{font:400 clamp(22px,4.4vw,42px)/1 "Bungee",Impact,sans-serif;letter-spacing:.02em;background:linear-gradient(#fff 0%,var(--acc) 45%,color-mix(in srgb,var(--acc) 55%,#000) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 10px color-mix(in srgb,var(--acc) 60%,transparent))}
.sl-wood .sl-logo{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-style:italic;letter-spacing:.04em;background-image:linear-gradient(#fff6d8,#c9a45c 60%,#7a5a24)}
.sl-marq-x{font-size:12px;color:#e9dfc8;margin-top:4px;min-height:0}
.sl-bulbs{position:absolute;left:8px;right:8px;height:8px;display:flex;justify-content:space-between;pointer-events:none}.sl-bulbs.t{top:4px}.sl-bulbs.b{bottom:4px}
.sl-bulbs i{width:6px;height:6px;border-radius:50%;background:#fff6c8;box-shadow:0 0 6px #ffd34a;animation:sl-chase 1.2s steps(1) infinite;opacity:.25}
.sl-bulbs i:nth-child(3n+1){animation-delay:-.4s}.sl-bulbs i:nth-child(3n+2){animation-delay:-.8s}
.sl-screen.winning .sl-bulbs i{animation-duration:.36s}
@keyframes sl-chase{0%{opacity:1}33%{opacity:.25}}
.sl-glass{flex:none;display:none;padding:6px 10px;border-radius:10px;background:linear-gradient(color-mix(in srgb,var(--glass) 80%,#000),#000);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
.sl-glass table{width:100%;border-collapse:collapse;font-size:12px}.sl-glass td{padding:1px 6px;text-align:right;color:#e9dfc8;font-variant-numeric:tabular-nums}
.sl-glass td:first-child{text-align:left;white-space:nowrap}.sl-glass td img{width:22px;height:22px;vertical-align:middle;margin-right:1px}
.sl-glass td.on{color:var(--acc);font-weight:700;background:rgba(255,255,255,.07)}.sl-glass th{font-size:10px;color:#9c927d;text-align:right;padding:0 6px;font-weight:600}.sl-glass th.on{color:var(--acc)}
.sl-glass .sl-two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
@media (min-height:720px) and (min-width:640px){.sl-has-glass .sl-glass{display:block}}
.sl-reelwrap{position:relative;flex:1 1 0;min-height:0}
.sl-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px;border-radius:14px;background:linear-gradient(#f2f2f2,#8a8a8a 45%,#d9d9d9 55%,#6a6a6a);
  box-shadow:0 0 0 2px #111,0 0 0 4px var(--acc),0 0 26px color-mix(in srgb,var(--acc) 45%,transparent),0 10px 20px rgba(0,0,0,.6)}
.sl-wood .sl-frame{background:linear-gradient(#f1d79a,#9a7434 45%,#e2c27c 55%,#6a4c1c);box-shadow:0 0 0 2px #1e1005,0 10px 22px rgba(0,0,0,.7)}
.sl-neon .sl-frame{background:linear-gradient(#ff8ae8,#7a1fb0 50%,#ff8ae8)}
.sl-video .sl-frame{background:linear-gradient(#fff2b0,#b07a12 40%,#f3d36b 60%,#8a5a00)}
.sl-cv{display:block;border-radius:6px;background:#0a0a0a;touch-action:manipulation;cursor:pointer}
.sl-one .sl-frame::before,.sl-one .sl-frame::after{content:"";position:absolute;top:50%;width:0;height:0;border:9px solid transparent;transform:translateY(-50%)}
.sl-one .sl-frame::before{left:-6px;border-left-color:#e3102c;filter:drop-shadow(0 0 3px #f00)}.sl-one .sl-frame::after{right:-6px;border-right-color:#e3102c;filter:drop-shadow(0 0 3px #f00)}
.sl-ovl{position:absolute;inset:8px;display:grid;place-items:center;pointer-events:none;border-radius:6px;overflow:hidden}
.sl-ovl .sl-card{padding:14px 22px;border-radius:14px;background:rgba(0,0,0,.78);border:2px solid var(--acc);text-align:center;box-shadow:0 0 30px color-mix(in srgb,var(--acc) 60%,transparent);animation:sl-pop .35s cubic-bezier(.3,1.6,.5,1)}
.sl-ovl .sl-card b{display:block;font:400 clamp(20px,4vw,38px)/1.1 "Bungee",Impact,sans-serif;color:var(--acc);text-shadow:0 0 14px color-mix(in srgb,var(--acc) 70%,transparent)}
.sl-ovl .sl-card span{font-size:clamp(12px,1.8vw,16px);color:#fff}
@keyframes sl-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.sl-meters{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sl-led{background:linear-gradient(#000,#120a0a);border:2px solid #2a2a2a;border-radius:8px;padding:4px 6px 5px;text-align:center;box-shadow:inset 0 0 10px #000;min-width:0}
.sl-led span{display:block;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#9c927d}
.sl-led b{display:block;font:400 clamp(11px,2vw,17px)/1.3 "Press Start 2P",monospace;color:#ff4130;text-shadow:0 0 8px rgba(255,40,20,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.sl-led.win b{color:#4dff6a;text-shadow:0 0 8px rgba(40,255,80,.8)}
.sl-msg{flex:none;min-height:1.5em;text-align:center;font-weight:600;font-size:clamp(13px,1.8vw,16px);color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl-msg.win{color:#9dffb0}.sl-msg.lose{color:#ffb0a8}.sl-msg.gold{color:var(--acc)}
.sl-deck{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;padding:8px;border-radius:12px;background:linear-gradient(#1a1a1a,#050505);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 3px 0 rgba(0,0,0,.6)}
.sl-wood .sl-deck{background:linear-gradient(#2a1a0c,#120a04);box-shadow:inset 0 0 0 1px #8a6a34}
.sl-grp{display:flex;align-items:center;gap:6px}.sl-grp>span{font-size:10px;letter-spacing:.12em;color:#9c927d;font-weight:700}
.sl-btn{font:700 14px "Chakra Petch",system-ui,sans-serif;color:#fff;background:linear-gradient(#444,#161616);border:1px solid rgba(255,255,255,.25);border-radius:10px;min-height:44px;min-width:44px;padding:0 12px;cursor:pointer;box-shadow:0 3px 0 #000;letter-spacing:.03em}
.sl-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #000}.sl-btn:disabled{opacity:.4;cursor:not-allowed}
.sl-seg{display:flex;border-radius:10px;overflow:hidden;box-shadow:0 3px 0 #000}.sl-seg .sl-btn{border-radius:0;box-shadow:none;min-width:46px;padding:0 8px}
.sl-seg .sl-btn.on{background:linear-gradient(color-mix(in srgb,var(--acc) 85%,#fff),color-mix(in srgb,var(--acc) 70%,#000));color:#160c00;border-color:var(--acc)}
.sl-units{min-width:34px;text-align:center;font:400 14px "Press Start 2P",monospace;color:var(--acc)}
.sl-btn.sl-auto.on{background:linear-gradient(#2a8a3a,#0a3a14);border-color:#7dff9a}
.sl-spin{min-width:128px;min-height:56px;border-radius:30px;font:400 20px "Bungee",Impact,sans-serif;color:#1a0c00;border:2px solid color-mix(in srgb,var(--acc) 60%,#fff);
  background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.75),transparent 45%),linear-gradient(color-mix(in srgb,var(--acc) 90%,#fff),color-mix(in srgb,var(--acc) 60%,#000));
  box-shadow:0 4px 0 #000,0 0 18px color-mix(in srgb,var(--acc) 55%,transparent)}
.sl-spin.stop{background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.6),transparent 45%),linear-gradient(#ff6a5a,#8a0a10);color:#fff;border-color:#ffb0a8}
.sl-spin kbd{display:block;font:7px "Press Start 2P",monospace;opacity:.6;margin-top:-2px}
.sl-lever{position:relative;flex:none;width:60px;align-self:center;height:min(360px,58%);margin-left:-4px;cursor:grab;touch-action:none}
.sl-lev-mount{position:absolute;left:0;top:calc(62% - 38px);width:34px;height:76px;border-radius:0 14px 14px 0;background:linear-gradient(90deg,#555,#eee 40%,#999 70%,#444);box-shadow:0 4px 10px rgba(0,0,0,.6)}
.sl-wood .sl-lev-mount{background:linear-gradient(90deg,#5a3c12,#f1d79a 40%,#9a7434 70%,#3a2408)}
.sl-lev-rod{position:absolute;left:24px;width:10px;border-radius:5px;background:linear-gradient(90deg,#666,#fff 45%,#888)}
.sl-lev-ball{position:absolute;left:14px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 8%,var(--knob,#e3102c) 30%,color-mix(in srgb,var(--knob,#e3102c) 40%,#000) 100%);box-shadow:0 4px 8px rgba(0,0,0,.6)}
.sl-wood .sl-lev-ball{--knob:#2a1606}.sl-neon .sl-lev-ball{--knob:#ff4fd8}.sl-video .sl-lev-ball{--knob:#f2c14e}
@media (max-width:720px){.sl-lever{display:none}}
.sl-pt{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:12px}
.sl-pt[hidden]{display:none}
.sl-pt-in{position:relative;width:min(760px,100%);max-height:100%;overflow:auto;background:linear-gradient(#1b1610,#0e0b07);border:1px solid var(--acc);border-radius:14px;padding:16px 18px;line-height:1.45}
.sl-pt-x{position:sticky;top:0;float:right;z-index:2;background:#000}
.sl-pt h3{font:400 22px "Bungee",Impact,sans-serif;color:var(--acc);margin:.1em 0 .4em}.sl-pt h4{color:var(--acc);margin:1em 0 .3em;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.sl-pt table{border-collapse:collapse;width:100%;font-size:14px}.sl-pt td,.sl-pt th{border-bottom:1px solid rgba(255,255,255,.1);padding:4px 6px;text-align:right;font-variant-numeric:tabular-nums}
.sl-pt td:first-child,.sl-pt th:first-child{text-align:left}.sl-pt th{color:var(--acc);font-size:12px}
.sl-pt img{width:40px;height:40px;vertical-align:middle;margin-right:2px;background:rgba(255,255,255,.06);border-radius:6px}
.sl-pt .sl-paygrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.sl-pt .sl-pg{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border-radius:8px;padding:6px}.sl-pt .sl-pg img{width:52px;height:52px}
.sl-pt .sl-pg div{font-size:12px;line-height:1.35}.sl-pt .sl-pg b{color:var(--acc)}
.sl-pt .sl-linegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px}.sl-pt .sl-linegrid figure{margin:0;text-align:center;font-size:11px;color:#bfb6a6}.sl-pt .sl-linegrid canvas{width:66px;height:40px;display:block;margin:0 auto 2px}
.sl-jps{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:6px}.sl-jps div{font:600 10px "Chakra Petch",sans-serif;letter-spacing:.08em;padding:2px 8px;border-radius:6px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2)}
.sl-jps b{font:400 10px "Press Start 2P",monospace;margin-left:4px}.sl-jps .g{color:#ffd34a}.sl-jps .mj{color:#ff6a5a}.sl-jps .mn{color:#7ad0ff}.sl-jps .mi{color:#9dffb0}
.sl-prog{display:grid;justify-items:center;gap:2px;margin-top:4px}.sl-prog span{font:600 10px "Chakra Petch",sans-serif;letter-spacing:.24em;color:#ff9cf0}
.sl-prog b{font:400 clamp(18px,3.6vw,30px)/1.1 "Press Start 2P",monospace;color:#ffe24a;text-shadow:0 0 10px #ff9a00,0 0 22px #ff4fd8;padding:6px 12px;background:#000;border-radius:8px;border:1px solid #ff4fd8;font-variant-numeric:tabular-nums}
.sl-fx{position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden}
.sl-coin{position:absolute;top:-40px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c0,#f7c948 40%,#a0680a 100%);box-shadow:inset 0 0 0 3px #c98a12,0 2px 4px rgba(0,0,0,.5);animation:sl-fall linear forwards}
@keyframes sl-fall{0%{transform:translateY(0) rotateY(0)}100%{transform:translateY(110vh) rotateY(1080deg)}}
@media (max-width:560px){.sl-ttl small{display:none}.sl-stage{padding:6px 6px 8px}.sl-cab{padding:8px;gap:6px;border-radius:18px 18px 12px 12px}.sl-marq{min-height:46px;padding:8px}.sl-marq-x{font-size:11px}
  .sl-spin{min-width:104px;font-size:18px;min-height:52px}.sl-deck{gap:6px;padding:6px}.sl-btn{padding:0 9px;font-size:13px}.sl-seg .sl-btn{min-width:42px}.sl-spin kbd{display:none}}
@media (max-width:560px) and (min-height:700px){.sl-marq{min-height:96px;padding:16px 10px}.sl-logo{font-size:34px}.sl-meters{gap:6px}.sl-led b{font-size:13px}.sl-deck{padding:10px 6px}.sl-btn{min-height:48px}.sl-spin{min-height:58px;min-width:120px}}
.sl-tank{position:absolute;inset:0;z-index:28;background:#03202e;animation:sl-tankin .5s ease-out}
@keyframes sl-tankin{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
.sl-tank-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer;touch-action:manipulation}
.sl-tank-hud{position:absolute;left:50%;top:max(10px,env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(720px,calc(100% - 24px));display:grid;justify-items:center;gap:6px;padding:8px 12px;border-radius:14px;background:rgba(2,30,46,.62);border:1px solid rgba(255,176,48,.6);box-shadow:0 0 20px rgba(0,0,0,.4);pointer-events:none}
.sl-tank-hud b{font:400 clamp(18px,3.4vw,28px) "Bungee",Impact,sans-serif;color:#ffb030;text-shadow:0 2px 0 #000,0 0 12px rgba(255,176,48,.6)}
.sl-tank-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.sl-tank-stats span{display:grid;justify-items:center;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.1em;color:#a8e0f0;text-align:center}
.sl-tank-stats i{font:400 clamp(11px,2vw,16px) "Press Start 2P",monospace;font-style:normal;color:#fff;margin-top:4px}
.sl-tank-tip{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:8px 16px;border-radius:20px;background:rgba(0,0,0,.55);color:#fff;font-weight:600;font-size:clamp(13px,1.8vw,16px);pointer-events:none;white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:reduce){.sl-tank{animation:none}.sl-bulbs i{animation:none;opacity:.8}.sl-coin{display:none}}
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
function thumb(cfg, sym, px = 64) { return renderSymbol(cfg, sym, px, px, 1).toDataURL(); }

const LINE_COLORS = ['#ff3b3b', '#ffd23b', '#3bff6a', '#3bc8ff', '#ff3bd8', '#ff8a3b', '#a03bff', '#3bffd8', '#d8ff3b', '#ff3b8a', '#3b6aff', '#ffb03b', '#6aff3b', '#ff6a6a', '#3bffb0', '#b03bff', '#fff23b', '#3b9cff', '#ff3bb0', '#9cff3b'];
const fmtShort = d => d >= 100000 ? '$' + Math.round(d / 1000) + 'K' : d >= 10000 ? '$' + (d / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : K.fmt(d);
const easeOutBack = t => { const c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function loadMeter() { try { const v = parseFloat(localStorage.getItem(PROG_KEY)); return isFinite(v) && v >= PROG_SEED ? v : PROG_SEED; } catch (e) { return PROG_SEED; } }
function saveMeter(v) { try { localStorage.setItem(PROG_KEY, v.toFixed(2)); } catch (e) { /* storage unavailable */ } }

// =====================================================================================================
// The machine screen
// =====================================================================================================
function mountMachine(cfg, root, api) {
  injectSl();
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const sleep = ms => new Promise(r => later(r, ms));
  const R = K.rand;
  const isVideo = cfg.reels === 5;
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = `sl-screen sl-${cfg.style}${cfg.lines.length === 1 ? ' sl-one' : ''}${cfg.reels === 3 ? ' sl-has-glass' : ''}`;
  el.style.setProperty('--cab', cfg.theme.cabinet); el.style.setProperty('--acc', cfg.theme.accent); el.style.setProperty('--glass', cfg.theme.glass);
  const bulbs = n => `<i></i>`.repeat(n);
  const extra = cfg.progressive ? `<div class="sl-prog"><span>PROGRESSIVE JACKPOT</span><b class="sl-pm">$0</b></div>`
    : cfg.bonus ? `<div class="sl-jps"><div class="g">GRAND<b data-j="GRAND"></b></div><div class="mj">MAJOR<b data-j="MAJOR"></b></div><div class="mn">MINOR<b data-j="MINOR"></b></div><div class="mi">MINI<b data-j="MINI"></b></div></div>`
      : `<div class="sl-marq-x"></div>`;
  el.innerHTML = `
  <header class="sl-top">
    <button type="button" class="sl-ib sl-leave">&#8249; Floor</button>
    <div class="sl-ttl"><b></b><small></small></div>
    <button type="button" class="sl-ib sl-pt-b">Paytable</button>
  </header>
  <main class="sl-stage">
    <div class="sl-cab">
      <div class="sl-marq"><div class="sl-bulbs t">${bulbs(22)}</div><div class="sl-logo"></div>${extra}<div class="sl-bulbs b">${bulbs(22)}</div></div>
      <div class="sl-glass"></div>
      <div class="sl-reelwrap"><div class="sl-frame"><canvas class="sl-cv" aria-label="Reels" role="img"></canvas><div class="sl-ovl"></div></div></div>
      <div class="sl-meters"><div class="sl-led"><span>CREDITS</span><b class="m-cred"></b></div><div class="sl-led"><span>BET</span><b class="m-bet"></b></div><div class="sl-led win"><span>WIN</span><b class="m-win">$0</b></div></div>
      <div class="sl-msg" aria-live="polite"></div>
      <div class="sl-deck">
        <div class="sl-grp"><span>COIN</span><div class="sl-seg">${[1, 5, 25].map(v => `<button type="button" class="sl-btn" data-coin="${v}">$${v}</button>`).join('')}</div></div>
        <div class="sl-grp"><span>${cfg.unitName}</span><button type="button" class="sl-btn sl-dn" aria-label="Fewer">&minus;</button><b class="sl-units"></b><button type="button" class="sl-btn sl-up" aria-label="More">+</button></div>
        <button type="button" class="sl-btn sl-max">MAX BET</button>
        <button type="button" class="sl-btn sl-auto">AUTO</button>
        <button type="button" class="sl-btn sl-spin">${cfg.style === 'wood' ? 'PULL' : 'SPIN'}<kbd>SPACE</kbd></button>
      </div>
    </div>
    <div class="sl-lever" title="Pull the lever"><div class="sl-lev-mount"></div><div class="sl-lev-rod"></div><div class="sl-lev-ball"></div></div>
  </main>
  <div class="sl-pt" hidden><div class="sl-pt-in"><button type="button" class="sl-ib sl-pt-x">Close</button><div class="sl-pt-body"></div></div></div>
  <div class="sl-fx"></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  $('.sl-ttl b').textContent = cfg.title; $('.sl-ttl small').textContent = cfg.blurb; $('.sl-logo').textContent = cfg.title;
  const cv = $('.sl-cv'), ctx = cv.getContext('2d'), wrap = $('.sl-reelwrap'), ovl = $('.sl-ovl');
  const mCred = $('.m-cred'), mBet = $('.m-bet'), mWin = $('.m-win'), msgEl = $('.sl-msg');
  const spinBtn = $('.sl-spin'), autoBtn = $('.sl-auto'), maxBtn = $('.sl-max'), upBtn = $('.sl-up'), dnBtn = $('.sl-dn');
  const coinBtns = [...el.querySelectorAll('[data-coin]')];

  // ------------------------------------------------------------------ state
  let coin = 1, units = cfg.defUnits, busy = false, auto = 0, mode = 'base';
  let fsLeft = 0, fsTotal = 0, fsWon = 0, fsUnits = 0, fsCoin = 0, fsMultCur = cfg.fsMult || 1, tank = null, interacted = false;
  const reels = cfg.reelDefs.map((d, i) => { const L = d.strip.length, top = topOf(cfg, i, R(L)); return { L, pos: top, state: 'idle', v: 0, t0: 0, from: 0, to: 0, dur: 0, stopAt: 0, target: null, speed: 0, p0: 0, antic: false }; });
  let valGrid = null; // pearl values on the visible grid
  let hl = null; // highlight state { wins, t0 }
  let hold = null; // hold & spin state
  let meter = cfg.progressive ? loadMeter() : 0, meterShown = meter;
  let win = { from: 0, to: 0, t0: 0, dur: 0, shown: 0, lastTick: 0 };
  let lever = { a: 0, anim: null, drag: null };
  let dirty = true;

  const totalBet = () => coin * units;
  const steps = cfg.unitSteps || Array.from({ length: cfg.maxUnits }, (_, i) => i + 1);
  function msg(t, kind = '') { msgEl.textContent = t; msgEl.className = 'sl-msg ' + kind; }
  function syncControls() {
    coinBtns.forEach(b => { const on = +b.dataset.coin === coin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.disabled = busy || mode !== 'base'; });
    $('.sl-units').textContent = units;
    upBtn.disabled = dnBtn.disabled = maxBtn.disabled = busy || mode !== 'base';
    const spinning = reels.some(r => r.state !== 'idle');
    spinBtn.disabled = mode !== 'base' || (busy && !spinning);
    spinBtn.classList.toggle('stop', spinning && mode === 'base');
    spinBtn.firstChild.textContent = spinning && mode === 'base' ? 'STOP' : cfg.style === 'wood' ? 'PULL' : 'SPIN';
    autoBtn.classList.toggle('on', auto > 0); autoBtn.textContent = auto > 0 ? `STOP ${auto > 999 ? '' : auto}` : 'AUTO';
    autoBtn.disabled = mode !== 'base';
    mBet.textContent = K.fmt(mode === 'free' ? 0 : totalBet());
    updateGlass(); updateJps();
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
      paper: [[0, '#4a3a22'], [.18, '#d9c69a'], [.5, '#f3e6c4'], [.82, '#d9c69a'], [1, '#4a3a22']],
      lapis: [[0, '#050a1c'], [.5, '#16285e'], [1, '#050a1c']],
      crimson: [[0, '#1a0204'], [.5, '#4a0a10'], [1, '#1a0204']],
      aqua: [[0, '#021820'], [.5, '#0b4a63'], [1, '#021820']],
      night: [[0, '#05000c'], [.5, '#22104a'], [1, '#05000c']]
    }[cfg.reelBg];
    bgGrad = lin(ctx, 0, 0, 0, G.H, BG);
    shadeGrad = lin(ctx, 0, 0, 0, G.H, [[0, 'rgba(0,0,0,.55)'], [.2, 'rgba(0,0,0,0)'], [.45, 'rgba(255,255,255,.06)'], [.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]);
    dirty = true; buildGlass();
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) { buildSprites(); } });

  // ------------------------------------------------------------------ glass paytable (3-reel machines)
  function buildGlass() {
    const g = $('.sl-glass'); if (cfg.reels !== 3) return;
    const th = {}; const img = s => (th[s] = th[s] || thumb(cfg, s, 44));
    const symsHtml = rule => rule.k === 'count' ? Array.from({ length: rule.n }, () => `<img src="${img(rule.s)}" alt="">`).join('') + `<small> any</small>`
      : rule.s.map(x => x === '*' ? '' : x[0] === '@' ? `<img src="${img('bar1')}" alt="">` : `<img src="${img(x)}" alt="">`).join('') + (rule.s.includes('*') ? '<small> any</small>' : '');
    const rows = cfg.rules.map(rule => {
      if (cfg.betMode === 'coins') return `<tr><td>${symsHtml(rule)}</td>${[1, 2, 3].map(n => `<td data-u="${n}">${payOf(rule, n).toLocaleString()}</td>`).join('')}</tr>`;
      return `<tr><td>${symsHtml(rule)}</td><td>${rule.jackpot ? 'JACKPOT*' : rule.pay.toLocaleString()}</td></tr>`;
    });
    const head = cfg.betMode === 'coins' ? `<tr><th></th>${[1, 2, 3].map(n => `<th data-u="${n}">${n} COIN${n > 1 ? 'S' : ''}</th>`).join('')}</tr>` : `<tr><th></th><th>PER LINE</th></tr>`;
    const nc = cfg.betMode === 'coins' ? 2 : 3, per = Math.ceil(rows.length / nc);
    g.innerHTML = `<div class="sl-two" style="grid-template-columns:repeat(${nc},1fr)">${Array.from({ length: nc }, (_, k) => `<table>${head}${rows.slice(k * per, k * per + per).join('')}</table>`).join('')}</div>`;
    updateGlass();
  }
  function updateGlass() { if (cfg.betMode !== 'coins') return; el.querySelectorAll('.sl-glass [data-u]').forEach(td => td.classList.toggle('on', +td.dataset.u === units)); }
  function updateJps() { if (!cfg.bonus) return; const b = (mode === 'base' ? totalBet() : fsUnits * fsCoin) || totalBet(); el.querySelectorAll('.sl-jps [data-j]').forEach(x => { x.textContent = fmtShort(JP_MULT[x.dataset.j] * b); }); }

  // ------------------------------------------------------------------ paytable overlay
  const pt = $('.sl-pt');
  function openPaytable() {
    const th = s => thumb(cfg, s, 80);
    let h = `<h3>${cfg.title}</h3>${cfg.rulesHtml}`;
    if (cfg.reels === 3) {
      const cols = cfg.betMode === 'coins' ? [1, 2, 3] : [1];
      h += `<h4>Pays (coins)</h4><table><tr><th>Combination</th>${cols.map(n => `<th>${cfg.betMode === 'coins' ? n + ' coin' + (n > 1 ? 's' : '') : 'per line'}</th>`).join('')}</tr>`;
      for (const rule of cfg.rules) {
        const icons = rule.k === 'count' ? Array.from({ length: rule.n }, () => `<img src="${th(rule.s)}" alt="${cfg.names[rule.s]}">`).join('')
          : rule.s.map(x => x === '*' ? '' : x[0] === '@' ? `<img src="${th('bar1')}" alt="bar">` : `<img src="${th(x)}" alt="${cfg.names[x]}">`).join('');
        h += `<tr><td>${icons}<br><small>${rule.name}</small></td>${cols.map(n => `<td>${rule.jackpot && cfg.progressive ? `${rule.pay.toLocaleString()}<br><small>center + 5 lines: JACKPOT</small>` : payOf(rule, cfg.betMode === 'coins' ? n : 1).toLocaleString()}</td>`).join('')}</tr>`;
      }
      h += `</table>`;
      if (cfg.wild) h += `<p><img src="${th(cfg.wild)}" alt=""> <b>${cfg.names[cfg.wild]}</b> is wild: one in a win pays ×2, two pay ×4.</p>`;
    } else {
      h += `<h4>Line pays (× bet per line)</h4><div class="sl-paygrid">`;
      if (cfg.wild) h += `<div class="sl-pg"><img src="${th(cfg.wild)}" alt=""><div><b>${cfg.names[cfg.wild]}</b><br>Substitutes · ${cfg.wildText || 'reels 2–5'}${cfg.pays[cfg.wild] ? '<br>' + Object.entries(cfg.pays[cfg.wild]).map(([n, v]) => `${n}× ${v}`).join('<br>') : ''}</div></div>`;
      for (const [s, p] of Object.entries(cfg.pays)) if (s !== cfg.wild) h += `<div class="sl-pg"><img src="${th(s)}" alt="${cfg.names[s]}"><div><b>${cfg.names[s]}</b><br>${[5, 4, 3, 2].filter(n => p[n]).map(n => `${n}× ${p[n]}`).join('<br>')}</div></div>`;
      if (cfg.scatter) h += `<div class="sl-pg"><img src="${th(cfg.scatter)}" alt=""><div><b>${cfg.names[cfg.scatter]}</b><br>${[5, 4, 3].filter(n => cfg.scatterPay[n]).map(n => `${n}× ${cfg.scatterPay[n]}× total`).join('<br>')}<br>${cfg.scatterText || '3+ = 10 free spins ×3'}</div></div>`;
      if (cfg.bonus) h += `<div class="sl-pg"><img src="${th(cfg.bonus)}" alt=""><div><b>Pearl</b><br>6+ anywhere<br>starts Hold &amp; Spin</div></div>`;
      h += `</div><h4>Paylines</h4><div class="sl-linegrid">${cfg.lines.map((_, i) => `<figure><canvas data-line="${i}" width="132" height="80"></canvas>Line ${i + 1}</figure>`).join('')}</div>`;
    }
    h += `<h4>Theoretical return</h4><p>${RTP[cfg.id]}. Every outcome is decided by a cryptographic RNG the moment you spin; the reel animation only reveals it.</p>
      <h4>Controls</h4><p>Space or SPIN to play (press again to stop the reels early). Choose the coin value and ${cfg.unitName.toLowerCase()}, or MAX BET to bet the maximum and spin. AUTO plays 25 games and stops on a big win or a feature.</p>`;
    $('.sl-pt-body').innerHTML = h;
    el.querySelectorAll('.sl-pt canvas[data-line]').forEach(c => {
      const g = c.getContext('2d'), L = cfg.lines[+c.dataset.line], cw = 132 / 5, chh = 80 / 3;
      g.fillStyle = '#000'; g.fillRect(0, 0, 132, 80);
      for (let i = 0; i < 5; i++) for (let r = 0; r < 3; r++) { g.fillStyle = L[i] === r ? LINE_COLORS[+c.dataset.line] : '#2a2a2a'; g.fillRect(i * cw + 2, r * chh + 2, cw - 4, chh - 4); }
    });
    pt.hidden = false; $('.sl-pt-x').focus();
  }
  $('.sl-pt-b').addEventListener('click', () => { K.sfx.button(); pt.hidden ? openPaytable() : (pt.hidden = true); });
  $('.sl-pt-x').addEventListener('click', () => { pt.hidden = true; });
  pt.addEventListener('click', e => { if (e.target === pt) pt.hidden = true; });
  $('.sl-leave').addEventListener('click', () => { K.sfx.button(); api.exit(); });

  // ------------------------------------------------------------------ bet controls
  coinBtns.forEach(b => b.addEventListener('click', () => { if (busy) return; coin = +b.dataset.coin; K.sfx.chip(); syncControls(); }));
  const stepUnits = d => { const i = steps.indexOf(units); units = steps[(i + d + steps.length) % steps.length]; K.sfx.chip(); syncControls(); if (cfg.lines.length > 1) showLinesPreview(); };
  upBtn.addEventListener('click', () => !busy && stepUnits(1));
  dnBtn.addEventListener('click', () => !busy && stepUnits(-1));
  maxBtn.addEventListener('click', () => { if (busy) return; units = cfg.maxUnits; K.sfx.chip(); syncControls(); spin(); });
  spinBtn.addEventListener('click', () => { K.sfx.button(); spin(); });
  autoBtn.addEventListener('click', () => { K.sfx.button(); if (auto > 0) { auto = 0; syncControls(); return; } auto = 25; syncControls(); if (!busy) spin(); });
  cv.addEventListener('click', () => { if (busy) quickStop(); });
  function showLinesPreview() { hl = { wins: cfg.lines.slice(0, units).map((L, i) => ({ line: i, cells: [], pay: 0, preview: true })), t0: performance.now(), preview: true }; dirty = true; later(() => { if (hl && hl.preview) { hl = null; dirty = true; } }, 1400); }

  const onKey = e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape' && !pt.hidden) { pt.hidden = true; return; }
    if (mode === 'pick') { if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat && pt.hidden) pickRandom(); } return; }
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (e.repeat || !pt.hidden) return; if (win.shown < win.to && !busy) { win.shown = win.to; win.dur = 0; return; } spin(); }
  };
  window.addEventListener('keydown', onKey);

  // ------------------------------------------------------------------ lever
  const levEl = $('.sl-lever'), rod = $('.sl-lev-rod'), ball = $('.sl-lev-ball');
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

  // ------------------------------------------------------------------ win meter roll-up
  function rollWin(to, from = 0) { const bet = Math.max(1, mode === 'free' ? fsUnits * fsCoin : totalBet()); win = { from, to, t0: performance.now(), dur: Math.min(4200, 350 + Math.sqrt((to - from) / bet) * 420), shown: from, lastTick: 0 }; }
  function updWin(now) {
    if (win.shown >= win.to) { return; }
    const t = win.dur ? Math.min(1, (now - win.t0) / win.dur) : 1;
    win.shown = t >= 1 ? win.to : win.from + (win.to - win.from) * (1 - Math.pow(1 - t, 2));
    mWin.textContent = K.fmt(Math.floor(win.shown));
    if (now - win.lastTick > 75 && t < 1) { win.lastTick = now; K.tone(1400 + 600 * t, .03, { type: 'square', vol: .035 }); }
    if (t >= 1) mWin.textContent = K.fmt(win.to);
  }
  const setWinMeter = v => { win = { from: v, to: v, t0: 0, dur: 0, shown: v, lastTick: 0 }; mWin.textContent = K.fmt(v); };

  // ------------------------------------------------------------------ progressive meter
  const pmEl = $('.sl-pm');
  if (cfg.progressive) {
    const tick = () => { meter = Math.max(meter, loadMeter()) + (1 + R(25)) / 100; saveMeter(meter); later(tick, 700 + R(900)); };
    later(tick, 800);
  }
  function updMeter() { if (!pmEl) return; meterShown += (meter - meterShown) * .12; if (Math.abs(meter - meterShown) < .01) meterShown = meter; pmEl.textContent = '$' + meterShown.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ------------------------------------------------------------------ reels animation
  const VMAX = isVideo ? 26 : 20;
  function startReels(targets, anticFrom = 99) {
    const now = performance.now();
    reels.forEach((r, i) => {
      r.state = 'windup'; r.t0 = now + i * 55; r.p0 = r.pos; r.v = 0; r.target = targets[i];
      r.stopAt = now + (isVideo ? 700 : 820) + i * (isVideo ? 230 : 380) + (i >= anticFrom ? (i - anticFrom + 1) * 900 : 0);
      r.antic = i >= anticFrom;
    });
    K.tone(160, .35, { type: 'sawtooth', vol: .03, slide: 260 });
    const p = new Promise(res => { reelsDone = res; }); syncControls(); return p;
  }
  let reelsDone = null, anticTone = 0;
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
        r.v = Math.min(r.antic && now > r.stopAt - 1200 ? VMAX * 1.35 : VMAX, r.v + 70 * dt); r.pos -= r.v * dt; r.speed = r.v;
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
    if (cfg.scatter && col.includes(cfg.scatter)) K.tone(1046, .18, { type: 'triangle', vol: .1 });
    if (cfg.bonus && col.includes(cfg.bonus)) K.tone(1318, .12, { type: 'sine', vol: .1 });
    if (cfg.progressive && col[1] === 'mega') K.tone(784, .25, { type: 'triangle', vol: .1 });
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
    if (r.state === 'idle' && valGrid && valGrid[i]) for (let k = 0; k < cfg.rows; k++) if (valGrid[i][k]) drawPearlVal(valGrid[i][k], x, k * ch);
    ctx.fillStyle = shadeGrad; ctx.fillRect(x, 0, cw, G.H);
    if (r.antic) { const a = .35 + .25 * Math.sin(now / 90); ctx.strokeStyle = `rgba(255,220,80,${a})`; ctx.lineWidth = 6; ctx.strokeRect(x + 3, 3, cw - 6, G.H - 6); }
    ctx.restore();
  }
  function drawPearlVal(v, x, y) {
    const { cw, ch } = G, s = Math.min(cw, ch), b = (mode === 'hold' && hold ? hold.bet : totalBet());
    const t = v.j || fmtShort(v.m * b);
    const fsz = Math.round(s * (v.j ? .18 : t.length > 4 ? .2 : .24));
    ctx.save(); ctx.font = `400 ${fsz}px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, fsz * .28); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.strokeText(t, x + cw / 2, y + ch / 2 + 1);
    ctx.fillStyle = v.j ? ({ MINI: '#2a9a4a', MINOR: '#1a5ad8', MAJOR: '#d81a2a' })[v.j] : '#b8001a'; ctx.fillText(t, x + cw / 2, y + ch / 2 + 1);
    ctx.restore();
  }
  function drawHighlights(now) {
    if (!hl) return;
    const { wins } = hl, cyc = wins.length > 1 && !hl.preview, all = (now - hl.t0) < 1600 || !cyc;
    const showing = all ? wins : [wins[Math.floor((now - hl.t0 - 1600) / 1300) % wins.length]];
    const pulse = .6 + .4 * Math.sin(now / 130);
    if (!all || hl.dim) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; const on = new Set(); showing.forEach(w => w.cells.forEach(([i, r]) => on.add(i + ',' + r)));
      for (let i = 0; i < cfg.reels; i++) for (let r = 0; r < cfg.rows; r++) if (!on.has(i + ',' + r)) ctx.fillRect(cellX(i), cellY(r), G.cw, G.ch);
      ctx.restore();
    }
    for (const w of showing) {
      const col = w.line >= 0 ? (cfg.lines.length === 1 ? '#ffe24a' : LINE_COLORS[w.line]) : '#ffe24a';
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (w.line >= 0) {
        const L = cfg.lines[w.line]; ctx.globalAlpha = w.preview ? .95 : .9; ctx.lineWidth = Math.max(3, G.ch * .045);
        ctx.beginPath(); L.forEach((r, i) => { const px = cellX(i) + G.cw / 2, py = cellY(r) + G.ch / 2; if (i === 0) ctx.moveTo(px - G.cw / 2, py); ctx.lineTo(px, py); if (i === L.length - 1) ctx.lineTo(px + G.cw / 2, py); }); ctx.stroke();
      }
      ctx.globalAlpha = pulse; ctx.lineWidth = Math.max(3, G.ch * .05);
      for (const [i, r] of w.cells) { ctx.beginPath(); rr(ctx, cellX(i) + 3, cellY(r) + 3, G.cw - 6, G.ch - 6, 8); ctx.stroke(); }
      ctx.restore();
      if (!all && w.pay > 0) {
        const [i, r] = w.cells[w.cells.length - 1]; const label = K.fmt(w.pay * (hl.coin || coin));
        const fs = Math.max(12, Math.round(Math.min(G.cw, G.ch) * .18));
        ctx.save(); ctx.font = `400 ${fs}px ${FD}`; const tw = ctx.measureText(label).width + fs;
        const px = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, cellX(i) + G.cw / 2)), py = cellY(r) + G.ch - fs * .9;
        ctx.fillStyle = 'rgba(0,0,0,.8)'; rr(ctx, px - tw / 2, py - fs * .75, tw, fs * 1.5, fs * .5); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, px, py + 1); ctx.restore();
      }
    }
    if (!all) { const w = showing[0]; if (w && w.label && hl.lastShown !== w) { hl.lastShown = w; msg(`${w.line >= 0 && cfg.lines.length > 1 ? `Line ${w.line + 1}: ` : ''}${w.label} — ${K.fmt(w.pay * (hl.coin || coin))}`, 'win'); } }
  }
  function drawHold(now) {
    const { cw, ch } = G;
    ctx.fillStyle = '#0a0204'; ctx.fillRect(0, 0, G.W, G.H);
    for (let i = 0; i < 5; i++) for (let r = 0; r < 3; r++) {
      const idx = i * 3 + r, x = cellX(i), y = cellY(r), v = hold.cells[idx];
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
      ctx.fillStyle = lin(ctx, 0, y, 0, y + ch, [[0, '#2a0508'], [.5, '#5a0a12'], [1, '#2a0508']]); ctx.fillRect(x, y, cw, ch);
      if (v) {
        const pop = hold.pop[idx] ? Math.max(0, 1 - (now - hold.pop[idx]) / 350) : 0, sc = 1 + pop * .3;
        ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(sc, sc); ctx.drawImage(sprites.pearl, -cw / 2, -ch / 2, cw, ch); ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        drawPearlVal(v, x, y);
        if (hold.flash === idx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.shadowColor = '#ffe24a'; ctx.shadowBlur = 16; ctx.strokeRect(x + 3, y + 3, cw - 6, ch - 6); }
      } else if (hold.spinning.has(idx)) {
        const off = ((now / 1000 * 9 + idx * .37) % 2) - 1;
        ctx.globalAlpha = .7; ctx.drawImage(blurs.pearl, x, y + off * ch * 1.4, cw, ch); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(247,197,72,.55)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
      ctx.restore();
    }
  }
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const moving = updReels(now, dt); updLever(now); updWin(now); updMeter();
    if (tank) drawTank(now);
    if (!(moving || hl || dirty || mode === 'hold' || reels.some(r => r.antic))) return;
    dirty = false;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, G.W, G.H);
    if (mode === 'hold' && hold) drawHold(now);
    else {
      for (let i = 0; i < cfg.reels; i++) drawReel(i, now);
      if (cfg.lines.length === 1 && !hl) { ctx.save(); ctx.strokeStyle = 'rgba(227,16,44,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, G.H / 2); ctx.lineTo(G.W, G.H / 2); ctx.stroke(); ctx.restore(); }
      drawHighlights(now);
    }
  }

  // ------------------------------------------------------------------ effects
  function card(title, sub, ms = 1800) { ovl.innerHTML = `<div class="sl-card"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; if (ms) later(() => { ovl.innerHTML = ''; }, ms); }
  function coinShower(n = 28) {
    const fx = $('.sl-fx');
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'sl-coin'; c.style.left = (Math.random() * 100) + '%'; c.style.animationDuration = (1.4 + Math.random() * 1.4) + 's'; c.style.animationDelay = (Math.random() * .8) + 's'; const s = 20 + Math.random() * 18; c.style.width = c.style.height = s + 'px'; fx.appendChild(c); later(() => c.remove(), 3400); }
  }
  function celebrate(amount, bet) {
    const x = amount / Math.max(1, bet);
    el.classList.add('winning'); later(() => el.classList.remove('winning'), 2600);
    if (x >= 50) { K.banner(el, 'MEGA WIN!'); K.sfx.bigWin(); coinShower(44); }
    else if (x >= 15) { K.banner(el, 'BIG WIN!'); K.sfx.bigWin(); coinShower(26); }
    else K.sfx.win();
  }

  // ------------------------------------------------------------------ play
  function anticFor(grid) {
    // reel index from which to build suspense, if any
    if (cfg.scatter) { let n = 0; for (let i = 0; i < cfg.reels - 1; i++) { if (grid[i].includes(cfg.scatter)) n++; if (n >= 2) return i + 1; } }
    if (cfg.bonus) { let n = 0; for (let i = 0; i < 3; i++) n += grid[i].filter(s => s === cfg.bonus).length; if (n >= 4) return 3; }
    if (cfg.progressive && grid[0][1] === 'mega' && grid[1][1] === 'mega') return 2;
    if (cfg.reels === 3 && cfg.lines.length === 1 && grid[0][1] === grid[1][1] && /seven|dd|bell/.test(grid[0][1])) return 2;
    return 99;
  }
  async function spinOnce({ free = false } = {}) {
    const u = free ? fsUnits : units, cv$ = free ? fsCoin : coin, bet = u * cv$;
    hl = null; valGrid = null; dirty = true;
    const stops = spinStops(cfg, R), grid = gridOf(cfg, stops);
    curGrid = grid;
    if (cfg.bonus) valGrid = grid.map(col => col.map(s => s === cfg.bonus ? pearlValue(R) : null));
    const res = evaluate(cfg, grid, u, free ? fsMultCur : 1);
    syncControls();
    await startReels(stops.map((s, i) => topOf(cfg, i, s)), anticFor(grid));
    if (!alive) return null;
    dirty = true;
    let paid = res.coins * cv$;
    if (res.jackpot) { const jp = Math.round(meter); paid += jp; res.jpAmount = jp; meter = PROG_SEED; meterShown = PROG_SEED; saveMeter(meter); }
    if (paid > 0) api.win(paid);
    if (res.wins.length) hl = { wins: res.wins, t0: performance.now(), coin: cv$ };
    res.paid = paid; res.bet = bet;
    return res;
  }
  async function spin() {
    if (!alive || mode !== 'base') return;
    if (busy) { quickStop(); return; }
    if (!pt.hidden) pt.hidden = true;
    const bet = totalBet();
    if (!api.bet(bet)) { msg(`Not enough chips for a ${K.fmt(bet)} bet — lower the coin or ${cfg.unitName.toLowerCase()}.`, 'lose'); K.sfx.lose(); auto = 0; syncControls(); return; }
    busy = true; interacted = true; ovl.innerHTML = ''; setWinMeter(0);
    if (lever.a === 0 && !lever.anim) pullLever(0);
    if (cfg.progressive) meter += bet * PROG_RATE;
    msg('Good luck!', '');
    const res = await spinOnce();
    if (!res) return;
    let total = res.paid;
    if (res.jackpot) {
      card('JACKPOT!', `MEGA VALLEY PROGRESSIVE ${K.fmt(res.jpAmount)}`, 5000); K.banner(el, 'JACKPOT!'); K.sfx.bigWin(); coinShower(80);
      api.toast && api.toast(`MEGA VALLEY JACKPOT ${K.fmt(res.jpAmount)}!`);
    }
    if (total > 0) { rollWin(total); if (!res.jackpot) celebrate(total, bet); msg(winText(res, coin), 'win'); }
    else msg(cfg.lines.length > 1 ? 'No win — try again.' : 'No win.', '');
    if (total > 0) await sleep(Math.min(2600, win.dur + 200));
    if (res.fs) total += await runFreeSpins(res.fs);
    if (res.hold) total += await runHold(res.hold);
    if (res.pick) total += await runPickBonus();
    if (!alive) return;
    busy = false; syncControls();
    if (auto > 0) {
      auto--; syncControls();
      if (total >= bet * 100 || res.fs || res.hold || res.pick || res.jackpot) { auto = 0; syncControls(); msg('Auto play stopped on a big win.', 'gold'); }
      else if (auto > 0) later(() => { if (!busy && auto > 0) spin(); }, total > 0 ? 900 : 380);
    }
  }
  function winText(res, cvv) {
    if (res.jackpot) return `JACKPOT! ${K.fmt(res.paid)}`;
    if (res.wins.length === 1) { const w = res.wins[0]; return `${w.label} pays ${K.fmt(w.pay * cvv)}`; }
    return `${res.wins.length} wins pay ${K.fmt(res.paid)}`;
  }

  async function runFreeSpins(n, mult = cfg.fsMult) {
    mode = 'free'; fsLeft = n; fsTotal = n; fsWon = 0; fsUnits = units; fsCoin = coin; fsMultCur = mult; syncControls();
    K.sfx.bigWin(); card(`${n} FREE SPINS`, `All wins ×${mult}`, 2200); el.classList.add('winning');
    const mx = $('.sl-marq-x');
    await sleep(2300);
    while (fsLeft > 0 && alive) {
      fsLeft--; mx.textContent = `FREE SPIN ${fsTotal - fsLeft} of ${fsTotal} · WINS ×${mult} · WON ${K.fmt(fsWon)}`;
      msg(`Free spin ${fsTotal - fsLeft} of ${fsTotal}`, 'gold');
      const res = await spinOnce({ free: true }); if (!res) return fsWon;
      if (res.paid > 0) { rollWin(fsWon + res.paid, fsWon); fsWon += res.paid; msg(winText(res, fsCoin), 'win'); K.sfx.win(); }
      if (res.fs) { fsLeft += 10; fsTotal += 10; card('+10 FREE SPINS', 'Retriggered!', 1600); K.sfx.bigWin(); await sleep(1600); }
      if (res.pick) { fsLeft += 5; fsTotal += 5; card('+5 FREE SPINS', 'More fish food!', 1600); K.sfx.bigWin(); await sleep(1600); }
      mx.textContent = `FREE SPIN ${fsTotal - fsLeft} of ${fsTotal} · WINS ×${mult} · WON ${K.fmt(fsWon)}`;
      await sleep(res.paid > 0 ? Math.min(2200, win.dur + 500) : 650);
    }
    if (!alive) return fsWon;
    el.classList.remove('winning');
    card('FREE SPINS COMPLETE', `You won ${K.fmt(fsWon)}`, 2600); setWinMeter(fsWon);
    if (fsWon >= fsUnits * fsCoin * 15) { K.banner(el, 'BIG WIN!'); coinShower(30); }
    K.sfx.bigWin(); mx.textContent = ''; msg(`Free spins paid ${K.fmt(fsWon)}`, 'win');
    await sleep(2600);
    mode = 'base'; hl = null; dirty = true; syncControls();
    return fsWon;
  }

  // ------------------------------------------------------------------ Goldfish pick bonus (full-screen fish tank)
  const swimBox = T => ({ x0: T.size * .6, x1: T.W - T.size * .6, y0: T.H * .2 + T.size * .3, y1: T.H * .8 - T.size * .4 });
  function retarget(T, f) { const b = swimBox(T); f.tx = b.x0 + Math.random() * Math.max(1, b.x1 - b.x0); f.ty = b.y0 + Math.random() * Math.max(1, b.y1 - b.y0); }
  function sizeTank(T) {
    const w = T.cv.clientWidth || el.clientWidth, h = T.cv.clientHeight || el.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === T.W && h === T.H) return;
    if (T.W) for (const f of T.fish) { f.x *= w / T.W; f.y *= h / T.H; f.tx *= w / T.W; f.ty *= h / T.H; }
    T.W = w; T.H = h; T.dpr = dpr; T.cv.width = Math.round(w * dpr); T.cv.height = Math.round(h * dpr);
    T.size = Math.max(60, Math.min(140, Math.min(w, h) * .17));
    for (const f of T.fish) f.s = T.size * f.k;
  }
  function makeTank() {
    const t = document.createElement('div'); t.className = 'sl-tank';
    t.innerHTML = `<canvas class="sl-tank-cv" role="img" aria-label="Fish tank: pick a goldfish"></canvas>
      <div class="sl-tank-hud"><b>GOLDFISH BONUS</b><div class="sl-tank-stats"><span>PICKS LEFT<i data-k="p"></i></span><span>CREDITS<i data-k="c"></i></span><span>FREE SPINS<i data-k="s"></i></span><span>MULTIPLIER<i data-k="m"></i></span></div></div>
      <div class="sl-tank-tip">Tap a goldfish to feed it (or press Space)</div>`;
    el.appendChild(t);
    const cvT = t.querySelector('canvas');
    const T = { el: t, cv: cvT, ctx: cvT.getContext('2d'), W: 0, H: 0, dpr: 1, size: 80, fish: [], bubbles: [], plants: [], pebbles: [], picks: 0, cash: 0, spins: 0, mult: 1, over: false, lock: false, done: null, last: performance.now() };
    sizeTank(T);
    for (let i = 0; i < 10; i++) { const b = swimBox(T); const f = { x: b.x0 + Math.random() * Math.max(1, b.x1 - b.x0), y: b.y0 + Math.random() * Math.max(1, b.y1 - b.y0), dir: Math.random() < .5 ? -1 : 1, ph: Math.random() * 6, k: .85 + Math.random() * .3, sp: .7 + Math.random() * .5, picked: false, rev: null, revT: 0 }; f.s = T.size * f.k; retarget(T, f); T.fish.push(f); }
    for (let i = 0; i < 10; i++) T.plants.push({ x: (i + Math.random() * .8) / 10, h: .22 + Math.random() * .34, ph: Math.random() * 6, w: .8 + Math.random() * .6, col: ['#2f9a4a', '#3ab85a', '#1f7a3a', '#5ac86a'][i % 4] });
    for (let i = 0; i < 46; i++) T.pebbles.push({ x: Math.random(), y: Math.random(), r: .4 + Math.random() * .8, col: ['#c9b48a', '#a8906a', '#e0d0a8', '#8a7a6a', '#d8a878'][i % 5] });
    cvT.addEventListener('pointerdown', e => { const r = cvT.getBoundingClientRect(); pickAt(e.clientX - r.left, e.clientY - r.top); });
    return T;
  }
  function tankHud() {
    const T = tank, q = k => T.el.querySelector(`[data-k="${k}"]`);
    q('p').textContent = T.over ? 0 : PICK_MAX - T.picks; q('c').textContent = K.fmt(T.cash * T.coin); q('s').textContent = T.spins; q('m').textContent = '×' + T.mult;
  }
  function pickAt(x, y) {
    const T = tank; if (!T || T.over || T.lock) return;
    let best = null, bd = 1e9;
    for (const f of T.fish) { if (f.picked) continue; const d = Math.hypot(f.x - x, f.y - y); if (d < f.s * .65 && d < bd) { bd = d; best = f; } }
    if (best) doPick(best);
  }
  function pickRandom() { const T = tank; if (!T || T.over || T.lock) return; const free = T.fish.filter(f => !f.picked); if (free.length) doPick(free[Math.floor(Math.random() * free.length)]); }
  function doPick(f) {
    const T = tank; T.lock = true;
    const r = fishPick(R, T.picks === 0); T.picks++;
    f.picked = true; f.rev = r; f.revT = performance.now();
    if (r.t === 'cash') { T.cash += r.m * T.units; K.sfx.chips(4); K.tone(988, .15, { type: 'triangle', vol: .1 }); }
    else if (r.t === 'spins') { T.spins += r.n; [659, 784, 988, 1318].forEach((fq, i) => K.tone(fq, .12, { type: 'triangle', vol: .09, delay: i * .07 })); }
    else if (r.t === 'mult') { T.mult += r.n; [523, 784, 1046].forEach((fq, i) => K.tone(fq, .16, { type: 'square', vol: .05, delay: i * .08 })); }
    else { K.sfx.push(); K.tone(196, .3, { type: 'triangle', vol: .08, delay: .1 }); }
    tankHud();
    if (r.t === 'collect' || T.picks >= PICK_MAX) later(endPicks, 900); else later(() => { if (tank) tank.lock = false; }, 380);
  }
  function endPicks() {
    const T = tank; if (!T) return; T.over = true; tankHud();
    for (const f of T.fish) if (!f.picked) { f.rev = fishPick(R, false); f.ghost = true; f.revT = performance.now(); }
    T.el.querySelector('.sl-tank-tip').textContent = T.spins ? `Bonus over: ${K.fmt(T.cash * T.coin)} + ${T.spins} free spins at ×${T.mult}` : `Bonus over: you won ${K.fmt(T.cash * T.coin)}`;
    later(() => T.done && T.done(), 2800);
  }
  function revLabel(r, bet$) { return r.t === 'cash' ? [fmtShort(r.m * bet$), `${r.m}× BET`] : r.t === 'spins' ? [`+${r.n}`, 'FREE SPINS'] : r.t === 'mult' ? ['+1×', 'MULTIPLIER'] : ['COLLECT', '']; }
  function drawTank(now) {
    const T = tank; sizeTank(T);
    const dt = Math.min(.05, Math.max(0, (now - T.last) / 1000)); T.last = now;
    const c = T.ctx, W = T.W, H = T.H, t = now / 1000;
    c.setTransform(T.dpr, 0, 0, T.dpr, 0, 0);
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#46c6dc'], [.22, '#127a9c'], [.65, '#08425e'], [1, '#03202e']]); c.fillRect(0, 0, W, H);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const x = W * (i + .5) / 6 + Math.sin(t * .4 + i) * W * .04; c.beginPath(); c.moveTo(x - W * .03, 0); c.lineTo(x + W * .03, 0); c.lineTo(x + W * .12 + Math.sin(t * .3 + i * 2) * W * .03, H * .85); c.lineTo(x - W * .02, H * .85); c.closePath(); c.fillStyle = `rgba(180,240,255,${.035 + .02 * Math.sin(t * .7 + i)})`; c.fill(); }
    c.restore();
    const sy = H * .86;
    c.beginPath(); c.moveTo(0, H); c.lineTo(0, sy); for (let x = 0; x <= W + 1; x += W / 12) c.lineTo(x, sy + Math.sin(x / W * 9) * H * .012); c.lineTo(W, H); c.closePath();
    c.fillStyle = lin(c, 0, sy, 0, H, [[0, '#d8bc84'], [1, '#8a6a3a']]); c.fill();
    for (const p of T.pebbles) { c.beginPath(); c.ellipse(p.x * W, sy + H * .025 + p.y * (H - sy - H * .03), p.r * T.size * .08, p.r * T.size * .05, 0, 0, TAU); c.fillStyle = p.col; c.fill(); }
    c.lineCap = 'round';
    for (const p of T.plants) {
      const bx = p.x * W, by = sy + H * .02, h = p.h * H, sw = Math.sin(t * .8 + p.ph) * h * .12;
      c.strokeStyle = p.col; c.lineWidth = Math.max(4, T.size * .09 * p.w);
      c.beginPath(); c.moveTo(bx, by); c.bezierCurveTo(bx + sw * .3, by - h * .35, bx - sw * .5, by - h * .7, bx + sw, by - h); c.stroke();
      c.lineWidth *= .6; c.beginPath(); c.moveTo(bx + 2, by); c.bezierCurveTo(bx + 14 + sw * .6, by - h * .3, bx + 10 - sw * .3, by - h * .5, bx + 18 + sw * .8, by - h * .62); c.stroke();
    }
    c.save(); const cs = T.size * 1.1; c.translate(W * .8 - cs / 2, sy - cs * .62); c.scale(cs / 100, cs / 100); pChest(c); c.restore();
    if (Math.random() < dt * 9) T.bubbles.push({ x: Math.random() < .35 ? W * .8 : Math.random() * W, y: sy, r: 2 + Math.random() * 6, v: 30 + Math.random() * 50, ph: Math.random() * 6 });
    T.bubbles = T.bubbles.filter(b => b.y > -12);
    for (const b of T.bubbles) { b.y -= b.v * dt; bubble(c, b.x + Math.sin(t * 3 + b.ph) * 4, b.y, b.r); }
    for (const f of T.fish) {
      if (!f.picked && !T.over) { const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy); if (d < 8) retarget(T, f); else { const v = T.size * .7 * f.sp; f.x += dx / d * v * dt; f.y += dy / d * v * dt * .6; if (Math.abs(dx) > 4) f.dir = dx > 0 ? 1 : -1; } }
      c.save(); c.translate(f.x, f.y + (f.picked ? 0 : Math.sin(t * 2 + f.ph) * 3)); c.scale(f.dir * f.s / 100, f.s / 100); c.translate(-50, -50);
      if (f.picked || f.ghost) c.globalAlpha = .35;
      pGoldfish(c, Math.sin(t * (f.picked ? 2 : 9) + f.ph)); c.restore();
    }
    for (const f of T.fish) {
      if (!f.rev) continue;
      const k = Math.min(1, (now - f.revT) / 300), r = f.s * .5 * (f.ghost ? .62 : 1) * (.6 + .4 * k), x = f.x, y = f.y - f.s * .15;
      c.save(); c.globalAlpha = f.ghost ? .5 : 1; bubble(c, x, y, r);
      c.beginPath(); c.arc(x, y, r * .9, 0, TAU); c.fillStyle = f.rev.t === 'collect' ? 'rgba(120,20,30,.6)' : f.rev.t === 'cash' ? 'rgba(10,60,90,.5)' : 'rgba(200,110,10,.45)'; c.fill();
      const [a, b] = revLabel(f.rev, T.bet), fs = r * (a.length > 5 ? .32 : .5), ty = y - (b ? r * .12 : 0);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.font = `400 ${fs}px ${FD}`; c.lineWidth = fs * .22; c.strokeStyle = '#012'; c.strokeText(a, x, ty); c.fillStyle = f.rev.t === 'collect' ? '#ffb0a8' : '#ffe08a'; c.fillText(a, x, ty);
      if (b) { c.font = `600 ${Math.max(9, r * .2)}px "Chakra Petch", sans-serif`; c.fillStyle = '#fff'; c.fillText(b, x, y + r * .4); }
      c.restore();
    }
  }
  async function runPickBonus() {
    const coin0 = coin, units0 = units;
    K.sfx.bigWin(); card('GOLDFISH BONUS', 'Feeding time! Pick the fish', 2000); el.classList.add('winning');
    await sleep(2100); if (!alive) return 0;
    el.classList.remove('winning'); ovl.innerHTML = '';
    mode = 'pick'; hl = null; syncControls();
    tank = makeTank(); Object.assign(tank, { coin: coin0, units: units0, bet: coin0 * units0 }); tankHud();
    msg('Goldfish bonus: pick a fish!', 'gold');
    const blub = () => { if (!tank) return; K.tone(250 + R(450), .09, { type: 'sine', vol: .03, slide: 250 + R(400) }); later(blub, 220 + R(600)); }; blub();
    await new Promise(res => { tank.done = res; });
    if (!alive) return 0;
    const cashD = tank.cash * coin0, spins = tank.spins, mult = tank.mult;
    tank.el.remove(); tank = null; dirty = true;
    if (cashD > 0) { api.win(cashD); rollWin(cashD); K.sfx.win(); }
    msg(`Goldfish bonus paid ${K.fmt(cashD)}${spins ? ` · ${spins} free spins at ×${mult}` : ''}`, 'win');
    await sleep(cashD > 0 ? 1700 : 700); if (!alive) return cashD;
    if (spins > 0) return cashD + await runFreeSpins(spins, mult);
    mode = 'base'; syncControls();
    return cashD;
  }

  async function runHold(cellsList) {
    const bet = totalBet();
    hold = { cells: Array(15).fill(null), spinning: new Set(), pop: {}, bet, flash: -1 };
    for (const [i, r] of cellsList) hold.cells[i * 3 + r] = valGrid[i][r];
    K.sfx.bigWin(); card('HOLD & SPIN', `${cellsList.length} pearls locked · 3 respins`, 2000);
    await sleep(2100); if (!alive) return 0;
    mode = 'hold'; hl = null; syncControls(); dirty = true;
    let respins = 3;
    const mx = el.querySelector('.sl-jps');
    while (respins > 0 && hold.cells.some(c => !c) && alive) {
      respins--;
      msg(`Respins left: ${respins} · ${hold.cells.filter(Boolean).length} pearls`, 'gold');
      const empties = hold.cells.map((c, i) => c ? -1 : i).filter(i => i >= 0);
      empties.forEach(i => hold.spinning.add(i));
      const before = hold.cells.slice(); const got = holdRespin(hold.cells, R, cfg.holdQ);
      const landed = got.map(i => hold.cells[i]); got.forEach((i, k) => { hold.cells[i] = null; hold[`n${i}`] = landed[k]; });
      K.tone(200, .4, { type: 'sawtooth', vol: .025, slide: 300 });
      await sleep(550);
      for (const i of empties) {
        if (!alive) return 0;
        hold.spinning.delete(i);
        if (hold[`n${i}`]) { hold.cells[i] = hold[`n${i}`]; delete hold[`n${i}`]; hold.pop[i] = performance.now(); K.tone(1318, .16, { type: 'triangle', vol: .12 }); K.tone(1760, .12, { type: 'sine', vol: .08, delay: .06 }); await sleep(160); }
        else { await sleep(45); }
      }
      void before;
      if (got.length) { respins = 3; msg(`+${got.length} pearl${got.length > 1 ? 's' : ''}! Respins reset to 3`, 'win'); }
      else K.sfx.reelStop();
      await sleep(650);
    }
    if (!alive) return 0;
    // collect
    const full = hold.cells.every(Boolean);
    let total = 0; msg('Collecting pearls…', 'gold'); setWinMeter(0);
    for (let idx = 0; idx < 15; idx++) {
      const v = hold.cells[idx]; if (!v) continue;
      hold.flash = idx; const amt = v.m * bet; rollWin(total + amt, total); total += amt;
      K.tone(880 + idx * 40, .1, { type: 'square', vol: .06 }); if (v.j) { card(v.j, K.fmt(amt), 1100); K.sfx.win(); await sleep(900); }
      await sleep(260); if (!alive) return 0;
    }
    hold.flash = -1;
    if (full) { const g = JP_MULT.GRAND * bet; total += g; card('GRAND JACKPOT!', K.fmt(g), 3500); K.banner(el, 'GRAND!'); K.sfx.bigWin(); coinShower(80); await sleep(1500); }
    api.win(total); rollWin(total, win.shown);
    card('HOLD & SPIN WIN', K.fmt(total), 2600); celebrate(total, bet); msg(`Hold & Spin paid ${K.fmt(total)}`, 'win');
    await sleep(2800); if (!alive) return total;
    mode = 'base'; hold = null; valGrid = null; dirty = true; syncControls(); void mx;
    return total;
  }

  // ------------------------------------------------------------------ boot
  if (cfg.pickBonus) { const amb = () => { if (interacted && mode === 'base' && !busy) K.tone(320 + R(380), .08, { type: 'sine', vol: .012, slide: 200 + R(300) }); later(amb, 1400 + R(3200)); }; later(amb, 2500); }
  syncControls(); setWinMeter(0); layout(); raf = requestAnimationFrame(frame);
  msg(cfg.betMode === 'lines' ? `${units} lines · ${K.fmt(coin)} per line — press SPIN or Space` : `Bet ${units} coin${units > 1 ? 's' : ''} · press ${cfg.style === 'wood' ? 'PULL, the lever,' : 'SPIN'} or Space`);
  return {
    unmount() {
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); ro.disconnect();
      window.removeEventListener('keydown', onKey); if (unsubBal) unsubBal(); if (cfg.progressive) saveMeter(meter);
      reelsDone = null; root.innerHTML = '';
    }
  };
}

// =====================================================================================================
// Exports
// =====================================================================================================
export const machines = CFGS.map(cfg => ({
  id: cfg.id, title: cfg.title, kind: 'slot', blurb: cfg.blurb, theme: { ...cfg.theme, reels: cfg.reels },
  mount(root, api) { return mountMachine(cfg, root, api); }
}));
export const [blazing7s, diamondDoubler, libertyBell, pharaohsGold, dragonPearls, megaValley, fishbowlFortune] = machines;
export default machines[0];

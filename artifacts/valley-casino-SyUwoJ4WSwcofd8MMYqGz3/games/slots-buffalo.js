// Valley Casino — the Thunder Plains family: three 5×4, 1,024-ways video slots.
//   Thunder Plains       (slot-thunder)       stacked bison, sunset wilds, gold-coin free games with ×2/×3 wild multipliers
//   Thunder Plains Gold  (slot-thunder-gold)  free games collect golden bison heads that turn other animals into bison
//   Stampede Rush        (slot-rush)          a random herd can run across any base spin and leave bison behind
// Everything is drawn procedurally (canvas symbols, CSS cabinet). Sounds are synthesized (tones + filtered noise).
// Math (strips, ways evaluation, features) is pure and exported as `_math` so it can be simulated in node.
// Every outcome is drawn from K.rand at the moment of the spin; animation randomness is cosmetic only.
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
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// short fur strokes inside the current clip
function fur(c, seed, x0, y0, w, h, n, light, dark, len = 4) {
  const rnd = mulberry(seed); c.lineCap = 'round'; c.lineWidth = .9;
  for (let k = 0; k < n; k++) {
    const x = x0 + rnd() * w, y = y0 + rnd() * h, l = len * (.7 + rnd() * .7);
    c.strokeStyle = rnd() < .5 ? light : dark; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 1.2, y + l * .5, x + 2 + rnd() * 1.5, y + l); c.stroke();
  }
}

// ---------------------------------------------------------------- bison (side profile, facing left)
const BROWN = { rear0: '#55311a', rear1: '#1e0f06', cape0: '#94602e', cape1: '#4a2a10', capeHi: '#c99258', face0: '#3e2412', face1: '#140904', horn0: '#f2e6cc', horn1: '#2e241a', leg: '#2a170b', legFar: '#170c05', hoof: '#0a0503', ink: '#0e0703', furL: 'rgba(255,222,170,.30)', furD: 'rgba(30,14,4,.40)', rim: 'rgba(255,196,128,.6)' };
const GOLDP = { rear0: '#e0a838', rear1: '#7a4a06', cape0: '#fff0a8', cape1: '#c8901e', capeHi: '#fffbe0', face0: '#c08a1a', face1: '#6a4400', horn0: '#ffffff', horn1: '#a07010', leg: '#9a6a10', legFar: '#7a4c04', hoof: '#4a2c00', ink: '#3a2200', furL: 'rgba(255,255,230,.45)', furD: 'rgba(120,70,0,.35)', rim: 'rgba(255,255,230,.85)' };
const EMBOSS = { rear0: '#d49a30', rear1: '#8a5a0c', cape0: '#ffe390', cape1: '#b88218', capeHi: '#fff6c8', face0: '#a8701a', face1: '#6a4400', horn0: '#fff2c0', horn1: '#8a5a00', leg: '#9a6410', legFar: '#7a4c08', hoof: '#5a3800', ink: '#4a2c00', furL: 'rgba(255,250,210,.35)', furD: 'rgba(100,60,0,.3)', rim: 'rgba(255,255,220,.8)' };
function pBison(c, o = {}) {
  const P = o.pal || BROWN, run = o.leg != null, ph = o.leg || 0;
  if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,.38)'; c.beginPath(); c.ellipse(55, 94.5, 39, 4.2, 0, 0, TAU); c.fill(); }
  const leg = (hx, hy, len, ang, w0, w1, col) => {
    c.save(); c.translate(hx, hy); c.rotate(ang);
    c.beginPath(); c.moveTo(-w0 / 2, 0); c.quadraticCurveTo(-w0 / 2 - 1, len * .45, -w1 / 2, len - 3); c.lineTo(-w1 / 2 - .5, len); c.lineTo(w1 / 2 + 1.5, len); c.lineTo(w1 / 2, len - 3); c.quadraticCurveTo(w0 / 2 + 1, len * .4, w0 / 2, 0); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 1.1; c.strokeStyle = P.ink; c.stroke();
    c.fillStyle = P.hoof; c.fillRect(-w1 / 2 - .5, len - 3, w1 + 2, 3);
    c.restore();
  };
  const sw = k => Math.sin(ph + k) * .55;
  leg(43, 66, 27, run ? sw(Math.PI) : .12, 9, 5, P.legFar);
  leg(79, 62, 30, run ? sw(.3) : -.14, 12, 5, P.legFar);
  const rear = () => { c.beginPath(); c.moveTo(48, 30); c.bezierCurveTo(62, 25, 80, 28, 88, 38); c.bezierCurveTo(95, 46, 95, 62, 88, 69); c.bezierCurveTo(78, 74, 62, 74, 46, 72); c.closePath(); };
  rear(); c.fillStyle = lin(c, 0, 26, 0, 74, [[0, P.rear0], [1, P.rear1]]); c.fill();
  c.save(); rear(); c.clip(); fur(c, 3, 50, 28, 46, 46, 40, P.furL, P.furD, 3); c.restore();
  rear(); c.lineWidth = 1.5; c.strokeStyle = P.ink; c.stroke();
  c.strokeStyle = P.rear1; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(91, 42); c.quadraticCurveTo(98, 50, 96, 60); c.stroke();
  c.fillStyle = P.face1; c.beginPath(); c.ellipse(96, 62, 2.4, 4, .2, 0, TAU); c.fill();
  leg(86, 62, 30, run ? sw(Math.PI + .3) : .16, 12, 5.5, P.leg);
  leg(36, 68, 26, run ? sw(0) : -.1, 10, 5.5, P.leg);
  const cape = () => {
    c.beginPath(); c.moveTo(64, 30);
    c.bezierCurveTo(60, 14, 46, 8, 34, 14); c.bezierCurveTo(28, 17, 24, 22, 22, 28);
    c.lineTo(32, 60); c.lineTo(28, 72);
    for (const [x, y] of [[31, 79], [34, 74], [37, 82], [40, 75], [44, 80], [47, 74], [51, 78], [54, 73], [58, 75], [60, 68], [57, 62], [62, 56], [58, 50], [63, 44], [60, 38]]) c.lineTo(x, y);
    c.closePath();
  };
  cape(); c.fillStyle = rad(c, 42, 22, 2, 44, 40, 42, [[0, P.capeHi], [.35, P.cape0], [1, P.cape1]]); c.fill();
  c.save(); cape(); c.clip(); fur(c, 7, 20, 8, 46, 76, 110, P.furL, P.furD, 4.5); c.restore();
  cape(); c.lineWidth = 1.5; c.strokeStyle = P.ink; c.lineJoin = 'round'; c.stroke();
  // beard, head, forelock, horn
  c.beginPath(); c.moveTo(15, 62); c.lineTo(17, 75); c.lineTo(20, 70); c.lineTo(23, 81); c.lineTo(26, 72); c.lineTo(29, 77); c.lineTo(31, 64); c.closePath(); c.fillStyle = P.face1; c.fill();
  const head = () => { c.beginPath(); c.moveTo(31, 24); c.bezierCurveTo(22, 26, 15, 36, 12, 48); c.bezierCurveTo(10, 55, 10, 61, 14, 64); c.bezierCurveTo(18, 67, 25, 66, 29, 62); c.bezierCurveTo(35, 56, 37, 42, 35, 30); c.closePath(); };
  head(); c.fillStyle = lin(c, 12, 30, 36, 60, [[0, P.face0], [1, P.face1]]); c.fill(); c.lineWidth = 1.3; c.strokeStyle = P.ink; c.stroke();
  c.beginPath(); c.moveTo(35, 21); c.lineTo(26, 21); c.lineTo(21, 28); c.lineTo(25, 29); c.lineTo(18, 35); c.lineTo(24, 35); c.lineTo(18, 41); c.lineTo(27, 38); c.lineTo(34, 33); c.closePath();
  c.globalAlpha = .9; c.fillStyle = lin(c, 18, 20, 34, 40, [[0, P.cape0], [1, P.cape1]]); c.fill(); c.globalAlpha = 1;
  c.beginPath(); c.moveTo(25, 31); c.bezierCurveTo(19, 29, 16, 23, 19, 14); c.bezierCurveTo(21, 21, 25, 25, 31, 27); c.closePath();
  c.fillStyle = lin(c, 19, 14, 29, 30, [[0, P.horn1], [.45, P.horn0], [1, '#cdbf9f']]); c.fill(); c.lineWidth = 1; c.strokeStyle = P.ink; c.stroke();
  c.fillStyle = '#000'; c.beginPath(); c.ellipse(22, 42, 2.1, 1.5, -.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(21.3, 41.5, .65, 0, TAU); c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.ellipse(13.4, 56, 1.4, 2, .3, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(13, 62); c.quadraticCurveTo(18, 63.5, 22, 61); c.stroke();
  c.strokeStyle = P.rim; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(62, 28); c.bezierCurveTo(58, 14, 46, 9.5, 34, 15); c.stroke();
}
// golden bison head, front view (Thunder Plains Gold free games)
function pBisonHead(c, P = GOLDP) {
  c.beginPath(); c.arc(50, 50, 47, 0, TAU); c.fillStyle = rad(c, 50, 50, 10, 50, 50, 48, [[0, 'rgba(255,220,100,.55)'], [1, 'rgba(255,180,40,0)']]); c.fill();
  for (const s of [-1, 1]) {
    c.save(); c.translate(50, 0); c.scale(s, 1);
    c.beginPath(); c.moveTo(-18, 40); c.bezierCurveTo(-32, 42, -43, 34, -41, 14); c.bezierCurveTo(-37, 26, -30, 31, -18, 30); c.closePath();
    c.fillStyle = lin(c, -41, 14, -20, 38, [[0, P.horn1], [.5, P.horn0], [1, P.horn0]]); c.fill(); c.lineWidth = 1.4; c.strokeStyle = P.ink; c.stroke();
    c.beginPath(); c.ellipse(-27, 50, 8, 4, .5, 0, TAU); c.fillStyle = P.cape1; c.fill(); c.stroke();
    c.restore();
  }
  const shag = () => { c.beginPath(); const N = 34; for (let k = 0; k <= N; k++) { const a = -Math.PI / 2 + k / N * TAU, j = k % 2 ? 1 : .86, x = 50 + Math.cos(a) * 27 * j, y = 44 + Math.sin(a) * 29 * j * (Math.sin(a) > 0 ? .85 : 1.05); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
  shag(); c.fillStyle = rad(c, 46, 28, 3, 50, 44, 32, [[0, P.capeHi], [.4, P.cape0], [1, P.cape1]]); c.fill();
  c.save(); shag(); c.clip(); fur(c, 11, 22, 14, 56, 60, 90, P.furL, P.furD, 4); c.restore();
  shag(); c.lineWidth = 1.4; c.strokeStyle = P.ink; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.moveTo(42, 84); c.lineTo(44, 94); c.lineTo(47, 89); c.lineTo(50, 98); c.lineTo(53, 89); c.lineTo(56, 94); c.lineTo(58, 84); c.closePath(); c.fillStyle = P.face1; c.fill();
  const face = () => { c.beginPath(); c.moveTo(39, 46); c.bezierCurveTo(37, 62, 38, 78, 42, 84); c.quadraticCurveTo(50, 90, 58, 84); c.bezierCurveTo(62, 78, 63, 62, 61, 46); c.quadraticCurveTo(50, 41, 39, 46); c.closePath(); };
  face(); c.fillStyle = lin(c, 0, 44, 0, 88, [[0, P.face0], [1, P.face1]]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = P.ink; c.stroke();
  c.beginPath(); c.moveTo(40, 30); c.lineTo(44, 44); c.lineTo(47, 38); c.lineTo(50, 48); c.lineTo(53, 38); c.lineTo(56, 44); c.lineTo(60, 30); c.closePath(); c.fillStyle = P.cape0; c.fill();
  c.beginPath(); c.ellipse(50, 80, 9, 5.5, 0, 0, TAU); c.fillStyle = P.face1; c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.ellipse(46, 80, 1.8, 2.4, .3, 0, TAU); c.ellipse(54, 80, 1.8, 2.4, -.3, 0, TAU); c.fill();
  for (const x of [38, 62]) { c.beginPath(); c.ellipse(x, 54, 3, 2.2, 0, 0, TAU); c.fillStyle = '#120800'; c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - .8, 53.3, .8, 0, TAU); c.fill(); }
  sparkle(c, 76, 18, 7); sparkle(c, 24, 72, 4);
}
// ---------------------------------------------------------------- the other animals
function pEagle(c) {
  const wing = s => {
    c.save(); c.translate(50, 44); c.scale(s, 1);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + .62 - k * .16, len = 46 - k * 2.6;
      c.save(); c.rotate(a); c.beginPath(); c.ellipse(len * .55, 0, len * .5, 4.4, 0, 0, TAU);
      c.fillStyle = lin(c, 0, 0, len, 0, [[0, '#6a4424'], [.65, '#2e1a0c'], [1, '#0e0804']]); c.fill(); c.lineWidth = .9; c.strokeStyle = '#080402'; c.stroke(); c.restore();
    }
    c.beginPath(); c.moveTo(0, -5); c.bezierCurveTo(-14, -20, -30, -18, -38, -10); c.bezierCurveTo(-30, -2, -16, 8, 0, 10); c.closePath();
    c.fillStyle = lin(c, -38, -16, 0, 8, [[0, '#9a6a3a'], [1, '#4a2a12']]); c.fill(); c.lineWidth = 1; c.strokeStyle = '#140a04'; c.stroke();
    c.strokeStyle = 'rgba(30,14,4,.55)'; c.lineWidth = .9; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-10 - k * 7, -4 + k, 4, .2, Math.PI - .2); c.stroke(); }
    c.restore();
  };
  wing(1); wing(-1);
  c.beginPath(); c.moveTo(42, 72); c.lineTo(35, 91); c.quadraticCurveTo(50, 98, 65, 91); c.lineTo(58, 72); c.closePath(); c.fillStyle = lin(c, 0, 72, 0, 96, [[0, '#ffffff'], [1, '#bdbdb4']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#2a2a24'; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .8; c.beginPath(); for (const x of [42, 47, 53, 58]) { c.moveTo(50, 74); c.lineTo(x, 93); } c.stroke();
  c.beginPath(); c.ellipse(50, 58, 11.5, 19, 0, 0, TAU); c.fillStyle = lin(c, 40, 40, 60, 78, [[0, '#7a5030'], [1, '#2a160a']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#140a04'; c.stroke();
  c.save(); c.beginPath(); c.ellipse(50, 58, 11.5, 19, 0, 0, TAU); c.clip(); fur(c, 5, 39, 40, 22, 36, 30, 'rgba(255,220,170,.25)', 'rgba(0,0,0,.3)', 3); c.restore();
  c.fillStyle = '#f6b81a'; c.strokeStyle = '#5a3a00'; c.lineWidth = 1;
  for (const x of [44, 56]) { c.beginPath(); c.moveTo(x - 3, 74); c.lineTo(x + 3, 74); c.lineTo(x + 4, 80); c.lineTo(x - 4, 80); c.closePath(); c.fill(); c.stroke(); }
  c.beginPath(); c.moveTo(39, 36); c.lineTo(42, 44); c.lineTo(46, 40); c.lineTo(50, 46); c.lineTo(54, 40); c.lineTo(58, 44); c.lineTo(61, 36); c.closePath(); c.fillStyle = '#e8e8e0'; c.fill();
  c.beginPath(); c.ellipse(51, 30, 10.5, 11.5, 0, 0, TAU); c.fillStyle = rad(c, 48, 25, 2, 51, 30, 12, [[0, '#ffffff'], [1, '#c8c8be']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#3a3a34'; c.stroke();
  c.beginPath(); c.moveTo(43, 29); c.bezierCurveTo(37, 28, 32, 32, 32, 38); c.bezierCurveTo(34, 36, 36, 36, 38, 37.5); c.lineTo(44, 36); c.closePath();
  c.fillStyle = lin(c, 32, 28, 44, 38, [[0, '#ffd23a'], [1, '#c88a00']]); c.fill(); c.lineWidth = 1; c.strokeStyle = '#5a3a00'; c.stroke();
  c.beginPath(); c.arc(46, 27.5, 2.3, 0, TAU); c.fillStyle = '#f2c018'; c.fill(); c.beginPath(); c.arc(45.6, 27.5, 1.1, 0, TAU); c.fillStyle = '#000'; c.fill();
  c.strokeStyle = '#3a3a34'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(42, 25); c.lineTo(49, 24.5); c.stroke();
}
function pWolf(c) {
  c.beginPath(); c.arc(62, 36, 32, 0, TAU); c.fillStyle = rad(c, 52, 26, 4, 62, 36, 33, [[0, '#fffbe8'], [.7, '#e8dfc0'], [1, '#b0a684']]); c.fill();
  c.fillStyle = 'rgba(140,128,96,.35)'; for (const [x, y, r] of [[74, 26, 5], [60, 48, 4], [80, 48, 3], [66, 18, 3], [86, 36, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  c.save(); c.beginPath(); c.rect(0, 0, 100, 100); c.clip(); c.translate(-5, 3); c.scale(1.28, 1.28);
  const w = () => {
    c.beginPath(); c.moveTo(18, 100); c.bezierCurveTo(22, 86, 26, 72, 28, 62); c.lineTo(25, 58); c.lineTo(30, 52); c.lineTo(26, 46); c.lineTo(29, 41);
    c.bezierCurveTo(25, 38, 21, 34, 18, 29); c.lineTo(13, 23); c.lineTo(25, 28.5); c.lineTo(11, 18); c.quadraticCurveTo(8, 12, 13, 11);
    c.bezierCurveTo(19, 13, 26, 16, 32, 18); c.quadraticCurveTo(35, 15, 38, 14); c.lineTo(41, 1); c.lineTo(48, 12); c.lineTo(53, 5); c.lineTo(54, 17);
    c.bezierCurveTo(58, 22, 60, 28, 61, 34); c.bezierCurveTo(64, 52, 72, 74, 82, 100); c.closePath();
  };
  w(); c.fillStyle = lin(c, 15, 10, 75, 100, [[0, '#e6e9ee'], [.45, '#8e949e'], [1, '#30343a']]); c.fill();
  c.save(); w(); c.clip();
  c.fillStyle = 'rgba(28,30,36,.5)'; c.beginPath(); c.moveTo(52, 16); c.bezierCurveTo(60, 30, 66, 54, 84, 100); c.lineTo(62, 100); c.bezierCurveTo(58, 70, 52, 42, 44, 22); c.closePath(); c.fill();
  c.fillStyle = 'rgba(252,252,248,.6)'; c.beginPath(); c.moveTo(18, 30); c.lineTo(29, 41); c.lineTo(26, 46); c.lineTo(30, 52); c.lineTo(25, 58); c.lineTo(32, 64); c.lineTo(27, 72); c.lineTo(33, 80); c.lineTo(28, 100); c.lineTo(14, 100); c.bezierCurveTo(18, 80, 22, 62, 24, 50); c.closePath(); c.fill();
  fur(c, 9, 12, 8, 72, 92, 120, 'rgba(255,255,255,.25)', 'rgba(10,12,16,.35)', 4.5);
  c.restore();
  w(); c.lineWidth = 1.5; c.strokeStyle = '#15171c'; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = '#4a1a1e'; c.beginPath(); c.moveTo(13.5, 23.2); c.lineTo(25, 28.5); c.lineTo(12, 18.8); c.closePath(); c.fill();
  c.fillStyle = '#2a2a30'; c.beginPath(); c.moveTo(41.5, 5); c.lineTo(46, 12); c.lineTo(40.5, 13); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(11.5, 13.5, 3.2, 2.6, -.5, 0, TAU); c.fillStyle = '#000'; c.fill();
  c.strokeStyle = '#111'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(32, 18); c.lineTo(26, 16.5); c.stroke();
  c.beginPath(); c.moveTo(30, 22); c.quadraticCurveTo(33.5, 19, 37, 21.5); c.quadraticCurveTo(33.5, 23.5, 30, 22); c.fillStyle = '#ffd040'; c.fill(); c.lineWidth = 1; c.stroke();
  c.restore();
}
function pCougar(c) {
  for (const s of [-1, 1]) { c.beginPath(); c.arc(50 + s * 25, 23, 11, 0, TAU); c.fillStyle = '#6a3c1a'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#2a140a'; c.stroke(); c.beginPath(); c.arc(50 + s * 24, 25, 6, 0, TAU); c.fillStyle = '#d8a890'; c.fill(); }
  const head = () => { c.beginPath(); c.moveTo(50, 15); c.bezierCurveTo(72, 15, 85, 29, 85, 48); c.bezierCurveTo(85, 70, 70, 88, 50, 90); c.bezierCurveTo(30, 88, 15, 70, 15, 48); c.bezierCurveTo(15, 29, 28, 15, 50, 15); c.closePath(); };
  head(); c.fillStyle = rad(c, 50, 40, 4, 50, 52, 42, [[0, '#f2c486'], [.6, '#c8843e'], [1, '#8a5222']]); c.fill();
  c.save(); head(); c.clip(); fur(c, 13, 16, 16, 68, 44, 70, 'rgba(255,236,200,.35)', 'rgba(90,44,10,.35)', 3); c.restore();
  head(); c.lineWidth = 1.6; c.strokeStyle = '#3a1e0a'; c.stroke();
  c.fillStyle = 'rgba(255,244,226,.6)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(50 + s * 13, 52, 7, 4, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#f8f0e4'; c.beginPath(); c.ellipse(43, 67, 10, 8, 0, 0, TAU); c.ellipse(57, 67, 10, 8, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(50, 80, 9, 6, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(50,26,10,.75)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(50 + s * 15, 68, 3.5, 6, s * .3, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(60,30,10,.6)'; for (const [x, y] of [[40, 66], [44, 69], [41, 71], [60, 66], [56, 69], [59, 71]]) { c.beginPath(); c.arc(x, y, .9, 0, TAU); c.fill(); }
  c.beginPath(); c.moveTo(43, 55); c.quadraticCurveTo(50, 52, 57, 55); c.lineTo(50, 63); c.closePath(); c.fillStyle = '#c8786a'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#3a1e0a'; c.stroke();
  c.beginPath(); c.moveTo(50, 63); c.lineTo(50, 68); c.moveTo(50, 68); c.quadraticCurveTo(45, 72, 41, 69); c.moveTo(50, 68); c.quadraticCurveTo(55, 72, 59, 69); c.lineWidth = 1.3; c.stroke();
  for (const s of [-1, 1]) {
    c.save(); c.translate(50 + s * 13, 44);
    c.beginPath(); c.ellipse(0, 0, 6.2, 4.2, s * .25, 0, TAU); c.fillStyle = rad(c, 0, 0, .5, 0, 0, 6, [[0, '#ffe080'], [1, '#c88a18']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#1e0e04'; c.stroke();
    c.beginPath(); c.ellipse(0, 0, 1.8, 3.3, 0, 0, TAU); c.fillStyle = '#000'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-1.4, -1.4, .8, 0, TAU); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(40,20,6,.85)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(50 + s * 8, 48); c.quadraticCurveTo(50 + s * 7, 55, 50 + s * 9, 60); c.stroke();
  }
}
function pElk(c) {
  c.beginPath(); c.moveTo(34, 56); c.bezierCurveTo(26, 70, 22, 86, 20, 100); c.lineTo(80, 100); c.bezierCurveTo(78, 86, 74, 70, 66, 56); c.closePath(); c.fillStyle = lin(c, 0, 56, 0, 100, [[0, '#5a3418'], [1, '#24120a']]); c.fill();
  c.save(); c.clip(); fur(c, 17, 20, 56, 60, 44, 60, 'rgba(255,220,170,.22)', 'rgba(0,0,0,.4)', 5); c.restore();
  for (const s of [-1, 1]) {
    c.save(); c.translate(50, 0); c.scale(s, 1); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => {
      c.beginPath(); c.moveTo(-9, 30); c.bezierCurveTo(-16, 22, -27, 18, -35, 4);
      c.moveTo(-14, 25.5); c.quadraticCurveTo(-23, 23, -30, 26);
      c.moveTo(-20, 21); c.quadraticCurveTo(-19, 12, -22, 5);
      c.moveTo(-26, 15.5); c.quadraticCurveTo(-35, 14, -44, 11);
      c.moveTo(-30, 10.5); c.quadraticCurveTo(-31, 5, -29, 2);
    };
    path(); c.lineWidth = 6.5; c.strokeStyle = '#2a1a0c'; c.stroke();
    path(); c.lineWidth = 4; c.strokeStyle = lin(c, 0, 30, 0, 2, [[0, '#7a5a3a'], [1, '#f6eedc']]); c.stroke();
    c.save(); c.translate(-15, 37); c.rotate(-.45); c.beginPath(); c.ellipse(-8, 0, 10, 4.6, 0, 0, TAU); c.fillStyle = '#a06a3a'; c.fill(); c.lineWidth = 1.1; c.strokeStyle = '#2a1a0c'; c.stroke(); c.beginPath(); c.ellipse(-8, 0, 6, 2.2, 0, 0, TAU); c.fillStyle = '#e0b090'; c.fill(); c.restore();
    c.restore();
  }
  const head = () => { c.beginPath(); c.moveTo(38, 30); c.bezierCurveTo(36, 50, 40, 72, 44, 86); c.bezierCurveTo(47, 91, 53, 91, 56, 86); c.bezierCurveTo(60, 72, 64, 50, 62, 30); c.bezierCurveTo(58, 24, 42, 24, 38, 30); c.closePath(); };
  head(); c.fillStyle = lin(c, 38, 26, 62, 90, [[0, '#dcaa70'], [.5, '#9a6232'], [1, '#5a3416']]); c.fill();
  c.save(); head(); c.clip(); c.fillStyle = 'rgba(60,30,10,.35)'; c.beginPath(); c.ellipse(50, 34, 11, 7, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,230,190,.25)'; c.beginPath(); c.ellipse(50, 60, 4, 18, 0, 0, TAU); c.fill(); c.restore();
  head(); c.lineWidth = 1.5; c.strokeStyle = '#2a1a0c'; c.stroke();
  for (const x of [41, 59]) { c.beginPath(); c.ellipse(x, 47, 3.4, 2.6, 0, 0, TAU); c.fillStyle = '#100804'; c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(x - 1, 46.2, .8, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(50, 84, 7.5, 5.5, 0, 0, TAU); c.fillStyle = '#2a1a10'; c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.ellipse(47, 84, 1.5, 2.2, .3, 0, TAU); c.ellipse(53, 84, 1.5, 2.2, -.3, 0, TAU); c.fill();
}
// ---------------------------------------------------------------- wild, scatter
function pSunsetWild(c) {
  rr(c, 4, 4, 92, 92, 14); c.save(); c.clip();
  c.fillStyle = lin(c, 0, 4, 0, 96, [[0, '#2a0e3a'], [.3, '#8a2a4a'], [.55, '#ff6a2a'], [.66, '#ffc05a'], [.67, '#2a0e10'], [1, '#120604']]); c.fillRect(0, 0, 100, 100);
  c.save(); c.translate(50, 66); c.globalAlpha = .32; c.fillStyle = '#ffe2a0';
  for (let k = 0; k < 11; k++) { const a = Math.PI + (k + .5) / 11 * Math.PI; c.beginPath(); c.moveTo(Math.cos(a - .05) * 27, Math.sin(a - .05) * 27); c.lineTo(Math.cos(a) * 64, Math.sin(a) * 64); c.lineTo(Math.cos(a + .05) * 27, Math.sin(a + .05) * 27); c.fill(); }
  c.restore();
  c.beginPath(); c.arc(50, 66, 24, Math.PI, 0); c.fillStyle = rad(c, 50, 62, 2, 50, 66, 24, [[0, '#fffbe0'], [.5, '#ffd060'], [1, '#ff7a1a']]); c.fill();
  c.fillStyle = 'rgba(255,190,140,.35)'; for (const [y, w] of [[18, 30], [26, 22]]) { c.beginPath(); c.ellipse(28 + y, y, w, 1.6, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#2a0e14';
  c.beginPath(); c.moveTo(0, 67); c.lineTo(0, 56); c.lineTo(6, 56); c.lineTo(9, 50); c.lineTo(24, 50); c.lineTo(28, 58); c.lineTo(34, 60); c.lineTo(36, 67); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(64, 67); c.lineTo(69, 58); c.lineTo(73, 58); c.lineTo(75, 45); c.lineTo(84, 45); c.lineTo(86, 56); c.lineTo(94, 57); c.lineTo(100, 62); c.lineTo(100, 67); c.closePath(); c.fill();
  c.restore();
  rr(c, 4, 4, 92, 92, 14); c.lineWidth = 3.5; c.strokeStyle = gold(c); c.stroke();
  text(c, 'WILD', 50, 83, 23, { fill: gold(c, 72, 94), stroke: '#2a0a00', sw: 5 });
  sparkle(c, 80, 16, 6);
}
function pCoin(c) {
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.fillStyle = rad(c, 36, 32, 4, 50, 50, 46, [[0, '#fff6c0'], [.4, '#f7c948'], [.85, '#b07a12'], [1, '#6a4200']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#3a2200'; c.stroke();
  c.save(); c.translate(50, 50); c.strokeStyle = 'rgba(90,50,0,.55)'; c.lineWidth = 1.2; for (let k = 0; k < 48; k++) { c.rotate(TAU / 48); c.beginPath(); c.moveTo(39.5, 0); c.lineTo(44.5, 0); c.stroke(); } c.restore();
  c.beginPath(); c.arc(50, 50, 38, 0, TAU); c.fillStyle = lin(c, 20, 14, 80, 88, [[0, '#ffe58a'], [.5, '#e0a52a'], [1, '#9a6408']]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#7a5000'; c.stroke();
  c.save(); c.beginPath(); c.arc(50, 50, 36, 0, TAU); c.clip(); c.translate(50, 43); c.scale(.6, .6); c.translate(-54, -52); pBison(c, { pal: EMBOSS, noShadow: true }); c.restore();
  rr(c, 17, 68, 66, 17, 6); c.fillStyle = lin(c, 0, 68, 0, 85, [[0, '#c4201a'], [1, '#5a0806']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#ffe08a'; c.stroke();
  text(c, 'BONUS', 50, 77, 11.5, { fill: '#ffe9a0', stroke: '#2a0400', sw: 2.5 });
  sparkle(c, 75, 21, 7);
}
// ---------------------------------------------------------------- carved-wood royals (A K Q J 10 9)
let grainPat = null;
function grain(c) {
  if (!grainPat) {
    const g = document.createElement('canvas'); g.width = 48; g.height = 48; const x = g.getContext('2d');
    const rnd = mulberry(42);
    for (let k = 0; k < 18; k++) { const y0 = rnd() * 48; x.strokeStyle = rnd() < .65 ? 'rgba(60,28,8,.38)' : 'rgba(255,226,170,.22)'; x.lineWidth = .6 + rnd() * 1.2; x.beginPath(); for (let px = 0; px <= 48; px += 4) x.lineTo(px, y0 + Math.sin(px / 48 * TAU + k) * 2.2); x.stroke(); }
    x.fillStyle = 'rgba(40,18,4,.45)'; x.beginPath(); x.ellipse(30, 20, 3, 1.4, 0, 0, TAU); x.fill();
    grainPat = g;
  }
  return c.createPattern(grainPat, 'repeat');
}
function pCarved(c, ch, tint) {
  const size = ch.length > 1 ? 54 : 72, y = 55;
  c.font = `bold ${size}px ${FS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(ch, 52.5, y + 3.5);
  c.lineWidth = 10; c.strokeStyle = '#1a0c04'; c.strokeText(ch, 50, y);
  c.lineWidth = 5; c.strokeStyle = tint; c.strokeText(ch, 50, y);
  c.fillStyle = lin(c, 0, y - size * .45, 0, y + size * .45, [[0, '#f0c488'], [.5, '#b0703a'], [1, '#5e3414']]); c.fillText(ch, 50, y);
  try { const p = grain(c); if (p) { c.fillStyle = p; c.fillText(ch, 50, y); } } catch (e) { /* no pattern support */ }
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,236,200,.55)'; c.strokeText(ch, 49.2, y - .9);
  c.fillStyle = '#d8d0c0'; for (const [x, yy] of [[50 - size * .3, y - size * .32], [50 + size * .3, y + size * .3]]) { c.beginPath(); c.arc(x, yy, 1.8, 0, TAU); c.fill(); }
}

// =====================================================================================================
// Math
// =====================================================================================================
const REELS = 5, ROWS = 4;
const BASE_CR = 20;                         // pays are quoted for a 20-credit bet; bigger bets multiply them
const PAYSYMS = ['bison', 'eagle', 'elk', 'cougar', 'wolf', 'A', 'K', 'Q', 'J', 'T', 'N'];
const CONV_ORDER = ['wolf', 'cougar', 'elk', 'eagle'];
const HEAD_MAX = 15;
const FS_AWARD = { 3: 8, 4: 15, 5: 20 };    // gold coins anywhere on reels 1, 3, 5 (5 or more = 20)
const FS_RETRIG = { 2: 5, 3: 8, 4: 15, 5: 20 };
const FS_CAP = 200;                          // most free games one feature can play
const SCAT_PAY = { 3: 2, 4: 10, 5: 20 };     // × total bet
const PAYS = {
  bison: { 3: 4, 4: 10, 5: 30 }, eagle: { 3: 3, 4: 8, 5: 25 }, elk: { 3: 2, 4: 6, 5: 20 }, cougar: { 3: 2, 4: 5, 5: 15 }, wolf: { 3: 2, 4: 4, 5: 12 },
  A: { 3: 1, 4: 3, 5: 10 }, K: { 3: 1, 4: 3, 5: 10 }, Q: { 3: 1, 4: 2, 5: 8 }, J: { 3: 1, 4: 2, 5: 8 }, T: { 3: 1, 4: 2, 5: 5 }, N: { 3: 1, 4: 2, 5: 5 }
};
const NAMES = { bison: 'Bison', eagle: 'Eagle', elk: 'Elk', cougar: 'Cougar', wolf: 'Wolf', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', N: '9', wild: 'Sunset Wild', coin: 'Gold Coin', gold: 'Golden Bison' };
const pickW = (w, R) => { let t = 0; for (const x of w) t += x; let r = R(t); for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; } return w.length - 1; };

// A reel strip: bison come in stacks, everything else singly; deterministic shuffle so node and browser agree.
const PAIR_FILL = ['A', 'Q', 'T', 'K', 'J', 'N'];
const mod = (a, n) => ((a % n) + n) % n;
function buildWaysStrip(spec, seed) {
  const rnd = mulberry(seed);
  for (let attempt = 0; attempt < 50000; attempt++) {
    const units = [];
    for (const h of spec.stacks) units.push(Array(h).fill('bison'));
    for (const [s, n] of Object.entries(spec.counts)) for (let i = 0; i < n; i++) units.push([s]);
    for (let i = 0; i < (spec.pairs || 0); i++) units.push(['coin', PAIR_FILL[i % PAIR_FILL.length], 'coin']);  // the only way two coins share a window
    for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
    const a = units.flat(), L = a.length; let ok = true, run = 0, maxRun = 0;
    for (let i = 0; i < L && ok; i++) {
      const s = a[i], nx = a[(i + 1) % L];
      if (s !== 'bison' && s === nx) ok = false;              // no accidental doubles (coins never touch: max 2 per reel window)
      if ((s === 'wild' || s === 'gold') && (nx === 'wild' || nx === 'gold')) ok = false;
      run = s === 'bison' ? run + 1 : 0; maxRun = Math.max(maxRun, run);
    }
    if (ok) {  // coins: gap 2 only inside a deliberate pair, otherwise at least 4 apart
      const cp = []; a.forEach((x, i) => { if (x === 'coin') cp.push(i); });
      let g2 = 0; for (let j = 0; j < cp.length && ok; j++) { const g = mod((cp[(j + 1) % cp.length]) - cp[j], L) || L; if (g === 2) g2++; else if (g < 4) ok = false; }
      if (g2 !== (spec.pairs || 0)) ok = false;
    }
    if (ok && maxRun <= 7) return { strip: a };
  }
  throw new Error('strip build failed');
}
function makeSet(seed, o) {
  return Array.from({ length: REELS }, (_, i) => {
    const counts = { ...o.low };
    for (const k of ['wild', 'coin', 'gold']) if (o[k] && o[k][i]) counts[k] = o[k][i];
    return buildWaysStrip({ stacks: o.stacks[i], counts, pairs: o.pairs ? o.pairs[i] : 0 }, seed + i * 7);
  });
}
function spinSet(set, R) {
  const stops = set.map(d => R(d.strip.length));
  const grid = stops.map((s, i) => { const st = set[i].strip, L = st.length; return [0, 1, 2, 3].map(r => st[(s + r) % L]); });
  return { stops, grid };
}
// 1,024 ways: a symbol pays when it shows on adjacent reels from the left, any row. Ways = product of matching cells per reel.
// wm: per-cell wild multipliers (free games) — a way's multiplier is the product of the wilds on it, so the reel weight is (#symbols + Σ wild mults).
// conv: symbols that currently count as bison (Gold free games).
function evalWays(cfg, grid, wm, conv) {
  const wins = []; let pay = 0;
  const isB = g => g === 'bison' || g === 'gold' || (conv && conv.has(g));
  for (const s of PAYSYMS) {
    if (conv && conv.has(s)) continue;
    let ways = 1, wgt = 1, n = 0;
    for (let i = 0; i < REELS; i++) {
      let cs = 0, cw = 0, ws = 0;
      for (let r = 0; r < ROWS; r++) {
        const g = grid[i][r];
        if (s === 'bison' ? isB(g) : g === s) cs++;
        else if (g === 'wild') { cw++; ws += wm ? wm[i][r] : 1; }
      }
      if (cs + cw === 0) break;
      ways *= cs + cw; wgt *= cs + ws; n++;
    }
    const p = n >= 3 ? cfg.pays[s][n] : 0;
    if (!p) continue;
    const cells = [], mults = [];
    for (let i = 0; i < n; i++) for (let r = 0; r < ROWS; r++) {
      const g = grid[i][r];
      if (g === 'wild') { cells.push([i, r]); if (wm) mults.push(wm[i][r]); } else if (s === 'bison' ? isB(g) : g === s) cells.push([i, r]);
    }
    pay += p * wgt; wins.push({ sym: s, n, ways, wgt, pay: p * wgt, cells, mults });
  }
  return { wins, pay };
}
function coinCells(grid) { const out = []; grid.forEach((col, i) => col.forEach((s, r) => { if (s === 'coin') out.push([i, r]); })); return out; }
function addScatter(res, grid) {
  const coins = coinCells(grid), n = coins.length; res.coins = coins;
  if (n >= 3) { const p = SCAT_PAY[Math.min(5, n)] * BASE_CR; res.pay += p; res.wins.push({ sym: 'coin', n, scatter: true, pay: p, cells: coins, mults: [] }); }
  return n;
}
// Stampede Rush: the herd leaves 4–10 bison stacked across at least three reels from the left (never over a coin or a wild).
const HERD_W = [30, 24, 18, 12, 8, 5, 3];   // 4..10 bison
function stampede(grid, R) {
  let n = 4 + pickW(HERD_W, R); const cells = [];
  for (let i = 0; i < REELS && n > 0; i++) {
    const need = Math.max(0, 2 - i);                       // reels still needed after this one to reach 3
    const h = Math.max(1, Math.min(ROWS, n - need, Math.ceil(n / (REELS - i)) + R(2)));
    const t = R(ROWS - h + 1);
    for (let r = t; r < t + h; r++) { const g = grid[i][r]; if (g === 'coin' || g === 'wild') continue; grid[i][r] = 'bison'; cells.push([i, r]); }
    n -= h;
  }
  return cells;
}
function playBase(cfg, R) {
  const { stops, grid } = spinSet(cfg.baseSet, R);
  const pre = grid.map(col => col.slice());
  const herd = cfg.stampede && R(cfg.stampede[1]) < cfg.stampede[0] ? stampede(grid, R) : null;
  const res = evalWays(cfg, grid, null, null);
  const nc = addScatter(res, grid);
  res.fs = nc >= 3 ? FS_AWARD[Math.min(5, nc)] : 0;
  return { stops, pre, grid, herd, res };
}
const newFreeState = () => ({ heads: 0, conv: new Set() });
function playFree(cfg, R, st) {
  const { stops, grid } = spinSet(cfg.freeSet || cfg.baseSet, R);
  const wm = cfg.wm3 != null ? grid.map(col => col.map(s => s === 'wild' ? (R(100) < cfg.wm3 ? 3 : 2) : 0)) : null;
  const res = evalWays(cfg, grid, wm, st.conv);
  const nc = addScatter(res, grid);
  res.fs = nc >= 2 ? FS_RETRIG[Math.min(5, nc)] : 0;
  const heads = [], newConv = [];
  if (cfg.goldHeads) {
    grid.forEach((col, i) => col.forEach((s, r) => { if (s === 'gold') heads.push([i, r]); }));
    const before = st.heads; st.heads = Math.min(HEAD_MAX, st.heads + heads.length);
    for (let k = Math.floor(before / 3); k < Math.floor(st.heads / 3) && k < CONV_ORDER.length; k++) { st.conv.add(CONV_ORDER[k]); newConv.push(CONV_ORDER[k]); }
  }
  return { stops, grid, wm, res, heads, newConv };
}
// a whole free-game feature, for simulation
function simFeature(cfg, R, n) {
  const st = newFreeState(); let left = n, played = 0, won = 0;
  while (left > 0 && played < FS_CAP) { left--; played++; const o = playFree(cfg, R, st); won += o.res.pay; if (o.res.fs) left = Math.min(left + o.res.fs, FS_CAP - played); }
  return { won, played };
}

// =====================================================================================================
// Machine definitions (strip composition tuned by Monte Carlo; see RTP below)
// =====================================================================================================
const LOW = { eagle: 4, elk: 5, cougar: 5, wolf: 6, A: 6, K: 6, Q: 7, J: 7, T: 7, N: 7 };
const STACKS = [[4, 4, 3, 2], [4, 3, 3, 2], [4, 4, 3, 2], [4, 3, 3, 2], [4, 4, 3, 2]];
const WILDS = [0, 3, 3, 3, 0];
const COIN1 = [3, 0, 3, 0, 3], PAIR1 = [0, 0, 1, 0, 0];
const SET_THUNDER = makeSet(101, { low: LOW, stacks: STACKS, wild: WILDS, coin: COIN1, pairs: PAIR1 });
const SET_GOLD = makeSet(201, { low: LOW, stacks: STACKS, wild: WILDS, coin: COIN1, pairs: PAIR1 });
const SET_GOLD_FS = makeSet(331, { low: { ...LOW, N: 8, wolf: 7 }, stacks: STACKS, wild: WILDS, coin: COIN1, pairs: [0, 0, 0, 0, 0], gold: [1, 1, 1, 1, 1] });
const SET_RUSH = makeSet(401, { low: { ...LOW, T: 8, N: 9 }, stacks: STACKS, wild: WILDS, coin: COIN1, pairs: PAIR1 });

const CFG_THUNDER = {
  key: 'thunder', id: 'slot-thunder', title: 'Thunder Plains', order: 100,
  blurb: '5×4 reels, 1,024 ways. Stacked bison, sunset wilds, and gold coins for up to 20 free games with ×2/×3 wilds.',
  tag: '1,024 WAYS · STACKED BISON', theme: { cabinet: '#7a3a12', accent: '#ffb43a', glass: '#1a0c04' },
  pays: PAYS, baseSet: SET_THUNDER, freeSet: null, wm3: 30, goldHeads: false, stampede: null
};
const CFG_GOLD = {
  key: 'gold', id: 'slot-thunder-gold', title: 'Thunder Plains Gold', order: 101,
  blurb: '1,024 ways. In free games, golden bison heads fill a meter and turn wolves, cougars, elk and eagles into bison.',
  tag: '1,024 WAYS · GOLD FEATURE', theme: { cabinet: '#6b4a0e', accent: '#ffd84a', glass: '#1c1404' },
  pays: PAYS, baseSet: SET_GOLD, freeSet: SET_GOLD_FS, wm3: null, goldHeads: true, stampede: null
};
const CFG_RUSH = {
  key: 'rush', id: 'slot-rush', title: 'Stampede Rush', order: 102,
  blurb: '1,024 ways. A herd can thunder across any spin and leave 4–10 bison behind. Free games with ×2/×3 wilds.',
  tag: 'RANDOM HERD · 1,024 WAYS', theme: { cabinet: '#5a1a0c', accent: '#ff7a3a', glass: '#180604' },
  pays: PAYS, baseSet: SET_RUSH, freeSet: null, wm3: 40, goldHeads: false, stampede: [1, 125]
};
const CFGS = [CFG_THUNDER, CFG_GOLD, CFG_RUSH];
// Theoretical returns from a node Monte Carlo (features included). Shown on each paytable.
const RTP = { 'slot-thunder': '≈95.0% (free games about 1 in 83 spins; 7M-spin Monte Carlo)', 'slot-thunder-gold': '≈95.3% (free games about 1 in 84 spins; 6M-spin Monte Carlo)', 'slot-rush': '≈94.2% (stampede about 1 in 125 spins, free games about 1 in 91; 9M-spin Monte Carlo)' };

export const _math = { CFGS, PAYS, BASE_CR, makeSet, FS_AWARD, FS_RETRIG, FS_CAP, SCAT_PAY, HEAD_MAX, CONV_ORDER, buildWaysStrip, spinSet, evalWays, stampede, playBase, playFree, newFreeState, simFeature, RTP };

// =====================================================================================================
// Styles
// =====================================================================================================
function injectBf() {
  K.injectStyles();
  if (document.getElementById('bf-style')) return;
  const s = document.createElement('style'); s.id = 'bf-style';
  s.textContent = `
.bf-screen{--cab:#7a3a12;--acc:#ffb43a;--glass:#1a0c04;position:absolute;inset:0;display:flex;flex-direction:column;color:#f6efe0;font-family:"Chakra Petch",system-ui,sans-serif;font-size:14px;
  background:radial-gradient(ellipse 130% 60% at 50% 100%,color-mix(in srgb,var(--acc) 22%,transparent),transparent 60%),radial-gradient(ellipse 120% 70% at 50% 0%,color-mix(in srgb,var(--cab) 50%,#000) 0%,#0a0503 72%);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.bf-screen *{box-sizing:border-box}
.bf-top{position:relative;z-index:3;display:flex;align-items:center;gap:8px;padding:8px max(12px,env(safe-area-inset-left,0px));padding-top:max(8px,env(safe-area-inset-top,0px));background:linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.35));border-bottom:1px solid rgba(255,255,255,.1)}
.bf-ttl{flex:1;min-width:0;display:grid}.bf-ttl b{font:400 clamp(15px,2.2vw,20px) "Bungee",Impact,sans-serif;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bf-ttl small{font-size:11px;color:#bfb6a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bf-ib{font:600 13px "Chakra Petch",system-ui,sans-serif;color:#f6efe0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;min-height:36px;cursor:pointer}
.bf-ib:hover{border-color:var(--acc)}.bf-ib:focus-visible,.bf-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.bf-stage{position:relative;z-index:1;flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch;padding:10px 12px 12px}
.bf-cab{position:relative;flex:0 1 900px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-radius:26px 26px 16px 16px;
  background:repeating-linear-gradient(92deg,rgba(0,0,0,.07) 0 2px,transparent 2px 9px),linear-gradient(90deg,color-mix(in srgb,var(--cab) 40%,#000),var(--cab) 12%,color-mix(in srgb,var(--cab) 78%,#ffcf9a) 50%,var(--cab) 88%,color-mix(in srgb,var(--cab) 40%,#000));
  box-shadow:inset 0 0 0 2px rgba(255,214,160,.35),inset 0 0 0 6px rgba(0,0,0,.35),inset 0 0 0 8px color-mix(in srgb,var(--acc) 45%,#5a3010),inset 0 2px 30px rgba(255,220,180,.12),0 24px 60px rgba(0,0,0,.75)}
.bf-marq{position:relative;flex:none;display:grid;place-items:center;text-align:center;padding:8px 14px 7px;border-radius:16px 16px 10px 10px;min-height:56px;overflow:hidden;
  background:radial-gradient(ellipse 80% 120% at 50% 130%,color-mix(in srgb,var(--acc) 55%,transparent),transparent 70%),linear-gradient(#12081e,var(--glass) 60%,#000);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),inset 0 0 20px #000}
.bf-marq::before{content:"";position:absolute;left:0;right:0;bottom:0;height:34%;pointer-events:none;background:linear-gradient(#2a0c10,#000);opacity:.75;clip-path:polygon(0 100%,0 55%,6% 55%,8% 28%,20% 28%,23% 58%,40% 64%,58% 60%,70% 64%,73% 34%,82% 34%,85% 56%,100% 60%,100% 100%)}
.bf-logo{position:relative;font:400 clamp(22px,4.6vw,44px)/1 "Bungee",Impact,sans-serif;letter-spacing:.03em;background:linear-gradient(#fff 0%,var(--acc) 45%,color-mix(in srgb,var(--acc) 50%,#3a1000) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 10px color-mix(in srgb,var(--acc) 60%,transparent))}
.bf-tag{position:relative;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.3em;color:#ffd9a8;margin-top:3px}
.bf-marq-x{position:relative;font-size:12px;color:#fff3d8;margin-top:3px;min-height:1.3em;font-weight:600;text-shadow:0 1px 2px #000}
.bf-gm{position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:5px 12px;margin-top:5px}
.bf-gm-l{font:600 9px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#ffe6a0;width:100%}
.bf-heads{display:flex;gap:3px;padding:3px 6px;background:rgba(0,0,0,.55);border:1px solid rgba(255,216,74,.45);border-radius:10px}
.bf-heads i{width:clamp(13px,2.1vw,20px);aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.07) center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(255,216,74,.35)}
.bf-heads i:nth-child(3n){margin-right:4px}.bf-heads i:last-child{margin-right:0}
.bf-heads i.on{background-image:var(--head);box-shadow:0 0 7px #ffd84a;animation:bf-pop .4s}
.bf-conv{display:flex;gap:4px;align-items:center}
.bf-conv span{position:relative;width:clamp(24px,3.4vw,34px);aspect-ratio:1;border-radius:7px;background:rgba(0,0,0,.55) center/cover no-repeat;border:1px solid rgba(255,255,255,.22)}
.bf-conv span.on{border-color:#ffd84a;box-shadow:0 0 10px #ffd84a}
.bf-conv span.on::after{content:"";position:absolute;inset:0;background:var(--bison) center/cover no-repeat,rgba(80,50,0,.85);border-radius:6px;animation:bf-pop .5s}
.bf-conv em{font-style:normal;font-size:12px;color:#ffe6a0}
.bf-reelwrap{position:relative;flex:1 1 0;min-height:0}
.bf-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px;border-radius:14px;background:linear-gradient(#ffe0b0,#a0581a 40%,#f2b878 60%,#5a2a08);
  box-shadow:0 0 0 2px #120804,0 0 0 4px var(--acc),0 0 26px color-mix(in srgb,var(--acc) 45%,transparent),0 10px 20px rgba(0,0,0,.6)}
.bf-cv{display:block;border-radius:6px;background:#0a0503;touch-action:manipulation;cursor:pointer}
.bf-ovl{position:absolute;inset:8px;display:grid;place-items:center;pointer-events:none;border-radius:6px;overflow:hidden}
.bf-card{padding:14px 22px;border-radius:14px;background:rgba(10,4,0,.8);border:2px solid var(--acc);text-align:center;box-shadow:0 0 30px color-mix(in srgb,var(--acc) 60%,transparent);animation:bf-pop .35s cubic-bezier(.3,1.6,.5,1);max-width:92%}
.bf-card b{display:block;font:400 clamp(20px,4vw,38px)/1.1 "Bungee",Impact,sans-serif;color:var(--acc);text-shadow:0 0 14px color-mix(in srgb,var(--acc) 70%,transparent)}
.bf-card span{font-size:clamp(12px,1.8vw,16px);color:#fff}
@keyframes bf-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.bf-meters{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bf-led{background:linear-gradient(#000,#140a04);border:2px solid #2a1c12;border-radius:8px;padding:4px 6px 5px;text-align:center;box-shadow:inset 0 0 10px #000;min-width:0}
.bf-led span{display:block;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#a8957a}
.bf-led b{display:block;font:400 clamp(11px,2vw,17px)/1.3 "Press Start 2P",monospace;color:#ff7a2a;text-shadow:0 0 8px rgba(255,110,20,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.bf-led.win b{color:#4dff6a;text-shadow:0 0 8px rgba(40,255,80,.8)}
.bf-msg{flex:none;min-height:1.5em;text-align:center;font-weight:600;font-size:clamp(13px,1.8vw,16px);color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bf-msg.win{color:#9dffb0}.bf-msg.lose{color:#ffb0a8}.bf-msg.gold{color:var(--acc)}
.bf-deck{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;padding:8px;border-radius:12px;background:linear-gradient(#24160c,#0a0603);box-shadow:inset 0 1px 0 rgba(255,220,180,.14),inset 0 0 0 1px rgba(255,180,90,.18),0 3px 0 rgba(0,0,0,.6)}
.bf-grp{display:flex;align-items:center;gap:6px}.bf-grp>span{font-size:10px;letter-spacing:.12em;color:#a8957a;font-weight:700}
.bf-btn{font:700 14px "Chakra Petch",system-ui,sans-serif;color:#fff;background:linear-gradient(#4a3a2c,#1a120a);border:1px solid rgba(255,220,180,.25);border-radius:10px;min-height:44px;min-width:44px;padding:0 12px;cursor:pointer;box-shadow:0 3px 0 #000;letter-spacing:.03em}
.bf-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #000}.bf-btn:disabled{opacity:.4;cursor:not-allowed}
.bf-seg{display:flex;border-radius:10px;overflow:hidden;box-shadow:0 3px 0 #000}.bf-seg .bf-btn{border-radius:0;box-shadow:none;min-width:46px;padding:0 8px}
.bf-seg .bf-btn.on{background:linear-gradient(color-mix(in srgb,var(--acc) 85%,#fff),color-mix(in srgb,var(--acc) 70%,#000));color:#160c00;border-color:var(--acc)}
.bf-units{min-width:34px;text-align:center;font:400 14px "Press Start 2P",monospace;color:var(--acc)}
.bf-btn.bf-auto.on{background:linear-gradient(#2a8a3a,#0a3a14);border-color:#7dff9a}
.bf-spin{min-width:128px;min-height:56px;border-radius:30px;font:400 20px "Bungee",Impact,sans-serif;color:#1a0c00;border:2px solid color-mix(in srgb,var(--acc) 60%,#fff);
  background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.75),transparent 45%),linear-gradient(color-mix(in srgb,var(--acc) 90%,#fff),color-mix(in srgb,var(--acc) 60%,#000));
  box-shadow:0 4px 0 #000,0 0 18px color-mix(in srgb,var(--acc) 55%,transparent)}
.bf-spin.stop{background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.6),transparent 45%),linear-gradient(#ff6a5a,#8a0a10);color:#fff;border-color:#ffb0a8}
.bf-spin kbd{display:block;font:7px "Press Start 2P",monospace;opacity:.6;margin-top:-2px}
.bf-pt{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:12px}
.bf-pt[hidden],.bf-big[hidden]{display:none}
.bf-pt-in{position:relative;width:min(780px,100%);max-height:100%;overflow:auto;background:linear-gradient(#1f140b,#0e0905);border:1px solid var(--acc);border-radius:14px;padding:16px 18px;line-height:1.45}
.bf-pt-x{position:sticky;top:0;float:right;z-index:2;background:#000}
.bf-pt h3{font:400 22px "Bungee",Impact,sans-serif;color:var(--acc);margin:.1em 0 .4em}.bf-pt h4{color:var(--acc);margin:1em 0 .3em;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.bf-pt p{margin:.4em 0}
.bf-paygrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.bf-pg{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border-radius:8px;padding:6px}.bf-pg img{width:56px;height:56px;flex:none;background:linear-gradient(#3a1830,#c2452a 70%,#3a1a10);border-radius:6px}
.bf-pg div{font-size:12px;line-height:1.35}.bf-pg b{color:var(--acc)}.bf-pg.wide{grid-column:1/-1}
.bf-ways{display:flex;gap:4px;align-items:flex-end;flex-wrap:wrap;margin:.3em 0}.bf-ways i{display:grid;grid-template-rows:repeat(4,10px);gap:2px;font-style:normal}
.bf-ways i u{display:block;width:16px;height:10px;border-radius:2px;background:#3a2a1e;text-decoration:none}.bf-ways i u.y{background:var(--acc)}
.bf-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:24}
.bf-coins{position:absolute;inset:0;pointer-events:none;z-index:26;overflow:hidden}
.bf-coin{position:absolute;top:-40px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c0,#f7c948 40%,#a0680a 100%);box-shadow:inset 0 0 0 3px #c98a12,0 2px 4px rgba(0,0,0,.5);animation:bf-fall linear forwards}
@keyframes bf-fall{0%{transform:translateY(0) rotateY(0)}100%{transform:translateY(110vh) rotateY(1080deg)}}
.bf-big{position:absolute;inset:0;z-index:27;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,rgba(60,20,0,.5),rgba(0,0,0,.7));cursor:pointer;animation:bf-fade .3s}
.bf-big-in{display:grid;justify-items:center;gap:10px;text-align:center;padding:18px 22px;border-radius:20px;background:radial-gradient(ellipse,rgba(0,0,0,.55),transparent 70%)}
.bf-big-t{font:400 clamp(34px,9vw,92px)/1 "Bungee",Impact,sans-serif;background:linear-gradient(#fff 0%,#ffd84a 40%,#ff8a1a 75%,#8a3000 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 0 #000) drop-shadow(0 0 24px rgba(255,160,40,.7));animation:bf-throb .9s ease-in-out infinite}
.bf-big-a{font:400 clamp(22px,6vw,56px)/1.2 "Press Start 2P",monospace;color:#fff6c0;text-shadow:0 0 12px #ffb000,0 3px 0 #000;font-variant-numeric:tabular-nums}
.bf-big small{font-size:13px;color:#e9dfc8;opacity:.75;letter-spacing:.08em}
@keyframes bf-throb{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes bf-fade{from{opacity:0}}
.bf-shake .bf-cab{animation:bf-shake .11s linear infinite}
@keyframes bf-shake{0%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}50%{transform:translate(2px,-2px)}75%{transform:translate(-1px,2px)}100%{transform:translate(0,0)}}
.bf-flash::after{content:"";position:absolute;inset:0;background:#fff8e8;opacity:0;pointer-events:none;z-index:29;animation:bf-flash 1s ease-out}
@keyframes bf-flash{0%{opacity:0}6%{opacity:.8}14%{opacity:.08}22%{opacity:.55}100%{opacity:0}}
@media (max-width:560px){.bf-ttl small{display:none}.bf-stage{padding:6px 6px 8px}.bf-cab{padding:9px;gap:6px;border-radius:18px 18px 12px 12px}.bf-marq{min-height:46px;padding:7px 8px}.bf-marq-x{font-size:11px}.bf-tag{letter-spacing:.18em;font-size:9px}
  .bf-spin{min-width:104px;font-size:18px;min-height:52px}.bf-deck{gap:6px;padding:6px}.bf-btn{padding:0 9px;font-size:13px}.bf-seg .bf-btn{min-width:42px}.bf-spin kbd{display:none}}
@media (max-width:560px) and (min-height:700px){.bf-marq{min-height:84px;padding:12px 8px}.bf-logo{font-size:30px}.bf-led b{font-size:13px}.bf-deck{padding:10px 6px}.bf-btn{min-height:48px}.bf-spin{min-height:58px;min-width:120px}}
@media (prefers-reduced-motion:reduce){.bf-coin{display:none}.bf-shake .bf-cab,.bf-big-t{animation:none}.bf-flash::after{animation:none}}
`;
  document.head.appendChild(s);
}

// =====================================================================================================
// Sprites
// =====================================================================================================
const PAINT = {
  bison: c => pBison(c), gold: c => pBisonHead(c, GOLDP), eagle: pEagle, wolf: pWolf, cougar: pCougar, elk: pElk, wild: pSunsetWild, coin: pCoin,
  A: c => pCarved(c, 'A', '#3ac8c0'), K: c => pCarved(c, 'K', '#e04a2a'), Q: c => pCarved(c, 'Q', '#e8b030'), J: c => pCarved(c, 'J', '#4a8ae0'), T: c => pCarved(c, '10', '#8ac84a'), N: c => pCarved(c, '9', '#c070d8')
};
function renderSymbol(sym, w, h, dpr, scale = .9) {
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
  const p = PAINT[sym]; if (!p) return cv;
  const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height;
  const c = tmp.getContext('2d'), s = Math.min(w, h) * scale;
  c.scale(dpr, dpr); c.translate((w - s) / 2, (h - s) / 2); c.scale(s / 100, s / 100);
  c.save(); try { p(c); } catch (e) { /* never break the reels on a paint error */ } c.restore();
  const o = cv.getContext('2d'); o.shadowColor = 'rgba(0,0,0,.65)'; o.shadowBlur = 5 * dpr; o.shadowOffsetY = 2 * dpr; o.drawImage(tmp, 0, 0);
  return cv;
}
function blurSprite(src) {
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const c = cv.getContext('2d');
  const n = 7, spread = src.height * .24;
  for (let i = 0; i < n; i++) { c.globalAlpha = i === (n >> 1) ? .5 : .28; c.drawImage(src, 0, (i / (n - 1) - .5) * spread); }
  return cv;
}
const thumbCache = {};
function thumb(sym, px = 80) { const k = sym + px; return thumbCache[k] || (thumbCache[k] = renderSymbol(sym, px, px, 1, .92).toDataURL()); }
const easeOutBack = t => { const c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOut = t => 1 - Math.pow(1 - t, 3);

// =====================================================================================================
// Sounds: thunder rolls, hoof beats and prairie wind from noise + K.tone
// =====================================================================================================
function makeSounds(bag) {
  function nz(dur, { vol = .2, delay = 0, type = 'lowpass', f = 1000, f2 = 0, q = .8, brown = false, attack = .005 } = {}) {
    if (K.isMuted()) return; const a = K.audioCtx(); if (!a) return;
    try {
      const t = a.currentTime + delay, n = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      const s = a.createBufferSource(); s.buffer = buf;
      const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
      const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(fl).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + .05); bag.add(s); s.onended = () => bag.delete(s);
    } catch (e) { /* audio unavailable */ }
  }
  const S = {
    thunder(delay = 0) {
      nz(.2, { vol: .22, type: 'highpass', f: 1400, delay });
      nz(2.4, { vol: .6, type: 'lowpass', f: 420, f2: 90, brown: true, attack: .05, delay });
      nz(1.8, { vol: .4, type: 'lowpass', f: 260, f2: 70, brown: true, attack: .25, delay: delay + .5 });
      K.tone(46, 1.3, { type: 'sine', vol: .12, delay, slide: -10 });
    },
    hoof(delay = 0, v = 1) { K.tone(88, .1, { type: 'sine', vol: .2 * v, slide: -40, delay }); nz(.06, { vol: .3 * v, type: 'lowpass', f: 650, delay }); },
    gallop(delay = 0, v = 1) { S.hoof(delay, v * .7); S.hoof(delay + .075, v * .8); S.hoof(delay + .17, v); },
    wind(delay = 0, v = 1) { nz(2.8, { vol: .07 * v, type: 'bandpass', f: 360, f2: 1100, q: 2.5, attack: .9, delay }); },
    huff() { nz(.32, { vol: .2, type: 'bandpass', f: 460, f2: 170, q: 1.2, attack: .03 }); },
    spinStart() { K.tone(150, .35, { type: 'sawtooth', vol: .03, slide: 240 }); nz(.4, { vol: .05, type: 'bandpass', f: 500, f2: 1400, q: 1.5, attack: .1 }); },
    coin(k = 0) { [1318, 1760, 2093].forEach((f, i) => K.tone(f * (1 + k * .06), .22, { type: 'triangle', vol: .08, delay: i * .05 })); },
    wild() { [392, 494, 587, 784].forEach((f, i) => K.tone(f, .3, { type: 'triangle', vol: .055, delay: i * .03 })); },
    mult(m) { K.tone(m === 3 ? 988 : 784, .18, { type: 'square', vol: .045 }); K.tone(m === 3 ? 1318 : 1046, .25, { type: 'triangle', vol: .07, delay: .08 }); },
    bell(k = 0) { K.tone(1568 + k * 40, .55, { type: 'sine', vol: .1 }); K.tone(2349 + k * 60, .4, { type: 'sine', vol: .05, delay: .02 }); },
    convert() { [262, 330, 392, 523, 659, 784].forEach((f, i) => K.tone(f, .24, { type: 'triangle', vol: .08, delay: i * .07 })); S.thunder(.4); },
    feature() { S.thunder(); [196, 262, 330, 392, 523].forEach((f, i) => K.tone(f, .5, { type: 'triangle', vol: .07, delay: .3 + i * .12 })); }
  };
  return S;
}

// =====================================================================================================
// The machine screen
// =====================================================================================================
const STEPS = [20, 40, 60, 80, 100];
function mountWays(cfg, root, api) {
  injectBf();
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const sleep = ms => new Promise(r => later(r, ms));
  const R = K.rand;
  const bag = new Set(), S = makeSounds(bag);
  root.innerHTML = '';
  const el = document.createElement('div'); el.className = `bf-screen bf-${cfg.key}`;
  el.style.setProperty('--cab', cfg.theme.cabinet); el.style.setProperty('--acc', cfg.theme.accent); el.style.setProperty('--glass', cfg.theme.glass);
  const gm = cfg.goldHeads ? `<div class="bf-gm"><div class="bf-gm-l">GOLDEN HEADS · EVERY 3 TURN AN ANIMAL INTO BISON</div><div class="bf-heads">${'<i></i>'.repeat(HEAD_MAX)}</div><div class="bf-conv">${CONV_ORDER.map(s => `<span data-c="${s}" title="${NAMES[s]}"></span>`).join('')}<em>&rarr;</em><span class="b" title="Bison"></span></div></div>` : '';
  el.innerHTML = `
  <header class="bf-top">
    <button type="button" class="bf-ib bf-leave">&#8249; Floor</button>
    <div class="bf-ttl"><b></b><small></small></div>
    <button type="button" class="bf-ib bf-pt-b">Paytable</button>
  </header>
  <main class="bf-stage">
    <div class="bf-cab">
      <div class="bf-marq"><div class="bf-logo"></div><div class="bf-tag"></div>${gm}<div class="bf-marq-x"></div></div>
      <div class="bf-reelwrap"><div class="bf-frame"><canvas class="bf-cv" aria-label="Reels" role="img"></canvas><div class="bf-ovl"></div></div></div>
      <div class="bf-meters"><div class="bf-led"><span>CREDITS</span><b class="m-cred"></b></div><div class="bf-led"><span>BET</span><b class="m-bet"></b></div><div class="bf-led win"><span>WIN</span><b class="m-win">$0</b></div></div>
      <div class="bf-msg" aria-live="polite"></div>
      <div class="bf-deck">
        <div class="bf-grp"><span>COIN</span><div class="bf-seg">${[1, 5, 25].map(v => `<button type="button" class="bf-btn" data-coin="${v}">$${v}</button>`).join('')}</div></div>
        <div class="bf-grp"><span>CREDITS</span><button type="button" class="bf-btn bf-dn" aria-label="Bet fewer credits">&minus;</button><b class="bf-units"></b><button type="button" class="bf-btn bf-up" aria-label="Bet more credits">+</button></div>
        <button type="button" class="bf-btn bf-max">MAX BET</button>
        <button type="button" class="bf-btn bf-auto">AUTO</button>
        <button type="button" class="bf-btn bf-spin">SPIN<kbd>SPACE</kbd></button>
      </div>
    </div>
  </main>
  <div class="bf-pt" hidden><div class="bf-pt-in"><button type="button" class="bf-ib bf-pt-x">Close</button><div class="bf-pt-body"></div></div></div>
  <canvas class="bf-fx" aria-hidden="true"></canvas>
  <div class="bf-coins"></div>
  <div class="bf-big" hidden role="button" aria-label="Skip win count"><div class="bf-big-in"><b class="bf-big-t"></b><div class="bf-big-a"></div><small>TAP OR SPACE TO SKIP</small></div></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  $('.bf-ttl b').textContent = cfg.title; $('.bf-ttl small').textContent = cfg.blurb; $('.bf-logo').textContent = cfg.title; $('.bf-tag').textContent = cfg.tag;
  const cv = $('.bf-cv'), ctx = cv.getContext('2d'), wrap = $('.bf-reelwrap'), ovl = $('.bf-ovl'), mx = $('.bf-marq-x');
  const fxCv = $('.bf-fx'), fx = fxCv.getContext('2d');
  const mCred = $('.m-cred'), mBet = $('.m-bet'), mWin = $('.m-win'), msgEl = $('.bf-msg');
  const spinBtn = $('.bf-spin'), autoBtn = $('.bf-auto'), maxBtn = $('.bf-max'), upBtn = $('.bf-up'), dnBtn = $('.bf-dn');
  const coinBtns = [...el.querySelectorAll('[data-coin]')];
  const bigEl = $('.bf-big');

  // ------------------------------------------------------------------ state
  let coin = 1, units = 20, busy = false, auto = 0, mode = 'base';
  let fsCoin = 1, fsUnits = 20;
  let curSet = cfg.baseSet, conv = new Set();
  let ovGrid = null, wmGrid = null, hl = null, herd = null, bw = null;
  const pops = new Map(); let dust = [], fxDust = [];
  const reels = curSet.map(d => { const L = d.strip.length; return { L, pos: R(L), state: 'idle', v: 0, t0: 0, from: 0, to: 0, dur: 0, stopAt: 0, target: 0, speed: 0, p0: 0, antic: false }; });
  let win = { from: 0, to: 0, t0: 0, dur: 0, shown: 0, lastTick: 0 };
  let dirty = true, curGrid = null;

  const k10 = u => u / BASE_CR;                // pay multiplier for a bet of u credits
  const totalBet = () => coin * units;
  const betNow = () => mode === 'base' ? totalBet() : fsCoin * fsUnits;
  function msg(t, kind = '') { msgEl.textContent = t; msgEl.className = 'bf-msg ' + kind; }
  function syncControls() {
    const locked = busy || mode !== 'base';
    coinBtns.forEach(b => { const on = +b.dataset.coin === coin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.disabled = locked; });
    $('.bf-units').textContent = units;
    upBtn.disabled = dnBtn.disabled = maxBtn.disabled = locked;
    const spinning = reels.some(r => r.state !== 'idle');
    spinBtn.disabled = mode !== 'base' || (busy && !spinning);
    spinBtn.classList.toggle('stop', spinning && mode === 'base');
    spinBtn.firstChild.textContent = spinning && mode === 'base' ? 'STOP' : 'SPIN';
    autoBtn.classList.toggle('on', auto > 0); autoBtn.textContent = auto > 0 ? `STOP ${auto}` : 'AUTO';
    autoBtn.disabled = mode !== 'base' && auto === 0;
    mBet.textContent = K.fmt(mode === 'free' ? 0 : totalBet());
  }
  const setCred = b => { mCred.textContent = K.fmt(b); };
  setCred(api.balance);
  const unsubBal = api.onBalance ? api.onBalance(setCred) : null;

  // ------------------------------------------------------------------ geometry + sprites
  let G = { cw: 100, ch: 100, gap: 4, W: 300, H: 300, dpr: 1 };
  let sprites = {}, blurs = {}, sky = null, shade = null;
  function layout() {
    const r = wrap.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const FR = 16, gap = 4, aw = r.width - FR, ah = r.height - FR;
    const cw = Math.max(30, Math.min((aw - (REELS - 1) * gap) / REELS, ah / ROWS * 1.2));
    const ch = Math.max(28, Math.min(ah / ROWS, cw / .8));
    const W = Math.round(REELS * cw + (REELS - 1) * gap), H = Math.round(ROWS * ch), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W === G.W && H === G.H && dpr === G.dpr && sprites.bison) return;
    G = { cw, ch, gap, W, H, dpr };
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    buildSprites();
  }
  function buildSprites() {
    sprites = {}; blurs = {};
    for (const s of Object.keys(PAINT)) { sprites[s] = renderSymbol(s, G.cw, G.ch, G.dpr); blurs[s] = blurSprite(sprites[s]); }
    // sunset sky behind the reels
    const W = G.W, H = G.H; sky = document.createElement('canvas'); sky.width = Math.round(W * G.dpr); sky.height = Math.round(H * G.dpr);
    const c = sky.getContext('2d'); c.scale(G.dpr, G.dpr);
    const hz = H * .8;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#120a26'], [.35, '#3e1640'], [.62, '#8e2c3c'], [.84, '#d8562a'], [1, '#ffae4a']]); c.fillRect(0, 0, W, hz);
    const rnd = mulberry(5); c.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) { c.globalAlpha = .2 + rnd() * .6 * (1 - i / 60); c.beginPath(); c.arc(rnd() * W, rnd() * H * .35, rnd() * 1.1 + .3, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    c.fillStyle = rad(c, W * .5, hz, 4, W * .5, hz, H * .55, [[0, 'rgba(255,240,180,.95)'], [.12, 'rgba(255,200,90,.7)'], [.4, 'rgba(255,120,40,.25)'], [1, 'rgba(255,90,40,0)']]); c.fillRect(0, 0, W, hz);
    c.beginPath(); c.arc(W * .5, hz, H * .13, Math.PI, 0); c.fillStyle = rad(c, W * .5, hz, 2, W * .5, hz, H * .13, [[0, '#fffbe6'], [.6, '#ffd36a'], [1, '#ff8a2a']]); c.fill();
    c.fillStyle = 'rgba(255,170,140,.28)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(W * (.1 + rnd() * .8), H * (.38 + rnd() * .3), W * (.08 + rnd() * .12), 2 + rnd() * 3, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#3a1420';
    c.beginPath(); c.moveTo(0, hz); let x = 0;
    while (x < W) { const w = W * (.06 + rnd() * .12), mesa = rnd() < .45, h = H * (mesa ? .08 + rnd() * .08 : .02 + rnd() * .03); if (mesa) { c.lineTo(x + w * .15, hz - h); c.lineTo(x + w * .85, hz - h); } else c.lineTo(x + w * .5, hz - h); x += w; c.lineTo(Math.min(W, x), hz - H * .01); }
    c.lineTo(W, hz); c.closePath(); c.fill();
    c.fillStyle = lin(c, 0, hz, 0, H, [[0, '#4a1e10'], [1, '#1a0904']]); c.fillRect(0, hz, W, H - hz);
    c.strokeStyle = 'rgba(255,170,90,.18)'; c.lineWidth = 1; for (let i = 0; i < 40; i++) { const gx = rnd() * W, gy = hz + rnd() * (H - hz); c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 2, gy - 4 - rnd() * 4); c.stroke(); }
    c.fillStyle = 'rgba(10,4,2,.28)'; c.fillRect(0, 0, W, H);
    shade = lin(ctx, 0, 0, 0, H, [[0, 'rgba(0,0,0,.5)'], [.14, 'rgba(0,0,0,0)'], [.86, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.5)']]);
    dirty = true; buildGoldMeter();
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) buildSprites(); });

  // ------------------------------------------------------------------ gold meter (Thunder Plains Gold)
  function buildGoldMeter() {
    if (!cfg.goldHeads) return;
    el.style.setProperty('--head', `url(${thumb('gold', 40)})`); el.style.setProperty('--bison', `url(${thumb('bison', 48)})`);
    el.querySelectorAll('.bf-conv span').forEach(sp => { sp.style.backgroundImage = `url(${thumb(sp.dataset.c || 'bison', 48)})`; });
  }
  function setGoldMeter(heads, cv$) {
    if (!cfg.goldHeads) return;
    el.querySelectorAll('.bf-heads i').forEach((h, i) => h.classList.toggle('on', i < heads));
    el.querySelectorAll('.bf-conv span[data-c]').forEach(sp => sp.classList.toggle('on', cv$.has(sp.dataset.c)));
  }

  // ------------------------------------------------------------------ paytable
  const pt = $('.bf-pt');
  function openPaytable() {
    const k = k10(units), th = s => thumb(s, 80);
    const pays = p => [5, 4, 3].map(n => `${n} reels · <b>${(p[n] * k).toLocaleString()}</b>`).join('<br>');
    let h = `<h3>${cfg.title}</h3>
      <p>5 reels × 4 rows, <b>1,024 ways</b>: there are no paylines. A symbol pays when it lands on <b>adjacent reels starting from the leftmost reel</b>, in any row. Each matching symbol on each reel multiplies the ways: two Bison on reel 1, one on reel 2 and three on reel 3 is 2 × 1 × 3 = <b>6 ways</b>.</p>
      <div class="bf-ways">${[[1, 0, 1, 0], [0, 0, 1, 0], [1, 1, 0, 1]].map(col => `<i>${col.map(y => `<u class="${y ? 'y' : ''}"></u>`).join('')}</i>`).join('')}<i>${'<u></u>'.repeat(4)}</i><i>${'<u></u>'.repeat(4)}</i></div>
      <p>The bet is ${BASE_CR}–${STEPS[STEPS.length - 1]} credits; a credit is worth the coin ($1, $5 or $25). Pays below are <b>credits per way at your current ${units}-credit bet</b>.</p>
      <h4>Pays</h4><div class="bf-paygrid">`;
    for (const s of PAYSYMS) h += `<div class="bf-pg"><img src="${th(s)}" alt=""><div><b>${NAMES[s]}</b>${s === 'bison' ? ' (stacked)' : ''}<br>${pays(cfg.pays[s])}</div></div>`;
    h += `<div class="bf-pg"><img src="${th('wild')}" alt=""><div><b>Sunset Wild</b><br>Reels 2, 3 and 4. Substitutes for every symbol except the Gold Coin.${cfg.wm3 != null ? '<br>In free games each wild in a win is <b>×2 or ×3</b>; several multiply together.' : ''}</div></div>`;
    h += `<div class="bf-pg"><img src="${th('coin')}" alt=""><div><b>Gold Coin</b><br>Reels 1, 3 and 5 only.<br>3 · 4 · 5+ anywhere pay <b>${SCAT_PAY[3]}× · ${SCAT_PAY[4]}× · ${SCAT_PAY[5]}×</b> total bet and award <b>${FS_AWARD[3]} · ${FS_AWARD[4]} · ${FS_AWARD[5]} free games</b>.</div></div>`;
    if (cfg.goldHeads) h += `<div class="bf-pg"><img src="${th('gold')}" alt=""><div><b>Golden Bison</b><br>Free games only, any reel. Pays as a Bison and fills the meter.</div></div>`;
    h += `</div><h4>Free games</h4><p>${FS_AWARD[3]}, ${FS_AWARD[4]} or ${FS_AWARD[5]} free games are played at the bet that triggered them. ${cfg.wm3 != null ? 'During free games each Sunset Wild that is part of a win randomly multiplies it <b>×2 or ×3</b>, and wild multipliers on the same way multiply together (two ×3 wilds make ×9).' : 'Free games use special reels with Golden Bison heads (see below).'} <b>2 or more</b> Gold Coins retrigger +${FS_RETRIG[2]}, +${FS_RETRIG[3]}, +${FS_RETRIG[4]} or +${FS_RETRIG[5]} games (up to ${FS_CAP} in one feature).</p>`;
    if (cfg.goldHeads) h += `<h4>Golden heads</h4><p>Golden Bison heads land only in free games. Each one fills a slot of the ${HEAD_MAX}-head meter above the reels. <b>Every 3 heads</b>, the lowest animal still standing turns into a Bison for the rest of the feature: first the <b>Wolf</b>, then the <b>Cougar</b>, the <b>Elk</b> and finally the <b>Eagle</b>. Converted symbols pay and count as Bison.</p>`;
    if (cfg.stampede) h += `<h4>Stampede</h4><p>On any base-game spin a herd can thunder across the screen at random (about 1 spin in ${Math.round(cfg.stampede[1] / cfg.stampede[0])}). It leaves <b>4 to 10 Bison</b> stacked across at least three reels from the left, never over a Gold Coin or a Sunset Wild, and the spin then pays with them in place.</p>`;
    h += `<h4>Theoretical return</h4><p>${RTP[cfg.id]}. Every outcome is decided by a cryptographic RNG the moment you spin; the reels, the herd and the free-game animations only reveal it.</p>
      <h4>Controls</h4><p>Space or SPIN to play (press again, or tap the reels, to stop early). Choose the coin and credits, or MAX BET to bet ${STEPS[STEPS.length - 1]} credits and spin. AUTO plays 25 games and stops on a feature or a big win. Tap the big-win count or press Space to skip it.</p>`;
    $('.bf-pt-body').innerHTML = h;
    pt.hidden = false; $('.bf-pt-x').focus();
  }
  $('.bf-pt-b').addEventListener('click', () => { K.sfx.button(); pt.hidden ? openPaytable() : (pt.hidden = true); });
  $('.bf-pt-x').addEventListener('click', () => { pt.hidden = true; });
  pt.addEventListener('click', e => { if (e.target === pt) pt.hidden = true; });
  $('.bf-leave').addEventListener('click', () => { K.sfx.button(); api.exit(); });

  // ------------------------------------------------------------------ bet controls
  coinBtns.forEach(b => b.addEventListener('click', () => { if (busy || mode !== 'base') return; coin = +b.dataset.coin; K.sfx.chip(); syncControls(); idleMsg(); }));
  const stepUnits = d => { const i = STEPS.indexOf(units); units = STEPS[(i + d + STEPS.length) % STEPS.length]; K.sfx.chip(); syncControls(); idleMsg(); };
  upBtn.addEventListener('click', () => !busy && mode === 'base' && stepUnits(1));
  dnBtn.addEventListener('click', () => !busy && mode === 'base' && stepUnits(-1));
  maxBtn.addEventListener('click', () => { if (busy || mode !== 'base') return; units = STEPS[STEPS.length - 1]; K.sfx.chip(); syncControls(); spin(); });
  spinBtn.addEventListener('click', () => { K.sfx.button(); spin(); });
  autoBtn.addEventListener('click', () => { K.sfx.button(); if (auto > 0) { auto = 0; syncControls(); return; } auto = 25; syncControls(); if (!busy) spin(); });
  cv.addEventListener('click', () => { if (reels.some(r => r.state !== 'idle')) quickStop(); });
  bigEl.addEventListener('click', () => skipBig());
  function idleMsg() { msg(`${units} credits × ${K.fmt(coin)} = ${K.fmt(totalBet())} a spin · 1,024 ways — press SPIN or Space`); }

  const onKey = e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape' && !pt.hidden) { pt.hidden = true; return; }
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault(); if (e.repeat || !pt.hidden) return;
      if (bw) { skipBig(); return; }
      if (reels.some(r => r.state !== 'idle')) { quickStop(); return; }
      if (win.shown < win.to && !busy) { win.shown = win.to; win.dur = 0; return; }
      spin();
    }
  };
  window.addEventListener('keydown', onKey);

  // ------------------------------------------------------------------ win meter roll-up
  function rollWin(to, from = 0) { const bet = Math.max(1, betNow()); win = { from, to, t0: performance.now(), dur: Math.min(3600, 350 + Math.sqrt(Math.max(0, to - from) / bet) * 420), shown: from, lastTick: 0 }; }
  function updWin(now) {
    if (win.shown >= win.to) return;
    const t = win.dur ? Math.min(1, (now - win.t0) / win.dur) : 1;
    win.shown = t >= 1 ? win.to : win.from + (win.to - win.from) * (1 - Math.pow(1 - t, 2));
    mWin.textContent = K.fmt(Math.floor(win.shown));
    if (now - win.lastTick > 75 && t < 1) { win.lastTick = now; K.tone(1400 + 600 * t, .03, { type: 'square', vol: .03 }); }
    if (t >= 1) mWin.textContent = K.fmt(win.to);
  }
  const setWinMeter = v => { win = { from: v, to: v, t0: 0, dur: 0, shown: v, lastTick: 0 }; mWin.textContent = K.fmt(v); };

  // ------------------------------------------------------------------ big-win celebration (counts up, tap to skip)
  const TIERS = [[10, 'BIG WIN'], [30, 'MEGA WIN'], [75, 'EPIC WIN']];
  function bigWin(amount, bet) {
    const x = amount / Math.max(1, bet);
    if (x < TIERS[0][0] || !alive) return Promise.resolve();
    return new Promise(res => {
      bw = { amount, bet, t0: performance.now(), dur: x >= 75 ? 7000 : x >= 30 ? 5200 : 3400, end: 0, tier: -1, res, lastTick: 0 };
      bigEl.hidden = false; coinShower(x >= 30 ? 60 : 30); K.sfx.bigWin(); S.gallop(0, .8); S.gallop(.4, .9);
    });
  }
  function updBig(now) {
    if (!bw) return;
    const t = Math.min(1, (now - bw.t0) / bw.dur), v = t >= 1 ? bw.amount : bw.amount * easeOut(t);
    let tier = 0; for (let i = 0; i < TIERS.length; i++) if (v >= TIERS[i][0] * bw.bet) tier = i;
    if (tier !== bw.tier) { bw.tier = tier; $('.bf-big-t').textContent = TIERS[tier][1]; if (tier > 0) { S.thunder(); coinShower(30); el.classList.remove('bf-flash'); void el.offsetWidth; el.classList.add('bf-flash'); } }
    $('.bf-big-a').textContent = K.fmt(Math.floor(v));
    if (t < 1 && now - bw.lastTick > 70) { bw.lastTick = now; K.tone(900 + 900 * t, .03, { type: 'square', vol: .03 }); }
    if (t >= 1 && !bw.end) { bw.end = now; K.sfx.win(); later(closeBig, 1500); }
  }
  function skipBig() { if (!bw) return; if (!bw.end) bw.t0 = performance.now() - bw.dur; else closeBig(); }
  function closeBig() { if (!bw) return; const r = bw.res; bw = null; bigEl.hidden = true; el.classList.remove('bf-flash'); r(); }

  // ------------------------------------------------------------------ reels animation
  const VMAX = 26;
  let reelsDone = null, anticTone = 0;
  function startReels(targets, anticFrom = 99) {
    const now = performance.now();
    reels.forEach((r, i) => {
      r.state = 'windup'; r.t0 = now + i * 55; r.p0 = r.pos; r.v = 0; r.target = targets[i];
      r.antic = i >= anticFrom;
      r.stopAt = now + 650 + i * 230 + (r.antic ? (i - anticFrom + 1) * 1150 : 0);
    });
    S.spinStart();
    const p = new Promise(res => { reelsDone = res; }); syncControls(); return p;
  }
  function quickStop() {
    const now = performance.now(); let k = 0;
    reels.forEach(r => { if (r.state === 'windup' || r.state === 'spin') { r.stopAt = Math.min(r.stopAt, now + k++ * 70); r.antic = false; } });
  }
  function beginStop(r, now) {
    r.state = 'stop'; r.t0 = now; r.dur = 400; r.from = r.pos;
    const D = Math.max(2, r.v * r.dur / 1000 / 3.2);
    r.to = r.target + r.L * Math.floor((r.pos - D - r.target) / r.L);
  }
  function updReels(now, dt) {
    let any = false;
    reels.forEach((r, i) => {
      if (r.state === 'idle') return; any = true;
      if (r.state === 'windup') { if (now < r.t0) return; const t = (now - r.t0) / 130; if (t >= 1) { r.state = 'spin'; r.v = 6; } else r.pos = r.p0 + .28 * Math.sin(t * Math.PI); r.speed = 0; return; }
      if (r.state === 'spin') {
        // suspense: anticipating reels slow to a crawl for their last stretch, glowing
        const slow = r.antic && now > r.stopAt - 1100;
        const vt = slow ? VMAX * .38 : VMAX;
        r.v = r.v < vt ? Math.min(vt, r.v + 70 * dt) : Math.max(vt, r.v - 40 * dt);
        r.pos -= r.v * dt; r.speed = r.v;
        if (now >= r.stopAt) beginStop(r, now);
        return;
      }
      if (r.state === 'stop') {
        const t = Math.min(1, (now - r.t0) / r.dur), prev = r.pos;
        r.pos = r.from + (r.to - r.from) * easeOutBack(t); r.speed = dt > 0 ? Math.abs(r.pos - prev) / dt : 0;
        if (t >= 1) { r.pos = mod(r.target, r.L); r.state = 'idle'; r.antic = false; r.speed = 0; K.sfx.reelStop(); onReelStopped(i); if (reels.every(q => q.state === 'idle')) syncControls(); }
      }
    });
    if (reels.some(r => r.antic && r.state === 'spin') && now - anticTone > 150) { anticTone = now; K.tone(420 + (now / 4 % 500), .12, { type: 'triangle', vol: .05 }); }
    if (any && reels.every(r => r.state === 'idle') && reelsDone) { const f = reelsDone; reelsDone = null; f(); }
    return any;
  }
  function onReelStopped(i) {
    if (!curGrid) return;
    const col = curGrid[i];
    const nc = col.filter(s => s === 'coin').length;
    if (nc) { const before = curGrid.slice(0, i).reduce((a, c) => a + c.filter(s => s === 'coin').length, 0); S.coin(before + nc); for (let r = 0; r < ROWS; r++) if (col[r] === 'coin') pops.set(i * ROWS + r, performance.now()); }
    if (col.includes('wild')) S.wild();
    if (col.includes('gold')) { S.bell(i); for (let r = 0; r < ROWS; r++) if (col[r] === 'gold') pops.set(i * ROWS + r, performance.now()); }
    if (col.filter(s => s === 'bison').length >= 3 && i <= 2) S.hoof(0, .6);
  }
  function setSet(set) { curSet = set; reels.forEach((r, i) => { r.L = set[i].strip.length; r.pos = mod(Math.round(r.pos), r.L); }); dirty = true; }

  // ------------------------------------------------------------------ drawing
  const cellX = i => i * (G.cw + G.gap), cellY = r => r * G.ch;
  const shownSym = (i, r) => ovGrid ? ovGrid[i][r] : curSet[i].strip[mod(Math.floor(reels[i].pos) + r, reels[i].L)];
  const dispSym = s => conv.has(s) ? 'bison' : s;
  function drawReel(i, now) {
    const r = reels[i], strip = curSet[i].strip, x = cellX(i), { cw, ch } = G;
    ctx.save(); ctx.beginPath(); ctx.rect(x, 0, cw, G.H); ctx.clip();
    if (r.antic) { ctx.fillStyle = `rgba(255,190,60,${.12 + .08 * Math.sin(now / 90)})`; ctx.fillRect(x, 0, cw, G.H); }
    const base = Math.floor(r.pos), frac = r.pos - base, blur = r.speed > 7, idle = r.state === 'idle';
    const charging = hl && hl.charge && now - hl.charge.t0 < 1300 ? hl.charge.set : null;
    for (let k = 0; k <= ROWS; k++) {
      if (idle && k === ROWS) break;
      const sym = dispSym(idle && ovGrid ? ovGrid[i][k] : strip[mod(base + k, r.L)]);
      if (idle && charging && charging.has(i * ROWS + k)) continue;
      const img = blur ? blurs[sym] : sprites[sym]; if (!img) continue;
      const pt0 = idle ? pops.get(i * ROWS + k) : null;
      if (pt0 != null) {
        const q = Math.min(1, (now - pt0) / 450); if (q >= 1) pops.delete(i * ROWS + k);
        const sc = 1 + .3 * Math.sin(q * Math.PI);
        ctx.save(); ctx.translate(x + cw / 2, (k - frac) * ch + ch / 2); ctx.scale(sc, sc); ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch); ctx.restore();
      } else ctx.drawImage(img, x, (k - frac) * ch, cw, ch);
      if (idle && wmGrid && wmGrid[i][k]) drawMult(wmGrid[i][k], x, k * ch, now);
    }
    ctx.fillStyle = shade; ctx.fillRect(x, 0, cw, G.H);
    if (r.antic) { const a = .45 + .3 * Math.sin(now / 90); ctx.strokeStyle = `rgba(255,214,90,${a})`; ctx.lineWidth = 5; ctx.strokeRect(x + 2.5, 2.5, cw - 5, G.H - 5); }
    ctx.restore();
  }
  function drawMult(m, x, y, now) {
    const s = Math.min(G.cw, G.ch), r = s * .17, cx = x + G.cw - r - 4, cy = y + r + 4, p = 1 + .08 * Math.sin(now / 140);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = m === 3 ? '#c41a1a' : '#1a5ad8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffe08a'; ctx.stroke();
    ctx.font = `400 ${Math.round(r * 1.05)}px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('×' + m, 0, 1);
    ctx.restore();
  }
  function winLabel(w, k) {
    if (w.scatter) return `${w.n} Gold Coins · ${(w.pay * k).toLocaleString()} credits`;
    const m = w.mults && w.mults.length ? ` · wild ${w.mults.slice(0, 4).map(x => '×' + x).join(' ')}${w.mults.length > 4 ? '…' : ''}` : '';
    return `${NAMES[w.sym]} ×${w.ways} way${w.ways > 1 ? 's' : ''}${m} · ${(w.pay * k).toLocaleString()} credits`;
  }
  function drawHighlights(now) {
    if (!hl) return;
    const { wins } = hl, cyc = wins.length > 1, all = !cyc || (now - hl.t0) < 1800;
    const idx = all ? -1 : Math.floor((now - hl.t0 - 1800) / 1600) % wins.length;
    const showing = all ? wins : [wins[idx]];
    const on = new Set(); showing.forEach(w => w.cells.forEach(([i, r]) => on.add(i * ROWS + r)));
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.5)';
    for (let i = 0; i < REELS; i++) for (let r = 0; r < ROWS; r++) if (!on.has(i * ROWS + r)) ctx.fillRect(cellX(i), cellY(r), G.cw, G.ch);
    const pulse = .6 + .4 * Math.sin(now / 130);
    ctx.globalAlpha = pulse; ctx.lineWidth = Math.max(3, G.ch * .045); ctx.strokeStyle = cfg.theme.accent; ctx.shadowColor = cfg.theme.accent; ctx.shadowBlur = 12;
    for (const key of on) { const i = Math.floor(key / ROWS), r = key % ROWS; rr(ctx, cellX(i) + 3, cellY(r) + 3, G.cw - 6, G.ch - 6, 8); ctx.stroke(); }
    ctx.restore();
    if (!all && hl.last !== idx) { hl.last = idx; const w = wins[idx]; msg(winLabel(w, hl.k), 'win'); if (w.sym === 'bison') startCharge(w, now); }
  }
  function startCharge(w, now) {
    const set = new Set(); for (const [i, r] of w.cells) if (dispSym(shownSym(i, r)) === 'bison') set.add(i * ROWS + r);
    if (!set.size) return; hl.charge = { set, t0: now }; S.huff(); S.gallop(.05, .7);
  }
  function drawCharge(now) {
    const C = hl && hl.charge; if (!C) return;
    const t = (now - C.t0) / 1300; if (t >= 1) { hl.charge = null; return; }
    const f = t < .3 ? easeOut(t / .3) : t < .62 ? 1 : 1 - easeOut((t - .62) / .38);
    const { cw, ch } = G, dx = -cw * .32 * f, shake = t < .7 ? Math.sin(now / 21) * ch * .03 : 0;
    for (const key of C.set) {
      const i = Math.floor(key / ROWS), r = key % ROWS, img = sprites[dispSym(shownSym(i, r))]; if (!img) continue;
      ctx.save(); ctx.translate(cellX(i) + cw / 2 + dx, cellY(r) + ch / 2 + shake); ctx.rotate(-.07 * f * Math.sin(now / 45)); ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch); ctx.restore();
      if (Math.random() < .6) dust.push({ x: cellX(i) + cw * (.62 + Math.random() * .3) + dx, y: cellY(r) + ch * (.78 + Math.random() * .12), vx: 20 + Math.random() * 50, vy: -10 - Math.random() * 25, r: 2 + Math.random() * 4, life: 0, max: .6 + Math.random() * .5 });
    }
  }
  function updDust(list, c, dt) {
    for (const p of list) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; p.r += dt * (p.grow || 10); }
    const out = list.filter(p => p.life < p.max);
    for (const p of out) { const a = (1 - p.life / p.max) * (p.a || .45); c.fillStyle = `rgba(${p.col || '196,148,98'},${a})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
    return out;
  }
  // ------------------------------------------------------------------ the herd (Stampede Rush)
  function sizeFx() {
    const w = el.clientWidth, h = el.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (fxCv.width !== Math.round(w * dpr) || fxCv.height !== Math.round(h * dpr)) { fxCv.width = Math.round(w * dpr); fxCv.height = Math.round(h * dpr); }
    return { w, h, dpr };
  }
  function drawFx(now, dt) {
    if (!herd && !fxDust.length) { if (fxCv.dataset.used) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxCv.width, fxCv.height); delete fxCv.dataset.used; } return; }
    fxCv.dataset.used = '1';
    const { w, h, dpr } = sizeFx(); fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, w, h);
    if (herd) {
      const H = herd, p = (now - H.t0) / H.dur, er = el.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      const rx = cr.left - er.left, ry = cr.top - er.top, size = Math.max(70, cr.height * .44);
      let front = -1e9;
      const order = H.bison.slice().sort((a, b) => a.lane - b.lane);
      for (const b of order) {
        const x = -size * 1.4 + (w + size * 2.8) * (p * 1.3 - b.off), y = ry + size * .05 + b.lane * (cr.height - size * .9) + Math.sin(now / 70 + b.ph) * 2;
        front = Math.max(front, x + size * .9);
        if (x < -size * 1.6 || x > w + size) continue;
        fx.save(); fx.translate(x + size, y); fx.scale(-size * b.s / 100, size * b.s / 100); pBison(fx, { leg: now / 1000 * 17 + b.ph }); fx.restore();
        if (Math.random() < .9) fxDust.push({ x: x + size * .2 + Math.random() * size * .3, y: y + size * b.s * .9, vx: -40 - Math.random() * 60, vy: -15 - Math.random() * 30, r: 4 + Math.random() * 8, life: 0, max: .9 + Math.random() * .7, grow: 18, a: .5 });
      }
      for (let i = 0; i < REELS; i++) if (!H.cols[i] && front > rx + 8 + cellX(i) + G.cw * .5) {
        H.cols[i] = true; const t = performance.now(); let any = false;
        for (const [ci, r] of H.cells) if (ci === i) { ovGrid[ci][r] = 'bison'; pops.set(ci * ROWS + r, t); any = true; for (let k = 0; k < 6; k++) dust.push({ x: cellX(ci) + G.cw * Math.random(), y: cellY(r) + G.ch * (.6 + Math.random() * .3), vx: (Math.random() - .5) * 60, vy: -20 - Math.random() * 30, r: 3 + Math.random() * 4, life: 0, max: .8, grow: 12 }); }
        if (any) S.hoof(0, 1.2);
        dirty = true;
      }
      if (p >= 1) { for (let i = 0; i < REELS; i++) H.cols[i] = true; for (const [ci, r] of H.cells) ovGrid[ci][r] = 'bison'; const d = H.done; herd = null; d(); }
    }
    fxDust = updDust(fxDust, fx, dt);
  }
  async function runStampede(cells) {
    mode = 'stampede'; syncControls();
    msg('STAMPEDE! The herd is coming…', 'gold'); S.thunder(); S.wind(0, 1.4);
    el.classList.add('bf-shake');
    const gal = () => { if (!herd) return; S.gallop(0, .9 + Math.random() * .3); later(gal, 230 + Math.random() * 60); };
    await new Promise(res => {
      herd = { t0: performance.now(), dur: 2600, cells, cols: Array(REELS).fill(false), done: res, bison: Array.from({ length: 11 }, (_, k) => ({ lane: (k % 4) / 3 + (Math.random() - .5) * .18, off: k * .028 + Math.random() * .05, ph: Math.random() * 6, s: .85 + Math.random() * .3 })) };
      gal();
    });
    el.classList.remove('bf-shake');
    if (!alive) return;
    card('STAMPEDE!', `${cells.length} bison left on the reels`, 1500); await sleep(900);
  }

  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const moving = updReels(now, dt); updWin(now); updBig(now);
    drawFx(now, dt);
    if (!(moving || hl || dirty || dust.length || pops.size || herd || wmGrid || reels.some(r => r.antic))) return;
    dirty = false;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    if (sky) ctx.drawImage(sky, 0, 0, G.W, G.H); else { ctx.fillStyle = '#1a0a0a'; ctx.fillRect(0, 0, G.W, G.H); }
    for (let i = 0; i < REELS; i++) drawReel(i, now);
    ctx.fillStyle = 'rgba(10,4,0,.55)'; for (let i = 1; i < REELS; i++) ctx.fillRect(cellX(i) - G.gap, 0, G.gap, G.H);
    drawHighlights(now); drawCharge(now);
    dust = updDust(dust, ctx, dt);
  }

  // ------------------------------------------------------------------ effects
  function card(title, sub, ms = 1800) { ovl.innerHTML = `<div class="bf-card"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; if (ms) later(() => { ovl.innerHTML = ''; }, ms); }
  function coinShower(n = 28) {
    const box = $('.bf-coins');
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'bf-coin'; c.style.left = (Math.random() * 100) + '%'; c.style.animationDuration = (1.4 + Math.random() * 1.4) + 's'; c.style.animationDelay = (Math.random() * .8) + 's'; const s = 20 + Math.random() * 18; c.style.width = c.style.height = s + 'px'; box.appendChild(c); later(() => c.remove(), 3400); }
  }
  function flash() { el.classList.remove('bf-flash'); void el.offsetWidth; el.classList.add('bf-flash'); later(() => el.classList.remove('bf-flash'), 1100); }

  // ------------------------------------------------------------------ play
  function anticFor(grid) { let n = 0; for (let i = 0; i < 3; i++) n += grid[i].filter(s => s === 'coin').length; return n >= 2 ? 3 : 99; }
  function showWins(res, k, t0) {
    if (res.wins.length) { hl = { wins: res.wins, t0, k, last: -2 }; const b = res.wins.find(w => w.sym === 'bison'); if (b) startCharge(b, t0); }
  }
  function winText(res, k) { return res.wins.length === 1 ? winLabel(res.wins[0], k) : `${res.wins.length} wins · ${(res.pay * k).toLocaleString()} credits`; }
  async function spin() {
    if (!alive || mode !== 'base') return;
    if (busy) { quickStop(); return; }
    if (!pt.hidden) pt.hidden = true;
    const bet = totalBet();
    if (!api.bet(bet)) { msg(`Not enough chips for a ${K.fmt(bet)} spin — lower the coin or credits.`, 'lose'); K.sfx.lose(); auto = 0; syncControls(); return; }
    busy = true; ovl.innerHTML = ''; setWinMeter(0); hl = null; wmGrid = null;
    msg('Good luck!', '');
    const o = playBase(cfg, R), k = k10(units);
    curGrid = o.pre; ovGrid = null;
    syncControls();
    await startReels(o.stops, anticFor(o.pre));
    if (!alive) return;
    ovGrid = o.pre.map(c => c.slice()); dirty = true;
    if (o.herd) { await runStampede(o.herd); if (!alive) return; ovGrid = o.grid.map(c => c.slice()); }
    const paid = o.res.pay * k * coin;
    if (paid > 0) api.win(paid);
    showWins(o.res, k, performance.now());
    if (paid > 0) {
      rollWin(paid); msg(winText(o.res, k), 'win');
      if (paid < bet * 10) K.sfx.win();
      await sleep(400); await bigWin(paid, bet); if (!alive) return;
    } else msg('No win — the plains are quiet.', '');
    let total = paid;
    if (o.res.fs) {
      if (paid > 0) await sleep(Math.min(2000, win.dur + 300));
      total += await runFree(o.res.fs);
    }
    if (!alive) return;
    busy = false; mode = 'base'; syncControls();
    if (auto > 0) {
      auto--; syncControls();
      if (total >= bet * 20 || o.res.fs) { auto = 0; syncControls(); msg(o.res.fs ? 'Auto play stopped after the feature.' : 'Auto play stopped on a big win.', 'gold'); }
      else if (auto > 0) later(() => { if (!busy && auto > 0) spin(); }, paid > 0 ? 1100 : 420);
    }
  }
  async function runFree(n) {
    mode = 'free'; fsCoin = coin; fsUnits = units; syncControls();
    const k = k10(fsUnits), bet = fsCoin * fsUnits, st = newFreeState();
    let left = n, played = 0, won = 0;
    S.feature(); flash(); card(`${n} FREE GAMES`, cfg.goldHeads ? 'Collect golden bison heads!' : 'Sunset wilds multiply ×2 or ×3', 2400);
    await sleep(2500); if (!alive) return won;
    if (cfg.freeSet) setSet(cfg.freeSet);
    conv = new Set(); setGoldMeter(0, conv); hl = null; ovGrid = null; dirty = true;
    const status = () => { mx.textContent = `FREE GAME ${played} of ${played + left} · WON ${K.fmt(won)}${cfg.goldHeads ? ` · HEADS ${st.heads}/${HEAD_MAX}` : ''}`; };
    while (left > 0 && played < FS_CAP && alive) {
      left--; played++; status(); msg(`Free game ${played} of ${played + left}`, 'gold');
      hl = null; wmGrid = null;
      const o = playFree(cfg, R, st);
      curGrid = o.grid; ovGrid = null;
      await startReels(o.stops, anticFor(o.grid)); if (!alive) return won;
      ovGrid = o.grid.map(c => c.slice());
      if (o.wm && o.wm.some(c => c.some(Boolean))) {
        wmGrid = o.wm; const t = performance.now();
        o.wm.forEach((c, i) => c.forEach((m, r) => { if (m) pops.set(i * ROWS + r, t); }));
        S.mult(Math.max(...o.wm.flat())); await sleep(350);
      }
      const paid = o.res.pay * k * fsCoin;
      if (paid > 0) {
        api.win(paid); rollWin(won + paid, won); won += paid; status();
        showWins(o.res, k, performance.now()); msg(winText(o.res, k), 'win');
        if (paid < bet * 10) K.sfx.win();
        await sleep(450); await bigWin(paid, bet); if (!alive) return won;
      }
      if (o.heads.length) {
        await sleep(300); setGoldMeter(st.heads, conv); o.heads.forEach(([i, r], j) => { pops.set(i * ROWS + r, performance.now()); S.bell(j); });
        msg(`+${o.heads.length} golden head${o.heads.length > 1 ? 's' : ''} · ${st.heads}/${HEAD_MAX}`, 'gold'); status();
        await sleep(600);
      }
      if (o.newConv.length) {
        for (const s of o.newConv) {
          conv.add(s); setGoldMeter(st.heads, conv); flash(); S.convert(); dirty = true;
          card(`${{ wolf: 'WOLVES', cougar: 'COUGARS', elk: 'ELK', eagle: 'EAGLES' }[s]} BECOME BISON!`, 'for the rest of the feature', 1900);
          await sleep(2000); if (!alive) return won;
        }
      }
      if (o.res.fs) {
        const add = Math.min(o.res.fs, FS_CAP - played - left);
        if (add > 0) { left += add; status(); S.feature(); card(`+${add} FREE GAMES`, 'Retriggered!', 1700); await sleep(1800); if (!alive) return won; }
      }
      await sleep(paid > 0 ? Math.min(2200, win.dur + 500) : 700);
    }
    if (!alive) return won;
    hl = null; wmGrid = null;
    card('FEATURE COMPLETE', `${played} free games paid ${K.fmt(won)}`, 2600); setWinMeter(won); S.gallop(0, .8); K.sfx.win();
    msg(`Free games paid ${K.fmt(won)}`, 'win');
    await sleep(1200); if (!alive) return won;
    await bigWin(won, bet); if (!alive) return won;
    await sleep(1400); if (!alive) return won;
    mx.textContent = ''; conv = new Set(); setGoldMeter(0, conv);
    if (cfg.freeSet) setSet(cfg.baseSet);
    ovGrid = null; mode = 'base'; dirty = true; syncControls();
    return won;
  }

  // ------------------------------------------------------------------ ambience + boot
  const amb = () => { if (mode === 'base' && !busy) { if (Math.random() < .5) S.wind(0, .6); else if (Math.random() < .3) S.thunder(); } later(amb, 9000 + Math.random() * 9000); };
  later(amb, 4000);
  syncControls(); setWinMeter(0); layout(); idleMsg(); raf = requestAnimationFrame(frame);
  return {
    unmount() {
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); ro.disconnect();
      window.removeEventListener('keydown', onKey); if (unsubBal) unsubBal();
      bag.forEach(s => { try { s.stop(); } catch (e) { /* already stopped */ } }); bag.clear();
      reelsDone = null; herd = null; bw = null; hl = null; root.innerHTML = '';
    }
  };
}

// =====================================================================================================
// Exports
// =====================================================================================================
export const _art = { PAINT, renderSymbol, pBison };   // symbol painters (browser only), for previews and tests

export const machines = CFGS.map(cfg => ({
  id: cfg.id, title: cfg.title, kind: 'slot', order: cfg.order, blurb: cfg.blurb, theme: { ...cfg.theme, reels: 5 },
  mount(root, api) { return mountWays(cfg, root, api); }
}));
export const [thunderPlains, thunderPlainsGold, stampedeRush] = machines;
export default machines[0];

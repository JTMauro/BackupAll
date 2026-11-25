// Valley Casino — procedural floor: textures, the hall, tables, slot machines, signage.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const HALL = { minX: -15, maxX: 15, minZ: -30, maxZ: 0, h: 5.2, door: 1.7 };

// ---------------------------------------------------------------- texture helpers
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return t;
}
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function fitFont(g, text, maxW, size, font) {
  let s = size; g.font = `${s}px ${font}`;
  while (g.measureText(text).width > maxW && s > 8) { s -= 2; g.font = `${s}px ${font}`; }
  return s;
}
const SERIF = '"Playfair Display", Georgia, serif', HEAD = '"Bungee", "Arial Black", Impact, sans-serif', PIX = '"Press Start 2P", monospace', BODY = '"Chakra Petch", sans-serif';
// Text bent around a circle (cx, cy, r) in canvas space, centred on angle `mid` (radians, canvas y down).
// `outward` false: tops of the letters face the centre (readable from outside the arc, below it).
function arcText(g, text, cx, cy, r, mid, size, font, color, { spacing = 1, outward = false } = {}) {
  g.save(); g.font = `${size}px ${font}`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const widths = [...text].map(ch => g.measureText(ch).width * spacing), total = widths.reduce((a, b) => a + b, 0);
  let a = mid + (outward ? -1 : 1) * total / 2 / r;
  [...text].forEach((ch, i) => {
    const da = widths[i] / r; a += (outward ? 1 : -1) * da / 2;
    g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + (outward ? Math.PI / 2 : -Math.PI / 2)); g.fillText(ch, 0, 0); g.restore();
    a += (outward ? 1 : -1) * da / 2;
  });
  g.restore();
}
function feltBase(g, w, h, color, dark) {
  const gr = g.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .5, Math.max(w, h) * .75);
  gr.addColorStop(0, color); gr.addColorStop(1, dark); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(w + h);
  for (let i = 0; i < w * h / 30; i++) { g.fillStyle = `rgba(${r() < .5 ? 255 : 0},${r() < .5 ? 255 : 0},${r() < .5 ? 255 : 0},.035)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
}

// Casino carpet: burgundy with gold and teal baroque medallions.
export function carpetTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#4a0d14'; g.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let i = 0; i < 50000; i++) { g.fillStyle = `rgba(${90 + r() * 60},${10 + r() * 20},${20 + r() * 20},.35)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    const tile = 256;
    for (let ty = 0; ty < h; ty += tile) for (let tx = 0; tx < w; tx += tile) {
      g.save(); g.translate(tx + tile / 2, ty + tile / 2);
      g.strokeStyle = '#c99a34'; g.lineWidth = 6; g.globalAlpha = .85;
      for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * Math.PI / 4); g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(30, 40, 10, 80, 44, 96); g.stroke();
        g.beginPath(); g.arc(44, 100, 9, 0, 6.28); g.fillStyle = '#167a7a'; g.fill(); g.restore(); }
      g.beginPath(); g.arc(0, 0, 26, 0, 6.28); g.fillStyle = '#e8c46a'; g.fill();
      g.beginPath(); g.arc(0, 0, 14, 0, 6.28); g.fillStyle = '#4a0d14'; g.fill();
      g.restore();
      // corner diamonds tie the tiles together
      g.save(); g.translate(tx, ty); g.rotate(Math.PI / 4); g.fillStyle = '#167a7a'; g.globalAlpha = .9; g.fillRect(-16, -16, 32, 32);
      g.strokeStyle = '#e8c46a'; g.lineWidth = 3; g.strokeRect(-22, -22, 44, 44); g.restore();
    }
    g.globalAlpha = 1;
  }, { repeat: [10, 10] });
}
// Lobby marble: cream tiles with grey veins and brass inlay lines.
export function marbleTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e9e1d2'; g.fillRect(0, 0, w, h);
    const r = rng(23);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(90,80,70,${.05 + r() * .12})`; g.lineWidth = .6 + r() * 2.5;
      g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (r() - .3) * 120; y += (r() - .5) * 90; g.lineTo(x, y); } g.stroke();
    }
    for (let x = 0; x <= w; x += 256) { g.fillStyle = '#b08d3c'; g.fillRect(x - 3, 0, 6, h); g.fillRect(0, x - 3, w, 6); }
    for (let y = 128; y < h; y += 256) for (let x = 128; x < w; x += 256) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = '#1d1a22'; g.fillRect(-14, -14, 28, 28); g.restore(); }
  }, { repeat: [6, 3] });
}
export function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0d10'); gr.addColorStop(1, '#3a1418'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // damask stripes
    g.globalAlpha = .18; g.fillStyle = '#e8c46a';
    for (let x = 32; x < w; x += 128) for (let y = 40; y < h; y += 110) { g.save(); g.translate(x + ((y / 110) % 2) * 64, y); g.beginPath();
      g.moveTo(0, -34); g.bezierCurveTo(26, -20, 26, 20, 0, 34); g.bezierCurveTo(-26, 20, -26, -20, 0, -34); g.fill(); g.restore(); }
    g.globalAlpha = 1;
  }, { repeat: [10, 2] });
}
export function ceilingTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#120a08'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6d5422'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.strokeStyle = '#2a1a10'; g.lineWidth = 30; g.strokeRect(50, 50, w - 100, h - 100);
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 3; g.strokeRect(70, 70, w - 140, h - 140);
  }, { repeat: [10, 10] });
}

// ---------------------------------------------------------------- table felts
// Felt textures are laid out in table-local metres: x across, z toward the player (+z), mapped to canvas (u right, v down).
function feltCanvas(bbox, ppm, draw) {
  const [minX, maxX, minZ, maxZ] = bbox, W = Math.round((maxX - minX) * ppm), H = Math.round((maxZ - minZ) * ppm);
  return canvasTex(W, H, (g, w, h) => { const P = (x, z) => [(x - minX) * ppm, (z - minZ) * ppm]; draw(g, w, h, P, ppm); });
}
// Semicircle tables (blackjack, three card, hold'em): dealer edge at z = -D, arc toward the player.
const SEMI = { rx: 1.15, rz: 1.0, D: .42 };
function semiFelt(o) {
  const ppm = 900, bbox = [-SEMI.rx, SEMI.rx, -SEMI.D, SEMI.rz - SEMI.D];
  return feltCanvas(bbox, ppm, (g, w, h, P) => {
    feltBase(g, w, h, o.felt, o.dark);
    const [cx, cy] = P(0, -SEMI.D);
    g.strokeStyle = 'rgba(255,240,200,.75)'; g.lineWidth = 5;
    g.beginPath(); g.ellipse(cx, cy, .55 * 900, .5 * 900, 0, 0, Math.PI); g.stroke();
    arcText(g, o.line1, cx, cy, .6 * 900, Math.PI / 2, 58, SERIF, o.ink || '#f5d77a', { spacing: 1.08 });
    arcText(g, o.line2, cx, cy, .43 * 900, Math.PI / 2, 34, BODY, 'rgba(255,245,220,.85)', { spacing: 1.1 });
    if (o.line3) arcText(g, o.line3, cx, cy, .33 * 900, Math.PI / 2, 28, BODY, 'rgba(255,245,220,.7)');
    // player spots along the outer arc
    const n = o.seats || 5;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (.12 + .76 * i / (n - 1)), px = Math.cos(a) * .86, pz = -SEMI.D + Math.sin(a) * .74;
      const [x, y] = P(px, pz);
      (o.spot || defaultSpot)(g, x, y, a);
    }
    // dealer card area
    g.strokeStyle = 'rgba(255,240,200,.35)'; g.lineWidth = 3; g.strokeRect(cx - 120, 30, 240, 120);
  });
}
function defaultSpot(g, x, y) { g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 62, 0, 6.28); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(x, y, 50, 0, 6.28); g.stroke(); }
function labeledSpots(labels) {
  return (g, x, y, a) => {
    g.save(); g.translate(x, y); g.rotate(a - Math.PI / 2);
    labels.forEach((l, i) => {
      const yy = (i - (labels.length - 1) / 2) * -105;
      g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineWidth = 4;
      if (l.diamond) { g.beginPath(); g.moveTo(0, yy - 48); g.lineTo(48, yy); g.lineTo(0, yy + 48); g.lineTo(-48, yy); g.closePath(); g.stroke(); }
      else { g.beginPath(); g.arc(0, yy, 44, 0, 6.28); g.stroke(); }
      g.fillStyle = '#fff2cc'; g.font = `600 22px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l.t, 0, yy);
    });
    g.restore();
  };
}
function crapsFelt() {
  const ppm = 700, L = 1.5, Wd = .6;
  return feltCanvas([-L, L, -Wd, Wd], ppm, (g, w, h, P) => {
    feltBase(g, w, h, '#16734a', '#0a4229');
    g.strokeStyle = '#f4f0e6'; g.lineWidth = 5; g.fillStyle = '#f4f0e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const half = (dir) => {
      g.save(); if (dir < 0) { g.translate(w, 0); g.scale(-1, 1); }
      const x0 = w * .56, x1 = w - 30;
      // pass line along the player rail (bottom) and round the end
      g.lineWidth = 5; g.strokeRect(x0, h - 120, x1 - x0, 90);
      g.save(); if (dir < 0) { g.translate(x0 + (x1 - x0) / 2, 0); g.scale(-1, 1); g.translate(-(x0 + (x1 - x0) / 2), 0); }
      g.font = `700 54px ${SERIF}`; g.fillText('PASS LINE', (x0 + x1) / 2, h - 75); g.restore();
      g.strokeRect(x0, h - 200, x1 - x0, 70);
      g.save(); if (dir < 0) { g.translate((x0 + x1) / 2, 0); g.scale(-1, 1); g.translate(-(x0 + x1) / 2, 0); }
      g.font = `700 32px ${BODY}`; g.fillText("DON'T PASS BAR  ⚀⚀", (x0 + x1) / 2, h - 165);
      // field
      g.strokeRect(x0, h - 340, x1 - x0, 130); g.font = `700 40px ${BODY}`;
      g.fillText('2 · 3 · 4 · 9 · 10 · 11 · 12', (x0 + x1) / 2, h - 300); g.font = `italic 700 46px ${SERIF}`; g.fillStyle = '#ffd34a'; g.fillText('FIELD', (x0 + x1) / 2, h - 245); g.fillStyle = '#f4f0e6';
      // come
      g.strokeRect(x0, 160, x1 - x0, h - 510); g.font = `700 110px ${SERIF}`; g.fillStyle = '#e0313f'; g.fillText('COME', (x0 + x1) / 2, 160 + (h - 510) / 2); g.fillStyle = '#f4f0e6';
      // place numbers row along the far side
      const nums = ['4', '5', 'SIX', '8', 'NINE', '10'], bw = (x1 - x0) / 6;
      nums.forEach((n, i) => { g.strokeRect(x0 + i * bw, 20, bw, 130); g.font = `700 ${n.length > 2 ? 34 : 64}px ${SERIF}`; g.fillText(n, x0 + i * bw + bw / 2, 92); });
      g.restore();
      g.restore();
    };
    half(1); half(-1);
    // centre: proposition box
    const cx0 = w * .38, cx1 = w * .62;
    g.strokeStyle = '#f4f0e6'; g.strokeRect(cx0, 30, cx1 - cx0, h - 60);
    g.fillStyle = '#e0313f'; g.font = `700 40px ${BODY}`; g.fillText('SEVEN · 4 TO 1', w / 2, 80);
    const dice = (x, y, a, b) => { for (const [k, v] of [[0, a], [1, b]]) { g.fillStyle = '#f4f0e6'; g.fillRect(x - 46 + k * 50, y - 22, 42, 42); g.fillStyle = '#c8102e'; g.font = `700 28px ${BODY}`; g.fillText(v, x - 25 + k * 50, y); } };
    dice(w * .44, 170, 3, 3); dice(w * .56, 170, 5, 5); dice(w * .44, 260, 2, 2); dice(w * .56, 260, 4, 4);
    g.fillStyle = '#ffd34a'; g.font = `700 22px ${BODY}`; g.fillText('9 TO 1', w * .44, 215); g.fillText('7 TO 1', w * .56, 215); g.fillText('7 TO 1', w * .44, 305); g.fillText('9 TO 1', w * .56, 305);
    dice(w * .44, 380, 1, 2); dice(w * .56, 380, 6, 6); dice(w * .44, 470, 1, 1); dice(w * .56, 470, 5, 6);
    g.fillStyle = '#ffd34a'; g.fillText('15 FOR 1', w * .44, 425); g.fillText('30 FOR 1', w * .56, 425); g.fillText('30 FOR 1', w * .44, 515); g.fillText('15 FOR 1', w * .56, 515);
    g.fillStyle = '#e0313f'; g.font = `700 36px ${BODY}`; g.fillText('ANY CRAPS · 7 TO 1', w / 2, h - 70);
    g.fillStyle = '#f4f0e6'; g.font = `700 30px ${BODY}`; g.fillText('C   E   C   E', w / 2, h - 140);
  });
}
function rouletteFelt(american) {
  const ppm = 700, bbox = [-1.25, 1.25, -.55, .55];
  return feltCanvas(bbox, ppm, (g, w, h, P) => {
    feltBase(g, w, h, '#167a46', '#0a4428');
    // wheel side (left third) is wood: the wheel mesh sits there
    g.fillStyle = '#3a1d0e'; g.fillRect(0, 0, w * .36, h);
    const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const gx0 = w * .42, gx1 = w * .95, gy0 = 50, gy1 = h * .62, cw = (gx1 - gx0) / 12, ch = (gy1 - gy0) / 3;
    g.strokeStyle = '#f4f0e6'; g.lineWidth = 3; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) {
      const n = c * 3 + (3 - r), x = gx0 + c * cw, y = gy0 + r * ch;
      g.strokeRect(x, y, cw, ch);
      g.fillStyle = REDS.has(n) ? '#c8102e' : '#111'; g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2, cw * .34, ch * .32, 0, 0, 6.28); g.fill();
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(ch * .36)}px ${BODY}`; g.fillText(n, x + cw / 2, y + ch / 2);
    }
    // zero(s)
    const zx = gx0 - cw * 1.1;
    g.strokeRect(zx, gy0, cw * 1.1, gy1 - gy0); g.fillStyle = '#0d7a3a';
    g.font = `700 ${Math.round(ch * .4)}px ${BODY}`; g.fillStyle = '#fff';
    if (american) { g.beginPath(); g.moveTo(zx, gy0 + (gy1 - gy0) / 2); g.lineTo(gx0, gy0 + (gy1 - gy0) / 2); g.stroke(); g.fillText('0', zx + cw * .55, gy0 + (gy1 - gy0) * .25); g.fillText('00', zx + cw * .55, gy0 + (gy1 - gy0) * .75); }
    else g.fillText('0', zx + cw * .55, gy0 + (gy1 - gy0) / 2);
    // dozens and outside bets
    const dy = gy1 + 10, dh = 70;
    ['1st 12', '2nd 12', '3rd 12'].forEach((t, i) => { g.strokeRect(gx0 + i * cw * 4, dy, cw * 4, dh); g.font = `700 34px ${SERIF}`; g.fillText(t, gx0 + i * cw * 4 + cw * 2, dy + dh / 2); });
    const oy = dy + dh + 6, oh = 70, labels = ['1-18', 'EVEN', '◆', '◆', 'ODD', '19-36'];
    labels.forEach((t, i) => {
      const x = gx0 + i * cw * 2; g.strokeRect(x, oy, cw * 2, oh);
      if (t === '◆') { g.fillStyle = i === 2 ? '#c8102e' : '#111'; g.beginPath(); g.moveTo(x + cw, oy + 10); g.lineTo(x + cw * 1.6, oy + oh / 2); g.lineTo(x + cw, oy + oh - 10); g.lineTo(x + cw * .4, oy + oh / 2); g.closePath(); g.fill(); g.fillStyle = '#fff'; }
      else { g.font = `700 30px ${BODY}`; g.fillText(t, x + cw, oy + oh / 2); }
    });
    for (let r = 0; r < 3; r++) { g.strokeRect(gx1, gy0 + r * ch, cw * .9, ch); g.font = `700 24px ${BODY}`; g.fillText('2 to 1', gx1 + cw * .45, gy0 + r * ch + ch / 2); }
  });
}
function baccaratFelt() {
  const ppm = 600, bbox = [-1.6, 1.6, -.5, .95];
  return feltCanvas(bbox, ppm, (g, w, h, P) => {
    feltBase(g, w, h, '#7a1420', '#3a0810');
    const [cx, cy] = P(0, -.5);
    g.strokeStyle = '#e8c46a'; g.lineWidth = 4;
    for (const [r, label, col] of [[1.18, 'PLAYER', '#7ab6ff'], [.92, 'BANKER', '#ff8a80'], [.68, 'TIE · 8 TO 1', '#9dffb0']]) {
      g.beginPath(); g.ellipse(cx, cy, r * 600 * 1.15, r * 600, 0, .1, Math.PI - .1); g.stroke();
      arcText(g, label, cx, cy, (r - .1) * 600, Math.PI / 2, 46, SERIF, col, { spacing: 1.2 });
    }
    arcText(g, 'BANKER PAYS 19 TO 20', cx, cy, .45 * 600, Math.PI / 2, 26, BODY, 'rgba(255,240,200,.75)');
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (.1 + .8 * i / 6), [x, y] = [cx + Math.cos(a) * 1.3 * 600 * 1.12, cy + Math.sin(a) * 1.3 * 600];
      g.fillStyle = '#e8c46a'; g.font = `700 40px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x, y - 20);
    }
    g.fillStyle = 'rgba(232,196,106,.9)'; g.font = `italic 700 60px ${SERIF}`; g.fillText('Baccarat', cx, 70);
  });
}
function sicboFelt() {
  const ppm = 600, bbox = [-.95, .95, -.5, .5];
  return feltCanvas(bbox, ppm, (g, w, h) => {
    feltBase(g, w, h, '#14407a', '#091f40');
    g.strokeStyle = '#e8c46a'; g.lineWidth = 3; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeRect(20, 20, 220, 200); g.font = `700 60px ${HEAD}`; g.fillText('SMALL', 130, 100); g.font = `20px ${BODY}`; g.fillText('4 – 10 · 1 TO 1', 130, 160);
    g.strokeRect(w - 240, 20, 220, 200); g.font = `700 60px ${HEAD}`; g.fillText('BIG', w - 130, 100); g.font = `20px ${BODY}`; g.fillText('11 – 17 · 1 TO 1', w - 130, 160);
    const tw = (w - 520) / 7;
    for (let i = 0; i < 14; i++) { const x = 260 + (i % 7) * tw, y = 20 + Math.floor(i / 7) * 100; g.strokeRect(x, y, tw, 100); g.font = `700 40px ${SERIF}`; g.fillText(String(4 + i), x + tw / 2, y + 50); }
    const fw = (w - 40) / 6;
    for (let i = 0; i < 6; i++) { const x = 20 + i * fw, y = h - 180; g.strokeRect(x, y, fw, 160);
      g.fillStyle = '#f4f0e6'; g.fillRect(x + fw / 2 - 40, y + 40, 80, 80); g.fillStyle = '#c8102e'; g.font = `700 54px ${BODY}`; g.fillText(String(i + 1), x + fw / 2, y + 82); g.fillStyle = '#fff'; }
    g.font = `700 50px ${HEAD}`; g.fillStyle = '#e8c46a'; g.fillText('SIC BO', w / 2, h / 2 - 20); g.font = `20px ${BODY}`; g.fillStyle = '#fff'; g.fillText('ANY TRIPLE 30 TO 1  ·  SPECIFIC TRIPLE 180 TO 1', w / 2, h / 2 + 30);
  });
}
function bigSixFelt() {
  const ppm = 600, bbox = [-.9, .9, -.3, .3];
  return feltCanvas(bbox, ppm, (g, w, h) => {
    feltBase(g, w, h, '#167a46', '#0a4428');
    const items = [['$1', '1 TO 1', '#f2f2f2'], ['$2', '2 TO 1', '#f2f2f2'], ['$5', '5 TO 1', '#f2f2f2'], ['$10', '10 TO 1', '#f2f2f2'], ['$20', '20 TO 1', '#f2f2f2'], ['★', '45 TO 1', '#ffd34a'], ['V', '45 TO 1', '#ff6b6b']];
    const bw = (w - 40) / items.length; g.textAlign = 'center'; g.textBaseline = 'middle';
    items.forEach(([t, p, c], i) => { const x = 20 + i * bw; g.strokeStyle = '#e8c46a'; g.lineWidth = 3; g.strokeRect(x + 6, 30, bw - 12, h - 60); g.fillStyle = c; g.font = `700 70px ${SERIF}`; g.fillText(t, x + bw / 2, h / 2 - 20); g.fillStyle = '#fff'; g.font = `22px ${BODY}`; g.fillText(p, x + bw / 2, h / 2 + 50); });
  });
}

// ---------------------------------------------------------------- shared materials
export const M = {};
function mats() {
  if (M.ready) return M; M.ready = true;
  M.wood = new THREE.MeshStandardMaterial({ color: 0x4a2512, roughness: .45, metalness: .1, map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6b3a1c'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(30,12,4,${.1 + r() * .25})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + (r() - .5) * 20, w * .6, y + (r() - .5) * 20, w, y + (r() - .5) * 10); g.stroke(); } }) });
  M.leather = new THREE.MeshStandardMaterial({ color: 0x1a0c08, roughness: .38, metalness: 0 });
  M.redLeather = new THREE.MeshStandardMaterial({ color: 0x7a121c, roughness: .4 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xd4a849, roughness: .25, metalness: 1 });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: .15, metalness: 1 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: .5, metalness: .3 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: .22, roughness: .02, metalness: 0, depthWrite: false });
  M.cardBack = new THREE.MeshStandardMaterial({ color: 0x8c1020, roughness: .6 });
  M.chip = {};
  for (const [k, c] of Object.entries({ 1: '#eeeeee', 5: '#c62828', 25: '#2e7d32', 100: '#151515', 500: '#6a1b9a', 1000: '#f0b400' }))
    M.chip[k] = new THREE.MeshStandardMaterial({ roughness: .5, map: canvasTex(128, 16, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = k === '1' ? '#2a6ad8' : '#fff'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 6, h); }) });
  return M;
}
const G = {};
function chipGeo() { return G.chip || (G.chip = new THREE.CylinderGeometry(.019, .019, .0045, 20)); }
// A stack of chips at (x, y, z) inside `group`.
function chipStack(group, x, y, z, n, val) {
  const m = mats().chip[val], gg = chipGeo();
  for (let i = 0; i < n; i++) { const c = new THREE.Mesh(gg, m); c.position.set(x + (Math.random() - .5) * .002, y + .00225 + i * .0046, z + (Math.random() - .5) * .002); c.rotation.y = Math.random() * 6; group.add(c); }
}
function chipTray(group, x, z, y, rows = 6) {
  const tray = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .16), mats().black); tray.position.set(x, y + .005, z); group.add(tray);
  const vals = ['1', '5', '25', '100', '500', '1000'];
  for (let i = 0; i < rows; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .14, 16, 1).rotateX(Math.PI / 2), M.chip[vals[i % vals.length]]);
    tube.position.set(x - .2 + i * .08, y + .03, z); group.add(tube);
  }
}
function card(group, x, y, z, ry = 0, up = false) {
  const geo = G.card || (G.card = new THREE.BoxGeometry(.063, .0008, .088));
  const c = new THREE.Mesh(geo, up ? (M.cardFace || (M.cardFace = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: .5 }))) : mats().cardBack);
  c.position.set(x, y + .0005, z); c.rotation.y = ry; group.add(c);
}
function stool(group, x, z, ry) {
  const s = new THREE.Group();
  const seat = new THREE.Mesh(G.stoolSeat || (G.stoolSeat = new THREE.CylinderGeometry(.22, .2, .1, 24)), mats().redLeather); seat.position.y = .72; seat.castShadow = true; s.add(seat);
  const back = new THREE.Mesh(G.stoolBack || (G.stoolBack = new THREE.BoxGeometry(.4, .28, .06)), M.redLeather); back.position.set(0, .95, .2); s.add(back);
  const pole = new THREE.Mesh(G.stoolPole || (G.stoolPole = new THREE.CylinderGeometry(.03, .03, .68, 10)), M.chrome); pole.position.y = .34; s.add(pole);
  const base = new THREE.Mesh(G.stoolBase || (G.stoolBase = new THREE.CylinderGeometry(.22, .25, .03, 24)), M.chrome); base.position.y = .015; s.add(base);
  const ring = new THREE.Mesh(G.stoolRing || (G.stoolRing = new THREE.TorusGeometry(.18, .012, 6, 24).rotateX(Math.PI / 2)), M.chrome); ring.position.y = .32; s.add(ring);
  s.position.set(x, 0, z); s.rotation.y = ry; group.add(s); return s;
}
// Planar UVs over the table's local x/z extents, so felt canvases map in metres.
function planarUV(geo, [minX, maxX, minZ, maxZ]) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - minX) / (maxX - minX); uv[i * 2 + 1] = 1 - (p.getZ(i) - minZ) / (maxZ - minZ); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function outlineShape(pts) { const s = new THREE.Shape(); pts.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath(); return s; }
// Generic table: felt top from an outline (x, z points, closed), wood apron below, padded rail around it.
function tableBody(group, pts, felt, bbox, { y = .78, rail = true, railR = .055, apron = .16, railSkip } = {}) {
  mats();
  const shape = outlineShape(pts);
  const top = new THREE.ShapeGeometry(shape, 1).rotateX(-Math.PI / 2); planarUV(top, bbox);
  const feltM = new THREE.MeshStandardMaterial({ map: felt, roughness: .95, metalness: 0 });
  const fm = new THREE.Mesh(top, feltM); fm.position.y = y; fm.receiveShadow = true; group.add(fm);
  const ap = new THREE.ExtrudeGeometry(shape, { depth: apron, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2);
  const am = new THREE.Mesh(ap, M.wood); am.position.y = y - apron - .002; am.castShadow = true; group.add(am);
  if (rail) {
    const v = pts.map(([x, z]) => new THREE.Vector3(x, y + railR * .4, z));
    const path = railSkip ? new THREE.CatmullRomCurve3(v, false) : new THREE.CatmullRomCurve3(v, true, 'catmullrom', .1);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 4, railR, 10, !railSkip), M.leather); tube.castShadow = true; group.add(tube);
  }
  return fm;
}
function semiOutline(n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; pts.push([Math.cos(a) * SEMI.rx, -SEMI.D + Math.sin(a) * SEMI.rz]); }
  return pts;
}

// ---------------------------------------------------------------- table builders
// Each returns { group, colliders: [{minX,maxX,minZ,maxZ}] (local), seat: [x,z] (local, where the player stands),
//   cam: { pos:[x,y,z], look:[x,y,z] } (local), dealer: [x,z,ry] | null, extraDealers? }
export function buildSemiTable(o) {
  const group = new THREE.Group();
  const pts = semiOutline();
  tableBody(group, pts, semiFelt(o), [-SEMI.rx, SEMI.rx, -SEMI.D, SEMI.rz - SEMI.D]);
  // dealer edge: straight wood rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(SEMI.rx * 2, .05, .08), M.wood); rim.position.set(0, .79, -SEMI.D - .02); group.add(rim);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, .62, 24), M.wood); ped.position.set(0, .31, -.05); group.add(ped);
  chipTray(group, 0, -SEMI.D + .1, .78);
  if (o.shoe) { const shoe = new THREE.Mesh(new THREE.BoxGeometry(.12, .1, .2), M.redLeather); shoe.position.set(.62, .83, -SEMI.D + .13); shoe.rotation.y = .3; group.add(shoe); }
  if (o.decor) o.decor(group);
  // a couple of hands in progress
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (.12 + .76 * i / 4);
    if (i === 2) continue; // the player's own seat stays clear
    if (Math.random() < .55) { const px = Math.cos(a) * .7, pz = -SEMI.D + Math.sin(a) * .6; card(group, px, .78, pz, a - Math.PI / 2, true); card(group, px + .02, .7805, pz + .015, a - Math.PI / 2 + .1, true); chipStack(group, Math.cos(a) * .86, .78, -SEMI.D + Math.sin(a) * .74, 2 + (Math.random() * 6 | 0), ['5', '25', '100'][Math.random() * 3 | 0]); }
  }
  card(group, -.05, .78, -SEMI.D + .27, 0, true); card(group, .04, .78, -SEMI.D + .27, 0, false);
  for (let i = 0; i < 5; i++) { const a = Math.PI * (.12 + .76 * i / 4); if (i !== 2) stool(group, Math.cos(a) * 1.35, -SEMI.D + Math.sin(a) * 1.2, -(a - Math.PI / 2)); }
  return { group, colliders: [{ minX: -1.2, maxX: 1.2, minZ: -.6, maxZ: .62 }], seat: [0, .95], cam: { pos: [0, 1.85, 1.35], look: [0, .78, -.15] }, dealer: [0, -.82, 0] };
}
export function buildCraps() {
  const group = new THREE.Group(); mats();
  const L = 1.72, Wd = .78, r = .4, y = .74;
  const rr = (l, w, rad, n = 8) => { const p = []; const c = [[l - rad, w - rad, 0], [-(l - rad), w - rad, Math.PI / 2], [-(l - rad), -(w - rad), Math.PI], [l - rad, -(w - rad), Math.PI * 1.5]];
    for (const [cx, cz, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad]); } return p; };
  const inner = rr(L - .14, Wd - .14, r - .1), outer = rr(L, Wd, r);
  // felt floor of the tub
  const fshape = outlineShape(inner);
  const fgeo = new THREE.ShapeGeometry(fshape, 4).rotateX(-Math.PI / 2); planarUV(fgeo, [-1.5, 1.5, -.6, .6]);
  const fm = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({ map: crapsFelt(), roughness: .95 })); fm.position.y = y; fm.receiveShadow = true; group.add(fm);
  // tub walls: ring extrusion
  const ring = outlineShape(outer); ring.holes.push(new THREE.Path(inner.slice().reverse().map(([x, z]) => new THREE.Vector2(x, -z))));
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: .3, bevelEnabled: false, curveSegments: 2 }).rotateX(-Math.PI / 2), M.wood); wall.position.y = y - .02; wall.castShadow = true; group.add(wall);
  // inner wall lining (felt-green) and the diamond-studded rubber at the ends
  const lining = new THREE.Mesh(new THREE.ExtrudeGeometry(outlineShape(inner), { depth: .24, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0b3d24, side: THREE.BackSide, roughness: .9 }));
  lining.position.y = y; group.add(lining);
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .2), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#222'; g.fillRect(0, 0, w, h); g.fillStyle = '#555'; for (let x = 0; x < w; x += 16) for (let yy = 0; yy < h; yy += 16) { g.beginPath(); g.moveTo(x + 8, yy); g.lineTo(x + 16, yy + 8); g.lineTo(x + 8, yy + 16); g.lineTo(x, yy + 8); g.fill(); } }) }));
    d.position.set(s * (L - .145), y + .12, 0); d.rotation.y = -s * Math.PI / 2; group.add(d); }
  // padded top rail and the chip rail groove below it
  const railPath = new THREE.CatmullRomCurve3(outer.map(([x, z]) => new THREE.Vector3(x * .985, y + .3, z * .97)), true, 'catmullrom', .1);
  const rail = new THREE.Mesh(new THREE.TubeGeometry(railPath, 120, .06, 10, true), M.leather); rail.castShadow = true; group.add(rail);
  const groovePath = new THREE.CatmullRomCurve3(outer.map(([x, z]) => new THREE.Vector3(x * 1.03, y + .18, z * 1.04)), true, 'catmullrom', .1);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(groovePath, 120, .04, 8, true), M.wood));
  for (const x of [-1.2, 1.2]) for (const z of [-.5, .5]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.12, y, .12), M.wood); leg.position.set(x, y / 2, z); group.add(leg); }
  // dice, the stick, the puck, chips on the layout
  const dieM = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: .2, transparent: true, opacity: .92 });
  for (const [x, z, ry] of [[.25, .05, .3], [.33, .1, 1.1]]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .03), dieM); d.position.set(x, y + .015, z); d.rotation.y = ry; group.add(d); }
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1.2, 8).rotateZ(Math.PI / 2), M.wood); stick.position.set(0, y + .32, -.82); stick.rotation.y = .3; group.add(stick);
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .012, 24), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ON', w / 2, h / 2); }) }));
  puck.position.set(1.08, y + .006, -.47); group.add(puck);
  for (const x of [-1.2, -.9, .9, 1.2]) chipStack(group, x, y, .46, 2 + (Math.random() * 5 | 0), ['5', '25'][Math.random() * 2 | 0]);
  chipTray(group, 0, -.55, y + .01, 6);
  return { group, colliders: [{ minX: -L - .05, maxX: L + .05, minZ: -Wd - .05, maxZ: Wd + .05 }], seat: [.35, 1.18], cam: { pos: [0, 2.35, 1.6], look: [0, .74, -.1] }, dealer: [0, -1.12, 0], extraDealers: [[-1.95, 0, Math.PI / 2], [1.95, 0, -Math.PI / 2]] };
}
export function buildRoulette(american, idle) {
  const group = new THREE.Group(); mats();
  const pts = [[-1.25, -.55], [1.25, -.55], [1.25, .55], [-1.25, .55]];
  tableBody(group, pts, rouletteFelt(american), [-1.25, 1.25, -.55, .55]);
  for (const x of [-1, 1]) for (const z of [-.4, .4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.1, .62, .1), M.wood); leg.position.set(x, .31, z); group.add(leg); }
  // the wheel: wood bowl, spinning rotor with pockets, chrome turret
  const wheel = new THREE.Group(); wheel.position.set(-.82, .78, 0); group.add(wheel);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.42, .38, .12, 48, 1, true), M.wood); bowl.position.y = .06; wheel.add(bowl);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.42, .02, 8, 48).rotateX(Math.PI / 2), M.wood); lip.position.y = .12; wheel.add(lip);
  const order = american ? [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2]
    : [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const rotorTex = canvasTex(1024, 1024, (g, w, h) => {
    const c = w / 2; g.fillStyle = '#4a2512'; g.fillRect(0, 0, w, h);
    const n = order.length;
    order.forEach((num, i) => {
      const a0 = i / n * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / n * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = (num === 0 || num === '00') ? '#0d8a3e' : REDS.has(num) ? '#c8102e' : '#111';
      g.beginPath(); g.arc(c, c, c * .98, a0, a1); g.arc(c, c, c * .62, a1, a0, true); g.closePath(); g.fill();
      g.strokeStyle = '#d4a849'; g.lineWidth = 3; g.stroke();
      g.save(); g.translate(c, c); g.rotate((a0 + a1) / 2 + Math.PI / 2); g.fillStyle = '#fff'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText(String(num), 0, -c * .86); g.restore();
    });
    const gr = g.createRadialGradient(c, c, 0, c, c, c * .6); gr.addColorStop(0, '#8a5a2a'); gr.addColorStop(1, '#3a1d0e'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * .6, 0, 6.28); g.fill();
  });
  const rotor = new THREE.Mesh(new THREE.CircleGeometry(.36, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rotorTex, roughness: .35, metalness: .2 })); rotor.position.y = .07; wheel.add(rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.06, .1, 24), M.chrome); cone.position.y = .12; rotor.add(cone);
  for (let k = 0; k < 4; k++) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .16, 6).rotateZ(Math.PI / 2), M.chrome); arm.position.y = .15; arm.rotation.y = k * Math.PI / 2; rotor.add(arm); }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.012, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .2 })); ball.position.set(.3, .085, 0); wheel.add(ball);
  idle.push(dt => { rotor.rotation.y += dt * .6; ball.position.set(Math.cos(rotor.rotation.y * 1.0 + 1) * .3, .085, Math.sin(rotor.rotation.y + 1) * .3); });
  // chips on the layout
  for (let i = 0; i < 7; i++) chipStack(group, -.1 + Math.random() * 1.2, .78, -.35 + Math.random() * .55, 1 + (Math.random() * 4 | 0), ['1', '5', '25'][Math.random() * 3 | 0]);
  const dolly = new THREE.Mesh(new THREE.CylinderGeometry(.015, .02, .06, 12), M.brass); dolly.position.set(.4, .81, -.1); group.add(dolly);
  for (const x of [-.1, .5, 1.05]) stool(group, x, .95, 0);
  return { group, colliders: [{ minX: -1.3, maxX: 1.3, minZ: -.6, maxZ: .6 }], seat: [.25, 1.0], cam: { pos: [-.1, 1.95, 1.25], look: [-.1, .78, -.1] }, dealer: [-.82, -.85, 0] };
}
export function buildBaccarat() {
  const group = new THREE.Group(); mats();
  const pts = []; for (let i = 0; i <= 44; i++) { const a = Math.PI * i / 44; pts.push([Math.cos(a) * 1.6, -.5 + Math.sin(a) * 1.45]); }
  tableBody(group, pts.reverse(), baccaratFelt(), [-1.6, 1.6, -.5, .95]);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(3.2, .05, .08), M.wood); rim.position.set(0, .79, -.52); group.add(rim);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, .62, .5), M.wood); ped.position.set(0, .31, 0); group.add(ped);
  chipTray(group, 0, -.38, .78); const shoe = new THREE.Mesh(new THREE.BoxGeometry(.14, .11, .24), M.redLeather); shoe.position.set(.8, .835, -.3); group.add(shoe);
  card(group, -.35, .78, .05, 0, true); card(group, -.27, .78, .05, 0, true); card(group, .27, .78, .05, 0, false); card(group, .35, .78, .05, 0, false);
  for (let i = 0; i < 7; i++) { const a = Math.PI * (.1 + .8 * i / 6); if (i !== 3) stool(group, Math.cos(a) * 1.9, -.5 + Math.sin(a) * 1.75, -(a - Math.PI / 2)); }
  // velvet rope and brass posts mark the high-limit area
  return { group, colliders: [{ minX: -1.65, maxX: 1.65, minZ: -.62, maxZ: .98 }], seat: [0, 1.3], cam: { pos: [0, 2.0, 1.75], look: [0, .78, -.1] }, dealer: [0, -.88, 0] };
}
export function buildSicBo() {
  const group = new THREE.Group(); mats();
  const pts = [[-.95, -.5], [.95, -.5], [.95, .5], [-.95, .5]];
  tableBody(group, pts, sicboFelt(), [-.95, .95, -.5, .5]);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.2, .62, .5), M.wood); ped.position.y = .31; group.add(ped);
  // the shaker: glass dome over three dice on a brass base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .05, 32), M.brass); base.position.set(0, .81, -.62); group.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.glass); dome.position.set(0, .835, -.62); group.add(dome);
  const dieM = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: .3 });
  for (const [x, z] of [[-.04, -.6], [.04, -.63], [0, -.56]]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .035), dieM); d.position.set(x, .855, z); d.rotation.y = Math.random() * 3; group.add(d); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .25), M.wood); shelf.position.set(0, .79, -.62); group.add(shelf);
  for (let i = 0; i < 5; i++) chipStack(group, -.7 + Math.random() * 1.4, .78, -.3 + Math.random() * .6, 1 + (Math.random() * 3 | 0), ['5', '25', '100'][Math.random() * 3 | 0]);
  for (const x of [-.5, .5]) stool(group, x, .95, 0);
  return { group, colliders: [{ minX: -1, maxX: 1, minZ: -.8, maxZ: .55 }], seat: [0, .98], cam: { pos: [0, 1.85, 1.15], look: [0, .78, -.15] }, dealer: [0, -1.0, 0] };
}
export function buildBigSix(idle) {
  const group = new THREE.Group(); mats();
  // bet table in front of the wheel
  const pts = [[-.9, -.3], [.9, -.3], [.9, .3], [-.9, .3]];
  tableBody(group, pts, bigSixFelt(), [-.9, .9, -.3, .3]);
  for (const x of [-.7, .7]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.08, .62, .4), M.wood); leg.position.set(x, .31, 0); group.add(leg); }
  // the wheel itself, on a tall stand behind the table
  const wheel = new THREE.Group(); wheel.position.set(0, 2.35, -.9); group.add(wheel);
  const segs = [];
  { const pattern = ['1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '20', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', 'J', '1', '2', '1', '5', '1', '2', '1', '10', '1', '5', '1', '2', '1', '20', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '5', '1', 'L', '2'];
    segs.push(...pattern.slice(0, 54)); }
  const col = { 1: '#f4f0e6', 2: '#ffd34a', 5: '#7ab6ff', 10: '#9dffb0', 20: '#ff8a80', J: '#111', L: '#7a1420' };
  const face = canvasTex(1024, 1024, (g, w, h) => {
    const c = w / 2; g.fillStyle = '#2a1408'; g.fillRect(0, 0, w, h);
    segs.forEach((s, i) => {
      const a0 = i / 54 * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / 54 * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = col[s]; g.beginPath(); g.moveTo(c, c); g.arc(c, c, c * .96, a0, a1); g.closePath(); g.fill(); g.strokeStyle = '#d4a849'; g.lineWidth = 3; g.stroke();
      g.save(); g.translate(c, c); g.rotate((a0 + a1) / 2 + Math.PI / 2); g.fillStyle = s === 'J' || s === 'L' ? '#ffd34a' : '#111'; g.font = 'bold 30px Georgia'; g.textAlign = 'center';
      g.fillText(s === 'J' ? '★' : s === 'L' ? 'V' : '$' + s, 0, -c * .82); g.restore();
    });
    const gr = g.createRadialGradient(c, c, 0, c, c, c * .45); gr.addColorStop(0, '#f3d27e'); gr.addColorStop(1, '#a8842c'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * .42, 0, 6.28); g.fill();
    g.fillStyle = '#4a0d14'; g.font = 'italic bold 90px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Big Six', c, c);
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .06, 72).rotateX(Math.PI / 2), [M.wood, new THREE.MeshStandardMaterial({ map: face, roughness: .4, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: .25 }), M.wood]);
  wheel.add(disc);
  const pegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.008, .008, .06, 6).rotateX(Math.PI / 2), M.brass, 54);
  const mtx = new THREE.Matrix4(); for (let i = 0; i < 54; i++) { const a = i / 54 * Math.PI * 2; mtx.makeTranslation(Math.cos(a) * 1.07, Math.sin(a) * 1.07, .06); pegs.setMatrixAt(i, mtx); } wheel.add(pegs);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(1.12, .04, 10, 72), M.brass); wheel.add(ringM);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.2), toneMapped: false }), 36);
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; mtx.makeTranslation(Math.cos(a) * 1.2, Math.sin(a) * 1.2, .02); bulbs.setMatrixAt(i, mtx); } wheel.add(bulbs);
  const post = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.35, .16), M.wood); post.position.set(0, 1.17, -.98); group.add(post);
  const clap = new THREE.Mesh(new THREE.BoxGeometry(.03, .18, .02), M.leather); clap.position.set(0, 2.35 + 1.2, -.84); group.add(clap);
  idle.push(dt => { disc.rotation.z += dt * .25; pegs.rotation.z = disc.rotation.z; });
  return { group, colliders: [{ minX: -.95, maxX: .95, minZ: -1.1, maxZ: .35 }], seat: [0, .9], cam: { pos: [0, 1.9, 1.5], look: [0, 1.7, -.9] }, dealer: [.75, -.55, -.4] };
}

// ---------------------------------------------------------------- slot machines (merged into one mesh per material)
// theme: { title, cabinet, accent, glass, kind: 'slot'|'videopoker'|'keno', reels: 3|5 }
const themeCache = new Map();
function themeMats(t) {
  if (themeCache.has(t.key)) return themeCache.get(t.key);
  const screen = canvasTex(512, 400, (g, w, h) => drawScreen(g, w, h, t));
  const topper = canvasTex(512, 200, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, t.accent); gr.addColorStop(.5, t.cabinet); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h * 1.2); g.globalAlpha = .25; g.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { g.rotate(Math.PI / 9); g.beginPath(); g.moveTo(0, 0); g.lineTo(-20, -400); g.lineTo(20, -400); g.fill(); } g.restore();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const s = fitFont(g, t.title.toUpperCase(), w - 40, 80, HEAD);
    g.lineWidth = s * .2; g.strokeStyle = '#000'; g.lineJoin = 'round'; g.strokeText(t.title.toUpperCase(), w / 2, h * .5);
    g.fillStyle = '#fff'; g.fillText(t.title.toUpperCase(), w / 2, h * .5);
    g.fillStyle = t.accent; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
  });
  const m = {
    body: new THREE.MeshStandardMaterial({ color: t.cabinet, roughness: .3, metalness: .6 }),
    screen: new THREE.MeshBasicMaterial({ map: screen, color: new THREE.Color(1.15, 1.15, 1.15), toneMapped: false }),
    topper: new THREE.MeshBasicMaterial({ map: topper, color: new THREE.Color(1.5, 1.5, 1.5), toneMapped: false }),
    accent: new THREE.MeshBasicMaterial({ color: new THREE.Color(t.accent).multiplyScalar(2.2), toneMapped: false })
  };
  themeCache.set(t.key, m); return m;
}
function drawScreen(g, w, h, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  if (t.kind === 'videopoker') {
    g.fillStyle = '#0b2a8a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe24a'; g.font = `14px ${PIX}`; g.textAlign = 'left';
    ['ROYAL FLUSH   4000', 'STRAIGHT FLUSH  250', '4 OF A KIND    125', 'FULL HOUSE       45', 'FLUSH            30'].forEach((l, i) => g.fillText(l, 30, 40 + i * 26));
    for (let i = 0; i < 5; i++) { const x = 28 + i * 92; g.fillStyle = '#fff'; g.fillRect(x, 200, 80, 116); g.fillStyle = i % 2 ? '#c4111f' : '#111'; g.font = 'bold 46px Georgia'; g.textAlign = 'center'; g.fillText(['A', 'K', 'Q', 'J', '10'][i], x + 40, 262); g.font = '30px Georgia'; g.fillText(['♠', '♥', '♠', '♥', '♠'][i], x + 40, 300); }
    g.fillStyle = '#ff4040'; g.font = `16px ${PIX}`; g.textAlign = 'center'; g.fillText(t.title.toUpperCase(), w / 2, 360);
    return;
  }
  if (t.kind === 'keno') {
    g.fillStyle = '#16072e'; g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 80; i++) { const x = 22 + (i % 10) * 47, y = 40 + Math.floor(i / 10) * 40; const hit = r() < .25;
      g.fillStyle = hit ? '#ffd34a' : '#2b1a52'; g.beginPath(); g.arc(x + 18, y, 16, 0, 6.28); g.fill(); g.fillStyle = hit ? '#000' : '#bba8ff'; g.font = 'bold 14px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, x + 18, y); }
    g.fillStyle = '#ff5ad1'; g.font = `18px ${PIX}`; g.fillText('KENO', w / 2, 375);
    return;
  }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, t.glass || '#200'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const n = t.reels || 3, rw = (w - 40) / n;
  const r = rng(t.title.length * 7);
  for (let i = 0; i < n; i++) {
    const x = 20 + i * rw;
    const rg = g.createLinearGradient(0, 70, 0, h - 60);
    if (t.motif === 'fish') { rg.addColorStop(0, '#0a3a5a'); rg.addColorStop(.5, '#1a7ab0'); rg.addColorStop(1, '#0a3a5a'); }
    else if (t.motif === 'bison') { rg.addColorStop(0, '#5a2a10'); rg.addColorStop(.4, '#f0a040'); rg.addColorStop(1, '#5a2a10'); }
    else { rg.addColorStop(0, '#888'); rg.addColorStop(.2, '#fff'); rg.addColorStop(.8, '#fff'); rg.addColorStop(1, '#888'); }
    g.fillStyle = rg; g.fillRect(x + 4, 70, rw - 8, h - 140);
    for (let k = 0; k < (n === 3 ? 1 : 3); k++) {
      const y = n === 3 ? h / 2 : 110 + k * 90, sIdx = r() * 4 | 0;
      drawSymbol(g, x + rw / 2, y, n === 3 ? 70 : (t.motif ? 62 : 38), sIdx, t);
    }
  }
  g.fillStyle = t.accent; g.fillRect(0, h / 2 - 2, w, 4);
  g.fillStyle = '#ffd34a'; g.font = `14px ${PIX}`; g.textAlign = 'center'; g.fillText('CREDITS 0000   BET 3', w / 2, h - 26);
  g.font = `18px ${HEAD}`; g.fillStyle = '#fff'; g.fillText(t.title.toUpperCase(), w / 2, 40);
}
function drawSymbol(g, x, y, s, i, t) {
  g.save(); g.translate(x, y); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (t.motif === 'fish' && i < 3) {
    // goldfish: body, tail, eye
    g.fillStyle = i === 1 ? '#ffd27a' : '#ff6a10';
    g.beginPath(); g.ellipse(-s * .05, 0, s * .42, s * .28, 0, 0, 6.28); g.fill();
    g.beginPath(); g.moveTo(s * .3, 0); g.lineTo(s * .62, -s * .3); g.lineTo(s * .55, 0); g.lineTo(s * .62, s * .3); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * .28, -s * .06, s * .08, 0, 6.28); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(-s * .3, -s * .06, s * .04, 0, 6.28); g.fill();
    g.restore(); return;
  }
  if (t.motif === 'bison' && i < 3) {
    // bison: humped body, head, horns, legs
    g.fillStyle = i === 2 ? '#c88a2a' : '#4a2a14';
    g.beginPath(); g.ellipse(s * .08, 0, s * .45, s * .27, 0, 0, 6.28); g.fill();
    g.beginPath(); g.ellipse(-s * .1, -s * .16, s * .3, s * .24, 0, 0, 6.28); g.fill();
    g.beginPath(); g.ellipse(-s * .42, s * .02, s * .17, s * .2, 0, 0, 6.28); g.fill();
    g.fillRect(-s * .2, s * .15, s * .1, s * .3); g.fillRect(s * .3, s * .15, s * .1, s * .3);
    g.strokeStyle = '#efe4c8'; g.lineWidth = s * .05; g.beginPath(); g.arc(-s * .45, -s * .2, s * .1, Math.PI, Math.PI * 1.8); g.stroke();
    g.restore(); return;
  }
  if (i === 0) { g.font = `bold ${s * 1.3}px Georgia`; g.fillStyle = '#d0101a'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText('7', 0, 0); g.fillText('7', 0, 0); }
  else if (i === 1) { g.fillStyle = '#111'; g.fillRect(-s * .7, -s * .28, s * 1.4, s * .56); g.fillStyle = '#fff'; g.font = `bold ${s * .36}px Arial`; g.fillText('BAR', 0, 2); }
  else if (i === 2) { g.strokeStyle = '#2e7d32'; g.lineWidth = 4; g.beginPath(); g.moveTo(-s * .25, -s * .05); g.quadraticCurveTo(0, -s * .7, s * .2, -s * .6); g.moveTo(s * .25, -s * .05); g.quadraticCurveTo(s * .1, -s * .5, s * .2, -s * .6); g.stroke();
    for (const dx of [-.28, .28]) { g.fillStyle = '#c4111f'; g.beginPath(); g.arc(dx * s, s * .15, s * .28, 0, 6.28); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(dx * s - s * .08, s * .06, s * .07, 0, 6.28); g.fill(); } }
  else { g.fillStyle = t.accent; g.beginPath(); g.moveTo(0, -s * .5); g.lineTo(s * .45, 0); g.lineTo(0, s * .5); g.lineTo(-s * .45, 0); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
  g.restore();
}
// One machine's parts as {geo, key}; transformed and merged later by material key.
const SLOT_W = .72;
function machineParts() {
  if (G.machine) return G.machine;
  const P = [];
  const add = (geo, key, x, y, z, rx = 0) => { if (rx) geo.rotateX(rx); geo.translate(x, y, z); P.push({ geo, key }); };
  add(new THREE.BoxGeometry(SLOT_W, .62, .62), 'body', 0, .31, 0);            // base
  add(new THREE.BoxGeometry(SLOT_W, .14, .46), 'body', 0, .69, .06, -.5);       // button deck (sloped)
  add(new THREE.BoxGeometry(SLOT_W, .95, .5), 'body', 0, 1.25, -.06);           // main cabinet
  add(new THREE.PlaneGeometry(SLOT_W - .1, .52), 'screen', 0, 1.33, .195);     // screen
  add(new THREE.BoxGeometry(SLOT_W + .04, .26, .4), 'body', 0, 1.88, -.08);     // topper box
  add(new THREE.PlaneGeometry(SLOT_W - .02, .22), 'topper', 0, 1.88, .121);    // topper sign
  add(new THREE.BoxGeometry(SLOT_W + .02, .025, .52), 'accent', 0, .775, -.06); // light strip
  add(new THREE.BoxGeometry(.03, .95, .03), 'accent', -SLOT_W / 2, 1.25, .2); add(new THREE.BoxGeometry(.03, .95, .03), 'accent', SLOT_W / 2, 1.25, .2);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(.025, .025, .02, 12), 'accent', -.22 + i * .12, .77, .2, -.5 + Math.PI / 2);
  add(new THREE.CylinderGeometry(.04, .04, .12, 12), 'accent', 0, 2.07, -.08);  // candle light
  add(new THREE.CylinderGeometry(.02, .02, .3, 8), 'chrome', SLOT_W / 2 + .03, 1.0, .05); // lever
  add(new THREE.SphereGeometry(.045, 12, 8), 'red', SLOT_W / 2 + .03, 1.17, .05);
  return (G.machine = P);
}
// Lay out one row of machines. Returns per-machine entries { x, z, ry, front:[x,z] } in world space.
export function buildSlotBank(scene, list) {
  // list: [{ theme, x, z, ry }]; merged by material per theme
  const buckets = new Map(), parts = machineParts(), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const shared = { chrome: mats().chrome, red: new THREE.MeshStandardMaterial({ color: 0xd01010, roughness: .3 }), stool: M.redLeather };
  for (const it of list) {
    const tm = themeMats(it.theme);
    mtx.compose(new THREE.Vector3(it.x, 0, it.z), q.setFromAxisAngle(up, it.ry), new THREE.Vector3(1, 1, 1));
    for (const p of parts) {
      const mat = tm[p.key] || shared[p.key], k = mat.uuid;
      if (!buckets.has(k)) buckets.set(k, { mat, geos: [] });
      buckets.get(k).geos.push(p.geo.clone().applyMatrix4(mtx));
    }
  }
  for (const { mat, geos } of buckets.values()) {
    const merged = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false);
    const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = mat.isMeshStandardMaterial; mesh.receiveShadow = true; scene.add(mesh);
  }
  // stools in front of each machine
  for (const it of list) {
    const s = new THREE.Group(); stool(s, 0, 0, 0); s.position.set(it.x + Math.sin(it.ry) * .62, 0, it.z + Math.cos(it.ry) * .62); s.rotation.y = it.ry + Math.PI; s.scale.setScalar(.92); scene.add(s);
  }
  return themeCache;
}

// ---------------------------------------------------------------- signage
export function neonSign(text, color, w = 2.4, h = .6, font = HEAD) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (g, W, H) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const s = fitFont(g, text, W - 60, H * .7, font);
    g.font = `${s}px ${font}`;
    for (const [b, a] of [[40, .6], [18, .9], [6, 1]]) { g.shadowColor = color; g.shadowBlur = b; g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = 6; g.strokeText(text, W / 2, H / 2); }
    g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(text, W / 2, H / 2);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7), depthWrite: false, side: THREE.DoubleSide }));
}
// Hanging area sign: gold-framed black box with lit lettering on both faces.
export function hangingSign(text, color) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, .55, .12), mats().black); g.add(box);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(2.48, .63, .1), M.brass); g.add(fr);
  for (const s of [1, -1]) { const n = neonSign(text, color, 2.3, .5); n.position.z = s * .065; if (s < 0) n.rotation.y = Math.PI; g.add(n); }
  for (const x of [-1, 1]) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1.2, 6), M.chrome); rod.position.set(x, .9, 0); g.add(rod); }
  return g;
}
// Crystal chandelier: tiered rings of glowing drops around a brass column.
export function chandelier() {
  const g = new THREE.Group(); mats();
  const drop = new THREE.OctahedronGeometry(.045, 0), dropM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.7, 2.0), toneMapped: false });
  const tiers = [[.9, 22, 0], [.65, 16, -.35], [.4, 10, -.7]];
  let n = 0; for (const t of tiers) n += t[1];
  const inst = new THREE.InstancedMesh(drop, dropM, n * 2), m = new THREE.Matrix4(); let i = 0;
  for (const [r, k, y] of tiers) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .02, 6, 40).rotateX(Math.PI / 2), M.brass); ring.position.y = y; g.add(ring);
    for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2; m.makeScale(1, 1.8, 1).setPosition(Math.cos(a) * r, y - .08, Math.sin(a) * r); inst.setMatrixAt(i++, m); m.makeScale(.7, 1.4, .7).setPosition(Math.cos(a) * r, y - .2, Math.sin(a) * r); inst.setMatrixAt(i++, m); }
  }
  g.add(inst);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, 1.3, 12), M.brass); col.position.y = -.3; g.add(col);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), dropM); glow.position.y = -.8; g.add(glow);
  return g;
}

// ---------------------------------------------------------------- the goldfish tank
// A freestanding aquarium (long axis along z) with goldfish swimming lazy loops, plants, gravel and bubbles.
export function aquarium(idle, { L = 2.4, Dp = .7, H = .95, baseH = .85 } = {}) {
  const g = new THREE.Group(); mats();
  const base = new THREE.Mesh(new THREE.BoxGeometry(Dp + .1, baseH, L + .1), M.wood); base.position.y = baseH / 2; base.castShadow = true; g.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(Dp + .1, .08, L + .1), M.black); lid.position.y = baseH + H + .04; g.add(lid);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(Dp - .1, .01, L - .1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.2, 2.6), toneMapped: false })); lamp.position.y = baseH + H - .005; g.add(lamp);
  const water = new THREE.Mesh(new THREE.BoxGeometry(Dp, H - .06, L), new THREE.MeshPhysicalMaterial({ color: 0x3aa8c8, transparent: true, opacity: .28, roughness: .05, emissive: 0x0a4a66, emissiveIntensity: .6, depthWrite: false }));
  water.position.y = baseH + (H - .06) / 2; water.renderOrder = 2; g.add(water);
  const frame = M.black;
  for (const x of [-Dp / 2, Dp / 2]) for (const z of [-L / 2, L / 2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.03, H, .03), frame); p.position.set(x, baseH + H / 2, z); g.add(p); }
  const gravel = new THREE.Mesh(new THREE.BoxGeometry(Dp - .02, .06, L - .02), new THREE.MeshStandardMaterial({ roughness: .9, map: canvasTex(256, 256, (c, w, h) => { const r = rng(77); c.fillStyle = '#6b5a44'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { c.fillStyle = ['#c9b48a', '#8a6a4a', '#e6d8b8', '#5a4632', '#b07a4a'][r() * 5 | 0]; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 3, 0, 6.28); c.fill(); } }, { repeat: [2, 6] }) }));
  gravel.position.y = baseH + .03; g.add(gravel);
  // plants and a little castle
  const plantM = new THREE.MeshStandardMaterial({ color: 0x2f9a4a, roughness: .6, emissive: 0x0a3a14, emissiveIntensity: .4 });
  const plants = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(.03, .35 + Math.random() * .4, 5), plantM);
    p.position.set((Math.random() - .5) * (Dp - .15), baseH + .06 + .2, (Math.random() - .5) * (L - .2)); p.userData.ph = Math.random() * 6; g.add(p); plants.push(p);
  }
  const castle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .22, 8), new THREE.MeshStandardMaterial({ color: 0x9a8a7a, roughness: .8 })); castle.position.set(.1, baseH + .17, .7); g.add(castle);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.14, .08, .1), M.wood); chest.position.set(-.12, baseH + .1, -.6); chest.rotation.y = .4; g.add(chest);
  const coins = new THREE.Mesh(new THREE.BoxGeometry(.1, .02, .06), M.brass); coins.position.set(-.12, baseH + .15, -.6); coins.rotation.y = .4; g.add(coins);
  // goldfish: body, tail, dorsal fin, eyes
  const bodyM = new THREE.MeshStandardMaterial({ color: 0xff6400, roughness: .3, metalness: .2, emissive: 0xff5000, emissiveIntensity: .55 });
  const finM = new THREE.MeshStandardMaterial({ color: 0xff9a30, roughness: .4, transparent: true, opacity: .85, side: THREE.DoubleSide, emissive: 0xff6a10, emissiveIntensity: .45 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bodyG = new THREE.SphereGeometry(.05, 14, 10).scale(1, .75, .5);
  const tailG = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(-.05, .05, -.08, .055); s.quadraticCurveTo(-.06, 0, -.08, -.055); s.quadraticCurveTo(-.05, -.05, 0, 0); return s; })());
  const fish = [];
  for (let i = 0; i < 11; i++) {
    const f = new THREE.Group(), s = .7 + Math.random() * .6;
    const body = new THREE.Mesh(bodyG, i % 4 === 3 ? new THREE.MeshStandardMaterial({ color: 0xfff2e0, roughness: .35, emissive: 0x3a2a20, emissiveIntensity: .4 }) : bodyM); f.add(body);
    const tail = new THREE.Mesh(tailG, finM); tail.position.x = -.045; f.add(tail);
    const fin = new THREE.Mesh(new THREE.CircleGeometry(.025, 8, 0, Math.PI), finM); fin.position.set(0, .03, 0); f.add(fin);
    for (const z of [-.02, .02]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.007, 6, 4), eyeM); e.position.set(.035, .01, z); f.add(e); }
    f.scale.setScalar(s);
    // the fish swims along +x of its own group; its group yaws to face its heading
    fish.push({ f, tail, a: Math.random() * 6.28, sp: .25 + Math.random() * .35, ry: (L / 2 - .2), rx: (Dp / 2 - .12), y0: baseH + .25 + Math.random() * (H - .45), ph: Math.random() * 6.28 });
    g.add(f);
  }
  // bubbles from an air stone
  const bubG = new THREE.SphereGeometry(.008, 6, 4), bubM = new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: .7 });
  const bubbles = new THREE.InstancedMesh(bubG, bubM, 40), bub = Array.from({ length: 40 }, () => ({ y: Math.random() * H, x: (Math.random() - .5) * .04, z: -L / 2 + .15 + (Math.random() - .5) * .04, v: .15 + Math.random() * .2 }));
  g.add(bubbles);
  const m4 = new THREE.Matrix4(); let t = 0;
  idle.push(dt => {
    t += dt;
    for (const k of fish) {
      k.a += dt * k.sp * .5;
      // a slow figure-of-eight around the tank
      const z = Math.sin(k.a) * k.ry, x = Math.sin(k.a * 2 + k.ph) * k.rx, y = k.y0 + Math.sin(k.a * 1.3 + k.ph) * .06;
      const dz = Math.cos(k.a) * k.ry, dx = 2 * Math.cos(k.a * 2 + k.ph) * k.rx;
      k.f.position.set(x, y, z); k.f.rotation.y = Math.atan2(-dz, dx);
      k.tail.rotation.y = Math.sin(t * 9 + k.ph) * .45;
    }
    for (const p of plants) p.rotation.z = Math.sin(t * 1.2 + p.userData.ph) * .08;
    bub.forEach((b, i) => { b.y += b.v * dt; if (b.y > H - .1) b.y = 0; m4.makeTranslation(b.x + Math.sin(t * 4 + i) * .01, baseH + .06 + b.y, b.z); bubbles.setMatrixAt(i, m4); });
    bubbles.instanceMatrix.needsUpdate = true;
  });
  return g;
}

// App colours: background presets (shown as colour dots), accent dots, and
// "Match Windows" options that follow the system light/dark mode and accent colour.

export const BACKGROUNDS = [
  { id: 'system', name: 'Match Windows', system: true },
  { id: 'dark', name: 'Dark', bg: '#0d1117' },
  { id: 'oled', name: 'Black (OLED)', bg: '#000000' },
  { id: 'light', name: 'Light', bg: '#f5f7fa' },
  { id: 'midnight', name: 'Midnight blue', bg: '#0b1530' },
  { id: 'slate', name: 'Slate', bg: '#1e2530' },
  { id: 'ocean', name: 'Ocean', bg: '#062a3a' },
  { id: 'forest', name: 'Forest', bg: '#0f241a' },
  { id: 'plum', name: 'Plum', bg: '#24122e' },
  { id: 'wine', name: 'Wine', bg: '#2c0f17' },
  { id: 'coffee', name: 'Coffee', bg: '#2a1d14' },
  { id: 'sand', name: 'Sand', bg: '#f3eadb' },
  { id: 'sky', name: 'Sky', bg: '#e6f1fb' },
  { id: 'mint', name: 'Mint', bg: '#e5f5ec' },
  { id: 'blush', name: 'Blush', bg: '#fbe9ee' },
  // Rainbow: deep (dark) and soft (light) shades of red, orange, yellow, green, blue, indigo, violet.
  { id: 'r-red', name: 'Rainbow red', bg: '#3a0e14', rainbow: true },
  { id: 'r-orange', name: 'Rainbow orange', bg: '#3b1e0a', rainbow: true },
  { id: 'r-yellow', name: 'Rainbow yellow', bg: '#332c08', rainbow: true },
  { id: 'r-green', name: 'Rainbow green', bg: '#0d2e16', rainbow: true },
  { id: 'r-blue', name: 'Rainbow blue', bg: '#0a2144', rainbow: true },
  { id: 'r-indigo', name: 'Rainbow indigo', bg: '#191446', rainbow: true },
  { id: 'r-violet', name: 'Rainbow violet', bg: '#2e1144', rainbow: true },
  { id: 'r-red-l', name: 'Soft red', bg: '#fde3e3', rainbow: true },
  { id: 'r-orange-l', name: 'Soft orange', bg: '#feecd9', rainbow: true },
  { id: 'r-yellow-l', name: 'Soft yellow', bg: '#fdf6d3', rainbow: true },
  { id: 'r-green-l', name: 'Soft green', bg: '#e1f5e3', rainbow: true },
  { id: 'r-blue-l', name: 'Soft blue', bg: '#e0ebfd', rainbow: true },
  { id: 'r-indigo-l', name: 'Soft indigo', bg: '#e6e2fb', rainbow: true },
  { id: 'r-violet-l', name: 'Soft violet', bg: '#f2e2fa', rainbow: true },
];

export const ACCENTS = ['#3d8bfd', '#00b4d8', '#2ec4b6', '#3fb950', '#a3d139', '#ffd23f', '#ff9f1c', '#f2545b', '#ff4d8d', '#b26bff', '#7c5cff', '#8b98a9'];

let sys = { accent: null, dark: true };
let last = null;
let bgImage = null; // data URL of the chosen background picture (or null)

// Background picture: set (data URL) or clear (null); applies straight away.
export function setBackgroundImage(url) { bgImage = url || null; if (last) applyColors(last); }
export const hasBackgroundImage = () => !!bgImage;

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const lum = (c) => { const [r, g, b] = hex(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// Build the whole palette from one background colour.
export function paletteFor(bg) {
  const light = lum(bg) > 0.35;
  const toward = light ? '#000000' : '#ffffff';
  const pure = bg === '#000000';
  return {
    light,
    '--bg': bg,
    '--bg2': light ? mix(bg, '#ffffff', 0.6) : mix(bg, toward, pure ? 0.04 : 0.035),
    '--bg3': mix(bg, toward, light ? 0.05 : pure ? 0.08 : 0.07),
    '--line': mix(bg, toward, light ? 0.13 : pure ? 0.13 : 0.14),
    '--text': light ? mix(bg, '#000000', 0.86) : mix(bg, '#ffffff', 0.9),
    '--muted': light ? mix(bg, '#000000', 0.55) : mix(bg, '#ffffff', 0.55),
  };
}

export function resolveBackground(s) {
  const id = s.theme || 'dark';
  if (id === 'custom' && /^#[0-9a-f]{6}$/i.test(s.bgColor || '')) return s.bgColor;
  if (id === 'system') return sys.dark ? '#0d1117' : '#f5f7fa';
  return (BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[1]).bg;
}

export function resolveAccent(s) {
  if (s.accent === 'system') return sys.accent || '#3d8bfd';
  return s.accent || '#3d8bfd';
}

const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r}, ${g}, ${b}, ${a})`; };

export function applyColors(s) {
  last = s;
  const root = document.documentElement;
  const base = resolveBackground(s);
  const p = paletteFor(base);
  const pic = !!(bgImage && s.bgImage !== false);
  const pulse = !!s.colorPulse;
  // A picture or the colour pulse shows through slightly see-through surfaces.
  const dim = { light: 0.62, medium: 0.76, strong: 0.88 }[s.bgDim || 'medium'] || 0.76;
  const alpha = pic ? { '--bg': dim, '--bg2': Math.min(0.95, dim + 0.08), '--bg3': Math.min(0.96, dim + 0.1) } : pulse ? { '--bg': 0.72, '--bg2': 0.8, '--bg3': 0.84 } : null;
  for (const [k, v] of Object.entries(p)) if (k.startsWith('--')) root.style.setProperty(k, alpha && alpha[k] ? rgba(v, alpha[k]) : v);
  root.style.setProperty('--bg-solid', base);
  root.classList.toggle('bg-layered', pic || pulse);
  root.classList.toggle('bg-pic', pic);
  root.classList.toggle('bg-pulse', pulse);
  root.style.setProperty('--bg-img', pic ? `url("${bgImage}")` : 'none');
  root.dataset.theme = p.light ? 'light' : (s.theme === 'oled' ? 'oled' : 'dark');
  root.style.colorScheme = p.light ? 'light' : 'dark';
  root.style.setProperty('--accent', resolveAccent(s));
}

// Follow Windows: light/dark switches and accent colour changes apply live.
export async function watchSystemColors() {
  try { sys = { ...sys, ...(await window.api.call('systemColors')) }; } catch (_) { /* older backend */ }
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (mq) {
    if (sys.dark == null) sys.dark = mq.matches;
    mq.addEventListener('change', (e) => { sys.dark = e.matches; if (last) applyColors(last); });
  }
  if (window.api.on) window.api.on('system-colors', (c) => { sys = { ...sys, ...c }; if (last) applyColors(last); });
  if (last) applyColors(last);
}

export const systemColors = () => sys;

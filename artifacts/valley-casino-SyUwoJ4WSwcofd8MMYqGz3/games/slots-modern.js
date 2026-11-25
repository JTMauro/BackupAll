// Valley Casino — modern slot machines: Mega Quake (ways + cascades), Sugar Burst (cluster pays + multiplier spots),
// Liberty Sevens (classic 3-reel stepper) and Queen of the Nile Sun (5x3, 20 lines, free spins).
// Same family look as slots.js (top bar, LED meters, coin selector, MAX BET, AUTO, Space to spin, paytable),
// but self-contained: the math is pure (exported as `_math`, simulated in node) and everything is drawn on canvas.
import * as K from './_kit.js';

const TAU = Math.PI * 2;
const FD = '"Bungee", Impact, "Arial Black", sans-serif';
const FS = 'Georgia, "Times New Roman", serif';
const mod = (a, n) => ((a % n) + n) % n;

// =====================================================================================================
// Math — every function takes R(n) -> integer in [0, n). In the game R is K.rand (crypto RNG).
// Wins are in CREDITS; the screen converts credits to dollars with the machine's credit value.
// =====================================================================================================
function wpick(R, table) { // table: { items, cum, total }
  const x = R(table.total); let lo = 0, hi = table.cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (table.cum[m] > x) hi = m; else lo = m + 1; }
  return table.items[lo];
}
function wtable(obj) { const items = [], cum = []; let t = 0; for (const [k, w] of Object.entries(obj)) { if (!(w > 0)) continue; t += w; items.push(isNaN(+k) ? k : +k); cum.push(t); } return { items, cum, total: t }; }

// ---------------------------------------------------------------- Mega Quake: 6 reels x 2..7 rows, ways, cascades
const QK = {
  credits: 20, // a spin costs 20 credits x level
  rows: wtable({ 2: 3, 3: 6, 4: 7, 5: 6, 6: 4, 7: 2 }),
  base: { volcano: 120, opal: 160, fossil: 200, obsidian: 240, A: 360, K: 360, Q: 400, J: 400, T: 440, N: 440 },
  wildW: 120, scatW: 59,
  pays: {
    volcano: { 3: 6, 4: 15, 5: 35, 6: 150 }, opal: { 3: 5, 4: 10, 5: 20, 6: 70 }, fossil: { 3: 4, 4: 8, 5: 12, 6: 40 }, obsidian: { 3: 3, 4: 6, 5: 10, 6: 25 },
    A: { 3: 1, 4: 2, 5: 5, 6: 15 }, K: { 3: 1, 4: 2, 5: 5, 6: 15 }, Q: { 3: 1, 4: 2, 5: 4, 6: 12 }, J: { 3: 1, 4: 2, 5: 4, 6: 12 }, T: { 3: 1, 4: 2, 5: 3, 6: 8 }, N: { 3: 1, 4: 2, 5: 3, 6: 8 }
  },
  fs: { 4: 12, 5: 17, 6: 22 }, fsRetrig: 5, fsRetrigMin: 3
};
function qkTables() {
  QK.reel = [0, 1, 2, 3, 4, 5].map(i => wtable({ ...QK.base, wild: i >= 1 && i <= 4 ? QK.wildW : 0, scatter: QK.scatW }));
}
qkTables();
function qkFill(R, i, n) { return Array.from({ length: n }, () => wpick(R, QK.reel[i])); }
function qkWays(grid) { return grid.reduce((a, c) => a * c.length, 1); }
function qkEval(grid) {
  const wins = []; let credits = 0;
  for (const s of Object.keys(QK.pays)) {
    let ways = 1, k = 0; const cells = [];
    for (let i = 0; i < grid.length; i++) {
      let n = 0; grid[i].forEach((x, r) => { if (x === s || x === 'wild') { n++; cells.push([i, r]); } });
      if (!n) break; ways *= n; k++;
    }
    const p = QK.pays[s][k];
    if (k >= 3 && p) { const c = p * ways; credits += c; wins.push({ sym: s, n: k, ways, credits: c, cells: cells.filter(([i]) => i < k) }); }
  }
  return { wins, credits };
}
// One full round (initial drop plus every cascade). fsState: null in the base game, or { mult } (mutated) in free spins.
function qkRound(R, fsState) {
  const rows = [0, 1, 2, 3, 4, 5].map(() => wpick(R, QK.rows));
  let grid = rows.map((n, i) => qkFill(R, i, n));
  const steps = []; let total = 0;
  for (let guard = 0; guard < 60; guard++) {
    const ev = qkEval(grid);
    if (!ev.wins.length) { steps.push({ grid, wins: [], credits: 0, mult: fsState ? fsState.mult : 1 }); break; }
    const mult = fsState ? fsState.mult : 1, credits = ev.credits * mult;
    total += credits;
    const dead = new Set(); ev.wins.forEach(w => w.cells.forEach(([i, r]) => dead.add(i * 8 + r)));
    const next = grid.map((col, i) => {
      const keep = col.filter((_, r) => !dead.has(i * 8 + r)), add = qkFill(R, i, col.length - keep.length);
      return add.concat(keep); // new symbols fall in from the top
    });
    steps.push({ grid, wins: ev.wins, credits, mult, dead, next });
    if (fsState) fsState.mult++;
    grid = next;
  }
  const last = steps[steps.length - 1].grid;
  let sc = 0; last.forEach(col => col.forEach(s => { if (s === 'scatter') sc++; }));
  const fs = fsState ? (sc >= QK.fsRetrigMin ? QK.fsRetrig : 0) : (QK.fs[Math.min(6, sc)] || 0);
  return { steps, total, scatters: sc, fs, ways: qkWays(steps[0].grid) };
}
const qkFsInit = () => ({ mult: 1 });

// ---------------------------------------------------------------- Sugar Burst: 7x7 cluster pays, tumbles, multiplier spots
const SB = {
  credits: 20, N: 7,
  weights: { pop: 40, bear: 50, wrap: 60, star: 70, gumR: 90, gumY: 90, gumG: 100, scatter: 3 },
  // pay per cluster size 5,6,...,14,15+ (credits at a 20-credit bet)
  pays: {
    pop: [107, 161, 214, 321, 428, 535, 803, 1070, 1605, 2140, 5350],
    bear: [54, 80, 107, 161, 214, 321, 428, 535, 803, 1070, 2675],
    wrap: [43, 54, 80, 107, 161, 214, 321, 428, 535, 803, 1605],
    star: [32, 43, 54, 80, 107, 161, 214, 321, 428, 535, 1070],
    gumR: [21, 27, 32, 43, 54, 80, 107, 161, 214, 321, 535],
    gumY: [21, 27, 32, 43, 54, 80, 107, 161, 214, 321, 535],
    gumG: [16, 21, 27, 32, 43, 54, 80, 107, 161, 214, 428]
  },
  fs: { 3: 15, 4: 18, 5: 22, 6: 26, 7: 30 }, maxMark: 128
};
function sbTables() { SB.table = wtable(SB.weights); }
sbTables();
const sbPay = (s, n) => n < 5 ? 0 : SB.pays[s][Math.min(10, n - 5)];
function sbClusters(grid) { // grid[c][r]
  const N = SB.N, seen = new Uint8Array(N * N), out = [];
  for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
    const s = grid[c][r]; if (seen[c * N + r] || s === 'scatter') continue;
    const cells = [], st = [[c, r]]; seen[c * N + r] = 1;
    while (st.length) {
      const [x, y] = st.pop(); cells.push([x, y]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || seen[nx * N + ny] || grid[nx][ny] !== s) continue;
        seen[nx * N + ny] = 1; st.push([nx, ny]);
      }
    }
    if (cells.length >= 5) out.push({ sym: s, cells });
  }
  return out;
}
// marks: Int16Array(49), 0 = none, 1 = marked, 2..128 = multiplier. Base game: fresh each spin. Free spins: kept for the round.
function sbRound(R, fsState) {
  const N = SB.N, marks = fsState ? fsState.marks : new Int16Array(N * N);
  let grid = Array.from({ length: N }, () => Array.from({ length: N }, () => wpick(R, SB.table)));
  const steps = []; let total = 0;
  for (let guard = 0; guard < 80; guard++) {
    const cl = sbClusters(grid);
    if (!cl.length) { steps.push({ grid, wins: [], credits: 0, marks: marks.slice() }); break; }
    let credits = 0; const before = marks.slice();
    for (const w of cl) {
      let m = 0; for (const [c, r] of w.cells) if (marks[c * N + r] >= 2) m += marks[c * N + r];
      w.mult = Math.max(1, m); w.base = sbPay(w.sym, w.cells.length); w.credits = w.base * w.mult; credits += w.credits;
    }
    const dead = new Set();
    for (const w of cl) for (const [c, r] of w.cells) { dead.add(c * N + r); const k = c * N + r; marks[k] = marks[k] === 0 ? 1 : Math.min(SB.maxMark, marks[k] * 2); }
    const next = grid.map((col, c) => { const keep = col.filter((_, r) => !dead.has(c * N + r)); return Array.from({ length: N - keep.length }, () => wpick(R, SB.table)).concat(keep); });
    total += credits;
    steps.push({ grid, wins: cl, credits, dead, next, marks: before, marksAfter: marks.slice() });
    grid = next;
  }
  const last = steps[steps.length - 1].grid; let sc = 0; last.forEach(col => col.forEach(s => { if (s === 'scatter') sc++; }));
  return { steps, total, scatters: sc, fs: sc >= 3 ? SB.fs[Math.min(7, sc)] : 0 };
}
const sbFsInit = () => ({ marks: new Int16Array(SB.N * SB.N) });

// ---------------------------------------------------------------- Liberty Sevens: 3 reels, 1 line, wild x2 (x4)
// Physical reel of 22 stops: 11 symbols, each followed by a blank. Weights map the virtual reel onto the stops.
const LS_ORDER = ['wild', 'bar1', 'b7', 'bar2', 'r7', 'bar3', 'bar1', 'w7', 'bar2', 'bar3', 'bar1'];
const LS_W = { wild: 3, r7: 8, w7: 10, b7: 8, bar3: 12, bar2: 12, bar1: 20, blank: 12 };
const LS = { colors: { r7: 'R', bar1: 'R', w7: 'W', bar2: 'W', b7: 'B', bar3: 'B' } };
function lsReel(order, w) { const strip = [], weights = []; for (const s of order) { strip.push(s, 'blank'); weights.push(w[s], w.blank); } return { strip, weights }; }
function lsBuild() {
  LS.reels = [0, 1, 2].map(() => { const d = lsReel(LS_ORDER, LS_W); d.cum = []; let t = 0; for (const x of d.weights) { t += x; d.cum.push(t); } d.total = t; return d; });
}
lsBuild();
const isSeven = s => s === 'r7' || s === 'w7' || s === 'b7';
const isBar = s => s === 'bar1' || s === 'bar2' || s === 'bar3';
// rules: each test(sym, reelIndex) for a non-wild symbol; wilds substitute everywhere (but never for a blank line).
const LS_RULES = [
  { id: 'rwb7', name: 'Red 7 · White 7 · Blue 7', pay: 400, t: [s => s === 'r7', s => s === 'w7', s => s === 'b7'] },
  { id: 'r7', name: 'Three Red 7s', pay: 200, t: [s => s === 'r7', s => s === 'r7', s => s === 'r7'] },
  { id: 'b7', name: 'Three Blue 7s', pay: 150, t: [s => s === 'b7', s => s === 'b7', s => s === 'b7'] },
  { id: 'w7', name: 'Three White 7s', pay: 100, t: [s => s === 'w7', s => s === 'w7', s => s === 'w7'] },
  { id: 'rwbbar', name: '1 BAR · 2 BAR · 3 BAR', pay: 50, t: [s => s === 'bar1', s => s === 'bar2', s => s === 'bar3'] },
  { id: 'any7', name: 'Any Three 7s', pay: 40, t: [isSeven, isSeven, isSeven] },
  { id: 'bar3', name: 'Three Triple BARs', pay: 40, t: [s => s === 'bar3', s => s === 'bar3', s => s === 'bar3'] },
  { id: 'bar2', name: 'Three Double BARs', pay: 25, t: [s => s === 'bar2', s => s === 'bar2', s => s === 'bar2'] },
  { id: 'rwb', name: 'Any Red · White · Blue', pay: 20, t: [s => LS.colors[s] === 'R', s => LS.colors[s] === 'W', s => LS.colors[s] === 'B'] },
  { id: 'bar1', name: 'Three BARs', pay: 10, t: [s => s === 'bar1', s => s === 'bar1', s => s === 'bar1'] },
  { id: 'anybar', name: 'Any Three BARs', pay: 5, t: [isBar, isBar, isBar] },
  { id: 'red', name: 'Any Three Reds', pay: 2, t: [s => LS.colors[s] === 'R', s => LS.colors[s] === 'R', s => LS.colors[s] === 'R'] },
  { id: 'white', name: 'Any Three Whites', pay: 2, t: [s => LS.colors[s] === 'W', s => LS.colors[s] === 'W', s => LS.colors[s] === 'W'] },
  { id: 'blue', name: 'Any Three Blues', pay: 2, t: [s => LS.colors[s] === 'B', s => LS.colors[s] === 'B', s => LS.colors[s] === 'B'] },
  { id: 'onew', name: 'Any Wild', pay: 1, special: 'anyWild' }
];
const LS_TOP = [1000, 2000, 5000]; // three wilds by coins
const LS_WILDMULT = [1, 2, 4];
function lsEval(line, coins) {
  const nw = line.filter(s => s === 'wild').length;
  if (nw === 3) return { pay: LS_TOP[coins - 1], name: 'Three Liberty Stars', mult: 1, top: true };
  let best = null;
  for (const rule of LS_RULES) {
    if (rule.special === 'anyWild') { if (nw >= 1 && !best) best = { pay: rule.pay * coins * LS_WILDMULT[nw], name: rule.name, mult: LS_WILDMULT[nw], id: rule.id }; continue; }
    let ok = true; for (let i = 0; i < 3; i++) { const s = line[i]; if (s === 'wild') continue; if (s === 'blank' || !rule.t[i](s)) { ok = false; break; } }
    if (!ok) continue;
    const p = rule.pay * coins * LS_WILDMULT[nw];
    if (!best || p > best.pay) best = { pay: p, name: rule.name, mult: LS_WILDMULT[nw], id: rule.id };
  }
  return best;
}
function lsStop(R, d) { const x = R(d.total); let lo = 0, hi = d.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (d.cum[m] > x) hi = m; else lo = m + 1; } return lo; }
function lsRound(R, coins) {
  const stops = LS.reels.map(d => lsStop(R, d));
  const cols = stops.map((s, i) => { const st = LS.reels[i].strip, L = st.length; return [st[mod(s - 1, L)], st[s], st[mod(s + 1, L)]]; });
  const line = cols.map(c => c[1]);
  const w = lsEval(line, coins);
  return { stops, cols, line, win: w, total: w ? w.pay : 0, fs: 0 };
}
// Exact return by enumerating every weighted stop combination.
function lsExactRTP(coins) {
  const [a, b, c] = LS.reels; let ret = 0, hits = 0, tot = a.total * b.total * c.total;
  for (let i = 0; i < a.strip.length; i++) for (let j = 0; j < b.strip.length; j++) for (let k = 0; k < c.strip.length; k++) {
    const w = lsEval([a.strip[i], b.strip[j], c.strip[k]], coins); if (!w) continue;
    const p = a.weights[i] * b.weights[j] * c.weights[k]; ret += p * w.pay; hits += p;
  }
  return { rtp: ret / tot / coins, hit: hits / tot };
}

// ---------------------------------------------------------------- Queen of the Nile Sun: 5x3, 20 lines
const LINES20 = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0]];
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function buildStrip(counts, seed, spaced = []) {
  const rnd = mulberry(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const a = []; for (const [s, n] of Object.entries(counts)) for (let i = 0; i < n; i++) a.push(s);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const L = a.length; let ok = true;
    for (let i = 0; i < L && ok; i++) if (spaced.includes(a[i])) for (let d = 1; d < 3; d++) if (spaced.includes(a[(i + d) % L])) ok = false;
    for (let i = 0; i < L && ok; i++) if (a[i] === a[(i + 1) % L] && a[i] === a[(i + 2) % L]) ok = false;
    if (ok) return a;
  }
  throw new Error('strip build failed');
}
const SQ_BASE = { cat: 3, lotus: 4, barque: 4, vase: 5, A: 6, K: 6, Q: 7, J: 7, T: 8, N: 8 };
const SQ = {
  lines: LINES20, fsCount: 15, fsMult: 3,
  counts: [{ ...SQ_BASE, sphinx: 2, queen: 1 }, { ...SQ_BASE, sphinx: 2, queen: 2 }, { ...SQ_BASE, sphinx: 2, queen: 2 }, { ...SQ_BASE, sphinx: 2, queen: 2 }, { ...SQ_BASE, sphinx: 2, queen: 2 }],
  pays: {
    queen: { 2: 10, 3: 200, 4: 2000, 5: 9000 }, cat: { 2: 2, 3: 25, 4: 100, 5: 750 }, lotus: { 2: 2, 3: 25, 4: 100, 5: 750 }, barque: { 3: 20, 4: 100, 5: 400 }, vase: { 3: 12, 4: 75, 5: 250 },
    A: { 3: 10, 4: 50, 5: 125 }, K: { 3: 10, 4: 50, 5: 125 }, Q: { 3: 5, 4: 25, 5: 100 }, J: { 3: 5, 4: 25, 5: 100 }, T: { 3: 5, 4: 25, 5: 100 }, N: { 3: 5, 4: 25, 5: 100 }
  },
  scatterPay: { 2: 2, 3: 5, 4: 20, 5: 100 } // x total bet
};
function sqBuild() { SQ.strips = SQ.counts.map((c, i) => buildStrip(c, 4100 + i * 7, ['sphinx', 'queen'])); }
sqBuild();
function sqLine(syms) {
  let tgt = null, n = 0, wild = false;
  for (const s of syms) {
    if (s === 'sphinx') break;
    if (s === 'queen') { n++; wild = true; continue; }
    if (tgt === null) { tgt = s; n++; continue; }
    if (s === tgt) { n++; continue; }
    break;
  }
  let best = null;
  if (tgt && SQ.pays[tgt][n]) best = { sym: tgt, n, pay: SQ.pays[tgt][n] * (wild ? 2 : 1), doubled: wild };
  let wn = 0; while (wn < 5 && syms[wn] === 'queen') wn++;
  if (wn && SQ.pays.queen[wn] && (!best || SQ.pays.queen[wn] > best.pay)) best = { sym: 'queen', n: wn, pay: SQ.pays.queen[wn], doubled: false };
  return best;
}
// lines: active lines (1..20). Credits = coins per line. fsState: { } in free spins (all wins x3).
function sqRound(R, lines, fsState) {
  const stops = SQ.strips.map(s => R(s.length));
  const grid = stops.map((t, i) => { const st = SQ.strips[i]; return [0, 1, 2].map(r => st[(t + r) % st.length]); });
  const m = fsState ? SQ.fsMult : 1, wins = []; let total = 0;
  for (let li = 0; li < lines; li++) {
    const L = SQ.lines[li], b = sqLine(L.map((r, i) => grid[i][r]));
    if (!b) continue; const p = b.pay * m; total += p;
    wins.push({ line: li, cells: L.slice(0, b.n).map((r, i) => [i, r]), credits: p, sym: b.sym, n: b.n, doubled: b.doubled });
  }
  const sc = []; grid.forEach((col, i) => col.forEach((s, r) => { if (s === 'sphinx') sc.push([i, r]); }));
  if (SQ.scatterPay[sc.length]) { const p = SQ.scatterPay[sc.length] * lines * m; total += p; wins.push({ line: -1, cells: sc, credits: p, sym: 'sphinx', n: sc.length, scatter: true }); }
  return { stops, grid, wins, total, scatters: sc.length, fs: sc.length >= 3 ? SQ.fsCount : 0 };
}
const sqFsInit = () => ({});

// ---------------------------------------------------------------- simulation (used for the RTP numbers in the paytables)
// Plays `n` paid spins (features included) and returns the return-to-player and stats.
function simulate(id, R, n, opts = {}) {
  let bet = 0, ret = 0, feats = 0, fsRet = 0, hits = 0, maxWin = 0;
  for (let i = 0; i < n; i++) {
    let won = 0, cost;
    if (id === 'slot-quake' || id === 'slot-sugar') {
      const round = id === 'slot-quake' ? qkRound : sbRound, init = id === 'slot-quake' ? qkFsInit : sbFsInit;
      cost = 20; const o = round(R, null); won = o.total;
      if (o.fs) { feats++; const st = init(); let left = o.fs, f = 0, guard = 0; while (left > 0 && guard++ < 500) { left--; const q = round(R, st); f += q.total; left += q.fs; } fsRet += f; won += f; }
    } else if (id === 'slot-liberty7') { cost = opts.coins || 3; won = lsRound(R, cost).total; }
    else {
      const L = opts.lines || 20; cost = L; const o = sqRound(R, L, null); won = o.total;
      if (o.fs) { feats++; const st = sqFsInit(); let left = o.fs, f = 0, guard = 0; while (left > 0 && guard++ < 2000) { left--; const q = sqRound(R, L, st); f += q.total; left += q.fs; } fsRet += f; won += f; }
    }
    bet += cost; ret += won; if (won > 0) hits++; if (won / cost > maxWin) maxWin = won / cost;
  }
  return { rtp: ret / bet, featureEvery: feats ? n / feats : Infinity, featureShare: fsRet / Math.max(1, ret), hit: hits / n, maxWin };
}

export const _math = { QK, SB, LS, SQ, qkRound, qkEval, qkTables, sbRound, sbClusters, sbTables, lsRound, lsEval, lsExactRTP, lsBuild, LS_W, LS_RULES, sqRound, sqBuild, simulate, qkFsInit, sbFsInit, sqFsInit };

// =====================================================================================================
// Painting helpers (every symbol is drawn in a 100x100 box)
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
function gloss(c, x, y, rx, ry, a = .65, rot = -.5) {
  c.save(); c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
  c.globalAlpha = a; c.beginPath(); c.arc(x + rx * .9, y + ry * 1.6, Math.max(1.2, ry * .35), 0, TAU); c.fill(); c.restore();
}
function ribbon(c, label, y = 82, fillA = '#1d4fb8', fillB = '#0a1f5c', ink = '#ffe08a', edge = '#f7c948', size = 11) {
  rr(c, 8, y - 8, 84, 17, 5); c.fillStyle = lin(c, 0, y - 8, 0, y + 9, [[0, fillA], [1, fillB]]); c.fill(); c.lineWidth = 2; c.strokeStyle = edge; c.stroke();
  text(c, label, 50, y + .5, size, { fill: ink, stroke: '#000', sw: 2 });
}
function starPath(c, cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, d = i % 2 ? r : R; i ? c.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d) : c.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } c.closePath();
}

// ---------------------------------------------------------------- Mega Quake (volcanic)
function pVolcano(c) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = rad(c, 50, 30, 4, 50, 50, 48, [[0, '#ff9a3a'], [.35, '#8a2a0c'], [1, '#1a0604']]); c.fill();
  c.save(); c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.clip();
  for (const [x, y, r] of [[38, 18, 9], [52, 12, 11], [64, 20, 8], [45, 6, 7]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = 'rgba(70,50,50,.75)'; c.fill(); }
  const cone = () => { c.beginPath(); c.moveTo(0, 100); c.lineTo(34, 42); c.quadraticCurveTo(50, 36, 66, 42); c.lineTo(100, 100); c.closePath(); };
  cone(); c.fillStyle = lin(c, 20, 0, 80, 0, [[0, '#5a3426'], [.45, '#3a2018'], [1, '#160a06']]); c.fill();
  c.strokeStyle = '#ff7a12'; c.lineCap = 'round'; c.lineWidth = 4; c.shadowColor = '#ff5a00'; c.shadowBlur = 8;
  c.beginPath(); c.moveTo(44, 42); c.bezierCurveTo(40, 58, 46, 66, 36, 86); c.moveTo(56, 42); c.bezierCurveTo(60, 56, 56, 70, 66, 92); c.moveTo(50, 42); c.lineTo(50, 60); c.stroke();
  c.shadowBlur = 0; c.beginPath(); c.ellipse(50, 41, 14, 4, 0, 0, TAU); c.fillStyle = '#ffd34a'; c.fill();
  for (const [x, y, r, col] of [[50, 30, 6, '#ffb000'], [42, 22, 4, '#ff6a00'], [60, 24, 4.5, '#ff8a00'], [52, 16, 3, '#ffe08a'], [36, 30, 3, '#ff4a00'], [66, 32, 3, '#ffb000']]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
  c.restore();
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = lin(c, 0, 0, 0, 100, [[0, '#ffd08a'], [.5, '#ff6a00'], [1, '#6a1a04']]); c.stroke();
}
function pOpal(c) {
  const pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; pts.push([50 + Math.cos(a) * 42, 52 + Math.sin(a) * 40]); }
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = rad(c, 42, 38, 2, 50, 52, 46, [[0, '#fff3a0'], [.3, '#ffa020'], [.7, '#e0300a'], [1, '#6a0804']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#3a0602'; c.lineJoin = 'round'; c.stroke();
  const inner = pts.map(([x, y]) => [50 + (x - 50) * .52, 52 + (y - 52) * .52]);
  c.strokeStyle = 'rgba(255,240,180,.7)'; c.lineWidth = 1.3; c.beginPath();
  inner.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  pts.forEach(([x, y], i) => { c.moveTo(x, y); c.lineTo(inner[i][0], inner[i][1]); }); c.stroke();
  c.beginPath(); inner.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = 'rgba(255,255,200,.25)'; c.fill();
  sparkle(c, 66, 26, 8); sparkle(c, 36, 64, 4, '#ffe8a0');
}
function pFossil(c) {
  c.beginPath(); c.arc(50, 50, 43, 0, TAU); c.fillStyle = rad(c, 40, 36, 4, 50, 50, 46, [[0, '#f1dcb2'], [.6, '#b8935e'], [1, '#5a4024']]); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#3a2814'; c.stroke();
  const sp = t => { const r = 40 * Math.exp(-.2 * t); return [50 + Math.cos(t) * r, 50 + Math.sin(t) * r]; };
  c.strokeStyle = '#4a3218'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
  for (let t = 0; t < 4 * TAU; t += .08) { const [x, y] = sp(t + 1.2); t ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  c.lineWidth = 1.3; c.strokeStyle = 'rgba(74,50,24,.7)'; c.beginPath();
  for (let t = .2; t < 3 * TAU; t += .32) { const [x0, y0] = sp(t + 1.2), [x1, y1] = sp(t + 1.2 + TAU); c.moveTo(x0, y0); c.lineTo(x1, y1); } c.stroke();
  c.save(); c.globalAlpha = .35; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(36, 30, 14, 6, -.6, 0, TAU); c.fill(); c.restore();
}
function pObsidian(c) {
  c.beginPath(); c.ellipse(50, 88, 36, 8, 0, 0, TAU); c.fillStyle = rad(c, 50, 88, 2, 50, 88, 36, [[0, 'rgba(255,140,0,.9)'], [1, 'rgba(255,60,0,0)']]); c.fill();
  const shard = (pts, a, b) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = lin(c, pts[0][0], pts[0][1], pts[2][0], pts[2][1], [[0, a], [1, b]]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#0a0410'; c.lineJoin = 'round'; c.stroke(); };
  shard([[22, 88], [18, 40], [30, 26], [40, 88]], '#7a5ab8', '#120820');
  shard([[60, 88], [70, 34], [84, 44], [80, 88]], '#5a3a8a', '#0a0414');
  shard([[34, 90], [40, 22], [52, 6], [64, 22], [68, 90]], '#9a7ae0', '#100620');
  c.strokeStyle = 'rgba(220,200,255,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(52, 8); c.lineTo(50, 88); c.moveTo(42, 26); c.lineTo(46, 60); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(40, 22); c.lineTo(52, 6); c.lineTo(48, 50); c.closePath(); c.fill();
  sparkle(c, 58, 18, 6, '#e8d8ff');
}
function pStone(c, ch, glow = '#ff6a00') {
  const size = ch.length > 1 ? 50 : 66, y = 54;
  c.font = `400 ${size}px ${FD}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.save(); c.shadowColor = glow; c.shadowBlur = 10; c.lineWidth = 7; c.strokeStyle = '#140804'; c.strokeText(ch, 50, y); c.restore();
  c.fillStyle = lin(c, 0, y - size * .5, 0, y + size * .5, [[0, '#9a8a80'], [.5, '#5a4a44'], [1, '#2a1e1a']]); c.fillText(ch, 50, y);
  c.save(); c.globalCompositeOperation = 'source-atop'; c.strokeStyle = glow; c.lineWidth = 2.2; c.shadowColor = '#ffd34a'; c.shadowBlur = 4; c.beginPath();
  c.moveTo(20, 30); c.lineTo(38, 44); c.lineTo(34, 58); c.lineTo(52, 70); c.lineTo(48, 84); c.moveTo(80, 26); c.lineTo(64, 40); c.lineTo(70, 52); c.lineTo(58, 62); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, y - size * .5, 100, size * .22); c.restore();
}
function pQuakeWild(c) {
  rr(c, 6, 10, 88, 80, 12); c.fillStyle = lin(c, 0, 10, 0, 90, [[0, '#4a3a36'], [.5, '#241814'], [1, '#0e0806']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#ff8a1a'; c.stroke();
  c.save(); rr(c, 6, 10, 88, 80, 12); c.clip();
  c.strokeStyle = '#ffb000'; c.lineWidth = 5; c.shadowColor = '#ff4a00'; c.shadowBlur = 14; c.lineJoin = 'miter';
  c.beginPath(); c.moveTo(6, 26); c.lineTo(24, 34); c.lineTo(20, 46); c.lineTo(40, 52); c.lineTo(36, 64); c.lineTo(60, 70); c.lineTo(58, 82); c.lineTo(94, 90); c.stroke();
  c.lineWidth = 2; c.strokeStyle = '#fff2a0'; c.stroke(); c.restore();
  text(c, 'WILD', 50, 47, 25, { fill: lin(c, 0, 34, 0, 60, [[0, '#fff3b0'], [.5, '#ff9a1a'], [1, '#b32a00']]), stroke: '#140604', sw: 5 });
  sparkle(c, 80, 20, 6, '#ffe08a');
}
function pLavaOrb(c) {
  c.beginPath(); c.arc(50, 44, 38, 0, TAU); c.fillStyle = rad(c, 40, 30, 2, 50, 44, 40, [[0, '#fffbd0'], [.25, '#ffd040'], [.6, '#ff5a00'], [1, '#5a0a00']]); c.fill();
  c.save(); c.beginPath(); c.arc(50, 44, 38, 0, TAU); c.clip();
  c.strokeStyle = 'rgba(120,10,0,.55)'; c.lineWidth = 3; c.beginPath();
  for (let k = 0; k < 4; k++) { c.moveTo(14, 30 + k * 12); c.bezierCurveTo(34, 20 + k * 12, 60, 46 + k * 10, 90, 32 + k * 12); } c.stroke(); c.restore();
  c.beginPath(); c.arc(50, 44, 38, 0, TAU); c.lineWidth = 3; c.strokeStyle = '#3a0600'; c.stroke();
  gloss(c, 38, 26, 12, 6, .55);
  ribbon(c, 'SCATTER', 84, '#ff7a00', '#7a1a00', '#fff3b0', '#ffd34a');
}

// ---------------------------------------------------------------- Sugar Burst (glossy candy)
function sugarDots(c, clip, n = 14) { c.save(); clip(); c.clip(); c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < n; i++) { const a = i * 2.39996, r = 8 + (i * 37 % 34); c.fillRect(50 + Math.cos(a) * r, 52 + Math.sin(a) * r, 1.8, 1.8); } c.restore(); }
function pLolly(c) {
  rr(c, 46, 56, 8, 42, 3); c.fillStyle = lin(c, 46, 0, 54, 0, [[0, '#d9d2c8'], [.5, '#ffffff'], [1, '#bdb4a8']]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#8a8070'; c.stroke();
  c.beginPath(); c.arc(50, 40, 36, 0, TAU); c.fillStyle = '#fff4fa'; c.fill();
  c.save(); c.beginPath(); c.arc(50, 40, 35, 0, TAU); c.clip(); c.strokeStyle = '#ff2f8e'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
  for (let t = 0; t < 6.2 * Math.PI; t += .1) { const r = t / (6.2 * Math.PI) * 36, x = 50 + Math.cos(t) * r, y = 40 + Math.sin(t) * r; t ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  c.strokeStyle = '#7a3cff'; c.lineWidth = 3; c.beginPath(); for (let t = .8; t < 6.2 * Math.PI; t += .1) { const r = t / (6.2 * Math.PI) * 36 - 5, x = 50 + Math.cos(t) * r, y = 40 + Math.sin(t) * r; t > .8 ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.restore();
  c.beginPath(); c.arc(50, 40, 36, 0, TAU); c.fillStyle = rad(c, 50, 40, 20, 50, 40, 37, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(90,0,50,.35)']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#a0125a'; c.stroke();
  gloss(c, 36, 24, 13, 6, .75);
}
function pBear(c) {
  const body = () => { c.beginPath(); c.arc(32, 20, 9, 0, TAU); c.arc(68, 20, 9, 0, TAU); c.moveTo(80, 34); c.arc(50, 34, 30 * .9, 0, TAU); c.moveTo(78, 70); c.ellipse(50, 70, 28, 24, 0, 0, TAU); c.moveTo(30, 54); c.arc(22, 54, 9, 0, TAU); c.moveTo(87, 54); c.arc(78, 54, 9, 0, TAU); c.moveTo(42, 92); c.arc(32, 90, 10, 0, TAU); c.moveTo(78, 90); c.arc(68, 90, 10, 0, TAU); };
  body(); c.fillStyle = rad(c, 40, 34, 4, 50, 56, 56, [[0, '#ffb07a'], [.45, '#ff3a2a'], [1, '#8a0010']]); c.fill();
  c.lineWidth = 2; c.strokeStyle = 'rgba(110,0,10,.8)'; c.stroke();
  c.fillStyle = 'rgba(255,220,200,.35)'; c.beginPath(); c.ellipse(50, 72, 15, 13, 0, 0, TAU); c.fill();
  c.fillStyle = '#5a0008'; c.beginPath(); c.arc(40, 32, 3, 0, TAU); c.arc(60, 32, 3, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(50, 42, 6, 4.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#5a0008'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(45, 48); c.quadraticCurveTo(50, 52, 55, 48); c.stroke();
  gloss(c, 38, 18, 10, 5, .7); gloss(c, 34, 60, 6, 9, .45, .2);
}
function pWrap(c) {
  const end = s => { c.beginPath(); c.moveTo(50 + s * 22, 50); c.lineTo(50 + s * 46, 28); c.quadraticCurveTo(50 + s * 40, 50, 50 + s * 46, 72); c.closePath(); c.fillStyle = lin(c, 50 + s * 22, 0, 50 + s * 46, 0, [[0, '#7a2ad8'], [1, '#d8a8ff']]); c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#3a0a7a'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(50 + s * 26, 48); c.lineTo(50 + s * 42, 34); c.moveTo(50 + s * 26, 52); c.lineTo(50 + s * 42, 66); c.stroke(); };
  end(-1); end(1);
  const body = () => { c.beginPath(); c.ellipse(50, 50, 28, 23, 0, 0, TAU); };
  body(); c.fillStyle = rad(c, 42, 40, 2, 50, 50, 30, [[0, '#e8c8ff'], [.4, '#9a3cff'], [1, '#3a0a8a']]); c.fill();
  c.save(); body(); c.clip(); c.strokeStyle = 'rgba(255,230,120,.85)'; c.lineWidth = 4.5; c.beginPath(); for (let x = -10; x < 110; x += 13) { c.moveTo(x, 20); c.lineTo(x + 26, 80); } c.stroke(); c.restore();
  body(); c.lineWidth = 2; c.strokeStyle = '#2a0660'; c.stroke();
  gloss(c, 40, 37, 11, 5, .75);
}
function pStarCandy(c) {
  starPath(c, 50, 52, 44, 21); c.fillStyle = rad(c, 42, 38, 3, 50, 52, 46, [[0, '#fffbd0'], [.35, '#ffd21a'], [1, '#d86a00']]); c.fill(); c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = '#8a3a00'; c.stroke();
  starPath(c, 50, 52, 28, 13); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.6)'; c.stroke();
  gloss(c, 40, 34, 9, 4.5, .8);
}
function pHeart(c) {
  const h = () => { c.beginPath(); c.moveTo(50, 90); c.bezierCurveTo(18, 68, 6, 48, 11, 32); c.bezierCurveTo(16, 14, 40, 10, 50, 30); c.bezierCurveTo(60, 10, 84, 14, 89, 32); c.bezierCurveTo(94, 48, 82, 68, 50, 90); c.closePath(); };
  h(); c.fillStyle = rad(c, 36, 30, 3, 50, 50, 52, [[0, '#ffb8c8'], [.4, '#ff1a4a'], [1, '#7a0020']]); c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#5a0018'; c.stroke();
  sugarDots(c, h, 18); gloss(c, 30, 30, 10, 5, .75, -.7);
}
function pDrop(c) {
  const d = () => { c.beginPath(); c.moveTo(12, 84); c.bezierCurveTo(10, 30, 30, 14, 50, 14); c.bezierCurveTo(70, 14, 90, 30, 88, 84); c.quadraticCurveTo(50, 94, 12, 84); c.closePath(); };
  d(); c.fillStyle = rad(c, 40, 34, 3, 50, 56, 52, [[0, '#fffbc0'], [.4, '#ffd800'], [1, '#b87a00']]); c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#7a4a00'; c.stroke();
  sugarDots(c, d, 22); gloss(c, 36, 30, 10, 5, .8);
}
function pBean(c) {
  const b = () => { c.beginPath(); c.moveTo(20, 36); c.bezierCurveTo(24, 10, 64, 6, 80, 26); c.bezierCurveTo(96, 46, 88, 82, 62, 86); c.bezierCurveTo(44, 88, 46, 64, 32, 70); c.bezierCurveTo(14, 76, 14, 52, 20, 36); c.closePath(); };
  b(); c.fillStyle = rad(c, 46, 32, 3, 54, 50, 50, [[0, '#d8ffc0'], [.4, '#3ad84a'], [1, '#0a6a1a']]); c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#064a12'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.45)'; for (const [x, y] of [[40, 50], [64, 40], [70, 66], [30, 58]]) { c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
  gloss(c, 44, 22, 13, 5, .8, -.25);
}
function pGumball(c) {
  rr(c, 28, 66, 44, 30, 6); c.fillStyle = lin(c, 0, 66, 0, 96, [[0, '#ff4a5a'], [1, '#8a0018']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#4a0010'; c.stroke();
  rr(c, 42, 74, 16, 10, 3); c.fillStyle = '#ddd'; c.fill(); c.stroke();
  c.beginPath(); c.arc(50, 38, 32, 0, TAU); c.fillStyle = 'rgba(220,240,255,.35)'; c.fill();
  c.save(); c.beginPath(); c.arc(50, 38, 31, 0, TAU); c.clip();
  const cols = ['#ff2f8e', '#ffd21a', '#3ad84a', '#2a9aff', '#ff7a1a', '#9a3cff'];
  let k = 0; for (let y = 64; y > 22; y -= 10) for (let x = 20 + (y % 20 ? 5 : 0); x < 84; x += 11) { c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fillStyle = rad(c, x - 2, y - 2, .5, x, y, 6, [[0, '#fff'], [.3, cols[k % 6]], [1, cols[(k + 3) % 6]]]); c.fill(); k++; }
  c.restore();
  c.beginPath(); c.arc(50, 38, 32, 0, TAU); c.lineWidth = 2.5; c.strokeStyle = '#4a6a8a'; c.stroke();
  gloss(c, 36, 20, 12, 6, .8);
  ribbon(c, 'SCATTER', 86, '#ff2f8e', '#8a0050', '#fff', '#ffd6ea', 10.5);
}

// ---------------------------------------------------------------- Liberty Sevens (red/white/blue stepper)
function sevenPath(c) { c.beginPath(); c.moveTo(18, 12); c.lineTo(84, 12); c.lineTo(84, 25); c.bezierCurveTo(68, 42, 58, 62, 56, 90); c.lineTo(33, 90); c.bezierCurveTo(35, 66, 46, 46, 61, 30); c.lineTo(38, 30); c.lineTo(36, 36); c.lineTo(18, 36); c.closePath(); }
function pSeven7(c, top, bot, edge, dark) {
  c.lineJoin = 'round';
  sevenPath(c); c.lineWidth = 12; c.strokeStyle = dark; c.stroke();
  c.lineWidth = 6; c.strokeStyle = lin(c, 0, 12, 0, 90, [[0, '#ffffff'], [.5, edge], [1, '#8a8a8a']]); c.stroke();
  c.fillStyle = lin(c, 0, 12, 0, 90, [[0, top], [1, bot]]); c.fill();
  c.save(); sevenPath(c); c.clip(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(46, 14, 46, 10, -.08, 0, TAU); c.fill(); c.restore();
}
function pBarN(c, n, body, txt, edge) {
  const H = n === 1 ? 30 : n === 2 ? 25 : 21, gap = n === 3 ? 4 : 6, tot = n * H + (n - 1) * gap, y0 = 50 - tot / 2;
  for (let k = 0; k < n; k++) {
    const y = y0 + k * (H + gap);
    rr(c, 6, y, 88, H, 5); c.fillStyle = lin(c, 0, y, 0, y + H, [[0, '#ffffff'], [.12, body[0]], [.6, body[1]], [1, body[2]]]); c.fill();
    c.lineWidth = 3; c.strokeStyle = edge; c.stroke();
    text(c, 'BAR', 50, y + H / 2 + 1, H * .72, { fill: txt, stroke: '#0a0a0a', sw: 2 });
  }
}
function pLibStar(c) {
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.fillStyle = gold(c, 5, 95); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#5a3a00'; c.stroke();
  c.beginPath(); c.arc(50, 50, 38, 0, TAU); c.fillStyle = rad(c, 42, 38, 3, 50, 50, 40, [[0, '#4a7aff'], [1, '#0a1a5a']]); c.fill();
  c.save(); c.beginPath(); c.arc(50, 50, 38, 0, TAU); c.clip(); for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#fff' : '#d8102c'; c.globalAlpha = .18; c.fillRect(0, 60 + i * 6, 100, 6); } c.restore();
  starPath(c, 50, 46, 30, 12); c.fillStyle = lin(c, 0, 16, 0, 76, [[0, '#ffffff'], [1, '#c8d0e0']]); c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#0a1a5a'; c.lineJoin = 'round'; c.stroke();
  rr(c, 16, 64, 68, 20, 5); c.fillStyle = lin(c, 0, 64, 0, 84, [[0, '#ff5a5a'], [.5, '#c40018'], [1, '#6a0010']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
  text(c, 'WILD ×2', 50, 74.5, 12.5, { fill: '#fff', stroke: '#3a0008', sw: 2.5 });
  sparkle(c, 78, 18, 7);
}

// ---------------------------------------------------------------- Queen of the Nile Sun (sunset Egypt)
const SUNSET = [[0, '#ffd27a'], [.35, '#ff8a3a'], [.7, '#d8306a'], [1, '#4a1450']];
function sunDisk(c, edge = '#ffd27a') { c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = lin(c, 0, 4, 0, 96, SUNSET); c.fill(); c.lineWidth = 3; c.strokeStyle = edge; c.stroke(); }
function pQueen(c) {
  sunDisk(c);
  c.save(); c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.clip();
  // crown: horns cradling a sun disk
  c.strokeStyle = gold(c, 0, 30); c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(36, 22); c.quadraticCurveTo(30, 6, 42, 4); c.moveTo(64, 22); c.quadraticCurveTo(70, 6, 58, 4); c.stroke();
  c.beginPath(); c.arc(50, 12, 8, 0, TAU); c.fillStyle = rad(c, 48, 10, 1, 50, 12, 8, [[0, '#ffd0a0'], [1, '#d8202a']]); c.fill();
  // hair
  c.beginPath(); c.moveTo(24, 82); c.lineTo(24, 40); c.bezierCurveTo(24, 20, 76, 20, 76, 40); c.lineTo(76, 82); c.closePath(); c.fillStyle = '#140a1a'; c.fill();
  c.strokeStyle = '#f7c948'; c.lineWidth = 1.6; for (const x of [28, 72]) { c.beginPath(); c.moveTo(x, 50); c.lineTo(x, 80); c.stroke(); for (let y = 54; y < 82; y += 7) { c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.stroke(); } }
  rr(c, 30, 26, 40, 6, 2); c.fillStyle = gold(c, 26, 32); c.fill();
  // face
  c.beginPath(); c.moveTo(35, 32); c.lineTo(65, 32); c.bezierCurveTo(66, 56, 60, 70, 50, 72); c.bezierCurveTo(40, 70, 34, 56, 35, 32); c.closePath(); c.fillStyle = lin(c, 35, 0, 65, 0, [[0, '#a8683a'], [.5, '#e0a070'], [1, '#9a5a30']]); c.fill();
  for (const [x, d] of [[43, -1], [57, 1]]) {
    c.beginPath(); c.ellipse(x, 44, 4.6, 2.2, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(x, 44, 1.7, 0, TAU); c.fillStyle = '#111'; c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 5 * d, 44); c.quadraticCurveTo(x, 40, x + 5 * d, 44); c.lineTo(x + 9 * d, 42.5); c.stroke();
    c.strokeStyle = '#2a8ab8'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 5, 40); c.quadraticCurveTo(x, 38, x + 5, 40); c.stroke();
  }
  c.fillStyle = '#b8102a'; c.beginPath(); c.moveTo(45, 61); c.quadraticCurveTo(50, 58, 55, 61); c.quadraticCurveTo(50, 65, 45, 61); c.fill();
  // collar
  for (const [r, col] of [[34, '#f7c948'], [29, '#2ab8a8'], [24, '#f7c948'], [19, '#d8306a']]) { c.beginPath(); c.arc(50, 70, r, .12 * Math.PI, .88 * Math.PI); c.lineWidth = 5; c.strokeStyle = col; c.stroke(); }
  c.restore();
  ribbon(c, 'WILD', 85, '#6a1a8a', '#2a0640', '#ffe08a', '#f7c948', 12);
}
function pSphinx(c) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = lin(c, 0, 4, 0, 96, [[0, '#3a1460'], [.45, '#d8306a'], [.75, '#ff9a3a'], [1, '#ffd27a']]); c.fill();
  c.save(); c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.clip();
  c.beginPath(); c.arc(50, 70, 22, Math.PI, 0); c.fillStyle = rad(c, 50, 70, 2, 50, 70, 24, [[0, '#fff6c0'], [1, '#ffb030']]); c.fill();
  c.fillStyle = '#2a0a2a'; c.fillRect(0, 70, 100, 30);
  c.beginPath(); c.moveTo(10, 72); c.lineTo(14, 58); c.quadraticCurveTo(30, 52, 52, 56); c.lineTo(60, 56); c.lineTo(60, 40); c.quadraticCurveTo(62, 28, 70, 28); c.lineTo(78, 30); c.lineTo(80, 44); c.lineTo(84, 60); c.lineTo(78, 62); c.lineTo(80, 66); c.lineTo(94, 66); c.lineTo(94, 72); c.closePath();
  c.fillStyle = '#1a0618'; c.fill();
  c.strokeStyle = 'rgba(255,190,90,.65)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(62, 40); c.lineTo(66, 54); c.moveTo(70, 32); c.lineTo(72, 50); c.stroke();
  c.fillStyle = 'rgba(255,200,120,.5)'; for (let i = 0; i < 4; i++) c.fillRect(20 + i * 18, 78 + (i % 2) * 4, 12, 1.5);
  c.restore();
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.lineWidth = 3; c.strokeStyle = '#ffd27a'; c.stroke();
  ribbon(c, 'SCATTER', 86, '#ff8a3a', '#8a1a3a', '#fff', '#ffd27a', 10.5);
}
function pCat(c) {
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.fillStyle = rad(c, 50, 40, 5, 50, 50, 47, [[0, '#ffb070'], [.6, '#c8406a'], [1, '#3a1048']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffd27a'; c.stroke();
  const cat = () => { c.beginPath(); c.moveTo(34, 94); c.bezierCurveTo(28, 80, 30, 62, 40, 50); c.lineTo(42, 40); c.lineTo(36, 32); c.lineTo(37, 12); c.lineTo(47, 22); c.lineTo(57, 22); c.lineTo(66, 12); c.lineTo(66, 32); c.lineTo(60, 40); c.lineTo(60, 50); c.bezierCurveTo(70, 62, 72, 80, 66, 94); c.closePath(); };
  cat(); c.fillStyle = lin(c, 30, 0, 70, 0, [[0, '#0a0610'], [.5, '#2a1e34'], [1, '#0a0610']]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#ffd27a'; c.stroke();
  c.strokeStyle = '#0a0610'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 92); c.bezierCurveTo(84, 92, 86, 76, 78, 70); c.stroke();
  c.lineWidth = 4; c.strokeStyle = gold(c, 40, 50); c.beginPath(); c.moveTo(40, 46); c.quadraticCurveTo(50, 52, 61, 46); c.stroke();
  c.beginPath(); c.arc(50, 52, 3.2, 0, TAU); c.fillStyle = '#2ab8a8'; c.fill();
  c.fillStyle = '#ffd34a'; c.beginPath(); c.ellipse(45, 29, 2.6, 1.6, .2, 0, TAU); c.ellipse(58, 29, 2.6, 1.6, -.2, 0, TAU); c.fill();
  c.beginPath(); c.arc(64, 34, 2.2, 0, TAU); c.lineWidth = 1.4; c.strokeStyle = '#ffd34a'; c.stroke();
}
function pLotus(c) {
  c.beginPath(); c.ellipse(50, 80, 42, 12, 0, 0, TAU); c.fillStyle = lin(c, 0, 68, 0, 92, [[0, '#3ab86a'], [1, '#0a4a2a']]); c.fill(); c.lineWidth = 2; c.strokeStyle = '#063a1a'; c.stroke();
  const petal = (a, len, w, cA, cB) => { c.save(); c.translate(50, 72); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-w, -len * .4, -w * .6, -len * .85, 0, -len); c.bezierCurveTo(w * .6, -len * .85, w, -len * .4, 0, 0); c.fillStyle = lin(c, 0, 0, 0, -len, [[0, cA], [1, cB]]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#8a1a5a'; c.stroke(); c.restore(); };
  for (const a of [-1.25, 1.25]) petal(a, 40, 14, '#ffb0d0', '#ff5aa0');
  for (const a of [-.7, .7]) petal(a, 50, 15, '#ffc8e0', '#ff4a90');
  for (const a of [-.25, .25]) petal(a, 58, 15, '#ffe0ee', '#ff6aa8');
  petal(0, 64, 13, '#fff0f6', '#ff7ab0');
  c.beginPath(); c.arc(50, 70, 6, 0, TAU); c.fillStyle = '#ffd34a'; c.fill();
  sparkle(c, 72, 18, 6, '#fff');
}
function pBarque(c) {
  c.beginPath(); c.arc(50, 50, 46, 0, TAU); c.fillStyle = lin(c, 0, 4, 0, 96, [[0, '#0a1a4a'], [.5, '#14608a'], [1, '#062a3a']]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#f7c948'; c.stroke();
  c.save(); c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.clip();
  c.beginPath(); c.arc(50, 40, 16, 0, TAU); c.fillStyle = rad(c, 48, 38, 2, 50, 40, 16, [[0, '#fffbe0'], [1, '#ffb030']]); c.fill();
  c.strokeStyle = 'rgba(255,240,180,.7)'; c.lineWidth = 2; for (let i = 0; i < 10; i++) { const a = i * TAU / 10; c.beginPath(); c.moveTo(50 + Math.cos(a) * 20, 40 + Math.sin(a) * 20); c.lineTo(50 + Math.cos(a) * 27, 40 + Math.sin(a) * 27); c.stroke(); }
  c.fillStyle = 'rgba(4,30,50,.8)'; c.fillRect(0, 70, 100, 30);
  c.strokeStyle = 'rgba(255,200,120,.6)'; c.lineWidth = 1.4; for (let y = 76; y < 96; y += 6) { c.beginPath(); c.moveTo(20, y); c.lineTo(80, y); c.stroke(); }
  c.restore();
  c.beginPath(); c.moveTo(8, 56); c.quadraticCurveTo(14, 72, 30, 72); c.lineTo(70, 72); c.quadraticCurveTo(86, 72, 92, 56); c.quadraticCurveTo(84, 64, 70, 64); c.lineTo(30, 64); c.quadraticCurveTo(16, 64, 8, 56); c.closePath();
  c.fillStyle = gold(c, 56, 72); c.fill(); c.lineWidth = 2; c.strokeStyle = '#4a2a00'; c.stroke();
  rr(c, 38, 52, 24, 12, 2); c.fillStyle = '#2ab8a8'; c.fill(); c.stroke();
}
function pVase(c) {
  const v = () => { c.beginPath(); c.moveTo(38, 10); c.lineTo(62, 10); c.lineTo(60, 20); c.bezierCurveTo(82, 30, 84, 66, 64, 86); c.lineTo(66, 94); c.lineTo(34, 94); c.lineTo(36, 86); c.bezierCurveTo(16, 66, 18, 30, 40, 20); c.closePath(); };
  v(); c.fillStyle = lin(c, 20, 0, 80, 0, [[0, '#0a5a6a'], [.45, '#3ad8c8'], [1, '#0a3a4a']]); c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#06262e'; c.stroke();
  c.save(); v(); c.clip();
  c.fillStyle = gold(c, 28, 36); c.fillRect(0, 28, 100, 6); c.fillStyle = gold(c, 70, 76); c.fillRect(0, 70, 100, 6);
  c.strokeStyle = '#f7c948'; c.lineWidth = 2; c.beginPath(); for (let x = 16; x < 90; x += 8) { c.moveTo(x, 54); c.lineTo(x + 4, 46); c.lineTo(x + 8, 54); } c.stroke();
  c.fillStyle = '#ff6a3a'; for (let x = 26; x < 80; x += 12) { c.beginPath(); c.arc(x, 62, 2.5, 0, TAU); c.fill(); }
  c.restore(); gloss(c, 36, 40, 5, 12, .4, .1);
}
function pRoyal(c, ch, a, b, edge) {
  const size = ch.length > 1 ? 52 : 68, y = 54;
  c.font = `bold ${size}px ${FS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 10; c.strokeStyle = '#1a0620'; c.strokeText(ch, 50, y);
  c.lineWidth = 4.5; c.strokeStyle = edge; c.strokeText(ch, 50, y);
  c.fillStyle = lin(c, 0, y - size * .45, 0, y + size * .45, [[0, a], [1, b]]); c.fillText(ch, 50, y);
  c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .4; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(46, y - size * .22, size * .4, size * .12, -.15, 0, TAU); c.fill(); c.restore();
}

// =====================================================================================================
// Styles (same family as slots.js, own prefix so the two files never fight over a stylesheet)
// =====================================================================================================
function injectSm() {
  K.injectStyles();
  if (document.getElementById('sm-style')) return;
  const s = document.createElement('style'); s.id = 'sm-style';
  s.textContent = `
.sm-screen{--cab:#333;--acc:#ffd000;--glass:#100;position:absolute;inset:0;display:flex;flex-direction:column;color:#f6efe0;font-family:"Chakra Petch",system-ui,sans-serif;font-size:14px;
  background:radial-gradient(ellipse 120% 70% at 50% 0%,color-mix(in srgb,var(--cab) 40%,#000) 0%,#07050a 70%);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.sm-screen *{box-sizing:border-box}
.sm-top{position:relative;z-index:3;display:flex;align-items:center;gap:8px;padding:8px max(12px,env(safe-area-inset-left,0px));padding-top:max(8px,env(safe-area-inset-top,0px));background:linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.35));border-bottom:1px solid rgba(255,255,255,.1)}
.sm-ttl{flex:1;min-width:0;display:grid}.sm-ttl b{font:400 clamp(15px,2.2vw,20px) "Bungee",Impact,sans-serif;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sm-ttl small{font-size:11px;color:#bfb6a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sm-ib{font:600 13px "Chakra Petch",system-ui,sans-serif;color:#f6efe0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;min-height:36px;cursor:pointer}
.sm-ib:hover{border-color:var(--acc)}.sm-ib:focus-visible,.sm-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.sm-stage{position:relative;z-index:1;flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch;padding:10px 12px 12px}
.sm-cab{position:relative;flex:0 1 900px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;border-radius:26px 26px 16px 16px;
  background:linear-gradient(90deg,color-mix(in srgb,var(--cab) 45%,#000),var(--cab) 10%,color-mix(in srgb,var(--cab) 72%,#fff) 50%,var(--cab) 90%,color-mix(in srgb,var(--cab) 45%,#000));
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),inset 0 0 0 6px rgba(0,0,0,.35),inset 0 2px 30px rgba(255,255,255,.15),0 24px 60px rgba(0,0,0,.75)}
.sm-basalt .sm-cab{background:radial-gradient(ellipse 80% 40% at 50% 104%,rgba(255,90,0,.55),transparent 70%),repeating-linear-gradient(115deg,rgba(255,255,255,.03) 0 3px,transparent 3px 11px),linear-gradient(90deg,#120a08,#3a2a26 18%,#4a3a34 50%,#3a2a26 82%,#120a08);
  box-shadow:inset 0 0 0 2px #ff7a1a,inset 0 0 0 6px #1a0c08,inset 0 0 40px rgba(255,80,0,.25),0 0 30px rgba(255,90,0,.25),0 24px 60px rgba(0,0,0,.8)}
.sm-candy .sm-cab{background:repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 12px,transparent 12px 24px),linear-gradient(90deg,#8a1a5a,#e0559b 18%,#ff9ad0 50%,#e0559b 82%,#8a1a5a);
  box-shadow:inset 0 0 0 3px #fff0f8,inset 0 0 0 7px #a02a6a,inset 0 0 0 9px #7ef0ff,0 24px 60px rgba(0,0,0,.75)}
.sm-chrome .sm-cab{background:linear-gradient(90deg,#3a3f4a,#9aa3b5 8%,#f4f6fa 30%,#b8c0ce 46%,#ffffff 54%,#9aa3b5 76%,#e8ecf2 90%,#3a3f4a);
  box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 5px #1d3a8a,inset 0 0 0 7px #e3102c,0 24px 60px rgba(0,0,0,.8)}
.sm-sunset .sm-cab{background:radial-gradient(ellipse 70% 50% at 50% 100%,rgba(255,190,90,.45),transparent 70%),linear-gradient(180deg,#3a0f4a,#a8285a 45%,#e8642a 80%,#f2a03a);
  box-shadow:inset 0 0 0 2px #ffcf5a,inset 0 0 0 6px rgba(42,10,58,.8),inset 0 0 0 8px #2ab8a8,0 24px 60px rgba(0,0,0,.8)}
.sm-marq{position:relative;flex:none;display:grid;place-items:center;text-align:center;padding:10px 14px;border-radius:16px 16px 10px 10px;min-height:56px;overflow:hidden;
  background:radial-gradient(ellipse at 50% 120%,color-mix(in srgb,var(--acc) 35%,transparent),transparent 70%),linear-gradient(var(--glass),#000);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),inset 0 0 20px #000}
.sm-logo{font:400 clamp(22px,4.4vw,42px)/1 "Bungee",Impact,sans-serif;letter-spacing:.02em;background:linear-gradient(#fff 0%,var(--acc) 45%,color-mix(in srgb,var(--acc) 55%,#000) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 10px color-mix(in srgb,var(--acc) 60%,transparent))}
.sm-chrome .sm-logo{background-image:linear-gradient(#ff5a5a 0 34%,#ffffff 34% 66%,#5a8aff 66%);filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 6px rgba(255,255,255,.5))}
.sm-sunset .sm-logo{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-style:italic;background-image:linear-gradient(#fff6d8,#ffcf5a 45%,#ff6a3a 75%,#d8306a)}
.sm-candy .sm-logo{background-image:linear-gradient(#fff,#ffd6ea 40%,#ff4fa8 70%,#9a1a6a)}
.sm-sub{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:5px;font-size:12px;color:#e9dfc8;min-height:0}
.sm-sub:empty{display:none}
.sm-chip{display:inline-flex;align-items:baseline;gap:6px;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#c9bfa6;padding:3px 9px;border-radius:7px;background:rgba(0,0,0,.6);border:1px solid color-mix(in srgb,var(--acc) 55%,transparent)}
.sm-chip b{font:400 clamp(11px,1.8vw,15px) "Press Start 2P",monospace;color:var(--acc);text-shadow:0 0 8px color-mix(in srgb,var(--acc) 70%,transparent);font-variant-numeric:tabular-nums}
.sm-chip.hot b{color:#fff;text-shadow:0 0 10px #ff5a00,0 0 18px #ff2a00}
.sm-bulbs{position:absolute;left:8px;right:8px;height:8px;display:flex;justify-content:space-between;pointer-events:none}.sm-bulbs.t{top:4px}.sm-bulbs.b{bottom:4px}
.sm-bulbs i{width:6px;height:6px;border-radius:50%;background:#fff6c8;box-shadow:0 0 6px var(--acc);animation:sm-chase 1.2s steps(1) infinite;opacity:.25}
.sm-bulbs i:nth-child(3n+1){animation-delay:-.4s}.sm-bulbs i:nth-child(3n+2){animation-delay:-.8s}
.sm-screen.winning .sm-bulbs i{animation-duration:.36s}
@keyframes sm-chase{0%{opacity:1}33%{opacity:.25}}
.sm-glass{flex:none;display:none;padding:6px 10px;border-radius:10px;background:linear-gradient(color-mix(in srgb,var(--glass) 80%,#000),#000);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
.sm-glass table{width:100%;border-collapse:collapse;font-size:12px}.sm-glass td{padding:1px 6px;text-align:right;color:#e9dfc8;font-variant-numeric:tabular-nums}
.sm-glass td:first-child{text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0;width:55%}.sm-glass td img{width:20px;height:20px;vertical-align:middle;margin-right:1px}
.sm-glass td.on{color:var(--acc);font-weight:700;background:rgba(255,255,255,.07)}.sm-glass th{font-size:10px;color:#9c927d;text-align:right;padding:0 6px;font-weight:600}.sm-glass th.on{color:var(--acc)}
.sm-glass .sm-two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
@media (min-height:860px) and (min-width:640px){.sm-has-glass .sm-glass{display:block}}
.sm-reelwrap{position:relative;flex:1 1 0;min-height:0}
.sm-frame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px;border-radius:14px;background:linear-gradient(#fff2b0,#b07a12 40%,#f3d36b 60%,#8a5a00);
  box-shadow:0 0 0 2px #111,0 0 0 4px var(--acc),0 0 26px color-mix(in srgb,var(--acc) 45%,transparent),0 10px 20px rgba(0,0,0,.6)}
.sm-basalt .sm-frame{background:linear-gradient(#5a4a44,#1a100c 40%,#3a2a26 60%,#0e0806)}
.sm-candy .sm-frame{background:repeating-linear-gradient(45deg,#fff 0 8px,#ff4fa8 8px 16px)}
.sm-chrome .sm-frame{background:linear-gradient(#ffffff,#8a93a5 45%,#e6eaf0 55%,#5a6070)}
.sm-sunset .sm-frame{background:linear-gradient(#ffe6a0,#c8862a 40%,#ffd27a 60%,#8a4a10)}
.sm-cv{display:block;border-radius:6px;background:#0a0a0a;touch-action:manipulation;cursor:pointer}
.sm-one .sm-frame::before,.sm-one .sm-frame::after{content:"";position:absolute;top:50%;width:0;height:0;border:9px solid transparent;transform:translateY(-50%)}
.sm-one .sm-frame::before{left:-6px;border-left-color:#e3102c;filter:drop-shadow(0 0 3px #f00)}.sm-one .sm-frame::after{right:-6px;border-right-color:#e3102c;filter:drop-shadow(0 0 3px #f00)}
.sm-ovl{position:absolute;inset:8px;display:grid;place-items:center;pointer-events:none;border-radius:6px;overflow:hidden}
.sm-ovl .sm-card{padding:14px 22px;border-radius:14px;background:rgba(0,0,0,.8);border:2px solid var(--acc);text-align:center;box-shadow:0 0 30px color-mix(in srgb,var(--acc) 60%,transparent);animation:sm-pop .35s cubic-bezier(.3,1.6,.5,1);max-width:92%}
.sm-ovl .sm-card b{display:block;font:400 clamp(20px,4vw,38px)/1.1 "Bungee",Impact,sans-serif;color:var(--acc);text-shadow:0 0 14px color-mix(in srgb,var(--acc) 70%,transparent)}
.sm-ovl .sm-card span{font-size:clamp(12px,1.8vw,16px);color:#fff}
@keyframes sm-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.sm-meters{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sm-led{background:linear-gradient(#000,#120a0a);border:2px solid #2a2a2a;border-radius:8px;padding:4px 6px 5px;text-align:center;box-shadow:inset 0 0 10px #000;min-width:0}
.sm-led span{display:block;font:600 10px "Chakra Petch",sans-serif;letter-spacing:.14em;color:#9c927d}
.sm-led b{display:block;font:400 clamp(11px,2vw,17px)/1.3 "Press Start 2P",monospace;color:#ff4130;text-shadow:0 0 8px rgba(255,40,20,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.sm-led.win b{color:#4dff6a;text-shadow:0 0 8px rgba(40,255,80,.8)}
.sm-msg{flex:none;min-height:1.5em;text-align:center;font-weight:600;font-size:clamp(13px,1.8vw,16px);color:#fff;text-shadow:0 1px 2px #000,0 0 6px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sm-msg.win{color:#9dffb0}.sm-msg.lose{color:#ffb0a8}.sm-msg.gold{color:var(--acc)}
.sm-deck{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;padding:8px;border-radius:12px;background:linear-gradient(#1a1a1a,#050505);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 3px 0 rgba(0,0,0,.6)}
.sm-grp{display:flex;align-items:center;gap:6px}.sm-grp>span{font-size:10px;letter-spacing:.12em;color:#9c927d;font-weight:700}
.sm-btn{font:700 14px "Chakra Petch",system-ui,sans-serif;color:#fff;background:linear-gradient(#444,#161616);border:1px solid rgba(255,255,255,.25);border-radius:10px;min-height:44px;min-width:44px;padding:0 12px;cursor:pointer;box-shadow:0 3px 0 #000;letter-spacing:.03em}
.sm-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #000}.sm-btn:disabled{opacity:.4;cursor:not-allowed}
.sm-seg{display:flex;border-radius:10px;overflow:hidden;box-shadow:0 3px 0 #000}.sm-seg .sm-btn{border-radius:0;box-shadow:none;min-width:46px;padding:0 8px}
.sm-seg .sm-btn.on{background:linear-gradient(color-mix(in srgb,var(--acc) 85%,#fff),color-mix(in srgb,var(--acc) 70%,#000));color:#160c00;border-color:var(--acc)}
.sm-units{min-width:34px;text-align:center;font:400 14px "Press Start 2P",monospace;color:var(--acc)}
.sm-btn.sm-auto.on{background:linear-gradient(#2a8a3a,#0a3a14);border-color:#7dff9a}
.sm-spin{min-width:128px;min-height:56px;border-radius:30px;font:400 20px "Bungee",Impact,sans-serif;color:#1a0c00;border:2px solid color-mix(in srgb,var(--acc) 60%,#fff);
  background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.75),transparent 45%),linear-gradient(color-mix(in srgb,var(--acc) 90%,#fff),color-mix(in srgb,var(--acc) 60%,#000));
  box-shadow:0 4px 0 #000,0 0 18px color-mix(in srgb,var(--acc) 55%,transparent)}
.sm-spin.stop{background:radial-gradient(ellipse at 50% 18%,rgba(255,255,255,.6),transparent 45%),linear-gradient(#ff6a5a,#8a0a10);color:#fff;border-color:#ffb0a8}
.sm-spin kbd{display:block;font:7px "Press Start 2P",monospace;opacity:.6;margin-top:-2px}
.sm-pt{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:12px}
.sm-pt[hidden],.sm-big[hidden]{display:none}
.sm-pt-in{position:relative;width:min(760px,100%);max-height:100%;overflow:auto;background:linear-gradient(#1b1610,#0e0b07);border:1px solid var(--acc);border-radius:14px;padding:16px 18px;line-height:1.45}
.sm-pt-x{position:sticky;top:0;float:right;z-index:2;background:#000}
.sm-pt h3{font:400 22px "Bungee",Impact,sans-serif;color:var(--acc);margin:.1em 0 .4em}.sm-pt h4{color:var(--acc);margin:1em 0 .3em;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.sm-pt table{border-collapse:collapse;width:100%;font-size:14px}.sm-pt td,.sm-pt th{border-bottom:1px solid rgba(255,255,255,.1);padding:4px 6px;text-align:right;font-variant-numeric:tabular-nums}
.sm-pt td:first-child,.sm-pt th:first-child{text-align:left}.sm-pt th{color:var(--acc);font-size:12px}
.sm-pt img{width:40px;height:40px;vertical-align:middle;margin-right:2px;background:rgba(255,255,255,.06);border-radius:6px}
.sm-pt .sm-paygrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.sm-pt .sm-pg{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border-radius:8px;padding:6px}.sm-pt .sm-pg img{width:52px;height:52px;flex:none}
.sm-pt .sm-pg div{font-size:12px;line-height:1.35}.sm-pt .sm-pg b{color:var(--acc)}
.sm-pt .sm-linegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px}.sm-pt .sm-linegrid figure{margin:0;text-align:center;font-size:11px;color:#bfb6a6}.sm-pt .sm-linegrid canvas{width:66px;height:40px;display:block;margin:0 auto 2px}
.sm-pt .sm-ladder{display:flex;flex-wrap:wrap;gap:6px}.sm-pt .sm-ladder span{padding:3px 8px;border-radius:6px;background:rgba(255,79,168,.18);border:1px solid rgba(255,79,168,.6);font-weight:700}
.sm-fx{position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden}
.sm-coin{position:absolute;top:-40px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7c0,#f7c948 40%,#a0680a 100%);box-shadow:inset 0 0 0 3px #c98a12,0 2px 4px rgba(0,0,0,.5);animation:sm-fall linear forwards}
@keyframes sm-fall{0%{transform:translateY(0) rotateY(0)}100%{transform:translateY(110vh) rotateY(1080deg)}}
.sm-big{position:absolute;inset:0;z-index:27;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,color-mix(in srgb,var(--acc) 30%,rgba(0,0,0,.55)),rgba(0,0,0,.78) 70%);cursor:pointer;animation:sm-fade .3s ease-out}
.sm-big-in{display:grid;justify-items:center;gap:8px;text-align:center;padding:16px}
.sm-big-t{font:400 clamp(34px,9vw,92px)/1 "Bungee",Impact,sans-serif;background:linear-gradient(#fff,var(--acc) 50%,color-mix(in srgb,var(--acc) 50%,#000));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #000) drop-shadow(0 0 22px color-mix(in srgb,var(--acc) 80%,transparent));animation:sm-throb .6s ease-in-out infinite alternate}
.sm-big-n{font:400 clamp(24px,6.4vw,60px)/1.1 "Press Start 2P",monospace;color:#fff;text-shadow:0 0 14px var(--acc),0 4px 0 #000;font-variant-numeric:tabular-nums}
.sm-big-s{font-size:13px;color:#e9dfc8;opacity:.8}
@keyframes sm-throb{from{transform:scale(1)}to{transform:scale(1.06)}}@keyframes sm-fade{from{opacity:0}to{opacity:1}}
@media (max-width:560px){.sm-ttl small{display:none}.sm-stage{padding:6px 6px 8px}.sm-cab{padding:8px;gap:6px;border-radius:18px 18px 12px 12px}.sm-marq{min-height:46px;padding:8px}
  .sm-spin{min-width:104px;font-size:18px;min-height:52px}.sm-deck{gap:6px;padding:6px}.sm-btn{padding:0 9px;font-size:13px}.sm-seg .sm-btn{min-width:42px}.sm-spin kbd{display:none}.sm-chip{padding:2px 6px;letter-spacing:.08em}}
@media (max-width:560px) and (min-height:700px){.sm-marq{min-height:84px;padding:14px 10px}.sm-logo{font-size:30px}.sm-meters{gap:6px}.sm-led b{font-size:13px}.sm-deck{padding:10px 6px}.sm-btn{min-height:48px}.sm-spin{min-height:58px;min-width:120px}}
@media (prefers-reduced-motion:reduce){.sm-bulbs i{animation:none;opacity:.8}.sm-coin{display:none}.sm-big-t{animation:none}}
`;
  document.head.appendChild(s);
}

// =====================================================================================================
// Sprites
// =====================================================================================================
function renderSymbol(def, sym, px) {
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.max(8, Math.round(px));
  const p = def.paint[sym]; if (!p) return cv;
  const c = cv.getContext('2d'); c.scale(cv.width / 100, cv.height / 100);
  c.save(); try { p(c); } catch (e) { /* a paint error must never break the reels */ } c.restore();
  return cv;
}
function blurSprite(src) {
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const c = cv.getContext('2d');
  const n = 7, spread = src.height * .24;
  for (let i = 0; i < n; i++) { c.globalAlpha = i === (n >> 1) ? .5 : .28; c.drawImage(src, 0, (i / (n - 1) - .5) * spread); }
  return cv;
}
const thumbCache = new Map();
function thumb(def, sym, px = 64) { const k = def.id + sym + px; if (!thumbCache.has(k)) thumbCache.set(k, renderSymbol(def, sym, px).toDataURL()); return thumbCache.get(k); }
const LINE_COLORS = ['#ff3b3b', '#ffd23b', '#3bff6a', '#3bc8ff', '#ff3bd8', '#ff8a3b', '#a03bff', '#3bffd8', '#d8ff3b', '#ff3b8a', '#3b6aff', '#ffb03b', '#6aff3b', '#ff6a6a', '#3bffb0', '#b03bff', '#fff23b', '#3b9cff', '#ff3bb0', '#9cff3b'];
const fmtShort = d => d >= 100000 ? '$' + Math.round(d / 1000) + 'K' : d >= 10000 ? '$' + (d / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : K.fmt(d);
const easeOutBack = t => { const c1 = 1.1, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const cosmetic = arr => arr[Math.floor(Math.random() * arr.length)]; // blur strips and idle art only, never outcomes

// =====================================================================================================
// The machine screen
// =====================================================================================================
function mountMachine(def, root, api) {
  injectSm();
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const sleep = ms => new Promise(r => later(r, ms));
  const R = K.rand;
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = `sm-screen sm-${def.style}${def.oneLine ? ' sm-one' : ''}${def.glass ? ' sm-has-glass' : ''}`;
  el.style.setProperty('--cab', def.theme.cabinet); el.style.setProperty('--acc', def.theme.accent); el.style.setProperty('--glass', def.theme.glass);
  const bulbs = n => `<i></i>`.repeat(n);
  el.innerHTML = `
  <header class="sm-top">
    <button type="button" class="sm-ib sm-leave">&#8249; Floor</button>
    <div class="sm-ttl"><b></b><small></small></div>
    <button type="button" class="sm-ib sm-pt-b">Paytable</button>
  </header>
  <main class="sm-stage">
    <div class="sm-cab">
      <div class="sm-marq"><div class="sm-bulbs t">${bulbs(22)}</div><div class="sm-logo"></div><div class="sm-sub"></div><div class="sm-bulbs b">${bulbs(22)}</div></div>
      <div class="sm-glass"></div>
      <div class="sm-reelwrap"><div class="sm-frame"><canvas class="sm-cv" aria-label="Reels" role="img"></canvas><div class="sm-ovl"></div></div></div>
      <div class="sm-meters"><div class="sm-led"><span>CREDITS</span><b class="m-cred"></b></div><div class="sm-led"><span>BET</span><b class="m-bet"></b></div><div class="sm-led win"><span>WIN</span><b class="m-win">$0</b></div></div>
      <div class="sm-msg" aria-live="polite"></div>
      <div class="sm-deck">
        <div class="sm-grp"><span>COIN</span><div class="sm-seg">${[1, 5, 25].map(v => `<button type="button" class="sm-btn" data-coin="${v}">$${v}</button>`).join('')}</div></div>
        <div class="sm-grp"><span>${def.bet.unitName}</span><button type="button" class="sm-btn sm-dn" aria-label="Lower">&minus;</button><b class="sm-units"></b><button type="button" class="sm-btn sm-up" aria-label="Raise">+</button></div>
        <button type="button" class="sm-btn sm-max">MAX BET</button>
        <button type="button" class="sm-btn sm-auto">AUTO</button>
        <button type="button" class="sm-btn sm-spin">SPIN<kbd>SPACE</kbd></button>
      </div>
    </div>
  </main>
  <div class="sm-pt" hidden><div class="sm-pt-in"><button type="button" class="sm-ib sm-pt-x">Close</button><div class="sm-pt-body"></div></div></div>
  <div class="sm-big" hidden><div class="sm-big-in"><div class="sm-big-t"></div><div class="sm-big-n"></div><div class="sm-big-s">tap or press Space</div></div></div>
  <div class="sm-fx"></div>`;
  root.appendChild(el);
  const $ = s => el.querySelector(s);
  $('.sm-ttl b').textContent = def.title; $('.sm-ttl small').textContent = def.blurb; $('.sm-logo').textContent = def.logo || def.title;
  const cv = $('.sm-cv'), ctx = cv.getContext('2d'), wrap = $('.sm-reelwrap'), ovl = $('.sm-ovl'), sub = $('.sm-sub');
  const mCred = $('.m-cred'), mBet = $('.m-bet'), mWin = $('.m-win'), msgEl = $('.sm-msg');
  const spinBtn = $('.sm-spin'), autoBtn = $('.sm-auto'), maxBtn = $('.sm-max'), upBtn = $('.sm-up'), dnBtn = $('.sm-dn');
  const coinBtns = [...el.querySelectorAll('[data-coin]')];
  const bigEl = $('.sm-big');

  // ------------------------------------------------------------------ state
  let coin = 1, units = def.bet.def, busy = false, auto = 0, mode = 'base';
  let owed = 0;        // dollars already decided by the RNG but not yet paid (paid on unmount if we are torn down mid-animation)
  let fsRun = null;    // { left, total, won, state, units, coin, uv, bet }
  let hl = null, cHL = null, marks = null, markPop = new Map(), particles = [], shake = null, big = null, dropDone = null;
  const steps = def.bet.steps;
  const totalBet = (c = coin, u = units) => def.bet.cost(c, u);
  const uvOf = (c = coin, u = units) => def.bet.uv(c, u);
  function msg(t, kind = '') { msgEl.textContent = t; msgEl.className = 'sm-msg ' + kind; }
  function syncControls() {
    const lock = busy || mode !== 'base';
    coinBtns.forEach(b => { const on = +b.dataset.coin === coin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.disabled = lock; });
    $('.sm-units').textContent = units;
    upBtn.disabled = dnBtn.disabled = maxBtn.disabled = lock;
    const spinning = board.some(C => C.state !== 'idle');
    spinBtn.disabled = mode !== 'base' || (busy && !spinning);
    spinBtn.classList.toggle('stop', spinning && mode === 'base');
    spinBtn.firstChild.textContent = spinning && mode === 'base' ? 'STOP' : 'SPIN';
    autoBtn.classList.toggle('on', auto > 0); autoBtn.textContent = auto > 0 ? `STOP ${auto}` : 'AUTO';
    autoBtn.disabled = mode !== 'base';
    mBet.textContent = K.fmt(mode === 'free' ? 0 : totalBet());
    updateGlass(); updSub();
  }
  const setCred = b => { mCred.textContent = K.fmt(b); };
  setCred(api.balance);
  const unsubBal = api.onBalance ? api.onBalance(setCred) : null;

  // ------------------------------------------------------------------ marquee sub line (ways counter, multipliers, free-spin status)
  let subState = { ways: def.kind === 'ways' ? 0 : null, mult: 1, hot: false };
  function updSub() {
    let h = '';
    if (def.kind === 'ways') h += `<span class="sm-chip"><span>WAYS</span><b>${subState.ways ? subState.ways.toLocaleString('en-US') : '—'}</b></span>`;
    if (fsRun) {
      h += `<span class="sm-chip"><span>FREE SPINS</span><b>${fsRun.total - fsRun.left}/${fsRun.total}</b></span>`;
      if (def.kind === 'ways') h += `<span class="sm-chip${subState.hot ? ' hot' : ''}"><span>MULTIPLIER</span><b>×${subState.mult}</b></span>`;
      else if (def.fsMultLabel) h += `<span class="sm-chip"><span>ALL WINS</span><b>${def.fsMultLabel}</b></span>`;
      h += `<span class="sm-chip"><span>WON</span><b>${fmtShort(fsRun.won)}</b></span>`;
    } else if (def.kind !== 'ways' && def.tagline) h += `<span style="opacity:.85">${def.tagline}</span>`;
    if (sub.innerHTML !== h) sub.innerHTML = h;
  }

  // ------------------------------------------------------------------ board model
  // Each column: { n rows, cells:[{s, y, vy, tgt, rest, boom, delay}], spin state }. Rows are numbered from the top.
  const NC = def.cols;
  const mkCell = (s, r) => ({ s, y: r, vy: 0, tgt: r, rest: true, boom: 0, delay: 0 });
  const board = Array.from({ length: NC }, (_, i) => { const col = def.idleCol(i); return { n: col.length, cells: col.map(mkCell), state: 'idle', fill: [], off: 0, v: 0, t0: 0, stopAt: 0, target: null, o: 0, antic: false, blur: false }; });

  // ------------------------------------------------------------------ geometry + sprites
  let G = { cw: 60, gap: 4, W: 300, H: 300, dpr: 1 };
  let sprites = {}, blurs = {}, bgGrad = null, shadeGrad = null;
  const syms = Object.keys(def.paint);
  function layout() {
    const r = wrap.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    const FR = 16, gap = def.gap, n = NC, rows = def.rowsMax;
    const aw = r.width - FR, ah = r.height - FR;
    const cw = Math.max(24, Math.min((aw - (n - 1) * gap) / n, ah / rows * def.cellAspect));
    const ch = Math.max(20, Math.min(ah / rows, cw / def.aspectMin));
    const W = Math.round(n * cw + (n - 1) * gap), H = Math.round(rows * ch), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W === G.W && H === G.H && dpr === G.dpr && sprites[syms[0]]) return;
    G = { cw: (W - (n - 1) * gap) / n, gap, W, H, dpr };
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    buildSprites();
  }
  function buildSprites() {
    const box = Math.min(G.cw, G.H / def.rowsMin) * G.dpr;
    sprites = {}; blurs = {};
    for (const s of syms) { sprites[s] = renderSymbol(def, s, box); blurs[s] = blurSprite(sprites[s]); }
    bgGrad = lin(ctx, 0, 0, 0, G.H, def.reelBg);
    shadeGrad = lin(ctx, 0, 0, 0, G.H, def.cylinder ? [[0, 'rgba(0,0,0,.72)'], [.22, 'rgba(0,0,0,.1)'], [.42, 'rgba(255,255,255,.1)'], [.6, 'rgba(0,0,0,0)'], [.8, 'rgba(0,0,0,.12)'], [1, 'rgba(0,0,0,.75)']]
      : [[0, 'rgba(0,0,0,.45)'], [.14, 'rgba(0,0,0,0)'], [.86, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.45)']]);
    buildGlass();
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) buildSprites(); });
  const colX = i => i * (G.cw + G.gap);
  const rowH = C => G.H / C.n;
  const CYL = .5;
  function mapY(C, u) {
    if (!def.cylinder) return u * rowH(C);
    const half = C.n / 2, Rc = (G.H / 2) / Math.sin(half * CYL);
    const a = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (u - half) * CYL));
    return G.H / 2 + Rc * Math.sin(a);
  }
  function drawSym(s, x, y0, y1, { blur = false, scale = 1, alpha = 1, C } = {}) {
    const img = blur ? blurs[s] : sprites[s]; if (!img) return;
    const ch = rowH(C), box = Math.min(G.cw, ch) * def.symScale * scale, sy = (y1 - y0) / ch;
    const w = box, h = box * sy, cx = x + G.cw / 2, cy = (y0 + y1) / 2;
    if (alpha < 1) { ctx.globalAlpha = alpha; ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h); ctx.globalAlpha = 1; }
    else ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  // ------------------------------------------------------------------ glass paytable (Liberty Sevens)
  function buildGlass() { if (def.glass) { $('.sm-glass').innerHTML = def.glass(s => thumb(def, s, 40)); updateGlass(); } }
  function updateGlass() { if (def.glass) el.querySelectorAll('.sm-glass [data-u]').forEach(td => td.classList.toggle('on', +td.dataset.u === units)); }

  // ------------------------------------------------------------------ paytable overlay
  const pt = $('.sm-pt');
  function openPaytable() {
    const b = mode === 'free' && fsRun ? fsRun : { coin, units, uv: uvOf(), bet: totalBet() };
    $('.sm-pt-body').innerHTML = `<h3>${def.title}</h3>` + def.paytable(s => thumb(def, s, 80), b) +
      `<h4>Theoretical return</h4><p>${def.rtpText}. Every outcome, including every cascade and refill, is decided by a cryptographic RNG the moment you spin; the animation only reveals it.</p>
      <h4>Controls</h4><p>Space or SPIN to play (press again to slam the reels). Pick the coin and ${def.bet.unitName.toLowerCase()}, or MAX BET to bet the most and spin. AUTO plays 25 games and stops on a feature or a big win.</p>`;
    el.querySelectorAll('.sm-pt canvas[data-line]').forEach(c => {
      const g = c.getContext('2d'), L = def.lines[+c.dataset.line], cw = 132 / 5, chh = 80 / 3;
      g.fillStyle = '#000'; g.fillRect(0, 0, 132, 80);
      for (let i = 0; i < 5; i++) for (let r = 0; r < 3; r++) { g.fillStyle = L[i] === r ? LINE_COLORS[+c.dataset.line] : '#2a2a2a'; g.fillRect(i * cw + 2, r * chh + 2, cw - 4, chh - 4); }
    });
    pt.hidden = false; $('.sm-pt-x').focus();
  }
  $('.sm-pt-b').addEventListener('click', () => { K.sfx.button(); pt.hidden ? openPaytable() : (pt.hidden = true); });
  $('.sm-pt-x').addEventListener('click', () => { pt.hidden = true; });
  pt.addEventListener('click', e => { if (e.target === pt) pt.hidden = true; });
  $('.sm-leave').addEventListener('click', () => { K.sfx.button(); api.exit(); });

  // ------------------------------------------------------------------ bet controls
  coinBtns.forEach(b => b.addEventListener('click', () => { if (busy || mode !== 'base') return; coin = +b.dataset.coin; K.sfx.chip(); syncControls(); }));
  const stepUnits = d => { const i = steps.indexOf(units); units = steps[Math.max(0, Math.min(steps.length - 1, i + d))]; K.sfx.chip(); syncControls(); if (def.lines && def.lines.length > 1) showLinesPreview(); };
  upBtn.addEventListener('click', () => !busy && stepUnits(1));
  dnBtn.addEventListener('click', () => !busy && stepUnits(-1));
  maxBtn.addEventListener('click', () => { if (busy || mode !== 'base') return; units = steps[steps.length - 1]; K.sfx.chip(); syncControls(); spin(); });
  spinBtn.addEventListener('click', () => { K.sfx.button(); spin(); });
  autoBtn.addEventListener('click', () => { K.sfx.button(); if (auto > 0) { auto = 0; syncControls(); return; } auto = 25; syncControls(); if (!busy) spin(); });
  cv.addEventListener('click', () => { if (busy) quickStop(); });
  bigEl.addEventListener('click', () => skipBig());
  function showLinesPreview() { hl = { wins: def.lines.slice(0, units).map((L, i) => ({ line: i, cells: [], credits: 0, preview: true })), t0: performance.now(), preview: true }; later(() => { if (hl && hl.preview) hl = null; }, 1400); }
  const onKey = e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape' && !pt.hidden) { pt.hidden = true; return; }
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault(); if (e.repeat || !pt.hidden) return;
      if (big) { skipBig(); return; }
      if (win.shown < win.to && !busy) { win.shown = win.to; win.dur = 0; return; }
      if (busy) { quickStop(); return; }
      spin();
    }
  };
  window.addEventListener('keydown', onKey);

  // ------------------------------------------------------------------ win meter roll-up
  let win = { from: 0, to: 0, t0: 0, dur: 0, shown: 0, lastTick: 0 };
  function rollWin(to, from = 0, bet = totalBet()) { win = { from, to, t0: performance.now(), dur: Math.min(3000, 300 + Math.sqrt(Math.max(0, to - from) / Math.max(1, bet)) * 380), shown: from, lastTick: 0 }; }
  function updWin(now) {
    if (win.shown >= win.to) return;
    const t = win.dur ? Math.min(1, (now - win.t0) / win.dur) : 1;
    win.shown = t >= 1 ? win.to : win.from + (win.to - win.from) * (1 - Math.pow(1 - t, 2));
    mWin.textContent = K.fmt(Math.floor(win.shown));
    if (now - win.lastTick > 75 && t < 1) { win.lastTick = now; K.tone(1400 + 600 * t, .03, { type: 'square', vol: .03 }); }
    if (t >= 1) mWin.textContent = K.fmt(win.to);
  }
  const setWinMeter = v => { win = { from: v, to: v, t0: 0, dur: 0, shown: v, lastTick: 0 }; mWin.textContent = K.fmt(v); };

  // ------------------------------------------------------------------ big-win count-up
  function bigWin(amount, bet) {
    const x = amount / Math.max(1, bet); if (x < 15 || !alive) return Promise.resolve(false);
    const title = x >= 100 ? 'EPIC WIN!' : x >= 40 ? 'MEGA WIN!' : 'BIG WIN!';
    $('.sm-big-t').textContent = title; $('.sm-big-n').textContent = '$0'; bigEl.hidden = false;
    el.classList.add('winning'); K.sfx.bigWin(); coinShower(x >= 40 ? 60 : 32);
    return new Promise(res => { big = { t0: performance.now(), dur: Math.min(7000, 1600 + Math.sqrt(x) * 420), amount, done: res, end: 0, tick: 0 }; });
  }
  function skipBig() { if (!big) return; const now = performance.now(); if (!big.end) { big.t0 = now - big.dur; } else big.end = now - 99999; }
  function updBig(now) {
    if (!big) return;
    const t = Math.min(1, (now - big.t0) / big.dur), v = big.amount * (1 - Math.pow(1 - t, 2.2));
    $('.sm-big-n').textContent = K.fmt(Math.floor(v));
    if (t < 1 && now - big.tick > 70) { big.tick = now; K.tone(900 + 900 * t, .035, { type: 'square', vol: .035 }); }
    if (t >= 1 && !big.end) { big.end = now + 1500; $('.sm-big-n').textContent = K.fmt(big.amount); K.sfx.win(); }
    if (big.end && now >= big.end) { const f = big.done; big = null; bigEl.hidden = true; el.classList.remove('winning'); f(true); }
  }

  // ------------------------------------------------------------------ reels
  const VMAX = def.vmax || 24;
  let reelsDone = null, anticTone = 0;
  function startReels(targets, anticFrom = 99) {
    const now = performance.now();
    board.forEach((C, i) => {
      C.state = 'windup'; C.t0 = now + i * 45; C.off = 0; C.v = 0; C.target = targets[i]; C.o = 0;
      C.fill = Array.from({ length: 24 }, () => def.filler(i));
      C.stopAt = now + def.spinMs + i * def.stagger + (i >= anticFrom ? (i - anticFrom + 1) * 950 : 0);
      C.antic = i >= anticFrom;
    });
    K.tone(160, .35, { type: 'sawtooth', vol: .03, slide: 260 });
    const p = new Promise(res => { reelsDone = res; }); syncControls(); return p;
  }
  function quickStop() {
    const now = performance.now(); let k = 0;
    board.forEach(C => { if (C.state === 'windup' || C.state === 'spin') { C.stopAt = Math.min(C.stopAt, now + k++ * 60); C.antic = false; } });
  }
  function beginStop(C, now) { C.state = 'stop'; C.t0 = now; C.dur = def.stopMs || 400; C.n = C.target.length; C.cells = C.target.map(mkCell); }
  function updReels(now, dt) {
    let any = false;
    board.forEach((C, i) => {
      if (C.state === 'idle') return; any = true;
      if (C.state === 'windup') { if (now < C.t0) return; const t = (now - C.t0) / 120; if (t >= 1) { C.state = 'spin'; C.v = 5; } else C.off = -.22 * Math.sin(t * Math.PI); C.blur = false; return; }
      if (C.state === 'spin') {
        C.v = Math.min(C.antic && now > C.stopAt - 1300 ? VMAX * 1.3 : VMAX, C.v + 70 * dt); C.off += C.v * dt; C.blur = C.v > 8;
        if (now >= C.stopAt) beginStop(C, now);
        return;
      }
      if (C.state === 'stop') {
        const t = Math.min(1, (now - C.t0) / C.dur); C.o = (1 - easeOutBack(t)) * 2.4; C.blur = t < .45;
        if (t >= 1) { C.o = 0; C.state = 'idle'; C.antic = false; C.blur = false; K.sfx.reelStop(); onReelStopped(i); if (board.every(q => q.state === 'idle')) syncControls(); }
      }
    });
    if (board.some(C => C.antic && C.state === 'spin') && now - anticTone > 140) { anticTone = now; K.tone(500 + (now / 3 % 400), .1, { type: 'triangle', vol: .05 }); }
    if (any && board.every(C => C.state === 'idle') && reelsDone) { const f = reelsDone; reelsDone = null; f(); }
  }
  function onReelStopped(i) {
    const col = board[i].cells.map(c => c.s);
    if (def.scatter && col.includes(def.scatter)) K.tone(1046, .18, { type: 'triangle', vol: .1 });
    if (def.wild && col.includes(def.wild)) K.tone(784, .12, { type: 'sine', vol: .07 });
    if (def.kind === 'ways') { subState.ways = board.slice(0, i + 1).reduce((a, C) => a * C.n, 1) * board.slice(i + 1).reduce((a, C) => a * (C.state === 'idle' ? C.n : 1), 1); if (i === NC - 1) subState.ways = board.reduce((a, C) => a * C.n, 1); updSub(); }
  }

  // ------------------------------------------------------------------ cascades: explode, then gravity
  function spawnBurst(x, y, size) {
    const cols = def.burst || ['#fff', '#ffd34a'];
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * TAU, sp = size * (2 + Math.random() * 5);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * 2, life: 0, max: .5 + Math.random() * .45, r: size * (.05 + Math.random() * .07), col: cosmetic(cols), rot: Math.random() * 6, sq: def.kind === 'cluster' });
    }
  }
  async function explode(list) {
    const now = performance.now();
    for (const [i, r] of list) {
      const C = board[i], cl = C.cells[r]; if (!cl) continue; cl.boom = now;
      const y0 = mapY(C, r), y1 = mapY(C, r + 1); spawnBurst(colX(i) + G.cw / 2, (y0 + y1) / 2, Math.min(G.cw, y1 - y0));
    }
    if (def.kind === 'ways') { shake = { t0: now, dur: 420, amp: Math.max(3, G.cw * .07) }; K.tone(70, .35, { type: 'sawtooth', vol: .09, slide: -30 }); }
    else K.tone(1400, .08, { type: 'sine', vol: .07, slide: 900 });
    K.sfx.chips(3);
    await sleep(def.boomMs || 380);
  }
  function dropTo(next) {
    const now = performance.now();
    board.forEach((C, i) => {
      const keep = C.cells.filter(c => !c.boom), m = next[i].length - keep.length;
      const fresh = Array.from({ length: m }, (_, j) => ({ ...mkCell(next[i][j], 0), y: j - m - .35, rest: false }));
      C.cells = fresh.concat(keep);
      C.cells.forEach((c, r) => { c.tgt = r; c.vy = 0; c.delay = now + i * 38; c.rest = Math.abs(c.y - r) < 1e-6; if (c.s !== next[i][r]) c.s = next[i][r]; });
    });
    return new Promise(res => { dropDone = res; });
  }
  function updDrops(now, dt) {
    if (!dropDone) return;
    let moving = false, landed = false;
    for (const C of board) for (const c of C.cells) {
      if (c.rest) continue; moving = true; if (now < c.delay) continue;
      c.vy += 70 * dt; c.y += c.vy * dt;
      if (c.y >= c.tgt) { if (c.vy > 5) { c.y = c.tgt; c.vy = -c.vy * .22; landed = true; } else { c.y = c.tgt; c.vy = 0; c.rest = true; } }
    }
    if (landed) K.tone(220 + Math.random() * 80, .05, { type: 'triangle', vol: .04 });
    if (!moving) { const f = dropDone; dropDone = null; f(); }
  }

  // ------------------------------------------------------------------ drawing
  function drawCol(i, now) {
    const C = board[i], x = colX(i), cw = G.cw, ch = rowH(C);
    ctx.save(); ctx.beginPath(); ctx.rect(x, 0, cw, G.H); ctx.clip();
    ctx.fillStyle = bgGrad; ctx.fillRect(x, 0, cw, G.H);
    if (def.rowLines && C.state === 'idle') { ctx.strokeStyle = def.rowLines; ctx.lineWidth = 1; ctx.beginPath(); for (let r = 1; r < C.n; r++) { const y = Math.round(mapY(C, r)) + .5; ctx.moveTo(x + 4, y); ctx.lineTo(x + cw - 4, y); } ctx.stroke(); }
    if (marks) drawMarks(i, now, false);
    if (C.state === 'windup' || C.state === 'spin') {
      const F = C.fill.length, a = Math.floor(-C.off) - 1, b = Math.ceil(C.n - C.off);
      for (let j = a; j <= b; j++) {
        const s = j < 0 ? C.fill[mod(j, F)] : j < C.n ? C.cells[j].s : null; if (!s) continue;
        drawSym(s, x, mapY(C, j + C.off), mapY(C, j + C.off + 1), { blur: C.blur, C });
      }
    } else if (C.state === 'stop') {
      const F = C.fill.length;
      for (let j = -3; j < C.n + 3; j++) {
        const s = j >= 0 && j < C.n ? C.cells[j].s : C.fill[mod(j + 7, F)];
        const u = j - C.o; if (u > C.n || u + 1 < 0) continue;
        drawSym(s, x, mapY(C, u), mapY(C, u + 1), { blur: C.blur, C });
      }
    } else {
      for (let r = 0; r < C.cells.length; r++) {
        const cl = C.cells[r]; if (cl.y + 1 < 0) continue;
        const y0 = mapY(C, cl.y), y1 = mapY(C, cl.y + 1);
        if (cl.boom) { const t = (now - cl.boom) / (def.boomMs || 380); if (t < 1) drawSym(cl.s, x, y0, y1, { scale: 1 + t * .5, alpha: 1 - t, C }); continue; }
        const on = cHL && cHL.cells.has(i + ',' + r);
        if (on) {
          const pulse = .5 + .5 * Math.sin((now - cHL.t0) / 90);
          ctx.fillStyle = rad(ctx, x + cw / 2, (y0 + y1) / 2, 2, x + cw / 2, (y0 + y1) / 2, Math.max(cw, y1 - y0) * .6, [[0, def.glow || 'rgba(255,230,120,.75)'], [1, 'rgba(255,200,80,0)']]);
          ctx.globalAlpha = .55 + .45 * pulse; ctx.fillRect(x, y0, cw, y1 - y0); ctx.globalAlpha = 1;
          drawSym(cl.s, x, y0, y1, { scale: 1.04 + .06 * pulse, C });
        } else drawSym(cl.s, x, y0, y1, { C, alpha: cHL ? .55 : 1 });
      }
    }
    if (marks) drawMarks(i, now, true);
    ctx.fillStyle = shadeGrad; ctx.fillRect(x, 0, cw, G.H);
    if (C.antic) { const a = .35 + .25 * Math.sin(now / 90); ctx.strokeStyle = `rgba(255,220,80,${a})`; ctx.lineWidth = 6; ctx.strokeRect(x + 3, 3, cw - 6, G.H - 6); }
    ctx.restore();
    void ch;
  }
  // Sugar Burst multiplier spots: frosting under the candy, the x-badge on top.
  function drawMarks(i, now, top) {
    const C = board[i], ch = rowH(C), cw = G.cw;
    for (let r = 0; r < C.n; r++) {
      const m = marks[i * def.rowsMax + r]; if (!m) continue;
      const x = colX(i), y = r * ch, pop = markPop.get(i * def.rowsMax + r), k = pop ? Math.max(0, 1 - (now - pop) / 450) : 0;
      if (!top) {
        ctx.fillStyle = m >= 2 ? `rgba(255,${Math.max(40, 210 - Math.log2(m) * 24)},${Math.max(90, 230 - Math.log2(m) * 18)},${.55 + k * .4})` : `rgba(255,255,255,${.28 + k * .4})`;
        rr(ctx, x + 2, y + 2, cw - 4, ch - 4, Math.min(cw, ch) * .22); ctx.fill();
        ctx.strokeStyle = m >= 2 ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash(m >= 2 ? [] : [4, 3]); ctx.stroke(); ctx.setLineDash([]);
      } else if (m >= 2) {
        const fs = Math.max(10, Math.min(cw, ch) * (.26 + k * .2)), t = '×' + m;
        ctx.save(); ctx.font = `400 ${fs}px ${FD}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
        ctx.lineWidth = fs * .3; ctx.strokeStyle = '#5a0030'; ctx.strokeText(t, x + cw - 3, y + ch - 4);
        ctx.fillStyle = m >= 32 ? '#fff36a' : '#fff'; ctx.fillText(t, x + cw - 3, y + ch - 4); ctx.restore();
      }
    }
  }
  function drawParticles(dt) {
    if (!particles.length) return;
    particles = particles.filter(p => (p.life += dt) < p.max);
    for (const p of particles) {
      p.vy += G.H * 1.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8;
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.col;
      if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r * 1.6, -p.r * .5, p.r * 3.2, p.r); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function label(textS, px, py, col = '#ffe24a', sizeK = .2) {
    const fs = Math.max(12, Math.round(Math.min(G.cw, G.H / def.rowsMax * 1.4) * sizeK * 1.6));
    ctx.save(); ctx.font = `400 ${fs}px ${FD}`; const tw = ctx.measureText(textS).width + fs;
    px = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, px)); py = Math.min(G.H - fs * .8, Math.max(fs * .8, py));
    ctx.fillStyle = 'rgba(0,0,0,.82)'; rr(ctx, px - tw / 2, py - fs * .75, tw, fs * 1.5, fs * .5); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(textS, px, py + 1); ctx.restore();
  }
  function drawLineHighlights(now) {
    if (!hl) return;
    const { wins } = hl, cyc = wins.length > 1 && !hl.preview, all = (now - hl.t0) < 1600 || !cyc;
    const showing = all ? wins : [wins[Math.floor((now - hl.t0 - 1600) / 1300) % wins.length]];
    const pulse = .6 + .4 * Math.sin(now / 130);
    const cellRect = (i, r) => { const C = board[i]; return [colX(i), mapY(C, r), G.cw, mapY(C, r + 1) - mapY(C, r)]; };
    if (!all) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; const on = new Set(); showing.forEach(w => w.cells.forEach(([i, r]) => on.add(i + ',' + r)));
      for (let i = 0; i < NC; i++) for (let r = 0; r < board[i].n; r++) if (!on.has(i + ',' + r)) { const [x, y, w, h] = cellRect(i, r); ctx.fillRect(x, y, w, h); }
      ctx.restore();
    }
    for (const w of showing) {
      const col = w.line >= 0 ? (def.lines.length === 1 ? '#ffe24a' : LINE_COLORS[w.line]) : '#ffe24a';
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (w.line >= 0) {
        const L = def.lines[w.line]; ctx.globalAlpha = .9; ctx.lineWidth = Math.max(3, G.H / 3 * .045);
        ctx.beginPath(); L.forEach((r, i) => { const [x, y, cw, ch] = cellRect(i, r), px = x + cw / 2, py = y + ch / 2; if (i === 0) ctx.moveTo(px - cw / 2, py); ctx.lineTo(px, py); if (i === L.length - 1) ctx.lineTo(px + cw / 2, py); }); ctx.stroke();
      }
      ctx.globalAlpha = pulse; ctx.lineWidth = Math.max(3, G.H / 3 * .05);
      for (const [i, r] of w.cells) { const [x, y, cw, ch] = cellRect(i, r); ctx.beginPath(); rr(ctx, x + 3, y + 3, cw - 6, ch - 6, 8); ctx.stroke(); }
      ctx.restore();
      if ((!all || wins.length === 1) && w.credits > 0) { const [i, r] = w.cells[w.cells.length - 1]; const [x, y, cw, ch] = cellRect(i, r); label(K.fmt(w.credits * hl.uv), x + cw / 2, y + ch - 14, col); }
    }
    if (!all) { const w = showing[0]; if (w && hl.lastShown !== w) { hl.lastShown = w; msg(def.winLabel(w, hl.uv), 'win'); } }
  }
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    updReels(now, dt); updDrops(now, dt); updWin(now); updBig(now);
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = def.gapFill ? lin(ctx, 0, 0, G.W, 0, def.gapFill) : '#0a0a0a'; ctx.fillRect(0, 0, G.W, G.H);
    if (shake) { const t = (now - shake.t0) / shake.dur; if (t >= 1) shake = null; else { const a = shake.amp * (1 - t); ctx.translate((Math.random() - .5) * 2 * a, (Math.random() - .5) * 2 * a); } }
    for (let i = 0; i < NC; i++) drawCol(i, now);
    if (def.oneLine && !hl) { ctx.save(); ctx.strokeStyle = 'rgba(227,16,44,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, G.H / 2); ctx.lineTo(G.W, G.H / 2); ctx.stroke(); ctx.restore(); }
    drawParticles(dt);
    if (cHL) for (const L of cHL.labels) label(L.text, L.x, L.y, L.col);
    drawLineHighlights(now);
    if (def.reflection) def.reflection(ctx, G);
  }

  // ------------------------------------------------------------------ effects
  function card(title, subT, ms = 1800) { ovl.innerHTML = `<div class="sm-card"><b>${title}</b>${subT ? `<span>${subT}</span>` : ''}</div>`; if (ms) later(() => { ovl.innerHTML = ''; }, ms); }
  function coinShower(n = 28) {
    const fx = $('.sm-fx');
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'sm-coin'; c.style.left = (Math.random() * 100) + '%'; c.style.animationDuration = (1.4 + Math.random() * 1.4) + 's'; c.style.animationDelay = (Math.random() * .8) + 's'; const s = 20 + Math.random() * 18; c.style.width = c.style.height = s + 'px'; fx.appendChild(c); later(() => c.remove(), 3400); }
  }
  function pay() { if (owed > 0) { const d = owed; owed = 0; api.win(d); } }

  // ------------------------------------------------------------------ presenting one round
  async function present(out, uv, bet) {
    hl = null; cHL = null;
    if (def.kind === 'cluster') { marks = out.steps[0].marks.slice(); markPop.clear(); }
    await startReels(out.first, def.antic ? def.antic(out.first) : 99);
    if (!alive) return;
    if (!out.steps) { if (out.wins.length) hl = { wins: out.wins, t0: performance.now(), uv }; return; }
    let acc = 0;
    for (const st of out.steps) {
      if (!st.wins.length || !alive) break;
      const prev = acc; acc += st.credits * uv;
      const cells = new Set(), labels = [];
      st.wins.forEach((w, k) => {
        const list = w.cells; list.forEach(([i, r]) => cells.add(i + ',' + r));
        let sx = 0, sy = 0; list.forEach(([i, r]) => { const C = board[i]; sx += colX(i) + G.cw / 2; sy += (mapY(C, r) + mapY(C, r + 1)) / 2; });
        const amt = (def.kind === 'ways' ? w.credits * st.mult : w.credits) * uv, mm = def.kind === 'ways' ? st.mult : w.mult;
        labels.push({ x: sx / list.length, y: sy / list.length + (k % 3 - 1) * 22, text: K.fmt(amt) + (mm > 1 ? ` ×${mm}` : ''), col: def.labelCol || '#ffe24a' });
      });
      cHL = { cells, labels, t0: performance.now() };
      msg(def.stepText(st, uv), 'win'); rollWin(acc, prev, bet); K.sfx.win();
      await sleep(acc - prev >= bet * 5 ? 1150 : 850); if (!alive) return;
      cHL = null;
      await explode([...st.dead].map(k => def.kind === 'ways' ? [Math.floor(k / 8), k % 8] : [Math.floor(k / def.rowsMax), k % def.rowsMax]));
      if (!alive) return;
      if (def.kind === 'cluster') { const now = performance.now(); st.marksAfter.forEach((m, k) => { if (m !== marks[k]) markPop.set(k, now); }); marks = st.marksAfter.slice(); }
      if (def.kind === 'ways' && fsRun) { subState.mult = st.mult + 1; subState.hot = true; updSub(); K.tone(660, .2, { type: 'square', vol: .05 }); later(() => { subState.hot = false; updSub(); }, 700); }
      await dropTo(st.next);
      if (!alive) return;
    }
  }

  // ------------------------------------------------------------------ play
  async function spin() {
    if (!alive || mode !== 'base') return;
    if (busy) { quickStop(); return; }
    if (!pt.hidden) pt.hidden = true;
    const bet = totalBet(), uv = uvOf();
    if (!api.bet(bet)) { msg(`Not enough chips for a ${K.fmt(bet)} bet. Lower the coin or ${def.bet.unitName.toLowerCase()}.`, 'lose'); K.sfx.lose(); auto = 0; syncControls(); return; }
    busy = true; ovl.innerHTML = ''; setWinMeter(0); msg('Good luck!', '');
    const out = def.round(R, null, units);
    owed += out.total * uv;
    if (out.fs) fsRun = { left: out.fs, total: out.fs, won: 0, state: def.fsInit(), units, coin, uv, bet, fresh: true };
    await present(out, uv, bet);
    if (!alive) return;
    pay();
    let total = out.total * uv;
    if (total > 0) { msg(def.roundText(out, uv), 'win'); if (win.to !== total) rollWin(total, win.shown, bet); if (!(await bigWin(total, bet))) { K.sfx.win(); el.classList.add('winning'); later(() => el.classList.remove('winning'), 1600); await sleep(Math.min(1500, win.dur + 200)); } }
    else msg('No win, spin again.', '');
    if (!alive) return;
    if (fsRun) total += await runFreeSpins();
    if (!alive) return;
    busy = false; syncControls();
    if (auto > 0) {
      auto--; syncControls();
      if (total >= bet * 50 || out.fs) { auto = 0; syncControls(); msg('Auto play stopped on a big win.', 'gold'); }
      else if (auto > 0) later(() => { if (!busy && auto > 0) spin(); }, total > 0 ? 800 : 350);
    }
  }
  async function runFreeSpins() {
    const F = fsRun; mode = 'free'; subState.mult = 1; syncControls();
    K.sfx.bigWin(); card(`${F.total} FREE SPINS`, def.fsIntro, 2300); el.classList.add('winning');
    await sleep(2400); if (!alive) return 0;
    el.classList.remove('winning');
    while (F.left > 0 && alive) {
      F.left--; updSub();
      msg(`Free spin ${F.total - F.left} of ${F.total}`, 'gold'); setWinMeter(0);
      const out = def.round(R, F.state, F.units);
      owed += out.total * F.uv;
      if (out.fs) { F.left += out.fs; F.total += out.fs; }
      await present(out, F.uv, F.bet); if (!alive) return F.won;
      const won = out.total * F.uv; pay(); F.won += won; updSub();
      if (won > 0) { msg(def.roundText(out, F.uv), 'win'); K.sfx.win(); }
      if (out.fs) { card(`+${out.fs} FREE SPINS`, 'Retriggered!', 1600); K.sfx.bigWin(); await sleep(1600); }
      await sleep(won > 0 ? 1100 : 550);
    }
    if (!alive) return F.won;
    hl = null; cHL = null;
    card('FREE SPINS COMPLETE', `You won ${K.fmt(F.won)}`, 2400); setWinMeter(F.won); msg(`Free spins paid ${K.fmt(F.won)}`, 'win');
    if (!(await bigWin(F.won, F.bet))) { K.sfx.win(); await sleep(2400); }
    if (!alive) return F.won;
    fsRun = null; mode = 'base'; if (def.kind === 'cluster') marks = null; subState.mult = 1; syncControls();
    return F.won;
  }
  // Leaving mid-round never forfeits anything: pay what was already decided and play out any free spins instantly.
  function settle() {
    let d = owed; owed = 0;
    if (fsRun) { let guard = 0; while (fsRun.left > 0 && guard++ < 2000) { fsRun.left--; const o = def.round(R, fsRun.state, fsRun.units); d += o.total * fsRun.uv; fsRun.left += o.fs; } fsRun = null; }
    if (d > 0) { api.win(d); if (api.toast) api.toast(`${def.title}: ${K.fmt(d)} paid out`); }
  }

  // ------------------------------------------------------------------ boot
  syncControls(); setWinMeter(0); layout(); raf = requestAnimationFrame(frame);
  if (def.kind === 'ways') { subState.ways = board.reduce((a, C) => a * C.n, 1); updSub(); }
  msg(def.hello(units, coin));
  return {
    unmount() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); ro.disconnect();
      window.removeEventListener('keydown', onKey); if (unsubBal) unsubBal();
      reelsDone = null; dropDone = null; big = null;
      settle();
      root.innerHTML = '';
    }
  };
}

// =====================================================================================================
// Machine definitions
// =====================================================================================================
const RTP = {
  'slot-quake': '≈94.7%',
  'slot-sugar': '≈94.4%',
  'slot-liberty7': '95.1% at 3 coins · 95.0% at 1–2 coins (exact)',
  'slot-sunqueen': '≈94.5%'
};
const pgCard = (img, name, lines) => `<div class="sm-pg"><img src="${img}" alt=""><div><b>${name}</b><br>${lines.join('<br>')}</div></div>`;

// ---------------------------------------------------------------- Mega Quake
const QK_NAMES = { volcano: 'Volcano', opal: 'Fire Opal', fossil: 'Ammonite', obsidian: 'Obsidian', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', N: '9', wild: 'Quake Wild', scatter: 'Lava Orb' };
const QK_SYMS = Object.keys(QK.base);
const DEF_QUAKE = {
  id: 'slot-quake', title: 'Mega Quake', order: 130, kind: 'ways', style: 'basalt',
  blurb: '6 reels, 2–7 rows each: up to 117,649 ways. Wins erupt and cascade; free-spin cascades grow the multiplier.',
  theme: { cabinet: '#3a2a26', accent: '#ff7a1a', glass: '#1a0804' },
  cols: 6, rowsMax: 7, rowsMin: 2, cellAspect: 1.6, aspectMin: .62, gap: 4, symScale: .9, spinMs: 650, stagger: 170, vmax: 26,
  reelBg: [[0, '#0c0504'], [.55, '#22100a'], [.88, '#3a1408'], [1, '#6a2008']], rowLines: 'rgba(255,120,40,.12)',
  burst: ['#ffb000', '#ff6a00', '#ffd34a', '#ff3a00', '#3a2a26', '#5a4a44'], glow: 'rgba(255,150,40,.8)', labelCol: '#ff9a1a',
  scatter: 'scatter', wild: 'wild', names: QK_NAMES,
  paint: { volcano: pVolcano, opal: pOpal, fossil: pFossil, obsidian: pObsidian, wild: pQuakeWild, scatter: pLavaOrb,
    A: c => pStone(c, 'A', '#ff5a00'), K: c => pStone(c, 'K', '#ffb000'), Q: c => pStone(c, 'Q', '#ff3a3a'), J: c => pStone(c, 'J', '#ff8a00'), T: c => pStone(c, '10', '#ffd000'), N: c => pStone(c, '9', '#ff6a3a') },
  bet: { unitName: 'LEVEL', steps: [1, 2, 3, 5, 10], def: 1, cost: (c, u) => QK.credits * c * u, uv: (c, u) => c * u },
  filler: i => Math.random() < .03 ? 'scatter' : (i >= 1 && i <= 4 && Math.random() < .05) ? 'wild' : cosmetic(QK_SYMS),
  idleCol: () => Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => cosmetic(QK_SYMS)),
  round(R, st) { const o = qkRound(R, st); return { first: o.steps[0].grid, steps: o.steps, total: o.total, fs: o.fs, scatters: o.scatters }; },
  fsInit: qkFsInit,
  antic(first) { let n = 0; for (let i = 0; i < 5; i++) n += first[i].filter(s => s === 'scatter').length; return n >= 3 ? 5 : 99; },
  fsIntro: 'Every cascade adds +1 to the win multiplier',
  stepText(st, uv) { const m = st.mult > 1 ? ` ×${st.mult}` : ''; if (st.wins.length === 1) { const w = st.wins[0]; return `${w.n}× ${QK_NAMES[w.sym]} · ${w.ways.toLocaleString('en-US')} ways${m} · ${K.fmt(w.credits * st.mult * uv)}`; } return `${st.wins.length} wins${m} · ${K.fmt(st.credits * uv)}`; },
  roundText(out, uv) { const n = out.steps.filter(s => s.wins.length).length; return n > 1 ? `${n} cascades paid ${K.fmt(out.total * uv)}` : `Win ${K.fmt(out.total * uv)}`; },
  hello: (u, c) => `Level ${u} · ${K.fmt(QK.credits * c * u)} a spin. Press SPIN or Space.`,
  paytable(th, b) {
    const f = cr => K.fmt(cr * b.uv);
    let h = `<p>6 reels; every spin each reel shows 2 to 7 symbols, so the number of <b>ways</b> changes from spin to spin (up to 7×7×7×7×7×7 = <b>117,649</b>). A win is 3 or more of the same symbol on adjacent reels from the left, in any row. Each symbol pays <b>per way</b>: multiply its pay by the number of ways it forms.</p>
      <p><b>Cascades:</b> winning symbols explode, everything above falls down and new symbols drop in from the top. Keep cascading while new wins form.</p>`;
    h += `<h4>Pays per way at your bet (${K.fmt(b.bet)} a spin)</h4><div class="sm-paygrid">`;
    for (const [s, p] of Object.entries(QK.pays)) h += pgCard(th(s), QK_NAMES[s], [6, 5, 4, 3].map(n => `${n}× ${f(p[n])}`));
    h += pgCard(th('wild'), 'Quake Wild', ['Reels 2–5', 'Substitutes for every', 'symbol but the Lava Orb']);
    h += pgCard(th('scatter'), 'Lava Orb', ['4 = 12 free spins', '5 = 17 · 6+ = 22', 'Counted after cascades']);
    h += `</div><h4>Free spins</h4><p>4 or more Lava Orbs anywhere (counted when the cascades stop) award free spins at the same bet. The win multiplier starts at <b>×1</b> and every cascade adds <b>+1</b>; it is never reset during the free spins. 3 or more Lava Orbs during free spins add <b>+5 spins</b>.</p>`;
    return h;
  },
  rtpText: RTP['slot-quake'] + ' (4M-spin Monte Carlo including free spins; free spins about 1 in 320 spins)'
};

// ---------------------------------------------------------------- Sugar Burst
const SB_NAMES = { pop: 'Swirl Pop', bear: 'Gummy Bear', wrap: 'Grape Wrap', star: 'Star Drop', gumR: 'Cherry Heart', gumY: 'Lemon Drop', gumG: 'Lime Bean', scatter: 'Gumball Jar' };
const SB_SYMS = Object.keys(SB.pays);
const SB_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15+'];
const DEF_SUGAR = {
  id: 'slot-sugar', title: 'Sugar Burst', order: 131, kind: 'cluster', style: 'candy',
  blurb: '7×7 cluster pays. Popped spots turn into multipliers that double up to ×128 and stick through free spins.',
  theme: { cabinet: '#e0559b', accent: '#7ef0ff', glass: '#3a0a2a' },
  cols: 7, rowsMax: 7, rowsMin: 7, cellAspect: 1, aspectMin: .9, gap: 3, symScale: .9, spinMs: 560, stagger: 120, vmax: 24, boomMs: 340,
  reelBg: [[0, '#7a2060'], [.5, '#b0508e'], [1, '#7a2060']],
  burst: ['#ff2f8e', '#ffd21a', '#3ad84a', '#2a9aff', '#ffffff', '#9a3cff'], glow: 'rgba(255,255,255,.85)', labelCol: '#7ef0ff',
  scatter: 'scatter', names: SB_NAMES,
  paint: { pop: pLolly, bear: pBear, wrap: pWrap, star: pStarCandy, gumR: pHeart, gumY: pDrop, gumG: pBean, scatter: pGumball },
  bet: { unitName: 'LEVEL', steps: [1, 2, 3, 5, 10], def: 1, cost: (c, u) => SB.credits * c * u, uv: (c, u) => c * u },
  filler: () => Math.random() < .03 ? 'scatter' : cosmetic(SB_SYMS),
  idleCol: () => Array.from({ length: 7 }, () => cosmetic(SB_SYMS)),
  round(R, st) { const o = sbRound(R, st); return { first: o.steps[0].grid, steps: o.steps, total: o.total, fs: o.fs, scatters: o.scatters }; },
  fsInit: sbFsInit,
  antic(first) { let n = 0; for (let i = 0; i < 5; i++) n += first[i].filter(s => s === 'scatter').length; return n === 2 ? 5 : 99; },
  fsIntro: 'Multiplier spots stay for every free spin',
  stepText(st, uv) { if (st.wins.length === 1) { const w = st.wins[0]; return `${w.cells.length} ${SB_NAMES[w.sym]}${w.mult > 1 ? ` ×${w.mult}` : ''} · ${K.fmt(w.credits * uv)}`; } return `${st.wins.length} clusters · ${K.fmt(st.credits * uv)}`; },
  roundText(out, uv) { const n = out.steps.filter(s => s.wins.length).length; return n > 1 ? `${n} tumbles paid ${K.fmt(out.total * uv)}` : `Win ${K.fmt(out.total * uv)}`; },
  hello: (u, c) => `Level ${u} · ${K.fmt(SB.credits * c * u)} a spin. Press SPIN or Space.`,
  paytable(th, b) {
    const f = cr => fmtShort(cr * b.uv);
    let h = `<p>A 7×7 grid of candy. <b>5 or more</b> matching candies touching up, down, left or right form a <b>cluster</b> and pay. Winning clusters pop, the candy above tumbles down, and new candy falls in. Tumbles continue while new clusters form.</p>
      <h4>Multiplier spots</h4><p>The first time a spot pops it is marked with frosting. Every later pop on that spot turns it into a multiplier that doubles: <span class="sm-ladder"><span>×2</span><span>×4</span><span>×8</span><span>×16</span><span>×32</span><span>×64</span><span>×128</span></span></p>
      <p>A cluster that sits on multiplier spots is multiplied by their <b>total</b>. In the base game the spots clear on every spin; in free spins they <b>stay for the whole feature</b>.</p>
      <h4>Cluster pays at your bet (${K.fmt(b.bet)} a spin)</h4><div style="overflow-x:auto"><table><tr><th>Candy</th>${SB_SIZES.map(s => `<th>${s}</th>`).join('')}</tr>`;
    for (const s of SB_SYMS) h += `<tr><td><img src="${th(s)}" alt="${SB_NAMES[s]}"></td>${SB.pays[s].map(v => `<td>${f(v)}</td>`).join('')}</tr>`;
    h += `</table></div><h4>Free spins</h4><div class="sm-paygrid">${pgCard(th('scatter'), 'Gumball Jar', ['3 = 15 free spins', '4 = 18 · 5 = 22', '6 = 26 · 7+ = 30'])}</div><p>Gumball Jars anywhere are counted when the tumbling stops. Landing 3 or more again during free spins awards the same number of extra spins.</p>`;
    return h;
  },
  rtpText: RTP['slot-sugar'] + ' (4M-spin Monte Carlo including free spins; free spins about 1 in 270 spins)'
};

// ---------------------------------------------------------------- Liberty Sevens
const LS_NAMES = { wild: 'Liberty Star', r7: 'Red 7', w7: 'White 7', b7: 'Blue 7', bar1: 'BAR', bar2: 'Double BAR', bar3: 'Triple BAR', blank: 'Blank' };
const LS_ICONS = { rwb7: ['r7', 'w7', 'b7'], r7: ['r7', 'r7', 'r7'], b7: ['b7', 'b7', 'b7'], w7: ['w7', 'w7', 'w7'], rwbbar: ['bar1', 'bar2', 'bar3'], bar3: ['bar3', 'bar3', 'bar3'], bar2: ['bar2', 'bar2', 'bar2'], bar1: ['bar1', 'bar1', 'bar1'], onew: ['wild'] };
const lsPay = (rule, coins) => rule.top ? LS_TOP[coins - 1] : rule.pay * coins;
const LS_TABLE = [{ id: 'top', name: 'Three Liberty Stars', top: true, icons: ['wild', 'wild', 'wild'] }, ...LS_RULES.map(r => ({ ...r, icons: LS_ICONS[r.id] }))];
const DEF_LIBERTY = {
  id: 'slot-liberty7', title: 'Liberty Sevens', order: 132, kind: 'line', style: 'chrome', oneLine: true, cylinder: true,
  blurb: 'Chrome 3-reel stepper. Any red, then white, then blue pays; the Liberty Star wild doubles (two quadruple).',
  theme: { cabinet: '#c8ccd6', accent: '#ff3048', glass: '#0a1430' },
  cols: 3, rowsMax: 3, rowsMin: 3, cellAspect: 1.3, aspectMin: 1.0, gap: 10, symScale: .8, spinMs: 820, stagger: 380, vmax: 20, stopMs: 460,
  reelBg: [[0, '#5d5a54'], [.16, '#e9e6de'], [.5, '#fffefa'], [.84, '#e9e6de'], [1, '#5d5a54']],
  gapFill: [[0, '#5a6070'], [.5, '#f4f6fa'], [1, '#5a6070']],
  wild: 'wild', names: LS_NAMES, lines: [[1, 1, 1]], tagline: 'ANY RED · WHITE · BLUE IN ORDER PAYS',
  paint: { wild: pLibStar, r7: c => pSeven7(c, '#ff4b4b', '#a8000e', '#ffd0d0', '#2a0004'), w7: c => pSeven7(c, '#ffffff', '#c8cede', '#1d3a8a', '#0a1430'), b7: c => pSeven7(c, '#5a8aff', '#0a2a9a', '#d0dcff', '#000a30'),
    bar1: c => pBarN(c, 1, ['#ff4b4b', '#c40018', '#5a0008'], '#fff', '#1a1a1a'), bar2: c => pBarN(c, 2, ['#ffffff', '#e2e6ee', '#9aa3b5'], '#1d3a8a', '#1d3a8a'), bar3: c => pBarN(c, 3, ['#4a7aff', '#1d3a8a', '#06103a'], '#fff', '#c8ccd6'), blank: () => {} },
  bet: { unitName: 'COINS', steps: [1, 2, 3], def: 3, cost: (c, u) => c * u, uv: c => c },
  filler: () => cosmetic(LS.reels[0].strip),
  idleCol: () => { const st = LS.reels[0].strip, L = st.length, s = Math.floor(Math.random() * L); return [st[mod(s - 1, L)], st[s], st[mod(s + 1, L)]]; },
  round(R, st, coins) {
    const o = lsRound(R, coins), w = o.win;
    const cells = !w ? [] : w.id === 'onew' ? o.line.map((s, i) => s === 'wild' ? [i, 1] : null).filter(Boolean) : [[0, 1], [1, 1], [2, 1]];
    return { first: o.cols, wins: w ? [{ line: 0, cells, credits: w.pay, label: w.name + (w.mult > 1 ? ` ×${w.mult}` : '') }] : [], total: o.total, fs: 0 };
  },
  fsInit: () => ({}),
  antic(first) { const a = first[0][1], b = first[1][1]; return (isSeven(a) || a === 'wild') && (isSeven(b) || b === 'wild') ? 2 : 99; },
  winLabel: (w, uv) => `${w.label} pays ${K.fmt(w.credits * uv)}`,
  roundText(out, uv) { return out.wins.length ? `${out.wins[0].label} pays ${K.fmt(out.total * uv)}` : ''; },
  stepText: () => '',
  hello: (u) => `Bet ${u} coin${u > 1 ? 's' : ''}. Press SPIN or Space.`,
  reflection(c, G) {
    c.save(); c.globalCompositeOperation = 'screen';
    c.fillStyle = lin(c, 0, 0, G.W, G.H, [[0, 'rgba(255,255,255,0)'], [.3, 'rgba(255,255,255,0)'], [.36, 'rgba(255,255,255,.22)'], [.42, 'rgba(255,255,255,.05)'], [.5, 'rgba(255,255,255,0)'], [.62, 'rgba(255,255,255,0)'], [.66, 'rgba(255,255,255,.12)'], [.69, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, G.W, G.H);
    c.fillStyle = lin(c, 0, 0, 0, G.H * .2, [[0, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(0, 0, G.W, G.H * .2);
    c.restore();
  },
  glass(img) {
    const icon = r => r.icons ? r.icons.map(s => `<img src="${img(s)}" alt="">`).join('') + (r.id === 'onew' ? ' <small>any</small>' : '') : `<small>${r.name}</small>`;
    const rows = LS_TABLE.map(r => `<tr><td title="${r.name}">${icon(r)}</td>${[1, 2, 3].map(n => `<td data-u="${n}">${lsPay(r, n).toLocaleString()}</td>`).join('')}</tr>`);
    const head = `<tr><th></th>${[1, 2, 3].map(n => `<th data-u="${n}">${n} COIN${n > 1 ? 'S' : ''}</th>`).join('')}</tr>`, per = Math.ceil(rows.length / 2);
    return `<div class="sm-two">${[0, 1].map(k => `<table>${head}${rows.slice(k * per, k * per + per).join('')}</table>`).join('')}</div>`;
  },
  paytable(th) {
    let h = `<p>A chrome three-reel stepper with one center payline. Bet 1–3 coins; the coin is $1, $5 or $25. Pays are in coins.</p>
      <p><b>Colors:</b> Red = Red 7 or single BAR · White = White 7 or Double BAR · Blue = Blue 7 or Triple BAR. Any red, then any white, then any blue on the line pays even when you mix 7s and BARs.</p>
      <p><img src="${th('wild')}" alt=""> The <b>Liberty Star</b> is wild for every symbol: one in a win pays <b>×2</b>, two pay <b>×4</b>, three pay the top award. A single Star anywhere on the line pays on its own.</p>
      <h4>Pays (coins)</h4><table><tr><th>Combination</th><th>1 coin</th><th>2 coins</th><th>3 coins</th></tr>`;
    for (const r of LS_TABLE) h += `<tr><td>${r.icons ? r.icons.map(s => `<img src="${th(s)}" alt="${LS_NAMES[s]}">`).join('') + '<br>' : ''}<small>${r.name}</small></td>${[1, 2, 3].map(n => `<td>${lsPay(r, n).toLocaleString()}</td>`).join('')}</tr>`;
    return h + `</table><p>The top award jumps to <b>5,000 coins</b> with 3 coins bet.</p>`;
  },
  rtpText: RTP['slot-liberty7'] + ' (hit rate 10.8%)'
};

// ---------------------------------------------------------------- Queen of the Nile Sun
const SQ_NAMES = { queen: 'Sun Queen', sphinx: 'Sphinx', cat: 'Sacred Cat', lotus: 'Lotus', barque: 'Sun Barque', vase: 'Perfume Jar', A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', N: '9' };
const SQ_SYMS = Object.keys(SQ_BASE);
const DEF_SUN = {
  id: 'slot-sunqueen', title: 'Queen of the Nile Sun', logo: 'Nile Sun Queen', order: 133, kind: 'line', style: 'sunset',
  blurb: '5 reels, 20 lines. The Sun Queen is wild and doubles wins; 3 Sphinxes bring 15 free spins at ×3.',
  theme: { cabinet: '#c8452a', accent: '#ffcf5a', glass: '#2a0a3a' },
  cols: 5, rowsMax: 3, rowsMin: 3, cellAspect: 1.0, aspectMin: .62, gap: 5, symScale: .88, spinMs: 700, stagger: 220, vmax: 26,
  reelBg: [[0, '#1a0626'], [.45, '#46123e'], [.8, '#6a2238'], [1, '#2a0a20']],
  wild: 'queen', scatter: 'sphinx', names: SQ_NAMES, lines: LINES20, fsMultLabel: '×3',
  paint: { queen: pQueen, sphinx: pSphinx, cat: pCat, lotus: pLotus, barque: pBarque, vase: pVase,
    A: c => pRoyal(c, 'A', '#ffd27a', '#e8642a', '#fff0c0'), K: c => pRoyal(c, 'K', '#ff9ad0', '#a8205a', '#ffd27a'), Q: c => pRoyal(c, 'Q', '#c8a0ff', '#5a1a8a', '#ffd27a'),
    J: c => pRoyal(c, 'J', '#7af0e0', '#0a7a8a', '#ffd27a'), T: c => pRoyal(c, '10', '#ffb07a', '#b8401a', '#ffd27a'), N: c => pRoyal(c, '9', '#ffe08a', '#c8862a', '#fff0c0') },
  bet: { unitName: 'LINES', steps: [1, 5, 10, 15, 20], def: 20, cost: (c, u) => c * u, uv: c => c },
  filler: i => { const st = SQ.strips[i]; return st[Math.floor(Math.random() * st.length)]; },
  idleCol: i => { const st = SQ.strips[i], t = Math.floor(Math.random() * st.length); return [0, 1, 2].map(r => st[(t + r) % st.length]); },
  round(R, st, lines) { const o = sqRound(R, lines, st); return { first: o.grid, wins: o.wins, total: o.total, fs: o.fs }; },
  fsInit: sqFsInit,
  antic(first) { let n = 0; for (let i = 0; i < 4; i++) { if (first[i].includes('sphinx')) n++; if (n >= 2) return i + 1; } return 99; },
  fsIntro: 'All wins ×3 · retrigger with 3 Sphinxes',
  winLabel: (w, uv) => w.scatter ? `${w.n} Sphinxes pay ${K.fmt(w.credits * uv)}` : `Line ${w.line + 1}: ${w.n}× ${SQ_NAMES[w.sym]}${w.doubled ? ' (Queen ×2)' : ''} pays ${K.fmt(w.credits * uv)}`,
  roundText(out, uv) { return out.wins.length === 1 ? DEF_SUN.winLabel(out.wins[0], uv) : `${out.wins.length} wins pay ${K.fmt(out.total * uv)}`; },
  stepText: () => '',
  hello: (u, c) => `${u} lines · ${K.fmt(c)} a line. Press SPIN or Space.`,
  paytable(th, b) {
    const f = cr => K.fmt(cr * b.coin);
    let h = `<p>5 reels, 20 lines; the coin is the bet per line. Line wins pay left to right on adjacent reels.</p>
      <p><b>Sun Queen</b> is wild for every symbol except the Sphinx and <b>doubles</b> any line win she completes. Five Queens on a line pay the top award.</p>
      <p><b>Sphinx</b> scatters pay anywhere (× total bet). <b>3 or more award 15 free spins with every win ×3</b> (×6 with a Queen). Free spins can be retriggered for another 15.</p>
      <h4>Line pays at ${K.fmt(b.coin)} a line</h4><div class="sm-paygrid">`;
    for (const [s, p] of Object.entries(SQ.pays)) h += pgCard(th(s), SQ_NAMES[s], [5, 4, 3, 2].filter(n => p[n]).map(n => `${n}× ${f(p[n])}`));
    h += pgCard(th('sphinx'), 'Sphinx', [5, 4, 3, 2].map(n => `${n}× ${SQ.scatterPay[n]}× total bet`).concat(['3+ = 15 free spins']));
    h += `</div><h4>Paylines</h4><div class="sm-linegrid">${LINES20.map((_, i) => `<figure><canvas data-line="${i}" width="132" height="80"></canvas>Line ${i + 1}</figure>`).join('')}</div>`;
    return h;
  },
  rtpText: RTP['slot-sunqueen'] + ' at 20 lines (4M-spin Monte Carlo including free spins; free spins about 1 in 128 spins)'
};

// =====================================================================================================
// Exports
// =====================================================================================================
const DEFS = [DEF_QUAKE, DEF_SUGAR, DEF_LIBERTY, DEF_SUN];
export const machines = DEFS.map(def => ({
  id: def.id, title: def.title, kind: 'slot', order: def.order, blurb: def.blurb, theme: { ...def.theme, reels: def.cols === 3 ? 3 : 5 },
  mount(root, api) { return mountMachine(def, root, api); }
}));
export const [megaQuake, sugarBurst, libertySevens, sunQueen] = machines;
export default machines[0];

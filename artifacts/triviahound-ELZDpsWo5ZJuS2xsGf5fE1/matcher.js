/* Answer judge: forgiving "close enough" matching for typed trivia answers.
   Handles misspellings, accents, articles, number words, surnames, plurals,
   sound-alike spellings, extra/missing generic words, and guards against
   inputs that are closer to a known wrong answer than to the right one. */
(function (global) {
  const NUM = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
    eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18,
    nineteen:19, twenty:20, thirty:30, forty:40, fourty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90,
    first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8, ninth:9, tenth:10,
    hundred:100, thousand:1000, million:1000000, billion:1000000000, dozen:12 };
  const ROMAN = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10, xi:11, xii:12, xiii:13, xiv:14, xv:15, xvi:16 };
  const ALIASES = {
    'usa':'united states','us':'united states','united states of america':'united states','america':'united states',
    'uk':'united kingdom','great britain':'united kingdom','britain':'united kingdom',
    'ussr':'soviet union','uae':'united arab emirates','nyc':'new york city','la':'los angeles',
    'dc':'washington dc','washington d c':'washington dc','nz':'new zealand','drc':'democratic republic of congo',
    'candy floss':'cotton candy','candyfloss':'cotton candy','beet':'beetroot','beets':'beetroot','aubergine':'eggplant','courgette':'zucchini',
    'coriander':'cilantro','soccer':'football','prawn':'shrimp','prawns':'shrimp','french fries':'fries','mobile phone':'cell phone','cellphone':'cell phone',
    'aeroplane':'airplane','aluminium':'aluminum','colour':'color','grey':'gray','mum':'mom','maths':'math','theatre':'theater','centre':'center',
    'h2o':'water','co2':'carbon dioxide','ww2':'world war 2','wwii':'world war 2','ww1':'world war 1','wwi':'world war 1'
  };
  const WORDMAP = { mt:'mount', st:'saint', ste:'sainte', dr:'doctor', jr:'junior', sr:'senior', vs:'versus', '&':'and', n:'and', u:'you', ur:'your' };
  const GENERIC = new Set(['the','a','an','of','river','mount','mountain','mountains','lake','city','island','islands','ocean','sea',
    'battle','kingdom','republic','empire','state','states','band','mr','mrs','ms','doctor','sir','saint','desert','bay','gulf',
    'canal','planet','dr','king','queen','prince','princess','lord','lady','captain','and','team','fc','club','game','video',
    'film','movie','series','show','album','song','book','novel','the','language','people','dynasty','war','in','on','de','la']);
  const TRUE_W = new Set(['true','t','yes','y','yep','yeah','correct','right']);
  const FALSE_W = new Set(['false','f','no','n','nope','wrong','incorrect']);

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1), prev2 = null;
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur = new Array(n + 1); cur[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        // transposition (Damerau)
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
      }
      prev2 = prev; prev = cur;
    }
    return prev[n];
  }

  function wordsToNumbers(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];
      if (t in NUM) {
        let v = NUM[t];
        // twenty one -> 21 ; two hundred -> 200
        if (v >= 20 && v < 100 && v % 10 === 0 && tokens[i + 1] in NUM && NUM[tokens[i + 1]] < 10) { v += NUM[tokens[++i]]; }
        if (tokens[i + 1] in NUM && NUM[tokens[i + 1]] >= 100 && v < 100) { v *= NUM[tokens[++i]]; }
        out.push(String(v));
      } else out.push(t);
    }
    return out;
  }

  function normalize(s, opts) {
    s = String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    s = s.replace(/&/g, ' and ').replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/['’`´]/g, '');
    s = s.replace(/(\d+)\s*(st|nd|rd|th)\b/g, '$1');
    s = s.replace(/[^a-z0-9.]+/g, ' ').replace(/(?<!\d)\.|\.(?!\d)/g, ' ').trim();
    let toks = s.split(/\s+/).filter(Boolean).map(t => WORDMAP[t] || t);
    toks = wordsToNumbers(toks);
    if (opts && opts.roman) toks = toks.map(t => (t in ROMAN && t.length > 1) ? String(ROMAN[t]) : t);
    while (toks.length > 1 && (toks[0] === 'the' || toks[0] === 'a' || toks[0] === 'an')) toks.shift();
    let joined = toks.join(' ');
    if (ALIASES[joined]) joined = ALIASES[joined];
    return joined;
  }

  function phon(str) {
    return str.split(' ').map(w => {
      if (/^\d+$/.test(w)) return w;
      w = w.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/sch/g, 'sk').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
        .replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's').replace(/wh/g, 'w').replace(/^kn/g, 'n').replace(/gh/g, '')
        .replace(/dg/g, 'j').replace(/th/g, 't').replace(/y/g, 'i').replace(/v/g, 'f').replace(/(.)\1+/g, '$1');
      return w[0] + w.slice(1).replace(/[aeiouhw]/g, '');
    }).join(' ');
  }

  function allowed(len) { return len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : len <= 14 ? 3 : Math.floor(len * 0.22); }
  const singular = s => s.split(' ').map(w => w.length > 3 ? w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '') : w).join(' ');
  const digits = s => (s.match(/\d+(\.\d+)?/g) || []).join(' ');

  function variants(answer) {
    const raw = String(answer);
    const set = new Set();
    const add = v => { const n = normalize(v); if (n) set.add(n); const r = normalize(v, { roman: true }); if (r) set.add(r); };
    add(raw);
    const noParen = raw.replace(/\([^)]*\)/g, ' ');
    add(noParen);
    (raw.match(/\(([^)]*)\)/g) || []).forEach(p => add(p.replace(/[()]/g, '').replace(/^(aka|a\.k\.a\.|or)\s+/i, '')));
    noParen.split(/\s*\/\s*|\s+or\s+|;\s*/i).forEach(add);
    if (/,/.test(noParen) && !/\d,\d/.test(noParen)) add(noParen.split(',')[0]);
    // "Washington, D.C." / "Paris, France"
    return [...set];
  }

  function looksLikeName(raw) {
    return /^([A-Z][\w'’.\-]+|da|de|van|von|der|di|le|la|du|bin|al|el|del|of)( ([A-Z][\w'’.\-]+|da|de|van|von|der|di|le|la|du|bin|al|el|del))+$/.test(raw.trim().replace(/\([^)]*\)/g, '').trim());
  }

  // score in [0..1]; 1 = exact
  function similarity(inp, v) {
    if (!inp || !v) return 0;
    if (inp === v) return 1;
    const a = inp.replace(/ /g, ''), b = v.replace(/ /g, '');
    if (a === b) return 0.99;
    const d = lev(a, b);
    return Math.max(0, 1 - d / Math.max(a.length, b.length));
  }

  function matchOne(inp, v, rawAnswer) {
    if (!inp) return null;
    if (inp === v) return { ok: true, reason: 'Exact match' };
    const a = inp.replace(/ /g, ''), b = v.replace(/ /g, '');
    if (a === b) return { ok: true, reason: 'Exact match (spacing)' };
    const dv = digits(v), di = digits(inp);
    if (dv) {
      // numbers must match exactly; allow fuzzy text around them
      if (dv !== di) return null;
      const tv = v.replace(/\d+(\.\d+)?/g, '').trim(), ti = inp.replace(/\d+(\.\d+)?/g, '').trim();
      if (!tv || !ti || lev(tv.replace(/ /g, ''), ti.replace(/ /g, '')) <= allowed(tv.length)) return { ok: true, reason: 'Number matches' };
      if (/^[\d. ]+$/.test(inp)) return { ok: true, reason: 'Number matches' };
      return null;
    }
    if (singular(inp) === singular(v)) return { ok: true, reason: 'Matches (singular/plural)' };
    const d = lev(a, b);
    if (d <= allowed(b.length)) return { ok: true, reason: d ? `Close spelling of "${rawAnswer}"` : 'Match' };
    if (b.length >= 4 && phon(inp) === phon(v) && d <= allowed(b.length) + 2) return { ok: true, reason: `Sounds like "${rawAnswer}"` };

    const ti = inp.split(' '), tv = v.split(' ');
    const fuzzyTok = (x, y) => x === y || (y.length >= 4 && lev(x, y) <= allowed(y.length)) || (y.length >= 4 && phon(x) === phon(y) && lev(x, y) <= allowed(y.length) + 1);
    // Surname / trailing-name match: "Einstein" for "Albert Einstein", "da Vinci" for "Leonardo da Vinci"
    if (tv.length >= 2 && looksLikeName(rawAnswer)) {
      for (let k = 1; k < tv.length; k++) {
        const tail = tv.slice(k);
        if (tail.join('').length >= 4 && tail.length === ti.length && tail.every((t, i) => fuzzyTok(ti[i], t)))
          return { ok: true, reason: `Last name accepted for "${rawAnswer}"` };
      }
    }
    // user added generic words: "river nile" for "nile", "mount everest" for "everest"
    const sig = t => t.filter(w => !GENERIC.has(w));
    const si = sig(ti), sv = sig(tv);
    if (si.length && sv.length && si.length === sv.length && si.every((t, i) => fuzzyTok(t, sv[i])) && sv.join('').length >= 3)
      return { ok: true, reason: `Key words match "${rawAnswer}"` };
    // the answer appears inside a short sentence: "i think it's paris"
    if (b.length >= 4 && ti.length <= tv.length + 4) {
      for (let s = 0; s + tv.length <= ti.length; s++) {
        if (tv.every((t, i) => fuzzyTok(ti[s + i], t))) return { ok: true, reason: `Found "${rawAnswer}" in your answer` };
      }
    }
    return null;
  }

  /**
   * judge(input, answer, wrongAnswers) -> { ok, reason, score }
   */
  function judge(input, answer, wrongs) {
    wrongs = (wrongs || []).filter(w => w != null);
    const inpRaw = String(input || '').trim();
    if (!inpRaw) return { ok: false, reason: 'No answer given' };
    const ansN = normalize(answer);
    // True / False
    if (ansN === 'true' || ansN === 'false') {
      const n = normalize(inpRaw);
      const saysTrue = TRUE_W.has(n), saysFalse = FALSE_W.has(n);
      if (!saysTrue && !saysFalse) return { ok: false, reason: 'Answer True or False' };
      const ok = (ansN === 'true') === saysTrue;
      return { ok, reason: ok ? 'Correct' : 'Incorrect' };
    }
    const inp = normalize(inpRaw), inpR = normalize(inpRaw, { roman: true });
    const vars = variants(answer);
    let best = null, bestScore = 0;
    for (const v of vars) {
      for (const x of [inp, inpR]) {
        const r = matchOne(x, v, String(answer).trim());
        const s = similarity(x, v);
        if (r && (!best || s > bestScore)) { best = r; bestScore = s; }
      }
    }
    // guard: is the input actually a (closer) wrong answer?
    let wrongBest = 0, wrongHit = null;
    for (const w of wrongs) {
      for (const wv of variants(w)) {
        const s = similarity(inp, wv);
        if (s > wrongBest) { wrongBest = s; wrongHit = w; }
      }
    }
    if (best) {
      if (wrongBest === 1 && bestScore < 1) return { ok: false, reason: `"${wrongHit}" is a different answer`, score: 0 };
      if (bestScore < 1 && wrongBest > bestScore + 0.02 && wrongBest >= 0.6) return { ok: false, reason: `Closer to "${wrongHit}" than the right answer`, score: 0 };
      return { ok: true, reason: best.reason, score: bestScore };
    }
    return { ok: false, reason: 'Not close enough', score: bestScore };
  }

  global.AnswerJudge = { judge, normalize, lev, variants, phon };
  if (typeof module !== 'undefined') module.exports = global.AnswerJudge;
})(typeof window !== 'undefined' ? window : globalThis);

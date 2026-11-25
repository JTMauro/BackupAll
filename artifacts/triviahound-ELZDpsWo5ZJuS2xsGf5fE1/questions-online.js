/* Question service
   - Built-in bank (window.OFFLINE_QUESTIONS, 18,000 rated questions) always available offline.
   - When online, fresh questions come from The Trivia API + Open Trivia DB, and every fetched
     question is saved into a local library (IndexedDB) so the bank keeps growing.
   - Thrown-out ("ridiculous") questions are never asked again (restorable in Settings).
   - Age levels pick difficulty and filter grown-up content for kids. */
(function (global) {
  // Category order: Geography, Entertainment, History, Arts & Literature, Science & Nature,
  // Sports & Leisure, Food & Drink, Technology, Everyday Life & Pop Culture
  const TECH_TAGS = 'science:technology,science:computing,science:inventions,org:tech-companies,topic:internet-culture,science:engineering,person:inventors';
  const CAT_MAP = [
    { tta: 'categories=geography', otdb: [22] },
    { tta: 'categories=film_and_tv,music', otdb: [11, 12, 13, 14, 31, 32] },
    { tta: 'categories=history', otdb: [23, 24] },
    { tta: 'categories=arts_and_literature', otdb: [10, 25, 20] },
    { tta: 'categories=science', otdb: [17, 19, 27] },
    { tta: 'categories=sport_and_leisure', otdb: [21, 16, 28] },
    { tta: 'categories=food_and_drink', otdb: [] },
    { tta: 'tags=' + TECH_TAGS, otdb: [18, 30] },
    { tta: 'categories=society_and_culture,general_knowledge', otdb: [9, 26, 29, 15] },
  ];
  const DIFFS = ['easy', 'medium', 'hard', 'expert'];   // expert = "Very hard": built-in bank only, kept to a small share

  // Player levels: difficulty mix + content rules
  const LEVELS = {
    kids1: { label: 'Kids (ages 6–9)',   mix: { easy: 1 },                                        safe: true, kid: 1 },
    kids2: { label: 'Kids (ages 10–13)', mix: { easy: 0.8, medium: 0.2 },                         safe: true, kid: 0.6 },
    teen:  { label: 'Teen (14–17)',      mix: { easy: 0.35, medium: 0.55, hard: 0.1 },            safe: true },
    easy:  { label: 'Adult · Easy',      mix: { easy: 0.75, medium: 0.25 } },
    mixed: { label: 'Adult · Mixed',     mix: { easy: 0.2, medium: 0.6, hard: 0.15, expert: 0.05 } },
    hard:  { label: 'Adult · Hard',      mix: { medium: 0.3, hard: 0.55, expert: 0.15 } },
    elite: { label: 'Elite (hardest, no hints)', mix: { hard: 0.6, expert: 0.4 }, noChoices: true },
  };
  // Grown-up topics kept away from kids' and teens' questions
  const UNSAFE = /\b(beers?|wines?|winer(y|ies)|vodka|whiske?y|bourbon|rum|gin|tequila|cocktails?|alcohol\w*|liquors?|liqueurs?|brew(ery|ed|ing)?|sake|champagne|cognac|brandy|absinthe|martini|margarita|mojito|sangria|cider|lager|ales?|stout|drunk\w*|hangover|murder\w*|kill(s|ed|er|ers|ing)?|assassin\w*|genocide|holocaust|nazis?|terror\w*|bomb(s|ed|ing)?|execut(ed|ion)|suicide|sex\w*|porn\w*|drugs?|cocaine|heroin|marijuana|cannabis|meth|prostitut\w*|rape\w*|serial|slaves?|slavery|massacre|tortur\w*|guns?|rifles?|weapons?|cigarettes?|tobacco|smok(e|ing)|nude|naked|strip\w*|playboy|horror|gore|blood\w*|corpse|dead|deaths?|die[ds]?|casino|gambl\w*|lottery|divorce\w*|affair|mistress|erotic|lingerie|condom|abortion|pregnan\w*)\b/i;

  const hash = s => { s = String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- tiny IndexedDB store for the growing library ---------- */
  const DB = {
    open() {
      if (this.p) return this.p;
      this.p = new Promise((res, rej) => {
        if (!global.indexedDB) return rej(new Error('no idb'));
        const r = indexedDB.open('tictrivia', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('questions', { keyPath: 'h' });
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return this.p;
    },
    async all() { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('questions').objectStore('questions').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async put(items) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('questions', 'readwrite'); const st = tx.objectStore('questions'); items.forEach(i => st.put(i)); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
    async clear() { const db = await this.open(); return new Promise(res => { const tx = db.transaction('questions', 'readwrite'); tx.objectStore('questions').clear(); tx.oncomplete = res; }); },
  };

  class QuestionService {
    constructor() {
      this.online = true;
      this.buffers = {}; this.inflight = {};
      this.bank = {};               // "cat-d" -> [q]   (built-in + library)
      this.known = new Set();       // hashes of every question in the bank
      this.otdbToken = null; this.otdbQueue = Promise.resolve();
      this.stats = { online: 0, offline: 0 };
      this.seen = new Set(lsGet('tictrivia.seen.v1', []));
      this.banned = lsGet('tictrivia.banned.v1', {});   // hash -> {q,a,cat}
      this.builtIn = 0; this.libraryCount = 0;
      for (const r of (global.OFFLINE_QUESTIONS || [])) {
        if (this.addToBank({ cat: r[0], d: DIFFS[r[1]], q: r[2], a: r[3], w: r[4] || [], kid: !!r[5], src: 'built-in' })) this.builtIn++;
      }
      this.ready = DB.all().then(items => {
        for (const it of items) if (this.addToBank({ ...it.q, src: 'my library' })) this.libraryCount++;
      }).catch(() => {});
    }
    addToBank(q) {
      const h = hash(q.q);
      if (this.known.has(h)) return false;
      this.known.add(h); q.h = h;
      (this.bank[q.cat + '-' + q.d] ||= []).push(q);
      return true;
    }
    learn(list) {   // save fresh internet questions into the local library
      const fresh = [];
      for (const q of list) {
        const item = { cat: q.cat, d: q.d, q: q.q, a: q.a, w: q.w, src: q.src };
        if (this.addToBank({ ...item })) { fresh.push({ h: hash(q.q), q: item }); this.libraryCount++; }
      }
      if (fresh.length) DB.put(fresh).catch(() => {});
    }
    saveSeen() { lsSet('tictrivia.seen.v1', [...this.seen].slice(-30000)); }
    resetSeen() { this.seen = new Set(); this.saveSeen(); }
    ban(q) { const h = hash(q.q); this.banned[h] = { q: q.q, a: q.a, cat: q.cat }; lsSet('tictrivia.banned.v1', this.banned); }
    unban(h) { delete this.banned[h]; lsSet('tictrivia.banned.v1', this.banned); }
    isBanned(q) { return !!this.banned[q.h || hash(q.q)]; }
    level(key) { return LEVELS[key] || LEVELS.mixed; }
    pickDiff(levelKey) {
      const mix = this.level(levelKey).mix; let r = Math.random(), acc = 0;
      for (const d of DIFFS) { acc += mix[d] || 0; if (r < acc) return d; }
      return Object.keys(mix).pop();
    }
    ok(q, safe) { return !this.isBanned(q) && !this.seen.has(q.h || hash(q.q)) && (!safe || !UNSAFE.test(q.q + ' ' + q.a)); }

    prefetch(cats, diffs) { if (this.online) for (const c of cats) for (const d of diffs) this.refill(c, d); }
    refill(cat, d) {
      const key = cat + '-' + d;
      if (d === 'expert') return Promise.resolve();          // very hard questions come only from the rated built-in bank
      if (!this.online || this.inflight[key]) return this.inflight[key];
      const buf = this.buffers[key] ||= [];
      if (buf.length >= 8) return Promise.resolve();
      const p = this.fetchTTA(cat, d).catch(() => []).then(list => list.length || d === 'hard' ? list : this.fetchOTDB(cat, d).catch(() => []))
        .then(list => {
          if (!list.length) { this.failures = (this.failures || 0) + 1; if (this.failures >= 3) this.online = false; }   // no internet: quietly use the built-in bank
          else this.failures = 0;
          list = list.filter(q => q.q && q.a);
          this.learn(list);
          for (const q of list) { q.h = hash(q.q); if (!this.seen.has(q.h) && !buf.some(b => b.h === q.h)) buf.push(q); }
          shuffle(buf);
        }).finally(() => { delete this.inflight[key]; });
      this.inflight[key] = p;
      return p;
    }
    async fetchTTA(cat, d) {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
      try {
        const res = await fetch(`https://the-trivia-api.com/v2/questions?limit=20&${CAT_MAP[cat].tta}&difficulties=${d}`, { signal: ctl.signal });
        if (!res.ok) throw new Error('tta ' + res.status);
        const data = await res.json();
        return data.map(x => ({ cat, d, q: x.question.text, a: x.correctAnswer, w: x.incorrectAnswers || [], src: 'The Trivia API' }));
      } finally { clearTimeout(t); }
    }
    fetchOTDB(cat, d) {
      const run = async () => {   // Open Trivia DB allows ~1 request / 5 s, so requests are serialized
        const ids = CAT_MAP[cat].otdb; if (!ids.length) return [];
        if (!this.otdbToken) this.otdbToken = (await (await fetch('https://opentdb.com/api_token.php?command=request')).json()).token;
        const id = ids[Math.floor(Math.random() * ids.length)];
        const data = await (await fetch(`https://opentdb.com/api.php?amount=10&category=${id}&difficulty=${d}&encode=url3986&token=${this.otdbToken}`)).json();
        if (data.response_code === 3 || data.response_code === 4) this.otdbToken = null;
        const dec = s => decodeURIComponent(s);
        await new Promise(r => setTimeout(r, 5200));
        return (data.results || []).map(x => ({ cat, d, q: dec(x.question), a: dec(x.correct_answer), w: x.incorrect_answers.map(dec), src: 'Open Trivia DB' }));
      };
      const p = this.otdbQueue.then(run, run); this.otdbQueue = p.catch(() => {}); return p;
    }
    takeOffline(cat, d, safe, preferKid) {
      const order = [d, ...DIFFS.filter(x => x !== d)];
      if (safe) order.sort((a, b) => DIFFS.indexOf(a) - DIFFS.indexOf(b) + (a === d ? -10 : b === d ? 10 : 0));
      for (const dd of order) {
        const list = (this.bank[cat + '-' + dd] || []).filter(q => !this.isBanned(q) && (!safe || !UNSAFE.test(q.q + ' ' + q.a)));
        if (!list.length) continue;
        let fresh = list.filter(q => !this.seen.has(q.h));
        if (!fresh.length) { list.forEach(q => this.seen.delete(q.h)); fresh = list; }
        if (preferKid) { const k = fresh.filter(q => q.kid); if (k.length) fresh = k; }
        return fresh[Math.floor(Math.random() * fresh.length)];
      }
      return null;
    }
    /** get(category, playerLevelKey, familySafeForEveryone) */
    async get(cat, levelKey, familySafe, forceDiff) {
      const L = this.level(levelKey);
      const safe = !!(L.safe || familySafe);
      const d = forceDiff || this.pickDiff(levelKey);
      const preferKid = L.kid && Math.random() < L.kid;
      let q = null;
      if (this.online && !preferKid && d !== 'expert') {
        const key = cat + '-' + d;
        let buf = this.buffers[key] || [];
        if (!buf.some(c => this.ok(c, safe))) { await Promise.race([this.refill(cat, d), new Promise(r => setTimeout(r, 3500))]); buf = this.buffers[key] || []; }
        const i = buf.findIndex(c => this.ok(c, safe));
        if (i >= 0) q = buf.splice(i, 1)[0];
        this.refill(cat, d);
      }
      if (q) this.stats.online++;
      else { q = this.takeOffline(cat, d, safe, preferKid); if (q) this.stats.offline++; }
      if (!q) q = { cat, d, q: 'No questions available for this category.', a: 'skip', w: [], src: 'none', h: 'none' };
      this.seen.add(q.h || hash(q.q)); this.saveSeen();
      return q;
    }
    /* ---------- library file export / import ---------- */
    async exportLibrary(includeBuiltIn) {
      const rows = [];
      for (const k in this.bank) for (const q of this.bank[k]) {
        if (!includeBuiltIn && q.src === 'built-in') continue;
        if (this.isBanned(q)) continue;
        rows.push([q.cat, DIFFS.indexOf(q.d), q.q, q.a, q.w, q.kid ? 1 : 0]);
      }
      return { format: 'triviahound-questions', version: 1, exported: new Date().toISOString(), count: rows.length, questions: rows };
    }
    async importLibrary(obj) {
      const rows = Array.isArray(obj) ? obj : obj.questions;
      if (!Array.isArray(rows)) throw new Error('Not a question file');
      const list = [];
      for (const r of rows) {
        if (!Array.isArray(r) || r.length < 4 || !(r[0] >= 0 && r[0] < CAT_MAP.length)) continue;
        list.push({ cat: r[0], d: DIFFS[r[1]] || 'medium', q: String(r[2]), a: String(r[3]), w: (r[4] || []).map(String), src: 'imported' });
      }
      const before = this.libraryCount; this.learn(list); return this.libraryCount - before;
    }
    async clearLibrary() { await DB.clear().catch(() => {}); }
  }
  global.QuestionService = QuestionService;
  global.QUESTION_LEVELS = LEVELS;
})(window);

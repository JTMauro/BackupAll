// Prize counter: catalog, 3D prize models, and rendered thumbnails for the menu.
import * as THREE from 'three';

export const CATALOG = [
  { key: 'gum', name: 'Bubble Gum', price: 1, kind: 'Snack' },
  { key: 'lollipop', name: 'Swirl Lollipop', price: 1, kind: 'Snack' },
  { key: 'candybar', name: 'Valley Crunch Bar', price: 1, kind: 'Snack' },
  { key: 'chips', name: 'Bag of Chips', price: 2, kind: 'Snack' },
  { key: 'gummies', name: 'Gummy Worms', price: 2, kind: 'Snack' },
  { key: 'ball', name: 'Super Bouncy Ball', price: 2, kind: 'Toy' },
  { key: 'yoyo', name: 'Yo-Yo', price: 3, kind: 'Toy' },
  { key: 'slinky', name: 'Rainbow Slinky', price: 3, kind: 'Toy' },
  { key: 'shades', name: 'Neon Sunglasses', price: 4, kind: 'Toy' },
  { key: 'cube', name: 'Puzzle Cube', price: 4, kind: 'Toy' },
  { key: 'bear', name: 'Teddy Bear', price: 5, kind: 'Stuffed animal' },
  { key: 'car', name: 'Toy Race Car', price: 5, kind: 'Toy' },
  { key: 'dino', name: 'Plush Dinosaur', price: 6, kind: 'Stuffed animal' },
  { key: 'handheld', name: 'Handheld LCD Game', price: 7, kind: 'Toy' },
  { key: 'bunny', name: 'Plush Bunny', price: 8, kind: 'Stuffed animal' },
  { key: 'bigbear', name: 'Giant Teddy Bear', price: 10, kind: 'Stuffed animal' }
];

// ---------------------------------------------------------------- materials
function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
let _fur = null;
function furBump() {
  if (_fur) return _fur;
  _fur = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = Math.random() * 255 | 0; g.strokeStyle = `rgba(${v},${v},${v},.6)`; g.lineWidth = 1; g.beginPath(); const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.28; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); g.stroke(); }
  }, 3);
  _fur.colorSpace = THREE.NoColorSpace;
  return _fur;
}
const plush = color => new THREE.MeshStandardMaterial({ color, roughness: 1, bumpMap: furBump(), bumpScale: 2.2 });
const glossy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .18, clearcoat: 1, clearcoatRoughness: .1, ...extra });
const matte = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .6, ...extra });
const BLACK_EYE = () => glossy(0x0a0a0a);

function m(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz);
  o.castShadow = true; g.add(o); return o;
}
// a soft, slightly squashed shape for plush parts
const blob = (r, seg = 28) => new THREE.SphereGeometry(r, seg, Math.round(seg * .7));
const limb = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 16);
function labelTex(bg, fg, text, sub, w = 256, h = 128, font = 'bold 34px Arial') {
  return tex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, h * .1, w, h * .08);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h * .48);
    if (sub) { g.font = 'bold 16px Arial'; g.fillText(sub, w / 2, h * .8); }
  });
}

// ---------------------------------------------------------------- models (origin at the base, ~real size x1.4)
const BUILD = {
  gum() {
    const g = new THREE.Group();
    const lab = labelTex('#ff5fa8', '#fff', 'BUBBLE', 'GUM · 5 PIECES');
    m(g, new THREE.BoxGeometry(.1, .03, .05), [matte(0xff5fa8), matte(0xff5fa8), new THREE.MeshStandardMaterial({ map: lab, roughness: .4 }), matte(0xff5fa8), matte(0xff5fa8), matte(0xff5fa8)], 0, .015, 0);
    return g;
  },
  lollipop() {
    const g = new THREE.Group();
    const swirl = tex(256, 256, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2);
      const cols = ['#ff2d55', '#ffcc00', '#34c759', '#5ac8fa', '#af52de'];
      for (let i = 0; i < 160; i++) { c.strokeStyle = cols[i % cols.length]; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, i * .8, i * .3, i * .3 + 1.2); c.stroke(); }
    });
    const pop = m(g, new THREE.CylinderGeometry(.055, .055, .022, 40), [glossy(0xff6aa0), new THREE.MeshPhysicalMaterial({ map: swirl, roughness: .15, clearcoat: 1 }), new THREE.MeshPhysicalMaterial({ map: swirl, roughness: .15, clearcoat: 1 })], 0, .17, 0, Math.PI / 2);
    m(g, new THREE.CylinderGeometry(.005, .005, .13, 10), matte(0xf4f1ea), 0, .065, 0);
    const base = m(g, new THREE.CylinderGeometry(.03, .035, .012, 20), matte(0x333333), 0, .006, 0);
    return g;
  },
  candybar() {
    const g = new THREE.Group();
    const lab = labelTex('#5b2a86', '#ffd24a', 'VALLEY CRUNCH', 'MILK CHOCOLATE', 256, 96, 'bold 26px Arial');
    const wrap = glossy(0x5b2a86);
    m(g, new THREE.BoxGeometry(.17, .02, .055), [wrap, wrap, new THREE.MeshPhysicalMaterial({ map: lab, roughness: .25, clearcoat: .8 }), wrap, wrap, wrap], 0, .012, 0);
    for (const s of [-1, 1]) m(g, new THREE.BoxGeometry(.02, .006, .058), glossy(0xc9ccd1, { metalness: .6 }), s * .095, .012, 0);
    return g;
  },
  chips() {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(.13, .19, .05, 10, 12, 4), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / .065, y = p.getY(i) / .095, z = p.getZ(i); p.setZ(i, z * (1.6 - .9 * y * y) * (1 - .25 * x * x)); }
    geo.computeVertexNormals();
    const lab = tex(256, 384, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffcc00'); gr.addColorStop(1, '#ff7a00'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d81b1b'; c.beginPath(); c.ellipse(w / 2, h * .38, 100, 60, -.15, 0, 6.28); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 50px Arial'; c.textAlign = 'center'; c.fillText('CRUNCHOS', w / 2, h * .42);
      c.fillStyle = '#f6c45a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(60 + k * 30, h * .72 + (k % 2) * 20, 26, 18, k, 0, 6.28); c.fill(); }
      c.fillStyle = '#7a3a00'; c.font = 'bold 22px Arial'; c.fillText('ORIGINAL', w / 2, h * .92);
    });
    const foil = new THREE.MeshPhysicalMaterial({ map: lab, roughness: .3, metalness: .25, clearcoat: .6 });
    m(g, geo, foil, 0, .095, 0);
    return g;
  },
  gummies() {
    const g = new THREE.Group();
    m(g, new THREE.BoxGeometry(.12, .16, .04), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .25, roughness: .05, clearcoat: 1, depthWrite: false }), 0, .08, 0);
    const head = labelTex('#1aa34a', '#fff', 'GUMMY', 'WORMS', 256, 96);
    m(g, new THREE.BoxGeometry(.122, .035, .042), [matte(0x1aa34a), matte(0x1aa34a), matte(0x1aa34a), matte(0x1aa34a), new THREE.MeshStandardMaterial({ map: head }), matte(0x1aa34a)], 0, .165, 0);
    const cols = [0xff3b30, 0xffcc00, 0x34c759, 0xff9500, 0xaf52de];
    for (let i = 0; i < 7; i++) {
      const pts = []; for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(-.045 + k * .018, .025 + i * .018 + Math.sin(k * 1.4 + i) * .01, (Math.random() - .5) * .02));
      m(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .0055, 8), glossy(cols[i % 5], { transmission: 0 }), 0, 0, 0);
    }
    return g;
  },
  ball() {
    const g = new THREE.Group();
    const t = tex(256, 128, (c, w, h) => { const cols = ['#ff2d55', '#ffcc00', '#34c759', '#5ac8fa']; for (let i = 0; i < 8; i++) { c.fillStyle = cols[i % 4]; c.fillRect(0, i * h / 8, w, h / 8); } c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, Math.random() * h, 3, 3); });
    m(g, new THREE.SphereGeometry(.04, 32, 24), new THREE.MeshPhysicalMaterial({ map: t, roughness: .1, clearcoat: 1 }), 0, .04, 0, .4, 0, .3);
    return g;
  },
  yoyo() {
    const g = new THREE.Group(), red = glossy(0xe0162b);
    for (const s of [-1, 1]) { m(g, new THREE.CylinderGeometry(.045, .04, .02, 40), red, s * .016, .045, 0, 0, 0, Math.PI / 2); m(g, new THREE.CylinderGeometry(.03, .03, .002, 32), glossy(0xffffff), s * .027, .045, 0, 0, 0, Math.PI / 2); }
    m(g, new THREE.CylinderGeometry(.006, .006, .014, 12), matte(0xcccccc), 0, .045, 0, 0, 0, Math.PI / 2);
    const str = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .045, .006), new THREE.Vector3(.02, .02, .03), new THREE.Vector3(.05, .004, .04), new THREE.Vector3(.09, .003, .02)]);
    m(g, new THREE.TubeGeometry(str, 20, .0012, 5), matte(0xf2f2f2));
    return g;
  },
  slinky() {
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 600; i++) { const a = i / 600 * Math.PI * 2 * 40; pts.push(new THREE.Vector3(Math.cos(a) * .04, i / 600 * .07 + .004, Math.sin(a) * .04)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1600, .0028, 6);
    const cols = []; const c = new THREE.Color();
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { c.setHSL((pos.getY(i) / .075) * .9, .9, .55); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    m(g, geo, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .3, roughness: .35 }));
    return g;
  },
  shades() {
    const g = new THREE.Group(), frame = glossy(0xff2bd6), lens = new THREE.MeshPhysicalMaterial({ color: 0x101820, roughness: .05, metalness: .4, clearcoat: 1 });
    for (const s of [-1, 1]) {
      m(g, new THREE.BoxGeometry(.062, .036, .006), frame, s * .037, .03, 0);
      m(g, new THREE.BoxGeometry(.054, .028, .004), lens, s * .037, .03, .003);
      m(g, new THREE.BoxGeometry(.004, .008, .13), frame, s * .07, .042, -.065);
    }
    m(g, new THREE.BoxGeometry(.016, .006, .006), frame, 0, .04, 0);
    return g;
  },
  cube() {
    const g = new THREE.Group();
    const face = col => tex(128, 128, (c, w) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, w); c.fillStyle = col; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.roundRect(5 + i * 41, 5 + j * 41, 36, 36, 6); c.fill(); } });
    const mats = ['#ffffff', '#ffd500', '#c41e3a', '#ff5800', '#0051ba', '#009e60'].map(c => new THREE.MeshPhysicalMaterial({ map: face(c), roughness: .25, clearcoat: .6 }));
    m(g, new THREE.BoxGeometry(.075, .075, .075), mats, 0, .0375, 0, 0, .5, 0);
    return g;
  },
  bear(scale = 1, color = 0x9a6a3e) {
    const g = new THREE.Group(), fur = plush(color), light = plush(0xd8b48a), eye = BLACK_EYE();
    m(g, blob(.075), fur, 0, .085, 0, 0, 0, 0, 1, 1.05, .9);
    m(g, blob(.05), light, 0, .08, .045, 0, 0, 0, 1, 1.1, .5);
    m(g, blob(.06), fur, 0, .2, .008);
    for (const s of [-1, 1]) {
      m(g, blob(.024), fur, s * .045, .248, 0); m(g, blob(.014), light, s * .045, .248, .012, 0, 0, 0, 1, 1, .4);
      m(g, limb(.024, .05), fur, s * .075, .1, .01, .3, 0, s * .9);
      m(g, limb(.028, .05), fur, s * .04, .03, .05, Math.PI / 2 - .2, 0, 0);
      m(g, new THREE.SphereGeometry(.0085, 16, 12), eye, s * .021, .215, .053);
    }
    m(g, blob(.026), light, 0, .19, .052, 0, 0, 0, 1, .8, .7);
    m(g, new THREE.SphereGeometry(.009, 16, 12), eye, 0, .197, .072, 0, 0, 0, 1.3, .9, 1);
    m(g, new THREE.TorusGeometry(.03, .006, 8, 24), glossy(0xd81b60), 0, .155, .02, Math.PI / 2 - .2);
    g.scale.setScalar(scale);
    return g;
  },
  car() {
    const g = new THREE.Group(), paint = glossy(0x1e63ff, { metalness: .4 }), black = matte(0x111111), chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: .2 });
    m(g, new THREE.BoxGeometry(.06, .022, .14), paint, 0, .024, 0);
    m(g, new THREE.BoxGeometry(.05, .02, .06), new THREE.MeshPhysicalMaterial({ color: 0x223344, roughness: .05, clearcoat: 1 }), 0, .045, -.005);
    m(g, new THREE.BoxGeometry(.07, .004, .02), paint, 0, .05, -.065);
    m(g, new THREE.BoxGeometry(.008, .016, .012), black, 0, .042, -.065);
    for (const [x, z] of [[-.032, .045], [.032, .045], [-.034, -.045], [.034, -.045]]) {
      m(g, new THREE.CylinderGeometry(.016, .016, .014, 24), black, x, .016, z, 0, 0, Math.PI / 2);
      m(g, new THREE.CylinderGeometry(.008, .008, .015, 16), chrome, x, .016, z, 0, 0, Math.PI / 2);
    }
    m(g, new THREE.BoxGeometry(.04, .002, .002), matte(0xffffff), 0, .0352, .03);
    return g;
  },
  dino() {
    const g = new THREE.Group(), fur = plush(0x3fae4a), belly = plush(0xc9e88a), eye = BLACK_EYE();
    m(g, blob(.06), fur, 0, .07, 0, 0, 0, 0, .9, .85, 1.3);
    m(g, blob(.045), belly, 0, .06, .03, 0, 0, 0, .8, .8, 1.1);
    m(g, limb(.03, .07), fur, 0, .14, .065, -.6);
    m(g, blob(.042), fur, 0, .19, .1, 0, 0, 0, .9, .85, 1.25);
    m(g, new THREE.ConeGeometry(.04, .14, 20), fur, 0, .06, -.11, -Math.PI / 2 - .25);
    for (const s of [-1, 1]) {
      m(g, limb(.022, .03), fur, s * .04, .022, .03); m(g, limb(.022, .03), fur, s * .04, .022, -.04);
      m(g, new THREE.SphereGeometry(.008, 16, 12), eye, s * .022, .205, .13);
    }
    for (let i = 0; i < 6; i++) m(g, new THREE.ConeGeometry(.014, .03, 4), plush(0xffb000), 0, .13 - i * .012 + (i < 2 ? .05 : 0), .05 - i * .03, -.3);
    return g;
  },
  handheld() {
    const g = new THREE.Group();
    const face = tex(256, 384, (c, w, h) => {
      c.fillStyle = '#d9d4c8'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#4a4f57'; c.beginPath(); c.roundRect(24, 26, w - 48, 170, 12); c.fill();
      c.fillStyle = '#9bbc0f'; c.fillRect(46, 44, w - 92, 132);
      c.fillStyle = '#306230'; for (let i = 0; i < 6; i++) c.fillRect(60 + i * 24, 140 - (i % 3) * 18, 14, 14); c.fillRect(150, 70, 20, 20);
      c.fillStyle = '#222'; c.fillRect(46, 250, 70, 22); c.fillRect(70, 226, 22, 70);
      c.fillStyle = '#a3175a'; c.beginPath(); c.arc(180, 270, 18, 0, 6.28); c.fill(); c.beginPath(); c.arc(214, 244, 18, 0, 6.28); c.fill();
      c.fillStyle = '#333'; c.font = 'bold 18px Arial'; c.fillText('VALLEY BOY', 70, 222);
    });
    m(g, new THREE.BoxGeometry(.09, .14, .022), [matte(0xd9d4c8), matte(0xd9d4c8), matte(0xd9d4c8), matte(0xd9d4c8), new THREE.MeshPhysicalMaterial({ map: face, roughness: .45, clearcoat: .3 }), matte(0xd9d4c8)], 0, .07, 0, -.25);
    return g;
  },
  bunny() {
    const g = new THREE.Group(), fur = plush(0xf4f1ec), pink = plush(0xf7b6c8), eye = BLACK_EYE();
    m(g, blob(.07), fur, 0, .08, 0, 0, 0, 0, 1, 1.05, .9);
    m(g, blob(.055), fur, 0, .19, .01);
    for (const s of [-1, 1]) {
      const ear = m(g, limb(.018, .11), fur, s * .025, .3, -.005, 0, 0, s * .15); ear.scale.z = .55;
      m(g, limb(.01, .09), pink, s * .025, .3, .004, 0, 0, s * .15).scale.z = .3;
      m(g, limb(.022, .04), fur, s * .065, .09, .025, .4, 0, s * .6);
      m(g, blob(.03), fur, s * .04, .025, .05, 0, 0, 0, .9, .7, 1.3);
      m(g, new THREE.SphereGeometry(.008, 16, 12), eye, s * .02, .205, .048);
    }
    m(g, new THREE.SphereGeometry(.009, 16, 12), glossy(0xf06292), 0, .188, .055);
    m(g, blob(.022), fur, 0, .05, -.07);
    m(g, new THREE.TorusGeometry(.028, .006, 8, 24), glossy(0x5ac8fa), 0, .145, .015, Math.PI / 2 - .2);
    g.scale.setScalar(1.2);
    return g;
  },
  bigbear() { return BUILD.bear(2.1, 0xb07c45); }
};

export function buildPrize(key) {
  const g = BUILD[key](); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Render a thumbnail of every prize with a small throwaway renderer (copied onto plain 2D canvases).
export function renderThumbs(size = 160) {
  const out = {};
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(size, size); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x404060, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1, 2, 2); sc.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 1.2); rim.position.set(-2, 1, -1); sc.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, .01, 10);
  for (const item of CATALOG) {
    const g = buildPrize(item.key); sc.add(g);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const d = Math.max(s.x, s.y, s.z) * 2.3;
    cam.position.set(c.x + d * .55, c.y + d * .35, c.z + d * .8); cam.lookAt(c);
    r.render(sc, cam);
    const cv = document.createElement('canvas'); cv.width = cv.height = size; cv.getContext('2d').drawImage(r.domElement, 0, 0);
    out[item.key] = cv;
    sc.remove(g);
  }
  r.dispose(); r.forceContextLoss && r.forceContextLoss();
  return out;
}

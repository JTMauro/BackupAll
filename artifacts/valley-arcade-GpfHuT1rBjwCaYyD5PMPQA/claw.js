// Claw machine ("Valley Grabber") in the middle of the hall: 50¢ a try, prizes go to the My Prizes shelf.
import * as THREE from 'three';

const AREA = .36;            // half-size of the prize floor (x/z, local)
const FLOOR = .95;           // height of the felt floor inside the glass
const TOP = 1.86;            // claw carriage height
const CHUTE = new THREE.Vector2(.27, .27); // chute centre (front-right corner)
const PRIZE_KEYS = ['bear', 'bunny', 'dino', 'bear', 'ball', 'cube', 'bunny', 'gum', 'dino', 'ball', 'bear', 'lollipop', 'cube', 'bunny', 'ball', 'bear', 'gum', 'dino', 'cube', 'lollipop', 'ball', 'bear', 'bunny', 'cube', 'ball', 'gum', 'bear', 'lollipop'];
const FULL = 28;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createClaw(ctx) {
  const { scene, buildPrize, audio } = ctx;
  const root = new THREE.Group(); root.position.copy(ctx.position); scene.add(root);
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dce1, metalness: 1, roughness: .2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .5, metalness: .3 });
  const add = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // ---- cabinet base with side art
  const side = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff3d8b'); gr.addColorStop(1, '#8a1450'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 0, 6.28); g.fill(); }
    g.fillStyle = '#ffe14a'; g.font = 'bold 74px "Bungee", Impact, sans-serif'; g.textAlign = 'center'; g.fillText('VALLEY', w / 2, h * .42);
    g.fillStyle = '#fff'; g.fillText('GRABBER', w / 2, h * .6);
    g.font = '28px "Press Start 2P", monospace'; g.fillStyle = '#ffe14a'; g.fillText('50¢ A TRY', w / 2, h * .82);
  });
  const sideMat = new THREE.MeshStandardMaterial({ map: side, roughness: .4 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xd8246f, roughness: .4 });
  add(new THREE.BoxGeometry(1.0, FLOOR, 1.0), [sideMat, sideMat, pink, pink, sideMat, sideMat], 0, FLOOR / 2, 0);
  // control shelf, joystick, big button, coin plate
  const shelf = add(new THREE.BoxGeometry(1.0, .06, .22), dark, 0, FLOOR - .03, .6);
  add(new THREE.CylinderGeometry(.03, .03, .006, 20), dark, -.18, FLOOR + .003, .6);
  add(new THREE.CylinderGeometry(.006, .006, .08, 10), dark, -.18, FLOOR + .04, .6);
  add(new THREE.SphereGeometry(.024, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xe01b2b, roughness: .15, clearcoat: 1 }), -.18, FLOOR + .085, .6);
  const btn = add(new THREE.CylinderGeometry(.045, .045, .03, 28), new THREE.MeshStandardMaterial({ color: 0x2b8cff, emissive: 0x0a3a90, roughness: .3 }), .14, FLOOR + .015, .6);
  add(new THREE.BoxGeometry(.14, .2, .01), chrome, .35, .62, .505);
  add(new THREE.BoxGeometry(.06, .09, .015), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: .6 }), .35, .65, .512);
  // prize door
  add(new THREE.BoxGeometry(.3, .26, .012), dark, .25, .28, .505);
  const flap = add(new THREE.BoxGeometry(.26, .2, .01), new THREE.MeshPhysicalMaterial({ color: 0x222833, roughness: .2, clearcoat: 1, transparent: true, opacity: .85 }), .25, .28, .513);
  const push = add(new THREE.PlaneGeometry(.16, .04), new THREE.MeshBasicMaterial({ map: canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#ffe14a'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('PUSH', w / 2, 24); }) }), .25, .43, .52);

  // ---- glass case on a chrome frame, felt floor
  for (const [x, z] of [[-.49, -.49], [.49, -.49], [-.49, .49], [.49, .49]]) add(new THREE.BoxGeometry(.03, 1.0, .03), chrome, x, FLOOR + .5, z);
  const glass = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: .045, roughness: .05, metalness: 0, envMapIntensity: .25, depthWrite: false });
  for (const [w, x, z, ry] of [[.96, 0, .49, 0], [.96, 0, -.49, 0], [.96, .49, 0, Math.PI / 2], [.96, -.49, 0, Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.0), glass); p.position.set(x, FLOOR + .5, z); p.rotation.y = ry; root.add(p);
  }
  add(new THREE.BoxGeometry(.96, .01, .96), new THREE.MeshStandardMaterial({ color: 0x3b1e6e, roughness: .95 }), 0, FLOOR + .005, 0);
  // chute: clear acrylic walls around the corner hole
  const acrylic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .25, roughness: .05, clearcoat: 1, depthWrite: false });
  add(new THREE.BoxGeometry(.2, .2, .006), acrylic, CHUTE.x, FLOOR + .1, CHUTE.y - .1);
  add(new THREE.BoxGeometry(.006, .2, .2), acrylic, CHUTE.x - .1, FLOOR + .1, CHUTE.y);
  add(new THREE.BoxGeometry(.19, .004, .19), new THREE.MeshBasicMaterial({ color: 0x050505 }), CHUTE.x, FLOOR + .012, CHUTE.y);

  // ---- top box with a lit marquee
  add(new THREE.BoxGeometry(1.02, .3, 1.02), pink, 0, FLOOR + 1.15, 0);
  const mq = canvasTex(512, 150, (g, w, h) => {
    g.fillStyle = '#12061f'; g.fillRect(0, 0, w, h);
    g.shadowColor = '#ff3be0'; g.shadowBlur = 24; g.fillStyle = '#fff'; g.font = 'bold 66px "Bungee", Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CLAW CRANE', w / 2, h * .46);
    g.shadowBlur = 0; g.fillStyle = '#ffe14a'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(18 + i * 31.7, 10, 5, 0, 6.28); g.fill(); g.beginPath(); g.arc(18 + i * 31.7, h - 10, 5, 0, 6.28); g.fill(); }
  });
  const mqMat = new THREE.MeshBasicMaterial({ map: mq, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) });
  for (const [x, z, ry] of [[0, .515, 0], [0, -.515, Math.PI], [.515, 0, Math.PI / 2], [-.515, 0, -Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.96, .26), mqMat); p.position.set(x, FLOOR + 1.15, z); p.rotation.y = ry; root.add(p); }
  const inner = new THREE.PointLight(0xfff0e0, .45, 1.6, 1.5); inner.position.set(0, FLOOR + .9, 0); root.add(inner);

  // ---- gantry, carriage, cable and the three-prong claw
  for (const z of [-.42, .42]) add(new THREE.BoxGeometry(.9, .025, .025), chrome, 0, TOP + .04, z);
  const bridge = add(new THREE.BoxGeometry(.025, .025, .9), chrome, 0, TOP + .02, 0);
  const carriage = add(new THREE.BoxGeometry(.07, .05, .07), dark, 0, TOP, 0);
  const cable = add(new THREE.CylinderGeometry(.003, .003, 1, 6), dark, 0, TOP, 0);
  const claw = new THREE.Group(); claw.scale.setScalar(1.7); root.add(claw);
  add(new THREE.CylinderGeometry(.035, .03, .05, 20), dark, 0, 0, 0, claw);
  const prongs = [];
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2, pivot = new THREE.Group(); pivot.position.set(Math.cos(a) * .028, -.02, Math.sin(a) * .028); pivot.rotation.y = -a; claw.add(pivot);
    const upper = add(new THREE.BoxGeometry(.014, .08, .018), chrome, 0, -.04, 0, pivot);
    const knee = new THREE.Group(); knee.position.set(0, -.08, 0); pivot.add(knee);
    add(new THREE.BoxGeometry(.014, .07, .018), chrome, 0, -.035, 0, knee).rotation.z = .5;
    prongs.push({ pivot, knee });
  }
  function setOpen(k) { for (const p of prongs) { p.pivot.rotation.z = -.15 - k * .55; p.knee.rotation.z = .2 + k * .3; } }
  setOpen(1);

  // ---- prize pile
  const pile = [];
  function placePrize(key) {
    const o = buildPrize(key); o.scale.multiplyScalar(.75);
    o.traverse(m => { if (m.isMesh) m.castShadow = false; });
    for (let k = 0; k < 40; k++) {
      const x = (Math.random() * 2 - 1) * (AREA - .04), z = (Math.random() * 2 - 1) * (AREA - .04);
      if (Math.hypot(x - CHUTE.x, z - CHUTE.y) < .21) continue;
      // a mound: prizes near the middle sit higher, and the pile rises as it fills
      const crowd = pile.filter(p => Math.hypot(p.obj.position.x - x, p.obj.position.z - z) < .12).length;
      const mound = (1 - Math.min(1, Math.hypot(x, z) / AREA)) * .08;
      o.position.set(x, FLOOR + .01 + mound + Math.min(crowd, 3) * .05, z); break;
    }
    o.rotation.set((Math.random() - .5) * .5, Math.random() * 6.28, (Math.random() - .5) * .5);
    root.add(o); pile.push({ key, obj: o });
  }
  PRIZE_KEYS.forEach(placePrize);

  // ---- play state
  const S = { active: false, phase: 'idle', t: 0, time: 0, x: -.2, z: -.1, y: TOP - .12, open: 1, held: null, paid: false };
  const keys = ctx.keys;
  function updateClawPose() {
    carriage.position.set(S.x, TOP, S.z); bridge.position.x = S.x;
    claw.position.set(S.x, S.y, S.z);
    const len = TOP - S.y - .02; cable.position.set(S.x, TOP - len / 2 - .01, S.z); cable.scale.y = Math.max(.01, len);
    setOpen(S.open);
    if (S.held) { S.held.obj.position.set(S.x, S.y - .26, S.z); }
  }
  updateClawPose();
  function hud() {
    const t = document.querySelector('#claw-status');
    if (!t) return;
    t.textContent = S.phase === 'idle' ? 'Insert two quarters to play (key 5).' :
      S.phase === 'move' ? `Steer with the arrows · Space to drop · ${Math.ceil(S.time)}` :
      S.phase === 'won' ? 'You won! It is on your prize shelf.' : 'Here goes…';
  }
  const R = {
    root, front: new THREE.Vector3(ctx.position.x, 0, ctx.position.z + 1.15),
    get active() { return S.active; },
    enter() { S.active = true; hud(); },
    leave() { if (S.phase === 'move') { S.phase = 'drop'; } S.active = false; },
    pay() {
      if (S.phase !== 'idle' && S.phase !== 'won' && S.phase !== 'lost') return;
      const ok = ctx.pay(50); if (ok !== true) { if (!ok) ctx.toast('A try is 50¢. You need more money.'); return; }
      S.phase = 'move'; S.time = 15; S.open = 1;
      audio.melody([[660, .06], [880, .06], [1320, .12]], { type: 'square', vol: .12 }); hud();
    },
    drop() { if (S.phase === 'move') { S.phase = 'drop'; audio.tone(220, .5, { type: 'sawtooth', vol: .06, slideTo: 110 }); hud(); } },
    update(dt) {
      S.t += dt;
      const sp = .32;
      if (S.phase === 'move') {
        S.time -= dt;
        if (S.active) {
          if (keys.has('ArrowLeft') || keys.has('KeyA')) S.x -= sp * dt;
          if (keys.has('ArrowRight') || keys.has('KeyD')) S.x += sp * dt;
          if (keys.has('ArrowUp') || keys.has('KeyW')) S.z -= sp * dt;
          if (keys.has('ArrowDown') || keys.has('KeyS')) S.z += sp * dt;
        }
        S.x = Math.max(-AREA, Math.min(AREA, S.x)); S.z = Math.max(-AREA, Math.min(AREA, S.z));
        if (S.time <= 0) R.drop();
        hud();
      } else if (S.phase === 'drop') {
        S.y -= .35 * dt;
        if (S.y <= FLOOR + .3) { S.y = FLOOR + .3; S.phase = 'close'; S.t = 0; audio.tone(140, .25, { type: 'square', vol: .08 }); }
      } else if (S.phase === 'close') {
        S.open = Math.max(.05, 1 - S.t * 2.2);
        if (S.t > .6) {
          // grab: the nearest prize under the claw, with real-machine odds
          let best = null, bd = 1;
          for (const p of pile) { const d = Math.hypot(p.obj.position.x - S.x, p.obj.position.z - S.z); if (d < bd) { bd = d; best = p; } }
          const chance = bd < .06 ? .55 : bd < .1 ? .35 : bd < .14 ? .12 : 0;
          if (best && Math.random() < chance) { S.held = best; pile.splice(pile.indexOf(best), 1); }
          S.phase = 'lift'; S.t = 0;
        }
      } else if (S.phase === 'lift') {
        S.y += .3 * dt;
        if (S.held && S.t > .4 && !S.slipChecked) { S.slipChecked = true; if (Math.random() < .2) { const p = S.held; S.held = null; pile.push(p); p.obj.position.y = FLOOR + .02; audio.tone(180, .2, { type: 'triangle', vol: .1, slideTo: 90 }); } }
        if (S.y >= TOP - .12) { S.y = TOP - .12; S.phase = 'home'; S.slipChecked = false; }
      } else if (S.phase === 'home') {
        const dx = CHUTE.x - S.x, dz = CHUTE.y - S.z, d = Math.hypot(dx, dz);
        if (d > .01) { S.x += dx / d * Math.min(d, sp * dt); S.z += dz / d * Math.min(d, sp * dt); }
        else { S.phase = 'release'; S.t = 0; }
      } else if (S.phase === 'release') {
        S.open = Math.min(1, S.t * 2.5);
        if (S.held && S.open > .5) {
          const p = S.held; S.held = null; S.falling = p; S.fallV = 0;
        }
        if (S.t > .6 && !S.falling) {
          S.phase = S.won ? 'won' : 'lost';
          if (!S.won) { ctx.toast('So close! Try again for 50¢.'); audio.tone(200, .3, { type: 'square', vol: .1, slideTo: 100 }); }
          S.won = false; hud();
          // keep the machine stocked
          while (pile.length < FULL) placePrize(PRIZE_KEYS[Math.random() * PRIZE_KEYS.length | 0]);
        }
      }
      if (S.falling) {
        S.fallV += 6 * dt; S.falling.obj.position.y -= S.fallV * dt;
        if (S.falling.obj.position.y < FLOOR - .1) {
          root.remove(S.falling.obj); ctx.onWin(S.falling.key); S.won = true; S.falling = null;
          audio.melody([[784, .08], [988, .08], [1175, .08], [1568, .25]], { type: 'square', vol: .14 });
        }
      }
      btn.material.emissiveIntensity = S.phase === 'move' ? 1 + Math.sin(S.t * 10) * .6 : .4;
      updateClawPose();
    },
    _state: S, _pile: pile,
    camera: { pos: new THREE.Vector3(ctx.position.x, 2.12, ctx.position.z + 1.05), look: new THREE.Vector3(ctx.position.x, 1.05, ctx.position.z - .05) }
  };
  return R;
}

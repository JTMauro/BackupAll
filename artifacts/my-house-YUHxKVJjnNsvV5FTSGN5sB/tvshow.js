// "Everybody Loves JT" -- the show on the living-room and bedroom TVs.
// An original sitcom: a 10-second title sequence over an original warm piano theme, then the swirling
// 3D Cydcor logo (the C from the Cydcor wallpaper, Left version: it turns to the left), then a short
// episode with a laugh track. Everything is drawn on one 2D canvas that the TVs and the full-screen view share.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 640, H = 360, RES = 1.5; // drawn in 640x360 units on a 960x540 canvas
const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100.06 103"><path d="M51.14,17.19s3.1.02,3.1,2.52c0,2.72-3.1,2.72-3.1,2.72-16.17-.37-30.34,14.89-28.63,30.97.75,16.11,17.65,29.27,32.89,26.3,13.5-2.62,26.63-13.09,27.48-28.43,1.12,15.75-11.53,31.54-28.28,33.76-18.62,2.45-36.92-13.25-37.38-32.03-1.57-18.75,15.11-36.26,33.92-35.81Z"/><path d="M77.23,53.75s-.21,2.43-2.49,2.43-2.61-2.43-2.61-2.43c.25-11.2-10.31-21.02-21.45-19.83-11.16.52-19.22,11.89-18.23,22.79.87,9.5,8.66,18.97,19.7,19.84-11.3,1.02-23.01-7.93-24.83-20.25-1.8-13.7,9.75-27.16,23.56-27.5,13.8-1.15,26.68,11.12,26.34,24.96Z"/><path d="M63.75,45.63s1.97,2.35.33,3.76c-1.63,1.42-3.42-.67-3.42-.67-4.43-4.63-12.67-4.33-16.7.65-4.3,4.72-3.22,13.83,1.19,17.97,4.02,3.77,7.03,4.52,10.29,4.77-4.14,1.17-8.94-.38-12.8-3.11-6.91-5.3-7.76-16.45-1.75-22.76,5.63-6.66,16.85-6.93,22.86-.61Z"/></svg>';

// timeline (seconds)
const T_LOGO = 10, T_EP = 26, LOOP = 60;
const BEAT = 60 / 88, BAR = BEAT * 4;
const SCENES = [
  { at: 26, end: 27.8, kind: 'card' },
  { at: 27.8, end: 36, kind: 'kitchen', lines: [[0.3, 'JT', 'Who made the coffee?'], [2.4, 'JT', 'Oh, right. Nobody. Again.'], [5.0, 'MARIA', 'Morning, JT! I brought donuts.'], [7.0, 'JT', 'Best. Neighbor. Ever.']] },
  { at: 36, end: 45, kind: 'fridge', lines: [[0.3, 'JT', 'Big pitch today. Practice time.'], [2.8, 'JT', 'Mr. Fridge, how do you feel about your current plan?'], [5.8, '', '*the fridge hums*'], [7.2, 'JT', '...He wants to think it over.']] },
  { at: 45, end: 56, kind: 'couch', lines: [[0.4, 'EVERYONE', 'SURPRISE!'], [2.6, 'JT', "It's not my birthday."], [4.8, 'DEV', 'We know. You closed the big deal!'], [7.6, 'MARIA', 'Besides... everybody loves JT.']] },
  { at: 56, end: 60, kind: 'end' }
];
// original lyric captions over the theme (bar numbers, 1-based)
const LYRICS = [[3, 5, 'Long day out on the road,'], [5, 7, 'every mile a little slow...'], [7, 9, "then the porch light's on and the door swings wide,"], [9, 11, 'and everybody loves JT.']];

const CAST = {
  JT: { skin: '#c68a5e', hair: '#1a110c', shirt: '#3d4450', pants: '#2f4f7f', curly: true },
  MARIA: { skin: '#e0b08a', hair: '#5a2a14', shirt: '#b8323a', pants: '#3a3a48', long: true },
  DEV: { skin: '#8d5a3b', hair: '#111', shirt: '#2f7a55', pants: '#5b4a36', glasses: true }
};

export function createTVShow() {
  const canvas = document.createElement('canvas'); canvas.width = W * RES; canvas.height = H * RES;
  const g = canvas.getContext('2d');
  let on = false, t = 0, t0 = 0, muted = false;

  // ------------------------------------------------------------ the 3D logo (its own small renderer)
  let L = null;
  function logoInit() {
    const c = document.createElement('canvas'); c.width = W * RES; c.height = H * RES;
    const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W * RES, H * RES, false);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(r), .03).texture;
    const cam = new THREE.PerspectiveCamera(18, W / H, 1, 4000);
    cam.position.set(0, 64, 400); cam.lookAt(0, -4, 0);
    const data = new SVGLoader().parse(LOGO_SVG);
    const shapes = data.paths.flatMap(p => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 10, curveSegments: 40, bevelEnabled: true, bevelThickness: 1.6, bevelSize: .6, bevelSegments: 6 });
    geo.center(); geo.rotateX(Math.PI); geo.computeVertexNormals();
    const face = new THREE.MeshPhysicalMaterial({ color: 0xa6dcff, metalness: .3, roughness: .22, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .8, emissive: 0x2a7fc9, emissiveIntensity: .28 });
    const side = new THREE.MeshPhysicalMaterial({ color: 0x4a9fe6, metalness: .4, roughness: .3, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .7 });
    const logo = new THREE.Mesh(geo, [face, side]); scene.add(logo);
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-90, 240, 200); scene.add(key);
    scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x101114, .35));
    const rim = new THREE.DirectionalLight(0xbfe5ff, 2); rim.position.set(-220, 60, -160); scene.add(rim);
    const back = new THREE.DirectionalLight(0xffffff, 1); back.position.set(220, -80, -140); scene.add(back);
    L = { c, r, scene, cam, logo };
  }
  function drawLogo(lt) {
    // gray/black backdrop with a soft glow, like the wallpaper
    const bg = g.createRadialGradient(W / 2, H * .45, 10, W / 2, H * .5, W * .7);
    bg.addColorStop(0, '#3a4048'); bg.addColorStop(.55, '#181b20'); bg.addColorStop(1, '#050608');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const a = i * 2.39996, x = (W / 2 + Math.cos(a * 3.1) * W * .48 + Math.sin(lt * .4 + i) * 12), y = (H / 2 + Math.sin(a * 1.7) * H * .46 + Math.cos(lt * .5 + i) * 10); g.fillStyle = 'rgba(200,215,230,.35)'; g.fillRect(x, y, 2, 2); }
    try {
      if (!L) logoInit();
      // the Left version: the front of the C moves right to left
      L.logo.rotation.y = -lt / 8 * Math.PI * 2;
      L.logo.position.y = Math.sin(lt / 8 * Math.PI * 4) * 2;
      L.r.render(L.scene, L.cam);
      g.drawImage(L.c, 0, 0, W, H);
    } catch (e) { flatLogo(lt); }
  }
  function flatLogo(lt) { // fallback if a second WebGL context isn't available
    g.save(); g.translate(W / 2, H / 2); g.scale(Math.cos(-lt / 8 * Math.PI * 2) * 2.2, 2.2); g.translate(-50, -51.5);
    g.fillStyle = '#a6dcff'; for (const d of LOGO_SVG.match(/d="[^"]+"/g)) g.fill(new Path2D(d.slice(3, -1)));
    g.restore();
  }

  // ------------------------------------------------------------ drawing helpers
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  function person(x, y, s, who, o = {}) {
    const c = CAST[who]; const tt = t;
    g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
    const step = o.walk ? Math.sin(tt * 9) * 6 : 0;
    if (o.sit) {
      g.fillStyle = c.pants; g.fillRect(-16, -62, 40, 16); g.fillRect(14, -62, 12, 56);
      g.fillStyle = '#e8e8e8'; g.fillRect(12, -8, 20, 8);
    } else {
      g.fillStyle = c.pants; g.fillRect(-14 + step * .3, -62, 12, 58); g.fillRect(2 - step * .3, -62, 12, 58);
      g.fillStyle = '#e8e8e8'; g.fillRect(-16 + step * .3, -8, 16, 8); g.fillRect(1 - step * .3, -8, 16, 8);
    }
    g.fillStyle = c.shirt; rr(-21, -122, 42, 64, 12); g.fill();
    // arms
    const arm = (side, ang) => { g.save(); g.translate(side * 19, -114); g.rotate(ang); g.fillStyle = c.shirt; rr(-6, 0, 12, 46, 6); g.fill(); g.fillStyle = c.skin; g.beginPath(); g.arc(0, 50, 7, 0, 7); g.fill(); g.restore(); };
    const wave = o.wave ? -2.6 + Math.sin(tt * 10) * .35 : (o.cheer ? -2.8 : .12);
    arm(-1, o.cheer ? 2.8 : .12); arm(1, o.wave || o.cheer ? wave : -.12);
    // head
    g.fillStyle = c.skin; g.fillRect(-6, -132, 12, 12);
    g.beginPath(); g.arc(0, -150, 22, 0, 7); g.fill();
    g.fillStyle = c.hair;
    if (c.curly) for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-18 + i * 4.5, -166 + Math.abs(i - 4) * 1.4, 8, 0, 7); g.fill(); }
    else if (c.long) { g.beginPath(); g.arc(0, -156, 24, Math.PI, 0); g.fill(); g.fillRect(-24, -158, 9, 40); g.fillRect(15, -158, 9, 40); }
    else { g.beginPath(); g.arc(0, -156, 22, Math.PI, 0); g.fill(); }
    // face
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(-7, -151, 2.6, 0, 7); g.arc(7, -151, 2.6, 0, 7); g.fill();
    if (c.glasses) { g.strokeStyle = '#222'; g.lineWidth = 2; g.strokeRect(-13, -156, 11, 9); g.strokeRect(2, -156, 11, 9); }
    const open = o.talk ? Math.max(0, Math.sin(tt * 18)) * 6 : 0;
    g.fillStyle = '#5a1e1e';
    if (open > .5) { g.beginPath(); g.ellipse(0, -139, 6, open, 0, 0, 7); g.fill(); }
    else { g.strokeStyle = '#5a1e1e'; g.lineWidth = 2.2; g.beginPath(); g.arc(0, -143, 7, .25, Math.PI - .25); g.stroke(); }
    g.restore();
  }
  function set(wall, floor) {
    g.fillStyle = wall; g.fillRect(0, 0, W, H * .72);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 2, H * .72);
    g.fillStyle = floor; g.fillRect(0, H * .72, W, H * .28);
    g.fillStyle = 'rgba(0,0,0,.15)'; for (let x = -40; x < W; x += 58) { g.beginPath(); g.moveTo(x, H * .72); g.lineTo(x - 60, H); g.lineTo(x - 56, H); g.lineTo(x + 4, H * .72); g.fill(); }
    g.fillStyle = '#f2e6d0'; g.fillRect(0, H * .72 - 8, W, 8);
  }
  function windowFrame(x, y, w, h, sky) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = '#f4ead8'; g.lineWidth = 8; g.strokeRect(x, y, w, h); g.lineWidth = 4; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  }
  function couch(x, y) {
    g.fillStyle = '#6d7a8c'; rr(x - 150, y - 100, 300, 60, 16); g.fill();
    g.fillStyle = '#5c687a'; rr(x - 160, y - 50, 320, 50, 12); g.fill(); rr(x - 175, y - 80, 34, 80, 12); g.fill(); rr(x + 141, y - 80, 34, 80, 12); g.fill();
    g.fillStyle = '#7d8a9c'; rr(x - 140, y - 64, 136, 22, 8); g.fill(); rr(x + 4, y - 64, 136, 22, 8); g.fill();
  }
  function fridge(x, y, hum) {
    const j = hum ? Math.sin(t * 60) * 1.2 : 0;
    g.fillStyle = '#cfd5da'; rr(x - 55 + j, y - 230, 110, 230, 10); g.fill();
    g.fillStyle = '#b5bcc2'; g.fillRect(x - 55 + j, y - 150, 110, 4);
    g.fillStyle = '#8a9298'; g.fillRect(x + 36 + j, y - 210, 6, 44); g.fillRect(x + 36 + j, y - 136, 6, 60);
    g.fillStyle = '#ffd24a'; g.fillRect(x - 30, y - 200, 22, 16); g.fillStyle = '#3cc3ff'; g.fillRect(x - 4, y - 190, 18, 18);
  }
  function caption(who, text) {
    if (!text) return;
    g.font = '600 19px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const s = who ? who + ': ' + text : text, w = Math.min(W - 30, g.measureText(s).width + 30);
    g.fillStyle = 'rgba(0,0,0,.68)'; rr(W / 2 - w / 2, H - 46, w, 32, 6); g.fill();
    g.fillStyle = who ? '#fff' : '#ffe6a6'; g.fillText(s, W / 2, H - 29);
  }
  function lyric(tt) {
    const bar = tt / BAR + 1; const l = LYRICS.find(([a, b]) => bar >= a && bar < b); if (!l) return;
    g.font = 'italic 600 19px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.5)'; const s = '\u266a ' + l[2] + ' \u266a', w = g.measureText(s).width + 28; rr(W / 2 - w / 2, H - 44, w, 30, 15); g.fill();
    g.fillStyle = '#fff3d6'; g.fillText(s, W / 2, H - 28);
  }
  function grade(warm) {
    g.fillStyle = `rgba(255,170,90,${warm})`; g.globalCompositeOperation = 'soft-light'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .65); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  function fadeFrom(a) { if (a < 1) { g.fillStyle = `rgba(0,0,0,${1 - a})`; g.fillRect(0, 0, W, H); } }

  // ------------------------------------------------------------ the frames
  function titleSeq(tt) {
    if (tt < 3.4) {
      // dusk, the house, JT walking home with his bag
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#2d3a6b'); sky.addColorStop(.55, '#d9805a'); sky.addColorStop(1, '#f2c27a');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(520, 110, 26, 0, 7); g.fill();
      g.fillStyle = '#3c4a32'; g.fillRect(0, H * .78, W, H * .22);
      g.fillStyle = '#c9b48f'; g.fillRect(150, 120, 330, 160); g.fillStyle = '#4a3b33'; g.beginPath(); g.moveTo(130, 124); g.lineTo(315, 40); g.lineTo(500, 124); g.fill();
      g.fillStyle = '#6b1f22'; g.fillRect(295, 190, 44, 90);
      g.fillStyle = '#ffd88a'; g.fillRect(190, 160, 60, 50); g.fillRect(390, 160, 60, 50); g.fillRect(270, 182, 14, 14);
      const glow = g.createRadialGradient(277, 189, 2, 277, 189, 50); glow.addColorStop(0, 'rgba(255,220,140,.8)'); glow.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = glow; g.fillRect(220, 130, 120, 120);
      person(40 + tt * 70, 330, .78, 'JT', { walk: true });
      g.fillStyle = '#3b2a1c'; g.fillRect(40 + tt * 70 + 14, 300, 26, 20);
      fadeFrom(tt / .8);
    } else if (tt < 6.7) {
      set('#d8b98a', '#8a5a36');
      windowFrame(80, 60, 120, 110, ['#ff9f6a', '#ffd79a']);
      g.fillStyle = '#5a3a24'; g.fillRect(440, 70, 90, 70); g.fillStyle = '#e8c88a'; g.fillRect(448, 78, 74, 54);
      couch(330, 300);
      person(260, 278, .72, 'MARIA', { sit: true, wave: true, flip: true }); person(400, 278, .72, 'DEV', { sit: true, wave: true, flip: true });
      person(560 - (tt - 3.4) * 20, 330, .8, 'JT', { wave: true, flip: true, talk: true });
    } else {
      // the title card
      const bg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * .6); bg.addColorStop(0, '#7a4a22'); bg.addColorStop(1, '#2a1406');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#e8c27a'; g.lineWidth = 3; g.strokeRect(24, 22, W - 48, H - 44); g.lineWidth = 1; g.strokeRect(32, 30, W - 64, H - 60);
      const a = Math.min(1, (tt - 6.7) / .8);
      g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
      g.fillStyle = '#ffe2a8'; g.font = 'italic 700 50px Georgia, "Times New Roman", serif'; g.fillText('Everybody Loves', W / 2, 130);
      g.fillStyle = '#ffd25a'; g.font = '900 104px Georgia, "Times New Roman", serif'; g.fillText('JT', W / 2, 218);
      g.shadowBlur = 0; g.fillStyle = '#e8c27a'; g.font = '600 15px Georgia, serif'; g.fillText('S T A R R I N G   J T', W / 2, 286);
      g.globalAlpha = 1;
    }
    grade(.35);
    if (tt > 5.45) lyric(tt);
  }
  function episode(tt) {
    const sc = SCENES.find(s => tt >= s.at && tt < s.end) || SCENES[SCENES.length - 1];
    const st = tt - sc.at;
    const line = sc.lines ? sc.lines.filter(l => st >= l[0]).pop() : null;
    const talking = who => line && line[1] === who && st - line[0] < 2.0 || line && line[1] === 'EVERYONE' && st - line[0] < 1.2;
    if (sc.kind === 'card') {
      g.fillStyle = '#1b1208'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c27a'; g.font = 'italic 600 26px Georgia, serif';
      g.fillText('Tonight\'s episode:', W / 2, 150); g.fillStyle = '#fff'; g.font = '700 38px Georgia, serif'; g.fillText('"The Big Pitch"', W / 2, 200);
    } else if (sc.kind === 'kitchen') {
      set('#e9d9a8', '#c9c0b0');
      windowFrame(240, 60, 160, 110, ['#9fd3ff', '#e8f6ff']);
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 200, W, 60); g.fillStyle = '#3a3a3c'; g.fillRect(0, 196, W, 8);
      g.fillStyle = '#2d2d2d'; g.fillRect(470, 160, 40, 36); g.fillStyle = '#7a4a22'; g.fillRect(476, 176, 28, 18); // coffee maker
      g.fillStyle = '#6b1f22'; g.fillRect(40, 60, 90, 200); // back door
      person(380, 330, .9, 'JT', { talk: talking('JT'), flip: st > 4.6 });
      if (st > 4.6) { person(Math.min(150, 40 + (st - 4.6) * 160), 330, .85, 'MARIA', { talk: talking('MARIA'), walk: st < 5.3 }); g.fillStyle = '#f0c2d8'; g.fillRect(Math.min(150, 40 + (st - 4.6) * 160) + 18, 250, 40, 14); }
    } else if (sc.kind === 'fridge') {
      set('#e9d9a8', '#c9c0b0');
      fridge(430, 300, st > 5.8 && st < 7.2);
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 200, 330, 60); g.fillStyle = '#3a3a3c'; g.fillRect(0, 196, 330, 8);
      person(250, 330, .9, 'JT', { talk: talking('JT'), wave: st > 2.8 && st < 5.6 });
    } else if (sc.kind === 'couch') {
      set('#d8b98a', '#8a5a36');
      windowFrame(60, 50, 120, 110, ['#1a2850', '#3a4a7a']);
      couch(320, 310);
      person(320, 288, .74, 'JT', { sit: true, talk: talking('JT') });
      const pop = Math.min(1, st / .4);
      person(130, 330, .82 * pop + .01, 'MARIA', { cheer: st < 2.4, talk: talking('MARIA') });
      person(520, 330, .82 * pop + .01, 'DEV', { cheer: st < 2.4, talk: talking('DEV'), flip: true });
      if (st < 2.4) for (let i = 0; i < 40; i++) { const k = i * 37.7; g.fillStyle = `hsl(${(k * 9) % 360},80%,60%)`; g.fillRect((k * 13 + st * 40 * (i % 3 + 1)) % W, ((k * 7) % 200) + st * 90 % H, 6, 4); }
      if (st > 7.6) { g.fillStyle = 'rgba(255,120,150,.9)'; g.font = '30px serif'; g.textAlign = 'center'; for (let i = 0; i < 5; i++) g.fillText('\u2665', 200 + i * 60, 140 - ((st - 7.6) * 30 + i * 9) % 80); }
    } else {
      g.fillStyle = '#1b1208'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe2a8'; g.font = 'italic 700 34px Georgia, serif'; g.fillText('Everybody Loves', W / 2, 140);
      g.fillStyle = '#ffd25a'; g.font = '900 62px Georgia, serif'; g.fillText('JT', W / 2, 196);
      g.fillStyle = '#e8c27a'; g.font = '600 15px Georgia, serif'; g.fillText('Filmed before a live studio audience', W / 2, 252);
    }
    grade(.22);
    if (line) caption(line[1], line[2]);
    if (st < .35) fadeFrom(st / .35);
  }
  function draw() {
    g.setTransform(RES, 0, 0, RES, 0, 0);
    if (t < T_LOGO) titleSeq(t);
    else if (t < T_EP) {
      drawLogo(t - T_LOGO);
      fadeFrom((t - T_LOGO) / .6);
      lyric(t);
    } else episode(t);
    // scanlines for a little TV texture
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  }

  // ------------------------------------------------------------ sound: the theme and the studio audience
  let ctx = null, out = null, verb = null, bus = null, noise = null;
  function audioInit() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = muted ? 0 : .55; out.connect(ctx.destination);
    // a small room reverb from decaying noise
    verb = ctx.createConvolver(); const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = .28; verb.connect(vg); vg.connect(out);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  function newBus() {
    if (bus) { const b = bus; try { b.gain.setTargetAtTime(0, ctx.currentTime, .08); } catch (e) { } setTimeout(() => b.disconnect(), 600); }
    bus = ctx.createGain(); bus.connect(out); bus.connect(verb);
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(gn, t0, a, peak, d, rel) { gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(peak, t0 + a); gn.gain.setTargetAtTime(0.0001, t0 + a + d, rel); }
  function piano(t0, m, dur, vel) {
    const f = hz(m), gn = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600 + vel * 2400;
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(vel * .16, t0 + .006);
    gn.gain.setTargetAtTime(vel * .05, t0 + .01, .25); gn.gain.setTargetAtTime(0.0001, t0 + dur, .35);
    gn.connect(lp); lp.connect(bus);
    [[1, 1], [2, .4], [3, .16], [4, .08], [5, .035]].forEach(([n, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * n * (1 + .0003 * n * n);
      og.gain.value = a; o.connect(og); og.connect(gn); o.start(t0); o.stop(t0 + dur + 1.6);
    });
  }
  function lead(t0, m, dur) {
    const f = hz(m), gn = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = .8;
    const vib = ctx.createOscillator(), vd = ctx.createGain(); vib.frequency.value = 5.2; vd.gain.setValueAtTime(0, t0); vd.gain.linearRampToValueAtTime(f * .006, t0 + .4); vib.connect(vd);
    for (const [type, det, a] of [['triangle', 0, .7], ['sawtooth', 4, .18], ['sine', -3, .5]]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; vd.connect(o.frequency);
      og.gain.value = a; o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + dur + .6);
    }
    vib.start(t0); vib.stop(t0 + dur + .6);
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(.075, t0 + .07); gn.gain.setValueAtTime(.075, t0 + dur * .85); gn.gain.setTargetAtTime(0.0001, t0 + dur * .9, .12);
    lp.connect(gn); gn.connect(bus);
  }
  function bass(t0, m, dur) {
    const gn = ctx.createGain(); env(gn, t0, .01, .16, .05, .35); gn.gain.setTargetAtTime(0.0001, t0 + dur, .1);
    for (const [type, a] of [['sine', 1], ['triangle', .35]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = hz(m); og.gain.value = a; o.connect(og); og.connect(gn); o.start(t0); o.stop(t0 + dur + .5); }
    gn.connect(out);
  }
  function brush(t0, v = .05, len = .16) {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = .6;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(v, t0 + .03); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    s.connect(f); f.connect(gn); gn.connect(bus); s.start(t0, Math.random() * .5); s.stop(t0 + len + .02);
  }
  function pad(t0, notes, dur) {
    const gn = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(.022, t0 + .6); gn.gain.setTargetAtTime(0.0001, t0 + dur, .4);
    for (const m of notes) for (const det of [-7, 7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m + 12); o.detune.value = det; o.connect(lp); o.start(t0); o.stop(t0 + dur + 1.8); }
    lp.connect(gn); gn.connect(bus);
  }
  // an original theme in F: a mellow early-80s sitcom piano ballad
  const CH = {
    Fmaj7: [41, [53, 57, 60, 64]], Bbmaj7: [46, [53, 57, 58, 62]], C7sus: [36, [55, 58, 60, 65]], F: [41, [53, 57, 60, 65]],
    Am7: [45, [55, 57, 60, 64]], Dm7: [38, [53, 57, 60, 62]], C7: [36, [52, 55, 58, 60]], F7: [41, [53, 57, 60, 63]],
    Bb: [46, [53, 58, 62, 65]], Bbm6: [46, [55, 58, 61, 65]], FC: [36, [53, 57, 60, 65]], D7: [38, [54, 57, 60, 62]], Gm7: [43, [53, 55, 58, 62]]
  };
  const BARS = [[['Fmaj7', 4]], [['Bbmaj7', 2], ['C7sus', 2]], [['F', 4]], [['Am7', 2], ['Dm7', 2]], [['Bbmaj7', 2], ['C7', 2]], [['F', 2], ['F7', 2]],
    [['Bb', 2], ['Bbm6', 2]], [['FC', 2], ['D7', 2]], [['Gm7', 2], ['C7', 2]], [['F', 4]]];
  const MELODY = { // bar -> [beat, midi, beats]
    3: [[1, 69, 1], [2, 67, .5], [2.5, 65, .5], [3, 67, 1]],
    4: [[0, 69, 1.5], [1.5, 72, .5], [2, 74, 1], [3, 72, 1]],
    5: [[0, 70, 1], [1, 69, .5], [1.5, 67, .5], [2, 67, 1], [3, 65, .5], [3.5, 67, .5]],
    6: [[0, 69, 2.5], [3, 72, .5], [3.5, 74, .5]],
    7: [[0, 77, 1.5], [1.5, 74, .5], [2, 73, 1], [3, 70, 1]],
    8: [[0, 72, 1], [1, 69, 1], [2, 74, 1], [3, 72, 1]],
    9: [[0, 70, 1], [1, 69, .5], [1.5, 67, .5], [2, 67, 1], [3, 64, 1]],
    10: [[0, 65, 3.5]]
  };
  function theme(T) {
    BARS.forEach((bar, bi) => {
      const b0 = T + bi * BAR, n = bi + 1; let beat = 0;
      for (const [name, len] of bar) {
        const [root, v] = CH[name], t0 = b0 + beat * BEAT, last = n === 10;
        if (n <= 2) { // solo piano intro: gentle rolling arpeggios
          piano(t0, root + 12, len * BEAT, .55);
          const arp = [...v, v[2] + 12, v[1] + 12, v[3]];
          for (let k = 0; k < len * 2; k++) piano(t0 + (k + .0) * BEAT / 2 + .5 * BEAT / 2 * 0, arp[k % arp.length], BEAT * 1.2, .38 + (k === 0 ? .1 : 0));
        } else {
          piano(t0, root, len * BEAT, .5);
          v.forEach((m, i) => piano(t0 + i * .018, m, len * BEAT * (last ? 2 : .95), .36));
          for (let k = 1; k < len * 2; k += 2) piano(t0 + k * BEAT / 2, v[(k + 1) % 4] + 12, BEAT * .8, .2);
          bass(t0, root, len * BEAT * .95);
          if (len === 4 && !last) bass(t0 + 2 * BEAT, root + 7, 2 * BEAT * .9);
        }
        if (n >= 7) pad(t0, v, len * BEAT * (last ? 1.6 : 1));
        if (last) [77, 81, 84, 89].forEach((m, i) => piano(t0 + BEAT * 1.5 + i * .14, m, BEAT * 3, .22));
        beat += len;
      }
      if (n >= 3 && n < 10) for (let k = 0; k < 4; k++) brush(b0 + k * BEAT, k % 2 ? .05 : .025);
      for (const [bt, m, d] of MELODY[n] || []) lead(b0 + bt * BEAT, m, d * BEAT);
    });
  }
  // the studio audience
  function laugh(t0, dur, amt = 1) {
    const voices = Math.round(12 * amt);
    for (let v = 0; v < voices; v++) {
      const p = 170 + Math.random() * 260, form = 700 + Math.random() * 600;
      let tt = t0 + Math.random() * .3; const end = t0 + dur * (.55 + Math.random() * .45);
      while (tt < end) {
        const k = 1 - (tt - t0) / dur, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(p * (1 + Math.random() * .08), tt); o.frequency.linearRampToValueAtTime(p * .85, tt + .12);
        f.type = 'bandpass'; f.frequency.value = form; f.Q.value = 2.2;
        gn.gain.setValueAtTime(0.0001, tt); gn.gain.linearRampToValueAtTime(.05 * k * amt, tt + .025); gn.gain.exponentialRampToValueAtTime(0.0001, tt + .13);
        o.connect(f); f.connect(gn); gn.connect(bus); o.start(tt); o.stop(tt + .15);
        tt += .15 + Math.random() * .1;
      }
    }
  }
  function applause(t0, dur) {
    const n = Math.round(dur * 34);
    for (let i = 0; i < n; i++) {
      const tt = t0 + Math.random() * dur, k = 1 - Math.max(0, (tt - t0) / dur - .6) * 2.2;
      const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 2200; f.Q.value = 1.2;
      const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, tt); gn.gain.linearRampToValueAtTime(.09 * Math.max(.1, k), tt + .004); gn.gain.exponentialRampToValueAtTime(0.0001, tt + .05);
      s.connect(f); f.connect(gn); gn.connect(bus); s.start(tt, Math.random() * .9); s.stop(tt + .06);
    }
  }
  function aww(t0) {
    for (let v = 0; v < 10; v++) {
      const p = 180 + Math.random() * 200, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(p * 1.25, t0); o.frequency.linearRampToValueAtTime(p, t0 + 1.2);
      f.type = 'bandpass'; f.frequency.setValueAtTime(900, t0); f.frequency.linearRampToValueAtTime(650, t0 + 1.2); f.Q.value = 3;
      gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(.035, t0 + .25); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
      o.connect(f); f.connect(gn); gn.connect(bus); o.start(t0); o.stop(t0 + 1.6);
    }
  }
  function knock(t0) { for (const d of [0, .22]) { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t0 + d); o.frequency.exponentialRampToValueAtTime(70, t0 + d + .08); env(gn, t0 + d, .003, .3, .01, .03); o.connect(gn); gn.connect(bus); o.start(t0 + d); o.stop(t0 + d + .2); } }
  function hum(t0, dur) { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), gn = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 60; f.type = 'lowpass'; f.frequency.value = 300; gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(.07, t0 + .2); gn.gain.setValueAtTime(.07, t0 + dur - .2); gn.gain.linearRampToValueAtTime(0.0001, t0 + dur); o.connect(f); f.connect(gn); gn.connect(bus); o.start(t0); o.stop(t0 + dur + .05); }
  function scheduleLoop(from) {
    // from: show time to start at (0 at a fresh start)
    newBus();
    const T = ctx.currentTime + .08 - from;
    if (from < 1) theme(T);
    const at = s => T + s;
    const cues = [[31.8, () => laugh(at(31.8), 2.2)], [32.6, () => knock(at(32.6))], [35.2, () => laugh(at(35.2), 1.6, .8)],
      [41.6, () => hum(at(41.6), 1.4)], [43.4, () => laugh(at(43.4), 2.4, 1.2)],
      [45.3, () => applause(at(45.3), 2.2)], [48.6, () => laugh(at(48.6), 1.6, .8)], [52.8, () => aww(at(52.8))], [53.8, () => applause(at(53.8), 5.5)]];
    for (const [s, fn] of cues) if (s >= from) fn();
  }

  let acc = 0;
  return {
    canvas,
    get on() { return on; },
    get time() { return t; },
    start() {
      on = true; t = 0; t0 = performance.now();
      try { audioInit(); scheduleLoop(0); } catch (e) { console.warn('tv audio', e); }
      draw();
    },
    stop() {
      on = false;
      if (bus) { try { bus.gain.setTargetAtTime(0, ctx.currentTime, .05); } catch (e) { } const b = bus; bus = null; setTimeout(() => b.disconnect(), 400); }
    },
    seek(sec) { t0 = performance.now() - sec * 1000; },
    setMuted(m) { muted = m; if (out) out.gain.setTargetAtTime(m ? 0 : .55, ctx.currentTime, .05); },
    // advance (on the wall clock, so the picture stays in step with the music) and redraw; true when the frame changed
    update(dt) {
      if (!on) return false;
      t = (performance.now() - t0) / 1000;
      if (t >= LOOP) { t0 += LOOP * 1000; t -= LOOP; try { if (ctx) scheduleLoop(0); } catch (e) { } }
      acc += dt; if (acc < 1 / 30) return false; acc = 0;
      draw(); return true;
    }
  };
}

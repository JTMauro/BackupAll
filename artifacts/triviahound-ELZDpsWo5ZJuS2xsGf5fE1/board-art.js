/* board-art.js — terrain, districts and ambient life for the TriviaHound board (made by Builder).
 *
 *   BoardArt.draw(svg, defs, 'under')   after the wall + grass, BEFORE roads and spaces
 *   BoardArt.draw(svg, defs, 'over')    after the spaces (sky layer: birds, cloud shadows, lights)
 *
 * Board: viewBox -510 -510 1020 1020, ring road at ±420, streets at ±140, blocks inset 36 px.
 * Everything is masked to the 9 city blocks (minus the r=92 plaza and the diagonal alleys) and the
 * four tower tops, so no art can ever cover a road, a space or the plaza. Pure inline SVG + CSS,
 * seeded (identical every load), ~850 elements, CSS-only motion that stops for reduced motion.
 */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var CUTS = [-420, -140, 140, 420], INSET = 36;
  var CAT = { geo: "#2f80ed", ent: "#e8437e", his: "#e6a700", art: "#9b51e0", sci: "#27ae60", spo: "#f2711c", food: "#d63031", tech: "#12b5b0", life: "#a0673a" };

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function g(parent, attrs) { return el("g", attrs || {}, parent); }
  function pts(arr) { return arr.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function blocks() {
    var out = [];
    for (var j = 0; j < 3; j++) for (var i = 0; i < 3; i++)
      out.push({ i: i, j: j, x: CUTS[i] + INSET, y: CUTS[j] + INSET, w: CUTS[i + 1] - CUTS[i] - 2 * INSET, h: CUTS[j + 1] - CUTS[j] - 2 * INSET });
    return out;
  }

  // ------------------------------------------------------------------ shared defs, mask and CSS (once)
  var CSS = [
    ".ba-anim .ba-shimmer{animation:ba-shim 4s ease-in-out infinite}",
    "@keyframes ba-shim{0%,100%{opacity:.15;transform:translateX(0)}50%{opacity:.6;transform:translateX(6px)}}",
    ".ba-anim .ba-flag{transform-box:fill-box;transform-origin:0% 50%;animation:ba-wave 1.8s ease-in-out infinite}",
    "@keyframes ba-wave{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(8deg) scaleX(.9)}}",
    ".ba-anim .ba-twinkle{animation:ba-tw 2.2s ease-in-out infinite}",
    "@keyframes ba-tw{0%,100%{opacity:1}50%{opacity:.25}}",
    ".ba-anim .ba-blink{animation:ba-bl 1.6s steps(2,jump-none) infinite}",
    "@keyframes ba-bl{0%{opacity:1}100%{opacity:.15}}",
    ".ba-anim .ba-spin{transform-box:fill-box;transform-origin:50% 50%;animation:ba-spin 6s linear infinite}",
    "@keyframes ba-spin{to{transform:rotate(360deg)}}",
    ".ba-anim .ba-orbit{animation:ba-spin 26s linear infinite}",
    ".ba-anim .ba-orbit.rev{animation-direction:reverse;animation-duration:34s}",
    ".ba-anim .ba-flap{transform-box:fill-box;transform-origin:50% 100%;animation:ba-flap .5s ease-in-out infinite alternate}",
    "@keyframes ba-flap{from{transform:scaleY(1)}to{transform:scaleY(.35)}}",
    ".ba-anim .ba-drift{animation:ba-drift 46s linear infinite}",
    "@keyframes ba-drift{from{transform:translateX(-620px)}to{transform:translateX(620px)}}",
    ".ba-anim .ba-firefly{animation:ba-ff 3.4s ease-in-out infinite}",
    "@keyframes ba-ff{0%,100%{opacity:0;transform:translate(0,0)}40%{opacity:1}60%{opacity:.9;transform:translate(4px,-6px)}}",
    ".ba-anim .ba-sweep{transform-box:fill-box;transform-origin:50% 100%;animation:ba-sweep 5s ease-in-out infinite alternate}",
    "@keyframes ba-sweep{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}",
    ".ba-anim .ba-bob{animation:ba-bob 3s ease-in-out infinite alternate}",
    "@keyframes ba-bob{from{transform:translateY(0)}to{transform:translateY(3px)}}",
    ".ba-anim .ba-run{animation:ba-run 7s ease-in-out infinite alternate}",
    "@keyframes ba-run{from{transform:translateX(-30px)}to{transform:translateX(30px)}}",
    ".ba-art{pointer-events:none}",
    "@media (prefers-reduced-motion: reduce){.ba-anim *{animation:none!important}}"
  ].join("\n");

  function setup(svg, defs) {
    // The game rebuilds the board SVG for every new game, so set up whenever this defs lacks the mask.
    if (defs.querySelector("#ba-mask")) return;
    if (!document.getElementById("ba-style")) { var st = document.createElement("style"); st.id = "ba-style"; st.textContent = CSS; document.head.appendChild(st); }
    // mask: white = may draw. 9 blocks + tower tops; black = plaza (+margin) and the diagonal alleys (+margin)
    var m = el("mask", { id: "ba-mask", maskUnits: "userSpaceOnUse", x: -510, y: -510, width: 1020, height: 1020 }, defs);
    blocks().forEach(function (b) { el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, fill: "#fff" }, m); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { el("circle", { cx: 492 * s[0], cy: 492 * s[1], r: 30, fill: "#fff" }, m); });
    el("circle", { cx: 0, cy: 0, r: 98, fill: "#000" }, m);
    [[-140, -140], [140, -140], [-140, 140], [140, 140]].forEach(function (p) { el("line", { x1: p[0], y1: p[1], x2: 0, y2: 0, stroke: "#000", "stroke-width": 62 }, m); });
    // gradients
    function lin(id, stops, x2, y2) { var lg = el("linearGradient", { id: id, x1: 0, y1: 0, x2: x2 == null ? 0 : x2, y2: y2 == null ? 1 : y2 }, defs); stops.forEach(function (s) { el("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] == null ? 1 : s[2] }, lg); }); }
    lin("ba-water", [[0, "#5fb8e8"], [1, "#1f6fae"]]);
    lin("ba-mtn", [[0, "#9aa3ab"], [0.6, "#6b7278"], [1, "#4d5a4f"]]);
    lin("ba-glass", [[0, "#7fe3ee"], [1, "#1d5f78"]], 1, 1);
    lin("ba-stand", [[0, "#c9ced6"], [1, "#7e8794"]]);
    lin("ba-meadow", [[0, "#3f7a46"], [1, "#2f5e3a"]]);
    var rg = el("radialGradient", { id: "ba-glow" }, defs); el("stop", { offset: 0, "stop-color": "#fff6c8", "stop-opacity": 0.95 }, rg); el("stop", { offset: 1, "stop-color": "#ffcf5a", "stop-opacity": 0 }, rg);
    var rg2 = el("radialGradient", { id: "ba-shade" }, defs); el("stop", { offset: 0, "stop-color": "#000", "stop-opacity": 0.22 }, rg2); el("stop", { offset: 1, "stop-color": "#000", "stop-opacity": 0 }, rg2);
    // patterns: crop rows, paving
    var pf = el("pattern", { id: "ba-rows", width: 10, height: 10, patternUnits: "userSpaceOnUse", patternTransform: "rotate(20)" }, defs);
    el("rect", { width: 10, height: 10, fill: "#7ea33a" }, pf); el("rect", { width: 10, height: 4, fill: "#93b84a" }, pf);
    var pf2 = el("pattern", { id: "ba-rows2", width: 9, height: 9, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-15)" }, defs);
    el("rect", { width: 9, height: 9, fill: "#c9a843" }, pf2); el("rect", { width: 9, height: 3, fill: "#dcbd5a" }, pf2);
    var pv = el("pattern", { id: "ba-pave", width: 14, height: 14, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: 14, height: 14, fill: "#8d8275" }, pv); el("rect", { x: 1, y: 1, width: 12, height: 5, rx: 2, fill: "#a2968a" }, pv); el("rect", { x: 1, y: 8, width: 5, height: 5, rx: 2, fill: "#988c80" }, pv); el("rect", { x: 8, y: 8, width: 5, height: 5, rx: 2, fill: "#a99d91" }, pv);
    var sh = el("filter", { id: "ba-drop", x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
    el("feDropShadow", { dx: 2, dy: 3, stdDeviation: 1.5, "flood-color": "#000", "flood-opacity": 0.35 }, sh);
  }

  // ------------------------------------------------------------------ little parts
  function tree(p, x, y, s, R, kind) {
    var gg = g(p);
    el("ellipse", { cx: x + 2, cy: y + 3 * s, rx: 7 * s, ry: 3 * s, fill: "#000", opacity: 0.18 }, gg);
    if (kind === "pine") {
      el("polygon", { points: pts([[x, y - 14 * s], [x - 7 * s, y + 2 * s], [x + 7 * s, y + 2 * s]]), fill: R() < 0.5 ? "#1f5a33" : "#24683a" }, gg);
      el("polygon", { points: pts([[x, y - 18 * s], [x - 5 * s, y - 6 * s], [x + 5 * s, y - 6 * s]]), fill: "#2c7a45" }, gg);
    } else {
      el("rect", { x: x - 1.2 * s, y: y - 2 * s, width: 2.4 * s, height: 5 * s, fill: "#6b4a2f" }, gg);
      var c = ["#2e7d3e", "#3a8d47", "#2a6e37", "#4b9a4f"][Math.floor(R() * 4)];
      el("circle", { cx: x, cy: y - 7 * s, r: 7 * s, fill: c }, gg);
      el("circle", { cx: x - 2.5 * s, cy: y - 9 * s, r: 3 * s, fill: "#fff", opacity: 0.12 }, gg);
    }
    return gg;
  }
  function house(p, x, y, w, h, roof, R) {
    var gg = g(p, { filter: "url(#ba-drop)" });
    el("rect", { x: x, y: y, width: w, height: h, fill: ["#f1e3c8", "#e9d6b6", "#f4ead8", "#dcc7a5"][Math.floor(R() * 4)], stroke: "#6d5a44", "stroke-width": 0.8 }, gg);
    el("polygon", { points: pts([[x - 2, y], [x + w / 2, y - h * 0.6], [x + w + 2, y]]), fill: roof, stroke: "#5a3d2b", "stroke-width": 0.8 }, gg);
    el("rect", { x: x + w / 2 - 2, y: y + h - 6, width: 4, height: 6, fill: "#5a3d2b" }, gg);
    var lit = R() < 0.5;
    el("rect", { x: x + 2.5, y: y + 3, width: 4, height: 4, fill: lit ? "#ffd86b" : "#8db7d6", "class": lit ? "ba-twinkle" : null, style: lit ? "animation-delay:" + (R() * 2).toFixed(2) + "s" : null }, gg);
    el("rect", { x: x + w - 6.5, y: y + 3, width: 4, height: 4, fill: "#8db7d6" }, gg);
    return gg;
  }
  function flag(p, x, y, color, h) {
    el("line", { x1: x, y1: y, x2: x, y2: y - (h || 22), stroke: "#4a3b2c", "stroke-width": 1.6 }, p);
    el("polygon", { points: pts([[x, y - (h || 22)], [x + 14, y - (h || 22) + 4], [x, y - (h || 22) + 9]]), fill: color, "class": "ba-flag" }, p);
  }
  function water(p, d, R, n) {
    el("path", { d: d, fill: "url(#ba-water)", stroke: "#cbe9f7", "stroke-width": 2 }, p);
    return p;
  }
  function shimmer(p, x0, y0, x1, y1, R, n) {
    for (var i = 0; i < n; i++) {
      var x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), w = 6 + R() * 10;
      el("line", { x1: x, y1: y, x2: x + w, y2: y, stroke: "#e8f7ff", "stroke-width": 1.4, "stroke-linecap": "round", "class": "ba-shimmer", style: "animation-delay:" + (R() * 4).toFixed(2) + "s" }, p);
    }
  }
  function ground(p, b, fill) { el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: fill }, p); }

  // ------------------------------------------------------------------ the eight districts (+ centre)
  // block indices: 0 TL, 1 TM, 2 TR, 3 ML, 4 centre, 5 MR, 6 BL, 7 BM, 8 BR
  var DISTRICTS = {
    0: function mountainsAndLake(p, b, R) {            // Geography: peaks, a river, a lake with a boat
      ground(p, b, "url(#ba-meadow)");
      var X = b.x, Y = b.y, W = b.w, H = b.h;
      [[0.08, 0.55, 0.32], [0.3, 0.6, 0.42], [0.58, 0.58, 0.34], [0.78, 0.62, 0.3]].forEach(function (m) {
        var cx = X + W * (m[0] + m[2] / 2), top = Y + H * 0.06 + R() * 14, base = Y + H * m[1];
        el("polygon", { points: pts([[X + W * m[0], base], [cx, top], [X + W * (m[0] + m[2]), base]]), fill: "url(#ba-mtn)", stroke: "#3e464b", "stroke-width": 1 }, p);
        el("polygon", { points: pts([[cx - 13, top + 18], [cx, top], [cx + 13, top + 18], [cx + 5, top + 14], [cx, top + 20], [cx - 6, top + 13]]), fill: "#f6f8fb" }, p);
        el("polygon", { points: pts([[cx, top], [X + W * (m[0] + m[2]), base], [cx + 4, base]]), fill: "#000", opacity: 0.14 }, p);
      });
      water(p, "M" + (X + W * 0.48) + "," + (Y + H * 0.5) + " C" + (X + W * 0.45) + "," + (Y + H * 0.62) + " " + (X + W * 0.6) + "," + (Y + H * 0.66) + " " + (X + W * 0.55) + "," + (Y + H * 0.72) +
        " L" + (X + W * 0.6) + "," + (Y + H * 0.73) + " C" + (X + W * 0.66) + "," + (Y + H * 0.66) + " " + (X + W * 0.52) + "," + (Y + H * 0.6) + " " + (X + W * 0.53) + "," + (Y + H * 0.5) + " Z", R);
      var lake = "M" + (X + W * 0.18) + "," + (Y + H * 0.78) + " C" + (X + W * 0.2) + "," + (Y + H * 0.66) + " " + (X + W * 0.75) + "," + (Y + H * 0.66) + " " + (X + W * 0.86) + "," + (Y + H * 0.8) +
        " C" + (X + W * 0.92) + "," + (Y + H * 0.95) + " " + (X + W * 0.25) + "," + (Y + H * 0.98) + " " + (X + W * 0.18) + "," + (Y + H * 0.78) + " Z";
      water(p, lake, R);
      shimmer(p, X + W * 0.25, Y + H * 0.74, X + W * 0.78, Y + H * 0.9, R, 9);
      var boat = g(g(p, { transform: "translate(" + (X + W * 0.56) + "," + (Y + H * 0.83) + ")" }), { "class": "ba-bob" });
      el("path", { d: "M-10,0 L10,0 L6,5 L-6,5 Z", fill: "#8a5a35" }, boat); el("line", { x1: 0, y1: 0, x2: 0, y2: -13, stroke: "#5a3d2b", "stroke-width": 1.2 }, boat);
      el("polygon", { points: "1,-13 9,-3 1,-3", fill: "#fff" }, boat);
      el("rect", { x: X + W * 0.5, y: Y + H * 0.71, width: 26, height: 5, rx: 2, fill: "#9b6b42", stroke: "#5a3d2b", "stroke-width": 0.8, transform: "rotate(-20 " + (X + W * 0.5) + " " + (Y + H * 0.71) + ")" }, p);   // footbridge
      for (var i = 0; i < 12; i++) tree(p, X + 8 + R() * (W - 16), Y + H * (0.52 + R() * 0.12), 0.7 + R() * 0.3, R, "pine");
      flag(p, X + W * 0.4, Y + H * 0.2, CAT.geo, 16);
    },
    1: function theatre(p, b, R) {                      // Entertainment + Arts: a theatre with a bulb marquee, a gallery lawn
      ground(p, b, "url(#ba-pave)");
      var X = b.x, Y = b.y, W = b.w, H = b.h, tx = X + W * 0.15, tw = W * 0.7, ty = Y + 18, th = H * 0.5;
      var t = g(p, { filter: "url(#ba-drop)" });
      el("rect", { x: tx, y: ty, width: tw, height: th, rx: 6, fill: "#5b2333", stroke: "#2b0f17", "stroke-width": 1.5 }, t);
      el("path", { d: "M" + (tx + 10) + "," + (ty + th) + " L" + (tx + 10) + "," + (ty + 28) + " Q" + (tx + tw / 2) + "," + (ty + 8) + " " + (tx + tw - 10) + "," + (ty + 28) + " L" + (tx + tw - 10) + "," + (ty + th) + " Z", fill: "#a8183a" }, t);   // curtains
      for (var k = 0; k < 7; k++) el("line", { x1: tx + 16 + k * (tw - 32) / 6, y1: ty + 26, x2: tx + 16 + k * (tw - 32) / 6, y2: ty + th, stroke: "#7c0f2a", "stroke-width": 1 }, t);
      el("rect", { x: tx + 12, y: ty + th - 22, width: tw - 24, height: 16, rx: 3, fill: "#f6d56a", stroke: "#7c5a00", "stroke-width": 1 }, t);
      el("text", { x: tx + tw / 2, y: ty + th - 10, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#5b2333", "font-family": "system-ui,sans-serif" }, t).textContent = "SHOWTIME";
      for (var i = 0; i < 22; i++) {                       // marquee bulbs around the facade
        var u = i / 22, bx = u < 0.5 ? tx + 4 + (tw - 8) * (u * 2) : tx + tw - 4 - (tw - 8) * ((u - 0.5) * 2), by = u < 0.5 ? ty + 4 : ty + th - 4;
        el("circle", { cx: bx, cy: by, r: 2.4, fill: i % 2 ? "#fff3b0" : "#ffd04a", "class": "ba-twinkle", style: "animation-delay:" + (i % 4 * 0.3).toFixed(1) + "s" }, p);
      }
      // gallery lawn with easels and a statue
      el("rect", { x: X + 10, y: Y + H * 0.68, width: W - 20, height: H * 0.28, rx: 8, fill: "#3a7a46" }, p);
      [[0.2, CAT.art], [0.42, CAT.ent], [0.64, "#2f80ed"]].forEach(function (e) {
        var ex = X + W * e[0], ey = Y + H * 0.76;
        el("line", { x1: ex, y1: ey + 18, x2: ex + 6, y2: ey, stroke: "#6b4a2f", "stroke-width": 1.5 }, p); el("line", { x1: ex + 12, y1: ey + 18, x2: ex + 6, y2: ey, stroke: "#6b4a2f", "stroke-width": 1.5 }, p);
        el("rect", { x: ex - 2, y: ey + 1, width: 16, height: 12, fill: "#fff", stroke: "#6b4a2f", "stroke-width": 0.8 }, p);
        el("circle", { cx: ex + 4, cy: ey + 7, r: 3, fill: e[1] }, p); el("rect", { x: ex + 7, y: ey + 5, width: 5, height: 5, fill: "#f2c94c" }, p);
      });
      var sx = X + W * 0.86, sy = Y + H * 0.86;
      el("rect", { x: sx - 8, y: sy, width: 16, height: 8, fill: "#c9c3b8" }, p); el("circle", { cx: sx, cy: sy - 9, r: 5, fill: "#d9d3c8" }, p); el("rect", { x: sx - 4, y: sy - 5, width: 8, height: 6, fill: "#d9d3c8" }, p);
      for (i = 0; i < 2; i++) {                           // spotlights sweeping
        var lx = tx + (i ? tw - 6 : 6), beam = g(p, { "class": "ba-sweep", style: "animation-delay:" + (i * 2.5) + "s" });
        el("polygon", { points: pts([[lx - 2, ty], [lx - 18, ty - 60], [lx + 18, ty - 60], [lx + 2, ty]]), fill: "#fff7c2", opacity: 0.18 }, beam);
      }
    },
    2: function museum(p, b, R) {                         // History: a columned museum, castle ruins, hedge maze
      ground(p, b, "#577a4a");
      var X = b.x, Y = b.y, W = b.w, H = b.h, mx = X + 18, my = Y + 30, mw = W * 0.62, mh = H * 0.36;
      var m = g(p, { filter: "url(#ba-drop)" });
      el("rect", { x: mx - 4, y: my + mh, width: mw + 8, height: 8, fill: "#cfc6b4" }, m);
      el("rect", { x: mx, y: my, width: mw, height: mh, fill: "#efe7d6", stroke: "#9e927c", "stroke-width": 1 }, m);
      el("polygon", { points: pts([[mx - 6, my], [mx + mw / 2, my - 22], [mx + mw + 6, my]]), fill: "#e2d8c3", stroke: "#9e927c", "stroke-width": 1 }, m);
      for (var c = 0; c < 6; c++) { var cx = mx + 8 + c * (mw - 16) / 5; el("rect", { x: cx - 3, y: my + 4, width: 6, height: mh - 6, fill: "#fbf6ec", stroke: "#b5aa95", "stroke-width": 0.6 }, m); }
      el("circle", { cx: mx + mw / 2, cy: my - 9, r: 4, fill: CAT.his }, m);
      // castle ruin with a banner
      var rx = X + W * 0.78, ry = Y + 40;
      el("rect", { x: rx - 14, y: ry, width: 28, height: 52, fill: "#9a9184", stroke: "#5d564c", "stroke-width": 1 }, p);
      for (var k = 0; k < 4; k++) el("rect", { x: rx - 14 + k * 8, y: ry - 6, width: 5, height: 7, fill: "#9a9184" }, p);
      el("rect", { x: rx - 4, y: ry + 30, width: 8, height: 22, rx: 4, fill: "#3b342c" }, p);
      flag(p, rx, ry - 6, CAT.his, 18);
      // hedge maze
      var hx = X + 22, hy = Y + H * 0.66, hw = W * 0.5, hh = H * 0.28;
      el("rect", { x: hx, y: hy, width: hw, height: hh, rx: 4, fill: "#8fbf6a" }, p);
      var maze = "M" + hx + "," + hy + " h" + hw + " v" + hh + " h" + (-hw) + " Z M" + (hx + 12) + "," + (hy + 12) + " h" + (hw - 24) + " v" + (hh - 24) + " h" + (-(hw - 40)) +
        " M" + (hx + 24) + "," + (hy + 24) + " v" + (hh - 36) + " M" + (hx + hw / 2) + "," + (hy + 12) + " v" + (hh / 2);
      el("path", { d: maze, fill: "none", stroke: "#2f6b34", "stroke-width": 5, "stroke-linejoin": "round" }, p);
      el("rect", { x: X + W * 0.72, y: Y + H * 0.62, width: 8, height: 30, fill: "#d8cdb4" }, p);                     // obelisk
      el("polygon", { points: pts([[X + W * 0.72, Y + H * 0.62], [X + W * 0.72 + 4, Y + H * 0.56], [X + W * 0.72 + 8, Y + H * 0.62]]), fill: "#e9c46a" }, p);
      for (var i = 0; i < 5; i++) tree(p, X + W * (0.66 + R() * 0.3), Y + H * (0.78 + R() * 0.16), 0.8, R);
    },
    3: function oldTown(p, b, R) {                         // Everyday Life: rooftops, a well, washing lines, gardens
      ground(p, b, "#4d7b49");
      var X = b.x, Y = b.y, W = b.w, H = b.h;
      el("path", { d: "M" + (X + 10) + "," + (Y + H / 2) + " H" + (X + W - 10) + " M" + (X + W / 2) + "," + (Y + 10) + " V" + (Y + H - 10), stroke: "#b7a487", "stroke-width": 9, "stroke-linecap": "round", fill: "none" }, p);
      var roofs = ["#b5462f", "#c4643b", "#8a3b2b", "#a0673a", "#6a4f8f"];
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
        var hx = X + 12 + c * (W - 24) / 4 + (c > 1 ? 10 : 0), hy = Y + 24 + r * (H - 30) / 4 + (r > 1 ? 10 : 0);
        if (Math.abs(hx + 12 - (X + W / 2)) < 16 || Math.abs(hy + 8 - (Y + H / 2)) < 16) continue;
        if (R() < 0.15) { tree(p, hx + 10, hy + 12, 0.9, R); continue; }
        house(p, hx, hy, 22, 16, roofs[Math.floor(R() * roofs.length)], R);
      }
      var wx = X + W / 2, wy = Y + H / 2;                  // well in the crossroads
      el("circle", { cx: wx, cy: wy, r: 9, fill: "#8d8275", stroke: "#5b5148", "stroke-width": 1.5 }, p); el("circle", { cx: wx, cy: wy, r: 5, fill: "#2b5d82" }, p);
      el("path", { d: "M" + (X + 30) + "," + (Y + H * 0.47) + " Q" + (X + 55) + "," + (Y + H * 0.5) + " " + (X + 80) + "," + (Y + H * 0.47), stroke: "#e8e0d0", fill: "none", "stroke-width": 0.8 }, p);
      ["#e8437e", "#2f80ed", "#f2c94c", "#ffffff"].forEach(function (col, i) { el("rect", { x: X + 36 + i * 11, y: Y + H * 0.48, width: 6, height: 7, fill: col, "class": "ba-flag", style: "animation-delay:" + i * 0.2 + "s" }, p); });
    },
    5: function forestAndObservatory(p, b, R) {           // Science & Nature: deep forest, a creek with a bridge, an observatory
      ground(p, b, "#2c5a35");
      var X = b.x, Y = b.y, W = b.w, H = b.h;
      var creek = "M" + X + "," + (Y + H * 0.62) + " C" + (X + W * 0.3) + "," + (Y + H * 0.5) + " " + (X + W * 0.6) + "," + (Y + H * 0.8) + " " + (X + W) + "," + (Y + H * 0.66) +
        " L" + (X + W) + "," + (Y + H * 0.74) + " C" + (X + W * 0.6) + "," + (Y + H * 0.88) + " " + (X + W * 0.3) + "," + (Y + H * 0.58) + " " + X + "," + (Y + H * 0.7) + " Z";
      water(p, creek, R);
      shimmer(p, X + 10, Y + H * 0.62, X + W - 20, Y + H * 0.74, R, 8);
      el("rect", { x: X + W * 0.46, y: Y + H * 0.6, width: 10, height: 30, rx: 2, fill: "#9b6b42", stroke: "#5a3d2b", "stroke-width": 1 }, p);   // bridge
      for (var k = 0; k < 4; k++) el("line", { x1: X + W * 0.46, y1: Y + H * 0.6 + 6 + k * 6, x2: X + W * 0.46 + 10, y2: Y + H * 0.6 + 6 + k * 6, stroke: "#5a3d2b", "stroke-width": 0.6 }, p);
      // observatory on a clearing
      var ox = X + W * 0.72, oy = Y + H * 0.28;
      el("circle", { cx: ox, cy: oy + 6, r: 26, fill: "#4f7d4c" }, p);
      el("rect", { x: ox - 16, y: oy, width: 32, height: 18, fill: "#e7e2d6", stroke: "#8a8478", "stroke-width": 1, filter: "url(#ba-drop)" }, p);
      el("path", { d: "M" + (ox - 18) + "," + oy + " A18,16 0 0 1 " + (ox + 18) + "," + oy + " Z", fill: "#cfd6df", stroke: "#7d8591", "stroke-width": 1 }, p);
      var scope = g(p, { "class": "ba-sweep" }); el("rect", { x: ox - 2, y: oy - 22, width: 4, height: 18, rx: 1.5, fill: "#3b4552" }, scope);
      // forest
      for (var i = 0; i < 46; i++) {
        var tx = X + 8 + R() * (W - 16), ty = Y + 10 + R() * (H - 20);
        if (Math.hypot(tx - ox, ty - oy) < 32 || (ty > Y + H * 0.55 && ty < Y + H * 0.82)) continue;
        tree(p, tx, ty, 0.7 + R() * 0.5, R, R() < 0.45 ? "pine" : null);
      }
      for (i = 0; i < 4; i++) { var dx = X + 20 + R() * (W - 40), dy = Y + H * 0.86 + R() * 10; el("circle", { cx: dx, cy: dy, r: 2.2, fill: ["#ff6b6b", "#ffd166", "#ffffff"][i % 3] }, p); }   // wildflowers
    },
    6: function stadium(p, b, R) {                         // Sports & Leisure: a stadium with a pitch and running players
      ground(p, b, "#3f6e40");
      var X = b.x, Y = b.y, W = b.w, H = b.h, cx = X + W / 2, cy = Y + H / 2;
      el("ellipse", { cx: cx, cy: cy, rx: W * 0.47, ry: H * 0.4, fill: "url(#ba-stand)", stroke: "#4f5663", "stroke-width": 2, filter: "url(#ba-drop)" }, p);
      for (var k = 0; k < 28; k++) {                       // crowd specks
        var a = k / 28 * Math.PI * 2, rr = 0.88 + (k % 2) * 0.05;
        el("circle", { cx: cx + Math.cos(a) * W * 0.47 * rr, cy: cy + Math.sin(a) * H * 0.4 * rr, r: 2.2, fill: [CAT.spo, "#fff", CAT.geo, "#ffd166"][k % 4], "class": k % 3 ? null : "ba-twinkle", style: "animation-delay:" + (k % 5 * 0.4) + "s" }, p);
      }
      el("ellipse", { cx: cx, cy: cy, rx: W * 0.38, ry: H * 0.31, fill: "#c0573b" }, p);                                  // running track
      el("rect", { x: cx - W * 0.29, y: cy - H * 0.2, width: W * 0.58, height: H * 0.4, rx: 4, fill: "#3c9a4a", stroke: "#fff", "stroke-width": 1.5 }, p);
      for (k = 0; k < 6; k++) el("rect", { x: cx - W * 0.29 + k * W * 0.58 / 6, y: cy - H * 0.2, width: W * 0.58 / 12, height: H * 0.4, fill: "#fff", opacity: 0.07 }, p);
      el("line", { x1: cx, y1: cy - H * 0.2, x2: cx, y2: cy + H * 0.2, stroke: "#fff", "stroke-width": 1.2 }, p);
      el("circle", { cx: cx, cy: cy, r: 12, fill: "none", stroke: "#fff", "stroke-width": 1.2 }, p);
      el("rect", { x: cx - W * 0.29, y: cy - 12, width: 14, height: 24, fill: "none", stroke: "#fff", "stroke-width": 1.2 }, p);
      el("rect", { x: cx + W * 0.29 - 14, y: cy - 12, width: 14, height: 24, fill: "none", stroke: "#fff", "stroke-width": 1.2 }, p);
      var team = g(p, { "class": "ba-run" });
      [[-30, -20, CAT.spo], [-10, 14, CAT.spo], [18, -8, CAT.geo], [36, 18, CAT.geo]].forEach(function (pl) { el("circle", { cx: cx + pl[0], cy: cy + pl[1], r: 3.4, fill: pl[2], stroke: "#fff", "stroke-width": 1 }, team); });
      el("circle", { cx: cx + 4, cy: cy + 2, r: 2.2, fill: "#fff", stroke: "#333", "stroke-width": 0.6, "class": "ba-run", style: "animation-duration:4s" }, p);
      el("rect", { x: cx - 24, y: Y + 4, width: 48, height: 14, rx: 2, fill: "#1b1f27", stroke: "#666", "stroke-width": 1 }, p);       // scoreboard
      el("text", { x: cx, y: Y + 14.5, "text-anchor": "middle", "font-size": 9, "font-family": "ui-monospace,monospace", fill: "#ffd166", "class": "ba-blink" }, p).textContent = "2 : 1";
      [[X + 10, Y + 22], [X + W - 10, Y + 22], [X + 10, Y + H - 4], [X + W - 10, Y + H - 4]].forEach(function (f) { flag(p, f[0], f[1], CAT.spo, 18); });
    },
    7: function farmMarket(p, b, R) {                      // Food & Drink: fields, a windmill and a market with striped awnings
      ground(p, b, "#4d7b40");
      var X = b.x, Y = b.y, W = b.w, H = b.h;
      el("rect", { x: X + 6, y: Y + 6, width: W * 0.48, height: H * 0.46, rx: 6, fill: "url(#ba-rows)" }, p);
      el("rect", { x: X + W * 0.52, y: Y + 6, width: W * 0.46, height: H * 0.3, rx: 6, fill: "url(#ba-rows2)" }, p);
      for (var i = 0; i < 18; i++) el("circle", { cx: X + W * 0.55 + (i % 6) * 14, cy: Y + H * 0.42 + Math.floor(i / 6) * 10, r: 3.5, fill: i % 3 ? "#d63031" : "#2e7d3e" }, p);   // orchard / tomato rows
      // windmill
      var wx = X + W * 0.22, wy = Y + H * 0.3;
      el("polygon", { points: pts([[wx - 9, wy + 26], [wx - 6, wy], [wx + 6, wy], [wx + 9, wy + 26]]), fill: "#efe2c6", stroke: "#7a5f3e", "stroke-width": 1 }, p);
      var blades = g(p, { "class": "ba-spin", style: "animation-duration:9s" });
      for (var k = 0; k < 4; k++) el("rect", { x: wx - 1.5, y: wy - 24, width: 6, height: 24, fill: "#fff", stroke: "#7a5f3e", "stroke-width": 0.8, transform: "rotate(" + (k * 90) + " " + wx + " " + wy + ")" }, blades);
      el("circle", { cx: wx, cy: wy, r: 2.5, fill: "#7a5f3e" }, p);
      // market stalls
      var colors = [CAT.food, CAT.spo, CAT.his, CAT.sci, CAT.geo];
      for (i = 0; i < 5; i++) {
        var sx = X + 10 + i * (W - 20) / 5, sy = Y + H * 0.66, sw = (W - 20) / 5 - 6;
        el("rect", { x: sx, y: sy + 10, width: sw, height: 18, fill: "#c9a77c", stroke: "#6b4a2f", "stroke-width": 0.8 }, p);
        for (var s = 0; s < 4; s++) el("rect", { x: sx + s * sw / 4, y: sy, width: sw / 4, height: 10, fill: s % 2 ? "#fff" : colors[i] }, p);
        el("path", { d: "M" + sx + "," + (sy + 10) + " q" + sw / 8 + ",5 " + sw / 4 + ",0 q" + sw / 8 + ",5 " + sw / 4 + ",0 q" + sw / 8 + ",5 " + sw / 4 + ",0 q" + sw / 8 + ",5 " + sw / 4 + ",0", fill: colors[i], stroke: "none" }, p);
        for (var f = 0; f < 4; f++) el("circle", { cx: sx + 4 + f * (sw - 8) / 3, cy: sy + 16, r: 2.6, fill: ["#ff6b6b", "#ffd166", "#7bd389", "#ff9f43"][(i + f) % 4] }, p);
      }
      for (i = 0; i < 6; i++) el("rect", { x: X + 12 + R() * (W - 30), y: Y + H * 0.9 + R() * 6, width: 8, height: 6, fill: "#8a5a35", stroke: "#5a3d2b", "stroke-width": 0.6 }, p);   // crates
    },
    8: function techQuarter(p, b, R) {                     // Technology: glass towers, blinking antennas, solar arrays, a dish
      ground(p, b, "#36474f");
      var X = b.x, Y = b.y, W = b.w, H = b.h;
      for (var i = 0; i < 10; i++) {                       // solar panels
        var px = X + 10 + (i % 5) * 20, py = Y + H * 0.76 + Math.floor(i / 5) * 18;
        el("rect", { x: px, y: py, width: 16, height: 12, fill: "#1d3557", stroke: "#a8dadc", "stroke-width": 0.6 }, p);
        el("line", { x1: px + 8, y1: py, x2: px + 8, y2: py + 12, stroke: "#a8dadc", "stroke-width": 0.4 }, p);
      }
      var towers = [[0.08, 0.22, 0.2, 0.5], [0.32, 0.08, 0.16, 0.64], [0.52, 0.3, 0.18, 0.42], [0.74, 0.14, 0.2, 0.58]];
      towers.forEach(function (t, n) {
        var tx = X + W * t[0], ty = Y + H * t[1], tw = W * t[2], th = H * t[3];
        el("rect", { x: tx, y: ty, width: tw, height: th, rx: 2, fill: "url(#ba-glass)", stroke: "#0e3a4a", "stroke-width": 1, filter: "url(#ba-drop)" }, p);
        for (var r = 0; r < Math.floor(th / 9); r++) for (var c = 0; c < Math.floor(tw / 8); c++) if (R() < 0.35)
          el("rect", { x: tx + 2 + c * 8, y: ty + 4 + r * 9, width: 5, height: 4, fill: R() < 0.5 ? "#fff3b0" : CAT.tech, opacity: 0.9, "class": R() < 0.25 ? "ba-twinkle" : null, style: "animation-delay:" + (R() * 2).toFixed(2) + "s" }, p);
        el("line", { x1: tx + tw / 2, y1: ty, x2: tx + tw / 2, y2: ty - 14, stroke: "#9aa5ad", "stroke-width": 1.2 }, p);
        el("circle", { cx: tx + tw / 2, cy: ty - 15, r: 2.2, fill: "#ff3b3b", "class": "ba-blink", style: "animation-delay:" + (n * 0.4) + "s" }, p);
      });
      var dx = X + W * 0.82, dy = Y + H * 0.86;
      el("path", { d: "M" + (dx - 14) + "," + dy + " A14,9 0 0 0 " + (dx + 14) + "," + dy + " Z", fill: "#dfe6ea", stroke: "#7d8991", "stroke-width": 1, transform: "rotate(-25 " + dx + " " + dy + ")" }, p);
      el("line", { x1: dx, y1: dy, x2: dx + 6, y2: dy - 12, stroke: "#7d8991", "stroke-width": 1.2 }, p);
      // glowing data lines between towers
      el("path", { d: "M" + (X + W * 0.18) + "," + (Y + H * 0.72) + " L" + (X + W * 0.4) + "," + (Y + H * 0.72) + " L" + (X + W * 0.6) + "," + (Y + H * 0.72) + " L" + (X + W * 0.84) + "," + (Y + H * 0.72), stroke: CAT.tech, "stroke-width": 1.5, "stroke-dasharray": "4 6", fill: "none", "class": "ba-shimmer" }, p);
    }
  };

  // The centre block is nearly all plaza (r=92) and diagonal alleys: only thin slivers along its four
  // edges remain, so it gets paving, small flower beds and (over layer) lanterns, all in those slivers.
  function townSquare(p, R) {
    var b = blocks()[4];
    ground(p, b, "url(#ba-pave)");
    var beds = [[97, 30], [97, -30], [-97, 30], [-97, -30], [30, 97], [-30, 97], [30, -97], [-30, -97]];
    beds.forEach(function (q, i) {
      el("circle", { cx: q[0], cy: q[1], r: 5.5, fill: "#3f7a46" }, p);
      for (var k = 0; k < 5; k++) el("circle", { cx: q[0] + Math.cos(k * 1.26) * 3.2, cy: q[1] + Math.sin(k * 1.26) * 3.2, r: 1.6, fill: [CAT.ent, CAT.his, CAT.art, "#fff", CAT.spo, CAT.geo, CAT.sci, CAT.food][(k + i) % 8] }, p);
    });
  }
  function festive(p) {                                     // over layer: lanterns in the centre slivers, bunting over two districts
    [[100, 0], [-100, 0], [0, 100], [0, -100], [100, 14], [-100, -14], [14, 100], [-14, -100]].forEach(function (q, i) {
      el("circle", { cx: q[0], cy: q[1], r: 8, fill: "url(#ba-glow)", "class": "ba-twinkle", style: "animation-delay:" + (i * 0.27).toFixed(2) + "s" }, p);
      el("rect", { x: q[0] - 2.5, y: q[1] - 3.5, width: 5, height: 7, rx: 2, fill: i % 2 ? "#ff8a5c" : "#ffcf5a", stroke: "#a86f00", "stroke-width": 0.7 }, p);
    });
    var cols = [CAT.geo, CAT.ent, CAT.his, CAT.art, CAT.sci, CAT.spo, CAT.food, CAT.tech, CAT.life];
    [[blocks()[1], 0.62], [blocks()[7], 0.6]].forEach(function (bb, n) {             // a bunting string across each district
      var b = bb[0], y0 = b.y + b.h * bb[1], x0 = b.x + 6, x1 = b.x + b.w - 6, sag = 10;
      el("path", { d: "M" + x0 + "," + y0 + " Q" + (b.x + b.w / 2) + "," + (y0 + 2 * sag) + " " + x1 + "," + y0, stroke: "#5a3d2b", "stroke-width": 0.8, fill: "none" }, p);
      for (var i = 0; i < 14; i++) {
        var u = (i + 0.5) / 14, x = x0 + (x1 - x0) * u, y = y0 + 4 * sag * u * (1 - u);
        el("polygon", { points: pts([[x - 4, y], [x + 4, y], [x, y + 8]]), fill: cols[(i + n * 3) % cols.length], "class": "ba-flag", style: "animation-delay:" + (i * 0.12).toFixed(2) + "s" }, p);
      }
    });
  }

  // ------------------------------------------------------------------ sky layer
  function sky(p, R) {
    // cloud shadows drifting across the blocks (masked to the blocks only)
    for (var i = 0; i < 3; i++) {
      var c = g(p, { "class": "ba-drift", style: "animation-delay:" + (-i * 15) + "s;animation-duration:" + (40 + i * 9) + "s" });
      el("ellipse", { cx: 0, cy: -300 + i * 280, rx: 120, ry: 60, fill: "url(#ba-shade)" }, c);
      el("ellipse", { cx: 60, cy: -280 + i * 280, rx: 80, ry: 44, fill: "url(#ba-shade)" }, c);
    }
    // little flocks circling over three districts
    [[-280, -280, 60, 0], [280, 0, 54, 1], [0, 280, 58, 0]].forEach(function (f, n) {
      var holder = g(p, { transform: "translate(" + f[0] + "," + f[1] + ")" }), orb = g(holder, { "class": "ba-orbit" + (f[3] ? " rev" : "") });
      for (var k = 0; k < 3; k++) {
        var bx = f[2] - k * 9, by = (k % 2 ? 6 : 0) - k * 3;
        var bird = g(orb, { transform: "translate(" + bx + "," + by + ")" });
        el("path", { d: "M-6,0 Q-3,-4 0,0 Q3,-4 6,0", stroke: "#2b2b2b", "stroke-width": 1.4, fill: "none", "class": "ba-flap", style: "animation-delay:" + (k * 0.15) + "s" }, bird);
      }
    });
    // fireflies in the forest, twinkles over the theatre
    var fb = blocks()[5];
    for (i = 0; i < 16; i++) el("circle", { cx: fb.x + 10 + R() * (fb.w - 20), cy: fb.y + 10 + R() * (fb.h - 20), r: 1.8, fill: "#f8ff9a", "class": "ba-firefly", style: "animation-delay:" + (R() * 3.4).toFixed(2) + "s" }, p);
    var tb = blocks()[1];
    for (i = 0; i < 6; i++) el("path", { d: "M0,-4 L1,-1 L4,0 L1,1 L0,4 L-1,1 L-4,0 L-1,-1 Z", fill: "#fff7c2", transform: "translate(" + (tb.x + 15 + R() * (tb.w - 30)).toFixed(1) + "," + (tb.y + 6 + R() * 20).toFixed(1) + ")", "class": "ba-twinkle", style: "animation-delay:" + (R() * 2).toFixed(2) + "s" }, p);
    festive(p);
    // tower flags (category colours), waving
    [[-492, -492, CAT.geo], [492, -492, CAT.his], [-492, 492, CAT.spo], [492, 492, CAT.tech]].forEach(function (t) { flag(p, t[0] + (t[0] < 0 ? 2 : -2), t[1] + (t[1] < 0 ? 12 : 8), t[2], 22); });
  }

  // ------------------------------------------------------------------ public
  function draw(svg, defs, layer) {
    try {
      if (!svg) return null;
      defs = defs || svg.querySelector("defs") || el("defs", {}, svg);
      setup(svg, defs);
      var R = rng(layer === "over" ? 20240 : 7317);
      var root = el("g", { "class": "ba-art ba-anim ba-" + (layer === "over" ? "over" : "under"), mask: "url(#ba-mask)", "aria-hidden": "true", "pointer-events": "none" }, svg);
      if (layer === "over") { sky(root, R); return root; }
      var bl = blocks();
      bl.forEach(function (b, idx) {
        if (idx === 4) { townSquare(root, R); return; }
        var part = g(root, { "class": "ba-district ba-d" + idx });
        DISTRICTS[idx](part, b, R);
      });
      return root;
    } catch (e) {
      if (window.console) console.warn("BoardArt:", e);
      return null;
    }
  }

  // Draw one district's landmark scene into group p, inside a box of about 208 x 180 units.
  // Used by the island board: the caller positions and scales the group.
  function vignette(p, idx, box, seed) {
    var svg = p.ownerSVGElement, defs = svg.querySelector("defs") || el("defs", {}, svg);
    setup(svg, defs);
    var gg = g(p, { "class": "ba-district" });
    DISTRICTS[idx](gg, box, rng(seed));
    var f = gg.firstChild; if (f && f.tagName === "rect") gg.removeChild(f);   // drop the square ground; the island paints its own
    return gg;
  }
  function prepare(svg, defs) { setup(svg, defs || svg.querySelector("defs")); }

  window.BoardArt = { draw: draw, vignette: vignette, prepare: prepare, tree: tree, house: house, flag: flag, rng: rng, version: "1.1.0" };
})();

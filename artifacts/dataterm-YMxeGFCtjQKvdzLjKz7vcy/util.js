"use strict";
/* Shared helpers and app state. Loaded before editor.js and pages.js. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtTime = (t) => (t ? new Date(t).toLocaleString() : "");
const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`);
const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString() : n);
const store = {
  get(k, d) { try { const v = localStorage.getItem("dt." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("dt." + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

async function api(path, opts = {}) {
  const init = { ...opts };
  if (init.body && !(init.body instanceof FormData)) {
    init.headers = { "Content-Type": "application/json", ...(init.headers || {}) };
    if (typeof init.body !== "string") init.body = JSON.stringify(init.body);
  }
  const r = await fetch(path, init);
  const data = r.headers.get("content-type")?.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw new Error(data?.detail ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : r.statusText);
  return data;
}

let toastTimer;
function toast(msg) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

const App = { me: { user: "", is_admin: true }, connections: [], loaders: {} };
const connName = (id) => App.connections.find((c) => c.id === id)?.name ?? (id ? `#${id}` : "—");

function showTab(name) {
  $$("nav button").forEach((x) => x.classList.toggle("active", x.dataset.tab === name));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${name}`));
  App.loaders[name]?.();
  if (name === "editor") window.Editor?.cm.refresh();
}
$$("nav button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

/* Split a SQL script into statements with their character ranges, ignoring ; inside quotes and comments. */
function splitSql(sql) {
  const out = [];
  let start = 0, i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i], two = sql.slice(i, i + 2);
    if (two === "--") { const j = sql.indexOf("\n", i); i = j === -1 ? n : j; continue; }
    if (two === "/*") { const j = sql.indexOf("*/", i + 2); i = j === -1 ? n : j + 2; continue; }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < n) { if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; } if (sql[j] === "\\" && c === "'") { j += 2; continue; } j++; }
      i = j + 1; continue;
    }
    if (c === "$") { const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i)); if (m) { const j = sql.indexOf(m[0], i + m[0].length); i = j === -1 ? n : j + m[0].length; continue; } }
    if (c === ";") { out.push({ start, end: i, text: sql.slice(start, i) }); start = i + 1; }
    i++;
  }
  out.push({ start, end: n, text: sql.slice(start) });
  const hasCode = (s) => s.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim().length > 0;
  return out.filter((s) => hasCode(s.text));
}

/* The statement containing (or just before) a character offset. */
function statementAt(sql, offset) {
  const parts = splitSql(sql);
  return parts.find((p) => offset >= p.start && offset <= p.end + 1) || parts.filter((p) => p.end < offset).pop() || parts[0];
}

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function download(name, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

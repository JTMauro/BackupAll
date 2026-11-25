"use strict";
/* SQL editor: tabs, schema explorer, autocomplete, running, results (grid / chart / profile), assistant. */

const Editor = (() => {
  // ------------------------------------------------------------------ CodeMirror
  const cm = CodeMirror.fromTextArea($("#sql"), {
    mode: "text/x-sql", lineNumbers: true, indentWithTabs: false, smartIndent: true, matchBrackets: true,
    extraKeys: {
      "Ctrl-Enter": () => runCurrent(), "Cmd-Enter": () => runCurrent(),
      "Shift-Ctrl-Enter": () => runAll(), "Shift-Cmd-Enter": () => runAll(),
      "Ctrl-S": () => quickSave(), "Cmd-S": () => quickSave(),
      "Shift-Ctrl-F": () => formatSql(), "Shift-Cmd-F": () => formatSql(),
      "Ctrl-Space": "autocomplete", "Ctrl-/": "toggleComment", "Cmd-/": "toggleComment",
    },
    hintOptions: { tables: {}, completeSingle: false },
  });
  cm.on("inputRead", (ed, change) => {
    if (change.origin === "+input" && /^[\w.]$/.test(change.text[0])) ed.showHint({ completeSingle: false });
  });

  // ------------------------------------------------------------------ editor tabs
  let tabs = store.get("tabs", null) || [{ id: 1, title: "Query 1", sql: "-- Welcome to DataTerm\nSELECT 1 AS hello;", connId: null, query: null, params: {} }];
  let activeId = store.get("activeTab", tabs[0].id);
  if (!tabs.some((t) => t.id === activeId)) activeId = tabs[0].id;
  const active = () => tabs.find((t) => t.id === activeId);
  const results = new Map(); // tab id -> results state
  let saveTimer;
  const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { store.set("tabs", tabs); store.set("activeTab", activeId); }, 300); };

  function renderTabs() {
    const el = $("#editor-tabs");
    el.innerHTML = tabs.map((t) => `<div class="etab ${t.id === activeId ? "active" : ""}" data-id="${t.id}" title="${esc(t.query ? `${t.query.folder} / ${t.query.name}` : t.title)}">
      <span>${t.dirty ? "● " : ""}${esc(t.query?.name || t.title)}</span><button class="x" data-close="${t.id}" title="Close">✕</button></div>`).join("") +
      `<button class="add" id="new-tab" title="New query tab">＋</button>`;
  }
  $("#editor-tabs").addEventListener("click", (e) => {
    const close = e.target.closest("[data-close]");
    if (close) { closeTab(Number(close.dataset.close)); return; }
    if (e.target.closest("#new-tab")) { newTab(); return; }
    const t = e.target.closest(".etab");
    if (t) switchTab(Number(t.dataset.id));
  });

  function switchTab(id) {
    const cur = active();
    if (cur) cur.sql = cm.getValue();
    activeId = id;
    const t = active();
    cm.setValue(t.sql || "");
    cm.clearHistory();
    if (t.connId && App.connections.some((c) => c.id === t.connId) && String(t.connId) !== $("#conn-select").value) {
      $("#conn-select").value = t.connId;
      loadSchema();
    }
    renderTabs();
    updateQueryLabel();
    Results.render();
    persist();
  }

  function newTab(sql = "", title, query = null, connId = null) {
    const id = Math.max(0, ...tabs.map((t) => t.id)) + 1;
    tabs.push({ id, title: title || `Query ${id}`, sql, connId: connId || Number($("#conn-select").value) || null, query, params: {} });
    switchTab(id);
    cm.focus();
    return id;
  }

  function closeTab(id) {
    const t = tabs.find((x) => x.id === id);
    if (t?.dirty && !confirm(`"${t.query?.name || t.title}" has unsaved changes. Close it anyway?`)) return;
    tabs = tabs.filter((x) => x.id !== id);
    results.delete(id);
    if (!tabs.length) { tabs = []; newTab(); return; }
    if (activeId === id) { activeId = tabs[tabs.length - 1].id; cm.setValue(active().sql); }
    renderTabs();
    Results.render();
    updateQueryLabel();
    persist();
  }

  cm.on("change", () => {
    const t = active();
    t.sql = cm.getValue();
    const dirty = !!t.query && t.sql !== t.query.sql;
    if (dirty !== !!t.dirty) { t.dirty = dirty; renderTabs(); }
    persist();
  });

  function openQuery(q) {
    const existing = tabs.find((t) => t.query?.id === q.id);
    if (existing) { switchTab(existing.id); return; }
    const cur = active();
    if (cur && !cur.query && !cur.sql.trim().replace(/^--.*$/gm, "").trim()) {
      Object.assign(cur, { sql: q.sql, query: q, title: q.name, connId: q.connection_id || cur.connId });
      switchTab(cur.id);
    } else {
      newTab(q.sql, q.name, q, q.connection_id);
    }
  }

  function updateQueryLabel() {
    const q = active()?.query;
    $("#open-query").innerHTML = q ? `${esc(q.folder)} / <strong>${esc(q.name)}</strong> <span class="badge">v${q.version}</span>${q.visibility === "private" ? '<span class="badge private">private</span>' : ""}` : "";
    $("#versions-btn").hidden = !q;
  }

  // ------------------------------------------------------------------ connections & schema explorer
  const hintTables = {};
  const openNamespaces = new Set();

  async function loadConnections() {
    App.connections = await api("/api/connections");
    const sel = $("#conn-select");
    const want = String(active()?.connId || sel.value || store.get("conn", ""));
    sel.innerHTML = App.connections.length
      ? App.connections.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")
      : `<option value="">No connections yet</option>`;
    if (App.connections.some((c) => String(c.id) === want)) sel.value = want;
    if (active() && !active().connId) active().connId = Number(sel.value) || null;
    document.dispatchEvent(new CustomEvent("connections-changed"));
    loadSchema();
  }
  const currentConn = () => App.connections.find((c) => String(c.id) === $("#conn-select").value);

  $("#conn-select").addEventListener("change", (e) => {
    store.set("conn", e.target.value);
    active().connId = Number(e.target.value) || null;
    persist();
    loadSchema();
  });
  $("#schema-refresh").addEventListener("click", () => loadSchema(true));

  async function loadSchema(refresh = false) {
    const conn = currentConn();
    const tree = $("#schema-tree");
    for (const k of Object.keys(hintTables)) delete hintTables[k];
    openNamespaces.clear();
    if (!conn) { tree.innerHTML = `<li class="muted">Add a connection on the Connections tab.</li>`; return; }
    tree.innerHTML = `<li class="muted">Loading…</li>`;
    try {
      const nss = await api(`/api/connections/${conn.id}/schema${refresh ? "?refresh=true" : ""}`);
      tree.innerHTML = nss.length ? "" : `<li class="muted">No databases or schemas visible</li>`;
      nss.forEach((ns) => tree.appendChild(nsNode(conn.id, ns)));
      const preferred = nss.filter((n) => n === conn.config.database || n === "public" || n === "dbo" || n === "main");
      (preferred.length ? preferred : nss.length <= 3 ? nss : []).forEach((ns) => loadTablesFor(conn.id, ns).catch(() => {}));
    } catch (e) {
      tree.innerHTML = `<li class="error">${esc(e.message)}</li>`;
    }
  }

  async function loadTablesFor(cid, ns) {
    const tables = await api(`/api/connections/${cid}/schema/${encodeURIComponent(ns)}`);
    hintTables[ns] = hintTables[ns] && typeof hintTables[ns] === "object" && !Array.isArray(hintTables[ns]) ? hintTables[ns] : {};
    tables.forEach((t) => {
      hintTables[ns][t.name] = hintTables[ns][t.name] || [];
      if (!hintTables[t.name]) hintTables[t.name] = hintTables[ns][t.name];
    });
    cm.setOption("hintOptions", { tables: hintTables, completeSingle: false });
    return tables;
  }

  function nsNode(cid, ns) {
    const li = document.createElement("li");
    li.dataset.ns = ns;
    li.innerHTML = `<div class="node"><span class="twisty">▸</span><span class="label">🗄 ${esc(ns)}</span></div><ul hidden></ul>`;
    const [node, ul] = [li.firstChild, li.lastChild];
    let loaded = false;
    node.addEventListener("click", async () => {
      ul.hidden = !ul.hidden;
      node.querySelector(".twisty").textContent = ul.hidden ? "▸" : "▾";
      ul.hidden ? openNamespaces.delete(ns) : openNamespaces.add(ns);
      if (loaded || ul.hidden) return;
      loaded = true;
      ul.innerHTML = `<li class="muted">Loading…</li>`;
      try {
        const tables = await loadTablesFor(cid, ns);
        ul.innerHTML = tables.length ? "" : `<li class="muted">No tables</li>`;
        tables.forEach((t) => ul.appendChild(tableNode(cid, ns, t)));
        applyTreeFilter();
      } catch (e) { ul.innerHTML = `<li class="error">${esc(e.message)}</li>`; loaded = false; }
    });
    return li;
  }

  function tableNode(cid, ns, t) {
    const li = document.createElement("li");
    li.dataset.table = t.name.toLowerCase();
    const icon = /view/i.test(t.type) ? "👁" : "▦";
    li.innerHTML = `<div class="node"><span class="twisty">▸</span><span class="label" title="${esc(t.type)}">${icon} ${esc(t.name)}</span>
      <span class="acts"><button class="small" data-act="preview" title="First 100 rows">Preview</button><button class="small" data-act="select" title="Insert a SELECT">SQL</button><button class="small" data-act="ddl" title="Show CREATE statement">DDL</button></span></div><ul hidden></ul>`;
    const [node, ul] = [li.firstChild, li.lastChild];
    let loaded = false;
    const qualified = () => `${quoteIdent(ns)}.${quoteIdent(t.name)}`;
    node.addEventListener("click", async (e) => {
      const act = e.target.dataset.act;
      if (act === "preview") { Results.preview(cid, ns, t.name); return; }
      if (act === "select") { insertText(`SELECT *\nFROM ${qualified()}\nLIMIT 100;`); return; }
      if (act === "ddl") { showDdl(cid, ns, t.name); return; }
      ul.hidden = !ul.hidden;
      node.querySelector(".twisty").textContent = ul.hidden ? "▸" : "▾";
      if (loaded || ul.hidden) return;
      loaded = true;
      ul.innerHTML = `<li class="muted">Loading…</li>`;
      try {
        const cols = await api(`/api/connections/${cid}/schema/${encodeURIComponent(ns)}/${encodeURIComponent(t.name)}`);
        const names = cols.map((c) => c.name);
        if (hintTables[ns]) hintTables[ns][t.name] = names;
        if (Array.isArray(hintTables[t.name]) || !hintTables[t.name]) hintTables[t.name] = names;
        ul.innerHTML = cols.map((c) => `<li><span class="col" title="Click to insert">${esc(c.name)} <small>${esc(c.type)}</small></span></li>`).join("");
        ul.querySelectorAll(".col").forEach((el, i) => el.addEventListener("click", () => insertText(cols[i].name)));
      } catch (err) { ul.innerHTML = `<li class="error">${esc(err.message)}</li>`; loaded = false; }
    });
    node.addEventListener("dblclick", () => insertText(qualified()));
    return li;
  }

  function quoteIdent(s) {
    if (/^[a-z_][a-z0-9_]*$/.test(s)) return s;
    const t = currentConn()?.type;
    const url = currentConn()?.config?.url || "";
    if (t === "sql" && /^(mysql|databricks|bigquery)/.test(url)) return "`" + s.replace(/`/g, "``") + "`";
    if (t === "sql" && /^mssql/.test(url)) return `[${s.replace(/]/g, "]]")}]`;
    return `"${s.replace(/"/g, '""')}"`;
  }

  function applyTreeFilter() {
    const f = $("#tree-filter").value.trim().toLowerCase();
    $$("#schema-tree li[data-table]").forEach((li) => (li.hidden = !!f && !li.dataset.table.includes(f)));
  }
  $("#tree-filter").addEventListener("input", applyTreeFilter);

  function insertText(text) { cm.replaceSelection(text); cm.focus(); }

  async function showDdl(cid, ns, table) {
    $("#ddl-title").textContent = `${ns}.${table}`;
    $("#ddl-sql").textContent = "Loading…";
    $("#ddl-dialog").showModal();
    try { $("#ddl-sql").textContent = (await api(`/api/connections/${cid}/schema/${encodeURIComponent(ns)}/${encodeURIComponent(table)}/ddl`)).ddl; }
    catch (e) { $("#ddl-sql").textContent = e.message; }
  }
  $("#ddl-close").addEventListener("click", () => $("#ddl-dialog").close());
  $("#ddl-insert").addEventListener("click", () => { insertText($("#ddl-sql").textContent); $("#ddl-dialog").close(); });

  // ------------------------------------------------------------------ running
  let lastError = "";
  let running = null; // {tabId, ids}

  function setStatus(html, cls = "muted") { const s = $("#status"); s.className = `status ${cls}`; s.innerHTML = html; }

  function runCurrent() {
    if (cm.somethingSelected()) return execute(cm.getSelection(), "all");
    const doc = cm.getValue();
    const stmt = statementAt(doc, cm.indexFromPos(cm.getCursor()));
    if (!stmt) return setStatus("Nothing to run.");
    const from = cm.posFromIndex(stmt.start), to = cm.posFromIndex(stmt.end);
    const mark = cm.markText(from, to, { className: "cm-current-stmt" });
    setTimeout(() => mark.clear(), 700);
    return execute(stmt.text, "single");
  }
  const runAll = () => execute(cm.getValue(), "all");
  function explain() {
    const stmt = cm.somethingSelected() ? cm.getSelection() : statementAt(cm.getValue(), cm.indexFromPos(cm.getCursor()))?.text;
    if (stmt) execute(`EXPLAIN ${stmt.trim()}`, "single");
  }

  async function askParams(sql) {
    let found;
    try { found = await api("/api/sql/params", { method: "POST", body: { sql } }); }
    catch (e) { setStatus(esc(e.message), "error"); return null; }
    if (!found.length) return {};
    const t = active();
    $("#params-fields").innerHTML = found.map((p) => `<label>${esc(p.name)}${p.default !== null ? ` <span class="muted">(default ${esc(p.default)})</span>` : ""}
      <input name="${esc(p.name)}" value="${esc(t.params?.[p.name] ?? p.default ?? "")}" ${p.default === null ? "required" : ""}></label>`).join("");
    const dlg = $("#params-dialog");
    dlg.returnValue = "";
    dlg.showModal();
    dlg.querySelector("input")?.focus();
    return new Promise((resolve) => dlg.addEventListener("close", () => {
      if (dlg.returnValue !== "run") return resolve(null);
      const vals = {};
      $$("#params-fields input").forEach((i) => (vals[i.name] = i.value));
      t.params = { ...t.params, ...vals };
      persist();
      resolve(vals);
    }, { once: true }));
  }

  async function execute(sql, mode) {
    const conn = currentConn();
    if (!conn) return setStatus("Add a connection first (Connections tab).", "error");
    if (!sql.trim()) return setStatus("Nothing to run.");
    const params = await askParams(sql);
    if (params === null) return;
    const tab = active();
    tab.connId = conn.id;
    $("#run-btn").disabled = $("#run-all-btn").disabled = true;
    $("#cancel-btn").disabled = false;
    setStatus("Starting…");
    let ids;
    try {
      ({ ids } = await api("/api/runs", { method: "POST", body: { connection_id: conn.id, sql, params, mode } }));
    } catch (e) {
      lastError = e.message;
      setStatus(`${esc(e.message)}`, "error");
      $("#run-btn").disabled = $("#run-all-btn").disabled = false;
      $("#cancel-btn").disabled = true;
      return;
    }
    running = { tabId: tab.id, ids };
    Results.start(tab.id, ids);
    const t0 = performance.now();
    const pending = new Set(ids);
    while (pending.size) {
      for (const id of [...pending]) {
        const run = await api(`/api/runs/${id}`).catch(() => null);
        if (!run) continue;
        Results.update(tab.id, run);
        if (["succeeded", "failed", "cancelled"].includes(run.status)) pending.delete(id);
      }
      if (pending.size) {
        setStatus(`Running ${ids.length > 1 ? `${ids.length - pending.size + 1} of ${ids.length}` : ""}… ${((performance.now() - t0) / 1000).toFixed(1)}s`);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    running = null;
    $("#run-btn").disabled = $("#run-all-btn").disabled = false;
    $("#cancel-btn").disabled = true;
    const st = Results.state(tab.id);
    const failed = st.runs.find((r) => r.status === "failed");
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    if (failed) {
      lastError = failed.error || "";
      setStatus(`${esc(failed.error)} &nbsp;<button class="link" id="fix-it">✨ Fix with the assistant</button>`, "error");
      $("#fix-it")?.addEventListener("click", () => Assistant.run("fix"));
    } else if (st.runs.every((r) => r.status === "cancelled")) {
      setStatus("Cancelled.");
    } else {
      lastError = "";
      const total = st.runs.reduce((a, r) => a + (r.row_count || 0), 0);
      setStatus(`${st.runs.length > 1 ? `${st.runs.length} statements · ` : ""}${fmtNum(total)} row(s) · ${secs}s`, "ok");
    }
  }

  $("#run-btn").addEventListener("click", runCurrent);
  $("#run-all-btn").addEventListener("click", runAll);
  $("#explain-btn").addEventListener("click", explain);
  $("#cancel-btn").addEventListener("click", () => {
    const st = running && Results.state(running.tabId);
    const live = st?.runs.find((r) => !["succeeded", "failed", "cancelled"].includes(r.status));
    if (live) api(`/api/runs/${live.id}/cancel`, { method: "POST" });
  });

  // ------------------------------------------------------------------ formatting
  function formatSql() {
    const conn = currentConn();
    const scheme = (conn?.config?.url || "").split(":")[0].split("+")[0];
    const lang = { athena: "trino", redshift: "redshift", rds_data: "postgresql" }[conn?.type] ||
      { mssql: "transactsql", postgresql: "postgresql", mysql: "mysql", oracle: "plsql", snowflake: "snowflake", bigquery: "bigquery", databricks: "spark", sqlite: "sqlite" }[scheme] || "sql";
    const whole = !cm.somethingSelected();
    const src = whole ? cm.getValue() : cm.getSelection();
    const keep = [];
    const masked = src.replace(/\{\{[\s\S]*?\}\}|\$\{[^}]*\}/g, (m) => { keep.push(m); return `__dt_keep_${keep.length - 1}__`; });
    try {
      let out = sqlFormatter.format(masked, { language: lang, keywordCase: "upper", tabWidth: 2 });
      out = out.replace(/__dt_keep_(\d+)__/g, (_, i) => keep[Number(i)]);
      if (whole) { const c = cm.getCursor(); cm.setValue(out); cm.setCursor(c); } else cm.replaceSelection(out);
    } catch (e) { setStatus(`Couldn't format: ${esc(e.message)}`, "error"); }
  }
  $("#format-btn").addEventListener("click", formatSql);

  // ------------------------------------------------------------------ saving & versions
  function quickSave() {
    const t = active();
    if (t.query) return saveQuery({ ...t.query, sql: cm.getValue() }, false);
    openSaveDialog();
  }

  async function saveQuery(fields, asNew) {
    const t = active();
    const body = { name: fields.name, folder: fields.folder || "Shared", description: fields.description || "",
                   sql: cm.getValue(), connection_id: Number($("#conn-select").value) || null, visibility: fields.visibility || "shared" };
    try {
      const q = t.query && !asNew ? await api(`/api/queries/${t.query.id}`, { method: "PUT", body }) : await api("/api/queries", { method: "POST", body });
      t.query = q; t.title = q.name; t.dirty = false;
      renderTabs(); updateQueryLabel(); persist();
      toast(`Saved "${q.name}" (version ${q.version})`);
    } catch (e) { setStatus(esc(e.message), "error"); }
  }

  async function openSaveDialog() {
    const f = $("#save-form"), q = active().query;
    f.name.value = q?.name ?? ""; f.folder.value = q?.folder ?? "Shared"; f.description.value = q?.description ?? "";
    f.visibility.value = q?.visibility ?? "shared"; f.as_new.checked = false; f.as_new.parentElement.hidden = !q;
    try {
      const folders = [...new Set((await api("/api/queries")).map((x) => x.folder))];
      $("#folder-list").innerHTML = folders.map((x) => `<option value="${esc(x)}">`).join("");
    } catch { /* offline */ }
    $("#save-dialog").returnValue = "";
    $("#save-dialog").showModal();
  }
  $("#save-btn").addEventListener("click", openSaveDialog);
  $("#save-dialog").addEventListener("close", () => {
    if ($("#save-dialog").returnValue !== "save") return;
    const f = $("#save-form");
    saveQuery({ name: f.name.value, folder: f.folder.value, description: f.description.value, visibility: f.visibility.value }, f.as_new.checked);
  });

  let versionsCache = [], chosenVersion = null;
  async function showVersions(q) {
    $("#versions-title").textContent = `Versions of ${q.name}`;
    $("#versions-sql").textContent = "";
    $("#versions-restore").disabled = true;
    $("#versions-dialog").showModal();
    versionsCache = await api(`/api/queries/${q.id}/versions`);
    $("#versions-list").innerHTML = versionsCache.map((v, i) => `<li data-i="${i}"><strong>v${v.version}</strong>${i === 0 ? ' <span class="badge">current</span>' : ""}<br><span class="muted">${esc(v.edited_by)} · ${fmtTime(v.edited_at)}</span></li>`).join("");
    $("#versions-dialog").dataset.qid = q.id;
    $("#versions-list li")?.click();
  }
  $("#versions-list").addEventListener("click", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    $$("#versions-list li").forEach((x) => x.classList.toggle("active", x === li));
    chosenVersion = versionsCache[Number(li.dataset.i)];
    $("#versions-sql").textContent = chosenVersion.sql;
    $("#versions-restore").disabled = li.dataset.i === "0";
  });
  $("#versions-restore").addEventListener("click", async () => {
    const qid = Number($("#versions-dialog").dataset.qid);
    const q = await api(`/api/queries/${qid}/restore/${chosenVersion.id}`, { method: "POST" });
    $("#versions-dialog").close();
    const t = tabs.find((x) => x.query?.id === qid);
    if (t) { t.query = q; t.sql = q.sql; if (t.id === activeId) cm.setValue(q.sql); t.dirty = false; renderTabs(); updateQueryLabel(); persist(); }
    toast(`Restored version ${chosenVersion.version} as version ${q.version}`);
    App.loaders.catalog?.();
  });
  $("#versions-close").addEventListener("click", () => $("#versions-dialog").close());
  $("#versions-btn").addEventListener("click", () => active().query && showVersions(active().query));

  // ------------------------------------------------------------------ boot
  cm.setValue(active().sql || "");
  cm.clearHistory();
  renderTabs();
  updateQueryLabel();

  return { cm, loadConnections, loadSchema, openQuery, newTab, showVersions, insertText, currentConn,
           get lastError() { return lastError; }, get openNamespaces() { return [...openNamespaces]; },
           get activeTabId() { return activeId; }, results };
})();

/* ===================================================================== Results */
const Results = (() => {
  const MAX_RENDER = 2000;
  let chart = null;

  const state = (tabId) => {
    if (!Editor.results.has(tabId)) Editor.results.set(tabId, { runs: [], active: 0, view: "grid", sort: null, filter: "" });
    return Editor.results.get(tabId);
  };

  function start(tabId, ids) {
    const st = state(tabId);
    st.runs = ids.map((id, i) => ({ id, label: ids.length > 1 ? `Result ${i + 1}` : "Result", status: "queued" }));
    st.active = 0; st.sort = null; st.filter = ""; $("#grid-filter").value = "";
    render();
  }

  function update(tabId, run) {
    const st = state(tabId);
    const r = st.runs.find((x) => x.id === run.id);
    if (!r) return;
    const wasDone = ["succeeded", "failed", "cancelled"].includes(r.status);
    Object.assign(r, run);
    if (run.columns) r.types = detectTypes(run.columns, run.rows);
    if (!wasDone && ["succeeded", "failed"].includes(run.status)) {
      const firstWithData = st.runs.findIndex((x) => x.columns?.length && x.status === "succeeded");
      if (run.status === "failed") st.active = st.runs.indexOf(r);
      else if (firstWithData >= 0 && !st.runs[st.active]?.columns) st.active = firstWithData;
      // a script's last SELECT is usually the interesting one
      if (run.status === "succeeded" && run.columns?.length && !(run.columns.length === 1 && run.columns[0] === "rows_affected")) st.active = st.runs.indexOf(r);
    }
    if (tabId === Editor.activeTabId) render();
  }

  async function preview(cid, ns, table) {
    const tabId = Editor.activeTabId;
    const st = state(tabId);
    const r = { id: null, label: `${table} (preview)`, status: "running" };
    st.runs = [r]; st.active = 0; st.sort = null; st.filter = ""; $("#grid-filter").value = "";
    render();
    try {
      const res = await api(`/api/connections/${cid}/schema/${encodeURIComponent(ns)}/${encodeURIComponent(table)}/preview`);
      Object.assign(r, { status: "succeeded", columns: res.columns, rows: res.rows, row_count: res.rows.length, truncated: res.truncated, result_available: true });
      r.types = detectTypes(res.columns, res.rows);
    } catch (e) { Object.assign(r, { status: "failed", error: e.message }); }
    render();
  }

  // ---- column typing (Athena returns everything as strings, so look at values)
  function detectTypes(columns, rows) {
    return columns.map((_, c) => {
      let num = 0, nonNull = 0, date = 0;
      for (let i = 0; i < rows.length && i < 500; i++) {
        const v = rows[i][c];
        if (v === null || v === "") continue;
        nonNull++;
        if (typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v.trim()))) num++;
        else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) date++;
      }
      if (!nonNull) return "empty";
      if (num === nonNull) return "number";
      if (date === nonNull) return "date";
      return "text";
    });
  }
  const toNum = (v) => (v === null || v === "" ? null : typeof v === "number" ? v : Number(v));

  function viewRows(r, st) {
    let rows = r.rows || [];
    if (st.filter) {
      const f = st.filter.toLowerCase();
      rows = rows.filter((row) => row.some((v) => v !== null && String(v).toLowerCase().includes(f)));
    }
    if (st.sort) {
      const { col, dir } = st.sort;
      const numeric = r.types?.[col] === "number";
      rows = [...rows].sort((a, b) => {
        const x = a[col], y = b[col];
        if (x === null) return 1; if (y === null) return -1;
        const c = numeric ? toNum(x) - toNum(y) : String(x).localeCompare(String(y), undefined, { numeric: true });
        return dir === "asc" ? c : -c;
      });
    }
    return rows;
  }

  // ---- rendering
  function render() {
    const st = state(Editor.activeTabId);
    const tabsEl = $("#result-tabs");
    tabsEl.innerHTML = st.runs.length > 1 || st.runs[0]?.id === null ? st.runs.map((r, i) =>
      `<button data-i="${i}" class="${i === st.active ? "active" : ""}" title="${esc((r.sql || "").slice(0, 300))}"><span class="dot ${r.status}"></span>${esc(r.label)}${r.row_count != null ? ` <span class="muted">${fmtNum(r.row_count)}</span>` : ""}</button>`).join("") : "";
    const r = st.runs[st.active];
    const body = $("#results");
    const hasData = r && r.status === "succeeded" && r.columns?.length;
    $("#result-toolbar").hidden = !hasData;
    $("#chart-controls").hidden = !hasData || st.view !== "chart";
    $$("#view-seg button").forEach((b) => b.classList.toggle("active", b.dataset.view === st.view));
    if (chart) { chart.destroy(); chart = null; }
    if (!r) { body.innerHTML = `<div class="placeholder muted">Results appear here.</div>`; return; }
    if (r.status === "failed") { body.innerHTML = `<div class="placeholder error">${esc(r.error)}</div>`; return; }
    if (r.status === "cancelled") { body.innerHTML = `<div class="placeholder muted">${esc(r.error || "Cancelled")}</div>`; return; }
    if (r.status !== "succeeded") { body.innerHTML = `<div class="placeholder muted">Running…</div>`; return; }
    if (!r.result_available) { body.innerHTML = `<div class="placeholder muted">Finished (${fmtNum(r.row_count)} rows). The result is no longer in memory; run it again to see it.</div>`; return; }
    const rows = viewRows(r, st);
    const secs = r.finished_at && r.started_at ? ((new Date(r.finished_at) - new Date(r.started_at)) / 1000).toFixed(1) + "s" : "";
    $("#result-info").textContent = `${fmtNum(rows.length)}${st.filter ? ` of ${fmtNum(r.rows.length)}` : ""} rows${r.truncated ? " (truncated at the display limit; export has the same rows)" : ""}${secs ? ` · ${secs}` : ""}`;
    $$("[data-export]").forEach((b) => (b.disabled = r.id === null && b.dataset.export === "xlsx"));
    if (st.view === "chart") return renderChart(r, rows);
    if (st.view === "profile") return renderProfile(r);
    renderGrid(r, rows, st);
  }

  function renderGrid(r, rows, st) {
    const shown = rows.slice(0, MAX_RENDER);
    const arrow = (i) => (st.sort?.col === i ? (st.sort.dir === "asc" ? " ▲" : " ▼") : "");
    const head = `<tr><th class="rn">#</th>${r.columns.map((c, i) => `<th class="sortable" data-col="${i}" title="Click to sort">${esc(c)}<span class="ctype">${r.types[i] === "number" ? "123" : r.types[i] === "date" ? "📅" : ""}</span>${arrow(i)}</th>`).join("")}</tr>`;
    const body = shown.map((row, i) => `<tr><td class="rn">${i + 1}</td>${row.map((v, c) =>
      v === null ? `<td class="null">NULL</td>` : `<td class="${r.types[c] === "number" ? "num" : ""}" title="${esc(String(v).length > 60 ? String(v).slice(0, 1000) : "")}">${esc(v)}</td>`).join("")}</tr>`).join("");
    const more = rows.length > MAX_RENDER ? `<div class="placeholder muted">Showing the first ${fmtNum(MAX_RENDER)} of ${fmtNum(rows.length)} rows. Filter, or export to see everything.</div>` : "";
    $("#results").innerHTML = `<table class="grid">${head}${body}</table>${more}`;
  }

  function renderProfile(r) {
    const n = r.rows.length || 1;
    const rows = r.columns.map((c, i) => {
      const vals = r.rows.map((row) => row[i]);
      const nonNull = vals.filter((v) => v !== null && v !== "");
      const counts = new Map();
      nonNull.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      let min = "", max = "", avg = "";
      if (r.types[i] === "number" && nonNull.length) {
        const nums = nonNull.map(toNum);
        min = Math.min(...nums); max = Math.max(...nums);
        avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toLocaleString(undefined, { maximumFractionDigits: 4 });
        min = min.toLocaleString(); max = max.toLocaleString();
      } else if (nonNull.length) {
        const s = nonNull.map(String).sort();
        min = s[0]; max = s[s.length - 1];
      }
      const fill = nonNull.length / n;
      return `<tr><td><strong>${esc(c)}</strong></td><td>${esc(r.types[i])}</td>
        <td style="min-width:120px"><div class="profile-bar" style="width:${(fill * 100).toFixed(1)}%"></div><span class="muted">${(fill * 100).toFixed(1)}% filled</span></td>
        <td class="num">${fmtNum(counts.size)}</td><td>${esc(min)}</td><td>${esc(max)}</td><td class="num">${esc(avg)}</td>
        <td>${top.map(([v, k]) => `${esc(v.length > 30 ? v.slice(0, 30) + "…" : v)} <span class="muted">×${fmtNum(k)}</span>`).join("<br>")}</td></tr>`;
    }).join("");
    $("#results").innerHTML = `<table class="grid"><tr><th>Column</th><th>Type</th><th>Filled</th><th>Distinct</th><th>Min</th><th>Max</th><th>Average</th><th>Most common</th></tr>${rows}</table>
      <div class="placeholder muted">Profile of the ${fmtNum(r.rows.length)} rows returned.</div>`;
  }

  function fillChartControls(r) {
    const key = r.columns.join("|");
    if ($("#chart-controls").dataset.key === key) return;
    $("#chart-controls").dataset.key = key;
    const opts = r.columns.map((c, i) => `<option value="${i}">${esc(c)}</option>`).join("");
    $("#chart-x").innerHTML = opts;
    const nums = r.types.map((t, i) => (t === "number" ? i : -1)).filter((i) => i >= 0);
    const x = r.types.findIndex((t) => t !== "number");
    $("#chart-x").value = String(x >= 0 ? x : 0);
    const ys = nums.filter((i) => i !== Number($("#chart-x").value));
    const pick = ys.length ? [ys[ys.length - 1]] : [];  // the last numeric column is usually the main measure
    $("#chart-y").innerHTML = nums.map((i) => `<label><input type="checkbox" value="${i}" ${pick.includes(i) ? "checked" : ""}>${esc(r.columns[i])}</label>`).join("") || '<span class="muted">no numeric columns</span>';
  }

  function renderChart(r, rows) {
    fillChartControls(r);
    const type = $("#chart-type").value;
    const xi = Number($("#chart-x").value);
    const yis = $$("#chart-y input:checked").map((o) => Number(o.value));
    const body = $("#results");
    if (!yis.length) { body.innerHTML = `<div class="placeholder muted">Pick one or more numeric Y columns.</div>`; return; }
    body.innerHTML = `<div style="position:relative;height:100%;min-height:260px"><canvas id="result-chart"></canvas></div>`;
    const data = rows.slice(0, 5000);
    const palette = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cssVar(`--c${i}`));
    const text = cssVar("--text"), grid = cssVar("--border");
    let cfg;
    if (type === "pie") {
      cfg = { type: "pie", data: { labels: data.map((row) => row[xi]), datasets: [{ data: data.map((row) => toNum(row[yis[0]])), backgroundColor: data.map((_, i) => palette[i % palette.length]) }] } };
    } else if (type === "scatter") {
      cfg = { type: "scatter", data: { datasets: yis.map((y, k) => ({ label: r.columns[y], data: data.map((row) => ({ x: toNum(row[xi]), y: toNum(row[y]) })), backgroundColor: palette[k % palette.length] })) } };
    } else {
      cfg = { type: type === "area" ? "line" : type, data: { labels: data.map((row) => row[xi]),
        datasets: yis.map((y, k) => ({ label: r.columns[y], data: data.map((row) => toNum(row[y])), backgroundColor: palette[k % palette.length] + (type === "area" ? "55" : ""),
          borderColor: palette[k % palette.length], fill: type === "area", tension: 0.25, pointRadius: data.length > 200 ? 0 : 2, borderRadius: type === "bar" ? 3 : 0 })) } };
    }
    // Measures on very different scales get a second axis so the smaller one stays readable.
    let dual = false;
    if (type !== "pie" && type !== "scatter" && yis.length > 1) {
      const maxOf = (y) => Math.max(...data.map((row) => Math.abs(toNum(row[y]) || 0)), 1e-9);
      const m0 = maxOf(yis[0]);
      cfg.data.datasets.forEach((ds, k) => { if (k > 0 && (maxOf(yis[k]) / m0 > 10 || m0 / maxOf(yis[k]) > 10)) { ds.yAxisID = "y1"; dual = true; } });
    }
    cfg.options = { responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      plugins: { legend: { labels: { color: text } } },
      scales: type === "pie" ? {} : { x: { ticks: { color: text, maxRotation: 45 }, grid: { color: grid } }, y: { ticks: { color: text }, grid: { color: grid } },
        ...(dual ? { y1: { position: "right", ticks: { color: text }, grid: { drawOnChartArea: false } } } : {}) } };
    chart = new Chart($("#result-chart"), cfg);
  }

  // ---- events
  $("#result-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    const st = state(Editor.activeTabId);
    st.active = Number(b.dataset.i); st.sort = null;
    render();
  });
  $("#results").addEventListener("click", (e) => {
    const th = e.target.closest("th.sortable"); if (!th) return;
    const st = state(Editor.activeTabId);
    const col = Number(th.dataset.col);
    st.sort = st.sort?.col !== col ? { col, dir: "asc" } : st.sort.dir === "asc" ? { col, dir: "desc" } : null;
    render();
  });
  let filterTimer;
  $("#grid-filter").addEventListener("input", (e) => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => { state(Editor.activeTabId).filter = e.target.value; render(); }, 150);
  });
  $("#view-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-view]"); if (!b) return;
    state(Editor.activeTabId).view = b.dataset.view;
    render();
  });
  ["chart-type", "chart-x", "chart-y"].forEach((id) => $(`#${id}`).addEventListener("change", render));
  $("#chart-x").addEventListener("change", () => { $("#chart-controls").dataset.key = ""; });
  $$("[data-export]").forEach((b) => b.addEventListener("click", () => {
    const st = state(Editor.activeTabId), r = st.runs[st.active];
    if (!r) return;
    if (r.id !== null) { location.href = `/api/runs/${r.id}/export?fmt=${b.dataset.export}`; return; }
    if (b.dataset.export === "json") download(`${r.label}.json`, JSON.stringify(r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))), null, 1), "application/json");
    else download(`${r.label}.csv`, [r.columns, ...r.rows].map((row) => row.map((v) => (v === null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\n"), "text/csv");
  }));
  $("#copy-btn").addEventListener("click", async () => {
    const st = state(Editor.activeTabId), r = st.runs[st.active];
    const rows = viewRows(r, st).slice(0, 50000);
    const tsv = [r.columns, ...rows].map((row) => row.map((v) => (v === null ? "" : String(v).replace(/[\t\n]/g, " "))).join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); toast(`Copied ${fmtNum(rows.length)} rows — paste into Excel`); } catch { toast("Clipboard isn't available here"); }
  });

  return { start, update, render, preview, state };
})();

/* ===================================================================== Assistant */
const Assistant = (() => {
  const panel = $("#ai-panel");
  const toggle = (show = panel.hidden) => { panel.hidden = !show; Editor.cm.refresh(); if (show) $("#ai-prompt").focus(); };
  $("#ai-toggle").addEventListener("click", () => toggle());
  $("#ai-close").addEventListener("click", () => toggle(false));

  function renderAnswer(text) {
    const parts = text.split(/```(?:sql)?\n?([\s\S]*?)```/g);
    $("#ai-answer").className = "ai-answer";
    $("#ai-answer").innerHTML = parts.map((p, i) => i % 2
      ? `<pre>${esc(p.trim())}</pre><div class="row"><button class="small" data-insert="${i}">Insert at cursor</button><button class="small" data-replace="${i}">Replace editor</button><button class="small" data-newtab="${i}">Open in new tab</button></div>`
      : esc(p.trim())).join("\n");
    $("#ai-answer").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const sql = parts[Number(b.dataset.insert ?? b.dataset.replace ?? b.dataset.newtab)].trim();
      if (b.dataset.insert) Editor.insertText(sql);
      else if (b.dataset.replace) Editor.cm.setValue(sql);
      else Editor.newTab(sql, "Assistant");
    };
  }

  async function run(task) {
    toggle(true);
    const cm = Editor.cm;
    const sql = cm.somethingSelected() ? cm.getSelection() : cm.getValue();
    const prompt = $("#ai-prompt").value.trim();
    if ((task === "generate" || task === "chat") && !prompt) { $("#ai-prompt").focus(); return; }
    if (task === "fix" && !Editor.lastError) { $("#ai-answer").textContent = "Run a query first; Fix uses its error message."; return; }
    $("#ai-answer").className = "ai-answer muted";
    $("#ai-answer").textContent = "Thinking…";
    $$("[data-ai]").forEach((b) => (b.disabled = true));
    try {
      const { answer } = await api("/api/ai", { method: "POST", body: { task, connection_id: Editor.currentConn()?.id || null, sql, prompt, error: Editor.lastError, namespaces: Editor.openNamespaces } });
      renderAnswer(answer);
    } catch (e) {
      $("#ai-answer").className = "ai-answer error";
      $("#ai-answer").textContent = e.message;
    } finally {
      $$("[data-ai]").forEach((b) => (b.disabled = false));
    }
  }
  $$("[data-ai]").forEach((b) => b.addEventListener("click", () => run(b.dataset.ai)));
  $("#ai-prompt").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run("generate"); });
  return { run, toggle };
})();

"use strict";
/* Catalog, schedules, upload, S3, history, connections, settings & backups, plus boot and the binary background. */

// ===================================================================== Catalog
let savedQueries = [];
async function loadCatalog() {
  savedQueries = await api(`/api/queries?search=${encodeURIComponent($("#catalog-search").value)}`);
  const byFolder = {};
  savedQueries.forEach((q) => (byFolder[q.folder] ??= []).push(q));
  const list = $("#catalog-list");
  if (!savedQueries.length) {
    list.innerHTML = `<div class="card muted">No saved queries${$("#catalog-search").value ? " match" : " yet. Write one in the SQL Editor and press Save (Ctrl/⌘+S)"}.</div>`;
    return;
  }
  list.innerHTML = Object.entries(byFolder).map(([folder, qs]) => `
    <div class="folder"><h3>📁 ${esc(folder)}</h3>
    <table class="grid"><tr><th>Name</th><th>Description</th><th>Connection</th><th>Version</th><th>Owner</th><th>Updated</th><th></th></tr>
    ${qs.map((q) => `<tr><td><button class="link" data-open="${q.id}">${esc(q.name)}</button>${q.visibility === "private" ? '<span class="badge private">private</span>' : ""}</td>
      <td>${esc(q.description)}</td><td>${esc(connName(q.connection_id))}</td><td><button class="link" data-versions="${q.id}">v${q.version}</button></td>
      <td>${esc(q.created_by)}</td><td>${fmtTime(q.updated_at)}</td>
      <td class="row"><button class="small" data-ref="${q.id}" title="Copy a reference to reuse this query inside another">Copy ref</button>
        <button class="small" data-sched="${q.id}">Schedule</button><button class="small danger" data-del="${q.id}">Delete</button></td></tr>`).join("")}
    </table></div>`).join("");
}
$("#catalog-list").addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  const id = Number(t.dataset.open || t.dataset.del || t.dataset.sched || t.dataset.versions || t.dataset.ref);
  const q = savedQueries.find((x) => x.id === id);
  if (!q) return;
  if (t.dataset.open) { Editor.openQuery(q); showTab("editor"); }
  else if (t.dataset.versions) Editor.showVersions(q);
  else if (t.dataset.ref) {
    const ref = `{{ ref('${q.folder}/${q.name}') }}`;
    try { await navigator.clipboard.writeText(ref); toast(`Copied ${ref} — paste it into a FROM clause`); } catch { prompt("Copy this reference:", ref); }
  } else if (t.dataset.del && confirm(`Delete "${q.name}" and all its versions? Its schedules are deleted too.`)) {
    try { await api(`/api/queries/${q.id}`, { method: "DELETE" }); loadCatalog(); } catch (err) { alert(err.message); }
  } else if (t.dataset.sched) {
    showTab("schedules");
    resetScheduleForm();
    $("#schedule-form").saved_query_id.value = q.id;
  }
});
let searchTimer;
$("#catalog-search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadCatalog, 250); });
$("#git-sync-btn").addEventListener("click", async (e) => {
  e.target.disabled = true;
  try { toast((await api("/api/catalog/git-sync", { method: "POST" })).message); } catch (err) { alert(err.message); }
  e.target.disabled = false;
});
App.loaders.catalog = loadCatalog;

// ===================================================================== Schedules
let schedules = [];
const ACTION_LABEL = { deliver: "Deliver", publish: "Publish", test: "Test" };
function syncScheduleFields() {
  const action = $("#schedule-form").action.value;
  $$("#schedule-form [data-for]").forEach((el) => (el.hidden = !el.dataset.for.split(" ").includes(action)));
}
$("#schedule-form").action.addEventListener("change", syncScheduleFields);
function resetScheduleForm() {
  const f = $("#schedule-form");
  const keep = f.saved_query_id.value;
  f.reset(); f.id.value = ""; f.saved_query_id.value = keep;
  $("#schedule-form-title").textContent = "New schedule";
  syncScheduleFields();
}
$("#schedule-reset").addEventListener("click", resetScheduleForm);

async function loadSchedules() {
  const [scheds, qs] = await Promise.all([api("/api/schedules"), api("/api/queries")]);
  schedules = scheds; savedQueries = qs;
  const sel = $("#schedule-form").saved_query_id;
  const prev = sel.value;
  sel.innerHTML = qs.map((q) => `<option value="${q.id}">${esc(q.folder)} / ${esc(q.name)}</option>`).join("") || `<option value="">Save a query to the catalog first</option>`;
  if (prev) sel.value = prev;
  const qname = (id) => qs.find((q) => q.id === id)?.name ?? `#${id}`;
  $("#schedule-table").innerHTML = `<tr><th>Query</th><th>Action</th><th>Cron</th><th>Output</th><th>Alerts</th><th>Next run</th><th>On</th><th></th></tr>` +
    (scheds.length ? scheds.map((s) => `<tr><td>${esc(qname(s.saved_query_id))}</td><td>${ACTION_LABEL[s.action] || s.action}</td>
      <td><code>${esc(s.cron)}</code> <span class="muted">${esc(s.timezone)}</span></td>
      <td>${esc(s.action === "publish" ? `${s.publish_as} ${s.target}` : (s.destination || "exports folder") + ` (${s.fmt})`)}</td>
      <td>${esc(s.notify_emails ? `${s.notify_on}: ${s.notify_emails}` : "—")}</td>
      <td>${s.enabled ? fmtTime(s.next_run) : "—"}</td>
      <td><input type="checkbox" data-toggle="${s.id}" ${s.enabled ? "checked" : ""}></td>
      <td class="row"><button class="small" data-runnow="${s.id}">Run now</button><button class="small" data-edit="${s.id}">Edit</button><button class="small danger" data-delsched="${s.id}">Delete</button></td></tr>`).join("")
      : `<tr><td colspan="8" class="muted">No schedules yet.</td></tr>`);
  syncScheduleFields();
}
const parseParams = (text) => Object.fromEntries(text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf("="); return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
$("#schedule-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = { saved_query_id: Number(f.saved_query_id.value), cron: f.cron.value, timezone: f.timezone.value, action: f.action.value,
    destination: f.destination.value, fmt: f.fmt.value, target: f.target.value, publish_as: f.publish_as.value,
    params: parseParams(f.params.value), notify_emails: f.notify_emails.value, notify_on: f.notify_on.value,
    enabled: f.id.value ? schedules.find((s) => s.id === Number(f.id.value))?.enabled ?? true : true };
  try {
    await api(f.id.value ? `/api/schedules/${f.id.value}` : "/api/schedules", { method: f.id.value ? "PUT" : "POST", body });
    toast("Schedule saved");
    resetScheduleForm();
    loadSchedules();
  } catch (err) { alert(err.message); }
});
$("#schedule-table").addEventListener("click", async (e) => {
  const t = e.target;
  const s = schedules.find((x) => x.id === Number(t.dataset.toggle || t.dataset.runnow || t.dataset.edit || t.dataset.delsched));
  if (!s) return;
  try {
    if (t.dataset.toggle) {
      await api(`/api/schedules/${s.id}`, { method: "PUT", body: { ...s, enabled: t.checked } });
      loadSchedules();
    } else if (t.dataset.edit) {
      const f = $("#schedule-form");
      Object.entries({ id: s.id, saved_query_id: s.saved_query_id, cron: s.cron, timezone: s.timezone, action: s.action, destination: s.destination,
        fmt: s.fmt, target: s.target, publish_as: s.publish_as, notify_emails: s.notify_emails, notify_on: s.notify_on }).forEach(([k, v]) => (f[k].value = v ?? ""));
      f.params.value = Object.entries(s.params || {}).map(([k, v]) => `${k}=${v}`).join("\n");
      $("#schedule-form-title").textContent = "Edit schedule";
      syncScheduleFields();
      f.scrollIntoView({ behavior: "smooth" });
    } else if (t.dataset.runnow) {
      t.disabled = true; t.textContent = "Running…";
      const run = await api(`/api/schedules/${s.id}/run`, { method: "POST" });
      alert(run.status === "succeeded" ? `Done: ${run.row_count ?? 0} rows${run.output_uri ? `\n${run.output_uri}` : ""}` : `Run ${run.status}: ${run.error ?? ""}`);
      loadSchedules();
    } else if (t.dataset.delsched && confirm("Delete this schedule?")) {
      await api(`/api/schedules/${s.id}`, { method: "DELETE" });
      loadSchedules();
    }
  } catch (err) { alert(err.message); loadSchedules(); }
});
App.loaders.schedules = loadSchedules;

// ===================================================================== Upload
const TYPES = ["string", "bigint", "double", "boolean", "date", "timestamp"];
let uploadPreview = null;
function fillUploadConnections() {
  const sel = $("#upload-conn");
  const prev = sel.value;
  sel.innerHTML = App.connections.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  if (prev) sel.value = prev;
  loadUploadNamespaces();
}
async function loadUploadNamespaces() {
  const cid = $("#upload-conn").value;
  if (!cid) return;
  try {
    const nss = await api(`/api/connections/${cid}/schema`);
    $("#upload-ns").innerHTML = nss.map((n) => `<option>${esc(n)}</option>`).join("");
  } catch (e) { $("#upload-ns").innerHTML = `<option value="">(${esc(e.message)})</option>`; }
}
$("#upload-conn").addEventListener("change", loadUploadNamespaces);
async function uploadSend(previewOnly) {
  const f = $("#upload-form");
  if (!f.file.files[0]) { f.file.focus(); return null; }
  const fd = new FormData();
  fd.append("file", f.file.files[0]);
  fd.append("namespace", f.namespace.value);
  fd.append("table", f.table.value);
  fd.append("mode", f.mode.value);
  fd.append("preview", previewOnly ? "true" : "false");
  if (!previewOnly) fd.append("types", JSON.stringify($$("#upload-result select[data-col]").map((s) => s.value)));
  return api(`/api/connections/${$("#upload-conn").value}/upload`, { method: "POST", body: fd });
}
$("#upload-preview").addEventListener("click", async () => {
  const out = $("#upload-result");
  out.innerHTML = `<div class="card muted">Reading file…</div>`;
  try {
    uploadPreview = await uploadSend(true);
    if (!uploadPreview) { out.innerHTML = ""; return; }
    if (!$("#upload-form").table.value) $("#upload-form").table.value = uploadPreview.suggested_table;
    out.innerHTML = `<div class="card" style="max-width:none"><h2>${fmtNum(uploadPreview.row_count)} rows · check the column types</h2>
      <div style="overflow:auto"><table class="grid upload-types"><tr>${uploadPreview.columns.map((c, i) => `<th>${esc(c)}<br><select data-col="${i}">${TYPES.map((t) => `<option ${t === uploadPreview.types[i] ? "selected" : ""}>${t}</option>`).join("")}</select></th>`).join("")}</tr>
      ${uploadPreview.rows.map((r) => `<tr>${r.map((v) => (v === null ? `<td class="null">NULL</td>` : `<td>${esc(v)}</td>`)).join("")}</tr>`).join("")}</table></div></div>`;
    $("#upload-go").disabled = false;
  } catch (e) { out.innerHTML = `<div class="card error">${esc(e.message)}</div>`; }
});
$("#upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#upload-go");
  btn.disabled = true; btn.textContent = "Loading…";
  try {
    const r = await uploadSend(false);
    toast(r.message);
    $("#upload-result").insertAdjacentHTML("afterbegin", `<div class="card ok">${esc(r.message)}</div>`);
  } catch (err) { $("#upload-result").insertAdjacentHTML("afterbegin", `<div class="card error">${esc(err.message)}</div>`); }
  btn.disabled = false; btn.textContent = "Load into table";
});
App.loaders.upload = () => { if (!$("#upload-conn").options.length) fillUploadConnections(); };

// ===================================================================== S3
let s3Bucket = "";
async function loadBuckets() {
  try {
    const buckets = await api("/api/s3/buckets");
    $("#s3-bucket").innerHTML = `<option value="">Choose a bucket…</option>` + buckets.map((b) => `<option>${esc(b)}</option>`).join("");
  } catch { $("#s3-bucket").innerHTML = `<option value="">(can't list buckets — type a name)</option>`; }
}
async function openS3(bucket, prefix = "") {
  s3Bucket = bucket;
  const parts = prefix.split("/").filter(Boolean);
  $("#s3-crumbs").innerHTML = `<button class="link" data-prefix="">${esc(bucket)}</button>` +
    parts.map((p, i) => ` / <button class="link" data-prefix="${esc(parts.slice(0, i + 1).join("/") + "/")}">${esc(p)}</button>`).join("");
  const table = $("#s3-table");
  table.innerHTML = `<tr><td class="muted">Loading…</td></tr>`;
  try {
    const r = await api(`/api/s3/list?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`);
    table.innerHTML = `<tr><th>Name</th><th>Size</th><th>Last modified</th><th></th></tr>` +
      r.folders.map((f) => `<tr><td>📁 <button class="link" data-prefix="${esc(f)}">${esc(f.slice(prefix.length))}</button></td><td></td><td></td><td></td></tr>`).join("") +
      r.files.map((f) => `<tr><td>📄 ${esc(f.key.slice(prefix.length))}</td><td class="num">${fmtSize(f.size)}</td><td>${fmtTime(f.modified)}</td>
        <td><a href="/api/s3/download?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(f.key)}">Download</a></td></tr>`).join("") +
      (r.next_token ? `<tr><td colspan="4" class="muted">Showing the first 1,000 items.</td></tr>` : "") +
      (!r.folders.length && !r.files.length ? `<tr><td colspan="4" class="muted">Empty.</td></tr>` : "");
  } catch (e) { table.innerHTML = `<tr><td class="error">${esc(e.message)}</td></tr>`; }
}
$("#s3-go").addEventListener("click", () => { const b = $("#s3-bucket-manual").value.trim() || $("#s3-bucket").value; if (b) openS3(b); });
$("#s3-bucket").addEventListener("change", (e) => e.target.value && openS3(e.target.value));
$("#tab-s3").addEventListener("click", (e) => { const p = e.target.dataset?.prefix; if (p !== undefined && s3Bucket) openS3(s3Bucket, p); });
App.loaders.s3 = () => { if (!$("#s3-bucket").options.length) loadBuckets(); };

// ===================================================================== History
async function loadHistory() {
  const q = new URLSearchParams({ limit: 300, q: $("#history-q").value, user: $("#history-user").value, status: $("#history-status").value, source: $("#history-source").value });
  const runs = await api(`/api/runs?${q}`);
  $("#history-table").innerHTML = `<tr><th>#</th><th>Started</th><th>Took</th><th>User</th><th>Source</th><th>Connection</th><th>Status</th><th>Rows</th><th>SQL</th><th></th></tr>` +
    (runs.length ? runs.map((r) => `<tr><td>${r.id}</td><td>${fmtTime(r.started_at)}</td>
      <td class="num">${r.finished_at ? ((new Date(r.finished_at) - new Date(r.started_at)) / 1000).toFixed(1) + "s" : ""}</td>
      <td>${esc(r.user)}</td><td>${esc(r.source)}</td><td>${esc(connName(r.connection_id))}</td>
      <td class="${r.status === "failed" ? "error" : r.status === "succeeded" ? "ok" : ""}" title="${esc(r.error || r.output_uri || "")}">${esc(r.status)}</td>
      <td class="num">${r.row_count ?? ""}</td><td class="sql">${esc(r.sql.length > 300 ? r.sql.slice(0, 300) + "…" : r.sql)}</td>
      <td><button class="small" data-reopen="${r.id}">Open</button></td></tr>`).join("") : `<tr><td colspan="10" class="muted">No matching runs.</td></tr>`);
  $("#history-table").onclick = (e) => {
    const r = runs.find((x) => x.id === Number(e.target.dataset.reopen));
    if (!r) return;
    Editor.newTab(r.sql, `Run #${r.id}`, null, r.connection_id);
    showTab("editor");
  };
}
$("#history-refresh").addEventListener("click", loadHistory);
["history-q", "history-user"].forEach((id) => $(`#${id}`).addEventListener("keydown", (e) => e.key === "Enter" && loadHistory()));
["history-status", "history-source"].forEach((id) => $(`#${id}`).addEventListener("change", loadHistory));
App.loaders.history = loadHistory;

// ===================================================================== Connections
const DB_PRESETS = {
  "": { label: "Choose a database…", url: "" },
  postgresql: { label: "PostgreSQL / RDS Postgres / Aurora Postgres", url: "postgresql+psycopg2://USER@HOST:5432/DATABASE" },
  mysql: { label: "MySQL / MariaDB / RDS MySQL", url: "mysql+pymysql://USER@HOST:3306/DATABASE" },
  mssql: { label: "Microsoft SQL Server / Azure SQL / RDS SQL Server", url: "mssql+pymssql://USER@HOST:1433/DATABASE" },
  oracle: { label: "Oracle", url: "oracle+oracledb://USER@HOST:1521/?service_name=SERVICE" },
  snowflake: { label: "Snowflake", url: "snowflake://USER@ACCOUNT/DATABASE/SCHEMA?warehouse=WAREHOUSE&role=ROLE" },
  bigquery: { label: "Google BigQuery (uses Google credentials on this computer)", url: "bigquery://PROJECT/DATASET" },
  databricks: { label: "Databricks SQL", url: "databricks://token@HOST?http_path=/sql/1.0/warehouses/ID&catalog=CATALOG&schema=SCHEMA" },
  sqlite: { label: "SQLite file", url: "sqlite:///C:/path/to/file.db" },
};
const CONN_FIELDS = {
  athena: [
    ["region", "AWS region", "us-west-2"], ["workgroup", "Workgroup", "primary"],
    ["output_location", "Query results location (optional if the workgroup sets one)", "s3://my-athena-results/"],
    ["database", "Default database (optional)", ""], ["catalog", "Data catalog", "AwsDataCatalog"],
    ["upload_location", "Upload location for file uploads (optional)", "s3://my-bucket/uploads/"],
  ],
  redshift: [
    ["region", "AWS region", "us-west-2"], ["database", "Database", "dev"],
    ["workgroup_name", "Serverless workgroup name (Serverless)", ""], ["cluster_identifier", "Cluster identifier (provisioned)", ""],
    ["secret_arn", "Secrets Manager ARN for DB credentials (recommended)", "arn:aws:secretsmanager:…"],
    ["db_user", "…or database user for IAM temporary credentials (provisioned only)", ""],
    ["upload_location", "S3 staging folder for file uploads (optional)", "s3://my-bucket/redshift-staging/"],
    ["copy_iam_role", "IAM role ARN Redshift uses for COPY (optional)", "arn:aws:iam::…:role/…"],
  ],
  rds_data: [
    ["region", "AWS region", "us-west-2"], ["resource_arn", "Aurora cluster ARN", "arn:aws:rds:…:cluster:…"],
    ["secret_arn", "Secrets Manager ARN for DB credentials", "arn:aws:secretsmanager:…"],
    ["database", "Database", ""], ["engine", "Engine (postgres or mysql)", "postgres"],
  ],
  sql: [
    ["url", "Connection URL (no password)", ""],
    ["secret_arn", "AWS Secrets Manager ARN for username/password (optional)", "arn:aws:secretsmanager:…"],
    ["region", "AWS region for Secrets Manager", "us-west-2"],
    ["password_env", "…or name of an environment variable holding the password (servers)", ""],
  ],
};
function renderConnFields(type, cfg = {}) {
  let html = "";
  if (type === "sql") {
    const scheme = (cfg.url || "").split(":")[0].split("+")[0];
    html += `<label>Database <select id="db-preset">${Object.entries(DB_PRESETS).map(([k, v]) => `<option value="${k}" ${k === scheme ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label>`;
  }
  html += CONN_FIELDS[type].map(([k, label, ph]) => `<label>${esc(label)} <input data-cfg="${k}" placeholder="${esc(ph)}" value="${esc(cfg[k] ?? "")}"></label>`).join("");
  if (type === "sql") {
    html += `<label>Password ${cfg.password_saved ? '<span class="ok">(saved in this computer’s credential store — leave blank to keep)</span>' : '<span class="muted">(saved securely in Windows Credential Manager, not in DataTerm)</span>'}
      <input type="password" id="conn-password" autocomplete="new-password"></label>`;
  }
  $("#conn-fields").innerHTML = html;
  $("#db-preset")?.addEventListener("change", (e) => {
    const url = $('[data-cfg="url"]');
    url.placeholder = DB_PRESETS[e.target.value].url;
    if (!url.value || Object.values(DB_PRESETS).some((p) => p.url === url.value)) url.value = DB_PRESETS[e.target.value].url;
    url.focus();
  });
}
function resetConnForm() {
  const f = $("#conn-form");
  f.reset(); f.id.value = "";
  $("#conn-form-title").textContent = "New connection";
  renderConnFields(f.type.value);
}
$("#conn-type").addEventListener("change", (e) => renderConnFields(e.target.value));
$("#conn-reset").addEventListener("click", resetConnForm);
$("#conn-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const existing = App.connections.find((c) => String(c.id) === f.id.value);
  const config = {};
  if (existing?.config.password_saved) config.password_saved = true;
  f.querySelectorAll("[data-cfg]").forEach((i) => { if (i.value.trim()) config[i.dataset.cfg] = i.value.trim(); });
  if (config.url && /:\/\/[^/@]*:[^/@]*@/.test(config.url)) { alert("Remove the password from the URL and type it in the Password box instead."); return; }
  const body = { name: f.name.value, type: f.type.value, config };
  try {
    const saved = await api(f.id.value ? `/api/connections/${f.id.value}` : "/api/connections", { method: f.id.value ? "PUT" : "POST", body });
    const pw = $("#conn-password")?.value;
    if (pw) await api(`/api/connections/${saved.id}/password`, { method: "POST", body: { password: pw } });
    toast(`Saved connection "${saved.name}"`);
    resetConnForm();
    await Editor.loadConnections();
  } catch (err) { alert(err.message); }
});
function renderConnTable() {
  const typeName = { athena: "Athena", redshift: "Redshift", rds_data: "Aurora", sql: "Database" };
  $("#conn-table").innerHTML = `<tr><th>Name</th><th>Type</th><th>Settings</th><th></th></tr>` +
    (App.connections.length ? App.connections.map((c) => `<tr><td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.type === "sql" ? (c.config.url || "").split(":")[0].split("+")[0] || "Database" : typeName[c.type])}</td>
      <td class="sql">${esc(Object.entries(c.config).filter(([k]) => k !== "password_saved").map(([k, v]) => `${k}: ${v}`).join("\n"))}${c.config.password_saved ? "\npassword: saved 🔒" : ""}</td>
      <td><div class="row"><button class="small" data-test="${c.id}">Test</button><button class="small" data-edit="${c.id}">Edit</button>
      <button class="small danger" data-delconn="${c.id}">Delete</button></div><div id="test-${c.id}"></div></td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">No connections yet. Add one above.</td></tr>`);
}
document.addEventListener("connections-changed", () => { renderConnTable(); fillUploadConnections(); });
$("#conn-table").addEventListener("click", async (e) => {
  const t = e.target;
  const c = App.connections.find((x) => x.id === Number(t.dataset.test || t.dataset.edit || t.dataset.delconn));
  if (!c) return;
  if (t.dataset.test) {
    const out = $(`#test-${c.id}`);
    out.className = "muted"; out.textContent = "Testing…";
    const r = await api(`/api/connections/${c.id}/test`, { method: "POST" });
    out.className = r.ok ? "ok" : "error"; out.textContent = r.message;
  } else if (t.dataset.edit) {
    const f = $("#conn-form");
    f.id.value = c.id; f.name.value = c.name; f.type.value = c.type;
    $("#conn-form-title").textContent = `Edit ${c.name}`;
    renderConnFields(c.type, c.config);
    f.scrollIntoView({ behavior: "smooth" });
  } else if (t.dataset.delconn && confirm(`Delete connection "${c.name}"?`)) {
    try { await api(`/api/connections/${c.id}`, { method: "DELETE" }); await Editor.loadConnections(); } catch (err) { alert(err.message); }
  }
});

// ===================================================================== Settings & backups
async function loadSettings() {
  try {
    const s = await api("/api/settings");
    const f = $("#settings-form");
    Object.entries(s).forEach(([k, v]) => { if (f[k]) f[k].value = v; });
  } catch (e) { $("#settings-result").textContent = e.message; }
  loadBackups();
}
$("#settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const values = {};
  $$("#settings-form [name]").forEach((i) => (values[i.name] = i.value));
  try { await api("/api/settings", { method: "PUT", body: values }); toast("Settings saved"); loadBackups(); }
  catch (err) { $("#settings-result").className = "error"; $("#settings-result").textContent = err.message; }
});
$("#test-email-btn").addEventListener("click", async () => {
  const out = $("#test-email-result");
  out.className = "muted"; out.textContent = "Sending…";
  const r = await api("/api/settings/test-email", { method: "POST", body: { to: $("#test-email-to").value } });
  out.className = r.ok ? "ok" : "error"; out.textContent = r.message;
});
async function loadBackups() {
  try {
    const b = await api("/api/backups");
    $("#backup-where").textContent = `Saved in ${b.dir}${b.s3 ? ` and ${b.s3}` : ""}.`;
    $("#backup-table").innerHTML = `<tr><th>Backup</th><th>Size</th><th>Made</th><th></th></tr>` + (b.files.length ? b.files.map((f) =>
      `<tr><td>${esc(f.name)}</td><td class="num">${fmtSize(f.size)}</td><td>${fmtTime(f.modified)}</td><td><button class="small" data-restore="${esc(f.name)}">Restore</button></td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">No backups yet.</td></tr>`);
  } catch (e) { $("#backup-where").textContent = e.message; }
}
const confirmRestore = () => confirm("Restore replaces all connections, saved queries, schedules and settings with the backup's. A backup of the current state is made first. Continue?");
async function afterRestore(r) {
  toast(r.message);
  $("#backup-result").className = "ok"; $("#backup-result").textContent = r.message;
  await Editor.loadConnections();
  loadSettings();
}
$("#backup-now").addEventListener("click", async () => {
  try { const r = await api("/api/backups", { method: "POST" }); toast("Backup saved"); $("#backup-result").className = "ok"; $("#backup-result").textContent = r.message; loadBackups(); }
  catch (e) { $("#backup-result").className = "error"; $("#backup-result").textContent = e.message; }
});
$("#backup-table").addEventListener("click", async (e) => {
  const name = e.target.dataset.restore;
  if (!name || !confirmRestore()) return;
  try { await afterRestore(await api(`/api/backups/restore/${encodeURIComponent(name)}`, { method: "POST" })); } catch (err) { alert(err.message); }
});
$("#restore-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !confirmRestore()) { e.target.value = ""; return; }
  const fd = new FormData();
  fd.append("file", file);
  try { await afterRestore(await api("/api/backups/restore-upload", { method: "POST", body: fd })); } catch (err) { alert(err.message); }
  e.target.value = "";
});
App.loaders.settings = loadSettings;

// ===================================================================== Binary background (0s and 1s in brand blue)
(function binaryBackground() {
  const canvas = $("#binary-bg");
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cols = [], w = 0, h = 0, size = 16, last = 0, raf = 0;
  const brand = () => cssVar("--brand-rgb") || "10, 91, 211";
  const dark = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = w < 700 ? 13 : 16;
    const n = Math.ceil(w / size);
    cols = Array.from({ length: n }, () => ({ y: Math.random() * h, speed: 0.25 + Math.random() * 0.9, depth: Math.random() }));
    draw(true);
  }

  function draw(full) {
    const rgb = brand();
    const base = dark() ? 0.22 : 0.13;
    if (full) ctx.clearRect(0, 0, w, h);
    else { ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = "source-over"; }
    ctx.textBaseline = "top";
    cols.forEach((c, i) => {
      // depth gives a parallax 3D feel: near columns are larger, brighter and faster
      const fs = size * (0.7 + c.depth * 0.6);
      ctx.font = `${c.depth > 0.6 ? 700 : 500} ${fs}px Consolas, "Cascadia Code", monospace`;
      if (full) {
        for (let y = (c.y % fs) - fs; y < h; y += fs * 1.1) {
          ctx.fillStyle = `rgba(${rgb}, ${(base * (0.35 + c.depth * 0.65)).toFixed(3)})`;
          ctx.fillText(Math.random() < 0.5 ? "0" : "1", i * size, y);
        }
        return;
      }
      ctx.shadowColor = `rgba(${rgb}, ${dark() ? 0.8 : 0.35})`;
      ctx.shadowBlur = c.depth > 0.75 ? 8 : 0;
      ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, base * 2.6 * (0.35 + c.depth * 0.65)).toFixed(3)})`;
      ctx.fillText(Math.random() < 0.5 ? "0" : "1", i * size, c.y);
      c.y += fs * c.speed;
      if (c.y > h + fs) { c.y = -fs * (1 + Math.random() * 20); c.depth = Math.random(); }
    });
    ctx.shadowBlur = 0;
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 66) return; // ~15 fps is plenty for a background and easy on laptops
    last = t;
    draw(false);
  }

  addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); if (!still) raf = requestAnimationFrame(loop); });
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden && !still) raf = requestAnimationFrame(loop); });
  resize();
  if (!still) raf = requestAnimationFrame(loop);
})();

// ===================================================================== Boot
(async function boot() {
  resetConnForm();
  try {
    App.me = await api("/api/me");
    $("#app-version").textContent = `v${App.me.version}`;
    $("#whoami").textContent = App.me.user;
    $("#nav-settings").hidden = !App.me.is_admin;
    $("#git-sync-btn").hidden = !App.me.is_admin;
  } catch { /* server not reachable yet */ }
  await Editor.loadConnections();
  if (!App.connections.length) showTab("connections");
})();

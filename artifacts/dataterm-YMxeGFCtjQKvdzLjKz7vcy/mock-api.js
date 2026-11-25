"use strict";
/* Preview only: answers DataTerm's /api calls in the browser with demo data, so the real interface runs without a server. */
(function () {
  // ---------------------------------------------------------------- demo data
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const REGIONS = ["West", "East", "Central", "South"], PRODUCTS = ["Fiber", "Wireless", "TV", "Solar"];
  const ORDERS = Array.from({ length: 500 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 1) + Math.floor(rnd() * 300) * 864e5);
    return [i + 1, d.toISOString().slice(0, 10), pick(REGIONS), `Rep ${1 + Math.floor(rnd() * 9)}`, pick(PRODUCTS), Math.round((40 + rnd() * 860) * 100) / 100];
  });
  const ORDER_COLS = ["id", "order_date", "region", "rep", "product", "amount"];
  const now = () => new Date().toISOString();
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

  const db = {
    me: { user: "demo.user", is_admin: true, email_configured: true, version: "0.1.0" },
    connections: [
      { id: 1, name: "Sales (demo)", type: "sql", config: { url: "postgresql+psycopg2://analytics.cydcor.internal:5432/sales", password_saved: true } },
      { id: 2, name: "Data lake (Athena)", type: "athena", config: { region: "us-west-2", workgroup: "primary", database: "sales_lake", output_location: "s3://cydcor-athena-results/" } },
      { id: 3, name: "Warehouse (Redshift)", type: "redshift", config: { region: "us-west-2", workgroup_name: "analytics", database: "dev", secret_arn: "arn:aws:secretsmanager:us-west-2:…:secret:redshift" } },
    ],
    schema: {
      1: { public: { orders: { type: "TABLE", cols: [["id", "integer"], ["order_date", "date"], ["region", "text"], ["rep", "text"], ["product", "text"], ["amount", "numeric(10,2)"]] },
                     reps: { type: "TABLE", cols: [["rep", "text"], ["office", "text"], ["hired_on", "date"]] },
                     products: { type: "TABLE", cols: [["product", "text"], ["category", "text"], ["list_price", "numeric"]] } },
           analytics: { region_totals: { type: "VIEW", cols: [["region", "text"], ["total", "numeric"]] } } },
      2: { sales_lake: { orders_raw: { type: "EXTERNAL_TABLE", cols: [["order_id", "bigint"], ["order_ts", "timestamp"], ["region", "string"], ["amount", "double"], ["dt", "string (partition)"]] },
                         campaigns: { type: "EXTERNAL_TABLE", cols: [["campaign_id", "string"], ["channel", "string"], ["spend", "double"]] } },
           marketing: { leads: { type: "EXTERNAL_TABLE", cols: [["lead_id", "string"], ["source", "string"], ["created", "date"]] } } },
      3: { public: { fact_sales: { type: "TABLE", cols: [["sale_id", "bigint"], ["sale_date", "date"], ["region", "varchar"], ["revenue", "numeric"]] } } },
    },
    queries: [
      { id: 1, name: "Orders since", folder: "Sales", description: "All orders on or after a start date", visibility: "shared", connection_id: 1, version: 3,
        sql: "SELECT *\nFROM orders\nWHERE order_date >= '${start:2026-06-01}'", created_by: "demo.user", updated_by: "demo.user", updated_at: ago(60 * 26) },
      { id: 2, name: "Revenue by region", folder: "Sales", description: "Monthly roll-up for the ops review", visibility: "shared", connection_id: 1, version: 1,
        sql: "SELECT region, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue\nFROM {{ ref('Sales/Orders since') }} o\nGROUP BY region\nORDER BY revenue DESC;", created_by: "demo.user", updated_by: "demo.user", updated_at: ago(60 * 3) },
      { id: 3, name: "Negative amounts", folder: "Data quality", description: "Should always return nothing", visibility: "shared", connection_id: 1, version: 2,
        sql: "SELECT * FROM orders WHERE amount < 0", created_by: "demo.user", updated_by: "demo.user", updated_at: ago(60 * 24 * 4) },
      { id: 4, name: "My scratch", folder: "Personal", description: "", visibility: "private", connection_id: 2, version: 1,
        sql: "SELECT region, SUM(amount) FROM sales_lake.orders_raw WHERE dt >= '2026-11-01' GROUP BY 1", created_by: "demo.user", updated_by: "demo.user", updated_at: ago(15) },
    ],
    versions: {},
    schedules: [
      { id: 1, saved_query_id: 2, cron: "0 7 * * 1-5", timezone: "America/Los_Angeles", action: "deliver", destination: "s3://cydcor-reports/daily/", fmt: "xlsx",
        target: "", publish_as: "table", params: { start: "2026-01-01" }, notify_emails: "ops@cydcor.com", notify_on: "failure", enabled: true, created_by: "demo.user", next_run: ago(-60 * 13) },
      { id: 2, saved_query_id: 3, cron: "30 6 * * *", timezone: "America/Los_Angeles", action: "test", destination: "", fmt: "csv",
        target: "", publish_as: "table", params: {}, notify_emails: "data@cydcor.com", notify_on: "failure", enabled: true, created_by: "demo.user", next_run: ago(-60 * 12) },
      { id: 3, saved_query_id: 2, cron: "0 2 * * *", timezone: "America/Los_Angeles", action: "publish", destination: "", fmt: "csv",
        target: "analytics.region_totals", publish_as: "view", params: {}, notify_emails: "", notify_on: "never", enabled: false, created_by: "demo.user", next_run: null },
    ],
    runs: [],
    settings: { smtp_host: "smtp.cydcor.com", smtp_port: "587", smtp_security: "starttls", smtp_user: "", smtp_from: "dataterm@cydcor.com", ses_from: "", ses_region: "",
                ai_provider: "bedrock", ai_region: "us-west-2", ai_model: "", git_repo_dir: "C:\\repos\\analytics-sql", git_push: "0",
                backup_dir: "", backup_keep: "30", backup_s3_uri: "s3://cydcor-backups/dataterm/" },
    backups: [
      { name: "dataterm-backup-20261111-021500-auto.json", size: 48211, modified: ago(60 * 7) },
      { name: "dataterm-backup-20261110-021500-auto.json", size: 47702, modified: ago(60 * 31) },
      { name: "dataterm-backup-20261109-021500-auto.json", size: 46120, modified: ago(60 * 55) },
    ],
  };
  db.queries.forEach((q) => (db.versions[q.id] = Array.from({ length: q.version }, (_, i) => ({
    id: q.id * 100 + i + 1, version: i + 1, name: q.name, folder: q.folder,
    sql: i + 1 === q.version ? q.sql : q.sql.replace(/\$\{start:[^}]*\}/, `\${start:2026-0${i + 1}-01}`).replace(/ORDER BY.*$/s, "") + `\n-- version ${i + 1}`,
    edited_by: "demo.user", edited_at: ago(60 * 24 * (q.version - i)) }))));
  [["select region, count(*) from orders group by 1", "succeeded", 4, "editor", 30], ["select * from orders_raw where dt = '2026-11-10'", "succeeded", 1873, "editor", 95],
   ["Revenue by region (scheduled deliver)", "succeeded", 4, "schedule", 60 * 8], ["select * from leads limit 10", "failed", null, "editor", 60 * 9],
   ["Negative amounts (data test)", "succeeded", 0, "schedule", 60 * 9 + 30]].forEach(([sql, status, rows, source, min], i) =>
    db.runs.push({ id: i + 1, connection_id: i === 1 || i === 3 ? 2 : 1, sql, status, source, schedule_id: source === "schedule" ? 1 : null, user: "demo.user",
      row_count: rows, truncated: false, error: status === "failed" ? "TABLE_NOT_FOUND: line 1:15: Table 'awsdatacatalog.sales_lake.leads' does not exist" : null,
      output_uri: source === "schedule" && rows ? "s3://cydcor-reports/daily/Revenue_by_region_20261111_070002.xlsx" : null,
      started_at: ago(min), finished_at: ago(min - 0.04) }));
  let nextRun = db.runs.length + 1;

  // ---------------------------------------------------------------- SQL emulation
  const PARAM_RE = /\$\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?::([^}]*))?\}/g;
  const REF_RE = /\{\{\s*ref\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g;
  function lookup(key) {
    const q = db.queries.find((x) => `${x.folder}/${x.name}` === key) || db.queries.find((x) => x.name === key);
    return q ? q.sql : null;
  }
  function expandRefs(sql, stack = []) {
    return sql.replace(REF_RE, (_, key) => {
      if (stack.includes(key)) throw new Error(`Circular reference: ${[...stack, key].join(" -> ")}`);
      const body = lookup(key);
      if (body === null) throw new Error(`ref('${key}') not found in the catalog`);
      return `(\n${expandRefs(body, [...stack, key]).trim().replace(/;$/, "")}\n)`;
    });
  }
  function findParams(sql) {
    const seen = new Map();
    for (const m of sql.matchAll(PARAM_RE)) if (!seen.has(m[1])) seen.set(m[1], { name: m[1], default: m[2] !== undefined ? m[2].trim() : null });
    return [...seen.values()];
  }
  function render(sql, params = {}) {
    const ex = expandRefs(sql);
    const missing = findParams(ex).filter((p) => !(p.name in params) && p.default === null).map((p) => p.name);
    if (missing.length) throw new Error(`Missing value for parameter(s): ${missing.join(", ")}`);
    return ex.replace(PARAM_RE, (_, n, d) => (params[n] !== undefined && params[n] !== "" ? params[n] : (d || "").trim()));
  }
  function splitSql(sql) { return window.splitSql ? window.splitSql(sql).map((s) => s.text.trim()) : sql.split(";").map((s) => s.trim()).filter(Boolean); }

  const KNOWN = new Set(["orders", "reps", "products", "region_totals", "orders_raw", "campaigns", "leads", "fact_sales", "dual"]);
  function execute(sql) {
    const s = sql.toLowerCase().replace(/\s+/g, " ").trim();
    const from = [...s.matchAll(/\b(?:from|join)\s+([a-z_][\w.]*)/g)].map((m) => m[1].split(".").pop());
    const bad = from.find((t) => !KNOWN.has(t));
    if (bad) throw new Error(`relation "${bad}" does not exist`);
    let rows = ORDERS;
    const since = s.match(/order_date >= '(\d{4}-\d{2}-\d{2})'/);
    if (since) rows = rows.filter((r) => r[1] >= since[1]);
    const region = s.match(/region\s*=\s*'(\w+)'/);
    if (region) rows = rows.filter((r) => r[2].toLowerCase() === region[1]);
    if (s.startsWith("explain")) return { columns: ["QUERY PLAN"], rows: [["Sort  (cost=41.62..41.63 rows=4 width=72)"], ["  Sort Key: (sum(orders.amount)) DESC"], ["  ->  HashAggregate  (cost=41.50..41.58 rows=4 width=72)"], ["        Group Key: orders.region"], ["        ->  Seq Scan on orders  (cost=0.00..35.00 rows=500 width=40)"]] };
    if (/^(create|insert|update|delete|drop|alter)/.test(s)) return { columns: ["rows_affected"], rows: [[s.startsWith("insert") ? 1 : 0]] };
    if (/group by/.test(s)) {
      const byProduct = /product/.test(s.split("from")[0]);
      const groups = new Map();
      rows.forEach((r) => { const k = byProduct ? `${r[2]}|${r[4]}` : r[2]; const g = groups.get(k) || [0, 0]; g[0]++; g[1] += r[5]; groups.set(k, g); });
      const out = [...groups.entries()].map(([k, [n, sum]]) => [...k.split("|"), n, Math.round(sum * 100) / 100]).sort((a, b) => b[b.length - 1] - a[a.length - 1]);
      return { columns: byProduct ? ["region", "product", "orders", "revenue"] : ["region", "orders", "revenue"], rows: out };
    }
    if (/count\(\*\)/.test(s)) return { columns: [s.match(/count\(\*\)\s+(?:as\s+)?(\w+)/)?.[1] || "count"], rows: [[rows.length]] };
    if (/^select 1\b/.test(s)) return { columns: ["hello"], rows: [[1]] };
    const lim = Number(s.match(/limit (\d+)/)?.[1] || 200);
    return { columns: ORDER_COLS, rows: rows.slice(0, Math.min(lim, 2000)) };
  }

  function startRuns(conn, statements) {
    const ids = [];
    let t = Date.now(), failed = false;
    statements.forEach((st) => {
      const run = { id: nextRun++, connection_id: conn, sql: st, status: "running", source: "editor", user: db.me.user, schedule_id: null, truncated: false, output_uri: null,
                    started_at: new Date(t).toISOString(), finished_at: null, _done: t + 350 + Math.random() * 500 };
      if (failed) { Object.assign(run, { status: "cancelled", error: "Skipped: an earlier statement in the script did not succeed", finished_at: now(), _done: 0 }); }
      else {
        try { run._result = execute(st); run.row_count = run._result.rows.length; }
        catch (e) { run._error = e.message; failed = true; }
      }
      t = run._done || t;
      db.runs.push(run); ids.push(run.id);
    });
    return ids;
  }
  function runView(r) {
    if (r.status === "running" && Date.now() >= r._done) {
      r.finished_at = new Date(r._done).toISOString();
      if (r._error) { r.status = "failed"; r.error = r._error; r.row_count = null; } else r.status = "succeeded";
    }
    const { _result, _error, _done, ...out } = r;
    if (r.status === "succeeded" && _result) Object.assign(out, { columns: _result.columns, rows: _result.rows, result_available: true });
    else out.result_available = false;
    return out;
  }

  const AI = {
    generate: "Here's a query for revenue by region over the last 30 days, using `orders`:\n```sql\nSELECT region,\n       COUNT(*)              AS orders,\n       ROUND(SUM(amount), 2) AS revenue\nFROM orders\nWHERE order_date >= CURRENT_DATE - INTERVAL '30 days'\nGROUP BY region\nORDER BY revenue DESC;\n```\nIt counts orders and sums `amount` per region, newest 30 days only.",
    explain: "This query:\n1. Pulls orders on or after the start date (from the catalog query \"Orders since\").\n2. Groups them by region.\n3. Counts orders and adds up the amount for each region.\n4. Lists the regions with the most revenue first.",
    optimize: "Two changes make this cheaper:\n- Filter on `order_date` before grouping, so the database can use the date index.\n- Select only the columns you need instead of `*`.\n```sql\nSELECT region, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue\nFROM orders\nWHERE order_date >= DATE '2026-06-01'\nGROUP BY region\nORDER BY revenue DESC;\n```",
    fix: "The table name is misspelled: there's no `nope` table. You probably meant `orders`:\n```sql\nSELECT * FROM orders LIMIT 100;\n```",
    chat: "Yes. `reps.rep` matches `orders.rep`, so you can join them:\n```sql\nSELECT r.office, SUM(o.amount) AS revenue\nFROM orders o\nJOIN reps r ON r.rep = o.rep\nGROUP BY r.office;\n```",
  };

  // ---------------------------------------------------------------- router
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fail = (status, detail) => json({ detail }, status);
  const schedOut = (s) => ({ ...s, last_run_id: null });

  async function handle(method, url, body) {
    const u = new URL(url, location.href);
    const p = u.pathname.replace(/^.*?\/api\//, "/api/");
    const q = u.searchParams;
    let m;
    if (p === "/api/me") return json(db.me);
    if (p === "/api/version") return json({ version: db.me.version });

    if (p === "/api/connections" && method === "GET") return json(db.connections);
    if (p === "/api/connections" && method === "POST") { const c = { id: Math.max(...db.connections.map((x) => x.id)) + 1, ...body }; db.connections.push(c); db.schema[c.id] = { public: { orders: db.schema[1].public.orders } }; return json(c); }
    if ((m = p.match(/^\/api\/connections\/(\d+)$/))) {
      const c = db.connections.find((x) => x.id === +m[1]);
      if (method === "PUT") { Object.assign(c, body); return json(c); }
      if (method === "DELETE") { db.connections = db.connections.filter((x) => x !== c); return json({ ok: true }); }
    }
    if ((m = p.match(/^\/api\/connections\/(\d+)\/test$/))) return json({ ok: true, message: `Connected. ${Object.keys(db.schema[+m[1]] || {}).length} databases/schemas visible.` });
    if ((m = p.match(/^\/api\/connections\/(\d+)\/password$/))) { const c = db.connections.find((x) => x.id === +m[1]); c.config.password_saved = true; return json(c); }
    if ((m = p.match(/^\/api\/connections\/(\d+)\/schema$/))) return json(Object.keys(db.schema[+m[1]] || {}));
    if ((m = p.match(/^\/api\/connections\/(\d+)\/schema\/([^/]+)$/))) {
      const ns = (db.schema[+m[1]] || {})[decodeURIComponent(m[2])] || {};
      return json(Object.entries(ns).map(([name, t]) => ({ name, type: t.type })));
    }
    if ((m = p.match(/^\/api\/connections\/(\d+)\/schema\/([^/]+)\/([^/]+)(\/preview|\/ddl)?$/))) {
      const t = ((db.schema[+m[1]] || {})[decodeURIComponent(m[2])] || {})[decodeURIComponent(m[3])];
      if (!t) return fail(404, "Table not found");
      if (m[4] === "/ddl") return json({ ddl: `CREATE TABLE ${decodeURIComponent(m[2])}.${decodeURIComponent(m[3])} (\n${t.cols.map(([n, ty]) => `  ${n} ${ty.replace(" (partition)", "")}`).join(",\n")}\n);` });
      if (m[4] === "/preview") {
        if (decodeURIComponent(m[3]) === "orders") return json({ columns: ORDER_COLS, rows: ORDERS.slice(0, 100), truncated: false });
        return json({ columns: t.cols.map((c) => c[0]), rows: Array.from({ length: 12 }, (_, i) => t.cols.map(([n, ty]) => (/int|numeric|double/.test(ty) ? Math.round(rnd() * 1000 * 100) / 100 : /date|time/.test(ty) ? `2026-1${i % 2}-0${1 + (i % 9)}` : `${n}_${i + 1}`))), truncated: false });
      }
      return json(t.cols.map(([name, type]) => ({ name, type })));
    }
    if ((m = p.match(/^\/api\/connections\/(\d+)\/upload$/))) {
      const file = body.get("file");
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const cols = lines[0].split(",").map((h, i) => h.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "") || `column_${i + 1}`);
      const rows = lines.slice(1).map((l) => l.split(","));
      const types = cols.map((_, i) => (rows.every((r) => /^-?\d+$/.test((r[i] || "").trim())) ? "bigint" : rows.every((r) => /^-?\d*\.?\d+$/.test((r[i] || "").trim())) ? "double" : rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test((r[i] || "").trim())) ? "date" : "string"));
      if (body.get("preview") === "true") return json({ columns: cols, types, rows: rows.slice(0, 20), row_count: rows.length, suggested_table: file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_]+/g, "_") });
      return json({ ok: true, message: `Loaded ${rows.length.toLocaleString()} rows into ${body.get("namespace")}.${body.get("table")} (preview: nothing was written)` });
    }

    if (p === "/api/sql/params") { try { return json(findParams(expandRefs(body.sql))); } catch (e) { return fail(400, e.message); } }
    if (p === "/api/runs" && method === "POST") {
      let sql;
      try { sql = render(body.sql, body.params); } catch (e) { return fail(400, e.message); }
      const sts = body.mode === "all" ? splitSql(sql) : [sql.trim().replace(/;$/, "")];
      if (!sts.length) return fail(400, "SQL is empty");
      const ids = startRuns(body.connection_id, sts);
      return json({ id: ids[0], ids });
    }
    if (p === "/api/runs" && method === "GET") {
      let rs = db.runs.map(runView).reverse();
      if (q.get("q")) rs = rs.filter((r) => r.sql.toLowerCase().includes(q.get("q").toLowerCase()));
      if (q.get("status")) rs = rs.filter((r) => r.status === q.get("status"));
      if (q.get("source")) rs = rs.filter((r) => r.source === q.get("source"));
      if (q.get("user")) rs = rs.filter((r) => r.user.includes(q.get("user")));
      return json(rs.map(({ columns, rows, ...r }) => r));
    }
    if ((m = p.match(/^\/api\/runs\/(\d+)$/))) return json(runView(db.runs.find((r) => r.id === +m[1])));
    if ((m = p.match(/^\/api\/runs\/(\d+)\/cancel$/))) { const r = db.runs.find((x) => x.id === +m[1]); if (r.status === "running") Object.assign(r, { status: "cancelled", error: "Cancelled", finished_at: now(), _done: 0 }); return json({ ok: true }); }

    if (p === "/api/queries" && method === "GET") {
      const s = (q.get("search") || "").toLowerCase();
      return json(db.queries.filter((x) => !s || [x.name, x.sql, x.folder, x.description].join(" ").toLowerCase().includes(s))
        .sort((a, b) => (a.folder + a.name).localeCompare(b.folder + b.name)));
    }
    if (p === "/api/queries" && method === "POST") {
      const x = { id: Math.max(...db.queries.map((y) => y.id)) + 1, ...body, version: 1, created_by: db.me.user, updated_by: db.me.user, updated_at: now() };
      db.queries.push(x); db.versions[x.id] = [{ id: x.id * 100 + 1, version: 1, name: x.name, folder: x.folder, sql: x.sql, edited_by: db.me.user, edited_at: now() }];
      return json(x);
    }
    if ((m = p.match(/^\/api\/queries\/(\d+)$/))) {
      const x = db.queries.find((y) => y.id === +m[1]);
      if (method === "DELETE") { db.queries = db.queries.filter((y) => y !== x); db.schedules = db.schedules.filter((s) => s.saved_query_id !== x.id); return json({ ok: true }); }
      const changed = x.sql !== body.sql || x.name !== body.name || x.folder !== body.folder;
      Object.assign(x, body, { updated_by: db.me.user, updated_at: now() });
      if (changed) { x.version++; db.versions[x.id].push({ id: x.id * 100 + x.version, version: x.version, name: x.name, folder: x.folder, sql: x.sql, edited_by: db.me.user, edited_at: now() }); }
      return json(x);
    }
    if ((m = p.match(/^\/api\/queries\/(\d+)\/versions$/))) return json([...(db.versions[+m[1]] || [])].reverse());
    if ((m = p.match(/^\/api\/queries\/(\d+)\/restore\/(\d+)$/))) {
      const x = db.queries.find((y) => y.id === +m[1]); const v = db.versions[x.id].find((y) => y.id === +m[2]);
      x.sql = v.sql; x.version++; x.updated_at = now();
      db.versions[x.id].push({ ...v, id: x.id * 100 + x.version, version: x.version, edited_at: now() });
      return json(x);
    }
    if (p === "/api/catalog/git-sync") return json({ message: `Committed ${db.queries.filter((x) => x.visibility === "shared").length} queries to C:\\repos\\analytics-sql (preview)` });

    if (p === "/api/schedules" && method === "GET") return json(db.schedules.map(schedOut));
    if (p === "/api/schedules" && method === "POST") { const s = { id: Math.max(0, ...db.schedules.map((x) => x.id)) + 1, ...body, created_by: db.me.user, next_run: body.enabled ? ago(-60 * 14) : null }; db.schedules.push(s); return json(schedOut(s)); }
    if ((m = p.match(/^\/api\/schedules\/(\d+)$/))) {
      const s = db.schedules.find((x) => x.id === +m[1]);
      if (method === "DELETE") { db.schedules = db.schedules.filter((x) => x !== s); return json({ ok: true }); }
      Object.assign(s, body, { next_run: body.enabled ? ago(-60 * 14) : null }); return json(schedOut(s));
    }
    if ((m = p.match(/^\/api\/schedules\/(\d+)\/run$/))) {
      const s = db.schedules.find((x) => x.id === +m[1]); const sq = db.queries.find((x) => x.id === s.saved_query_id);
      const r = execute(render(sq.sql, s.params));
      const out = { id: nextRun++, status: s.action === "test" && r.rows.length ? "failed" : "succeeded", row_count: r.rows.length, sql: sq.sql, source: "schedule", user: db.me.user, connection_id: sq.connection_id,
        error: s.action === "test" && r.rows.length ? `Test failed: ${r.rows.length} row(s) returned (expected none)` : null,
        output_uri: s.action === "publish" ? `${s.publish_as} ${s.target}` : s.action === "deliver" ? `${s.destination || "exports/"}${sq.name.replace(/\W+/g, "_")}_20261111.${s.fmt}` : null,
        started_at: now(), finished_at: now() };
      db.runs.push(out); return json(out);
    }

    if (p === "/api/ai") { await new Promise((r) => setTimeout(r, 900)); return json({ answer: AI[body.task] || AI.chat }); }
    if (p === "/api/settings" && method === "GET") return json(db.settings);
    if (p === "/api/settings" && method === "PUT") { Object.assign(db.settings, body); return json(db.settings); }
    if (p === "/api/settings/test-email") return json({ ok: true, message: `Sent to ${body.to || "you"} (preview: no email was sent)` });
    if (p === "/api/backups" && method === "GET") return json({ dir: "C:\\Users\\demo.user\\AppData\\Roaming\\DataTerm\\backups", s3: db.settings.backup_s3_uri, files: db.backups });
    if (p === "/api/backups" && method === "POST") {
      const name = `dataterm-backup-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 8)}-${new Date().toTimeString().slice(0, 8).replace(/:/g, "")}-manual.json`;
      db.backups.unshift({ name, size: 48390, modified: now() });
      return json({ message: `Backed up to C:\\Users\\demo.user\\AppData\\Roaming\\DataTerm\\backups\\${name} and ${db.settings.backup_s3_uri}${name}` });
    }
    if (p.startsWith("/api/backups/restore")) return json({ message: "Restored 3 connections, 4 saved queries, 9 query versions, 3 schedules, 15 settings (preview: nothing changed)" });

    if (p === "/api/s3/buckets") return json(["cydcor-athena-results", "cydcor-backups", "cydcor-data-lake", "cydcor-reports"]);
    if (p === "/api/s3/list") {
      const prefix = q.get("prefix") || "";
      if (!prefix) return json({ folders: ["daily/", "monthly/", "adhoc/"], files: [{ key: "README.txt", size: 1240, modified: ago(60 * 24 * 30) }], next_token: null });
      return json({ folders: [], files: Array.from({ length: 6 }, (_, i) => ({ key: `${prefix}Revenue_by_region_202611${String(11 - i).padStart(2, "0")}_070002.xlsx`, size: 18000 + i * 731, modified: ago(60 * 24 * i + 60 * 8) })), next_token: null });
    }
    return fail(404, `Not available in the preview: ${p}`);
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (!/^\/?api\//.test(url.replace(location.origin, "").replace(/^\.\//, "")) && !url.startsWith("/api/")) return realFetch(input, init);
    let body = init.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { /* keep text */ } }
    await new Promise((r) => setTimeout(r, 60));
    try { return await handle((init.method || "GET").toUpperCase(), url, body); }
    catch (e) { return fail(500, e.message); }
  };

  // ---------------------------------------------------------------- preview-only adjustments
  // Seed two example tabs before the editor reads them.
  try {
    if (!localStorage.getItem("dt.tabs")) {
      localStorage.setItem("dt.tabs", JSON.stringify([
        { id: 1, title: "Revenue by region", sql: db.queries[1].sql, connId: 1, query: db.queries[1], params: { start: "2026-06-01" } },
        { id: 2, title: "Query 2", sql: "-- Ctrl+Enter runs the statement under the cursor\nSELECT region, product, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue\nFROM orders\nGROUP BY region, product\nORDER BY revenue DESC;\n\nSELECT COUNT(*) AS total_orders FROM orders;", connId: 1, query: null, params: {} },
      ]));
      localStorage.setItem("dt.activeTab", "2");
    }
  } catch { /* storage blocked: the app starts with its default tab */ }

  // The viewer can't show alert/confirm dialogs or downloads, so route those to the app's own toast.
  window.alert = (msg) => (window.toast ? window.toast(String(msg).split("\n")[0]) : console.log(msg));
  window.confirm = () => true;
  document.addEventListener("click", (e) => {
    const exp = e.target.closest("[data-export], a[href^='/api/']");
    if (exp) { e.preventDefault(); e.stopImmediatePropagation(); window.toast?.("In the desktop app this downloads the file."); }
  }, true);
  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.createElement("span");
    pill.className = "badge";
    pill.style.cssText = "margin-left:8px;color:var(--accent);border-color:var(--accent)";
    pill.textContent = "Preview · demo data";
    pill.title = "This preview runs in your browser with sample data. The desktop app connects to your real databases.";
    document.querySelector("#whoami")?.before(pill);
    // Open in a working state: run the example script once the app has loaded its connections.
    setTimeout(() => { if (!document.querySelector("#results table")) document.querySelector("#run-all-btn")?.click(); }, 1200);
    // ...then show the first result as a chart and expand the table list.
    setTimeout(() => {
      document.querySelector('#schema-tree li[data-ns="public"] .node')?.click();
      document.querySelector('#result-tabs button[data-i="0"]')?.click();
      document.querySelector('#view-seg [data-view="chart"]')?.click();
    }, 3200);
  });
})();

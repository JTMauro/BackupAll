CydConnect User Manual

# Tab 1

# CydConnect User Manual

2026-11-19 · @JT Mauro

## About this manual

CydConnect is Cydcor's one app for moving files, working on servers, managing SSH and PGP keys, and querying data. It replaces the separate CydFTP and DataTerm apps. This manual shows how to do each everyday task, step by step.

| Area | What you do there | Available |
| --- | --- | --- |
| FTP | SFTP, FTPS and FTP transfers, saved sites, FileZilla import, PGP on upload | Today |
| Terminal | SSH shell on your saved sites, with the same saved password or key; drop files on it to upload | Today |
| DataConnect | Query Athena, Redshift, Aurora, SQL Server, Postgres, MySQL, Oracle, Snowflake, BigQuery, Databricks; objects, charts, schedules, saved queries | Today |
| Keys | SSH keys and OpenPGP certificates in an encrypted vault | Today |
| Ask Me | Plain-English answers and commands in the Terminal | Coming in CydConnect |

Questions not answered here go to itservicedesk@cydcor.com.

## Getting started

There is one installer, `CydConnect-Setup-<version>.exe`.

1. Run it. Windows should show **Verified publisher: Cydcor LLC**.
2. Choose who it's for:
    - **Just me**: installs for you only. No administrator rights needed.
    - **Everyone who uses this PC**: Windows asks for administrator rights, then installs for all users.
3. Open **CydConnect** from the Start menu.
4. The first time, choose a **master password**. It encrypts your saved sites, passwords and keys. Write down the recovery code it shows and keep it somewhere safe; without one of them the vault can't be opened.

Upgrading from CydFTP or DataTerm: your sites, keys, connections, saved queries, schedules and settings are copied into CydConnect the first time it starts. The old apps can then be uninstalled from **Settings > Apps**.

**Where your work is kept**: `%APPDATA%\CydConnect` holds the vault (`vault.cydv`: sites, passwords, keys) and DataConnect's connections, saved queries, schedules, settings and backups. Uninstalling or upgrading keeps it.

## The CydConnect window

CydConnect opens on **Home**, which asks what you'd like to open:

- **FTP**: move files with your saved sites.
- **Terminal**: an SSH shell on a saved site.
- **DataConnect**: query databases and data lakes.

Each has **Open** and **Pop out**. Pop out opens that tool in its own window, so you can have all three open at once, side by side or on another monitor.

![Home: FTP, Terminal and DataConnect, each with Open and Pop out](blob/50d4a6e5-8cde)

The sidebar on the left has Home, FTP, Terminal, DataConnect, OpenPGP Keys, SSH Keys and Site Manager. FTP, Terminal and DataConnect each have a pop-out button on their right; it lights up while that tool is in its own window.

- To bring a popped-out tool back, click **Dock** in its window, click **Bring it back here** in the main window, or just close its window.
- **Show window** in the main window brings a popped-out tool to the front.

![FTP, Terminal and DataConnect each popped out into its own window](blob/a3c56332-f3c7)

The colour dots at the top of the window change the colour scheme. DataConnect follows the scheme you pick.

## Connect to your data

Add each database once on the **Connections** tab; everyone's AWS access uses their normal AWS sign-in or SSO profile.

1. Open **Connections**, type a **Name**, and pick a **Type**.
2. Fill in the fields for that type (table below).
3. Click **Save connection**, then **Test**. Test shows who you're connected as and lists the first schema's tables. If it fails, the message says why.

| Type | You need | Notes |
| --- | --- | --- |
| Amazon Athena | Region, workgroup, results location (`s3://…`) | Add an Upload location to load files into Athena |
| Amazon Redshift | Region, database, Serverless workgroup or cluster ID, Secrets Manager ARN | Add an S3 staging folder and COPY role ARN for uploads |
| Amazon Aurora | Cluster ARN, Secrets Manager ARN, database | Uses the RDS Data API |
| Database | Pick the database (SQL Server, Postgres, MySQL, Oracle, Snowflake, BigQuery, Databricks, SQLite); fill in the URL template | Type the password in the **Password** box, never in the URL |

Passwords typed in the Password box are saved in **Windows Credential Manager** (under "CydConnect"), not inside the app or its backups. To sign in to AWS with SSO first, run `aws sso login --profile <name>`.

The **explorer** on the left of the SQL Editor lists the connection's databases or schemas. Expand one to see its tables and views, and expand a table to see its columns and their types. Right-click any of them for actions (next section).

## Write and run SQL

Press **Ctrl+Enter** to run the statement your cursor is in; select text first to run just that.

1. Pick the connection at the top of the explorer.
2. Type SQL in the editor. Suggestions appear as you type; **Ctrl+Space** opens them any time. Expand a schema in the explorer once to add its tables and columns to the suggestions.
3. Run it: **Ctrl+Enter** for the current statement, **Ctrl+Shift+Enter** (or **Run all**) for the whole script. Each statement gets its own result tab; if one fails, the rest are skipped.
4. Click **Cancel** to stop a long query.

Use the **+** beside the tabs for a new query tab. Tabs and their SQL are kept when you close the app.

**Work with objects from the explorer.** Hover a table for three shortcuts: **Preview** (first 100 rows), **SQL** (inserts a `SELECT`) and **DDL** (its `CREATE TABLE`). Double-click a table to insert its full name. Right-click for everything else:

| Right-click on | Actions |
| --- | --- |
| A table or view | Preview first 100 rows, count rows, show the CREATE statement; script SELECT, INSERT, UPDATE, DELETE or ADD COLUMN into a new tab; rename, empty (truncate) or drop; copy the full name or column list |
| A column | Show distinct values with counts, count empty (NULL) values, min and max, copy or insert the name |
| A schema or database | Script a new table or view there, reload its tables, copy its name |

Rename, empty and drop show the exact SQL first. You can edit it, then click **Run**, **Put in editor instead**, or **Cancel**; nothing changes until you confirm. The SQL is written for the connection's database (for example `TOP` on SQL Server). Actions a database can't do are greyed out with the reason, such as renaming a table on Athena.

| Keys | Does |
| --- | --- |
| Ctrl+Enter | Run the statement at the cursor, or the selection |
| Ctrl+Shift+Enter | Run the whole script |
| Ctrl+S | Save to the catalog |
| Ctrl+Shift+F | Format the SQL |
| Ctrl+Space | Show suggestions |
| Ctrl+F | Find and replace |
| Ctrl+/ | Comment or uncomment lines |

**Explain** shows the database's plan for the statement at the cursor, which helps when a query is slow.

## Work with results

Results open as a grid; switch to **Chart** or **Profile** with the buttons above it.

- **Sort**: click a column heading (once ascending, twice descending, three times off).
- **Filter**: type in **Filter rows** to keep only rows containing that text.
- **Chart**: pick the type (bar, line, area, pie, scatter), the **X** column, and click the **Y** chips to plot. Measures on very different scales get a second axis automatically.
- **Profile**: one row per column showing how full it is, distinct values, min, max, average and the most common values.
- **Export**: **CSV**, **Excel** or **JSON** downloads the result. **Copy** puts the visible rows on the clipboard, ready to paste into Excel.

The grid shows up to 10,000 rows. For bigger extracts, schedule a delivery (see Schedules); deliveries go up to 1,000,000 rows.

## Save and reuse queries

Press **Ctrl+S** to save a query to the **Catalog**, in a folder, shared with everyone or private to you.

1. Press **Ctrl+S** (or **Save**). Give it a name and folder, and choose **Everyone** or **Only me**.
2. Find it later on the **Catalog** tab (search covers names, folders, descriptions and SQL). Click its name to open it.
3. Each save that changes the SQL makes a new version. Click **Versions** (or the **vN** link) to see older ones and **Restore** any of them; restoring adds a version, so nothing is lost.

**Parameters**: write `${name}` where a value should be asked for when the query runs, or `${name:default}` to give it a default.

```sql
SELECT * FROM orders WHERE order_date >= '${start:2026-01-01}'
```

**Reuse a saved query**: write `{{ ref('Folder/Query name') }}` where a table would go. **Copy ref** on the Catalog tab copies the exact text.

```sql
SELECT region, SUM(amount) FROM {{ ref('Sales/Orders since') }} o GROUP BY region
```

## Schedules and alerts

A schedule runs a saved query on a timetable and does one of three things with it.

| What to do | What happens | Good for |
| --- | --- | --- |
| Deliver results | Writes the result as CSV or Excel to an S3 folder or a local folder | Daily reports |
| Publish | Rebuilds a table or view from the query | Summary tables others query |
| Data test | Passes when the query returns no rows; alerts when it returns any | Catching bad data early |

1. Save the query to the Catalog first.
2. Open **Schedules**, pick the query and what to do.
3. Enter the time as five fields: minute, hour, day of month, month, weekday. `0 7 * * 1-5` means 7:00 AM Monday to Friday. Pick the time zone.
4. Add parameter values as `name=value` lines if the query uses them.
5. Add email addresses and choose **It fails** or **Every run**. Click **Save schedule**.
6. Click **Run now** to try it straight away.

On the desktop app, schedules run only while the app is open on that PC. Schedules that must run around the clock belong on the team server; email itservicedesk@cydcor.com.

## Load a file into a table

The **Upload** tab loads a CSV or Excel file into a new or existing table on any connection.

1. Open **Upload** and pick the connection, the file, the schema and a table name.
2. Click **Preview**. Check each column's type (text, whole number, decimal, true/false, date, date and time) and change any that are wrong.
3. Choose what happens if the table exists: **Stop**, **Replace** or **Append**.
4. Click **Load into table**.

Athena needs an **Upload location** (an `s3://` folder) on the connection. Redshift needs an **S3 staging folder** and a **COPY IAM role ARN** on the connection. Other databases need nothing extra.

## FTP, SSH keys and PGP

Everything you save here is encrypted in your vault.

**Connect and transfer files**

1. Open **Site Manager** in the sidebar and add a site: host, port, protocol (SFTP, FTPES, FTPS or FTP), username, and a password or SSH key.
2. On **FTP**, pick the site and click **Connect**, or click its tile under Recently used on Home. For a server you haven't saved, click **Quickconnect…** and fill in the small form.
3. Your PC's folders show on the left and the server's on the right. Drag files across, or double-click a folder to open it.
4. The **Transfer queue** shows progress. Dropped transfers retry and resume on their own; **Retry failed** tries again.

**Open in Terminal** on the FTP toolbar opens an SSH terminal on the site you're connected to (SFTP sites).

The first time you connect to a server, you're shown its fingerprint to confirm. If it ever changes, you get a warning before anything is sent.

**Bring sites over from FileZilla**: **File > Import sites from FileZilla**. Folders, saved passwords and key files come across.

**SSH keys**

1. **SSH Keys > Generate new key** (Ed25519 is the best default), or **Import key file** for an existing `.ppk` or OpenSSH key.
2. **Install on server** adds your public key to a server's `authorized_keys`, or **Copy public key** to paste it yourself.
3. Choose the key in a site's settings to sign in with it.

**PGP for partners**

1. **OpenPGP Keys > Import** the partner's public key (or **New Key Pair** for your own).
2. In the site's settings, choose that partner as the recipient. Uploads are encrypted to `.pgp` automatically and downloads are decrypted.
3. **Encrypt Files**, **Decrypt / Verify Files** and **Sign Files** work on files on your PC too.

**Forgot your master password?** Click **Forgot password?** and enter your recovery code. Without it, an administrator can reset it with the organisation recovery key (network edition: Admin Console > Reset password).

## Terminal

An SSH shell on any saved SFTP site. It signs in with the same saved password or SSH key as FTP, and checks the server's fingerprint the same way, so there is no second sign-in.

1. Open **Terminal** from Home or the sidebar.
2. Pick a saved SFTP site at the top and click **Connect**. (From FTP, **Open in Terminal** does both.)
3. Type commands as you would in PuTTY. Colours and full-screen programs such as `top` and `vim` work.
4. **Disconnect** ends the session.

**Upload by dragging**: drop a file or folder from your PC or from FTP's local list onto the terminal. CydConnect asks which server folder to save it in (it starts with the folder open in FTP, or your home folder) and uploads it. Dropping a file from FTP's remote list types its path at the prompt instead.

**Pop out** the terminal to keep it next to FTP or DataConnect.

## Ask Me (coming in CydConnect)

Ask Me answers plain-English questions, like "find files over 1 GB changed this week", with a command you can use. Answers come from the Cydcor knowledge base first.

[chart: how Ask Me picks an answer · 3 sources in order]

A reviewed answer is marked **Verified**. If none matches, Ask Me searches official documentation and shows the link, then lets Claude draft an answer marked as not yet reviewed. Questions nobody has answered go to itservicedesk@cydcor.com and are answered once for everyone.

1. Type your question in the **Ask Me** line under the terminal, or click **Ask Claude**.
2. The first time, sign in with your Cydcor account. You don't need your own Claude plan or any key.
3. Read the answer in the side panel. **Insert** puts the command at the prompt.
4. Check it and press **Enter** to run it. Nothing runs on its own.

Risky commands (deleting files, changing permissions) are flagged in red. Passwords and keys are blanked out before a question is sent.

## Backups and restore

Your connections, saved queries (with every version), schedules and settings are backed up automatically every day at 2:15 AM, and when the app starts if the last backup is over a day old.

- The newest 30 backups are kept. Find them, and change the folder or add an S3 copy, under **Settings > Backups**.
- **Back up now** makes one immediately; **Download a backup** saves a copy wherever you like.
- **Restore** (next to a backup) or **Restore from a file** replaces your connections, catalog, schedules and settings with the backup's. A backup of the current state is made first, so a restore can be undone.
- Database passwords are not in backups. After restoring on a new PC, type each password again under **Connections > Edit**.

Sites, passwords and keys are in one vault file, `%APPDATA%\Cyd``Connect``\vault.cydv`; back it up with the rest of your profile. In the network edition, an administrator backs up everyone from the Admin Console.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Test connection fails | Read its message: it names the cause (permission, network, wrong name) and the AWS identity in use. Fix that, then **Retry**. |
| Redshift shows no schemas or tables | Update to 0.1.3 or later. Still empty: your login needs `USAGE` on the schemas; ask the database admin. |
| Explorer shows a red error | It's the database's own reason. Fix it, then **Retry** or **Test connection**. |
| Autocomplete misses tables | Expand that schema in the explorer once. |
| Query stops after an hour | Athena and Redshift queries are cancelled after 3,600 seconds. Filter on dates or partitions, or email itservicedesk@cydcor.com to raise the limit. |
| Results say truncated | The grid shows 10,000 rows. Schedule a delivery for bigger extracts. |
| A schedule didn't run overnight | The desktop app must be open for schedules to run. Use the team server for 24/7 schedules. |
| SQL assistant unavailable | Claude must be enabled in Amazon Bedrock for the account and region in Settings. Email itservicedesk@cydcor.com. |
| App won't open | Send `%APPDATA%\``CydConnect``\startup-error.log` to itservicedesk@cydcor.com. Or run CydConnect Self-Test from the Start menu and send its result. |
| "Unknown publisher" when installing | Your PC doesn't trust Cydcor's internal certificate. Email itservicedesk@cydcor.com to have the Cydcor root certificate added. |
| A transfer stopped halfway | It retries and resumes on its own; use **Retry failed** in the transfer queue if it gave up. |
| Server key changed warning | Don't connect until you've confirmed with the server's owner that the change is expected. |
| "Part of this app has been blocked" (Smart App Control) | Smart App Control only trusts publicly issued certificates. Use a PC where it's off, or wait for the publicly signed release. Email itservicedesk@cydcor.com. |
| Terminal says it can't open | The terminal needs an SFTP (SSH) site. FTP and FTPS sites can move files but have no shell. |

## For administrators

**Deploy**

| Task | Command or setting |
| --- | --- |
| Silent install, all users (run elevated, e.g. Intune as System) | `CydConnect-Setup-<version>.exe /S /AllUsers` |
| Silent install, current user | `CydConnect-Setup-<version>.exe /S /CurrentUser` |
| Silent uninstall | `"C:\Program Files\CydConnect\uninstall.exe" /S` |
| Intune detection | Registry `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\CydConnect`, value `DisplayVersion` equals the version |
| Allow rules (WDAC / AppLocker) | Publisher `O=Cydcor LLC`, or `CydConnect-publisher.cer` from the release zip |

**Build and sign a release**

1. Set the version: `python tools\bump_version.py 0.2.1`, fill in CHANGELOG.md, commit and tag.
2. Cloud build (signed when the Cydcor certificate is in the environment settings): `bash installer/cloud/build_windows_cloud.sh`. It signs every app file and the installer, timestamps them, and writes `dist-release`.
3. Build PC alternative: double-click **BUILD CYDCONNECT.cmd** on the PC with the Cydcor certificate.
4. Linux: `pyinstaller cydconnect.spec`, then package with the install script. Mac: run **BUILD CYDCONNECT.command** from the Mac build kit on a Mac.

**Smart App Control**: PCs with Smart App Control turned on only accept files signed with a publicly trusted certificate, so they block CydConnect while it's signed with Cydcor's internal certificate. Use PCs where it is off (most IT-managed PCs) until Cydcor has a public signing certificate, such as Azure Trusted Signing.

**Team server**: run the container on ECS Fargate behind an ALB with Entra ID sign-in, use the IAM role from `iam-policy.json`, keep the app database on RDS Postgres, and run the scheduler on one task only.

**Knowledge base**: the answers live on the CydConnect Knowledge Base page, shared read-only with everyone at Cydcor. People search and read it with their own Cydcor Claude login; only editors change answers.

[chart: how the knowledge base learns · 5 steps, editors approve every answer]

Questions never change the knowledge base by themselves. Each one is saved to the **Questions to answer** list and emailed to itservicedesk@cydcor.com from the person's own Outlook. An editor clicks **Answer**, saves the new entry, then clicks **Export CSV** and replaces the workbook in the Claude project so its chat knows the answer too.

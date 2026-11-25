# Secure File Server: Feature Specification

# Tab 1

## Secure File Server: Feature Specification

2026-11-04 · @JT Mauro

### Overview

One Windows Server 2025 program gives internal staff and outside partners secure file transfer (SFTP, FTPS, web and WebDAV), file drop, and self-destructing shares. It is managed from one admin console and uses its own local accounts, with no Active Directory needed.

| Role | Who | What they can do |
|---|---|---|
| Administrator | IT staff | Manage everything in the admin console, with access limited by admin role |
| Internal user | Staff | Use their home folder and team folders, create share links and file drops |
| External user | Partners, clients, vendors | Own login, see only the folders granted to them, account expires automatically |
| Guest | Anyone holding a link | Download a shared file or upload to a file drop, with no account |

**How to read this spec.** Every feature table has a Phase column (1 to 6). Phase 1 is the first usable version; each later phase adds to it (see Delivery phases). Dates are set after Phase 1 lands, when the real pace is known.

**Design principles**

- **Secure by default.** Every risky option ships switched off, and the admin must turn it on deliberately.
- **Easy to run.** Folder access is set by picking folders and ticking boxes. Nobody needs to know NTFS permissions.
- **One program, Windows only.** One service, one installer, no other software to install or patch.

### Platform and architecture

Everything runs as one Windows service on one Windows Server 2025 machine, with nothing else to install. Admins reach the console only from the private network; users and guests come in from the internet. Every request clears the same security gate before it touches a file.

[chart: architecture · one service, four layers]

- **Built in Go**, compiled to one native Windows program. Go is memory-safe, which rules out a whole class of attacks such as buffer overflows.
- **Installed with a signed MSI installer.** Upgrades install in place and keep all settings.
- **Runs as a Windows service** under its own low-rights account, and restarts itself after a failure.
- **One database file** (SQLite) holds settings, users and logs. Files live on NTFS or ReFS drives.
- **Works on Server Core or Desktop Experience.** Server Core is recommended because it has less to attack.
- **Ports:** 22 for SFTP, 443 for the web client, 21 and 990 for FTPS when enabled, and a separate private port for the admin console.

### Admin console

The admin console is a web page served by the program itself, opened in Edge. It listens on a separate port that only the server or the management network can reach, never the internet.

| Feature | What it does | Phase |
|---|---|---|
| Dashboard | Live sessions, transfers today, failed logins, disk use, items needing attention | 1 |
| User management | Create, edit, disable, unlock and expire users. Bulk import from CSV | 1 |
| Group management | Groups carry folder access, limits and settings that members inherit | 1 |
| Folder management | Create folders and grant access visually (see Folder security) | 1 |
| Live sessions | See who is connected, from where, and what they're transferring. Disconnect or ban with one click | 1 |
| Server settings | Ports, protocols, crypto settings, limits, branding and email, all with safe defaults | 1 |
| Admin MFA required | Every admin signs in with a password plus an authenticator app or security key (passkey) | 1 |
| Admin login restrictions | Allowed IP ranges for admins, short session timeout, re-enter password for risky actions | 1 |
| Change history | Every admin change is logged with who, when, and the old and new value | 1 |
| Search everywhere | Find any user, folder, share link or file drop from one box | 2 |
| Share and drop oversight | See every active link and drop, who made it, and when it expires. Revoke any of them | 2 |
| Admin roles | Full admin, user manager (users and folders only), help desk (unlock and reset only), auditor (read-only) | 4 |
| Approval for sensitive changes | Optionally require a second admin to approve risky changes, such as turning on plain FTP | 4 |
| Settings export and import | Save the whole configuration to a file for backup or to copy to another server | 4 |
| REST API | Every console action is also available through an API with scoped keys, for scripts | 4 |

### Security

Security is designed around how real file transfer products were actually breached. MOVEit (2023) fell to SQL injection, GoAnywhere (2023) to an exposed admin console, and CrushFTP (2024 and 2025) to a folder escape and a login bypass. Each of those is closed off by design here.

#### Logins and passwords

| Feature | What it does | Phase |
|---|---|---|
| Strong password storage | Passwords stored as Argon2id hashes; the real password is never kept | 1 |
| Password policy | Minimum length 14, checked against a list of known-breached passwords, optional expiry | 1 |
| SSH key login | Users upload public keys; admins can require key only, or key plus password | 1 |
| MFA for users | Authenticator app (TOTP) or passkey for the web client; key plus code for SFTP | 2 |
| Brute-force protection | Slows down and then locks accounts after repeated failures; bans the source IP automatically | 1 |
| Same answer for unknown users | A wrong username and a wrong password look identical, so attackers can't discover accounts | 1 |
| Self-service password reset | Emailed reset link, single use, expires in 30 minutes; can be turned off for external users | 2 |

#### Network and encryption

| Feature | What it does | Phase |
|---|---|---|
| Modern SSH crypto only | Ed25519 host keys, curve25519 and post-quantum hybrid key exchange, AES-GCM and ChaCha20 ciphers; no SHA-1 or CBC | 1 |
| TLS 1.2 and 1.3 only | For FTPS, the web client and the admin console; strong ciphers only | 1 |
| Plain FTP off | Unencrypted FTP is disabled and can only be turned on per user with a warning | 3 |
| IP allow and deny lists | Globally, per group and per user | 1 |
| Country blocking | Allow or block logins by country (GeoIP) | 4 |
| Connection limits | Caps per IP, per user and server-wide; timeouts for idle and slow connections | 1 |

#### Built-in protections

| Feature | What it does | Phase |
|---|---|---|
| Folder escape protection | Every path is checked so users can never reach outside their folders, including Windows tricks (`..`, `CON`, `file:stream`, short names, links) | 1 |
| Virus scanning | Every upload scanned by Microsoft Defender; infected files quarantined before anyone can download them | 2 |
| Blocked file types | Block dangerous types (such as .exe, .js, .vbs) by extension and by actual content | 2 |
| Least privilege | The service runs under its own low-rights account, never as an administrator | 1 |
| Signed program | The .exe and installer are code-signed so Windows can verify them | 5 |
| Secret keys protected | Host keys and certificate keys protected by Windows (DPAPI, or the TPM chip where available) | 1 |
| Security testing | Automated fuzz and code scanning on every build; external penetration test before external users go live | 2 |

### Accounts, groups and home profiles

All accounts are local to the program; they are not Windows or Active Directory accounts. Each user gets a home profile that sets their home folder, limits and allowed protocols, usually inherited from a template.

| Feature | What it does | Phase |
|---|---|---|
| Internal and external user types | Each user is marked internal or external; external users get stricter defaults automatically | 1 |
| Profile templates | Ready-made profiles (for example Staff, Partner, Vendor upload-only) set home folder, access, limits and expiry in one pick | 1 |
| Automatic home folder | A private home folder is created on first save, for example `D:\Files\Home\<username>`, and locked to that user | 1 |
| Groups | Users inherit folder access and settings from one or more groups; user settings can override | 1 |
| Account expiry | Set an end date; the account disables itself. Default 90 days for external users | 1 |
| Inactivity lockout | Disable accounts unused for N days (default 60 for external users) | 1 |
| Allowed protocols per user | For example, a vendor can use SFTP only, and a client the web client only | 1 |
| Login hours | Restrict logins to set days and times | 4 |
| Welcome email | New users get an email with a one-time setup link to choose their password and set up MFA | 2 |
| Self-service profile | Users change their password, MFA and SSH keys, and see their quota use, in the web client | 2 |
| External user sponsors | Each external user has an internal owner who gets expiry reminders and must renew them | 4 |
| Delete with cleanup | Removing a user archives or destroys their home folder per policy, and revokes their links and drops | 2 |

### Folder security

Admins grant access by choosing a folder, choosing a user or group, and picking a preset or ticking boxes. The program enforces it on every protocol, so the same rules apply to SFTP, FTPS, the web client and WebDAV.

**Permission presets**

| Preset | List | Download | Upload | Overwrite | Rename and move | Delete | Create folders | Share |
|---|---|---|---|---|---|---|---|---|
| Full control | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Modify | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Read only | Yes | Yes | No | No | No | No | No | No |
| Upload only (drop box) | No | No | Yes | No | No | No | No | No |
| Upload and see own files | Own files only | Own files only | Yes | No | No | No | No | No |
| Custom | Pick any combination |  |  |  |  |  |  |  |

| Feature | What it does | Phase |
|---|---|---|
| Virtual folders | Users see friendly names (`/Reports`) mapped to real locations; real server paths are never shown | 1 |
| Inheritance | Subfolders inherit access unless set otherwise, with a clear marker where it changes | 1 |
| Deny wins | An explicit deny always beats an allow, so a subfolder can be locked down inside a shared folder | 1 |
| Effective access viewer | Pick a user and see exactly what they can do in every folder, and why | 1 |
| "Who can see this?" | Pick a folder and see every user who can reach it, and through which group | 1 |
| Per-folder file rules | Allowed and blocked file types, and maximum file size, per folder | 2 |
| Per-folder quotas | Size and file-count limits per folder as well as per user | 3 |
| Time-limited access | Grant access that expires on a date, for project work | 2 |
| Hide what you can't open | Folders a user has no access to are invisible to them | 1 |
| Access review report | Scheduled report of who can reach what, emailed to folder owners to confirm | 4 |

### Protocols and FTP server features

SFTP is the primary protocol and ships in Phase 1; FTPS, WebDAV and SCP follow in Phase 3. All of them work with standard clients such as WinSCP, FileZilla, Cyberduck and Windows Explorer.

| Feature | What it does | Phase |
|---|---|---|
| SFTP | Secure transfer over SSH, port 22 by default | 1 |
| HTTPS web client | Browser access to files, shares and drops, port 443 | 2 |
| FTPS (explicit and implicit) | FTP secured with TLS, ports 21 and 990; encryption required on both the command and data connections | 3 |
| WebDAV over HTTPS | Map the server as a drive in Windows Explorer or macOS Finder | 3 |
| SCP | Legacy copy command over SSH, off by default | 3 |
| Plain FTP | Off by default; can be enabled per user only, with a warning | 3 |
| Resume | Interrupted uploads and downloads continue where they stopped | 1 |
| Checksums | SHA-256 hash of each upload recorded and available to clients to verify | 1 |
| Atomic uploads | Files appear only once fully uploaded, so automated jobs never pick up half a file | 1 |
| User quotas | Limits on total size and number of files per user | 3 |
| Bandwidth limits | Speed caps per user, per group and server-wide, separate for upload and download | 3 |
| Passive port range | FTPS data ports pinned to a set range, with matching firewall rules | 3 |
| Max file size | Global, per user and per folder | 2 |
| Custom login banner | Legal warning text shown before login | 1 |
| Port and listener control | Run each protocol on any port and bind it to chosen network cards | 1 |
| TLS certificates | Use a certificate from the Windows certificate store, or renew automatically through ACME (Let's Encrypt or an internal CA) | 3 |
| Windows Firewall rules | The program creates and removes its own firewall rules to match enabled ports | 3 |

### Web client

Users who don't want an FTP program get a browser file manager that works on desktop and phone. It arrives in Phase 2 along with sharing.

| Feature | What it does | Phase |
|---|---|---|
| File manager | Browse, upload, download, rename, move, delete and create folders, as permissions allow | 2 |
| Drag and drop | Drop files or whole folders onto the page to upload | 2 |
| Large, resumable uploads | Uploads of many gigabytes survive a dropped connection and continue | 2 |
| Zip download | Download several files or a folder as one zip | 2 |
| Preview | View images, PDFs, text and video in the browser without downloading | 2 |
| Search | Find files by name across the user's folders | 2 |
| Share from any file | Right-click a file or folder to create a share link or file drop | 2 |
| My shares page | See, edit, extend and revoke your own links and drops | 2 |
| Upload progress | Speed and time left per file, with cancel | 2 |
| Recycle bin | Deleted files recoverable by the user for N days (admin-set; off for auto-destroyed files) | 2 |
| Your branding | Company logo, colours and login page text | 2 |
| Phone friendly | Works in a phone browser | 2 |
| Languages | Interface translatable; English first | 5 |

### File drop and sharing

Users can send files out with a share link, or collect files in with a file drop, without creating accounts for the other person. Admins set the limits; users choose within them.

#### Share links (sending files out)

| Feature | What it does | Phase |
|---|---|---|
| Share a file or folder | Creates a link with a long, unguessable address | 2 |
| Password | Optional or required by policy; sent separately from the link | 2 |
| Email verification | Recipient must enter a one-time code sent to their email before downloading | 2 |
| Restrict to named recipients | Only listed email addresses can open the link | 2 |
| Expiry | Link stops working on a date; admin sets the maximum (for example 30 days) | 2 |
| Download limit | Link stops after N downloads | 2 |
| View only | Preview in the browser with downloads blocked, plus an optional watermark with the viewer's email | 4 |
| Download receipts | Sender is emailed when, and by whom, the file was downloaded | 2 |
| Send by email | Send the link from the program with a message, using the company branding | 2 |
| Revoke any time | The sender or an admin kills the link instantly | 2 |

#### File drops (collecting files in)

| Feature | What it does | Phase |
|---|---|---|
| Request files | Creates an upload-only page; senders can't see anything already there | 2 |
| Personal drop page | Each user can have a permanent drop address, such as `/drop/jsmith` | 2 |
| Sender details | Require the sender's name and email, verified with a one-time code | 2 |
| Upload rules | Allowed file types, maximum size, maximum number of files | 2 |
| Instructions and branding | Custom message, logo and required fields (such as a reference number) on the drop page | 2 |
| Arrival notification | Owner is emailed when files arrive, after they pass the virus scan | 2 |
| Expiry and limits | Drop closes on a date or after N uploads | 2 |
| Upload receipt | Sender gets a confirmation listing what was received, with checksums | 2 |
| Spam protection | Rate limits and a challenge on public drop pages | 2 |

#### Policy for admins

| Feature | What it does | Phase |
|---|---|---|
| Sharing policy by group | Who may share, maximum expiry, whether a password is required, internal-only recipients | 2 |
| External users can't reshare | By default, external users cannot create links | 2 |
| Data loss prevention | Block sharing of files matching patterns (such as card or Social Security numbers) | 5 |

### Auto-destruction

Files, links, drops and folders can be set to destroy themselves, and destroyed means unrecoverable. Each protected file is encrypted with its own key, and destruction deletes that key. Simply deleting or overwriting a file is not reliable on SSDs, snapshots or backups, but without the key every remaining copy is unreadable.

| Feature | What it does | Phase |
|---|---|---|
| Destroy after a time | File, link or drop destroyed at a set date or after N hours or days | 2 |
| Destroy after N downloads | Gone after the last allowed download | 2 |
| Burn after reading | Destroyed the moment the first download completes | 2 |
| Destroy after pickup | In a drop, files destroyed once the owner has downloaded them | 2 |
| Folder retention rules | Every file in a folder destroyed N days after upload (for example, an "outbound" folder at 7 days) | 2 |
| Per-file encryption keys | Each protected file encrypted with its own key, which is itself protected by a Windows-held master key | 2 |
| Unrecoverable destruction | The key is deleted and the encrypted file is removed, so backups and snapshots can't restore it | 2 |
| Warning before destruction | Owner is emailed a set time before; they can extend if policy allows | 2 |
| Destruction certificate | A record per file with name, size, checksum, owner, reason and time destroyed, kept after the file is gone | 2 |
| Legal hold | Admins can freeze destruction on a user, folder or file during an investigation | 4 |
| Destroy on account removal | A removed or expired external user's files destroyed per policy | 2 |
| Panic revoke | One admin action kills every link and drop for a user immediately | 2 |

Files held only in an ordinary user's home folder are deleted normally unless a retention rule applies; the unrecoverable route covers anything under a destruction rule.

### Automation and notifications

Rules of the form "when this happens, do that" are built in the admin console, with no scripting required. Basic email notifications arrive with sharing in Phase 2; the full rules engine comes in Phase 4.

| Feature | What it does | Phase |
|---|---|---|
| Email notifications | Upload received, link downloaded, account expiring, password reset; templates editable | 2 |
| Email sending | Through your mail server or Microsoft 365 (SMTP with TLS) | 2 |
| Event triggers | On upload, download, delete, login, failed login, share created, file destroyed | 4 |
| Conditions | Filter by user, group, folder, file name pattern or size | 4 |
| Actions: files | Move, copy, rename, zip, unzip, delete | 4 |
| Actions: PGP | Encrypt or decrypt with PGP keys stored in the program | 4 |
| Actions: send on | Push the file to another SFTP server or to Azure Blob storage | 4 |
| Actions: notify | Email, Microsoft Teams message, or webhook to another system | 4 |
| Actions: run a script | Run an approved PowerShell script, with the file details passed in | 4 |
| Scheduled jobs | Run actions on a timetable, such as a nightly pickup from a partner's SFTP server | 4 |
| Folder watch | Act when files land in a folder by any route | 4 |
| Retry and alerts | Failed actions retry, then alert an admin | 4 |

### Monitoring, logging and reporting

Every login, file action and admin change is recorded from Phase 1, in the program's own audit log and in the Windows Event Log. Reports and outside log tools come in Phase 4.

| Feature | What it does | Phase |
|---|---|---|
| Audit log | Who did what, to which file, from which IP and when, for every protocol | 1 |
| Tamper-evident log | Each entry is chained to the one before it, so edits or deletions are detectable | 1 |
| Windows Event Log | Security events written to the Windows Event Log for existing Windows monitoring | 1 |
| Log search | Filter the audit log by user, file, IP, date and action in the console | 1 |
| Log retention | Keep logs for a set period (default 1 year), then archive | 1 |
| Security alerts | Email admins on brute-force attacks, virus found, mass downloads or deletions, admin changes | 2 |
| SIEM export | Send logs in JSON or syslog to tools such as Microsoft Sentinel or Splunk | 4 |
| Reports | Activity by user, top transfers, storage use, failed logins, expiring accounts, active shares | 4 |
| Scheduled reports | Reports emailed weekly or monthly as PDF or CSV | 4 |
| Health page and metrics | Health check address and performance figures for monitoring tools | 4 |
| Disk space alerts | Warn before a drive fills up | 2 |

### Storage and data protection

Files live on the server's own drives from Phase 1. Network shares and Azure storage come later, and every location looks the same to users.

| Feature | What it does | Phase |
|---|---|---|
| Local drives | NTFS or ReFS, ideally a dedicated data drive separate from Windows | 1 |
| Network shares (SMB) | Store folders on a file server or NAS | 3 |
| Azure Blob storage | Store folders in Azure, transparently | 5 |
| Encryption at rest | Optionally encrypt everything stored, not only files under destruction rules | 5 |
| Configuration backup | Settings database backed up nightly to a chosen folder, keeping 30 copies; file data copied to an offsite backup with a tested restore | 1 |
| Snapshot friendly | Works with Windows Volume Shadow Copy (VSS) for ransomware recovery | 1 |
| Integrity checks | Stored files periodically checked against their recorded checksum | 4 |
| Two-server setup | Two servers share the load and take over if one fails, using SQL Server and shared storage | 5 |

### Replacing Google Drive and OneDrive

The spec so far is a strong file transfer and sharing server. Replacing Drive and OneDrive also needs a Windows Explorer drive that works from anywhere, document editing in the browser, team spaces, version history, and admin oversight of everyone's shares. These are new Phase 6 items unless marked otherwise.

#### Windows Explorer drive (works anywhere, no VPN)

A small desktop app adds the server to File Explorer's left-hand pane, the same way OneDrive does. It uses the same Windows feature OneDrive uses (the Cloud Files API). It talks to the server over HTTPS on port 443, so it works at home, in a hotel or on the office network, without a VPN.

| Feature | What it does | Phase |
|---|---|---|
| Explorer drive | The server appears as its own location in File Explorer, with the user's home and team folders | 6 |
| Files on demand | Files show in Explorer but download only when opened, so a large library takes no local disk space | 6 |
| Always keep on this device | Pin folders for offline use; changes sync when back online | 6 |
| Status icons | Cloud, downloaded, syncing and error icons on each file, like OneDrive | 6 |
| Right-click menu | Share link, file drop, version history and "view online" from Explorer | 6 |
| Conflict handling | If two people change the same file, both copies are kept and the user is told | 6 |
| Device approval | Admin sees every connected computer and can block one or remotely wipe its cached files | 6 |
| Sign-in with MFA | The app signs in through the web login, MFA included, and remembers the device | 6 |
| Silent install | Deployable to company PCs with Intune, Group Policy or a script | 6 |
| Stopgap: mapped drive | Until the app exists, the WebDAV drive (Phase 3) can be mapped over HTTPS from anywhere. Microsoft has deprecated the Windows WebDAV client, so this is temporary | 3 |

#### Document editing and collaboration

| Feature | What it does | Phase |
|---|---|---|
| Edit Office files in the browser | Word, Excel and PowerPoint files open and edit in the web client through a self-hosted editor (ONLYOFFICE Docs or Collabora Online), installed on the same or a second Windows server | 6 |
| Co-editing | Several people edit one document at once and see each other's changes | 6 |
| Open in desktop Office | Opens through the Explorer drive and saves back automatically | 6 |
| File locking | Lock a file while editing so others can't overwrite it | 2 |
| Comments on files | Leave notes on a file or folder, with mentions that email the person | 4 |

#### Version history and recovery

| Feature | What it does | Phase |
|---|---|---|
| Version history | Every save keeps the previous version; restore any of them (default: 50 versions or 90 days) | 2 |
| Recycle bin | Moved to Phase 2 from Phase 4: deleted files recoverable for 30 days by the user, longer by an admin | 2 |
| Ransomware detection | Spots mass file changes or renames from one user or device, pauses that user and alerts admins | 4 |
| Restore a whole folder to a point in time | Roll a folder back to how it looked on a chosen date | 4 |

#### Team spaces and ownership

| Feature | What it does | Phase |
|---|---|---|
| Team spaces | Shared areas owned by the team, not by one person, like shared drives in Google or SharePoint | 2 |
| Space owners | Each space has owners who manage its members without needing IT | 2 |
| Ownership transfer | When someone leaves, their files and shares move to their manager in one step | 2 |
| Storage limits per space | Quotas per team space, with alerts to the owners | 3 |
| Shared with me | One view of everything others have shared with the user | 2 |
| Invite external collaborators | Internal users invite an outsider to a folder; the outsider gets an external account under the user's sponsorship and the admin's rules | 2 |

#### Admin control of everyone's shares

| Feature | What it does | Phase |
|---|---|---|
| External sharing report | Every file and folder shared outside the company: by whom, with whom, since when, and how often it was opened | 2 |
| Revoke in bulk | Remove all external shares for a user, a folder, or an outside email domain at once | 2 |
| Approval for external sharing | Optionally require a manager or admin to approve a share before it works | 4 |
| Allowed and blocked domains | Share only with approved partner domains, or block personal email such as Gmail | 2 |
| Sensitivity labels | Mark folders Public, Internal or Confidential; labels set the sharing rules automatically | 4 |
| Admin access to a user's files | Admins can open a user's files for an investigation, with a reason recorded and the action logged | 2 |
| Activity per file | Full history of who viewed, downloaded, edited or shared a file | 2 |

#### Everyday features users expect

| Feature | What it does | Phase |
|---|---|---|
| Thumbnails | Picture and document previews in folder views | 2 |
| Recent and favourites | Quick access to recently used and starred files | 2 |
| Full-text search | Search inside documents and PDFs, not only file names | 5 |
| Activity feed | What changed in my folders since I last looked | 4 |
| Phone app | iPhone and Android apps for browsing, uploading photos and offline files (the phone browser works from Phase 2) | 6 |

#### Moving off Google Drive and OneDrive

| Feature | What it does | Phase |
|---|---|---|
| Migration tool | Copies each user's Google Drive or OneDrive into their home folder, with folders, versions and dates kept | 6 |
| Convert Google files | Google Docs, Sheets and Slides converted to Word, Excel and PowerPoint during migration | 6 |
| Share mapping report | Lists what was shared in the old system so it can be recreated, or deliberately not | 6 |

#### Trade-offs to weigh before switching

- **OneDrive may already be paid for.** Most Microsoft 365 plans include OneDrive with the Office apps, so dropping it saves little. Dropping Google Workspace saves more.
- **You take on uptime and backups.** Microsoft and Google run offsite backups and redundant data centres. This system needs an offsite backup and a tested restore from Phase 1, not only in Phase 5.
- **Remote access depends on the server's internet line.** Hosting the server in Azure or a data centre, rather than the office, gives remote users better speed and reliability.
- **The desktop app and phone apps are the largest single pieces of work.** They are separate programs, and are planned last so the server is proven first.
- **The document editor is licensed separately.** The free editions of ONLYOFFICE and Collabora limit simultaneous editors; larger teams need a paid licence.

### Delivery phases

The work ships in six phases, in order. Phase 1 gives staff a working, secure SFTP server. External users get access only after Phase 2 passes an outside penetration test.

[chart: delivery roadmap · 6 phases, 2 gates]

Each phase ends with a Windows test checklist run on a Windows Server 2025 machine. The next phase starts only once that checklist passes.

### Scope, risks and open decisions

**Not included:** Active Directory or Entra ID logins (local accounts only, as decided), and a native desktop admin app (the console is web-based). The Explorer drive app and phone apps are in Phase 6.

| Risk | Effect | How it's handled |
|---|---|---|
| Windows-only parts can't be tested in the build environment | Defender, Event Log, firewall and service bugs found late | A test checklist for each release, run on a Windows Server 2025 test machine |
| Internet-facing file servers are prime targets | A flaw could expose partner data | Security built in from Phase 1, external penetration test before external users go live |
| Scope is large | Later phases take longer than hoped | Phases ship in order; each one is usable on its own |
| One server is a single point of failure until Phase 5 | Outage if the server fails | Nightly configuration backup and VSS snapshots; documented rebuild steps |
| Destroyed files are truly gone | A mistaken rule can't be undone | Warnings before destruction, legal hold, and destruction rules that need confirmation |

**Open decisions**

- [ ] GitHub repository: no repository is attached to this build session yet. Which one should the code go in?
- [ ] Windows Server 2025 test machine: who provides it, and who runs the release checklist?
- [ ] Public address: which domain name and certificate for the web client and SFTP?
- [ ] Email: which mail server or Microsoft 365 account sends notifications?
- [ ] Default limits: maximum share expiry, external account lifetime, and maximum upload size.
- [ ] Penetration tester: internal team or an outside firm?

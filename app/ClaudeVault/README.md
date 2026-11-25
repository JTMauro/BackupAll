# Claude Vault 1.0.0

Claude Vault backs up everything Claude-related on your PC on a schedule. It sends the backup to a folder you choose (such as OneDrive), to Git, or to both.

## Install

1. Unzip `ClaudeVault.zip` into Documents. Avoid a network drive.
2. Right-click the zip first and choose **Properties → Unblock**, so Windows doesn't block the scripts.
3. Double-click **INSTALL Claude Vault.cmd**. This adds Start menu and Desktop shortcuts and opens the app.
4. On the **Settings** tab:
   - Pick **Send backups to**. **Both** is recommended.
   - Choose your folder, for example `OneDrive - Cydcor\Claude Backup`.
   - Set the schedule.
   - Click **Save and set schedule**.
5. On the **Backup** tab, click **Back up now** once. The first time, Git asks you to sign in to GitHub.

You need **Git for Windows** (https://git-scm.com) for the Git and cloud-backup steps. Folder-only backups work without it.

## What it backs up

| Step | Source | Notes |
| --- | --- | --- |
| Claude Code on this PC | `%USERPROFILE%\.claude` | Sessions, settings, skills, agents, CLAUDE.md. Sign-in tokens are never copied. |
| Claude Desktop | `%APPDATA%\Claude\*.json` | Settings only. Kept out of Git because they can hold API keys. |
| claude.ai exports | Downloads folder | Each export zip is filed by date. Every chat becomes a Markdown file, and each Project gets its instructions and knowledge files. |
| Cloud backup | GitHub `JTMauro/backupall` | All artifact sources, every cloud Claude Code session, and the memory pack. A weekly Claude session updates it. |

Every run also keeps a dated copy in `snapshots\`; the newest 8 are kept by default. Files deleted on your PC are never deleted from the backup.

## The one manual step

Anthropic doesn't let any app start a claude.ai export automatically. Claude Vault reminds you every 30 days (you can change this) and opens the export page. Click **Export data**, then save the emailed zip to Downloads. The next backup files it.

## Restore

- **Claude Code sessions:** Restore → *Put Claude Code sessions back*. Then run `claude --resume` in the project folder.
- **Memory:** Restore → *Copy memory pack to clipboard*. Paste it into Claude under Settings → Memory, or into a Project's instructions.
- **Artifacts:** each folder holds `index.html`, which works offline, and `meta.json` with the original link. Ask Claude to republish any of them.
- **Chats and Projects:** open the Markdown files and upload them to a new chat or Project.

## Status

Written for Windows 10/11 with the built-in Windows PowerShell 5.1. Not yet tested on a real PC.

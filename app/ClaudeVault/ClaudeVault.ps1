<#
  Claude Vault - backs up everything Claude-related on this PC, on a schedule.

  What it backs up (each step can be turned off in Settings):
    1. Claude Code on this PC        %USERPROFILE%\.claude (sessions, settings, skills, agents, CLAUDE.md)
    2. Claude Desktop settings       %APPDATA%\Claude (config only, no caches)
    3. claude.ai export zips         found in Downloads, filed by date, chats turned into readable Markdown
    4. Cloud backup (GitHub)         clones/pulls the BackupAll repo that the weekly Claude session writes to

  Where it goes:  a folder you choose (e.g. OneDrive\Claude Backup), a Git repo, or both.

  Usage:
    ClaudeVault.ps1               opens the window
    ClaudeVault.ps1 -RunBackup    runs a backup with no window (used by the scheduled task)
#>
param([switch]$RunBackup, [switch]$Review)

$ErrorActionPreference = 'Stop'
$AppName    = 'Claude Vault'
$AppVersion = '1.2.0'
$AppDir     = Join-Path $env:APPDATA 'ClaudeVault'
$ConfigPath = Join-Path $AppDir 'config.json'
$LogPath    = Join-Path $AppDir 'ClaudeVault.log'
$StatePath  = Join-Path $AppDir 'state.json'
$TaskName   = 'Claude Vault Backup'
$ExportPage = 'https://claude.ai/settings/data-privacy-controls'
$OrgExportPage = 'https://claude.ai/admin-settings/data-privacy-controls'
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

# Files that hold sign-in tokens or API keys. Never copied into a Git repo.
$SecretNames = @('.credentials.json', 'credentials.json', 'claude_desktop_config.json', '.claude.json')

# ---------------------------------------------------------------- config / state

function Get-DefaultBackupFolder {
    $od = $env:OneDriveCommercial
    if (-not $od) { $od = $env:OneDrive }
    if (-not $od) { $od = [Environment]::GetFolderPath('MyDocuments') }
    return (Join-Path $od 'Claude Backup')
}

function Get-Config {
    $default = [ordered]@{
        Destination        = 'Folder'          # Folder | Git | Both
        BackupFolder       = (Get-DefaultBackupFolder)
        GitRepoUrl         = 'https://github.com/JTMauro/backupall.git'
        GitLocalPath       = (Join-Path $env:LOCALAPPDATA 'ClaudeVault\repo')
        IncludeClaudeCode  = $true
        IncludeDesktop     = $true
        IncludeExports     = $true
        IncludeCloudRepo   = $true
        DownloadsFolder    = (Join-Path $env:USERPROFILE 'Downloads')
        Schedule           = 'Daily'           # Daily | Weekly
        ScheduleDay        = 'Sunday'
        ScheduleTime       = '20:13'
        ExportReminderDays = 30
        ReviewReminderDays = 30                # monthly list of backups to review and delete
        KeepSnapshots      = 0                 # 0 = keep forever
        StopAutoDelete     = $true             # raise Claude Code's cleanupPeriodDays so old sessions stay on the PC
    }
    if (Test-Path $ConfigPath) {
        try {
            $saved = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            foreach ($p in $saved.PSObject.Properties) { $default[$p.Name] = $p.Value }
        } catch { Write-Log "Config unreadable, using defaults: $_" }
    }
    return $default
}

function Save-Config($cfg) { $cfg | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8 }

function Get-State {
    if (Test-Path $StatePath) { try { return (Get-Content $StatePath -Raw | ConvertFrom-Json) } catch {} }
    return [pscustomobject]@{ LastBackup = $null; LastExportSeen = $null; ProcessedExports = @() }
}
function Save-State($s) { $s | ConvertTo-Json -Depth 5 | Set-Content -Path $StatePath -Encoding UTF8 }

$script:LogBox = $null
function Write-Log([string]$msg) {
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $LogPath -Value $line -Encoding UTF8
    if ($script:LogBox) {
        $script:LogBox.AppendText($line + [Environment]::NewLine)
        [System.Windows.Forms.Application]::DoEvents()
    }
}

# ---------------------------------------------------------------- helpers

function Copy-Tree($src, $dst, [string[]]$excludeDirs = @(), [string[]]$excludeFiles = @()) {
    # robocopy /E copies everything and never deletes from the backup. Exit codes below 8 mean success.
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    $rc = @($src, $dst, '/E', '/R:1', '/W:1', '/NP', '/NFL', '/NDL', '/NJH', '/NJS', '/XJ')
    if ($excludeDirs.Count)  { $rc += '/XD'; $rc += $excludeDirs }
    if ($excludeFiles.Count) { $rc += '/XF'; $rc += $excludeFiles }
    & robocopy @rc | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE) copying $src" }
}

function Get-SafeName([string]$s, [int]$max = 80) {
    if (-not $s) { $s = 'untitled' }
    $s = ($s -replace '[\\/:*?"<>|\r\n\t]', ' ' -replace '\s+', ' ').Trim()
    if ($s.Length -gt $max) { $s = $s.Substring(0, $max).Trim() }
    if (-not $s) { $s = 'untitled' }
    return $s
}

function Test-Git { return [bool](Get-Command git -ErrorAction SilentlyContinue) }

function Invoke-Git([string]$repo, [string[]]$gitArgs) {
    # Git writes progress to stderr; Windows PowerShell would treat that as a fatal error under 'Stop'.
    $ErrorActionPreference = 'Continue'
    $out = & git -C $repo @gitArgs 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { throw "git $($gitArgs -join ' ') failed: $out" }
    return $out
}

# ---------------------------------------------------------------- backup steps

function Backup-ClaudeCode($stage) {
    $src = Join-Path $env:USERPROFILE '.claude'
    if (-not (Test-Path $src)) { Write-Log 'Claude Code: no .claude folder on this PC, skipped.'; return }
    if ((Get-Config).StopAutoDelete) { Set-NoAutoDelete }
    $dst = Join-Path $stage 'local-claude-code\.claude'
    # Caches and logs are skipped; sessions (projects), todos, settings, skills, agents, plugins and CLAUDE.md are kept.
    # Sign-in tokens (.credentials.json) are never copied anywhere.
    Copy-Tree $src $dst @('statsig', 'shell-snapshots', 'ide', 'cache', 'logs') @('.credentials.json')
    $cfg = Join-Path $env:USERPROFILE '.claude.json'
    if (Test-Path $cfg) { Copy-Item $cfg (Join-Path $stage 'local-claude-code\.claude.json') -Force }
    $n = (Get-ChildItem (Join-Path $dst 'projects') -Recurse -Filter *.jsonl -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Log "Claude Code: copied .claude ($n session transcripts)."
}

function Set-NoAutoDelete {
    # Claude Code deletes sessions older than cleanupPeriodDays (default 30). Raise it to about 10 years.
    $sf = Join-Path $env:USERPROFILE '.claude\settings.json'
    try {
        $j = if (Test-Path $sf) { Get-Content $sf -Raw -Encoding UTF8 | ConvertFrom-Json } else { [pscustomobject]@{} }
        if ($j.cleanupPeriodDays -ge 3650) { return }
        Copy-Item $sf "$sf.bak" -Force -ErrorAction SilentlyContinue
        $j | Add-Member -NotePropertyName cleanupPeriodDays -NotePropertyValue 3650 -Force
        $j | ConvertTo-Json -Depth 30 | Set-Content $sf -Encoding UTF8
        Write-Log 'Claude Code: auto-delete of old sessions turned off (cleanupPeriodDays = 3650). Old settings saved as settings.json.bak.'
    } catch { Write-Log "Could not update Claude Code settings.json: $_" }
}

function Backup-Desktop($stage) {
    $src = Join-Path $env:APPDATA 'Claude'
    if (-not (Test-Path $src)) { Write-Log 'Claude Desktop: not installed, skipped.'; return }
    $dst = Join-Path $stage 'claude-desktop'
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Get-ChildItem $src -File -Filter *.json -ErrorAction SilentlyContinue | Copy-Item -Destination $dst -Force
    Write-Log 'Claude Desktop: copied settings files.'
}

function Convert-ExportToMarkdown($extractDir, $outDir) {
    # claude.ai export: conversations.json (list of chats) and, when present, projects.json and users.json.
    $chatsOut = Join-Path $outDir 'chats'
    New-Item -ItemType Directory -Force -Path $chatsOut | Out-Null
    $convFile = Get-ChildItem $extractDir -Recurse -Filter 'conversations.json' | Select-Object -First 1
    $count = 0
    if ($convFile) {
        $convs = Get-Content $convFile.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $index = New-Object System.Text.StringBuilder
        [void]$index.AppendLine('# claude.ai chats'); [void]$index.AppendLine()
        [void]$index.AppendLine('| Date | Chat | Messages |'); [void]$index.AppendLine('| --- | --- | --- |')
        foreach ($c in $convs) {
            $date = if ($c.created_at) { ([datetime]$c.created_at).ToString('yyyy-MM-dd') } else { 'undated' }
            $name = Get-SafeName $c.name
            $file = "$date $name.md"
            $i = 2; while (Test-Path (Join-Path $chatsOut $file)) { $file = "$date $name ($i).md"; $i++ }
            $sb = New-Object System.Text.StringBuilder
            [void]$sb.AppendLine("# $($c.name)"); [void]$sb.AppendLine()
            [void]$sb.AppendLine("*Created $($c.created_at) - updated $($c.updated_at) - id $($c.uuid)*"); [void]$sb.AppendLine()
            if ($c.summary) { [void]$sb.AppendLine("**Summary:** $($c.summary)"); [void]$sb.AppendLine() }
            $msgs = @($c.chat_messages)
            foreach ($m in $msgs) {
                $who = if ($m.sender -eq 'human') { 'You' } else { 'Claude' }
                $text = $m.text
                if (-not $text -and $m.content) { $text = (@($m.content) | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }) -join "`n" }
                [void]$sb.AppendLine("## $who - $($m.created_at)"); [void]$sb.AppendLine()
                [void]$sb.AppendLine($text); [void]$sb.AppendLine()
                foreach ($a in @($m.attachments) + @($m.files)) {
                    if ($a -and $a.file_name) { [void]$sb.AppendLine("*Attachment: $($a.file_name)*") }
                }
            }
            Set-Content -Path (Join-Path $chatsOut $file) -Value $sb.ToString() -Encoding UTF8
            [void]$index.AppendLine("| $date | [$($name -replace '\|','/')](chats/$([uri]::EscapeDataString($file))) | $($msgs.Count) |")
            $count++
        }
        Set-Content -Path (Join-Path $outDir 'CHATS-INDEX.md') -Value $index.ToString() -Encoding UTF8
    }
    $projFile = Get-ChildItem $extractDir -Recurse -Filter 'projects.json' | Select-Object -First 1
    $pcount = 0
    if ($projFile) {
        $projOut = Join-Path $outDir 'projects'
        foreach ($p in (Get-Content $projFile.FullName -Raw -Encoding UTF8 | ConvertFrom-Json)) {
            $pdir = Join-Path $projOut (Get-SafeName $p.name)
            New-Item -ItemType Directory -Force -Path (Join-Path $pdir 'knowledge') | Out-Null
            $about = "# $($p.name)`n`n$($p.description)`n`n## Project instructions`n`n$($p.prompt_template)`n"
            Set-Content -Path (Join-Path $pdir 'PROJECT.md') -Value $about -Encoding UTF8
            foreach ($d in @($p.docs)) {
                if ($d -and $d.content) {
                    Set-Content -Path (Join-Path $pdir ('knowledge\' + (Get-SafeName $d.filename 120))) -Value $d.content -Encoding UTF8
                }
            }
            $pcount++
        }
    }
    Write-Log "Export: wrote $count chats and $pcount projects as Markdown."
}

function Backup-Exports($cfg, $stage, $state) {
    $dl = $cfg.DownloadsFolder
    if (-not (Test-Path $dl)) { Write-Log "Exports: Downloads folder not found ($dl)."; return }
    $done = @($state.ProcessedExports)
    $zips = Get-ChildItem $dl -File -Filter '*.zip' -ErrorAction SilentlyContinue |
            Where-Object { $_.Length -gt 0 } |
            Sort-Object LastWriteTime
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    foreach ($z in $zips) {
        $key = "$($z.Name)|$($z.Length)"
        if ($done -contains $key) { continue }
        # Only take zips that are really claude.ai exports.
        $isExport = $false
        try {
            $arc = [IO.Compression.ZipFile]::OpenRead($z.FullName)
            $isExport = [bool]($arc.Entries | Where-Object { $_.Name -eq 'conversations.json' })
            $arc.Dispose()
        } catch { continue }
        if (-not $isExport) { continue }
        $stamp = $z.LastWriteTime.ToString('yyyy-MM-dd_HHmm')
        $dst = Join-Path $stage "claude-ai-exports\$stamp"
        New-Item -ItemType Directory -Force -Path $dst | Out-Null
        Copy-Item $z.FullName (Join-Path $dst $z.Name) -Force
        $tmp = Join-Path $env:TEMP "ClaudeVault-$stamp"
        if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
        [IO.Compression.ZipFile]::ExtractToDirectory($z.FullName, $tmp)
        Convert-ExportToMarkdown $tmp $dst
        Remove-Item $tmp -Recurse -Force
        $done += $key
        $state.LastExportSeen = (Get-Date).ToString('o')
        Write-Log "Exports: filed $($z.Name) as $stamp."
    }
    $state.ProcessedExports = $done
}

function Import-ExportZip([string]$zipPath) {
    # Files one claude.ai export zip right away (used by the Export tab). Returns a short result line.
    $cfg = Get-Config; $state = Get-State
    $dl = $cfg.DownloadsFolder
    if ((Split-Path $zipPath -Parent) -ne $dl) { Copy-Item $zipPath (Join-Path $dl (Split-Path $zipPath -Leaf)) -Force }
    $stage = Join-Path $cfg.BackupFolder 'latest'
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    $before = (Get-ChildItem (Join-Path $stage 'claude-ai-exports') -Recurse -Filter *.md -ErrorAction SilentlyContinue | Measure-Object).Count
    Backup-Exports $cfg $stage $state
    Save-State $state
    $after = (Get-ChildItem (Join-Path $stage 'claude-ai-exports') -Recurse -Filter *.md -ErrorAction SilentlyContinue | Measure-Object).Count
    return "Saved $($after - $before) new chat and project files to $(Join-Path $stage 'claude-ai-exports')."
}

function Test-IsExportZip([string]$path) {
    try {
        Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
        $a = [IO.Compression.ZipFile]::OpenRead($path)
        $ok = [bool]($a.Entries | Where-Object { $_.Name -eq 'conversations.json' }); $a.Dispose(); return $ok
    } catch { return $false }
}

function Sync-CloudRepo($cfg) {
    if (-not (Test-Git)) { Write-Log 'Cloud backup: Git is not installed, skipped. Install Git for Windows to enable.'; return $null }
    $repo = $cfg.GitLocalPath
    if (-not (Test-Path (Join-Path $repo '.git'))) {
        New-Item -ItemType Directory -Force -Path (Split-Path $repo) | Out-Null
        Write-Log "Cloud backup: cloning $($cfg.GitRepoUrl) (first run asks you to sign in to GitHub)."
        $ErrorActionPreference = 'Continue'
        & git clone $cfg.GitRepoUrl $repo 2>&1 | ForEach-Object { Write-Log "  $_" }
        if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
    } else {
        Invoke-Git $repo @('pull', '--rebase', '--autostash') | Out-Null
        Write-Log 'Cloud backup: pulled latest from GitHub.'
    }
    return $repo
}

function Publish-ToGit($cfg, $stage, $repo) {
    $pcDir = Join-Path $repo ('pc\' + (Get-SafeName $env:COMPUTERNAME))
    # Copy everything except secrets (tokens, API keys) into the repo.
    Copy-Tree $stage $pcDir @() $SecretNames
    Invoke-Git $repo @('add', '-A') | Out-Null
    & git -C $repo diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Write-Log 'Git: nothing new to push.'; return }
    Invoke-Git $repo @('commit', '-m', "Claude Vault backup from $env:COMPUTERNAME $(Get-Date -Format 'yyyy-MM-dd HH:mm')") | Out-Null
    Invoke-Git $repo @('push') | Out-Null
    Write-Log 'Git: pushed this PC''s backup to GitHub.'
}

function Remove-OldSnapshots($root, [int]$keep) {
    if ($keep -le 0) { return }   # 0 = keep forever
    $snaps = Get-ChildItem (Join-Path $root 'snapshots') -ErrorAction SilentlyContinue | Sort-Object Name -Descending
    $snaps | Select-Object -Skip $keep | ForEach-Object { Remove-Item $_.FullName -Recurse -Force; Write-Log "Removed old snapshot $($_.Name)." }
}

function Invoke-Backup {
    $cfg = Get-Config; $state = Get-State
    Write-Log "=== $AppName $AppVersion backup started ==="
    $root = $cfg.BackupFolder
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $stage = Join-Path $root 'latest'
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    $errors = @()

    foreach ($step in @(
        @{ On = $cfg.IncludeClaudeCode; Name = 'Claude Code'; Do = { Backup-ClaudeCode $stage } },
        @{ On = $cfg.IncludeDesktop;    Name = 'Desktop';     Do = { Backup-Desktop $stage } },
        @{ On = $cfg.IncludeExports;    Name = 'Exports';     Do = { Backup-Exports $cfg $stage $state } })) {
        if (-not $step.On) { continue }
        try { & $step.Do | Out-Null } catch { $errors += "$($step.Name): $_"; Write-Log "ERROR $($step.Name): $_" }
    }

    $repo = $null
    if ($cfg.IncludeCloudRepo -or $cfg.Destination -in @('Git', 'Both')) {
        try { $repo = Sync-CloudRepo $cfg } catch { $errors += "Cloud repo: $_"; Write-Log "ERROR cloud repo: $_" }
    }
    if ($repo -and $cfg.IncludeCloudRepo -and $cfg.Destination -in @('Folder', 'Both')) {
        try { Copy-Tree $repo (Join-Path $root 'cloud-backup') @('.git') @(); Write-Log 'Cloud backup: copied into backup folder.' }
        catch { $errors += "Cloud copy: $_"; Write-Log "ERROR cloud copy: $_" }
    }
    if ($repo -and $cfg.Destination -in @('Git', 'Both')) {
        try { Publish-ToGit $cfg $stage $repo } catch { $errors += "Git push: $_"; Write-Log "ERROR git push: $_" }
    }

    # Dated snapshot of this PC's files, so an accidental deletion can be undone.
    if ($cfg.Destination -in @('Folder', 'Both')) {
        try {
            $snapDir = Join-Path $root 'snapshots'
            New-Item -ItemType Directory -Force -Path $snapDir | Out-Null
            $zip = Join-Path $snapDir ((Get-Date -Format 'yyyy-MM-dd_HHmm') + '.zip')
            Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
            [IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, [IO.Compression.CompressionLevel]::Optimal, $false)
            Write-Log ('Snapshot saved: ' + $zip)
            Remove-OldSnapshots $root ([int]$cfg.KeepSnapshots)
        } catch { $errors += "Snapshot: $_"; Write-Log "ERROR snapshot: $_" }
    } else {
        # Git only: the staged copy lives in the repo, so the local folder is only a work area.
        Write-Log 'Destination is Git only; the local "latest" folder is a work area.'
    }

    $state.LastBackup = (Get-Date).ToString('o')
    Save-State $state
    Write-ReadMe $root
    if ($errors.Count) { Write-Log "=== Finished with $($errors.Count) problem(s) ===" } else { Write-Log '=== Finished OK ===' }
    Test-ExportReminder $cfg $state
    Test-ReviewReminder $cfg $state
    return $errors
}

function Write-ReadMe($root) {
    $text = @"
# Claude Backup - start here

Made by $AppName $AppVersion on $env:COMPUTERNAME. Last run $(Get-Date -Format 'yyyy-MM-dd HH:mm').

| Folder | What it holds | How to restore |
| --- | --- | --- |
| latest\local-claude-code | Claude Code on this PC: sessions, settings, skills, CLAUDE.md | Claude Vault > Restore > "Put Claude Code sessions back", then run ``claude --resume`` |
| latest\claude-desktop | Claude Desktop settings | Copy the files back to %APPDATA%\Claude |
| latest\claude-ai-exports | Your claude.ai exports, with every chat as Markdown and each Project's instructions and knowledge | Upload a chat or PROJECT.md to a new chat or Project |
| cloud-backup\artifacts | Full source of every artifact and Doc | Open index.html offline, or ask Claude to republish it |
| cloud-backup\sessions | Every cloud Claude Code session: summary + your messages | Paste the section into a new session and say "continue from here" |
| cloud-backup\memory-pack | Who you are, how you work, every project in one page | Paste into Claude's memory or a Project's instructions |
| snapshots | Dated copies of "latest" | Copy back whatever was lost |

The master index also lives in Claude: https://claude.ai/artifact/QBahUjAzjftw6EFWWAo5jv
"@
    Set-Content -Path (Join-Path $root 'README - START HERE.md') -Value $text -Encoding UTF8
}

function Test-ExportReminder($cfg, $state) {
    $days = [int]$cfg.ExportReminderDays
    if ($days -le 0 -or -not $cfg.IncludeExports) { return }
    $last = [datetime]::MinValue
    foreach ($v in @($state.LastExportSeen, $state.LastReminder)) { if ($v -and ([datetime]$v) -gt $last) { $last = [datetime]$v } }
    if (((Get-Date) - $last).TotalDays -lt $days) { return }
    $state | Add-Member -NotePropertyName LastReminder -NotePropertyValue (Get-Date).ToString('o') -Force
    Save-State $state
    Write-Log "Reminder: no claude.ai export in $days days. Opening the export page."
    Show-Toast 'Time to export your claude.ai chats' 'Click "Export data". When the zip lands in Downloads, Claude Vault files it on the next run.'
    Start-Process $ExportPage
}

function Test-ReviewReminder($cfg, $state) {
    $days = [int]$cfg.ReviewReminderDays
    if ($days -le 0) { return }
    $last = if ($state.LastReview) { [datetime]$state.LastReview } else { [datetime]::MinValue }
    if (((Get-Date) - $last).TotalDays -lt $days) { return }
    $state | Add-Member -NotePropertyName LastReview -NotePropertyValue (Get-Date).ToString('o') -Force
    Save-State $state
    Write-Log 'Monthly review: opening the list of backups so you can choose what to delete.'
    if ($RunBackup) {
        $ps = Join-Path $PSHOME 'powershell.exe'
        Start-Process $ps -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -Review"
    }
}

function Get-ReviewItems($cfg) {
    $root = $cfg.BackupFolder; $items = @()
    foreach ($f in Get-ChildItem (Join-Path $root 'snapshots') -File -ErrorAction SilentlyContinue) {
        $items += [pscustomobject]@{ Kind = 'Snapshot'; Name = $f.Name; Date = $f.LastWriteTime; Size = $f.Length; Path = $f.FullName }
    }
    foreach ($f in Get-ChildItem (Join-Path $root 'latest\local-claude-code\.claude\projects') -Recurse -Filter *.jsonl -ErrorAction SilentlyContinue) {
        $items += [pscustomobject]@{ Kind = 'Claude Code session'; Name = "$($f.Directory.Name)\$($f.Name)"; Date = $f.LastWriteTime; Size = $f.Length; Path = $f.FullName }
    }
    foreach ($f in Get-ChildItem (Join-Path $root 'latest\claude-ai-exports') -Recurse -Filter *.md -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -eq 'chats' }) {
        $items += [pscustomobject]@{ Kind = 'claude.ai chat'; Name = $f.BaseName; Date = $f.LastWriteTime; Size = $f.Length; Path = $f.FullName }
    }
    return ($items | Sort-Object Date -Descending)
}

function Show-Toast($title, $text) {
    try {
        Add-Type -AssemblyName System.Windows.Forms, System.Drawing
        $n = New-Object System.Windows.Forms.NotifyIcon
        $n.Icon = [System.Drawing.SystemIcons]::Information
        $n.BalloonTipTitle = $title; $n.BalloonTipText = $text; $n.Visible = $true
        $n.ShowBalloonTip(10000); Start-Sleep -Seconds 6; $n.Dispose()
    } catch {}
}

# ---------------------------------------------------------------- schedule

function Install-Schedule($cfg) {
    $ps = Join-Path $PSHOME 'powershell.exe'
    if (-not (Test-Path $ps)) { $ps = 'powershell.exe' }
    $action = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -RunBackup"
    $at = [datetime]::ParseExact($cfg.ScheduleTime, 'HH:mm', $null)
    if ($cfg.Schedule -eq 'Weekly') { $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $cfg.ScheduleDay -At $at }
    else { $trigger = New-ScheduledTaskTrigger -Daily -At $at }
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Backs up Claude Code, Claude Desktop and claude.ai exports.' -Force | Out-Null
    Write-Log "Schedule set: $($cfg.Schedule) at $($cfg.ScheduleTime)$(if ($cfg.Schedule -eq 'Weekly') { ' on ' + $cfg.ScheduleDay }). Missed runs catch up when the PC wakes."
}

function Remove-Schedule {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Log 'Schedule removed.'
    }
}

function Get-ScheduleText {
    $t = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $t) { return 'Not scheduled' }
    $i = $t | Get-ScheduledTaskInfo
    return "Scheduled. Next run: $($i.NextRunTime)   Last run: $($i.LastRunTime)"
}

# ---------------------------------------------------------------- restore

function Restore-ClaudeCode($cfg) {
    $src = Join-Path $cfg.BackupFolder 'latest\local-claude-code\.claude\projects'
    if (-not (Test-Path $src)) {
        $src = Get-ChildItem (Join-Path $cfg.GitLocalPath 'pc') -Directory -ErrorAction SilentlyContinue |
               ForEach-Object { Join-Path $_.FullName 'local-claude-code\.claude\projects' } | Where-Object { Test-Path $_ } | Select-Object -First 1
    }
    if (-not $src) { throw 'No Claude Code backup found yet. Run a backup first.' }
    $dst = Join-Path $env:USERPROFILE '.claude\projects'
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    # /XO: never overwrite a session that is newer on this PC.
    & robocopy $src $dst /E /XO /R:1 /W:1 /NP /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }
    Write-Log "Restored Claude Code sessions into $dst. Run 'claude --resume' in the project folder to pick one."
}

function Copy-MemoryPack($cfg) {
    $candidates = @(
        (Join-Path $cfg.BackupFolder 'cloud-backup\memory-pack\MEMORY-PACK.md'),
        (Join-Path $cfg.GitLocalPath 'memory-pack\MEMORY-PACK.md'))
    $f = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $f) { throw 'Memory pack not found yet. Run a backup with "Cloud backup" on.' }
    Set-Clipboard -Value (Get-Content $f -Raw -Encoding UTF8)
    Write-Log 'Memory pack copied to the clipboard. Paste it into Claude (Settings > Memory, or a Project''s instructions).'
}

# ---------------------------------------------------------------- headless mode

if ($RunBackup) {
    try { Invoke-Backup | Out-Null } catch { Write-Log "FATAL: $_" }
    exit 0
}

# ---------------------------------------------------------------- window

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$cfg = Get-Config

$form = New-Object System.Windows.Forms.Form
$form.Text = "$AppName $AppVersion"
$form.Size = New-Object System.Drawing.Size(760, 640)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)
$form.MinimumSize = $form.Size

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Dock = 'Fill'
$form.Controls.Add($tabs)

function New-Tab($title) { $t = New-Object System.Windows.Forms.TabPage; $t.Text = $title; $tabs.TabPages.Add($t); return $t }
function Pt($x, $y) { New-Object System.Drawing.Point([int]$x, [int]$y) }
function Sz($w, $h) { New-Object System.Drawing.Size([int]$w, [int]$h) }
function Add-Label($parent, $text, $x, $y, $w = 160) { $l = New-Object System.Windows.Forms.Label; $l.Text = $text; $l.Location = (Pt $x $y); $l.Size = (Sz $w 22); $parent.Controls.Add($l); return $l }
function Add-Text($parent, $text, $x, $y, $w = 420) { $t = New-Object System.Windows.Forms.TextBox; $t.Text = "$text"; $t.Location = (Pt $x $y); $t.Width = $w; $parent.Controls.Add($t); return $t }
function Add-Check($parent, $text, $checked, $x, $y, $w = 600) { $c = New-Object System.Windows.Forms.CheckBox; $c.Text = $text; $c.Checked = [bool]$checked; $c.Location = (Pt $x $y); $c.Width = $w; $parent.Controls.Add($c); return $c }
function Add-Button($parent, $text, $x, $y, $w = 200) { $b = New-Object System.Windows.Forms.Button; $b.Text = $text; $b.Location = (Pt $x $y); $b.Size = (Sz $w 32); $parent.Controls.Add($b); return $b }
function Add-Combo($parent, $items, $value, $x, $y, $w = 140) { $c = New-Object System.Windows.Forms.ComboBox; $c.DropDownStyle = 'DropDownList'; [void]$c.Items.AddRange([object[]]$items); $c.SelectedItem = $value; $c.Location = (Pt $x $y); $c.Width = $w; $parent.Controls.Add($c); return $c }
function Pick-Folder($box) { $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.SelectedPath = $box.Text; if ($d.ShowDialog() -eq 'OK') { $box.Text = $d.SelectedPath } }

# --- Backup tab
$tB = New-Tab 'Backup'
$status = Add-Label $tB '' 12 12 700
$btnRun = Add-Button $tB 'Back up now' 12 44
$btnOpen = Add-Button $tB 'Open backup folder' 222 44
$btnExport = Add-Button $tB 'Open claude.ai export page' 432 44 230
$script:LogBox = New-Object System.Windows.Forms.TextBox
$script:LogBox.Multiline = $true; $script:LogBox.ScrollBars = 'Vertical'; $script:LogBox.ReadOnly = $true
$script:LogBox.Location = (Pt 12 90); $script:LogBox.Size = (Sz 710 460); $script:LogBox.Anchor = 'Top,Bottom,Left,Right'
$script:LogBox.Font = New-Object System.Drawing.Font('Consolas', 9)
$tB.Controls.Add($script:LogBox)
if (Test-Path $LogPath) { $script:LogBox.Text = ((Get-Content $LogPath -Tail 200) -join [Environment]::NewLine) + [Environment]::NewLine }

function Update-Status {
    $s = Get-State
    $last = if ($s.LastBackup) { ([datetime]$s.LastBackup).ToString('ddd MMM d, h:mm tt') } else { 'never' }
    $status.Text = "Last backup: $last.   $(Get-ScheduleText)"
}
Update-Status

$btnRun.Add_Click({
    $btnRun.Enabled = $false; $form.Cursor = 'WaitCursor'
    try {
        $errs = Invoke-Backup
        if ($errs.Count) { [System.Windows.Forms.MessageBox]::Show(($errs -join "`n"), 'Backup finished with problems', 'OK', 'Warning') | Out-Null }
    } catch { [System.Windows.Forms.MessageBox]::Show("$_", 'Backup failed', 'OK', 'Error') | Out-Null }
    finally { $btnRun.Enabled = $true; $form.Cursor = 'Default'; Update-Status }
})
$btnOpen.Add_Click({ $c = Get-Config; New-Item -ItemType Directory -Force -Path $c.BackupFolder | Out-Null; Start-Process explorer.exe $c.BackupFolder })
$btnExport.Add_Click({ Start-Process $ExportPage })

# --- Settings tab
$tS = New-Tab 'Settings'
Add-Label $tS 'Send backups to' 12 16 | Out-Null
$cDest = Add-Combo $tS @('Folder', 'Git', 'Both') $cfg.Destination 180 13
Add-Label $tS 'Folder = the folder below.  Git = the GitHub repo.  Both = recommended.' 330 16 400 | Out-Null

Add-Label $tS 'Backup folder' 12 52 | Out-Null
$tFolder = Add-Text $tS $cfg.BackupFolder 180 49
$b1 = Add-Button $tS 'Browse...' 610 46 100; $b1.Add_Click({ Pick-Folder $tFolder })

Add-Label $tS 'Git repo URL' 12 88 | Out-Null
$tRepo = Add-Text $tS $cfg.GitRepoUrl 180 85
Add-Label $tS 'Local copy of repo' 12 124 | Out-Null
$tRepoPath = Add-Text $tS $cfg.GitLocalPath 180 121
$b2 = Add-Button $tS 'Browse...' 610 118 100; $b2.Add_Click({ Pick-Folder $tRepoPath })

Add-Label $tS 'Downloads folder' 12 160 | Out-Null
$tDl = Add-Text $tS $cfg.DownloadsFolder 180 157
$b3 = Add-Button $tS 'Browse...' 610 154 100; $b3.Add_Click({ Pick-Folder $tDl })

$cCode = Add-Check $tS 'Claude Code on this PC (sessions, settings, skills, CLAUDE.md)' $cfg.IncludeClaudeCode 12 200
$cDesk = Add-Check $tS 'Claude Desktop settings' $cfg.IncludeDesktop 12 226
$cExp  = Add-Check $tS 'claude.ai export zips from Downloads (chats and Projects as Markdown)' $cfg.IncludeExports 12 252
$cRepo = Add-Check $tS 'Cloud backup from GitHub (artifacts, cloud sessions, memory pack)' $cfg.IncludeCloudRepo 12 278

Add-Label $tS 'Schedule' 12 322 | Out-Null
$cSched = Add-Combo $tS @('Daily', 'Weekly') $cfg.Schedule 180 319 100
$cDay = Add-Combo $tS @('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') $cfg.ScheduleDay 290 319 120
Add-Label $tS 'at (24h HH:mm)' 420 322 100 | Out-Null
$tTime = Add-Text $tS $cfg.ScheduleTime 525 319 70
Add-Label $tS 'Remind me to export every' 12 358 | Out-Null
$tRemind = Add-Text $tS $cfg.ExportReminderDays 180 355 50
Add-Label $tS 'days (0 = off)' 236 358 | Out-Null
Add-Label $tS 'Keep snapshots (0 = forever)' 12 394 | Out-Null
$tKeep = Add-Text $tS $cfg.KeepSnapshots 180 391 50

$btnSave = Add-Button $tS 'Save and set schedule' 12 440 220
$btnUnsched = Add-Button $tS 'Turn schedule off' 242 440 180
$btnSave.Add_Click({
    try {
        $null = [datetime]::ParseExact($tTime.Text, 'HH:mm', $null)
        $c = Get-Config
        $c.Destination = $cDest.SelectedItem; $c.BackupFolder = $tFolder.Text; $c.GitRepoUrl = $tRepo.Text
        $c.GitLocalPath = $tRepoPath.Text; $c.DownloadsFolder = $tDl.Text
        $c.IncludeClaudeCode = $cCode.Checked; $c.IncludeDesktop = $cDesk.Checked
        $c.IncludeExports = $cExp.Checked; $c.IncludeCloudRepo = $cRepo.Checked
        $c.Schedule = $cSched.SelectedItem; $c.ScheduleDay = $cDay.SelectedItem; $c.ScheduleTime = $tTime.Text
        $c.ExportReminderDays = [int]$tRemind.Text; $c.KeepSnapshots = [int]$tKeep.Text
        Save-Config $c; Install-Schedule $c; Update-Status
        if ($c.Destination -ne 'Folder' -and -not (Test-Git)) {
            [System.Windows.Forms.MessageBox]::Show('Git is not installed. Install Git for Windows (git-scm.com) so the Git and cloud-backup steps can run.', $AppName) | Out-Null
        }
        [System.Windows.Forms.MessageBox]::Show('Saved. ' + (Get-ScheduleText), $AppName) | Out-Null
    } catch { [System.Windows.Forms.MessageBox]::Show("Not saved: $_", $AppName, 'OK', 'Error') | Out-Null }
})
$btnUnsched.Add_Click({ Remove-Schedule; Update-Status })

# --- Restore tab
$tR = New-Tab 'Restore'
$info = Add-Label $tR 'Restore brings back your work, memory and context. Old chats come back as readable files, not as live chat threads.' 12 12 700
$info.Height = 40
$r1 = Add-Button $tR 'Put Claude Code sessions back on this PC' 12 60 330
Add-Label $tR 'Copies backed-up sessions into .claude\projects, never overwriting newer ones. Then use: claude --resume' 352 62 380 | Out-Null
$r2 = Add-Button $tR 'Copy memory pack to clipboard' 12 110 330
Add-Label $tR 'Paste into Claude: Settings > Memory, or a Project''s instructions.' 352 112 380 | Out-Null
$r3 = Add-Button $tR 'Open artifacts (full source)' 12 160 330
Add-Label $tR 'Each folder has index.html (opens offline) and meta.json with its original link.' 352 162 380 | Out-Null
$r4 = Add-Button $tR 'Open claude.ai chats and Projects' 12 210 330
Add-Label $tR 'Every chat as Markdown; each Project''s instructions and knowledge files.' 352 212 380 | Out-Null
$r5 = Add-Button $tR 'Open the master index in Claude' 12 260 330

$r1.Add_Click({ try { Restore-ClaudeCode (Get-Config); [System.Windows.Forms.MessageBox]::Show('Sessions restored. Open a terminal in the project folder and run: claude --resume', $AppName) | Out-Null } catch { [System.Windows.Forms.MessageBox]::Show("$_", $AppName) | Out-Null } })
$r2.Add_Click({ try { Copy-MemoryPack (Get-Config); [System.Windows.Forms.MessageBox]::Show('Memory pack copied. Paste it into Claude.', $AppName) | Out-Null } catch { [System.Windows.Forms.MessageBox]::Show("$_", $AppName) | Out-Null } })
$r3.Add_Click({
    $c = Get-Config
    $p = @((Join-Path $c.BackupFolder 'cloud-backup\artifacts'), (Join-Path $c.GitLocalPath 'artifacts')) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($p) { Start-Process explorer.exe $p } else { [System.Windows.Forms.MessageBox]::Show('Not downloaded yet. Run a backup with "Cloud backup" on.', $AppName) | Out-Null }
})
$r4.Add_Click({
    $c = Get-Config; $p = Join-Path $c.BackupFolder 'latest\claude-ai-exports'
    if (Test-Path $p) { Start-Process explorer.exe $p } else { [System.Windows.Forms.MessageBox]::Show('No claude.ai export filed yet. Export from claude.ai, then run a backup.', $AppName) | Out-Null }
})
$r5.Add_Click({ Start-Process 'https://claude.ai/artifact/QBahUjAzjftw6EFWWAo5jv' })

# --- Export tab: guided claude.ai export
$tE = New-Tab 'Export chats'
$eY = 12
$eTitle = Add-Label $tE 'Back up your claude.ai chats and Projects in 4 steps. Takes about 5 minutes plus waiting for the email.' 12 $eY 710
$s1 = Add-Label $tE 'Step 1.  Ask Claude for the export' 12 50 710; $s1.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$s1t = Add-Label $tE 'Click the button. On the page that opens, find "Data management" and click "Export Data". (Primary Owner: this exports the whole organization.)' 12 74 710; $s1t.Height = 36
$e1 = Add-Button $tE 'Open the export page' 12 112 220
$e1b = Add-Button $tE 'Personal export page instead' 242 112 220
$s2 = Add-Label $tE 'Step 2.  Wait for the email' 12 160 710; $s2.Font = $s1.Font
$s2t = Add-Label $tE 'Anthropic emails you a download link, usually within minutes to a few hours. The link works once and expires after 24 hours.' 12 184 710; $s2t.Height = 36
$s3 = Add-Label $tE 'Step 3.  Paste the link here' 12 228 710; $s3.Font = $s1.Font
$eLink = Add-Text $tE '' 12 254 560
$e3 = Add-Button $tE 'Download' 582 250 140
$s4 = Add-Label $tE 'Step 4.  Claude Vault files it' 12 300 710; $s4.Font = $s1.Font
$eStatus = Add-Label $tE 'Waiting for step 3. Already have the zip? Use the button below.' 12 326 710; $eStatus.Height = 40
$e4 = Add-Button $tE 'Pick the zip myself...' 12 372 220
$eTimer = New-Object System.Windows.Forms.Timer; $eTimer.Interval = 3000
$script:eStarted = $null

$e1.Add_Click({ Start-Process $OrgExportPage })
$e1b.Add_Click({ Start-Process $ExportPage })
$e3.Add_Click({
    $u = $eLink.Text.Trim()
    if ($u -notmatch '^https://') { [System.Windows.Forms.MessageBox]::Show('Paste the full link from the email (it starts with https://).', $AppName) | Out-Null; return }
    $script:eStarted = Get-Date
    Start-Process $u
    $eStatus.Text = 'Your browser is downloading the export. If it asks where to save, choose Downloads. Watching for the zip...'
    $eTimer.Start()
})
$eTimer.Add_Tick({
    $dl = (Get-Config).DownloadsFolder
    $z = Get-ChildItem $dl -File -Filter *.zip -ErrorAction SilentlyContinue |
         Where-Object { $_.LastWriteTime -ge $script:eStarted.AddMinutes(-1) } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($z -and (Test-IsExportZip $z.FullName)) {
        $eTimer.Stop(); $eStatus.Text = "Found $($z.Name). Filing it..."; [System.Windows.Forms.Application]::DoEvents()
        try { $eStatus.Text = 'Done. ' + (Import-ExportZip $z.FullName) } catch { $eStatus.Text = "Could not file it: $_" }
    } elseif (((Get-Date) - $script:eStarted).TotalMinutes -gt 20) {
        $eTimer.Stop(); $eStatus.Text = 'No export zip appeared in Downloads after 20 minutes. If it saved somewhere else, use "Pick the zip myself".'
    }
})
$e4.Add_Click({
    $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Zip files (*.zip)|*.zip'; $d.InitialDirectory = (Get-Config).DownloadsFolder
    if ($d.ShowDialog() -ne 'OK') { return }
    if (-not (Test-IsExportZip $d.FileName)) { $eStatus.Text = 'That zip is not a claude.ai export (no conversations.json inside).'; return }
    $eStatus.Text = 'Filing it...'; [System.Windows.Forms.Application]::DoEvents()
    try { $eStatus.Text = 'Done. ' + (Import-ExportZip $d.FileName) } catch { $eStatus.Text = "Could not file it: $_" }
})

# --- Review tab: everything in the backup, tick what to delete
$tV = New-Tab 'Review and delete'
$vInfo = Add-Label $tV 'Nothing is ever deleted automatically. Tick items you no longer want and click Delete. A Claude Code session that still exists on this PC is copied back on the next backup.' 12 10 710
$vInfo.Height = 36
$lv = New-Object System.Windows.Forms.ListView
$lv.View = 'Details'; $lv.CheckBoxes = $true; $lv.FullRowSelect = $true
$lv.Location = (Pt 12 52); $lv.Size = (Sz 710 450); $lv.Anchor = 'Top,Bottom,Left,Right'
[void]$lv.Columns.Add('Type', 150); [void]$lv.Columns.Add('Name', 330); [void]$lv.Columns.Add('Date', 130); [void]$lv.Columns.Add('Size', 80)
$tV.Controls.Add($lv)
function Fill-Review {
    $lv.Items.Clear()
    foreach ($i in Get-ReviewItems (Get-Config)) {
        $row = New-Object System.Windows.Forms.ListViewItem($i.Kind)
        [void]$row.SubItems.Add($i.Name); [void]$row.SubItems.Add($i.Date.ToString('yyyy-MM-dd HH:mm'))
        [void]$row.SubItems.Add(('{0:N1} MB' -f ($i.Size / 1MB))); $row.Tag = $i.Path
        [void]$lv.Items.Add($row)
    }
}
$vRefresh = Add-Button $tV 'Refresh list' 12 512 140; $vRefresh.Anchor = 'Bottom,Left'
$vDelete = Add-Button $tV 'Delete ticked items' 162 512 180; $vDelete.Anchor = 'Bottom,Left'
$vDone = Add-Button $tV 'Reviewed - remind me next month' 352 512 260; $vDone.Anchor = 'Bottom,Left'
$vRefresh.Add_Click({ Fill-Review })
$vDelete.Add_Click({
    $ticked = @($lv.CheckedItems)
    if (-not $ticked.Count) { return }
    $ok = [System.Windows.Forms.MessageBox]::Show("Permanently delete $($ticked.Count) item(s) from the backup?", $AppName, 'YesNo', 'Warning')
    if ($ok -ne 'Yes') { return }
    foreach ($it in $ticked) {
        try { Remove-Item -LiteralPath $it.Tag -Force; Write-Log "Deleted from backup: $($it.Tag)" } catch { Write-Log "Could not delete $($it.Tag): $_" }
    }
    Fill-Review
})
$vDone.Add_Click({
    $st = Get-State; $st | Add-Member -NotePropertyName LastReview -NotePropertyValue (Get-Date).ToString('o') -Force; Save-State $st
    [System.Windows.Forms.MessageBox]::Show('Thanks. The next review reminder comes in a month.', $AppName) | Out-Null
})
$tabs.Add_SelectedIndexChanged({ if ($tabs.SelectedTab -eq $tV -and $lv.Items.Count -eq 0) { Fill-Review } })
if ($Review) { $tabs.SelectedTab = $tV; Fill-Review }

[void]$form.ShowDialog()

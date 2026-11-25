### Windows Server FTP migration plan
*Created 2026-11-04 · last active 2026-11-04 · session `session_01V21hoidiTSwWaEd1KsP4JQ`*

**Goal:** Get exact steps to migrate all apps, including a Progress WS_FTP FTP server, from a Windows Server 2019 Azure VM to a newly built Windows Server 2025 Azure VM so the new box is identical to the old one, which will then be shut down.

**Requirements & decisions:**
- Source: Windows 2019 server in Azure running Progress WS_FTP software. Target: a Windows 2025 server already built. Make the new box identical; old box will shut down.
- Claude delivered a full side-by-side migration runbook (in chat, no artifact or files), and also noted an alternative in-place upgrade route (snapshot OS disk → new disk → `setup.exe /auto upgrade`).
- Phases provided: (0) prerequisites — same VNet/subnet, same size, same drive layout, same domain/OU, temp name, patch, confirm WS_FTP version supports Server 2025, have license/Progress login; (1) inventory the old server with a PowerShell script writing to `C:\Migration` (software, features, services, scheduled tasks, local users/groups, shares + permissions, firewall, certs, network/hosts/env/ODBC/printers, IIS config, volumes); (2) install base roles/apps/WS_FTP at the same versions and paths; (3) migrate WS_FTP (record listeners/ports 21/990/22, passive range, SSL cert and SSH host-key assignments, user roots; stop services; `pg_dump` the bundled PostgreSQL `ws_ftp_server` DB or SQL Server backup; robocopy config/cert/key folders and all FTP home data; deactivate license; restore on new box, fix listener IPs, passive NAT IP, SSH host key, auth/SMTP, firewall); (4) migrate shares/certs/services/IIS/other apps/agents; (5) cutover in a maintenance window (stop+disable old services, final delta robocopy and DB dump, move Azure private + Standard static public IP to the new NIC, replicate NSG rules, optionally rename new server to the old name, update DNS); (6) test from outside Azure (FTP/FTPS/SFTP logins with no host-key warning, passive transfers, local/AD/partner logins, permissions/quotas/IP lists, notifications, web modules, other apps, reboot) and leave the old VM deallocated 2–4 weeks before deleting.
- Common pitfalls flagged: WS_FTP version not supporting 2025, forgetting to deactivate the old license, not updating the passive external IP / NSG passive range, SSH host keys not migrated (host-key errors), certs exported without private keys.
- Claude offered to write per-app migration steps if the user sends `software.csv` from the Phase 1 inventory.

**Delivered & links:** None (advice delivered in chat only; no artifacts, files or repos).

**Final state:** Complete migration runbook delivered. No follow-up from the user; the offered per-app steps were not requested.

**Open items:** User could send `software.csv` to get per-app migration steps. Otherwise none.

**Your messages:**
1. *(2026-11-04)* i have a windows 2019 server in azure using progress wsftp software. i build a windows 2025 server to migrate to.  Give me exact steps on how to migrate all my apps including the FTP server to the new box to make it identical to the old one that will shut down.

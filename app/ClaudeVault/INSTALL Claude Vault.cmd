@echo off
rem Copies Claude Vault to %LOCALAPPDATA%\ClaudeVault\app and adds Start menu and Desktop shortcuts.
setlocal
set "DEST=%LOCALAPPDATA%\ClaudeVault\app"
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%~dp0ClaudeVault.ps1" "%DEST%\" >nul
copy /Y "%~dp0Start Claude Vault.cmd" "%DEST%\" >nul
copy /Y "%~dp0README.md" "%DEST%\" >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem '%DEST%' | Unblock-File;" ^
  "$w = New-Object -ComObject WScript.Shell;" ^
  "foreach ($p in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {" ^
  "  $s = $w.CreateShortcut((Join-Path $p 'Claude Vault.lnk'));" ^
  "  $s.TargetPath = 'powershell.exe';" ^
  "  $s.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%DEST%\ClaudeVault.ps1\"';" ^
  "  $s.IconLocation = 'shell32.dll,45'; $s.WorkingDirectory = '%DEST%'; $s.Save() }"
echo.
echo Claude Vault is installed. Opening it now...
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%DEST%\ClaudeVault.ps1"
endlocal

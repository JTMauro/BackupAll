@echo off
rem Opens the Claude Vault window.
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0ClaudeVault.ps1"

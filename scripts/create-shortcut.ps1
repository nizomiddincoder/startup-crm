# Ish stolida "Kassa" tugmasini (yorliq) yaratadi: ikki marta bosilsa — Kassa.bat ishga tushadi.
# Ishga tushirish: npm run shortcut   (yoki: powershell -ExecutionPolicy Bypass -File scripts\create-shortcut.ps1)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$icon = Join-Path $root "assets\kassa.ico"
$desktop = [Environment]::GetFolderPath("Desktop")
$link = Join-Path $desktop "Kassa.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($link)
$shortcut.TargetPath = Join-Path $root "Kassa.bat"
$shortcut.WorkingDirectory = $root
$shortcut.Description = "Kassa dasturini ishga tushirish"
if (Test-Path $icon) { $shortcut.IconLocation = "$icon,0" }
$shortcut.Save()

Write-Output "Ish stolida 'Kassa' tugmasi yaratildi: $link"

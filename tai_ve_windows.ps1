# Tai toan bo video Rio Animation ve may (Windows PowerShell).
# Cach dung: chuot phai file nay > Run with PowerShell. Video se nam trong thu muc RioAnimation canh file nay.
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "RioAnimation"
$tags = "g01","g02","g03","g04","g05","g06"
foreach ($t in $tags) {
  $rel = Invoke-RestMethod "https://api.github.com/repos/cskh-ctrl/RioLong/releases/tags/$t"
  $dir = Join-Path $root $rel.name; New-Item -ItemType Directory -Force -Path $dir | Out-Null
  foreach ($a in ($rel.assets | Sort-Object name)) {
    $folder = Join-Path $dir ($a.name -replace '\.zip$','')
    if (Test-Path $folder) { Write-Host "Da co: $($a.name)"; continue }
    $zip = Join-Path $dir $a.name
    Write-Host "Dang tai $($rel.name) / $($a.name) ..."
    Invoke-WebRequest $a.browser_download_url -OutFile $zip
    Expand-Archive $zip -DestinationPath $dir -Force; Remove-Item $zip
  }
}
Write-Host "Xong! Mo thu muc: $root"

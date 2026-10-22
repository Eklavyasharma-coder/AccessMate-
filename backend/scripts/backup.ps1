param(
  [string]$BackupRoot = (Join-Path $PSScriptRoot '..\..\..\backups'),
  [string]$UploadsPath = (Join-Path $PSScriptRoot '..\..\uploads')
)
$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\.env'
if (!(Test-Path $envFile)) { throw "Missing backend .env. Create it from .env.example; never share it." }
$settings = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$' -and !$matches[1].StartsWith('#')) {
    $settings[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
  }
}
foreach ($key in @('DB_HOST','DB_PORT','DB_USER','DB_NAME')) {
  if (!$settings.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($settings[$key])) { throw "Missing $key in backend .env" }
}
if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw 'pg_dump not found. Install PostgreSQL client tools and add them to PATH.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dest = Join-Path $BackupRoot "AccessMate-$stamp"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
$dbFile = Join-Path $dest 'accessmate.dump'
$env:PGHOST = $settings['DB_HOST']; $env:PGPORT = $settings['DB_PORT']; $env:PGUSER = $settings['DB_USER']; $env:PGDATABASE = $settings['DB_NAME']
Write-Host "Backing up database '$env:PGDATABASE' to $dbFile. Password may be requested."
& pg_dump --format=custom --no-owner --no-acl --file $dbFile
if ($LASTEXITCODE -ne 0 -or !(Test-Path $dbFile) -or (Get-Item $dbFile).Length -eq 0) { throw 'pg_dump failed; do not proceed with migrations.' }
& pg_restore --list $dbFile | Out-File (Join-Path $dest 'pg_restore-list.txt') -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'Backup archive validation failed.' }
if (Test-Path $UploadsPath) {
  Copy-Item -LiteralPath $UploadsPath -Destination (Join-Path $dest 'uploads') -Recurse
} else {
  Write-Warning "Uploads folder not found at '$UploadsPath'. Confirm the real upload storage path and back it up separately."
}
Get-ChildItem -LiteralPath $dest -File -Recurse | Get-FileHash -Algorithm SHA256 | ForEach-Object { "{0}  {1}" -f $_.Hash, $_.Path } | Set-Content (Join-Path $dest 'SHA256SUMS.txt') -Encoding utf8
Write-Host "Backup created and database archive validated: $dest"
Write-Host 'Store this backup privately. It may contain personal documents and account data.'

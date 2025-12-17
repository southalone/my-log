param(
  [string]$SrcRoot = "..",
  [string]$DestRoot = ".\\data"
)

$ErrorActionPreference = "Stop"

Write-Host "Syncing data from '$SrcRoot' -> '$DestRoot' ..."

New-Item -ItemType Directory -Force -Path `
  (Join-Path $DestRoot "best_chapters"), `
  (Join-Path $DestRoot "xuxie"), `
  (Join-Path $DestRoot "eval") | Out-Null

# 1) best_chapters/*
$bestSrc = Join-Path $SrcRoot "best_chapters"
if (Test-Path $bestSrc) {
  Copy-Item -Force -Recurse (Join-Path $bestSrc "*") (Join-Path $DestRoot "best_chapters")
  Write-Host "Copied best_chapters"
} else {
  Write-Warning "Missing: $bestSrc"
}

# 2) all 续写内容_* directories
Get-ChildItem -Path $SrcRoot -Directory | Where-Object { $_.Name -like "续写内容_*" } | ForEach-Object {
  $src = $_.FullName
  $dst = Join-Path (Join-Path $DestRoot "xuxie") $_.Name
  Copy-Item -Force -Recurse $src $dst
  Write-Host "Copied xuxie dir: $($_.Name)"
}

# 3) all 评测结果_*.json (skip dagang)
Get-ChildItem -Path $SrcRoot -File -Filter "评测结果_*.json" | Where-Object { $_.Name -notmatch "dagang_" } | ForEach-Object {
  Copy-Item -Force $_.FullName (Join-Path (Join-Path $DestRoot "eval") $_.Name)
}
Write-Host "Copied eval jsons"

Write-Host "Done."



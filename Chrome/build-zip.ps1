$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $root 'manifest.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$version = $manifest.version
$outputPath = Join-Path $root ("CenterLineSelector-Chrome-$version.zip")

$items = @(
  'manifest.json'
  'extension-api.js'
  'defaults.js'
  'popup.html'
  'popup.css'
  'popup.js'
  'content-script.js'
  'content-script.css'
  'README.md'
  'LICENSE'
  'icons'
)

if (Test-Path $outputPath) {
  Remove-Item $outputPath -Force
}

function Get-ArchiveEntryName {
  param (
    [string]$FullPath
  )

  $relativePath = $FullPath.Substring($root.Length).TrimStart('\', '/')
  return $relativePath -replace '\\', '/'
}

function Add-ArchiveFile {
  param (
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$SourcePath,
    [string]$EntryName
  )

  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $Archive,
    $SourcePath,
    $EntryName,
    [System.IO.Compression.CompressionLevel]::Optimal
  ) | Out-Null
}

$archiveStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)

try {
  $archive = [System.IO.Compression.ZipArchive]::new(
    $archiveStream,
    [System.IO.Compression.ZipArchiveMode]::Create,
    $false
  )

  try {
    foreach ($item in $items) {
      $itemPath = Join-Path $root $item

      if (Test-Path $itemPath -PathType Leaf) {
        Add-ArchiveFile -Archive $archive -SourcePath $itemPath -EntryName (Get-ArchiveEntryName -FullPath $itemPath)
        continue
      }

      Get-ChildItem -LiteralPath $itemPath -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
          Add-ArchiveFile -Archive $archive -SourcePath $_.FullName -EntryName (Get-ArchiveEntryName -FullPath $_.FullName)
        }
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  $archiveStream.Dispose()
}

Write-Output $outputPath
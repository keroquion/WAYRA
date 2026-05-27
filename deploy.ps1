# deploy.ps1 — Actualiza version.json y hace push a GitHub → Vercel despliega automáticamente
# USO: .\deploy.ps1 "Descripción del cambio"

param(
    [string]$mensaje = "deploy: actualizacion"
)

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Generar versión basada en fecha: YYYY.MM.DD.HHmm
$version = (Get-Date).ToString("yyyy.MM.dd.HHmm")

# Actualizar version.json
$versionJson = @{
    version    = $version
    deployedAt = $timestamp
    notes      = $mensaje
} | ConvertTo-Json -Depth 2

Set-Content -Path "$PSScriptRoot\version.json" -Value $versionJson -Encoding UTF8

Write-Host "✅ version.json actualizado → v$version" -ForegroundColor Green

# Git: stage, commit, push
git add .
$commitMsg = "deploy: v$version - $mensaje"
git commit -m $commitMsg
git push origin main

Write-Host ""
Write-Host "🚀 Push completado. Vercel desplegará en ~30 segundos." -ForegroundColor Cyan
Write-Host "📱 Todos los dispositivos se actualizarán solos al abrir la app." -ForegroundColor Cyan

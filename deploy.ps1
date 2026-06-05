# Script para implantar (deploy) o site no Netlify via API
param (
    [string]$AccessToken = "",
    [string]$SiteId = ""
)

# Caminhos
$sourcePath = "C:\Users\RUTH\.gemini\antigravity\scratch\productivity-hub"
$zipPath = "C:\Users\RUTH\.gemini\antigravity\scratch\productivity-hub.zip"

# Limpa zip antigo se existir
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# 1. Compacta a pasta do projeto (excluindo arquivos de script temporários de servidor/deploy)
Write-Host "Compactando arquivos do projeto..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
$files = Get-ChildItem -Path $sourcePath -Recurse | Where-Object { 
    $_.Name -ne "server.ps1" -and $_.Name -ne "deploy.ps1" 
}

# Cria o arquivo ZIP temporário
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourcePath, $zipPath)

if (-not (Test-Path $zipPath)) {
    Write-Error "Falha ao criar o arquivo ZIP de deploy."
    exit
}

# 2. Solicita Token se não fornecido
if ([string]::IsNullOrEmpty($AccessToken)) {
    $AccessToken = Read-Host "Digite o seu Personal Access Token do Netlify"
}

if ([string]::IsNullOrEmpty($AccessToken)) {
    Write-Error "O Access Token é obrigatório para continuar."
    exit
}

$headers = @{
    "Authorization" = "Bearer $AccessToken"
}

# 3. Cria um novo site se nenhum Site ID foi fornecido
if ([string]::IsNullOrEmpty($SiteId)) {
    Write-Host "Criando novo site no Netlify..."
    $createUrl = "https://api.netlify.com/api/v1/sites"
    $body = @{
        name = "prod-hub-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    } | ConvertTo-Json

    try {
        $siteResponse = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
        $SiteId = $siteResponse.id
        $siteUrl = $siteResponse.url
        Write-Host "Novo site criado no Netlify com sucesso!"
        Write-Host "ID do Site: $SiteId"
        Write-Host "URL base: $siteUrl"
    } catch {
        Write-Error "Erro ao criar site no Netlify: $_"
        exit
    }
}

# 4. Faz o upload do arquivo ZIP para implantação
Write-Host "Enviando arquivos (ZIP) para o Netlify..."
$deployUrl = "https://api.netlify.com/api/v1/sites/$SiteId/deploys"

try {
    # Lê os bytes do ZIP
    $zipBytes = [System.IO.File]::ReadAllBytes($zipPath)
    
    # Envia o ZIP via método POST raw
    $deployResponse = Invoke-RestMethod -Uri $deployUrl -Method Post -Headers $headers -Body $zipBytes -ContentType "application/zip"
    
    Write-Host "`n=================================================="
    Write-Host "🚀 IMPLANTAÇÃO CONCLUÍDA COM SUCESSO!"
    Write-Host "Link do Painel do Netlify: $($deployResponse.admin_url)"
    Write-Host "Link Público do Site: $($deployResponse.ssl_url)"
    Write-Host "=================================================="
} catch {
    Write-Error "Erro durante o upload do deploy: $_"
} finally {
    # Remove arquivo ZIP temporário
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
}

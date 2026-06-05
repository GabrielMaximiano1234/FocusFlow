# Server local em PowerShell usando .NET HttpListener
$root = "C:\Users\RUTH\.gemini\antigravity\scratch\productivity-hub"
$port = 8080
$prefix = "http://localhost:$port/"

# Cria listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Servidor ativo em $prefix"
    Write-Host "Para parar o servidor, cancele esta tarefa ou encerre o terminal."

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Determina o arquivo requisitado
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }

        # Decodifica URL e constrói caminho físico do arquivo
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)
        # Substitui barras normais por invertidas se for Windows
        $relativePath = $urlPath.Replace("/", "\").TrimStart("\")
        $filePath = [System.IO.Path]::Combine($root, $relativePath)

        if (Test-Path $filePath -PathType Leaf) {
            # Determina o Content-Type
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            switch ($extension) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".htm"  { $contentType = "text/html; charset=utf-8" }
                ".css"  { $contentType = "text/css; charset=utf-8" }
                ".js"   { $contentType = "application/javascript; charset=utf-8" }
                ".png"  { $contentType = "image/png" }
                ".jpg"  { $contentType = "image/jpeg" }
                ".jpeg" { $contentType = "image/jpeg" }
                ".gif"  { $contentType = "image/gif" }
                ".svg"  { $contentType = "image/svg+xml" }
                ".ico"  { $contentType = "image/x-icon" }
                ".json" { $contentType = "application/json; charset=utf-8" }
            }

            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            # Arquivo não encontrado
            $response.StatusCode = 404
            $response.ContentType = "text/plain"
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Arquivo nao encontrado")
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
        }

        $response.Close()
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $listener.Stop()
}

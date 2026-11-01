Add-Type -AssemblyName System.Drawing

$assetsDir = "C:\TipoDS\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Background circle Discord blurple (#5865F2)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 88, 101, 242))
$g.FillEllipse($brush, 8, 8, 240, 240)

# Neon green status ring outline (#23A55A)
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 35, 165, 90)), 12
$g.DrawEllipse($pen, 16, 16, 224, 224)

# Letter 'K' in center
$fontFamily = New-Object System.Drawing.FontFamily "Arial"
$font = New-Object System.Drawing.Font ($fontFamily, [float]110, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF ([float]0, [float]0, [float]256, [float]256)

$g.DrawString("K", $font, $textBrush, $rect, $format)

$pngPath = Join-Path $assetsDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icoPath = "C:\TipoDS\icon.ico"
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = [System.IO.File]::OpenWrite($icoPath)
$icon.Save($fs)
$fs.Close()

Write-Host "Icons generated successfully: $icoPath"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$hwnd = 987226
# Or find Krug process
$p = Get-Process -Name 'Krug' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if ($p) {
    Write-Host "Found Krug window handle: $($p.MainWindowHandle)"
    
    # Bring to foreground
    $sig = @'
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
    $user32 = Add-Type -MemberDefinition $sig -Name "Win32Util" -Namespace "Win32" -PassThru
    $user32::ShowWindow($p.MainWindowHandle, 9) # SW_RESTORE
    $user32::SetForegroundWindow($p.MainWindowHandle)

    Start-Sleep -Milliseconds 500

    # Capture window screenshot
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $outPath = "C:\TipoDS\screenshot.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $gfx.Dispose()
    $bmp.Dispose()
    Write-Host "Screenshot saved to $outPath"
} else {
    Write-Host "No window handle found"
}

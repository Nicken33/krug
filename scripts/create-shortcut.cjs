const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const desktopPath = path.join(os.homedir(), 'OneDrive', 'Desktop');
const altDesktopPath = path.join(os.homedir(), 'Desktop');
const finalDesktop = fs.existsSync(desktopPath) ? desktopPath : altDesktopPath;

const shortcutPath = path.join(finalDesktop, 'Круг.lnk');
const tempShortcutPath = path.join(finalDesktop, 'Krug_temp.lnk');
const targetPath = 'C:\\TipoDS\\dist-electron\\win-unpacked\\Круг.exe';
const iconPath = 'C:\\TipoDS\\icon.ico';
const workingDir = 'C:\\TipoDS\\dist-electron\\win-unpacked';

const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${tempShortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${targetPath.replace(/\\/g, '\\\\')}"
oLink.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
oLink.Description = "Круг — Голосовой и текстовый мессенджер"
oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"
oLink.Save
`;

const tempVbs = path.join(__dirname, 'temp_shortcut.vbs');
fs.writeFileSync(tempVbs, vbsScript, 'utf8');

try {
  execSync(`cscript //nologo "${tempVbs}"`);
  if (fs.existsSync(tempShortcutPath)) {
    if (fs.existsSync(shortcutPath)) fs.unlinkSync(shortcutPath);
    fs.renameSync(tempShortcutPath, shortcutPath);
  }
  console.log('Shortcut created successfully at:', shortcutPath);
  console.log('Exists:', fs.existsSync(shortcutPath));
} finally {
  if (fs.existsSync(tempVbs)) fs.unlinkSync(tempVbs);
  if (fs.existsSync(tempShortcutPath)) fs.unlinkSync(tempShortcutPath);
}

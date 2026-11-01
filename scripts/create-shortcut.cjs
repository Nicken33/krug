const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const desktopPath = path.join(os.homedir(), 'OneDrive', 'Desktop');
const altDesktopPath = path.join(os.homedir(), 'Desktop');
const finalDesktop = fs.existsSync(desktopPath) ? desktopPath : altDesktopPath;

const shortcutPath = path.join(finalDesktop, 'Круг.lnk');
const targetPath = 'C:\\TipoDS\\dist-electron\\win-unpacked\\Круг.exe';
const iconPath = 'C:\\TipoDS\\public\\icon.ico';
const workingDir = 'C:\\TipoDS\\dist-electron\\win-unpacked';

const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${targetPath.replace(/\\/g, '\\\\')}"
oLink.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
oLink.Description = "Krug - Discord Clone"
oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"
oLink.Save
`;

const tempVbs = path.join(__dirname, 'temp_shortcut.vbs');
fs.writeFileSync(tempVbs, vbsScript, 'utf8');

try {
  execSync(`cscript //nologo "${tempVbs}"`);
  console.log('Shortcut created successfully at:', shortcutPath);
  console.log('Exists:', fs.existsSync(shortcutPath));
} finally {
  if (fs.existsSync(tempVbs)) fs.unlinkSync(tempVbs);
}

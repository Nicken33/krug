const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Determine real desktop path
const desktopPath = path.join(os.homedir(), 'OneDrive', 'Desktop');
const altDesktopPath = path.join(os.homedir(), 'Desktop');
const targetDesktop = fs.existsSync(desktopPath) ? desktopPath : altDesktopPath;

// Paths
const finalShortcut = path.join(targetDesktop, 'Круг.lnk');
const tempLnk = path.join(targetDesktop, 'temp_krug_shortcut.lnk');
const targetExe = 'C:\\TipoDS\\dist-electron\\win-unpacked\\Krug.exe';
const workingDir = 'C:\\TipoDS\\dist-electron\\win-unpacked';
const iconPath = 'C:\\TipoDS\\icon.ico';

// Ensure Krug.exe exists
const cyrillicExe = path.join(workingDir, 'Круг.exe');
if (fs.existsSync(cyrillicExe) && !fs.existsSync(targetExe)) {
  fs.copyFileSync(cyrillicExe, targetExe);
}

// Remove any existing shortcut
if (fs.existsSync(finalShortcut)) {
  try { fs.unlinkSync(finalShortcut); } catch(e) {}
}

// Build pure ASCII VBS script to avoid Windows ANSI / Codepage mangling
const vbsContent = [
  'Set oWS = WScript.CreateObject("WScript.Shell")',
  `sLinkFile = "${tempLnk.replace(/\\/g, '\\\\')}"`,
  'Set oLink = oWS.CreateShortcut(sLinkFile)',
  `oLink.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"`,
  `oLink.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"`,
  'oLink.Description = "Krug Discord Clone"',
  `oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"`,
  'oLink.Save'
].join('\r\n');

const vbsFile = path.join(__dirname, 'build_shortcut.vbs');
fs.writeFileSync(vbsFile, vbsContent, 'ascii');

try {
  execSync(`cscript //nologo "${vbsFile}"`);
  if (fs.existsSync(tempLnk)) {
    fs.renameSync(tempLnk, finalShortcut);
  }
} finally {
  if (fs.existsSync(vbsFile)) try { fs.unlinkSync(vbsFile); } catch(e) {}
  if (fs.existsSync(tempLnk)) try { fs.unlinkSync(tempLnk); } catch(e) {}
}

console.log('Shortcut created at:', finalShortcut, 'Exists:', fs.existsSync(finalShortcut));

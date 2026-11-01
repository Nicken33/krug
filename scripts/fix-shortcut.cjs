const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Determine real desktop path
const desktopPath = path.join(os.homedir(), 'OneDrive', 'Desktop');
const altDesktopPath = path.join(os.homedir(), 'Desktop');
const targetDesktop = fs.existsSync(desktopPath) ? desktopPath : altDesktopPath;

console.log('Target Desktop:', targetDesktop);

// Paths
const finalShortcut = path.join(targetDesktop, 'Круг.lnk');
const tempLnk = path.join(targetDesktop, 'temp_krug_shortcut.lnk');
const targetExe = 'C:\\TipoDS\\dist-electron\\win-unpacked\\Krug.exe';
const workingDir = 'C:\\TipoDS\\dist-electron\\win-unpacked';
const iconPath = 'C:\\TipoDS\\icon.ico';

// Ensure Krug.exe exists by copying from Круг.exe if needed
const cyrillicExe = path.join(workingDir, 'Круг.exe');
if (fs.existsSync(cyrillicExe) && !fs.existsSync(targetExe)) {
  fs.copyFileSync(cyrillicExe, targetExe);
  console.log('Ensured Krug.exe exists.');
}

// Remove any existing corrupted shortcut
if (fs.existsSync(finalShortcut)) {
  fs.unlinkSync(finalShortcut);
  console.log('Removed old shortcut.');
}

// Build pure ASCII VBS script to avoid any Windows ANSI / Codepage 1251 mangling
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
  console.log('Temp shortcut created via cscript.');

  if (fs.existsSync(tempLnk)) {
    // Rename to Russian name using Node's native Windows Unicode CreateFileW
    fs.renameSync(tempLnk, finalShortcut);
    console.log('Renamed temp shortcut to:', finalShortcut);
  }
} finally {
  if (fs.existsSync(vbsFile)) fs.unlinkSync(vbsFile);
  if (fs.existsSync(tempLnk)) fs.unlinkSync(tempLnk);
}

// Verification
console.log('Verification:');
console.log('- Shortcut exists:', fs.existsSync(finalShortcut));
console.log('- Target exe exists:', fs.existsSync(targetExe));
console.log('- Icon exists:', fs.existsSync(iconPath));

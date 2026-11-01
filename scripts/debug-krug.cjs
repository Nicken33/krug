const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting Krug.exe with debug logging...');
const child = spawn('C:/TipoDS/dist-electron/win-unpacked/Krug.exe', ['--enable-logging'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let out = '';
let err = '';
child.stdout.on('data', d => {
  out += d.toString();
  console.log('STDOUT:', d.toString());
});
child.stderr.on('data', d => {
  err += d.toString();
  console.log('STDERR:', d.toString());
});
child.on('exit', (code, sig) => {
  console.log('EXITED:', code, sig);
});

setTimeout(() => {
  fs.writeFileSync('C:/TipoDS/debug_run.log', 'STDOUT:\n' + out + '\n\nSTDERR:\n' + err);
  console.log('Log written to C:/TipoDS/debug_run.log');
  try { child.kill(); } catch(e) {}
  process.exit(0);
}, 5000);

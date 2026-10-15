const { spawn } = require('node:child_process');
const path = require('node:path');
const { connectOrStart } = require('./server.cjs');
(async () => {
  const service = await connectOrStart({ development: true });
  const child = spawn(process.execPath, [path.join(__dirname, '../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { stdio: 'inherit' });
  let stopping = false;
  const stop = async code => { if (stopping) return; stopping = true; child.kill(); await service.close(); process.exit(code); };
  child.on('exit', code => stop(code || 0));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop(0));
})().catch(error => { console.error(error); process.exitCode = 1; });

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Store, dataDirectory } = require('./storage.cjs');
const PORT = 43127;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
async function startServer({ directory = dataDirectory(), webRoot = path.join(__dirname, '../dist'), port = PORT, development = false } = {}) {
  const store = new Store(directory);
  let origin;
  const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const host = req.headers.host;
    if (!host || ![new URL(origin).host, `localhost:${server.address().port}`].includes(host)) return send(res, 403, { error: 'Untrusted host.' });
    const allowedOrigins = new Set([origin, `http://localhost:${server.address().port}`]);
    if (development) { allowedOrigins.add('http://127.0.0.1:5173'); allowedOrigins.add('http://localhost:5173'); }
    if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) return send(res, 403, { error: 'Untrusted origin.' });
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, origin).pathname); }
    catch { return send(res, 400, { error: 'Invalid URL.' }); }
    try {
      if (pathname === '/api/health' && req.method === 'GET') return send(res, 200, { application: 'repairdesk-shared-v1', storeId: store.id, development });
      if (pathname === '/api/data' && req.method === 'GET') return send(res, 200, store.read());
      if (pathname === '/api/data' && req.method === 'PUT') {
        if (!req.headers.origin || !allowedOrigins.has(req.headers.origin) || req.headers['content-type']?.split(';')[0] !== 'application/json') return send(res, 403, { error: 'Same-origin JSON requests required.' });
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 5 * 1024 * 1024) { send(res, 413, { error: 'Backup exceeds 5 MB.' }); return; } chunks.push(chunk); }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { error: 'Invalid JSON.' }); }
        const result = store.write(body.data, body.revision);
        return send(res, result.status, result.status === 200 ? { revision: result.revision, data: result.data } : { error: result.error });
      }
      if (pathname.startsWith('/api/')) return send(res, 404, { error: 'Unknown API route.' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
      const file = path.resolve(webRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(path.resolve(webRoot) + path.sep)) return send(res, 403, { error: 'Invalid path.' });
      let contents;
      try { contents = await fs.promises.readFile(file); } catch { return send(res, 404, { error: 'File not found. Run npm run build first.' }); }
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' blob: data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : contents);
    } catch (error) { console.error('Shared storage request failed:', error.message); if (!res.headersSent) send(res, 500, { error: 'Shared storage could not be saved. Check disk access and free space.' }); else res.end(); }
  });
  server.requestTimeout = 15000;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  } catch (error) { store.close(); throw error; }
  return { server, store, origin, close: () => new Promise((resolve, reject) => server.close(error => { store.close(); error ? reject(error) : resolve(); })) };
}
async function connectOrStart(options = {}) {
  const directory = options.directory || dataDirectory();
  const expected = require('node:crypto').createHash('sha256').update(path.resolve(directory)).digest('hex');
  const origin = `http://127.0.0.1:${PORT}`;
  try {
    const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(1500) });
    const health = await response.json();
    if (health.application !== 'repairdesk-shared-v1' || health.storeId !== expected) throw Error('Port 43127 belongs to another service or data folder. Close that service before starting RepairDesk.');
    if (options.development && !health.development) throw Error('Close the desktop app or production service before starting development.');
    return { origin, close: async () => {} };
  } catch (error) { if (error.cause?.code !== 'ECONNREFUSED') throw error; }
  return startServer({ ...options, directory });
}
if (require.main === module) {
  connectOrStart({ development: process.argv.includes('--dev') }).then(service => {
    console.log(`RepairDesk shared storage: ${service.origin}`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await service.close(); process.exit(0); });
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { startServer, connectOrStart };

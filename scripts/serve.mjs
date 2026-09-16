import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.txt':'text/plain', '.svg':'image/svg+xml'};
http.createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const target = path === root ? resolve(root, 'index.html') : path;
    res.setHeader('Content-Type', `${types[extname(target)] || 'application/octet-stream'}; charset=utf-8`);
    res.end(await readFile(target));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Pi Tumbler: http://localhost:4173'));

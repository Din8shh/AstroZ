// A static server for dist/ that behaves like one Slow 4G link (Lighthouse mobile defaults):
// 562.5 ms added per request, and ALL responses share 1474.56 kbit/s of download bandwidth.
// Used instead of DevTools network emulation, which does not reliably reach the engine worker's
// requests (wasm + ephemeris data). Text and wasm are gzipped, as GitHub Pages does.
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm',
  '.data': 'application/octet-stream', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const GZIP = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.wasm', '.svg']);

export type ThrottleProfile = { latencyMs: number; downKbps: number };
export const SLOW_4G: ThrottleProfile = { latencyMs: 562.5, downKbps: 1474.56 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startThrottledServer(root: string, base: string, profile: ThrottleProfile, port = 0) {
  const bytesPerMs = (profile.downKbps * 1024) / 8 / 1000;
  let linkFreeAt = 0; // shared link: when the next chunk may start

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (!url.pathname.startsWith(base)) { res.writeHead(404).end(); return; }
    const path = decodeURIComponent(url.pathname.slice(base.length));
    if (path.split('/').includes('..')) { res.writeHead(400).end(); return; }
    const rel = path === '' || path.endsWith('/') ? `${path}index.html` : normalize(path);
    const ext = extname(rel);
    let body: Buffer;
    try { body = await readFile(join(root, rel)); } catch { res.writeHead(404).end(); return; }
    const headers: Record<string, string> = { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-cache' };
    if (GZIP.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding']))) {
      body = gzipSync(body);
      headers['content-encoding'] = 'gzip';
    }
    headers['content-length'] = String(body.length);
    await sleep(profile.latencyMs);
    res.writeHead(200, headers);
    for (let off = 0; off < body.length; off += 16 * 1024) {
      const chunk = body.subarray(off, off + 16 * 1024);
      const start = Math.max(Date.now(), linkFreeAt);
      linkFreeAt = start + chunk.length / bytesPerMs;
      await sleep(linkFreeAt - Date.now());
      if (!res.write(chunk)) await new Promise((r) => res.once('drain', r));
    }
    res.end();
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  return { url: `http://127.0.0.1:${actualPort}${base}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

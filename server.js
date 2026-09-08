/**
 * Premium Acrylics 415 — zero-dependency static file server.
 *
 * There's no backend/API anymore: the order form on checkout.html submits
 * directly to Formspree from the browser (see js/order.js), so this server's
 * only job is serving the static site — useful for local preview, and for
 * traditional Node hosts (Render, Railway, a VPS, etc.) if you don't deploy
 * to a pure static host.
 *
 * Run:  node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// Non-web-facing files that happen to live at the project root — never serve these.
const BLOCKED_PATH_PREFIXES = [
  '/server.js', '/package.json', '/package-lock.json',
  '/.env', '/.env.example', '/.gitignore', '/.git',
  '/README.md', '/node_modules'
];

function isBlockedPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (BLOCKED_PATH_PREFIXES.some(p => decoded === p || decoded.startsWith(p + '/'))) return true;
  if (decoded.split('/').some(seg => seg.startsWith('.') && seg !== '.' && seg !== '..')) return true;
  return false;
}

function serveStatic(req, res, pathname) {
  if (isBlockedPath(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not Found');
  }

  let filePath = path.join(ROOT, decodeURIComponent(pathname));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        const notFoundPath = path.join(ROOT, '404.html');
        fs.readFile(notFoundPath, (e2, nfContent) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(e2 ? '404 Not Found' : nfContent);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    });
  });
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res, parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Premium Acrylics 415 running at http://localhost:${PORT}`);
});

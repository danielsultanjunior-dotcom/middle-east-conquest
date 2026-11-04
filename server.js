'use strict';
// Static file server + WebSocket room relay for Middle East Conquest (deploy on render.com as a Web Service).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const PUB = path.join(__dirname, 'public'), PORT = process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (u === '/') u = '/index.html';
  const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(f);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': (u === '/sw.js' || u === '/index.html' || ext === '.webmanifest') ? 'no-cache' : 'public, max-age=86400' });
    res.end(b);
  });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16384 });
const rooms = new Map();
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
function peers(r) { const list = [...r.values()].map(c => ({ id: c.id, pres: c.pres })); for (const c of r.values()) send(c.ws, { t: 'peers', peers: list }); }
wss.on('connection', ws => {
  const c = { ws, id: 'w' + crypto.randomBytes(4).toString('hex'), pres: {}, room: null, alive: true, tokens: 60, t: Date.now() };
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', buf => {
    const now = Date.now(); c.tokens = Math.min(120, c.tokens + (now - c.t) / 10); c.t = now;       // ~100 msgs/s
    if (--c.tokens < 0) return;
    let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
    if (m.t === 'join' && !c.room) {
      const code = String(m.room || '').toLowerCase();
      if (!/^[a-z0-9][a-z0-9_.-]{2,40}$/.test(code)) return send(ws, { t: 'error', msg: 'bad room code' });
      let r = rooms.get(code); if (!r) { r = new Map(); rooms.set(code, r); }
      if (r.size >= 8) return send(ws, { t: 'error', msg: 'room full' });
      r.set(c.id, c); c.room = code; send(ws, { t: 'welcome', id: c.id }); peers(r);
    } else if (m.t === 'pres' && c.room) {
      c.pres = (m.pres && typeof m.pres === 'object') ? m.pres : {}; peers(rooms.get(c.room));
    } else if (m.t === 'msg' && c.room) {
      const s = JSON.stringify({ t: 'msg', topic: String(m.topic).slice(0, 20), data: m.data, peer: c.id });
      for (const o of rooms.get(c.room).values()) if (o !== c && o.ws.readyState === 1) o.ws.send(s);
    }
  });
  ws.on('close', () => {
    if (!c.room) return; const r = rooms.get(c.room); if (!r) return;
    r.delete(c.id); if (!r.size) rooms.delete(c.room); else peers(r);
  });
});
setInterval(() => wss.clients.forEach(ws => ws.ping()), 25000);   // keeps Render's proxy from dropping idle sockets
server.listen(PORT, '0.0.0.0', () => console.log('Middle East Conquest listening on ' + PORT));

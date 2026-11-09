// Servidor mínimo: sirve index.html y retransmite el estado entre los 2 jugadores de cada sala.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const html = fs.readFileSync(path.join(__dirname, 'index.html'));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
const wss = new WebSocketServer({ server: srv });
const rooms = new Map();

wss.on('connection', ws => {
  const id = Math.random().toString(36).slice(2, 10);
  let room = null;
  const bc = () => {
    const peers = [...room].map(([i, v]) => ({ id: i, p: v.p }));
    for (const [, v] of room) if (v.ws.readyState === 1) v.ws.send(JSON.stringify({ t: 'st', you: [...room].find(([, x]) => x === v)[0], peers }));
  };
  ws.on('message', m => {
    let d; try { d = JSON.parse(m); } catch { return; }
    if (d.t === 'join' && !room) {
      const code = String(d.code).slice(0, 48), r = rooms.get(code) || new Map();
      if (r.size >= 2) { ws.send(JSON.stringify({ t: 'full' })); return; }
      r.code = code; rooms.set(code, r); r.set(id, { ws, p: {} }); room = r; bc();
    } else if (d.t === 'pr' && room && room.has(id) && d.p && typeof d.p === 'object') {
      const p = room.get(id).p;
      for (const k in d.p) { if (d.p[k] === null) delete p[k]; else p[k] = d.p[k]; }
      bc();
    }
  });
  ws.on('close', () => { if (!room) return; room.delete(id); if (!room.size) rooms.delete(room.code); else bc(); });
});
const port = process.env.PORT || 3000;
srv.listen(port, () => console.log('Maiden & Spell en http://localhost:' + port));
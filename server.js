const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// 1. Cargar el archivo HTML
const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 2. Crear el servidor HTTP
const srv = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

// 3. Configurar el servidor WebSocket
const wss = new WebSocketServer({ server: srv });
const rooms = new Map();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 10);
  let room = null;

  console.log(`[Servidor] Nueva conexión: ${id}`);

  // Función para enviar el estado actual a todos los jugadores de la sala
  const broadcastState = () => {
    if (!room) return;
    
    const peers = [...room].map(([peerId, peerData]) => ({ 
      id: peerId, 
      p: peerData.p 
    }));
    
    for (const [peerId, peerData] of room) {
      if (peerData.ws.readyState === 1) {
        const msg = {
          t: 'st',
          you: peerId,
          peers: peers
        };
        peerData.ws.send(JSON.stringify(msg));
      }
    }
  };

  ws.on('message', (message) => {
    let data;
    try {
      // message es un Buffer, lo convertimos a string para asegurar compatibilidad
      data = JSON.parse(message.toString());
    } catch (error) {
      console.log(`[Servidor] Error parseando mensaje de ${id}:`, error.message);
      return;
    }

    // Crear sala
    if (data.t === 'create' && !room) {
      const code = String(data.code).slice(0, 48).toLowerCase();
      console.log(`[Servidor] Intentando crear sala: ${code}`);
      
      if (rooms.has(code)) {
        console.log(`[Servidor] Sala ${code} ya existe`);
        ws.send(JSON.stringify({ t: 'exists' }));
        ws.close();
        return;
      }
      
      const newRoom = new Map();
      newRoom.code = code;
      rooms.set(code, newRoom);
      newRoom.set(id, { ws: ws, p: {} });
      room = newRoom;
      
      console.log(`[Servidor] Sala ${code} creada con jugador ${id}`);
      broadcastState();
    } 
    // Unirse a sala
    else if (data.t === 'join' && !room) {
      const code = String(data.code).slice(0, 48).toLowerCase();
      console.log(`[Servidor] Intentando unirse a sala: ${code}`);
      const targetRoom = rooms.get(code);
      
      if (!targetRoom) {
        console.log(`[Servidor] Sala ${code} no encontrada`);
        ws.send(JSON.stringify({ t: 'not_found' }));
        ws.close();
        return;
      }
      
      if (targetRoom.size >= 2) {
        console.log(`[Servidor] Sala ${code} llena`);
        ws.send(JSON.stringify({ t: 'full' }));
        ws.close();
        return;
      }
      
      targetRoom.set(id, { ws: ws, p: {} });
      room = targetRoom;
      
      console.log(`[Servidor] Jugador ${id} unido a sala ${code}`);
      broadcastState();
    } 
    // Actualizar presencia (estado del jugador)
    else if (data.t === 'pr' && room && room.has(id) && data.p && typeof data.p === 'object') {
      const playerState = room.get(id).p;
      for (const key in data.p) {
        if (data.p[key] === null) {
          delete playerState[key];
        } else {
          playerState[key] = data.p[key];
        }
      }
      broadcastState();
    }
  });

  ws.on('close', () => {
    console.log(`[Servidor] Jugador ${id} desconectado`);
    if (!room) return;
    
    room.delete(id);
    
    if (room.size === 0) {
      console.log(`[Servidor] Sala ${room.code} eliminada (vacía)`);
      rooms.delete(room.code);
    } else {
      broadcastState();
    }
  });
});

const port = process.env.PORT || 3000;
srv.listen(port, () => {
  console.log(`🎮 Maiden & Spell corriendo en http://localhost:${port}`);
});
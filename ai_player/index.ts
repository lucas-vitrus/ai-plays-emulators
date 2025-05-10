import * as fs from 'fs';
import * as path from 'path';

// const server = Bun.serve({
//   port: 3001, // You can change the port as needed
//   fetch(req) {
//     return new Response("Hello from the backend!");
//   },
// });

// console.log(`Backend server listening on http://localhost:${server.port}`);

import { Peer, DataConnection } from 'peerjs';

const FIXED_TARGET_PEER_ID = "YOUR_FIXED_PEER_ID_HERE"; // <--- REPLACE THIS WITH THE ACTUAL PEER ID

const peer = new Peer();
const connections: Record<string, DataConnection> = {};

function handleConnection(conn: DataConnection) {
  console.log(`Connection established with ${conn.peer}`);
  conn.on('data', (raw: any) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'image') {
        console.log(`📷 [${conn.peer}] image, ${msg.data.length} chars`);
      } else if (msg.type === 'json') {
        console.log(`💬 [${conn.peer}]`, msg.payload);
      }
    } catch (error) {
      console.error(`Error processing data from ${conn.peer}:`, error);
    }
  });
  conn.on('close', () => {
    console.log(`Connection closed with ${conn.peer}`);
    delete connections[conn.peer];
  });
  conn.on('error', (err) => {
    console.error(`Connection error with ${conn.peer}:`, err);
    delete connections[conn.peer];
  });
  connections[conn.peer] = conn;
}

peer.on('open', (id) => {
  console.log(`Your PeerJS ID: ${id}`);
  if (FIXED_TARGET_PEER_ID && FIXED_TARGET_PEER_ID !== "YOUR_FIXED_PEER_ID_HERE") {
    console.log(`Attempting to connect to fixed peer: ${FIXED_TARGET_PEER_ID}`);
    connectToPeer(FIXED_TARGET_PEER_ID);
  } else {
    console.log("FIXED_TARGET_PEER_ID is not set or is the placeholder. Waiting for incoming connections.");
  }
});

peer.on('connection', (conn) => {
  console.log(`Incoming connection from ${conn.peer}`);
  handleConnection(conn);
});

peer.on('error', (err) => {
  console.error('PeerJS error:', err);
  // You might want to add more robust error handling or reconnection logic here
  if (err.type === 'peer-unavailable') {
    console.log(`Peer ${FIXED_TARGET_PEER_ID} is unavailable. Will retry connection shortly.`);
    // Simple retry mechanism, could be made more sophisticated
    setTimeout(() => {
      if (FIXED_TARGET_PEER_ID && connections[FIXED_TARGET_PEER_ID] === undefined) {
        console.log(`Retrying connection to ${FIXED_TARGET_PEER_ID}...`);
        connectToPeer(FIXED_TARGET_PEER_ID);
      }
    }, 5000); // Retry after 5 seconds
  }
});

function connectToPeer(targetPeerId: string) {
  if (connections[targetPeerId]) {
    console.log(`Already connected or attempting to connect to ${targetPeerId}`);
    return;
  }

  console.log(`Attempting to dial ${targetPeerId}`);
  const conn = peer.connect(targetPeerId);

  if (conn) {
    conn.on('open', () => {
      console.log(`Successfully connected to ${targetPeerId} via connectToPeer.`);
      handleConnection(conn);
    });
    // Error and close handlers are set within handleConnection if connection is successful
    // Or set them here if 'open' is not emitted
    conn.on('error', (err) => {
      console.error(`Failed to connect to ${targetPeerId} within connectToPeer:`, err);
      delete connections[targetPeerId]; // Ensure cleanup if connection fails
    });
  } else {
    console.error(`Failed to initiate connection to peer: ${targetPeerId}. 'peer.connect' returned undefined.`);
  }
}

// --- Functions to send messages ---

export function sendJsonToAll(payload: any) {
  if (Object.keys(connections).length === 0) {
    console.log("No active connections to send JSON to.");
    return;
  }
  try {
    const msg = JSON.stringify({ type: 'json', id: Date.now().toString(), payload });
    Object.values(connections).forEach(c => {
      if (c && c.open) {
        c.send(msg);
      }
    });
    console.log('→ JSON sent to all connected peers');
  } catch (error) {
    console.log('Invalid JSON payload:', error);
  }
}

export function sendImageToAll(filePath: string) {
  if (Object.keys(connections).length === 0) {
    console.log("No active connections to send image to.");
    return;
  }
  try {
    const abs = path.resolve(filePath);
    const data = fs.readFileSync(abs, { encoding: 'base64' });
    const msg = JSON.stringify({ type: 'image', id: Date.now().toString(), data: `data:image/${path.extname(abs).slice(1)};base64,${data}` });
    Object.values(connections).forEach(c => {
      if (c && c.open) {
        c.send(msg);
      }
    });
    console.log(`→ Image sent to all connected peers (${filePath})`);
  } catch (e: any) {
    console.log('Error reading or sending file:', e.message);
  }
}

// Example usage (optional, can be removed or called from elsewhere):
// setTimeout(() => {
//   if (FIXED_TARGET_PEER_ID && FIXED_TARGET_PEER_ID !== "YOUR_FIXED_PEER_ID_HERE") {
//     sendJsonToAll({ greeting: "Hello from the simplified client!" });
//   }
// }, 10000); // Send a test message 10 seconds after start, if connected

// To keep the process running, especially if only acting as a server or waiting for connections
// console.log("PeerJS client running. Waiting for connections or messages...");
// process.stdin.resume(); // or use another method to keep alive if needed in your environment

// Note: The Bun server part is kept as is.
// The readline import and related CLI code (prompt function, rl.createInterface) have been removed.

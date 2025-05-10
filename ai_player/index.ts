import { Player } from "./player";
import type { ServerWebSocket } from "bun"; // Use ServerWebSocket directly

// Define a type for the data associated with each WebSocket connection by Bun
interface WebSocketContext {
  // We can add connection-specific data here later if needed, e.g., playerId
}

const activePlayers = new Map<ServerWebSocket<WebSocketContext>, Player>();

Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const success = server.upgrade(req, {
        data: {} as WebSocketContext, // Ensure ws.data is typed
      });
      return success
        ? undefined
        : new Response("WebSocket upgrade error", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    message(ws, message) {
      console.log(`Received message: ${message}`);
      let parsedMessage: any;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (error) {
        console.error("Failed to parse message as JSON:", message.toString());
        ws.send(JSON.stringify({ type: "ERROR", payload: "Invalid message format." }));
        return;
      }

      const typedWs = ws as ServerWebSocket<WebSocketContext>;
      const player = activePlayers.get(typedWs);

      switch (parsedMessage.type) {
        case "BEGIN_PLAY":
          if (!player) {
            console.log("BEGIN_PLAY received. Creating new player.");
            const playerName = "Gemini"; // Define player name
            const newPlayer = new Player(
              playerName, // Pass name to constructor
              // requestScreenshotFn
              (commandId: string) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "REQUEST_SCREENSHOT", commandId }));
                  console.log(`Server: Sent REQUEST_SCREENSHOT (id: ${commandId}) to player '${playerName}'`);
                } else {
                  console.warn(`WS not open for REQUEST_SCREENSHOT to player '${playerName}'`);
                }
              },
              // sendCommandFn
              (action: any) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify(action));
                  console.log(`Server: Sent command to player '${playerName}':`, action);
                } else {
                  console.warn(`WS not open for command to player '${playerName}'`);
                }
              }
            );
            activePlayers.set(typedWs, newPlayer);
            newPlayer.start(); // Player starts its internal loop

            // Inform frontend that player has started and its name
            ws.send(JSON.stringify({ 
              type: "PLAYER_INIT", 
              payload: { 
                playerName: newPlayer.getName(), 
                message: `Player '${newPlayer.getName()}' has started.` 
              }
            }));
            // Also send the older general info message for compatibility or general logging
            // ws.send(JSON.stringify({ type: "INFO", payload: "Player started." }));
          } else {
            console.log("Player already active for this connection.");
            ws.send(JSON.stringify({ type: "WARN", payload: "Player already active." }));
          }
          break;
        case "END_PLAY":
          if (player) {
            const playerName = player.getName();
            console.log(`END_PLAY received. Stopping player '${playerName}'.`);
            player.stop();
            activePlayers.delete(typedWs);
            ws.send(JSON.stringify({ type: "INFO", payload: `Player '${playerName}' stopped.` }));
          } else {
            console.log("No active player to stop for this connection.");
            ws.send(JSON.stringify({ type: "WARN", payload: "No active player to stop." }));
          }
          break;
        case "SCREENSHOT_RESPONSE":
          if (player) {
            if (parsedMessage.commandId && typeof parsedMessage.data === 'string') {
              console.log(`SCREENSHOT_RESPONSE for commandId: ${parsedMessage.commandId}`);
              player.handleScreenshotResponse(parsedMessage.commandId, parsedMessage.data);
            } else {
              console.warn("SCREENSHOT_RESPONSE missing commandId or data string:", parsedMessage);
              ws.send(JSON.stringify({ type: "ERROR", payload: "SCREENSHOT_RESPONSE missing commandId or data string" }));
            }
          } else {
            console.warn(`SCREENSHOT_RESPONSE for unknown player (commandId: ${parsedMessage.commandId})`);
            // Optionally, inform client if necessary, though usually screenshot responses are tied to active players
          }
          break;
        default:
          console.log(`Unknown message type: ${parsedMessage.type}`);
          ws.send(JSON.stringify({ type: "WARN", payload: `Unknown message type: ${parsedMessage.type}` }));
          break;
      }
    },
    open(ws) {
      console.log("WebSocket connection opened");
      ws.send(JSON.stringify({ type: "INFO", payload: "Connection established." }));
    },
    close(ws, code, reason) {
      console.log(`WebSocket connection closed: ${code} - ${reason}`);
      const typedWs = ws as ServerWebSocket<WebSocketContext>;
      const player = activePlayers.get(typedWs);
      if (player) {
        console.log("Stopping active player due to WebSocket close.");
        player.stop();
        activePlayers.delete(typedWs);
      }
    },
    drain(ws) {
      console.log("WebSocket is ready for more data.");
    },
  },
  port: 3033,
});

console.log("Bun WebSocket server listening on port 3033");

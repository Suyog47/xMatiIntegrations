const WebSocket = require("ws");

class WebSocketManager {
  constructor(server) {
    // Initialize WebSocket server
    this.wss = new WebSocket.Server({ server });
    // Store connected clients (key: childId, value: WebSocket)
    this.clients = new Map();
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on("connection", (ws) => {
      console.log("New WebSocket connection established.");

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          // Handle message types
          if (message.type === "REGISTER_CHILD") {
            const { userId } = message;
            if (!userId) {
              ws.send(JSON.stringify({ type: "error", message: "userId required" }));
              return;
            }


            // // If another connection exists for same childId, close it
            // const existingWs = this.clients.get(childId);
            // if (existingWs && existingWs.readyState === WebSocket.OPEN) {
            //   existingWs.send(
            //     JSON.stringify({
            //       type: "FORCE_LOGOUT",
            //       message: "Another login detected. You have been logged out.",
            //     })
            //   );
            //   existingWs.close();
            // }

            // Register new connection
            this.clients.set(userId, ws);
            console.log(`Registered child: ${userId}`);
            ws.send(
              JSON.stringify({
                type: "REGISTER_SUCCESS",
                message: `User ${userId} registered successfully.`,
              })
            );
          }
        } catch (err) {
          console.error("Invalid message:", err);
        }
      });

      ws.on("close", () => {
        // Clean up disconnected clients
        for (const [childId, socket] of this.clients.entries()) {
          if (socket === ws) {
            this.clients.delete(childId);
            console.log(`Child ${childId} disconnected.`);
            break;
          }
        }
      });

      ws.on("error", (err) => {
        console.error("WebSocket error:", err);
      });
    });
  }

  // Called from your Mother app (HTTP or programmatic trigger)
  sendForceLogout(childId) {
    const ws = this.clients.get(childId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "FORCE_LOGOUT",
          message: "You have been logged out by the system.",
        })
      );
      ws.close();
      this.clients.delete(childId);
      console.log(`Sent FORCE_LOGOUT to child ${childId}`);
      return true;
    } else {
      console.log(`Child ${childId} not connected.`);
      return false;
    }
  }
}

module.exports = WebSocketManager;

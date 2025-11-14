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
        for (const [userId, socket] of this.clients.entries()) {
          if (socket === ws) {
            this.clients.delete(userId);
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
  sendForceLogout(userId) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "FORCE_LOGOUT",
          message: "You have been logged out by the system.",
        })
      );
      ws.close();
      this.clients.delete(userId);
      console.log(`Sent FORCE_LOGOUT to user ${userId}`);
      return true;
    } else {
      console.log(`User ${userId} not connected.`);
      return false;
    }
  }

  sendBlockStatus(userId, status) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: `BLOCK_STATUS`,
          message: `${status ? 'Blocked' : 'Unblocked'}`,
        })
      );
      // ws.close();
      // this.clients.delete(userId);
      console.log(`Sent FORCE_BLOCK to user ${userId}`);
      return true;
    } else {
      console.log(`User ${userId} not connected.`);
      return false;
    }
  }

  sendVersionStatus(userId, version) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: `VERSION_UPDATE`,
          message: `${version}`,
        })
      );
      // ws.close();
      // this.clients.delete(userId);
      console.log(`Sent VERSION_UPDATE to user ${userId}`);
      return true;
    } else {
      console.log(`User ${userId} not connected.`);
      return false;
    }
  }

  sendMaintenanceStatus(userId, status) {
    // If userId is specific, send to that user only
    if (userId !== 'all') {
      const ws = this.clients.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: `MAINTENANCE_STATUS`,
            message: status,
          })
        );
        // ws.close();
        // this.clients.delete(userId);
        console.log(`Sent MAINTENANCE_STATUS to user ${userId}`);
        return true;
      } else {
        console.log(`User ${userId} not connected.`);
        return false;
      }
    }

    // if userId is 'all', broadcast to all connected clients
    let count = 0;

    for (const [clientId, client] of this.clients.entries()) {
      const ws = client.ws || client;  // depending on your storage structure

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "MAINTENANCE_STATUS",
            message: status,
          })
        );
        console.log(`Sent MAINTENANCE_STATUS to user ${clientId}`);
        count++;
      }
    }

    if (count === 0) {
      console.log("No connected users to broadcast MAINTENANCE_STATUS.");
    }

    return true;
  }


  //   sendMaintenanceStatus(userId, status) {
  //     const ws = this.clients.get(userId);
  //     if (ws && ws.readyState === WebSocket.OPEN) {
  //       ws.send(
  //         JSON.stringify({
  //           type: `MAINTENANCE_STATUS`,
  //           message: status,
  //         })
  //       );
  //       //ws.close();
  //       //this.clients.delete(userId);
  //       console.log(`Sent MAINTENANCE_STATUS to user ${userId}`);
  //       return true;
  //     } else {
  //       console.log(`User ${userId} not connected.`);
  //       return false;
  //     }
  //   }
}

module.exports = WebSocketManager;

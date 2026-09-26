import { verifyToken } from "../lib/jwt.js";

let ioInstance = null;

export function initSockets(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    // Staff sockets authenticate with a JWT to join their restaurant's private room.
    socket.on("staff:auth", (token) => {
      try {
        const payload = verifyToken(token);
        socket.data.role = payload.role;
        socket.join(`restaurant:${payload.restaurantId}`);
        socket.emit("staff:auth:ok");
      } catch {
        socket.emit("staff:auth:error");
      }
    });

    // Client sockets join by qr_token (public, random token is enough protection).
    socket.on("table:join", (qrToken) => {
      if (typeof qrToken === "string" && qrToken.length > 0) {
        socket.join(`table:${qrToken}`);
      }
    });

    // Public menu availability room, joined by restaurant slug.
    socket.on("menu:join", (slug) => {
      if (typeof slug === "string" && slug.length > 0) {
        socket.join(`menu:${slug}`);
      }
    });
  });
}

export function emitToRestaurant(restaurantId, event, payload) {
  ioInstance?.to(`restaurant:${restaurantId}`).emit(event, payload);
}

export function emitToTable(qrToken, event, payload) {
  ioInstance?.to(`table:${qrToken}`).emit(event, payload);
}

export function emitToMenu(slug, event, payload) {
  ioInstance?.to(`menu:${slug}`).emit(event, payload);
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.js";
import { clientRouter } from "./routes/client.js";
import { kitchenRouter } from "./routes/kitchen.js";
import { waiterRouter } from "./routes/waiter.js";
import { adminRouter } from "./routes/admin.js";
import { publicMenuRouter } from "./routes/publicMenu.js";
import { initSockets } from "./sockets/index.js";
import { UPLOADS_DIR } from "./lib/uploads.js";

const app = express();
const server = http.createServer(app);

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

const io = new Server(server, { cors: { origin: clientOrigin } });
initSockets(io);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/t", clientRouter);
app.use("/api/kitchen", kitchenRouter);
app.use("/api/waiter", waiterRouter);
app.use("/api/admin", adminRouter);
app.use("/api/menu", publicMenuRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

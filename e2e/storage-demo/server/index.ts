import { createServer } from "node:http";
import { WebSocketServer } from "ws";

import { handleMessage, register, unregister } from "./hub";

const PORT = Number(process.env.WS_PORT ?? 3011);

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("storage-demo liveblocks room server\n");
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  try {
    register(ws);
  } catch (err) {
    console.error("[server] failed to start session", err);
    ws.close(1011, "failed to start session");
    return;
  }

  ws.on("message", (data, isBinary) => {
    // Liveblocks protocol is JSON text (or the literal "ping")
    if (isBinary) {
      console.warn("[server] ignoring binary frame");
      return;
    }
    void handleMessage(ws, data.toString());
  });

  const onClose = () => unregister(ws);
  ws.on("close", onClose);
  ws.on("error", onClose);
});

server.listen(PORT, () => {
  console.log(`[server] Liveblocks Room on ws://127.0.0.1:${PORT}/ws`);
});

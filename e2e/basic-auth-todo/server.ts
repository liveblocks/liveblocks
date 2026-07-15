import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { IServerWebSocket, Ticket } from "@liveblocks/server";
import { ProtocolVersion, Room } from "@liveblocks/server";
import type { RawData } from "ws";
import WebSocket, { WebSocketServer } from "ws";

type User = {
  id: string;
  password: string;
  name: string;
  color: string;
};

type ClientMeta = Record<string, never>;
type TodoRoom = Room<string, never, ClientMeta>;
type TodoTicket = Ticket<never, ClientMeta>;

type Session = {
  room: TodoRoom;
  ticket: TodoTicket;
  socket: IServerWebSocket;
};

const PORT = Number(process.env.PORT ?? 3090);
const HOST = process.env.HOST ?? "127.0.0.1";
const STATIC_DIR = fileURLToPath(new URL("./static/", import.meta.url));

const users = new Map<string, User>([
  [
    "alice",
    {
      id: "alice",
      password: "alice",
      name: "Alice",
      color: "#D583F0",
    },
  ],
  ["bob", { id: "bob", password: "bob", name: "Bob", color: "#F08385" }],
]);

const rooms = new Map<string, TodoRoom>();
const sessions = new WeakMap<WebSocket, Session>();
const authSessions = new Map<string, { user: User; expiresAt: number }>();

function getRoom(roomId: string): TodoRoom {
  let room = rooms.get(roomId);
  if (room === undefined) {
    room = new Room<string, never, ClientMeta>(roomId);
    rooms.set(roomId, room);
  }
  return room;
}

function authenticateBasic(authorization: string | null): User | undefined {
  if (authorization === null || !authorization.startsWith("Basic ")) {
    return undefined;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  } catch {
    return undefined;
  }

  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return undefined;
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const user = users.get(username);
  return user?.password === password ? user : undefined;
}

function createAuthSession(user: User): string {
  const token = randomUUID();
  authSessions.set(token, {
    user,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
  return token;
}

function authenticateSession(token: string | null): User | undefined {
  if (token === null) {
    return undefined;
  }

  const session = authSessions.get(token);
  if (session === undefined) {
    return undefined;
  }
  if (session.expiresAt <= Date.now()) {
    authSessions.delete(token);
    return undefined;
  }
  return session.user;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function serveStatic(pathname: string): Promise<Response> {
  const files: Record<string, { file: string; type: string }> = {
    "/": { file: "index.html", type: "text/html; charset=utf-8" },
    "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
    "/index.css": { file: "index.css", type: "text/css; charset=utf-8" },
  };
  const asset = files[pathname];
  if (asset === undefined) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(await readFile(`${STATIC_DIR}/${asset.file}`), {
    headers: { "Content-Type": asset.type },
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  let webResponse: Response;

  if (request.method === "POST" && url.pathname === "/api/auth") {
    const authorization = request.headers.authorization ?? null;
    const user = authenticateBasic(authorization);
    webResponse =
      user === undefined
        ? new Response("Invalid username or password", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Liveblocks todo"' },
          })
        : json({
            // This is an opaque session ID, not a Liveblocks JWT.
            token: createAuthSession(user),
            userId: user.id,
            userInfo: { name: user.name, color: user.color },
          });
  } else {
    webResponse = await serveStatic(url.pathname);
  }

  response.writeHead(
    webResponse.status,
    Object.fromEntries(webResponse.headers)
  );
  response.end(Buffer.from(await webResponse.arrayBuffer()));
});

const webSocketServer = new WebSocketServer({ noServer: true });

function toSocket(webSocket: WebSocket): IServerWebSocket {
  return {
    send(message) {
      if (webSocket.readyState !== WebSocket.OPEN) {
        return 0;
      }
      const data = typeof message === "string" ? message : Buffer.from(message);
      webSocket.send(data);
      return typeof data === "string" ? Buffer.byteLength(data) : data.length;
    },
    close(code, reason) {
      webSocket.close(code, reason);
    },
  };
}

function decodeMessage(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }
  return data.toString("utf8");
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const version =
    url.pathname === "/v7"
      ? ProtocolVersion.V7
      : url.pathname === "/v8"
        ? ProtocolVersion.V8
        : undefined;
  const roomId = url.searchParams.get("roomId");
  const user = authenticateSession(url.searchParams.get("tok"));

  if (version === undefined || roomId === null || user === undefined) {
    socket.write(
      "HTTP/1.1 401 Unauthorized\r\n" +
        'WWW-Authenticate: Basic realm="Liveblocks todo"\r\n' +
        "Connection: close\r\n\r\n"
    );
    socket.destroy();
    return;
  }

  const room = getRoom(roomId);
  const ticket = room.createTicket({
    version,
    id: user.id,
    info: { name: user.name, color: user.color },
    scopes: ["room:write"],
  });

  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    const serverSocket = toSocket(webSocket);
    sessions.set(webSocket, { room, ticket, socket: serverSocket });
    webSocketServer.emit("connection", webSocket, request);
  });
});

webSocketServer.on("connection", (webSocket) => {
  const session = sessions.get(webSocket);
  if (session === undefined) {
    webSocket.close(1011, "Missing session");
    return;
  }

  session.room.startBrowserSession(session.ticket, session.socket);

  webSocket.on("message", (data) => {
    void session.room
      .handleData(session.ticket.sessionKey, decodeMessage(data))
      .catch((error: unknown) =>
        console.error("WebSocket message failed", error)
      );
  });

  webSocket.on("close", (code, reason) => {
    session.room.endBrowserSession(
      session.ticket.sessionKey,
      code,
      reason.toString()
    );
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Basic Auth todo running at http://${HOST}:${PORT}`);
  console.log("Sign in with alice/alice or bob/bob");
});

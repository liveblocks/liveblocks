import type { EventSource, Observable } from "../lib/EventSource";
import { makeEventSource } from "../lib/EventSource";
import type { Json } from "../lib/Json";
import { withTimeout } from "../lib/utils";
import type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketMessageEvent,
} from "../types/IWebSocket";

type ServerEvents = {
  onOpen: Observable<IWebSocketEvent>;
  onClose: Observable<IWebSocketCloseEvent>;
  onMessage: Observable<IWebSocketMessageEvent>;
  onError: Observable<IWebSocketEvent>;
};

type Emitters = {
  onOpen: EventSource<IWebSocketEvent>;
  onClose: EventSource<IWebSocketCloseEvent>;
  onMessage: EventSource<IWebSocketMessageEvent>;
  onError: EventSource<IWebSocketEvent>;
};

/**
 * The server side socket of the two-sided connection. It's the opposite end of
 * the client side socket (aka the MockWebSocket instance).
 */
type ServerSocket = {
  /** Inspect the messages the server end has received as the result of the client side sending it messages. */
  receivedMessagesRaw: readonly string[];
  receive(message: string): void;
  /** Accept the socket from the server side. The client will receive an "open" event. */
  accept(): void;
  /** Close the socket from the server side. */
  close(event: IWebSocketCloseEvent): void;
  /** Send a message from the server side to the client side. */
  send(event: IWebSocketMessageEvent): void;
  /** Send an error event from the server side to the client side. */
  error(event: IWebSocketEvent): void;
};

type Connection = {
  client: MockWebSocket;
  server: ServerSocket;
};

export class MockWebSocketServer {
  #newConnectionCallbacks = makeEventSource<Connection>();
  public current: MockWebSocket | undefined;
  public connections: Map<MockWebSocket, Emitters> = new Map();

  public onReceive = makeEventSource<string>();
  public receivedMessagesRaw: string[] = [];

  /**
   * The server socket of the last connection that has been established to the
   * server.
   */
  get last(): ServerSocket {
    if (this.current === undefined) {
      throw new Error("No socket instantiated yet");
    }
    return this.current.server;
  }

  /**
   * In 99.9% of cases, the server messages are going to be JSON-serialized
   * values. If you need to look at the raw message (the 0.1% case), you can
   * use this.receivedMessagesRaw for that.
   */
  public get receivedMessages(): Json[] {
    return this.receivedMessagesRaw.map((raw) => {
      try {
        return JSON.parse(raw) as Json;
      } catch {
        return "<non-JSON value>";
      }
    });
  }

  getEmitters(socket: MockWebSocket): Emitters {
    const emitters = this.connections.get(socket);
    if (emitters === undefined) {
      throw new Error("Unknown socket");
    }
    return emitters;
  }

  accept(socket: MockWebSocket) {
    this.getEmitters(socket).onOpen.notify(new Event("open"));
  }

  close(socket: MockWebSocket, event: IWebSocketCloseEvent) {
    this.getEmitters(socket).onClose.notify(event);
  }

  message(socket: MockWebSocket, event: IWebSocketMessageEvent) {
    this.getEmitters(socket).onMessage.notify(event);
  }

  error(socket: MockWebSocket, event: IWebSocketEvent) {
    this.getEmitters(socket).onError.notify(event);
  }

  /**
   * Create a new socket connection instance this server.
   */
  public newSocket(initFn?: (socket: MockWebSocket) => void): MockWebSocket {
    const serverEvents = {
      onOpen: makeEventSource<IWebSocketEvent>(),
      onClose: makeEventSource<IWebSocketCloseEvent>(),
      onMessage: makeEventSource<IWebSocketMessageEvent>(),
      onError: makeEventSource<IWebSocketEvent>(),
    };

    const serverSocket: ServerSocket = {
      receivedMessagesRaw: this.receivedMessagesRaw,
      receive: (message: string) => {
        this.receivedMessagesRaw.push(message);
        this.onReceive.notify(message);
      },

      accept: () => serverEvents.onOpen.notify(new Event("open")),
      close: serverEvents.onClose.notify,
      send: serverEvents.onMessage.notify,
      error: serverEvents.onError.notify,
    };

    const clientSocket = new MockWebSocket();
    clientSocket.linkToServerSocket(serverSocket, serverEvents);
    this.connections.set(clientSocket, serverEvents);
    this.current = clientSocket;

    // Run the callback in the next tick. This is important, because we first
    // need to return the socket.
    setTimeout(() => {
      // Call the provided callback once, for this connection only.
      initFn?.(clientSocket);

      // ...then proceed to call the rest of the callbacks, which will be
      // executed on every new connection
      this.#newConnectionCallbacks.notify({
        client: clientSocket,
        server: serverSocket,
      });
    }, 0);

    return clientSocket;
  }

  /**
   * Set a new behavior to execute when a new server connection is made.
   * Replaces an existing "onConnection" behavior if any exists. It won't stack
   * those behaviors.
   */
  public onConnection(callback: (conn: Connection) => void): void {
    this.#newConnectionCallbacks[Symbol.dispose]();
    this.#newConnectionCallbacks.subscribe(callback);
  }

  /**
   * Pauses test execution until a message has been received.
   */
  public async waitUntilMessageReceived(): Promise<void> {
    await withTimeout(
      this.onReceive.waitUntil(),
      1000,
      "Server did not receive a message within 1s"
    );
  }
}

type Listener = (ev: IWebSocketEvent) => void;
type CloseListener = (ev: IWebSocketCloseEvent) => void;
type MessageListener = (ev: IWebSocketMessageEvent) => void;

export class MockWebSocket {
  /**
   * Control/simulate server-side behavior for this socket connection only.
   * This is a convenience accessor if you're only interested in controlling
   * behavior for this particular client/server socket pair.
   */
  #serverSocket: ServerSocket | undefined;

  #maybeListeners: ServerEvents | undefined;
  #unsubs: {
    open: WeakMap<Listener | MessageListener | CloseListener, () => void>;
    close: WeakMap<Listener | MessageListener | CloseListener, () => void>;
    message: WeakMap<Listener | MessageListener | CloseListener, () => void>;
    error: WeakMap<Listener | MessageListener | CloseListener, () => void>;
  };

  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSING = 2;
  public readonly CLOSED = 3;

  readonly url: string;

  #readyState: number;

  /**
   * Don't call this constructor directly. Obtain a MockWebSocket instance by
   * instantiating a MockWebSocketServer, and calling .newSocket() on it. That
   * way, you can control and observe this socket's exact behavior by using the
   * server.
   */
  constructor(url: string = "ws://ignored") {
    this.#unsubs = {
      open: new WeakMap(),
      close: new WeakMap(),
      message: new WeakMap(),
      error: new WeakMap(),
    };
    this.url = url;
    this.#readyState = this.CONNECTING;
  }

  public linkToServerSocket(
    serverSocket: ServerSocket,
    listeners: ServerEvents
  ) {
    this.#serverSocket = serverSocket;
    this.#maybeListeners = listeners;

    // onOpen (from server)
    listeners.onOpen.subscribeOnce(() => {
      if (this.readyState > this.CONNECTING) {
        throw new Error(
          "Cannot open a WebSocket that has already advanced beyond the CONNECTING state"
        );
      }

      this.#readyState = this.OPEN;
    });

    // onClose (from server)
    listeners.onClose.subscribe(() => {
      this.#readyState = this.CLOSED;
    });

    // onSend (from server)
    listeners.onMessage.subscribe(() => {
      if (this.readyState < this.OPEN) {
        throw new Error("Socket hasn't been opened yet");
      }
    });
  }

  /**
   * Returns the server-side socket on the opposite end of the connection.
   */
  public get server(): ServerSocket {
    if (this.#serverSocket === undefined) {
      throw new Error("No server attached yet");
    }
    return this.#serverSocket;
  }

  get #listeners(): ServerEvents {
    if (this.#maybeListeners === undefined) {
      throw new Error("No server attached yet");
    }
    return this.#maybeListeners;
  }

  //
  // WEBSOCKET API
  //

  public get readyState(): number {
    return this.#readyState;
  }

  addEventListener(type: "message", listener: MessageListener): void; // prettier-ignore
  addEventListener(type: "close", listener: CloseListener): void; // prettier-ignore
  addEventListener(type: "open" | "error", listener: Listener): void; // prettier-ignore
  // prettier-ignore
  addEventListener(type: "open" | "close" | "message" | "error", listener: Listener | MessageListener | CloseListener): void {
    let unsub: (() => void) | undefined;
    if (type === "open") {
      unsub = this.#listeners.onOpen.subscribe(listener as Listener);
    } else if (type === "close") {
      unsub = this.#listeners.onClose.subscribe(listener as CloseListener);
    } else if (type === "message") {
      unsub = this.#listeners.onMessage.subscribe(listener as MessageListener);
    } else if (type === "error") {
      unsub = this.#listeners.onError.subscribe(listener as Listener);
    }

    if (unsub) {
      this.#unsubs[type].set(listener, unsub);
    }
  }

  removeEventListener(type: "message", listener: MessageListener): void; // prettier-ignore
  removeEventListener(type: "close", listener: CloseListener): void; // prettier-ignore
  removeEventListener(type: "open" | "error", listener: Listener): void; // prettier-ignore
  // prettier-ignore
  removeEventListener(type: "open" | "close" | "message" | "error", listener: Listener | MessageListener | CloseListener): void {
    const unsub = this.#unsubs[type].get(listener);
    if (unsub !== undefined) {
      unsub();
    }
  }

  /**
   * Send a message from the client to the WebSocket server.
   */
  public send(message: string) {
    if (this.readyState === this.OPEN) {
      this.server.receive(message);
    }
  }

  /**
   * Close the socket from the client side.
   */
  public close(_code?: number, _reason?: string): void {
    this.#readyState = this.CLOSED;
  }
}

// ------------------------------------------------------------------------
// This little line will ensure that the MockWebSocket class is and remains
// assignable to IWebSocket in TypeScript (because "implementing it" is
// impossible).
((): IWebSocket => MockWebSocket)(); // Do not remove this check
// ------------------------------------------------------------------------

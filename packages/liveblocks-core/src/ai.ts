import { getBearerTokenFromAuthValue } from "./api-client";
import type { AuthValue } from "./auth-manager";
import type { Delegates, Status } from "./connection";
import { ManagedSocket, StopRetrying } from "./connection";
import { kInternal } from "./internal";
import { assertNever } from "./lib/assert";
import * as console from "./lib/fancy-console";
import { Signal } from "./lib/signals";
import { TokenKind } from "./protocol/AuthToken";
import type {
  DynamicSessionInfo,
  Polyfills,
  StaticSessionInfo,
  TimeoutID,
} from "./room";
import {
  type AiTextContent,
  type ClientAiMsg,
  ClientAiMsgCode,
  MessageContentType,
} from "./types/ai";
import type {
  IWebSocket,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
import { PKG_VERSION } from "./version";

type AiContext = {
  staticSessionInfoSig: Signal<StaticSessionInfo | null>;
  dynamicSessionInfoSig: Signal<DynamicSessionInfo | null>;
};

export type Ai = {
  [kInternal]: {
    debugContext: () => AiContext;
  };
  connect: () => void;
  reconnect: () => void;
  disconnect: () => void;
  listChats: () => void;
  newChat: (id?: string) => void;
  getMessages: (chatId: string) => void;
  sendMessage: (chatId: string, message: string) => void;
  getStatus: () => Status;
};

/** @internal */
export type AiConfig = {
  delegates: Delegates<AuthValue>;

  userId?: string;
  lostConnectionTimeout: number;
  backgroundKeepAliveTimeout?: number;
  polyfills?: Polyfills;

  enableDebugLogging?: boolean;
};

export function createAi(config: AiConfig): Ai {
  const managedSocket: ManagedSocket<AuthValue> = new ManagedSocket(
    config.delegates,
    config.enableDebugLogging,
    false // AI doesn't have actors
  );

  const context: AiContext = {
    staticSessionInfoSig: new Signal<StaticSessionInfo | null>(null),
    dynamicSessionInfoSig: new Signal<DynamicSessionInfo | null>(null),
  };

  let lastTokenKey: string | undefined;
  function onStatusDidChange(newStatus: Status) {
    console.warn("onStatusDidChange", newStatus);
    const authValue = managedSocket.authValue;
    if (authValue !== null) {
      const tokenKey = getBearerTokenFromAuthValue(authValue);

      if (tokenKey !== lastTokenKey) {
        lastTokenKey = tokenKey;

        if (authValue.type === "secret") {
          const token = authValue.token.parsed;
          context.staticSessionInfoSig.set({
            userId: token.k === TokenKind.SECRET_LEGACY ? token.id : token.uid,
            userInfo:
              token.k === TokenKind.SECRET_LEGACY ? token.info : token.ui,
          });
        } else {
          context.staticSessionInfoSig.set({
            userId: undefined,
            userInfo: undefined,
          });
        }
      }
    }
  }
  let _connectionLossTimerId: TimeoutID | undefined;
  let _hasLostConnection = false;

  function handleConnectionLossEvent(newStatus: Status) {
    if (newStatus === "reconnecting") {
      _connectionLossTimerId = setTimeout(() => {
        _hasLostConnection = true;
      }, config.lostConnectionTimeout);
    } else {
      clearTimeout(_connectionLossTimerId);

      if (_hasLostConnection) {
        _hasLostConnection = false;
      }
    }
  }

  function onDidConnect() {
    console.warn("onDidConnect");
    // NoOp for now, but we shoudl fetch messages
  }

  function onDidDisconnect() {
    console.warn("onDidDisconnect");
  }

  function handleServerMessage(event: IWebSocketMessageEvent) {
    console.warn("handleServerMessage", event.data);
  }

  managedSocket.events.onMessage.subscribe(handleServerMessage);
  managedSocket.events.statusDidChange.subscribe(onStatusDidChange);
  managedSocket.events.statusDidChange.subscribe(handleConnectionLossEvent);
  managedSocket.events.didConnect.subscribe(onDidConnect);
  managedSocket.events.didDisconnect.subscribe(onDidDisconnect);
  managedSocket.events.onConnectionError.subscribe(({ message, code }) => {
    //const type = "AI_CONNECTION_ERROR";
    // const err = new LiveblocksError(message, { type, code });
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `Connection to websocket server closed. Reason: ${message} (code: ${code}).`
      );
    }
  });

  function sendClientMsg(msg: ClientAiMsg) {
    managedSocket.send(JSON.stringify(msg));
  }

  return Object.defineProperty(
    {
      [kInternal]: {
        debugContext: () => context,
      },
      connect: () => managedSocket.connect(),
      reconnect: () => managedSocket.reconnect(),
      disconnect: () => managedSocket.disconnect(),
      listChats: () => {
        sendClientMsg({
          type: ClientAiMsgCode.LIST_CHATS,
        });
      },
      newChat: (id?: string) => {
        sendClientMsg({
          type: ClientAiMsgCode.NEW_CHAT,
        });
      },
      getMessages: (chatId: string) => {
        sendClientMsg({
          type: ClientAiMsgCode.GET_MESSAGES,
          chatId,
        });
      },
      sendMessage: (chatId: string, message: string) => {
        const content: AiTextContent = {
          type: MessageContentType.TEXT,
          data: message,
        };
        sendClientMsg({
          type: ClientAiMsgCode.ADD_MESSAGE,
          chatId,
          content,
        });
      },
      abortResponse: (chatId: string) => {
        sendClientMsg({
          type: ClientAiMsgCode.ABORT_RESPONSE,
          chatId,
        });
      },
      getStatus: () => managedSocket.getStatus(),
    },
    kInternal,
    { enumerable: false }
  );
}

export function makeCreateSocketDelegateForAi(
  baseUrl: string,
  WebSocketPolyfill?: IWebSocket
) {
  return (authValue: AuthValue): IWebSocketInstance => {
    const ws: IWebSocket | undefined =
      WebSocketPolyfill ??
      (typeof WebSocket === "undefined" ? undefined : WebSocket);

    if (ws === undefined) {
      throw new StopRetrying(
        "To use Liveblocks client in a non-DOM environment, you need to provide a WebSocket polyfill."
      );
    }

    const url = new URL(baseUrl);
    url.protocol = url.protocol === "http:" ? "ws" : "wss";
    url.pathname = "/v7"; // Do we need this?
    url.searchParams.set("ai", "true");
    // TODO: don't allow public key to do this
    if (authValue.type === "secret") {
      url.searchParams.set("tok", authValue.token.raw);
    } else if (authValue.type === "public") {
      url.searchParams.set("pubkey", authValue.publicApiKey);
    } else {
      return assertNever(authValue, "Unhandled case");
    }
    url.searchParams.set("version", PKG_VERSION || "dev");
    return new ws(url.toString());
  };
}

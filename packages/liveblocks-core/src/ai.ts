import { getBearerTokenFromAuthValue } from "./api-client";
import type { AuthValue } from "./auth-manager";
import type { Delegates, Status } from "./connection";
import { ManagedSocket, StopRetrying } from "./connection";
import { kInternal } from "./internal";
import { assertNever } from "./lib/assert";
import { DefaultMap } from "./lib/DefaultMap";
import * as console from "./lib/fancy-console";
import { nanoid } from "./lib/nanoid";
import { DerivedSignal, MutableSignal, Signal } from "./lib/signals";
import { type DistributiveOmit, tryParseJson } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type {
  DynamicSessionInfo,
  Polyfills,
  StaticSessionInfo,
  TimeoutID,
} from "./room";
import type {
  AiChat,
  AiChatMessage,
  AiMessageContent,
  AiRequestId,
  AiTextContent,
  AiTool,
  ClientAiMsg,
  Cursor,
  ServerAiMsg,
} from "./types/ai";
import {
  AiStatus,
  ClientAiMsgCode,
  MessageContentType,
  ServerAiMsgCode,
} from "./types/ai";
import type {
  IWebSocket,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
import { PKG_VERSION } from "./version";

const REQUEST_TIMEOUT = 10_000;

/**
 * A lookup table (LUT) for all the user AI chats.
 */
type AiChatsLUT = Map<string, AiChat>;

type AiContext = {
  staticSessionInfoSig: Signal<StaticSessionInfo | null>;
  dynamicSessionInfoSig: Signal<DynamicSessionInfo | null>;
  requests: Map<
    AiRequestId,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      timeout: NodeJS.Timeout;
    }
  >;
  chats: ReturnType<typeof createStore_forUserAiChats>;
  messages: ReturnType<typeof createStore_forChatMessages>;
};

function createStore_forChatMessages() {
  const baseSignal = new MutableSignal(
    new DefaultMap(() => new Map()) as DefaultMap<
      string,
      Map<string, AiChatMessage>
    >
  );

  function update(chatId: string, messages: AiChatMessage[]): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.getOrCreate(chatId);
      for (const message of messages) {
        messagesByChatId.set(message.id, message);
      }
    });
  }

  // TODO: do we want to fail or throw or return something if the message doesn't exist?
  function updateMessage(
    chatId: string,
    messageId: string,
    messageUpdate: Partial<AiChatMessage>
  ): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.get(chatId);
      if (!messagesByChatId) {
        return;
      }
      const message = messagesByChatId.get(messageId);
      if (!message) {
        return;
      }
      messagesByChatId.set(messageId, {
        ...message,
        ...messageUpdate,
      } as AiChatMessage);
    });
  }

  return {
    messages: DerivedSignal.from(baseSignal, (chats) =>
      Object.fromEntries(
        [...chats].map(([chatId, messages]) => [
          chatId,
          Object.fromEntries(messages),
        ])
      )
    ),

    sortedMessages: DerivedSignal.from(baseSignal, (chats) =>
      Object.fromEntries(
        [...chats].map(([chatId, messages]) => [
          chatId,
          Array.from(messages.values()).sort((a, b) => {
            return Date.parse(a.createdAt) - Date.parse(b.createdAt);
          }),
        ])
      )
    ),

    // Mutations
    updateMessage,
    update,
  };
}

function createStore_forUserAiChats() {
  const baseSignal = new MutableSignal(new Map() as AiChatsLUT);

  function update(chats: AiChat[]) {
    baseSignal.mutate((lut) => {
      for (const chat of chats) {
        lut.set(chat.id, chat);
      }
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, (chats) => {
      return Array.from(chats.values());
    }),

    // Mutations
    update,
  };
}

const makeRequestId = () => {
  return nanoid() as AiRequestId;
};

export type Ai = {
  [kInternal]: {
    debugContext: () => AiContext;
  };
  connect: () => void;
  reconnect: () => void;
  disconnect: () => void;
  getStatus: () => Status;
  listChats: () => Promise<{
    chats: AiChat[];
    cursor: { lastMessageAt: string; chatId: string };
  }>;
  newChat: (id?: string) => Promise<AiChat>;
  getMessages: (chatId: string) => Promise<{
    messages: AiChatMessage[];
    cursor: { messageId: string; createdAt: string };
  }>;
  sendMessage: (chatId: string, message: string) => Promise<AiChatMessage>;
  statelessAction: (
    prompt: string,
    tool: AiTool
  ) => Promise<AiMessageContent[]>;
  abortResponse: (
    chatId: string
  ) => Promise<{ chatId: string; messageId: string }>;
  signals: {
    chats: DerivedSignal<AiChat[]>;
    messages: DerivedSignal<Record<string, AiChatMessage[]>>;
  };
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
    false // AI doesn't have actors (yet, but it will)
  );

  const context: AiContext = {
    staticSessionInfoSig: new Signal<StaticSessionInfo | null>(null),
    dynamicSessionInfoSig: new Signal<DynamicSessionInfo | null>(null),
    requests: new Map(),
    chats: createStore_forUserAiChats(),
    messages: createStore_forChatMessages(),
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
    // NoOp for now, but we should maybe fetch messages or something?
  }

  function onDidDisconnect() {
    console.warn("onDidDisconnect");
  }

  function handleServerMessage(event: IWebSocketMessageEvent) {
    console.warn("handleServerMessage", event.data);
    if (typeof event.data === "string") {
      const msg = tryParseJson(event.data) as ServerAiMsg;

      switch (msg.type) {
        case ServerAiMsgCode.ERROR:
          if (msg.requestId) {
            // Not all errors have request Ids
            context.requests.get(msg.requestId)?.reject(new Error(msg.error));
          }
          break;

        case ServerAiMsgCode.STREAM_MESSAGE_COMPLETE:
          context.messages.updateMessage(msg.chatId, msg.messageId, {
            content: msg.content,
            status: AiStatus.COMPLETE,
          });
          context.requests.get(msg.requestId)?.resolve({
            content: msg.content,
            messageId: msg.messageId,
            chatId: msg.chatId,
          });
          break;

        case ServerAiMsgCode.STREAM_MESSAGE_FAILED:
          if (msg.messageId !== undefined) {
            context.messages.updateMessage(msg.chatId, msg.messageId, {
              status: AiStatus.FAILED,
            });
          }
          context.requests.get(msg.requestId)?.reject(new Error(msg.error));
          break;

        case ServerAiMsgCode.STREAM_MESSAGE_ABORTED:
          if (msg.messageId !== undefined) {
            context.messages.updateMessage(msg.chatId, msg.messageId, {
              status: AiStatus.ABORTED,
            });
          }
          context.requests
            .get(msg.requestId)
            ?.reject(new Error("Message aborted")); // Alternatively we could resolve with the current message
          break;

        case ServerAiMsgCode.CREATE_CHAT_OK:
          context.chats.update([msg.chat]);
          context.requests.get(msg.requestId)?.resolve(msg.chat);
          break;

        case ServerAiMsgCode.GET_MESSAGES_OK:
          context.messages.update(msg.chatId, msg.messages);
          context.requests.get(msg.requestId)?.resolve({
            messages: msg.messages,
            cursor: msg.nextCursor,
          });
          break;

        case ServerAiMsgCode.LIST_CHATS_OK:
          context.chats.update(msg.chats);
          context.requests.get(msg.requestId)?.resolve({
            chats: msg.chats,
            cursor: msg.nextCursor,
          });
          break;

        case ServerAiMsgCode.STATELESS_RUN_RESULT:
          context.requests.get(msg.requestId)?.resolve(msg.result);
          break;
      }
    }
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

  function sendClientMsgWithResponse<T>(
    msg: DistributiveOmit<ClientAiMsg, "requestId">,
    requestTimeout: number = REQUEST_TIMEOUT
  ): Promise<T> {
    // TODO: we can probably retry or something here
    if (managedSocket.getStatus() !== "connected") {
      return Promise.reject(new Error("Not connected"));
    }

    const requestId = makeRequestId();
    const promise = new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        const request = context.requests.get(requestId);
        if (request) {
          clearTimeout(request.timeout); // it's a noop if it already timed
          context.requests.delete(requestId);
        }
      };

      // This is a map of requests that should hopefully clean itself up.
      // TODO: ask Vincent if we can make this a WeakMap ;)
      context.requests.set(requestId, {
        resolve: (value) => {
          cleanup();
          resolve(value as T);
        },
        reject: (reason) => {
          cleanup();
          reject(reason);
        },
        timeout: setTimeout(() => {
          cleanup();
          reject(new Error("Request timed out"));
        }, requestTimeout),
      });
    });
    sendClientMsg({
      ...msg,
      requestId,
    });
    return promise;
  }

  function sendClientMsg(msg: ClientAiMsg) {
    managedSocket.send(
      JSON.stringify({
        ...msg,
      })
    );
  }

  return Object.defineProperty(
    {
      [kInternal]: {
        debugContext: () => context,
      },

      connect: () => managedSocket.connect(),
      reconnect: () => managedSocket.reconnect(),
      disconnect: () => managedSocket.disconnect(),

      listChats: (cursor?: Cursor) => {
        return sendClientMsgWithResponse({
          type: ClientAiMsgCode.LIST_CHATS,
          cursor,
        });
      },

      newChat: (id?: string) => {
        return sendClientMsgWithResponse({
          type: ClientAiMsgCode.CREATE_CHAT,
          chatId: id,
        });
      },

      getMessages: (chatId: string) => {
        return sendClientMsgWithResponse({
          type: ClientAiMsgCode.GET_MESSAGES,
          chatId,
        });
      },

      sendMessage: (chatId: string, message: string) => {
        const content: AiTextContent = {
          type: MessageContentType.TEXT,
          data: message,
        };
        return sendClientMsgWithResponse(
          {
            type: ClientAiMsgCode.ADD_MESSAGE,
            chatId,
            content,
          },
          60_000 // todo: not sure if we even want to leave a promise hanging here. some requests can be pretty long, although we do need to have some bounds
        );
      },

      statelessAction: (prompt: string, tool: AiTool) => {
        return sendClientMsgWithResponse(
          {
            type: ClientAiMsgCode.STATELESS_RUN,
            prompt,
            tools: [tool],
            tool_choice: {
              type: "tool",
              toolName: tool.name,
            },
          },
          60_000
        );
      },

      abortResponse: (chatId: string) => {
        return sendClientMsgWithResponse({
          type: ClientAiMsgCode.ABORT_RESPONSE,
          chatId,
        });
      },

      getStatus: () => managedSocket.getStatus(),

      signals: {
        chats: context.chats.signal,
        messages: context.messages.sortedMessages,
      },
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
    url.pathname = "/ai/v1"; // Do we need this?
    // TODO: don't allow public key to do this
    if (authValue.type === "secret") {
      url.searchParams.set("tok", authValue.token.raw);
    } else if (authValue.type === "public") {
      throw new Error("Public key not supported with AI Copilots");
    } else {
      return assertNever(authValue, "Unhandled case");
    }
    url.searchParams.set("version", PKG_VERSION || "dev");
    return new ws(url.toString());
  };
}

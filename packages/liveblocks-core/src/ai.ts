import { getBearerTokenFromAuthValue } from "./api-client";
import type { AuthValue } from "./auth-manager";
import type { Delegates, Status } from "./connection";
import { ManagedSocket, StopRetrying } from "./connection";
import { kInternal } from "./internal";
import { assertNever } from "./lib/assert";
import { Promise_withResolvers } from "./lib/controlledPromise";
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
  AiRequestId,
  AiTextContent,
  AiTool,
  ChatCreatedServerMsg,
  ClientAiMsg,
  Cursor,
  ErrorServerMsg,
  GetMessagesServerMsg,
  ListChatServerMsg,
  MessageAddedServerMsg,
  ServerAiMsg,
  StatelessRunResultServerMsg,
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

// Allow server to take up to 10 seconds to respond to any WebSocket RPC request
const DEFAULT_REQUEST_TIMEOUT = 10_000;

/**
 * A lookup table (LUT) for all the user AI chats.
 */
type AiChatsLUT = Map<string, AiChat>;

type AiContext = {
  staticSessionInfoSig: Signal<StaticSessionInfo | null>;
  dynamicSessionInfoSig: Signal<DynamicSessionInfo | null>;
  pendingRequests: Map<
    AiRequestId,
    {
      resolve: (value: ServerAiMsg) => void;
      reject: (reason: unknown) => void;
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

  function remove(chatId: string, messageId: string): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.get(chatId);
      messagesByChatId?.delete(messageId);
    });
  }

  function removeByChatId(chatId: string): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.get(chatId);
      if (!messagesByChatId) {
        return;
      }
      for (const message of messagesByChatId.values()) {
        messagesByChatId.delete(message.id);
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
    remove,
    removeByChatId,
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

  function remove(chatId: string) {
    baseSignal.mutate((lut) => {
      lut.delete(chatId);
    });
  }

  return {
    signal: DerivedSignal.from(baseSignal, (chats) => {
      return Array.from(chats.values());
    }),

    // Mutations
    update,
    remove,
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
  listChats: () => Promise<ListChatServerMsg>;
  newChat: (id?: string) => Promise<ChatCreatedServerMsg>;
  getMessages: (chatId: string) => Promise<GetMessagesServerMsg>;
  sendMessage: (
    chatId: string,
    message: string
  ) => Promise<MessageAddedServerMsg>;
  statelessAction: (
    prompt: string,
    tool: AiTool
  ) => Promise<StatelessRunResultServerMsg>;
  abortResponse: (chatId: string) => Promise<ErrorServerMsg>;
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
    pendingRequests: new Map(),
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

      // If the current msg carries a requestId, check to see if it's a known
      // one, and if it's still exists in our pendingRequest administration. If
      // not, it may have timed out already, or it wasn't intended for us.
      const pendingReq = msg.requestId
        ? context.pendingRequests.get(msg.requestId)
        : undefined;

      if (msg.requestId && !pendingReq) {
        console.warn(
          "Ignoring unrecognized server message (already timed out, or not for us)",
          event.data
        );
        return;
      }

      switch (msg.type) {
        case ServerAiMsgCode.ERROR:
          if (msg.requestId) {
            // Not all errors have request Ids
            pendingReq?.reject(new Error(msg.error));
          }
          break;

        case ServerAiMsgCode.STREAM_MESSAGE_COMPLETE:
          context.messages.updateMessage(msg.chatId, msg.messageId, {
            content: msg.content,
            status: AiStatus.COMPLETE,
          });
          break;

        case ServerAiMsgCode.STREAM_MESSAGE_FAILED:
          if (msg.messageId !== undefined) {
            context.messages.updateMessage(msg.chatId, msg.messageId, {
              status: AiStatus.FAILED,
            });
          }
          pendingReq?.reject(new Error(msg.error));
          break;

        case ServerAiMsgCode.STREAM_MESSAGE_ABORTED:
          if (msg.messageId !== undefined) {
            context.messages.updateMessage(msg.chatId, msg.messageId, {
              status: AiStatus.ABORTED,
            });
          }
          // TODO Alternatively we could resolve with the current message
          pendingReq?.reject(new Error("Message aborted"));
          break;

        case ServerAiMsgCode.CREATE_CHAT_OK:
          context.chats.update([msg.chat]);
          break;

        case ServerAiMsgCode.GET_MESSAGES_OK:
          context.messages.update(msg.chatId, msg.messages);
          break;

        case ServerAiMsgCode.DELETE_CHAT_OK:
          context.chats.remove(msg.chatId);
          context.messages.removeByChatId(msg.chatId);
          break;

        case ServerAiMsgCode.DELETE_MESSAGE_OK:
          context.messages.remove(msg.chatId, msg.messageId);
          break;

        case ServerAiMsgCode.CLEAR_CHAT_MESSAGES_OK:
          context.messages.removeByChatId(msg.chatId);
          break;

        case ServerAiMsgCode.LIST_CHATS_OK:
          context.chats.update(msg.chats);
          break;

        case ServerAiMsgCode.STATELESS_RUN_RESULT:
          break;
      }

      // After handling the side-effects above, we can resolve the promise
      pendingReq?.resolve(msg);
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

  function sendClientMsgWithResponse<T extends ServerAiMsg>(
    msg: DistributiveOmit<ClientAiMsg, "requestId">,
    timeout: number = DEFAULT_REQUEST_TIMEOUT
  ): Promise<T> {
    // TODO: we can probably retry or something here
    if (managedSocket.getStatus() !== "connected") {
      return Promise.reject(new Error("Not connected"));
    }

    const { promise, resolve, reject } = Promise_withResolvers<ServerAiMsg>();

    // Automatically calls reject() when signal is aborted
    const abortSignal = AbortSignal.timeout(timeout);
    abortSignal.addEventListener("abort", () => reject(abortSignal.reason), {
      once: true,
    });

    const requestId = makeRequestId();
    context.pendingRequests.set(requestId, { resolve, reject });

    sendClientMsg({ ...msg, requestId });
    return (
      (promise as Promise<T>)
        .finally(() => {
          // Always cleanup
          context.pendingRequests.delete(requestId);
        })
        // Make sure these promises don't go uncaught (in contrast to the
        // promise instance we return to the caller)
        .catch((err: Error) => {
          console.error(err.message);
          throw err;
        })
    );
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

      deleteChat: (chatId: string) => {
        return sendClientMsgWithResponse<
          ServerAiMsg & { type: ServerAiMsgCode.DELETE_CHAT_OK }
        >({
          type: ClientAiMsgCode.DELETE_CHAT,
          chatId,
        });
      },

      getMessages: (chatId: string) => {
        return sendClientMsgWithResponse<
          ServerAiMsg & { type: ServerAiMsgCode.GET_MESSAGES_OK }
        >({
          type: ClientAiMsgCode.GET_MESSAGES,
          chatId,
        });
      },

      clearChat: (chatId: string) => {
        return sendClientMsgWithResponse({
          type: ClientAiMsgCode.CLEAR_CHAT_MESSAGES,
          chatId,
        });
      },

      deleteMessage: (chatId: string, messageId: string) => {
        return sendClientMsgWithResponse({
          type: ClientAiMsgCode.DELETE_MESSAGE,
          chatId,
          messageId,
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
            toolChoice: {
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

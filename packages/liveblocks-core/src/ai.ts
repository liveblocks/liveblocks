/* eslint-disable rulesdir/console-must-be-fancy */
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
  AiTextContent,
  AiTool,
  AttachUserMessageResponse,
  ChatId,
  ClientAiMsg,
  CmdId,
  CreateChatResponse,
  Cursor,
  ErrorServerEvent,
  GenerateAnswerResponse,
  GetChatsResponse,
  GetMessagesResponse,
  ISODateString,
  MessageId,
  ServerAiMsg,
  StreamMessageCompleteServerEvent,
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
    CmdId,
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

  function update(chatId: ChatId, messages: AiChatMessage[]): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.getOrCreate(chatId);
      for (const message of messages) {
        messagesByChatId.set(message.id, message);
      }
    });
  }

  function remove(chatId: ChatId, messageId: MessageId): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.get(chatId);
      messagesByChatId?.delete(messageId);
    });
  }

  function removeByChatId(chatId: ChatId): void {
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
    chatId: ChatId,
    messageId: MessageId,
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

  function addMessage(chatId: ChatId, message: AiChatMessage): void {
    baseSignal.mutate((lut) => {
      const messagesByChatId = lut.get(chatId);
      if (!messagesByChatId) {
        return;
      }
      messagesByChatId.set(message.id, message);
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
    addMessage,
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

  function remove(chatId: ChatId) {
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

export type Ai = {
  [kInternal]: {
    debugContext: () => AiContext;
  };
  connect: () => void;
  reconnect: () => void;
  disconnect: () => void;
  getStatus: () => Status;
  listChats: (options?: { cursor?: Cursor }) => Promise<GetChatsResponse>;
  newChat: (
    name: string,
    metadata?: AiChat["metadata"]
  ) => Promise<CreateChatResponse>;
  getMessages: (
    chatId: ChatId,
    options?: {
      cursor?: Cursor;
    }
  ) => Promise<GetMessagesResponse>;
  attachUserMessage: (
    chatId: ChatId,
    parentMessageId: MessageId | null,
    message: string
  ) => Promise<AttachUserMessageResponse>;
  streamAnswer: (
    chatId: ChatId,
    messageId: MessageId
  ) => Promise<StreamMessageCompleteServerEvent>;
  generateAnswer: (
    chatId: ChatId,
    messageId: MessageId
  ) => Promise<GenerateAnswerResponse>;
  // TODO: make statelessAction a convenience wrapper around generateAnswer, or maybe just delete it
  statelessAction: (
    prompt: string,
    tool: AiTool
  ) => Promise<GenerateAnswerResponse>;
  abortResponse: (chatId: ChatId) => Promise<ErrorServerEvent>;
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
    window.console.info(
      "Incoming message in handleServerMessage: ",
      event.data
    );
    if (typeof event.data === "string") {
      const msg = tryParseJson(event.data) as ServerAiMsg;

      // If the current msg carries a requestId, check to see if it's a known
      // one, and if it's still exists in our pendingRequest administration. If
      // not, it may have timed out already, or it wasn't intended for us.
      const cmdId =
        "cmdId" in msg
          ? msg.cmdId
          : msg.event === "cmd-failed"
            ? msg.failedCmdId
            : undefined;
      const pendingReq = context.pendingRequests.get(cmdId!); // eslint-disable-line no-restricted-syntax

      if (cmdId && !pendingReq) {
        console.warn(
          "Ignoring unrecognized server message (already timed out, or not for us)",
          event.data
        );
        return;
      }

      if ("event" in msg) {
        switch (msg.event) {
          case "cmd-failed":
            pendingReq?.reject(new Error(msg.error));
            break;

          case "error":
            // TODO Handle generic server error
            break;

          // XXX Remove these cryptic "type" codes in the next pass!
          case 1003: // STREAM_MESSAGE_COMPLETE
            if (msg.messageId !== undefined && msg.chatId !== undefined) {
              context.messages.updateMessage(msg.chatId, msg.messageId, {
                content: msg.content,
                status: "complete",
              });
            }
            break;

          case 1004: // STREAM_MESSAGE_FAILED
            if (msg.messageId !== undefined && msg.chatId !== undefined) {
              context.messages.updateMessage(msg.chatId, msg.messageId, {
                status: "failed",
              });
            }
            pendingReq?.reject(new Error(msg.error));
            break;

          case 1005: // STREAM_MESSAGE_ABORTED
            if (msg.messageId !== undefined && msg.chatId !== undefined) {
              context.messages.updateMessage(msg.chatId, msg.messageId, {
                status: "aborted",
              });
            }
            // TODO Alternatively we could resolve with the current message
            pendingReq?.reject(new Error("Message aborted"));
            break;

          case 1002: // STREAM_MESSAGE_PART
            // TODO Not implemented yet!
            break;

          default:
            return assertNever(msg, "Unhandled case");
        }
      } else {
        switch (msg.cmd) {
          case "get-chats":
            context.chats.update(msg.chats);
            break;

          case "create-chat":
            context.chats.update([msg.chat]);
            break;

          case "delete-chat":
            context.chats.remove(msg.chatId);
            context.messages.removeByChatId(msg.chatId);
            break;

          case "get-messages":
            context.messages.update(msg.chatId, msg.messages);
            break;

          case "delete-message":
            context.messages.remove(msg.chatId, msg.messageId);
            break;

          case "clear-chat":
            context.messages.removeByChatId(msg.chatId);
            break;

          case "generate-answer":
            if (msg.messageId !== undefined && msg.chatId !== undefined) {
              // @nimesh - This is subject to change - I wired it up without much thinking for demo purpose.
              context.messages.addMessage(msg.chatId, {
                id: msg.messageId,
                role: "assistant",
                content: msg.content,
                status: "complete",
                createdAt: new Date().toISOString() as ISODateString, // TODO: Should we use server date here?
              });
            }
            break;

          case "attach-user-message":
          case "stream-answer":
            // TODO Not handled yet
            break;

          default:
            return assertNever(msg, "Unhandled case");
        }
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

  async function sendClientMsgWithResponse<T extends ServerAiMsg>(
    msg: DistributiveOmit<ClientAiMsg, "cmdId">,
    timeout: number = DEFAULT_REQUEST_TIMEOUT
  ): Promise<T> {
    if (managedSocket.getStatus() !== "connected") {
      await managedSocket.events.didConnect.waitUntil();
    }

    const { promise, resolve, reject } = Promise_withResolvers<ServerAiMsg>();

    // Automatically calls reject() when signal is aborted
    const abortSignal = AbortSignal.timeout(timeout);
    abortSignal.addEventListener("abort", () => reject(abortSignal.reason), {
      once: true,
    });

    const cmdId = nanoid() as CmdId;
    context.pendingRequests.set(cmdId, { resolve, reject });

    sendClientMsg({ ...msg, cmdId });
    return (
      (promise as Promise<T>)
        .finally(() => {
          // Always cleanup
          context.pendingRequests.delete(cmdId);
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

  function listChats(options: { cursor?: Cursor } = {}) {
    return sendClientMsgWithResponse<GetChatsResponse>({
      cmd: "get-chats",
      cursor: options.cursor,
      pageSize: 2, // TODO: Set a more sensible default page size
    });
  }

  function getMessages(chatId: ChatId, options: { cursor?: Cursor } = {}) {
    return sendClientMsgWithResponse<GetMessagesResponse>({
      cmd: "get-messages",
      chatId,
      cursor: options.cursor,
    });
  }

  return Object.defineProperty(
    {
      [kInternal]: {
        debugContext: () => context,
      },

      connect: () => managedSocket.connect(),
      reconnect: () => managedSocket.reconnect(),
      disconnect: () => managedSocket.disconnect(),

      listChats,

      newChat: (name: string, metadata?: AiChat["metadata"]) => {
        const id = `ch_${nanoid()}` as ChatId;
        return sendClientMsgWithResponse({
          cmd: "create-chat",
          id,
          name,
          metadata: metadata ?? {},
        });
      },

      deleteChat: (chatId: ChatId) => {
        return sendClientMsgWithResponse({
          cmd: "delete-chat",
          chatId,
        });
      },

      getMessages,

      clearChat: (chatId: ChatId) => {
        return sendClientMsgWithResponse({
          cmd: "clear-chat",
          chatId,
        });
      },

      deleteMessage: (chatId: ChatId, messageId: MessageId) => {
        return sendClientMsgWithResponse({
          cmd: "delete-message",
          chatId,
          messageId,
        });
      },

      attachUserMessage: (
        chatId: ChatId,
        parentMessageId: MessageId | null,
        message: string
      ) => {
        const content: AiTextContent = {
          type: "text",
          text: message,
        };

        // @nimesh - This is subject to change - I wired it up without much thinking for demo purpose.
        context.messages.addMessage(chatId, {
          id: nanoid() as MessageId,
          role: "user",
          content: [content],
          status: "complete",
          createdAt: new Date().toISOString() as ISODateString,
        });

        return sendClientMsgWithResponse(
          {
            cmd: "attach-user-message",
            chatId,
            parentMessageId,
            content,
          },
          60_000 // todo: not sure if we even want to leave a promise hanging here. some requests can be pretty long, although we do need to have some bounds
        );
      },

      streamAnswer: (chatId: ChatId, messageId: MessageId) => {
        return sendClientMsgWithResponse({
          cmd: "stream-answer",
          inputSource: { chatId, messageId },
        });
      },

      generateAnswer: (chatId: ChatId, messageId: MessageId) => {
        return sendClientMsgWithResponse({
          cmd: "generate-answer",
          inputSource: { chatId, messageId },
        });
      },

      statelessAction: (prompt: string, tool: AiTool) => {
        return sendClientMsgWithResponse(
          {
            cmd: "generate-answer",
            inputSource: { prompt },
            tools: [tool],
            toolChoice: {
              type: "tool",
              toolName: tool.name,
            },
          },
          60_000
        );
      },

      abortResponse: (chatId: ChatId) => {
        return sendClientMsgWithResponse({
          cmd: "abort-something",
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

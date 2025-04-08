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
import {
  DerivedSignal,
  type ISignal,
  MutableSignal,
  Signal,
} from "./lib/signals";
import { type DistributiveOmit, tryParseJson } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type {
  DynamicSessionInfo,
  Polyfills,
  StaticSessionInfo,
  TimeoutID,
} from "./room";
import type {
  AbortAiResponse,
  AiAssistantContent,
  AiChat,
  AiChatMessage,
  AiInputSource,
  AiPlaceholderChatMessage,
  AiTextContent,
  AiTool,
  AskAiResponse,
  AttachUserMessageResponse,
  ChatId,
  ClearChatResponse,
  ClientAiMsg,
  CmdId,
  CopilotContext,
  CopilotId,
  CreateChatResponse,
  Cursor,
  DeleteChatResponse,
  DeleteMessageResponse,
  GetChatsResponse,
  GetMessagesResponse,
  ISODateString,
  MessageId,
  PlaceholderId,
  ServerAiMsg,
} from "./types/ai";
import type {
  IWebSocket,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
import { PKG_VERSION } from "./version";

// Server must respond to any command within 4 seconds. Note that this timeout
// isn't related to the timeout for long-running AI tasks. If a long-running AI
// task is started, the initial command response from the server is "okay, I'll
// keep you posted about this long-running task". That okay is the response
// which must happen within 4 seconds. In practice it should only take a few
// milliseconds at most.
const DEFAULT_REQUEST_TIMEOUT = 4_000;
const DEFAULT_AI_TIMEOUT = 30_000;

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
  placeholders: ReturnType<typeof createStore_forPlaceholders>;
  contextByChatId: Map<ChatId, Map<string, CopilotContext>>;
};

export type AskAiOptions = {
  copilotId?: CopilotId;
  stream?: boolean; // True by default
  tools?: AiTool[];
  // toolChoice?: ToolChoice;  // XXX Expose this? What's this compared to tools?
  timeout?: number;
};

function createStore_forChatMessages() {
  const baseSignal = new MutableSignal(
    new DefaultMap<
      ChatId,
      Map<MessageId, AiChatMessage | AiPlaceholderChatMessage>
    >(() => new Map())
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
  function patchMessage(
    chatId: ChatId,
    messageId: MessageId,
    patch: Partial<AiChatMessage>
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
        ...patch,
      } as AiChatMessage);
    });
  }

  function addMessage(
    chatId: ChatId,
    message: AiChatMessage | AiPlaceholderChatMessage
  ): void {
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
    patchMessage,
    addMessage,
    update,
    remove,
    removeByChatId,
  };
}

// XXX Put this type elsewhere when we're happy with it
export type Placeholder = {
  id: PlaceholderId;
  status: "thinking" | "streaming" | "completed" | "failed";
  contentSoFar: AiAssistantContent[];
  errorReason?: string;
};

function createStore_forPlaceholders() {
  const baseSignal = new MutableSignal(
    new DefaultMap<PlaceholderId, Placeholder>((id) => ({
      id,
      status: "thinking",
      contentSoFar: [],
    }))
  );

  function create(): PlaceholderId {
    const placeholderId = `ph_${nanoid()}` as PlaceholderId;
    baseSignal.mutate((lut) => {
      lut.getOrCreate(placeholderId);
    });
    return placeholderId;
  }

  function addChunk(
    placeholderId: PlaceholderId,
    // XXX Currently, we're only replacing the "contents so far" completely on
    // every update message. However, we could only send the delta and let the
    // client append things locally if we want to optimize this later.
    contentSoFar: AiAssistantContent[]
  ): void {
    baseSignal.mutate((lut) => {
      const placeholder = lut.get(placeholderId);
      if (!placeholder) {
        return false; // No update needed
      } else {
        placeholder.status = "streaming";
        placeholder.contentSoFar = contentSoFar;
        return true;
      }
    });
  }

  function settle(
    placeholderId: PlaceholderId,
    result:
      | { status: "completed"; content: AiAssistantContent[] }
      | { status: "failed"; reason: string }
  ): void {
    baseSignal.mutate((lut) => {
      const placeholder = lut.get(placeholderId);
      if (!placeholder) {
        return false; // No update needed
      } else {
        placeholder.status = result.status;
        if (result.status === "failed") {
          placeholder.errorReason = result.reason;
        } else {
          placeholder.contentSoFar = result.content;
        }
        return true;
      }
    });
  }

  function markAllLost(): void {
    baseSignal.mutate((lut) => {
      for (const placeholder of lut.values()) {
        placeholder.status = "failed";
        placeholder.errorReason = "Error: Lost connection.";
      }
      return true;
    });
  }

  return {
    placeholdersById: DerivedSignal.from(
      baseSignal,
      (lut) => new Map(lut.entries()) as ReadonlyMap<PlaceholderId, Placeholder>
    ).asReadonly(),
    createOptimistically: create,
    addChunk,
    settle,
    markAllLost,
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
  getChats: (options?: { cursor?: Cursor }) => Promise<GetChatsResponse>;
  createChat: (
    name: string,
    metadata?: AiChat["metadata"]
  ) => Promise<CreateChatResponse>;
  deleteChat: (chatId: ChatId) => Promise<DeleteChatResponse>;
  getMessages: (
    chatId: ChatId,
    options?: {
      cursor?: Cursor;
    }
  ) => Promise<GetMessagesResponse>;
  deleteMessage: (
    chatId: ChatId,
    messageId: MessageId
  ) => Promise<DeleteMessageResponse>;
  clearChat: (chatId: ChatId) => Promise<ClearChatResponse>;
  attachUserMessage: (
    chatId: ChatId,
    parentMessageId: MessageId | null,
    message: string
  ) => Promise<AttachUserMessageResponse>;
  ask: {
    (
      chatId: ChatId,
      messageId: MessageId,
      options?: AskAiOptions
    ): Promise<AskAiResponse>;
    (prompt: string, options?: AskAiOptions): Promise<AskAiResponse>;
  };
  abort: (placeholderId: PlaceholderId) => Promise<AbortAiResponse>;
  // TODO: make statelessAction a convenience wrapper around generateAnswer, or maybe just delete it
  statelessAction: (prompt: string, tool: AiTool) => Promise<AskAiResponse>;
  signals: {
    chats: DerivedSignal<AiChat[]>;
    messages: DerivedSignal<
      Record<string, (AiChatMessage | AiPlaceholderChatMessage)[]>
    >;
    placeholders: ISignal<ReadonlyMap<PlaceholderId, Placeholder>>;
  };
  registerChatContext: (
    chatId: ChatId,
    contextKey: string,
    data: CopilotContext
  ) => void;
  unregisterChatContext: (chatId: ChatId, contextKey: string) => void;
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
    placeholders: createStore_forPlaceholders(),
    contextByChatId: new Map<ChatId, Map<string, CopilotContext>>(),
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
    typeof event.data === "string" &&
      window.console.log(tryParseJson(event.data));
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

          case "update-placeholder": {
            const { placeholderId, contentSoFar } = msg;
            context.placeholders.addChunk(placeholderId, contentSoFar);
            break;
          }

          case "settle-placeholder": {
            const { placeholderId, result } = msg;
            context.placeholders.settle(placeholderId, result);
            break;
          }

          case "error":
            // TODO Handle generic server error
            break;

          case "rebooted":
            context.placeholders.markAllLost();
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

          case "ask-ai":
            if (msg.messageId !== undefined) {
              // @nimesh - This is subject to change - I wired it up without much thinking for demo purpose.
              context.messages.addMessage(msg.chatId, {
                id: msg.messageId,
                role: "assistant",
                // XXX Remove content here in favor of detecting it's a placeholder message
                content: [
                  {
                    type: "text",
                    text: "Asking AI, please be patient...",
                  },
                ],
                createdAt: new Date().toISOString() as ISODateString, // TODO: Should we use server date here?
              });
            } else {
              // XXX Handle the case for one-off ask!
              // We can still render a pending container _somewhere_, but in this case we know it's not going to be associated to a chat message
            }
            break;

          case "attach-user-message":
          case "abort-ai":
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
    msg: DistributiveOmit<ClientAiMsg, "cmdId">
  ): Promise<T> {
    if (managedSocket.getStatus() !== "connected") {
      await managedSocket.events.didConnect.waitUntil();
    }

    const { promise, resolve, reject } = Promise_withResolvers<ServerAiMsg>();

    // Automatically calls reject() when signal is aborted
    const abortSignal = AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT);
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

  function getChats(options: { cursor?: Cursor } = {}) {
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

  function registerChatContext(
    chatId: ChatId,
    contextKey: string,
    data: CopilotContext
  ) {
    const chatContext = context.contextByChatId.get(chatId);
    if (chatContext === undefined) {
      context.contextByChatId.set(chatId, new Map([[contextKey, data]]));
    } else {
      chatContext.set(contextKey, data);
    }
  }

  function unregisterChatContext(chatId: ChatId, contextKey: string) {
    const chatContext = context.contextByChatId.get(chatId);
    if (chatContext) {
      chatContext.delete(contextKey);
      if (chatContext.size === 0) {
        context.contextByChatId.delete(chatId);
      }
    }
  }

  return Object.defineProperty(
    {
      [kInternal]: {
        debugContext: () => context,
      },

      connect: () => managedSocket.connect(),
      reconnect: () => managedSocket.reconnect(),
      disconnect: () => managedSocket.disconnect(),

      getChats,
      createChat: (name: string, metadata?: AiChat["metadata"]) => {
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

      deleteMessage: (chatId: ChatId, messageId: MessageId) =>
        sendClientMsgWithResponse({ cmd: "delete-message", chatId, messageId }),
      clearChat: (chatId: ChatId) =>
        sendClientMsgWithResponse({ cmd: "clear-chat", chatId }),

      attachUserMessage: (
        chatId: ChatId,
        parentMessageId: MessageId | null,
        message: string
      ) => {
        const content: AiTextContent = {
          type: "text",
          text: message,
        };
        const messageId = `ms_${nanoid()}` as MessageId;

        // @nimesh - This is subject to change - I wired it up without much thinking for demo purpose.
        context.messages.addMessage(chatId, {
          id: messageId,
          role: "user",
          content: [content],
          createdAt: new Date().toISOString() as ISODateString,
        });

        return sendClientMsgWithResponse({
          cmd: "attach-user-message",
          id: messageId,
          chatId,
          parentMessageId,
          content,
        });
      },

      ask: (
        one: string,
        two?: MessageId | AskAiOptions,
        three?: AskAiOptions
      ): Promise<AskAiResponse> => {
        const inputSource: AiInputSource =
          typeof two === "string"
            ? { chatId: one as ChatId, messageId: two }
            : { prompt: one };
        const options = typeof two === "string" ? three : two;

        const stream = options?.stream ?? false;
        const placeholderId = context.placeholders.createOptimistically();
        if (inputSource.messageId) {
          const outputMessageId = `ms_${nanoid()}` as MessageId;

          // @nimesh - This is subject to change - I wired it up without much thinking for demo purpose.
          context.messages.addMessage(inputSource.chatId, {
            id: outputMessageId,
            role: "assistant",
            placeholderId,
            createdAt: new Date().toISOString() as ISODateString,
          });

          const chatContext = context.contextByChatId.get(inputSource.chatId);
          return sendClientMsgWithResponse({
            cmd: "ask-ai",
            inputSource,
            placeholderId,
            outputMessageId,
            copilotId: options?.copilotId,
            stream,
            tools: options?.tools,
            timeout: options?.timeout ?? DEFAULT_AI_TIMEOUT, // Allow the job to run for at most 30 seconds in the backend
            context: chatContext ? Array.from(chatContext.values()) : undefined,
          });
        } else {
          return sendClientMsgWithResponse({
            cmd: "ask-ai",
            inputSource,
            placeholderId,
            outputMessageId: undefined,
            copilotId: options?.copilotId,
            stream,
            tools: options?.tools,
            timeout: options?.timeout ?? DEFAULT_AI_TIMEOUT, // Allow the job to run for at most 30 seconds in the backend
          });
        }
      },

      statelessAction: (
        prompt: string,
        tool: AiTool,
        // XXX Should this options param be shared with AskAiOptions?
        options?: { timeout: number }
      ) => {
        return sendClientMsgWithResponse({
          cmd: "ask-ai",
          inputSource: { prompt },
          placeholderId: `ph_${nanoid()}` as PlaceholderId,
          stream: false,
          tools: [tool],
          toolChoice: {
            type: "tool",
            toolName: tool.name,
          },
          timeout: options?.timeout ?? DEFAULT_AI_TIMEOUT, // Allow the job to run for at most 30 seconds in the backend
        });
      },

      abort: (placeholderId: PlaceholderId) =>
        sendClientMsgWithResponse({ cmd: "abort-ai", placeholderId }),

      getStatus: () => managedSocket.getStatus(),

      signals: {
        chats: context.chats.signal,
        messages: context.messages.sortedMessages,
        placeholders: context.placeholders.placeholdersById,
      },

      registerChatContext,
      unregisterChatContext,
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

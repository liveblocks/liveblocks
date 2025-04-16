/* eslint-disable rulesdir/console-must-be-fancy */
import type { JSONSchema4 } from "json-schema";
import type { ComponentType } from "react";

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
import { batch, DerivedSignal, MutableSignal, Signal } from "./lib/signals";
import { SortedList } from "./lib/SortedList";
import type { DistributiveOmit } from "./lib/utils";
import { tryParseJson } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type {
  DynamicSessionInfo,
  Polyfills,
  StaticSessionInfo,
  TimeoutID,
} from "./room";
import type {
  AbortAiResponse,
  AddUserMessageResponse,
  AiAssistantContentPart,
  AiAssistantDeltaUpdate,
  AiChat,
  AiChatMessage,
  AiFailedAssistantMessage,
  AiPendingAssistantMessage,
  AiToolDefinition,
  AiUserContentPart,
  AiUserMessage,
  AskAiResponse,
  ChatId,
  ClearChatResponse,
  ClientAiMsg,
  ClientId,
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
  ServerAiMsg,
} from "./types/ai";
import { appendDelta } from "./types/ai";
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

// TODO What is a good default timeout for long running tasks has not been
// settled yet. Maybe we need to make this much larger?
const DEFAULT_AI_TIMEOUT = 30_000; // Allow AI jobs to run for at most 30 seconds in the backend

/**
 * A lookup table (LUT) for all the user AI chats.
 */
type AiChatsLUT = Map<string, AiChat>;

// XXX - Find a better name for this?
export type ClientToolDefinition =
  | {
      description?: string;
      parameters: JSONSchema4;
      execute: (params: any) => void; // XXX - We should allow the execute callback to return a Promise too
      render?: never;
    }
  | {
      description?: string;
      parameters: JSONSchema4;
      render: ComponentType<any>;
      execute?: never;
    };

type AiContext = {
  staticSessionInfoSig: Signal<StaticSessionInfo | null>;
  dynamicSessionInfoSig: Signal<DynamicSessionInfo | null>;
  pendingCmds: Map<
    CmdId,
    {
      resolve: (value: ServerAiMsg) => void;
      reject: (reason: unknown) => void;
    }
  >;
  chatsStore: ReturnType<typeof createStore_forUserAiChats>;
  messagesStore: ReturnType<typeof createStore_forChatMessages>;
  contextByChatId: Map<ChatId, Map<string, CopilotContext>>;
  toolsByChatId: Map<ChatId, Map<string, ClientToolDefinition>>;
};

export type AskAiOptions = {
  copilotId?: CopilotId;
  stream?: boolean; // True by default
  // toolChoice?: ToolChoice;  // XXX Expose this? What's this compared to tools?
  timeout?: number;
};

function now(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

function createStore_forChatMessages() {
  //
  // We keep track of a signal per chat ID. Any time a new message arrives, we
  // check its chat ID, getOrCreate its signal, and then add the message that
  // signal's sorted list. This way, only the messages list for the relevant
  // chat will get updated.
  //
  const signalsByChatId = new DefaultMap(
    (_chatId: ChatId) =>
      new MutableSignal(
        SortedList.fromAlreadySorted<AiChatMessage>(
          [],
          (x, y) => x.createdAt < y.createdAt
        )
      )
  );

  //
  // Separately from that, we keep track of a signal that contains all the
  // contentsSoFar for any pending messages, which we assemble from the
  // incoming deltas.
  //
  const pendingContent = new MutableSignal(
    new Map<MessageId, AiAssistantContentPart[]>()
  );

  function createOptimistically(
    chatId: ChatId,
    role: "user",
    content: AiUserContentPart[]
  ): MessageId;
  function createOptimistically(chatId: ChatId, role: "assistant"): MessageId;
  function createOptimistically(
    chatId: ChatId,
    role: "user" | "assistant",
    third?: AiUserContentPart[]
  ) {
    const id = `ms_${nanoid()}` as MessageId;
    const createdAt = now();
    if (role === "user") {
      const content = third!; // eslint-disable-line
      upsert({ id, chatId, role, createdAt, content } satisfies AiUserMessage);
    } else {
      upsert({
        id,
        chatId,
        role,
        createdAt,
        status: "pending",
        contentSoFar: [],
      } satisfies AiPendingAssistantMessage);
    }
    return id;
  }

  function upsertMany(messages: AiChatMessage[]): void {
    batch(() => {
      for (const message of messages) {
        upsert(message);
      }
    });
  }

  function remove(chatId: ChatId, messageId: MessageId): void {
    const sig = signalsByChatId.getOrCreate(chatId);
    sig.mutate((list) => {
      list.removeBy((m) => m.id === messageId, 1);
    });
  }

  function removeByChatId(chatId: ChatId): void {
    const sig = signalsByChatId.getOrCreate(chatId);
    sig.mutate((list) => {
      list.clear();
    });
  }

  function upsert(message: AiChatMessage): void {
    batch(() => {
      const sig = signalsByChatId.getOrCreate(message.chatId);
      sig.mutate((list) => {
        list.removeBy((m) => m.id === message.id, 1);
        list.add(message);
      });

      // If the message is a pending update, write it to the pendingContents
      // LUT. If not, remove it from there.
      if (message.role === "assistant" && message.status === "pending") {
        pendingContent.mutate((lut) => {
          lut.set(message.id, structuredClone(message.contentSoFar));
        });
      } else {
        pendingContent.mutate((lut) => {
          lut.delete(message.id);
        });
      }
    });
  }

  function addDelta(messageId: MessageId, delta: AiAssistantDeltaUpdate): void {
    pendingContent.mutate((lut) => {
      const contentSoFar = lut.get(messageId);
      if (contentSoFar === undefined) return false;

      appendDelta(contentSoFar, delta);
      lut.set(messageId, structuredClone(contentSoFar));
      return true;
    });
  }

  function* iterPendingMessages() {
    for (const messagesSig of signalsByChatId.values()) {
      for (const message of messagesSig.get()) {
        if (message.role === "assistant" && message.status === "pending") {
          yield message;
        }
      }
    }
  }

  function failAllPending(): void {
    batch(() => {
      pendingContent.mutate((lut) => lut.clear());

      const pendingMessages = Array.from(iterPendingMessages());
      upsertMany(
        pendingMessages.map(
          (message) =>
            ({
              ...message,
              status: "failed",
              errorReason: "Lost connection",
            }) as AiFailedAssistantMessage
        )
      );
    });
  }

  function getMessageById(messageId: MessageId): AiChatMessage | undefined {
    for (const messages of signalsByChatId.values()) {
      const message = messages.get().find((m) => m.id === messageId);
      if (message) {
        return message;
      }
    }
    return undefined;
  }

  function getMessagesSignalByChatId(chatId: ChatId) {
    return signalsByChatId.getOrCreate(chatId);
  }

  return {
    // Readers
    getMessageById,
    getMessagesSignalByChatId,
    pendingContent: DerivedSignal.from(pendingContent, (mutlut) =>
      // Build a full copy of the mutable LUT, so we get a new reference every
      // time, which plays better with React
      Object.fromEntries(structuredClone(mutlut))
    ),

    // Mutations
    createOptimistically,
    upsert,
    upsertMany,
    remove,
    removeByChatId,
    addDelta,
    failAllPending,
  };
}

function createStore_forUserAiChats() {
  const baseSignal = new MutableSignal(new Map() as AiChatsLUT);
  const signal = DerivedSignal.from(baseSignal, (chats) => {
    return Array.from(chats.values());
  });

  function upsertMany(chats: AiChat[]) {
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
    signal,

    // Mutations
    upsertMany,
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
  addUserMessage: (
    chatId: ChatId,
    parentMessageId: MessageId | null,
    message: string
  ) => Promise<AddUserMessageResponse>;
  ask: (
    chatId: ChatId,
    messageId: MessageId,
    options?: AskAiOptions
  ) => Promise<AskAiResponse>;
  abort: (messageId: MessageId) => Promise<AbortAiResponse>;
  signals: {
    chats: DerivedSignal<AiChat[]>;
    getMessagesSignalByChatId(
      chatId: ChatId
    ): MutableSignal<SortedList<AiChatMessage>>;
    pendingContent: DerivedSignal<Record<MessageId, AiAssistantContentPart[]>>;
  };
  registerChatContext: (
    chatId: ChatId,
    contextKey: string,
    data: CopilotContext
  ) => void;
  unregisterChatContext: (chatId: ChatId, contextKey: string) => void;

  registerChatTool: (
    chatId: ChatId,
    toolName: string,
    tool: ClientToolDefinition
  ) => void;
  unregisterChatTool: (chatId: ChatId, toolName: string) => void;

  getToolCallDefinition(
    chatId: string,
    toolName: string
  ): ClientToolDefinition | undefined;
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
  const clientId = nanoid(7) as ClientId;

  const chatsStore = createStore_forUserAiChats();
  const messagesStore = createStore_forChatMessages();
  const context: AiContext = {
    staticSessionInfoSig: new Signal<StaticSessionInfo | null>(null),
    dynamicSessionInfoSig: new Signal<DynamicSessionInfo | null>(null),
    pendingCmds: new Map(),
    chatsStore,
    messagesStore,
    contextByChatId: new Map<ChatId, Map<string, CopilotContext>>(),
    toolsByChatId: new Map<ChatId, Map<string, ClientToolDefinition>>(),
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
    if (typeof event.data !== "string")
      // Ignore binary (non-string) WebSocket messages
      return;

    const msg = tryParseJson(event.data) as ServerAiMsg | undefined;
    if (!msg)
      // Ignore non-JSON messages
      return;

    // If the current msg carries a cmdId, check to see if it's a known one,
    // and if it's still exists in our pendingRequest administration. If not,
    // it may have timed out already, or it wasn't intended for us.
    const cmdId =
      "cmdId" in msg
        ? msg.cmdId
        : msg.event === "cmd-failed"
          ? msg.failedCmdId
          : undefined;
    const pendingCmd = context.pendingCmds.get(cmdId!); // eslint-disable-line no-restricted-syntax

    if (cmdId && !pendingCmd) {
      console.warn("Ignoring unexpected command response. Already timed out, or not for us?", msg); // prettier-ignore
      return;
    }

    // XXX Remove
    window.console.info("[ws]", msg);

    if ("event" in msg) {
      switch (msg.event) {
        case "cmd-failed":
          pendingCmd?.reject(new Error(msg.error));
          break;

        case "delta": {
          const { id, delta } = msg;
          const chatId = context.messagesStore.getMessageById(id)?.chatId;
          if (
            delta.type === "tool-call" &&
            msg.clientId === clientId &&
            chatId !== undefined
          ) {
            const tool = context.toolsByChatId.get(chatId)?.get(delta.toolName);
            if (tool !== undefined && tool.execute !== undefined) {
              tool.execute(delta.args);
            }
          }
          context.messagesStore.addDelta(id, delta);
          break;
        }

        case "settle": {
          context.messagesStore.upsert(msg.message);
          break;
        }

        case "error":
          // TODO Handle generic server error
          break;

        case "rebooted":
          context.messagesStore.failAllPending();
          break;

        default:
          return assertNever(msg, "Unhandled case");
      }
    } else {
      switch (msg.cmd) {
        case "get-chats":
          context.chatsStore.upsertMany(msg.chats);
          break;

        case "create-chat":
          context.chatsStore.upsertMany([msg.chat]);
          break;

        case "delete-chat":
          context.chatsStore.remove(msg.chatId);
          context.messagesStore.removeByChatId(msg.chatId);
          break;

        case "get-messages":
          context.messagesStore.upsertMany(msg.messages);
          break;

        case "add-user-message":
          context.messagesStore.upsert(msg.message);
          break;

        case "delete-message":
          context.messagesStore.remove(msg.chatId, msg.messageId);
          break;

        case "clear-chat":
          context.messagesStore.removeByChatId(msg.chatId);
          break;

        case "ask-ai":
          if (msg.message) {
            context.messagesStore.upsert(msg.message);
          } else {
            // XXX Handle the case for one-off ask!
            // We can still render a pending container _somewhere_, but in this case we know it's not going to be associated to a chat message
          }
          break;

        case "abort-ai":
          // TODO Not handled yet
          break;

        default:
          return assertNever(msg, "Unhandled case");
      }
    }

    // After handling the side-effects above, we can resolve the promise
    pendingCmd?.resolve(msg);
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

    const cmdId = nanoid(7) as CmdId;
    context.pendingCmds.set(cmdId, { resolve, reject });

    sendClientMsg({ ...msg, cmdId });
    return (
      (promise as Promise<T>)
        .finally(() => {
          // Always cleanup
          context.pendingCmds.delete(cmdId);
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

  function registerChatTool(
    chatId: ChatId,
    toolName: string,
    tool: ClientToolDefinition
  ) {
    const chatTools = context.toolsByChatId.get(chatId);
    if (chatTools === undefined) {
      context.toolsByChatId.set(chatId, new Map([[toolName, tool]]));
    } else {
      chatTools.set(toolName, tool);
    }
  }

  function unregisterChatTool(chatId: ChatId, toolName: string) {
    const chatTools = context.toolsByChatId.get(chatId);
    if (chatTools) {
      chatTools.delete(toolName);
      if (chatTools.size === 0) {
        context.toolsByChatId.delete(chatId);
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

      addUserMessage: (
        chatId: ChatId,
        parentMessageId: MessageId | null,
        message: string
      ) => {
        const content: AiUserContentPart[] = [{ type: "text", text: message }];
        const newMessageId = context.messagesStore.createOptimistically(
          chatId,
          "user",
          content
        );
        return sendClientMsgWithResponse({
          cmd: "add-user-message",
          id: newMessageId,
          chatId,
          parentMessageId,
          content,
        });
      },

      ask: (
        chatId: ChatId,
        messageId: MessageId,
        options?: AskAiOptions
      ): Promise<AskAiResponse> => {
        const targetMessageId = context.messagesStore.createOptimistically(
          chatId,
          "assistant"
        );

        const copilotId = options?.copilotId;
        const stream = options?.stream ?? false;
        const timeout = options?.timeout ?? DEFAULT_AI_TIMEOUT;

        const chatContext = context.contextByChatId.get(chatId);
        const chatTools = context.toolsByChatId.get(chatId);
        const tools: AiToolDefinition[] | undefined = chatTools
          ? Array.from(chatTools.entries()).map(([name, tool]) => ({
              name,
              description: tool.description,
              parameters: tool.parameters,
            }))
          : undefined;

        return sendClientMsgWithResponse({
          cmd: "ask-ai",
          chatId,
          sourceMessageId: messageId,
          targetMessageId,
          copilotId,
          clientId,
          stream,
          tools,
          timeout,
          context: chatContext ? Array.from(chatContext.values()) : undefined,
        });
      },

      abort: (messageId: MessageId) =>
        sendClientMsgWithResponse({ cmd: "abort-ai", messageId }),

      getStatus: () => managedSocket.getStatus(),

      signals: {
        chats: context.chatsStore.signal,
        getMessagesSignalByChatId:
          context.messagesStore.getMessagesSignalByChatId,
        pendingContent: context.messagesStore.pendingContent,
      },

      registerChatContext,
      unregisterChatContext,

      registerChatTool,
      unregisterChatTool,

      getToolCallDefinition: (
        chatId: string,
        toolName: string
      ): ClientToolDefinition | undefined => {
        return context.toolsByChatId.get(chatId as ChatId)?.get(toolName);
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

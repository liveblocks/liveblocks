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
import { shallow, shallow2 } from "./lib/shallow";
import { batch, DerivedSignal, MutableSignal, Signal } from "./lib/signals";
import { SortedList } from "./lib/SortedList";
import { TreePool } from "./lib/TreePool";
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
  AiAssistantDeltaUpdate,
  AiAssistantMessage,
  AiChat,
  AiChatMessage,
  AiFailedAssistantMessage,
  AiPendingAssistantMessage,
  AiToolDefinition,
  AiUserContentPart,
  AiUserMessage,
  AskAiResponse,
  ChatContext,
  ClearChatResponse,
  ClientAiMsg,
  ClientId,
  CmdId,
  CopilotId,
  CreateChatResponse,
  Cursor,
  DeleteChatResponse,
  DeleteMessageResponse,
  GetChatsResponse,
  GetMessageTreeResponse,
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
      render: ComponentType<{ args: any }>;
      execute?: never;
    };

export type UiChatMessage = AiChatMessage & {
  prev: MessageId | null;
  next: MessageId | null;
};

export type UiUserChatMessage = AiUserMessage & {
  prev: MessageId | null;
  next: MessageId | null;
};

export type UiAssistantChatMessage = AiAssistantMessage & {
  prev: MessageId | null;
  next: MessageId | null;
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
  toolsStore: ReturnType<typeof createStore_forTools>;
  messagesStore: ReturnType<typeof createStore_forChatMessages>;
  contextByChatId: Map<string, Set<ChatContext>>;
  toolsByChatId: Map<string, Map<string, ClientToolDefinition>>;
};

export type GetOrCreateChatOptions = {
  name: string;
  ephemeral?: boolean;
  metadata?: AiChat["metadata"];
};

export type CreateChatOptions = {
  ephemeral?: boolean;
  metadata?: AiChat["metadata"];
};

export type AskAiOptions = {
  copilotId?: CopilotId;
  stream?: boolean; // True by default
  timeout?: number;
};

function now(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

function createStore_forTools() {
  const toolsByChatIdΣ = new DefaultMap((_chatId: string) => {
    return new DefaultMap((_toolName: string) => {
      return new Signal<ClientToolDefinition | undefined>(undefined);
    });
  });

  function getToolDefinitionΣ(chatId: string, toolName: string) {
    return toolsByChatIdΣ.getOrCreate(chatId).getOrCreate(toolName);
  }

  function addToolDefinition(
    chatId: string,
    name: string,
    definition: ClientToolDefinition
  ) {
    toolsByChatIdΣ.getOrCreate(chatId).getOrCreate(name).set(definition);
  }

  function removeToolDefinition(chatId: string, toolName: string) {
    const tools = toolsByChatIdΣ.get(chatId);
    if (tools === undefined) return;
    const tool = tools.get(toolName);
    if (tool === undefined) return;
    tool.set(undefined);
  }

  return {
    getToolCallByNameΣ: getToolDefinitionΣ,
    addToolDefinition,
    removeToolDefinition,
  };
}

function createStore_forChatMessages() {
  // We maintain a Map with mutable signals. Each such signal contains
  // a mutable automatically-sorted list of chat messages by chat ID.
  const messagePoolByChatIdΣ = new DefaultMap(
    (_chatId: string) =>
      new MutableSignal(
        new TreePool<AiChatMessage>(
          (x) => x.id,
          (x) => x.parentId,
          (x, y) => x.createdAt < y.createdAt
        )
      )
  );

  // Separately from that, we track all _pending_ signals in a separate
  // administration. Because pending messages are likely to receive
  // many/frequent updates, updating them in a separate administration makes
  // rendering streaming contents much more efficient than if we had to
  // re-create and re-render the entire chat list on every such update.
  const pendingMessagesΣ = new MutableSignal(
    new Map<MessageId, AiPendingAssistantMessage>()
  );

  function createOptimistically(
    chatId: string,
    role: "user",
    parentId: MessageId | null,
    content: AiUserContentPart[]
  ): MessageId;
  function createOptimistically(
    chatId: string,
    role: "assistant",
    parentId: MessageId | null
  ): MessageId;
  function createOptimistically(
    chatId: string,
    role: "user" | "assistant",
    parentId: MessageId | null,
    third?: AiUserContentPart[]
  ) {
    const id = `ms_${nanoid()}` as MessageId;
    const createdAt = now();
    if (role === "user") {
      const content = third!; // eslint-disable-line
      upsert({
        id,
        chatId,
        role,
        parentId,
        createdAt,
        content,
      } satisfies AiUserMessage);
    } else {
      upsert({
        id,
        chatId,
        role,
        parentId,
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

  function remove(chatId: string, messageId: MessageId): void {
    const chatMsgsΣ = messagePoolByChatIdΣ.get(chatId);
    if (!chatMsgsΣ) return;

    const existing = chatMsgsΣ.get().get(messageId);
    if (!existing || existing.deletedAt) return;

    if (
      existing.role === "assistant" &&
      (existing.status === "pending" || existing.status === "failed")
    ) {
      upsert({ ...existing, deletedAt: now(), contentSoFar: [] });
    } else {
      upsert({ ...existing, deletedAt: now(), content: [] });
    }
  }

  function removeByChatId(chatId: string): void {
    const chatMsgsΣ = messagePoolByChatIdΣ.get(chatId);
    if (chatMsgsΣ === undefined) return;
    chatMsgsΣ.mutate((pool) => pool.clear());
  }

  function upsert(message: AiChatMessage): void {
    batch(() => {
      const chatMsgsΣ = messagePoolByChatIdΣ.getOrCreate(message.chatId);
      chatMsgsΣ.mutate((pool) => pool.upsert(message));

      // If the message is a pending update, write it to the pendingContents
      // LUT. If not, remove it from there.
      if (message.role === "assistant" && message.status === "pending") {
        pendingMessagesΣ.mutate((lut) => {
          lut.set(message.id, structuredClone(message));
        });
      } else {
        pendingMessagesΣ.mutate((lut) => {
          lut.delete(message.id);
        });
      }
    });
  }

  function addDelta(messageId: MessageId, delta: AiAssistantDeltaUpdate): void {
    pendingMessagesΣ.mutate((lut) => {
      const message = lut.get(messageId);
      if (message === undefined) return false;

      appendDelta(message.contentSoFar, delta);
      lut.set(messageId, message);
      return true;
    });
  }

  function* iterPendingMessages() {
    for (const chatMsgsΣ of messagePoolByChatIdΣ.values()) {
      for (const m of chatMsgsΣ.get()) {
        if (m.role === "assistant" && m.status === "pending") {
          yield m;
        }
      }
    }
  }

  function failAllPending(): void {
    batch(() => {
      pendingMessagesΣ.mutate((lut) => lut.clear());

      upsertMany(
        Array.from(iterPendingMessages()).map(
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
    for (const messagesΣ of messagePoolByChatIdΣ.values()) {
      const message = messagesΣ.get().get(messageId);
      if (message) {
        return message;
      }
    }
    return undefined;
  }

  function first<T>(iterable: IterableIterator<T>): T | undefined {
    const result = iterable.next();
    return result.done ? undefined : result.value;
  }

  function selectBranch(
    pool: TreePool<AiChatMessage>,
    preferredBranch: MessageId | null
  ): UiChatMessage[] {
    function isAlive(message: AiChatMessage): boolean {
      // This could be generalized by doing a walk(
      //   { direction: 'down',
      //     type: 'breadth-first',
      //     includeSelf: true,
      //     predicate: m => !m.deletedAt,
      //   })

      // If it's a non-deleted message, it's alive
      if (!message.deletedAt) {
        return true;
      }
      for (const _ of pool.walkDown(message.id, (m) => !m.deletedAt)) {
        return true;
      }
      return false;
    }

    function selectSpine(leaf: AiChatMessage): UiChatMessage[] {
      const spine = [];
      for (const message of pool.walkUp(leaf.id)) {
        const prev = first(pool.walkLeft(message.id, isAlive))?.id ?? null;
        const next = first(pool.walkRight(message.id, isAlive))?.id ?? null;

        // Remove deleted messages only if they don't have any non-deleted
        // children, and also don't have a next/prev link, requiring the
        // deleted node to have an on-screen presence.
        if (!message.deletedAt || prev || next) {
          spine.push({ ...message, prev, next });
        }
      }
      return spine.reverse();
    }

    function fallback(): UiChatMessage[] {
      const latest = pool.sorted.findRight((m) => !m.deletedAt);
      return latest ? selectSpine(latest) : [];
    }

    if (preferredBranch === null) {
      return fallback();
    }

    const message = pool.get(preferredBranch);
    if (!message) {
      return fallback();
    }

    // Find the first non-deleted grand child. If one doesn't exist, keep
    // walking up the tree and repeat, until we find one.
    for (const current of pool.walkUp(message.id)) {
      // If a non-deleted grandchild exists, select it.
      for (const desc of pool.walkDown(current.id, (m) => !m.deletedAt)) {
        return selectSpine(desc);
      }

      // If the current node is not deleted, select it.
      if (!current.deletedAt) {
        return selectSpine(current);
      }

      // Otherwise, continue looping by walking up one level and repeating.
    }

    return fallback();
  }

  function getLatestUserMessageAncestor(
    chatId: string,
    messageId: MessageId
  ): MessageId | null {
    const pool = messagePoolByChatIdΣ.getOrCreate(chatId).get();
    const message = pool.get(messageId);
    if (!message) return null;

    if (message.role === "user") return message.id;

    for (const m of pool.walkUp(message.id)) {
      if (m.role === "user" && !m.deletedAt) {
        return m.id;
      }
    }
    return null;
  }

  const immutableMessagesByBranch = new DefaultMap((chatId: string) => {
    return new DefaultMap((branchId: MessageId | null) => {
      const messagesΣ = DerivedSignal.from(() => {
        const pool = messagePoolByChatIdΣ.getOrCreate(chatId).get();
        return selectBranch(pool, branchId);
      }, shallow2);

      return DerivedSignal.from((): UiChatMessage[] => {
        const pendingMessages = pendingMessagesΣ.get();
        return messagesΣ.get().map((message) => {
          if (message.role !== "assistant" || message.status !== "pending") {
            return message;
          }
          const pendingMessage = pendingMessages.get(message.id);
          if (pendingMessage === undefined) return message;
          return {
            ...message,
            contentSoFar: pendingMessage.contentSoFar,
          } satisfies AiPendingAssistantMessage;
        });
      }, shallow);
    });
  });

  function getChatMessagesForBranchΣ(chatId: string, branch?: MessageId) {
    return immutableMessagesByBranch
      .getOrCreate(chatId)
      .getOrCreate(branch || null);
  }

  const messagesByChatIdΣ = new DefaultMap((chatId: string) => {
    return DerivedSignal.from(() => {
      const pool = messagePoolByChatIdΣ.getOrCreate(chatId).get();
      return Array.from(pool.sorted);
    });
  });

  function getMessagesForChatΣ(chatId: string) {
    return messagesByChatIdΣ.getOrCreate(chatId);
  }

  return {
    // Readers
    getMessageById,
    getChatMessagesForBranchΣ,
    getMessagesForChatΣ,
    getLatestUserMessageAncestor,

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
  // The foundation is the mutable signal, which is a simple Map (easy to make
  // one-off updates to). But externally we expose a derived signal that
  // produces a new lazy "object" copy of this map any time it changes. This
  // plays better with React APIs.
  const mutableΣ = new MutableSignal(
    SortedList.with<AiChat>((x, y) => y.createdAt < x.createdAt)
  );
  const chatsΣ = DerivedSignal.from(() =>
    Array.from(mutableΣ.get()).filter((c) => !c.ephemeral && !c.deletedAt)
  );

  function upsertMany(chats: AiChat[]) {
    mutableΣ.mutate((list) => {
      for (const chat of chats) {
        remove(chat.id);
        list.add(chat);
      }
    });
  }

  function upsert(chat: AiChat) {
    upsertMany([chat]);
  }

  function remove(chatId: string) {
    mutableΣ.mutate((list) => list.removeBy((c) => c.id === chatId, 1));
  }

  return {
    chatsΣ,

    // Mutations
    upsert,
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
    chatId: string, // A unique identifier
    name: string, // A human-friendly "title"
    options?: CreateChatOptions
  ) => Promise<CreateChatResponse>;
  deleteChat: (chatId: string) => Promise<DeleteChatResponse>;
  getMessageTree: (chatId: string) => Promise<GetMessageTreeResponse>;
  deleteMessage: (
    chatId: string,
    messageId: MessageId
  ) => Promise<DeleteMessageResponse>;
  clearChat: (chatId: string) => Promise<ClearChatResponse>;
  addUserMessage: (
    chatId: string,
    parentMessageId: MessageId | null,
    message: string
  ) => Promise<AddUserMessageResponse>;
  ask: (
    chatId: string,
    messageId: MessageId,
    options?: AskAiOptions
  ) => Promise<AskAiResponse>;
  regenerateMessage: (
    chatId: string,
    messageId: MessageId,
    options?: AskAiOptions
  ) => Promise<AskAiResponse>;
  addUserMessageAndAsk: (
    chatId: string,
    parentMessageId: MessageId | null,
    message: string,
    options?: AskAiOptions
  ) => Promise<AskAiResponse>;
  abort: (messageId: MessageId) => Promise<AbortAiResponse>;
  signals: {
    chatsΣ: DerivedSignal<AiChat[]>;
    getChatMessagesForBranchΣ(
      chatId: string,
      branch?: MessageId
    ): DerivedSignal<UiChatMessage[]>;
    getMessagesForChatΣ(chatId: string): DerivedSignal<AiChatMessage[]>;
    getToolDefinitionΣ(
      chatId: string,
      toolName: string
    ): Signal<ClientToolDefinition | undefined>;
  };
  registerChatContext: (chatId: string, data: ChatContext) => () => void;
  registerChatTool: (
    chatId: string,
    name: string,
    definition: ClientToolDefinition
  ) => void;
  unregisterChatTool: (chatId: string, toolName: string) => void;

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
  const toolsStore = createStore_forTools();
  const context: AiContext = {
    staticSessionInfoSig: new Signal<StaticSessionInfo | null>(null),
    dynamicSessionInfoSig: new Signal<DynamicSessionInfo | null>(null),
    pendingCmds: new Map(),
    chatsStore,
    messagesStore,
    toolsStore,
    contextByChatId: new Map<string, Set<ChatContext>>(),
    toolsByChatId: new Map<string, Map<string, ClientToolDefinition>>(),
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

        case "sync":
          batch(() => {
            // Delete any resources?
            for (const m of msg["-messages"] ?? []) {
              context.messagesStore.remove(m.chatId, m.id);
            }
            for (const chatId of msg["-chats"] ?? []) {
              context.chatsStore.remove(chatId);
              context.messagesStore.removeByChatId(chatId);
            }
            for (const chatId of msg.clear ?? []) {
              context.messagesStore.removeByChatId(chatId);
            }

            // Add any new resources?
            if (msg.chats) {
              context.chatsStore.upsertMany(msg.chats);
            }
            if (msg.messages) {
              context.messagesStore.upsertMany(msg.messages);
            }
          });
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
          context.chatsStore.upsert(msg.chat);
          break;

        case "delete-chat":
          context.chatsStore.remove(msg.chatId);
          context.messagesStore.removeByChatId(msg.chatId);
          break;

        case "get-message-tree":
          context.chatsStore.upsert(msg.chat);
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

  function createChat(id: string, name: string, options?: CreateChatOptions) {
    return sendClientMsgWithResponse<CreateChatResponse>({
      cmd: "create-chat",
      id,
      name,
      ephemeral: options?.ephemeral ?? false,
      metadata: options?.metadata ?? {},
    });
  }

  function getMessageTree(chatId: string) {
    return sendClientMsgWithResponse<GetMessageTreeResponse>({
      cmd: "get-message-tree",
      chatId,
    });
  }

  function registerChatContext(chatId: string, data: ChatContext) {
    const chatContext = context.contextByChatId.get(chatId);
    if (chatContext === undefined) {
      context.contextByChatId.set(chatId, new Set([data]));
    } else {
      chatContext.add(data);
    }

    return () => {
      const chatContext = context.contextByChatId.get(chatId);
      if (chatContext !== undefined) {
        chatContext.delete(data);
        if (chatContext.size === 0) {
          context.contextByChatId.delete(chatId);
        }
      }
    };
  }

  function ask(
    chatId: string,
    messageId: MessageId,
    options?: AskAiOptions
  ): Promise<AskAiResponse> {
    const targetMessageId = context.messagesStore.createOptimistically(
      chatId,
      "assistant",
      messageId
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
      createChat,

      deleteChat: (chatId: string) => {
        return sendClientMsgWithResponse({
          cmd: "delete-chat",
          chatId,
        });
      },

      getMessageTree,

      deleteMessage: (chatId: string, messageId: MessageId) =>
        sendClientMsgWithResponse({ cmd: "delete-message", chatId, messageId }),
      clearChat: (chatId: string) =>
        sendClientMsgWithResponse({ cmd: "clear-chat", chatId }),

      addUserMessage: (
        chatId: string,
        parentMessageId: MessageId | null,
        message: string
      ) => {
        const content: AiUserContentPart[] = [{ type: "text", text: message }];
        const newMessageId = context.messagesStore.createOptimistically(
          chatId,
          "user",
          parentMessageId,
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

      ask,

      regenerateMessage: (
        chatId: string,
        messageId: MessageId,
        options?: AskAiOptions
      ): Promise<AskAiResponse> => {
        const parentUserMessageId =
          context.messagesStore.getLatestUserMessageAncestor(chatId, messageId);
        if (parentUserMessageId === null) {
          throw new Error(
            `Unable to find user message ancestor for messageId: ${messageId}`
          );
        }
        return ask(chatId, parentUserMessageId, options);
      },

      addUserMessageAndAsk: async (
        chatId: string,
        parentMessageId: MessageId | null,
        message: string,
        options?: AskAiOptions
      ): Promise<AskAiResponse> => {
        const content: AiUserContentPart[] = [{ type: "text", text: message }];
        const newMessageId = context.messagesStore.createOptimistically(
          chatId,
          "user",
          parentMessageId,
          content
        );
        const targetMessageId = context.messagesStore.createOptimistically(
          chatId,
          "assistant",
          newMessageId
        );

        // XXX - We should handle the case where the user message fails to send
        await sendClientMsgWithResponse({
          cmd: "add-user-message",
          id: newMessageId,
          chatId,
          parentMessageId,
          content,
        });

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
          sourceMessageId: newMessageId,
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
        chatsΣ: context.chatsStore.chatsΣ,
        getChatMessagesForBranchΣ:
          context.messagesStore.getChatMessagesForBranchΣ,
        getToolDefinitionΣ: context.toolsStore.getToolCallByNameΣ,
        getMessagesForChatΣ: context.messagesStore.getMessagesForChatΣ,
      },

      registerChatContext,

      registerChatTool: context.toolsStore.addToolDefinition,
      unregisterChatTool: context.toolsStore.removeToolDefinition,

      getToolCallDefinition: (
        chatId: string,
        toolName: string
      ): ClientToolDefinition | undefined => {
        return context.toolsByChatId.get(chatId)?.get(toolName);
      },
    } satisfies Ai,
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

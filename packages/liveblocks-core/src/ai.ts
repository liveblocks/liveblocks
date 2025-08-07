import { getBearerTokenFromAuthValue } from "./api-client";
import type { AuthValue } from "./auth-manager";
import type { Delegates, Status } from "./connection";
import { ManagedSocket, StopRetrying } from "./connection";
import { kInternal } from "./internal";
import { assertNever } from "./lib/assert";
import { Promise_withResolvers } from "./lib/controlledPromise";
import { DefaultMap } from "./lib/DefaultMap";
import * as console from "./lib/fancy-console";
import { isDefined } from "./lib/guards";
import type { JsonObject } from "./lib/Json";
import { nanoid } from "./lib/nanoid";
import type { Resolve } from "./lib/Resolve";
import { shallow, shallow2 } from "./lib/shallow";
import { batch, DerivedSignal, MutableSignal, Signal } from "./lib/signals";
import { SortedList } from "./lib/SortedList";
import { TreePool } from "./lib/TreePool";
import type { Brand, DistributiveOmit } from "./lib/utils";
import { raise, tryParseJson } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type {
  DynamicSessionInfo,
  OptionalTupleUnless,
  Polyfills,
  StaticSessionInfo,
  TimeoutID,
} from "./room";
import type {
  AbortAiResponse,
  AiAssistantDeltaUpdate,
  AiChat,
  AiChatMessage,
  AiFailedAssistantMessage,
  AiGeneratingAssistantMessage,
  AiGenerationOptions,
  AiKnowledgeSource,
  AiToolDescription,
  AiToolInvocationPart,
  AiUserContentPart,
  AiUserMessage,
  AskInChatResponse,
  ClearChatResponse,
  ClientAiMsg,
  CmdId,
  CreateChatOptions,
  Cursor,
  DeleteChatResponse,
  DeleteMessageResponse,
  GetChatsResponse,
  GetMessageTreeResponse,
  GetOrCreateChatResponse,
  ISODateString,
  MessageId,
  ServerAiMsg,
  SetToolResultResponse,
  ToolResultResponse,
} from "./types/ai";
import { appendDelta } from "./types/ai";
import type { Awaitable } from "./types/Awaitable";
import type {
  InferFromSchema,
  JSONObjectSchema7,
} from "./types/InferFromSchema";
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

export type AiToolTypePack<
  A extends JsonObject = JsonObject,
  R extends JsonObject = JsonObject,
> = {
  A: A;
  R: R;
};

export type AskUserMessageInChatOptions = Omit<AiGenerationOptions, "tools">;

export type SetToolResultOptions = Omit<
  AiGenerationOptions,
  "tools" | "knowledge"
>;

export type AiToolInvocationProps<
  A extends JsonObject,
  R extends JsonObject,
> = Resolve<
  DistributiveOmit<AiToolInvocationPart<A, R>, "type"> & {
    respond: (
      ...args: OptionalTupleUnless<R, [result: ToolResultResponse<R>]>
    ) => void;

    /**
     * These are the inferred types for your tool call which you can pass down
     * to UI components, like so:
     *
     *     <AiTool.Confirmation
     *       types={types}
     *       confirm={
     *         // Now fully type-safe!
     *         (args) => result
     *       } />
     *
     * This will make your AiTool.Confirmation component aware of the types for
     * `args` and `result`.
     */
    types: AiToolTypePack<A, R>;

    // Private APIs
    [kInternal]: {
      execute: AiToolExecuteCallback<A, R> | undefined;
    };
  }
>;

export type AiOpaqueToolInvocationProps = AiToolInvocationProps<
  JsonObject,
  JsonObject
>;

export type AiToolExecuteContext = {
  name: string;
  invocationId: string;
};

export type AiToolExecuteCallback<
  A extends JsonObject,
  R extends JsonObject,
> = (
  args: A,
  context: AiToolExecuteContext
) => Record<string, never> extends R
  ? Awaitable<ToolResultResponse<R> | undefined | void>
  : Awaitable<ToolResultResponse<R>>;

export type AiToolDefinition<
  S extends JSONObjectSchema7,
  A extends JsonObject,
  R extends JsonObject,
> = {
  description?: string;
  parameters: S;
  execute?: AiToolExecuteCallback<A, R>;
  render?: (props: AiToolInvocationProps<A, R>) => unknown;
  enabled?: boolean;
};

export type AiOpaqueToolDefinition = AiToolDefinition<
  JSONObjectSchema7,
  JsonObject,
  JsonObject
>;

/**
 * Helper function to help infer the types of `args`, `render`, and `result`.
 * This function has no runtime implementation and is only needed to make it
 * possible for TypeScript to infer types.
 */
export function defineAiTool<R extends JsonObject>() {
  return <const S extends JSONObjectSchema7>(
    def: AiToolDefinition<
      S,
      InferFromSchema<S> extends JsonObject ? InferFromSchema<S> : JsonObject,
      R
    >
  ): AiOpaqueToolDefinition => {
    return def as AiOpaqueToolDefinition;
  };
}

type NavigationInfo = {
  /**
   * The message ID of the parent message, or null if there is no parent.
   */
  parent: MessageId | null;
  /**
   * The message ID of the left sibling message, or null if there is no left sibling.
   */
  prev: MessageId | null;
  /**
   * The message ID of the right sibling message, or null if there is no right sibling.
   */
  next: MessageId | null;
};

export type WithNavigation<T> = T & { navigation: NavigationInfo };

type UiChatMessage = WithNavigation<AiChatMessage>;

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
  knowledge: KnowledgeStack;
};

type LayerKey = Brand<string, "LayerKey">;

export class KnowledgeStack {
  #_layers: Set<LayerKey>;

  #stack: DefaultMap<string, Map<LayerKey, AiKnowledgeSource | null>>;
  //                 /                \
  //      knowledge key               "layer" key
  //      (random, or optionally      (one entry per mounted component)
  //       set by user)
  #_cache: AiKnowledgeSource[] | undefined;

  constructor() {
    this.#_layers = new Set<LayerKey>();
    this.#stack = new DefaultMap(
      () => new Map<LayerKey, AiKnowledgeSource | null>()
    );
    this.#_cache = undefined;
  }

  // Typically a useId()
  registerLayer(uniqueLayerId: string): LayerKey {
    const layerKey = uniqueLayerId as LayerKey;
    if (this.#_layers.has(layerKey))
      raise(`Layer '${layerKey}' already exists, provide a unique layer id`);
    this.#_layers.add(layerKey);
    return layerKey;
  }

  deregisterLayer(layerKey: LayerKey): void {
    this.#_layers.delete(layerKey);
    let deleted = false;
    for (const [key, knowledge] of this.#stack) {
      if (knowledge.delete(layerKey)) {
        deleted = true;
      }
      if (knowledge.size === 0)
        // Just memory cleanup
        this.#stack.delete(key);
    }
    if (deleted) {
      this.invalidate();
    }
  }

  get(): AiKnowledgeSource[] {
    return (this.#_cache ??= this.#recompute());
  }

  invalidate(): void {
    this.#_cache = undefined;
  }

  #recompute(): AiKnowledgeSource[] {
    return Array.from(this.#stack.values()).flatMap((layer) =>
      // Return only the last item (returns [] when empty)
      Array.from(layer.values()).slice(-1).filter(isDefined)
    );
  }

  updateKnowledge(
    layerKey: LayerKey,
    key: string,
    data: AiKnowledgeSource | null
  ): void {
    if (!this.#_layers.has(layerKey)) raise(`Unknown layer key: ${layerKey}`);
    this.#stack.getOrCreate(key).set(layerKey, data);
    this.invalidate();
  }
}

export type GetOrCreateChatOptions = {
  name: string;
  metadata?: AiChat["metadata"];
};

function now(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

// Symbol used to register tools globally. These tools are not scoped to
// a particular chatId and made available to any AiChat instance.
const kWILDCARD = Symbol("*");

function createStore_forTools() {
  const toolsByChatIdΣ = new DefaultMap(
    (_chatId: string | typeof kWILDCARD) => {
      return new DefaultMap((_name: string) => {
        return new Signal<AiOpaqueToolDefinition | undefined>(undefined);
      });
    }
  );

  //
  // TODO This administration is pretty ugly at the moment.
  // Would be nice to have some kind of helper for constructing these
  // structures. Maintaining them in all these different DefaultMaps is pretty
  // getting pretty tricky. Ideas are very welcomed!
  //
  // Key here is: '["my-tool","my-chat"]' or just '["my-tool"]' (for global tools)
  //
  const globalOrScopedToolΣ = new DefaultMap((nameAndChat: string) => {
    const [name, chatId] = tryParseJson(nameAndChat) as [
      string,
      string | undefined,
    ];
    return DerivedSignal.from(() => {
      return (
        // A tool that's registered and scoped to a specific chat ID...
        (chatId !== undefined
          ? toolsByChatIdΣ.getOrCreate(chatId).getOrCreate(name)
          : undefined
        )?.get() ??
        // ...or a globally registered tool
        toolsByChatIdΣ.getOrCreate(kWILDCARD).getOrCreate(name).get()
      );
    });
  });

  function getToolΣ(name: string, chatId?: string) {
    const key = JSON.stringify(chatId !== undefined ? [name, chatId] : [name]);
    return globalOrScopedToolΣ.getOrCreate(key);
  }

  function registerTool(
    name: string,
    tool: AiOpaqueToolDefinition,
    chatId?: string
  ) {
    if (!tool.execute && !tool.render) {
      throw new Error(
        "A tool definition must have an execute() function, a render() function, or both."
      );
    }

    const key = chatId ?? kWILDCARD;
    toolsByChatIdΣ.getOrCreate(key).getOrCreate(name).set(tool);

    return () => unregisterTool(key, name);
  }

  function unregisterTool(chatId: string | typeof kWILDCARD, name: string) {
    const tools = toolsByChatIdΣ.get(chatId);
    if (tools === undefined) return;
    const tool = tools.get(name);
    if (tool === undefined) return;
    tool.set(undefined);
  }

  function getToolDescriptions(chatId: string): AiToolDescription[] {
    const globalToolsΣ = toolsByChatIdΣ.get(kWILDCARD);
    const scopedToolsΣ = toolsByChatIdΣ.get(chatId);
    return Array.from([
      ...(globalToolsΣ?.entries() ?? []),
      ...(scopedToolsΣ?.entries() ?? []),
    ]).flatMap(([name, toolΣ]) => {
      const tool = toolΣ.get();
      return tool && (tool.enabled ?? true)
        ? [{ name, description: tool.description, parameters: tool.parameters }]
        : [];
    });
  }

  return {
    getToolDescriptions,

    getToolΣ,
    registerTool,
  };
}

function createStore_forChatMessages(
  toolsStore: ReturnType<typeof createStore_forTools>,
  setToolResultFn: (
    chatId: string,
    messageId: MessageId,
    invocationId: string,
    result: ToolResultResponse,
    options?: SetToolResultOptions
  ) => Promise<void>
) {
  // Keeps track of all message IDs that are originated from this client. We
  // use this concept of "ownership" to determine which client instance is
  // allowed to auto-execute tool invocations for this message.
  const myMessages = new Set<MessageId>();

  // Keeps track of any tool invocations that have been auto-executed by this
  // client. Note that this can also record invocations that don't have an
  // execute() function. In that case, we also handled it (by kicking off nothing).
  const handledInvocations = new Set<string>();

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

  // Separately from that, we track all _generating_ signals in a separate
  // administration. Because generating messages are likely to receive
  // many/frequent updates, updating them in a separate administration makes
  // rendering streaming contents much more efficient than if we had to
  // re-create and re-render the entire chat list on every such update.
  const generatingMessagesΣ = new MutableSignal(
    new Map<MessageId, AiGeneratingAssistantMessage>()
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
        _optimistic: true,
      } satisfies AiUserMessage);
    } else {
      upsert({
        id,
        chatId,
        role,
        parentId,
        createdAt,
        status: "generating",
        contentSoFar: [],
        _optimistic: true,
      } satisfies AiGeneratingAssistantMessage);
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

    if (existing.role === "assistant" && existing.status !== "completed") {
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

      // If the message is a pending update, write it to the generating
      // messages LUT. If not, remove it from there.
      if (message.role === "assistant" && message.status === "generating") {
        generatingMessagesΣ.mutate((lut) => {
          lut.set(message.id, structuredClone(message));
        });
      } else {
        generatingMessagesΣ.mutate((lut) => {
          lut.delete(message.id);
        });
      }

      //
      // If this message has "awaiting-tool" status, it may be the client's
      // move to trigger an action / call an execute function.
      //
      // We will automatically invoke execute()...
      // - only if such function is provided by the user
      // - at most once (which is why we track it in seenToolCallIds)
      // - and only if the current client ID is the designated client ID
      //
      if (message.role === "assistant" && message.status === "awaiting-tool") {
        if (myMessages.has(message.id)) {
          for (const toolInvocation of message.contentSoFar.filter(
            (part) =>
              part.type === "tool-invocation" && part.stage === "executing"
          )) {
            if (!handledInvocations.has(toolInvocation.invocationId)) {
              handledInvocations.add(toolInvocation.invocationId);
            } else {
              // Do nothing, we already kicked this one off
              continue;
            }

            const executeFn = toolsStore
              .getToolΣ(toolInvocation.name, message.chatId)
              .get()?.execute;
            if (executeFn) {
              (async () => {
                const result = await executeFn(toolInvocation.args, {
                  name: toolInvocation.name,
                  invocationId: toolInvocation.invocationId,
                });
                return await setToolResultFn(
                  message.chatId,
                  message.id,
                  toolInvocation.invocationId,
                  result ?? { data: {} }
                  // TODO Pass in AiGenerationOptions here, or make the backend use the same options
                );
              })().catch((err) => {
                console.error(
                  `Error trying to respond to tool-call: ${String(err)} (in execute())`
                );
              });
            }
          }
        }
      } else {
        myMessages.delete(message.id);
      }
    });
  }

  function addDelta(messageId: MessageId, delta: AiAssistantDeltaUpdate): void {
    generatingMessagesΣ.mutate((lut) => {
      const message = lut.get(messageId);
      if (message === undefined) return false;

      appendDelta(message.contentSoFar, delta);
      lut.set(messageId, message);
      return true;
    });
  }

  function* iterGeneratingMessages() {
    for (const chatMsgsΣ of messagePoolByChatIdΣ.values()) {
      for (const m of chatMsgsΣ.get()) {
        if (
          m.role === "assistant" &&
          m.status === "generating" &&
          !m._optimistic
        ) {
          yield m;
        }
      }
    }
  }

  function failAllPending(): void {
    batch(() => {
      generatingMessagesΣ.mutate((lut) => {
        let deleted = false;
        for (const [k, v] of lut) {
          if (!v._optimistic) {
            lut.delete(k);
            deleted = true;
          }
        }
        return deleted;
      });

      upsertMany(
        Array.from(iterGeneratingMessages()).map(
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

      let lastVisitedMessage: UiChatMessage | null = null;
      for (const message of pool.walkUp(leaf.id)) {
        const prev = first(pool.walkLeft(message.id, isAlive))?.id ?? null;
        const next = first(pool.walkRight(message.id, isAlive))?.id ?? null;

        // Remove deleted messages only if they don't have any non-deleted
        // children, and also don't have a next/prev link, requiring the
        // deleted node to have an on-screen presence.
        if (!message.deletedAt || prev || next) {
          const node: UiChatMessage = {
            ...message,
            navigation: { parent: null, prev, next },
          };
          // Set the parent of the last visited to the id of the current node.
          if (lastVisitedMessage !== null) {
            lastVisitedMessage.navigation.parent = node.id;
          }
          lastVisitedMessage = node;
          spine.push(node);
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

  const immutableMessagesByBranch = new DefaultMap((chatId: string) => {
    return new DefaultMap((branchId: MessageId | null) => {
      const messagesΣ = DerivedSignal.from(() => {
        const pool = messagePoolByChatIdΣ.getOrCreate(chatId).get();
        return selectBranch(pool, branchId);
      }, shallow2);

      return DerivedSignal.from((): UiChatMessage[] => {
        const generatingMessages = generatingMessagesΣ.get();
        return messagesΣ.get().map((message) => {
          if (message.role !== "assistant" || message.status !== "generating") {
            return message;
          }
          const generatingMessage = generatingMessages.get(message.id);
          if (generatingMessage === undefined) return message;
          return {
            ...message,
            contentSoFar: generatingMessage.contentSoFar,
          } satisfies AiGeneratingAssistantMessage;
        });
      }, shallow);
    });
  });

  function getChatMessagesForBranchΣ(chatId: string, branch?: MessageId) {
    return immutableMessagesByBranch
      .getOrCreate(chatId)
      .getOrCreate(branch || null);
  }

  return {
    // Readers
    getMessageById,
    getChatMessagesForBranchΣ,

    // Mutations
    createOptimistically,
    upsert,
    upsertMany,
    remove,
    removeByChatId,
    addDelta,
    failAllPending,

    markMine(messageId: MessageId) {
      myMessages.add(messageId);
    },
  };
}

function createStore_forUserAiChats() {
  // The foundation is the mutable signal, which is a simple Map (easy to make
  // one-off updates to). But externally we expose a derived signal that
  // produces a new lazy "object" copy of this map any time it changes. This
  // plays better with React APIs.
  const allChatsInclDeletedΣ = new MutableSignal(
    SortedList.with<AiChat>((x, y) => y.createdAt < x.createdAt)
  );
  const nonDeletedChatsΣ = DerivedSignal.from(() =>
    Array.from(allChatsInclDeletedΣ.get()).filter((c) => !c.deletedAt)
  );

  function upsertMany(chats: AiChat[]) {
    allChatsInclDeletedΣ.mutate((list) => {
      for (const chat of chats) {
        list.removeBy((c) => c.id === chat.id, 1);
        list.add(chat);
      }
    });
  }

  function upsert(chat: AiChat) {
    upsertMany([chat]);
  }

  /**
   * "Just" deleting a chat we already know about might break assumptions in
   * clients that are currently displaying the chat on-screen. So instead,
   * we'll re-render those so they can display the chat is deleted.
   */
  function markDeleted(chatId: string) {
    allChatsInclDeletedΣ.mutate((list) => {
      const chat = list.find((c) => c.id === chatId);
      if (!chat) return false;

      upsert({ ...chat, deletedAt: now() });
      return undefined;
    });
  }

  function getChatById(chatId: string) {
    return Array.from(allChatsInclDeletedΣ.get()).find(
      (chat) => chat.id === chatId
    );
  }

  return {
    chatsΣ: nonDeletedChatsΣ,
    getChatById,

    // Mutations
    upsert,
    upsertMany,
    markDeleted,
  };
}

/** @private This API will change, and is not considered stable. DO NOT RELY on it. */
export type Ai = {
  [kInternal]: {
    context: AiContext;
  };
  connectInitially: () => void;
  // connect: () => void;
  // reconnect: () => void;
  disconnect: () => void;
  getStatus: () => Status;

  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  getChats: (options?: { cursor?: Cursor }) => Promise<GetChatsResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  getOrCreateChat: (
    /** A unique identifier for the chat. */
    chatId: string,
    options?: CreateChatOptions
  ) => Promise<GetOrCreateChatResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  deleteChat: (chatId: string) => Promise<DeleteChatResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  getMessageTree: (chatId: string) => Promise<GetMessageTreeResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  deleteMessage: (
    chatId: string,
    messageId: MessageId
  ) => Promise<DeleteMessageResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  clearChat: (chatId: string) => Promise<ClearChatResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  askUserMessageInChat: (
    chatId: string,
    userMessage:
      | MessageId
      | {
          id: MessageId;
          parentMessageId: MessageId | null;
          content: AiUserContentPart[];
        },
    targetMessageId: MessageId,
    options?: AskUserMessageInChatOptions
  ) => Promise<AskInChatResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  abort: (messageId: MessageId) => Promise<AbortAiResponse>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  setToolResult: (
    chatId: string,
    messageId: MessageId,
    invocationId: string,
    result: ToolResultResponse,
    options?: SetToolResultOptions
  ) => Promise<void>;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  signals: {
    chatsΣ: DerivedSignal<AiChat[]>;
    getChatMessagesForBranchΣ(
      chatId: string,
      branch?: MessageId
    ): DerivedSignal<UiChatMessage[]>;
    getToolΣ(
      name: string,
      chatId?: string
    ): DerivedSignal<AiOpaqueToolDefinition | undefined>;
  };
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  getChatById: (chatId: string) => AiChat | undefined;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  registerKnowledgeLayer: (uniqueLayerId: string) => LayerKey;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  deregisterKnowledgeLayer: (layerKey: LayerKey) => void;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  updateKnowledge: (
    layerKey: LayerKey,
    data: AiKnowledgeSource,
    key?: string
  ) => void;
  /** @private This API will change, and is not considered stable. DO NOT RELY on it. */
  registerTool: (
    name: string,
    tool: AiOpaqueToolDefinition,
    chatId?: string
  ) => () => void;
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

  const chatsStore = createStore_forUserAiChats();
  const toolsStore = createStore_forTools();
  const messagesStore = createStore_forChatMessages(toolsStore, setToolResult);
  const context: AiContext = {
    staticSessionInfoSig: new Signal<StaticSessionInfo | null>(null),
    dynamicSessionInfoSig: new Signal<DynamicSessionInfo | null>(null),
    pendingCmds: new Map(),
    chatsStore,
    messagesStore,
    toolsStore,
    knowledge: new KnowledgeStack(),
  };

  let lastTokenKey: string | undefined;
  function onStatusDidChange(_newStatus: Status) {
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

    if ("event" in msg) {
      switch (msg.event) {
        case "cmd-failed":
          pendingCmd?.reject(new Error(msg.error));
          break;

        case "delta": {
          const { id, delta } = msg;
          context.messagesStore.addDelta(id, delta);
          break;
        }

        case "settle": {
          context.messagesStore.upsert(msg.message);
          break;
        }

        case "warning":
          console.warn(msg.message);
          break;

        case "error":
          console.error(msg.error);
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
              context.chatsStore.markDeleted(chatId);
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

        case "get-or-create-chat":
          context.chatsStore.upsert(msg.chat);
          break;

        case "delete-chat":
          context.chatsStore.markDeleted(msg.chatId);
          context.messagesStore.removeByChatId(msg.chatId);
          break;

        case "get-message-tree":
          context.chatsStore.upsert(msg.chat);
          context.messagesStore.upsertMany(msg.messages);
          break;

        case "delete-message":
          context.messagesStore.remove(msg.chatId, msg.messageId);
          break;

        case "clear-chat":
          context.messagesStore.removeByChatId(msg.chatId);
          break;

        case "ask-in-chat":
          if (msg.sourceMessage) {
            // This field will only be returned if the ask-in-chat command
            // created a new source message
            context.messagesStore.upsert(msg.sourceMessage);
          }
          context.messagesStore.upsert(msg.targetMessage);
          break;

        case "abort-ai":
          // TODO Not handled yet
          break;

        case "set-tool-result":
          if (msg.ok) {
            context.messagesStore.upsert(msg.message);
          }
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

  function connectInitially() {
    if (managedSocket.getStatus() === "initial") {
      managedSocket.connect();
    }
  }

  async function sendClientMsgWithResponse<T extends ServerAiMsg>(
    msg: DistributiveOmit<ClientAiMsg, "cmdId">
  ): Promise<T> {
    connectInitially();
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
    });
  }

  function getOrCreateChat(id: string, options?: CreateChatOptions) {
    return sendClientMsgWithResponse<GetOrCreateChatResponse>({
      cmd: "get-or-create-chat",
      id,
      options,
    });
  }

  function getMessageTree(chatId: string) {
    return sendClientMsgWithResponse<GetMessageTreeResponse>({
      cmd: "get-message-tree",
      chatId,
    });
  }

  function registerKnowledgeLayer(uniqueLayerId: string): LayerKey {
    return context.knowledge.registerLayer(uniqueLayerId);
  }

  function deregisterKnowledgeLayer(layerKey: LayerKey): void {
    context.knowledge.deregisterLayer(layerKey);
  }

  function updateKnowledge(
    layerKey: LayerKey,
    data: AiKnowledgeSource,
    key: string = nanoid()
  ) {
    context.knowledge.updateKnowledge(layerKey, key, data);
  }

  async function setToolResult(
    chatId: string,
    messageId: MessageId,
    invocationId: string,
    result: ToolResultResponse,
    options?: SetToolResultOptions
  ): Promise<void> {
    const knowledge = context.knowledge.get();
    const tools = context.toolsStore.getToolDescriptions(chatId);

    const resp: SetToolResultResponse = await sendClientMsgWithResponse({
      cmd: "set-tool-result",
      chatId,
      messageId,
      invocationId,
      result,
      generationOptions: {
        copilotId: options?.copilotId,
        stream: options?.stream,
        timeout: options?.timeout,

        // Knowledge and tools aren't coming from the options, but retrieved
        // from the global context
        knowledge: knowledge.length > 0 ? knowledge : undefined,
        tools: tools.length > 0 ? tools : undefined,
      },
    });
    if (resp.ok) {
      messagesStore.markMine(resp.message.id);
    }
  }

  return Object.defineProperty(
    {
      [kInternal]: {
        context,
      },

      connectInitially,
      // reconnect: () => managedSocket.reconnect(),
      disconnect: () => managedSocket.disconnect(),

      getChats,
      getOrCreateChat,

      deleteChat: (chatId: string) => {
        return sendClientMsgWithResponse({ cmd: "delete-chat", chatId });
      },

      getMessageTree,

      deleteMessage: (chatId: string, messageId: MessageId) =>
        sendClientMsgWithResponse({ cmd: "delete-message", chatId, messageId }),
      clearChat: (chatId: string) =>
        sendClientMsgWithResponse({ cmd: "clear-chat", chatId }),

      askUserMessageInChat: async (
        chatId: string,
        userMessage:
          | MessageId
          | {
              id: MessageId;
              parentMessageId: MessageId | null;
              content: AiUserContentPart[];
            },
        targetMessageId: MessageId,
        options?: AskUserMessageInChatOptions
      ): Promise<AskInChatResponse> => {
        const globalKnowledge = context.knowledge.get();
        const requestKnowledge = options?.knowledge || [];
        const combinedKnowledge = [...globalKnowledge, ...requestKnowledge];
        const tools = context.toolsStore.getToolDescriptions(chatId);

        const resp: AskInChatResponse = await sendClientMsgWithResponse({
          cmd: "ask-in-chat",
          chatId,
          sourceMessage: userMessage,
          targetMessageId,
          generationOptions: {
            copilotId: options?.copilotId,
            stream: options?.stream,
            timeout: options?.timeout,

            // Combine global knowledge with request-specific knowledge
            knowledge:
              combinedKnowledge.length > 0 ? combinedKnowledge : undefined,
            tools: tools.length > 0 ? tools : undefined,
          },
        });
        messagesStore.markMine(resp.targetMessage.id);
        return resp;
      },

      abort: (messageId: MessageId) =>
        sendClientMsgWithResponse({ cmd: "abort-ai", messageId }),

      setToolResult,

      getStatus: () => managedSocket.getStatus(),

      signals: {
        chatsΣ: context.chatsStore.chatsΣ,
        getChatMessagesForBranchΣ:
          context.messagesStore.getChatMessagesForBranchΣ,
        getToolΣ: context.toolsStore.getToolΣ,
      },

      getChatById: context.chatsStore.getChatById,
      registerKnowledgeLayer,
      deregisterKnowledgeLayer,
      updateKnowledge,

      registerTool: context.toolsStore.registerTool,
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
    url.pathname = "/ai/v4";
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

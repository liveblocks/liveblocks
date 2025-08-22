///
/// This module is shared with the back-end.
/// All types in this file represent _public_ types, observable in the client
/// or in our protocol.
///

import type { JSONSchema7 } from "json-schema";

import { assertNever } from "../lib/assert";
import { IncrementalJsonParser } from "../lib/IncrementalJsonParser";
import type { Json, JsonObject } from "../lib/Json";
import type { Relax } from "../lib/Relax";
import type { Resolve } from "../lib/Resolve";
import type { Brand } from "../lib/utils";
import { findLastIndex } from "../lib/utils";

export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

type ChatId = string;

// --------------------------------------------------------------

export type MessageId = Brand<`ms_${string}`, "MessageId">;
export type CmdId = Brand<string, "CmdId">;
export type CopilotId = Brand<`co_${string}`, "CopilotId">;

// A client WebSocket message is always a command to the server
export type ClientAiMsg = ClientCmd;

// A server WebSocket message can be either a command response from the server,
// or a server-initiated event
export type ServerAiMsg = ServerCmdResponse | ServerEvent;

// Helper to create a pair of matching commands and responses
type DefineCmd<CmdName extends string, TRequest, TResponse> = [
  Resolve<{ cmd: CmdName; cmdId: CmdId } & TRequest>,
  Resolve<{ cmd: CmdName; cmdId: CmdId } & TResponse>,
];

// -------------------------------------------------------------------------------------------------
// Commands are request/response pairs that are client-initiated
// -------------------------------------------------------------------------------------------------

type CommandPair =
  | GetChatsPair
  | GetOrCreateChatPair
  | DeleteChatPair
  | GetMessageTreePair
  | DeleteMessagePair
  | ClearChatPair
  | AskInChatPair
  | AbortAiPair
  | SetToolResultPair;

export type ClientCmd<T extends CommandPair = CommandPair> = T[0];
export type ServerCmdResponse<T extends CommandPair = CommandPair> = T[1];

export type GetChatsCmd = ClientCmd<GetChatsPair>;
export type GetOrCreateChatCmd = ClientCmd<GetOrCreateChatPair>;
export type DeleteChatCmd = ClientCmd<DeleteChatPair>;
export type GetMessageTreeCmd = ClientCmd<GetMessageTreePair>;
export type DeleteMessageCmd = ClientCmd<DeleteMessagePair>;
export type ClearChatCmd = ClientCmd<ClearChatPair>;
export type AskInChatCmd = ClientCmd<AskInChatPair>;
export type AbortAiCmd = ClientCmd<AbortAiPair>;
export type SetToolResultCmd = ClientCmd<SetToolResultPair>;

export type GetChatsResponse = ServerCmdResponse<GetChatsPair>;
export type GetOrCreateChatResponse = ServerCmdResponse<GetOrCreateChatPair>;
export type DeleteChatResponse = ServerCmdResponse<DeleteChatPair>;
export type GetMessageTreeResponse = ServerCmdResponse<GetMessageTreePair>;
export type DeleteMessageResponse = ServerCmdResponse<DeleteMessagePair>;
export type ClearChatResponse = ServerCmdResponse<ClearChatPair>;
export type AskInChatResponse = ServerCmdResponse<AskInChatPair>;
export type AbortAiResponse = ServerCmdResponse<AbortAiPair>;
export type SetToolResultResponse = ServerCmdResponse<SetToolResultPair>;

type GetChatsPair = DefineCmd<
  "get-chats",
  {
    cursor?: Cursor;
    pageSize?: number;
    query?: { metadata?: Record<string, string | string[] | null> };
  },
  { chats: AiChat[]; nextCursor: Cursor | null }
>;

export type CreateChatOptions = {
  /** A human-friendly title for the chat. If not set, it will get auto-generated after the first response. */
  title?: string;
  /** Arbitrary metadata to record for this chat. This can be later used to filter the list of chats by metadata. */
  metadata?: Record<string, string | string[]>;
};

export type AiChatsQuery = {
  metadata?: Record<string, string | string[] | null>;
};

export type GetChatsOptions = {
  /**
   * The cursor to use for pagination.
   */
  cursor?: Cursor;
  /**
   * The query (including metadata) to filter chats by. If provided, only chats
   * that match the query will be returned. If not provided, all chats will be returned.
   * @example
   * ```
   * // Filter by presence of metadata values
   * { metadata: { tag: ["urgent"] } }
   *
   * // Filter by absence of metadata key (key must not exist)
   * { metadata: { archived: null } }
   * ```
   */
  query?: AiChatsQuery;
};

type GetOrCreateChatPair = DefineCmd<
  "get-or-create-chat",
  {
    id: ChatId;
    options?: CreateChatOptions;
  },
  { chat: AiChat }
>;

type DeleteChatPair = DefineCmd<
  "delete-chat",
  { chatId: ChatId },
  { chatId: ChatId }
>;

type GetMessageTreePair = DefineCmd<
  "get-message-tree",
  { chatId: ChatId },
  { chat: AiChat; messages: AiChatMessage[] }
>;

type DeleteMessagePair = DefineCmd<
  "delete-message",
  { chatId: ChatId; messageId: MessageId },
  { chatId: ChatId; messageId: MessageId }
>;

type ClearChatPair = DefineCmd<
  "clear-chat",
  { chatId: ChatId },
  { chatId: ChatId }
>;

export type AiGenerationOptions = {
  /**
   * The copilot ID to use for this request. If not provided, a built-in
   * default Copilot will be used instead of one that you configured via the
   * dashboard.
   */
  copilotId?: CopilotId;
  stream?: boolean; // default = true
  tools?: AiToolDescription[];
  knowledge?: AiKnowledgeSource[];
  timeout?: number; // in millis
};

type AskInChatPair = DefineCmd<
  "ask-in-chat",
  {
    chatId: ChatId;

    /** The chat message to use as the source to create the assistant response. */
    sourceMessage:
      | // An existing message ID to reply to
      MessageId
      // Or a new (!) message ID to create (optimistically created on the client)
      | {
          id: MessageId;
          parentMessageId: MessageId | null; // The existing message to use as parent
          content: AiUserContentPart[];
        };

    /**
     * The new (!) message ID to output the assistant response into. This ID
     * should be a non-existing message ID, optimistically assigned by the
     * client. The output message will be created as a child to the source
     * message ID.
     */
    targetMessageId: MessageId;

    generationOptions: AiGenerationOptions;
  },
  {
    sourceMessage?: AiChatMessage; // If optimistically created
    targetMessage: AiChatMessage;
  }
>;

type AbortAiPair = DefineCmd<
  "abort-ai",
  { messageId: MessageId },
  { ok: true }
>;

// This is the type that users are supposed to return from the `execute()` method (or call respond() or confirm() with)
// prettier-ignore
export type ToolResultResponse<R extends JsonObject = JsonObject> =
  Relax<
    (
      | { data: R; description?: string; }
      | { error: string }
      | { cancel: true | /* reason */ string }
    )
  >;

export type NonEmptyString<T extends string> = T & { __nonEmpty: true };

// This is the type that will get passed back into the `render()` method for further inspection
export type RenderableToolResultResponse<R extends JsonObject = JsonObject> =
  Relax<
    | { type: "success"; data: R }
    | { type: "error"; error: NonEmptyString<string> }
    | { type: "cancelled"; cancelled: true; reason?: string }
  >;

type SetToolResultPair = DefineCmd<
  "set-tool-result",
  {
    chatId: ChatId;
    messageId: MessageId;
    invocationId: string;
    result: ToolResultResponse;
    generationOptions: AiGenerationOptions;
  },
  { ok: true; message: AiChatMessage } | { ok: false }
>;

// -------------------------------------------------------------------------------------------------
// Server-initiated events
// -------------------------------------------------------------------------------------------------

export type ServerEvent =
  | RebootedEvent
  | CmdFailedEvent
  | WarningServerEvent
  | ErrorServerEvent
  | SyncServerEvent
  | DeltaServerEvent
  | SettleServerEvent;

// Sent from the server any time it woke up from hibernation. If this happens,
// it means that any pending messages a client is still tracking are lost track
// of. We emit this event to connected clients, so they can mark all of their
// pending messages as failed.
export type RebootedEvent = {
  event: "rebooted";
};

export type CmdFailedEvent = {
  event: "cmd-failed";
  failedCmd: CommandPair[0]["cmd"];
  failedCmdId: CmdId;
  error: string;
};

export type WarningServerEvent = { event: "warning"; message: string };
export type ErrorServerEvent = { event: "error"; error: string };

export type SyncServerEvent = {
  event: "sync";

  // Stuff to upsert
  chats?: AiChat[];
  messages?: AiChatMessage[];

  // Stuff to delete
  clear?: ChatId[]; // Chats to clear
  "-chats"?: ChatId[]; // Chats to delete
  "-messages"?: Pick<AiChatMessage, "id" | "chatId">[]; // Messages to delete
};

/**
 * A "delta" event is sent to append an incoming delta chunk to an assistant
 * message.
 */
export type DeltaServerEvent = {
  event: "delta";
  id: MessageId;
  delta: AiAssistantDeltaUpdate;
};

/**
 * A "settle" event happens after 0 or more "delta" messages, and signifies the
 * end of a stream of updates to a pending assistant message. This event turns
 * a pending message into either a completed or failed assistant message.
 */
export type SettleServerEvent = {
  event: "settle";
  message:
    | AiAwaitingToolAssistantMessage
    | AiCompletedAssistantMessage
    | AiFailedAssistantMessage;
};

// -------------------------------------------------------------------------------------------------
// Shared data types
// -------------------------------------------------------------------------------------------------

export type AiChat = {
  id: ChatId;
  title: string;
  metadata: Record<string, string | string[]>;
  createdAt: ISODateString;
  lastMessageAt?: ISODateString; // Optional since some chats might have no messages
  deletedAt?: ISODateString; // Optional for soft-deleted chats
};

export type AiToolDescription = {
  name: string;
  description?: string;
  parameters: JSONSchema7;
};

export type AiToolInvocationPart<
  A extends JsonObject = JsonObject,
  R extends JsonObject = JsonObject,
> = Relax<
  | AiReceivingToolInvocationPart
  | AiExecutingToolInvocationPart<A>
  | AiExecutedToolInvocationPart<A, R>
>;

export type AiReceivingToolInvocationPart = {
  type: "tool-invocation";
  stage: "receiving";
  invocationId: string;
  name: string;
  /** @internal */
  partialArgsText: string; // The raw, partial JSON text value
  partialArgs: JsonObject; // The interpreted, partial JSON value
  /** @internal */
  __appendDelta?: (delta: string) => void; // Internal method for delta updates
};

export type AiExecutingToolInvocationPart<A extends JsonObject = JsonObject> = {
  type: "tool-invocation";
  stage: "executing";
  invocationId: string;
  name: string;
  args: A;
};

export type AiExecutedToolInvocationPart<
  A extends JsonObject = JsonObject,
  R extends JsonObject = JsonObject,
> = {
  type: "tool-invocation";
  stage: "executed";
  invocationId: string;
  name: string;
  args: A;
  result: RenderableToolResultResponse<R>;
};

export type AiTextPart = {
  type: "text";
  text: string;
};

export type AiTextDelta = {
  type: "text-delta";
  textDelta: string;
};

// NOTE: This chunk type is { type: 'reasoning', textDelta } in the Vercel AI
// SDK, but I'm renaming it to reasoning-delta here, to distinguish it better
// from the { type: "reasoning", text } part!
export type AiReasoningDelta = Relax<
  | { type: "reasoning-delta"; textDelta: string }
  | { type: "reasoning-delta"; signature: string }
>;

// Available since protocol V5, this is the start of a tool invocation stream
export type AiToolInvocationStreamStart = {
  type: "tool-stream";
  invocationId: string;
  name: string;
};

// Available since protocol V5, this is a partial tool invocation that is being
// constructed by the server and sent to the client as a delta. The client will
// append this delta to the last tool invocation stream's partial JSON buffer
// that will eventually become the full `args` value when JSON.parse()'ed.
export type AiToolInvocationDelta = {
  type: "tool-delta";
  /**
   * The textual delta to be appended to the last tool invocation stream's
   * partial JSON buffer that will eventually become the full `args` value when
   * JSON.parse()'ed.
   */
  delta: string;
};

export type AiReasoningPart = {
  type: "reasoning";
  text: string;
};

export type AiUploadedImagePart = {
  type: "image";
  id: string;
  name: string;
  size: number;
  mimeType: string;
};

// "Parts" are what make up the "content" of a message.
// "Content" is always an "array of parts".
export type AiUserContentPart = AiTextPart | AiUploadedImagePart;
export type AiAssistantContentPart =
  | AiReasoningPart
  | AiTextPart
  | AiToolInvocationPart;

export type AiAssistantDeltaUpdate =
  | AiTextDelta // a delta appended to the last part (if text)
  | AiReasoningDelta // a delta appended to the last part (if reasoning)
  | AiExecutingToolInvocationPart // a tool invocation ready to be executed by the client

  // Since protocol V5, if tool-call-streaming is enabled
  | AiToolInvocationStreamStart // the start of a new tool-call stream
  | AiToolInvocationDelta; // a partial/under-construction tool invocation (since protocol V5)

export type AiUserMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "user";
  content: AiUserContentPart[];
  createdAt: ISODateString;
  deletedAt?: ISODateString;
  /** @internal */
  _optimistic?: true; // Only set by clients, never by server
};

export type AiAssistantMessage = Relax<
  | AiGeneratingAssistantMessage
  | AiAwaitingToolAssistantMessage
  | AiCompletedAssistantMessage
  | AiFailedAssistantMessage
>;

export type AiGeneratingAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  createdAt: ISODateString;
  deletedAt?: ISODateString;
  copilotId?: CopilotId;

  status: "generating";
  contentSoFar: AiAssistantContentPart[];
  /** @internal */
  _optimistic?: true; // Only set by clients, never by server
};

export type AiAwaitingToolAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  createdAt: ISODateString;
  deletedAt?: ISODateString;
  copilotId?: CopilotId;

  status: "awaiting-tool";
  contentSoFar: AiAssistantContentPart[];
  /** @internal */
  _optimistic?: true; // Only set by clients, never by server
};

export type AiCompletedAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  content: AiAssistantContentPart[];
  createdAt: ISODateString;
  deletedAt?: ISODateString;
  copilotId?: CopilotId;

  status: "completed";
  /** @internal */
  _optimistic?: true; // Only set by clients, never by server
};

export type AiFailedAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  createdAt: ISODateString;
  deletedAt?: ISODateString;
  copilotId?: CopilotId;

  status: "failed";
  contentSoFar: AiAssistantContentPart[];
  errorReason: string;
  /** @internal */
  _optimistic?: true; // Only set by clients, never by server
};

export type AiChatMessage = Relax<AiUserMessage | AiAssistantMessage>;

export type AiKnowledgeSource = {
  description: string;
  value: Json;
};

// --------------------------------------------------------------------------------------------------

export function patchContentWithDelta(
  content: AiAssistantContentPart[],
  delta: AiAssistantDeltaUpdate
): void {
  const lastPart = content[content.length - 1] as
    | AiAssistantContentPart
    | undefined;

  // Otherwise, append a new part type to the array, which we can start
  // writing into
  switch (delta.type) {
    case "text-delta":
      if (lastPart?.type === "text") {
        lastPart.text += delta.textDelta;
      } else {
        content.push({ type: "text", text: delta.textDelta });
      }
      break;

    case "reasoning-delta":
      if (lastPart?.type === "reasoning") {
        lastPart.text += delta.textDelta;
      } else {
        content.push({
          type: "reasoning",
          text: delta.textDelta ?? "",
        });
      }
      break;

    case "tool-stream": {
      const toolInvocation = hydrateReceivingToolInvocation(
        delta.invocationId,
        delta.name
      );
      content.push(toolInvocation);
      break;
    }

    case "tool-delta": {
      // Take the last part, expect it to be a tool invocation in receiving
      // stage. If not, ignore this delta. If it is, append the delta to the
      // parser
      if (
        lastPart?.type === "tool-invocation" &&
        lastPart.stage === "receiving"
      ) {
        lastPart.__appendDelta?.(delta.delta);
      }
      // Otherwise ignore the delta - it's out of order or unexpected
      break;
    }

    case "tool-invocation": {
      // Find and replace any existing tool invocation with the same invocationId
      // Search from right to left (find the last matching one)
      const existingIndex = findLastIndex(
        content,
        (part) =>
          part.type === "tool-invocation" &&
          part.invocationId === delta.invocationId
      );

      if (existingIndex > -1) {
        // Replace the existing one
        content[existingIndex] = delta;
      } else {
        // No existing one found, just append
        content.push(delta);
      }
      break;
    }

    default:
      return assertNever(delta, "Unhandled case");
  }
}

/**
 * Creates a receiving tool invocation part for testing purposes.
 * This helper eliminates the need to manually create fake tool invocation objects
 * and provides a clean API for tests.
 */
export function hydrateReceivingToolInvocation(
  invocationId: string,
  name: string,
  partialArgsText: string = ""
): AiReceivingToolInvocationPart {
  const parser = new IncrementalJsonParser(partialArgsText);
  return {
    type: "tool-invocation",
    stage: "receiving",
    invocationId,
    name,
    get partialArgsText(): string {
      return parser.source;
    },
    get partialArgs(): JsonObject {
      return parser.json;
    },
    // Internal method to append deltas
    __appendDelta(delta: string) {
      parser.append(delta);
    },
  } satisfies AiReceivingToolInvocationPart;
}

import { assertNever } from "../lib/assert";
import type { JsonObject } from "../lib/Json";
import type { Relax } from "../lib/Relax";
import type { Resolve } from "../lib/Resolve";
import type { Brand } from "../lib/utils";

export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

type ChatId = string;

// --------------------------------------------------------------

export type MessageId = Brand<`ms_${string}`, "MessageId">;
export type CmdId = Brand<string, "CmdId">;
export type ClientId = Brand<string, "ClientId">;
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
  | CreateChatPair
  | DeleteChatPair
  | GetMessageTreePair
  | AddUserMessagePair
  | DeleteMessagePair
  | ClearChatPair
  | AskAIPair
  | AbortAiPair;

export type ClientCmd<T extends CommandPair = CommandPair> = T[0];
export type ServerCmdResponse<T extends CommandPair = CommandPair> = T[1];

export type GetChatsCmd = ClientCmd<GetChatsPair>;
export type CreateChatCmd = ClientCmd<CreateChatPair>;
export type DeleteChatCmd = ClientCmd<DeleteChatPair>;
export type GetMessageTreeCmd = ClientCmd<GetMessageTreePair>;
export type AddUserMessageCmd = ClientCmd<AddUserMessagePair>;
export type DeleteMessageCmd = ClientCmd<DeleteMessagePair>;
export type ClearChatCmd = ClientCmd<ClearChatPair>;
export type AskAiCmd = ClientCmd<AskAIPair>;
export type AbortAiCmd = ClientCmd<AbortAiPair>;

export type GetChatsResponse = ServerCmdResponse<GetChatsPair>;
export type CreateChatResponse = ServerCmdResponse<CreateChatPair>;
export type DeleteChatResponse = ServerCmdResponse<DeleteChatPair>;
export type GetMessageTreeResponse = ServerCmdResponse<GetMessageTreePair>;
export type AddUserMessageResponse = ServerCmdResponse<AddUserMessagePair>;
export type DeleteMessageResponse = ServerCmdResponse<DeleteMessagePair>;
export type ClearChatResponse = ServerCmdResponse<ClearChatPair>;
export type AskAiResponse = ServerCmdResponse<AskAIPair>;
export type AbortAiResponse = ServerCmdResponse<AbortAiPair>;

type GetChatsPair = DefineCmd<
  "get-chats",
  { cursor?: Cursor; pageSize?: number },
  { chats: AiChat[]; nextCursor: Cursor | null }
>;

// XXXX Rename to UpsertChat?
type CreateChatPair = DefineCmd<
  "create-chat", // XXXX Rename to "upsert-chat"?
  {
    id: ChatId;
    // -------------------------------------------------
    // Group these?
    name: string;
    ephemeral: boolean;
    metadata: Record<string, string | string[]>;
    // -------------------------------------------------
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

type AddUserMessagePair = DefineCmd<
  "add-user-message",
  {
    id: MessageId; // New message ID, optimistically assigned by client
    chatId: ChatId;
    parentMessageId: MessageId | null;
    content: AiUserContentPart[];
  },
  { message: AiUserMessage }
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

type AskAIPair = DefineCmd<
  "ask-ai",
  {
    chatId: ChatId;

    /** The chat message to use as the source to create the assistant response. */
    sourceMessageId: MessageId;

    /**
     * The new (!) message ID to output the assistant response into. This ID
     * should be a non-existing message ID, optimistically assigned by the
     * client. The output message will be created as a child to the source
     * message ID.
     */
    targetMessageId: MessageId;

    /**
     * The Copilot ID to use for this request. If not provided, a built-in
     * default Copilot will be used instead of one that you configured via the
     * dashboard.
     */
    copilotId?: CopilotId;

    /**
     * A client ID unique to this command. Later delta and settle messages will
     * reference this client ID, which is important to ensure that tool calls
     * with side effects will only get executed once, and only by the client
     * that originally made the request that produced the tool call.
     */
    clientId: ClientId;
    stream: boolean;
    tools?: AiToolDefinition[];
    toolChoice?: ToolChoice;
    context?: AiChatContext[];
    timeout: number; // in millis
  },
  { message: AiChatMessage }
>;

type AbortAiPair = DefineCmd<
  "abort-ai",
  // TODO Do we want to also be able to abort _all_ pending messages for
  // a given chat ID? There should be only one at the start though.
  { messageId: MessageId },
  { ok: true }
>;

// -------------------------------------------------------------------------------------------------
// Server-initiated events
// -------------------------------------------------------------------------------------------------

export type ServerEvent =
  | RebootedEvent
  | CmdFailedEvent
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

export type ErrorServerEvent = {
  event: "error";
  error: string;
};

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
  /** The client ID that originally made the request that led to this event */
  clientId: ClientId;
  delta: AiAssistantDeltaUpdate;
};

/**
 * A "settle" event happens after 0 or more "delta" messages, and signifies the
 * end of a stream of updates to a pending assistant message. This event turns
 * a pending message into either a completed or failed assistant message.
 */
export type SettleServerEvent = {
  event: "settle";
  /** The client ID that originally made the request that led to this event */
  clientId: ClientId;
  message: AiCompletedAssistantMessage | AiFailedAssistantMessage;
};

// -------------------------------------------------------------------------------------------------
// Shared data types
// -------------------------------------------------------------------------------------------------

export type AiChat = {
  id: ChatId;
  name: string;
  ephemeral: boolean;
  metadata: Record<string, string | string[]>;
  createdAt: ISODateString;
  lastMessageAt?: ISODateString; // Optional since some chats might have no messages
  deletedAt?: ISODateString; // Optional for soft-deleted chats
};

export type AiToolDefinition = {
  name: string;
  description?: string;
  parameters: JsonObject;
};

export type AiToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: unknown;
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

export type AiReasoningPart = {
  type: "reasoning";
  text: string;
  signature?: string;
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
  | AiToolCallPart;

export type AiAssistantDeltaUpdate =
  | AiAssistantContentPart // a new part
  | AiTextDelta // ...or a delta to append to the last sent part
  | AiReasoningDelta; // ...or a delta to append to the last sent part

export type ToolChoice =
  | "auto"
  | "required"
  | "none"
  | { type: "tool"; toolName: string };

export type AiUserMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "user";
  content: AiUserContentPart[];
  createdAt: ISODateString;
  deletedAt?: ISODateString;
};

export type AiAssistantMessage = Relax<
  | AiCompletedAssistantMessage
  | AiPendingAssistantMessage
  | AiFailedAssistantMessage
>;

export type AiCompletedAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  content: AiAssistantContentPart[];
  createdAt: ISODateString;
  deletedAt?: ISODateString;

  status: "completed";
};

export type AiFailedAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  createdAt: ISODateString;
  deletedAt?: ISODateString;

  status: "failed";
  contentSoFar: AiAssistantContentPart[];
  errorReason: string;
};

export type AiPendingAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  parentId: MessageId | null;
  role: "assistant";
  createdAt: ISODateString;
  deletedAt?: ISODateString;

  status: "pending";
  contentSoFar: AiAssistantContentPart[];
};

export type AiChatMessage = AiUserMessage | AiAssistantMessage;

export type AiChatContext = {
  value: string;
  description: string;
};

// --------------------------------------------------------------------------------------------------

export function appendDelta(
  content: AiAssistantContentPart[],
  delta: AiAssistantDeltaUpdate
): void {
  const lastPart = content[content.length - 1] as
    | AiAssistantContentPart
    | undefined;

  // Otherwise, append a new part type to the array, which we can start
  // writing into
  switch (delta.type) {
    case "reasoning":
    case "text":
    case "tool-call":
      content.push(delta);
      break;

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
        lastPart.signature ??= delta.signature;
      } else {
        content.push({
          type: "reasoning",
          text: delta.textDelta ?? "",
          signature: delta.signature,
        });
      }
      break;

    default:
      return assertNever(delta, "Unhandled case");
  }
}

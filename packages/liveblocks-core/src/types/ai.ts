import type { JSONSchema4 } from "json-schema";

import { assertNever } from "../lib/assert";
import type { Relax } from "../lib/Relax";
import type { Resolve } from "../lib/Resolve";
import type { Brand } from "../lib/utils";

export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

// --------------------------------------------------------------

export type ChatId = Brand<`ch_${string}`, "ChatId">;
export type MessageId = Brand<`ms_${string}`, "MessageId">;
export type PlaceholderId = Brand<`ph_${string}`, "PlaceholderId">;
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
  | CreateChatPair
  | DeleteChatPair
  | GetMessagesPair
  | AttachUserMessagePair
  | DeleteMessagePair
  | ClearChatPair
  | AskAIPair
  | AbortAiPair;

export type ClientCmd<T extends CommandPair = CommandPair> = T[0];
export type ServerCmdResponse<T extends CommandPair = CommandPair> = T[1];

export type GetChatsCmd = ClientCmd<GetChatsPair>;
export type CreateChatCmd = ClientCmd<CreateChatPair>;
export type DeleteChatCmd = ClientCmd<DeleteChatPair>;
export type GetMessagesCmd = ClientCmd<GetMessagesPair>;
export type AttachUserMessageCmd = ClientCmd<AttachUserMessagePair>;
export type DeleteMessageCmd = ClientCmd<DeleteMessagePair>;
export type ClearChatCmd = ClientCmd<ClearChatPair>;
export type AskAiCmd = ClientCmd<AskAIPair>;
export type AbortAiCmd = ClientCmd<AbortAiPair>;

export type GetChatsResponse = ServerCmdResponse<GetChatsPair>;
export type CreateChatResponse = ServerCmdResponse<CreateChatPair>;
export type DeleteChatResponse = ServerCmdResponse<DeleteChatPair>;
export type GetMessagesResponse = ServerCmdResponse<GetMessagesPair>;
export type AttachUserMessageResponse =
  ServerCmdResponse<AttachUserMessagePair>;
export type DeleteMessageResponse = ServerCmdResponse<DeleteMessagePair>;
export type ClearChatResponse = ServerCmdResponse<ClearChatPair>;
export type AskAiResponse = ServerCmdResponse<AskAIPair>;
export type AbortAiResponse = ServerCmdResponse<AbortAiPair>;

type GetChatsPair = DefineCmd<
  "get-chats",
  { cursor?: Cursor; pageSize?: number },
  { chats: AiChat[]; nextCursor: Cursor | null }
>;

type CreateChatPair = DefineCmd<
  "create-chat",
  { id: ChatId; name: string; metadata: Record<string, string | string[]> },
  { chat: AiChat }
>;

type DeleteChatPair = DefineCmd<
  "delete-chat",
  { chatId: ChatId },
  { chatId: ChatId }
>;

type GetMessagesPair = DefineCmd<
  "get-messages",
  { cursor?: Cursor; pageSize?: number; chatId: ChatId },
  { chatId: ChatId; messages: AiChatMessage[]; nextCursor: Cursor | null }
>;

type AttachUserMessagePair = DefineCmd<
  "attach-user-message",
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

// NOTE: I'm not sold on the shape of this type yet! However, it will now
// ensure that TypeScript deeply understands that if there is a chat context,
// there will be an input and an output message, and that is not the case for
// one-off asks.
// Maybe we should later split this into two separate commands anyway, one for
// chats and one for one-off asks? Those would then still have lots of overlap
// though. So let's punt on this decision until we understand it more deeply.
export type AiInputOutput =
  | {
      // For chat messages
      type: "chat-io";
      input: { chatId: ChatId; messageId: MessageId; prompt?: never };
      output: {
        placeholderId: PlaceholderId; // Optimistically assigned by client
        messageId: MessageId; // Optimistically assigned by client
      };
    }
  | {
      // One-off asks
      type: "one-off-io";
      input: { prompt: string; chatId?: never };
      output: {
        placeholderId: PlaceholderId; // Optimistically assigned by client
      };
    };

type AskAIPair = DefineCmd<
  "ask-ai",
  {
    io: AiInputOutput;
    copilotId?: CopilotId;
    stream: boolean;
    tools?: AiToolDefinition[];
    toolChoice?: ToolChoice;
    context?: CopilotContext[];
    timeout: number; // in millis
  },
  Relax<
    | { placeholderId: PlaceholderId } // for one-off asks, unrelated to chats
    | { message: AiChatMessage } // for chat messages (internally references the placeholder ID)
  >
>;

type AbortAiPair = DefineCmd<
  "abort-ai",
  // TODO Do we want to also be able to abort _all_ placeholders for a given
  // chat ID? There should be only one at the start though.
  { placeholderId: PlaceholderId },
  { placeholderId: PlaceholderId }
>;

// -------------------------------------------------------------------------------------------------
// Server-initiated events
// -------------------------------------------------------------------------------------------------

export type ServerEvent =
  | RebootedEvent
  | CmdFailedEvent
  | ErrorServerEvent
  | UpdatePlaceholderServerEvent
  | SettlePlaceholderServerEvent;

// Sent from the server any time it woke up from hibernation. If this happens,
// it means that any placeholders a client is still tracking are lost track of.
// We emit this event to connected clients, so they can mark all of their
// placeholders as failed.
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

export type UpdatePlaceholderServerEvent = {
  event: "update-placeholder"; // Rename "append-placeholder" or "delta"?
  placeholderId: PlaceholderId;
  delta: AiAssistantDeltaUpdate;
};

// XXX Fine-tune this message!
export type SettlePlaceholderServerEvent = {
  event: "settle-placeholder";
  placeholderId: PlaceholderId;
  result:
    | { status: "completed"; content: AiAssistantContentPart[] } // XXX Not decided yet!
    | { status: "failed"; reason: string }; // XXX Not decided yet!

  // XXX Maybe better to send the full message again instead of trying to patch like this?
  replaces: { chatId: ChatId; messageId: MessageId } | null;
  kase: number; // XXX Don't mind this, Vincent just uses this for debugging which instance produced this message, it will be removed later!
};

// -------------------------------------------------------------------------------------------------
// Shared data types
// -------------------------------------------------------------------------------------------------

export type AiChat = {
  id: ChatId;
  name: string;
  metadata: Record<string, string | string[]>;
  createdAt: ISODateString;
  lastMessageAt?: ISODateString; // Optional since some chats might have no messages
  deletedAt?: ISODateString; // Optional for soft-deleted chats
};

/**
 * 1. thinking, server called AI, but no response yet
 * 2. responding, AI is responding via stream
 * 3. complete, AI has responded
 * 4. failed, AI failed to respond
 */
export type AiStatus = "thinking" | "responding" | "complete" | "failed";

export type AiToolDefinition = {
  description?: string;
  parameters: JSONSchema4;
  execute?: (params: any) => void;
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

export type AiReasoningDelta = {
  // NOTE: This chunk type is { type: 'reasoning', textDelta } in the Vercel AI
  // SDK, but I'm renaming it to reasoning-delta here, to distinguish it better
  // from the { type: "reasoning", text } part!
  type: "reasoning-delta";
  textDelta: string;
};

export type AiReasoningPart = {
  type: "reasoning";
  text: string;
  // signature?: string; // Unsure what this is used for yet
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

export type AiUsage = {
  id: string;
  messageId?: MessageId;
  inputTokens: number;
  outputTokens: number;
  model: string;
  type: "chat" | "stateless";
  createdAt: ISODateString;
};

export type UsageMetadata = {
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type AiUserMessage = {
  id: MessageId;
  chatId: ChatId;
  role: "user";
  content: AiUserContentPart[];
  createdAt: ISODateString;
  deletedAt?: ISODateString;
};

export type AiAssistantMessage = {
  id: MessageId;
  chatId: ChatId;
  role: "assistant";
  content: AiAssistantContentPart[];
  createdAt: ISODateString;
  deletedAt?: ISODateString;
};

export type AiAssistantPlaceholderMessage = {
  id: MessageId;
  chatId: ChatId;
  role: "assistant-placeholder";
  placeholderId: PlaceholderId;
  createdAt: ISODateString;
  deletedAt?: ISODateString;
};

export type AiChatMessage =
  | AiUserMessage
  | AiAssistantMessage
  | AiAssistantPlaceholderMessage;

export type CopilotContext = {
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
      } else {
        content.push({ type: "reasoning", text: delta.textDelta });
      }
      break;

    default:
      return assertNever(delta, "Unhandled case");
  }
}

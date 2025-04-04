import type { Json } from "../lib/Json";
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
export type ClientAiMsg =
  | ClientCmdRequest<CommandPair>
  | AbortSomethingClientMsg; // XXX We should fine tune or remove this

// A server WebSocket message can be either a command response from the server,
// or a server-initiated event
export type ServerAiMsg = ServerCmdResponse<CommandPair> | ServerEvent;

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
  | AskAIPair;

type ClientCmdRequest<T extends CommandPair> = T[0];
type ServerCmdResponse<T extends CommandPair> = T[1];

export type GetChatsCmd = ClientCmdRequest<GetChatsPair>;
export type CreateChatCmd = ClientCmdRequest<CreateChatPair>;
export type DeleteChatCmd = ClientCmdRequest<DeleteChatPair>;
export type GetMessagesCmd = ClientCmdRequest<GetMessagesPair>;
export type AttachUserMessageCmd = ClientCmdRequest<AttachUserMessagePair>;
export type DeleteMessageCmd = ClientCmdRequest<DeleteMessagePair>;
export type ClearChatCmd = ClientCmdRequest<ClearChatPair>;
export type AskAiCmd = ClientCmdRequest<AskAIPair>;

export type GetChatsResponse = ServerCmdResponse<GetChatsPair>;
export type CreateChatResponse = ServerCmdResponse<CreateChatPair>;
export type DeleteChatResponse = ServerCmdResponse<DeleteChatPair>;
export type GetMessagesResponse = ServerCmdResponse<GetMessagesPair>;
export type AttachUserMessageResponse =
  ServerCmdResponse<AttachUserMessagePair>;
export type DeleteMessageResponse = ServerCmdResponse<DeleteMessagePair>;
export type ClearChatResponse = ServerCmdResponse<ClearChatPair>;
export type AskAiResponse = ServerCmdResponse<AskAIPair>;

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
    chatId: ChatId;
    parentMessageId: MessageId | null;
    content: AiTextContent | string;
    status?: AiStatus;
  },
  { chatId: ChatId; messageId: MessageId; createdAt: ISODateString }
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
    inputSource: AiInputSource;
    placeholderId: PlaceholderId; // Optimistically assigned by client
    copilotId?: CopilotId;
    stream: boolean;
    // XXX Allow specifying a timeout?
    tools?: AiTool[];
    toolChoice?: ToolChoice;
  },
  Relax<
    | { placeholderId: PlaceholderId } // for one-off asks, unrelated to chats
    | {
        placeholderId: PlaceholderId;
        chatId: ChatId;
        messageId: MessageId;
        // XXX Replace `content` by an optimistically created "container" ID
        // content: AiAssistantContent[];
      }
  >
>;

// -------------------------------------------------------------------------------------------------
// Server-initiated events
// -------------------------------------------------------------------------------------------------

export type ServerEvent =
  | CmdFailedEvent
  | ErrorServerEvent
  | SettlePlaceholderServerEvent
  | StreamMessagePartServerEvent
  | StreamMessageFailedServerEvent
  | StreamMessageAbortedServerEvent
  | StreamMessageCompleteServerEvent;

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

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessagePartServerEvent = {
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  event: 1002; // STREAM_MESSAGE_PART
  content: {
    type: "text";
    id: string;
    delta: string;
  };
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessageFailedServerEvent = {
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  event: 1004; // STREAM_MESSAGE_FAILED
  error: string;
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessageAbortedServerEvent = {
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  event: 1005; // STREAM_MESSAGE_ABORTED
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessageCompleteServerEvent = {
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  event: 1003; // STREAM_MESSAGE_COMPLETE
  content: AiAssistantContent[];
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Fine-tune this message!
export type SettlePlaceholderServerEvent = {
  event: "settle-placeholder";
  placeholderId: PlaceholderId;
  result:
    | { status: "completed"; content: AiAssistantContent[] } // XXX Not decided yet!
    | { status: "failed"; reason: string }; // XXX Not decided yet!
  chatId?: ChatId; // XXX Not decided yet!
  messageId?: MessageId; // XXX Not decided yet!
};

// -------------------------------------------------------------------------------------------------
// Client messages that aren't commands
// -------------------------------------------------------------------------------------------------

// XXX This isn't really a Cmd! Think about this
export type AbortSomethingClientMsg = {
  cmd: "abort-something"; // XXX rename to the thing that will actually get aborted, need to first find the best name for that, will fix later
  cmdId: CmdId;
  chatId: ChatId;
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
 * 5. aborted, user aborted the response
 */
export type AiStatus =
  | "thinking"
  | "responding"
  | "complete"
  | "failed"
  | "aborted";

export interface AiTool {
  name: string;
  description: string;
  parameter_schema: Json;
}

export type AiToolContent = {
  id?: string; // What's this? When is it optional? When not? Should we make it a branded ContentId?
  type: "tool-call";
  name: string;
  args?: unknown;
};

export type AiTextContent = {
  id?: string; // What's this? When is it optional? When not? Should we make it a branded ContentId?
  type: "text";
  text: string;
};

export type AiUploadedImageContent = {
  type: "image";
  id: string;
  name: string;
  size: number;
  mimeType: string;
};

export type AiUserContent = AiTextContent | AiUploadedImageContent;
export type AiAssistantContent = AiTextContent | AiToolContent;

export type AiInputSource = Relax<StatefullMsg | StatelessMsg>;

export interface StatefullMsg {
  chatId: ChatId;
  messageId: MessageId;
}
export interface StatelessMsg {
  prompt: string;
}

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

export type AiUserMessageBase = {
  id: MessageId;
  status: AiStatus; // I think this should only live on Assistent messages, not on User messages
  createdAt: ISODateString;
  deletedAt?: ISODateString;
};

export type AiUserMessage = AiUserMessageBase & {
  role: "user";
  content: AiUserContent[];
};

export type AiAssistantMessage = AiUserMessageBase & {
  role: "assistant";
  content: AiAssistantContent[];
};

export type AiChatMessage = AiUserMessage | AiAssistantMessage;

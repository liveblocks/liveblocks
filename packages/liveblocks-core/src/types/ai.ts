import type { Json } from "../lib/Json";
import type { Relax } from "../lib/Relax";
import type { Resolve } from "../lib/Resolve";
import type { Brand } from "../lib/utils";

export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

// --------------------------------------------------------------

export type ChatId = Brand<`ch_${string}`, "ChatId">;
export type MessageId = Brand<`msg_${string}`, "MessageId">;
export type CmdId = Brand<string, "CmdId">;

// A client WebSocket message is always a command to the server
export type ClientAiMsg =
  | ClientCmdRequest<CommandPair>
  | AbortSomethingClientMsg;

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
  | GenerateAnswerPair
  | StreamAnswerPair;

type ClientCmdRequest<T extends CommandPair> = T[0];
type ServerCmdResponse<T extends CommandPair> = T[1];

export type GetChatsCmd = ClientCmdRequest<GetChatsPair>;
export type CreateChatCmd = ClientCmdRequest<CreateChatPair>;
export type DeleteChatCmd = ClientCmdRequest<DeleteChatPair>;
export type GetMessagesCmd = ClientCmdRequest<GetMessagesPair>;
export type AttachUserMessageCmd = ClientCmdRequest<AttachUserMessagePair>;
export type DeleteMessageCmd = ClientCmdRequest<DeleteMessagePair>;
export type ClearChatCmd = ClientCmdRequest<ClearChatPair>;
export type GenerateAnswerCmd = ClientCmdRequest<GenerateAnswerPair>;
export type StreamAnswerCmd = ClientCmdRequest<StreamAnswerPair>;

export type GetChatsResponse = ServerCmdResponse<GetChatsPair>;
export type CreateChatResponse = ServerCmdResponse<CreateChatPair>;
export type DeleteChatResponse = ServerCmdResponse<DeleteChatPair>;
export type GetMessagesResponse = ServerCmdResponse<GetMessagesPair>;
export type AttachUserMessageResponse =
  ServerCmdResponse<AttachUserMessagePair>;
export type DeleteMessageResponse = ServerCmdResponse<DeleteMessagePair>;
export type ClearChatResponse = ServerCmdResponse<ClearChatPair>;
export type GenerateAnswerResponse = ServerCmdResponse<GenerateAnswerPair>;
export type StreamAnswerResponse = ServerCmdResponse<StreamAnswerPair>;

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
  { chatId: ChatId } // XXX YAGNI?
>;

type GetMessagesPair = DefineCmd<
  "get-messages", // XXX consider naming it get-message-branch already?
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
  { chatId: ChatId; messageId: MessageId } // XXX YAGNI?
>;

type ClearChatPair = DefineCmd<
  "clear-chat",
  { chatId: ChatId },
  { chatId: ChatId; messagesCount: number } // XXX YAGNI???
>;

type GenerateAnswerPair = DefineCmd<
  "generate-answer",
  { inputSource: AiInputSource; tools?: AiTool[]; toolChoice?: ToolChoice },
  { content: AiAssistantContent[]; chatId?: ChatId; messageId?: MessageId }
>;

type StreamAnswerPair = DefineCmd<
  "stream-answer", // XXX Should this not be "generate-answer" with a "stream?: boolean" option maybe?
  { inputSource: AiInputSource; tools?: AiTool[]; toolChoice?: ToolChoice },
  // XXX We should send back a "container ID" here - I'll work on that next
  { chatId?: ChatId; messageId?: MessageId }
>;

// -------------------------------------------------------------------------------------------------
// Server-initiated events
// -------------------------------------------------------------------------------------------------

export type ServerEvent =
  | ErrorServerEvent
  | StreamMessagePartServerEvent
  | StreamMessageFailedServerEvent
  | StreamMessageAbortedServerEvent
  | StreamMessageCompleteServerEvent;

// XXX Have a "command error" (an error in response to a client-sent "command")
// XXX Have a "generic error event" (a server-side error happened, but not in response to a command)
export type ErrorServerEvent = {
  cmd?: never;
  cmdId?: CmdId; // TODO Check why optional here? Should we maybe have a separate error types for errors sent that aren't the response to a request?
  type: 999; // ERROR
  error: string;
};

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessagePartServerEvent = {
  cmd?: never;
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  type: 1002; // STREAM_MESSAGE_PART
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
  cmd?: never;
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  type: 1004; // STREAM_MESSAGE_FAILED
  error: string;
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessageAbortedServerEvent = {
  cmd?: never;
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  type: 1005; // STREAM_MESSAGE_ABORTED
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Not really a response to a "command" - Vincent will refactor these streaming events next!
export type StreamMessageCompleteServerEvent = {
  cmd?: never;
  cmdId: CmdId; // XXX Original cmdId that triggered this, but this is not how it should work
  type: 1003; // STREAM_MESSAGE_COMPLETE
  content: AiAssistantContent[];
  chatId?: ChatId;
  messageId?: MessageId;
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

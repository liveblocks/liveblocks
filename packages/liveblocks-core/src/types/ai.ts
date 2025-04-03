import type { Json } from "../lib/Json";
import type { Relax } from "../lib/Relax";
import type { Brand } from "../lib/utils";

export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

// --------------------------------------------------------------

export type ChatId = Brand<`ch_${string}`, "ChatId">;
export type MessageId = Brand<`msg_${string}`, "MessageId">;
export type AiCmdId = Brand<string, "AiCmdId">;

export enum ServerAiMsgCode {
  // chat management
  LIST_CHATS_OK = 101,
  CREATE_CHAT_OK = 201,
  DELETE_CHAT_OK = 701,

  // message management
  GET_MESSAGES_OK = 301,
  ATTACH_MESSAGE_OK = 401,
  DELETE_MESSAGE_OK = 801,
  CLEAR_CHAT_MESSAGES_OK = 901,

  // oh no
  ERROR = 999,

  // answers
  STREAM_MESSAGE_START = 1001,
  STREAM_MESSAGE_PART = 1002,
  STREAM_MESSAGE_COMPLETE = 1003,
  STREAM_MESSAGE_FAILED = 1004,
  STREAM_MESSAGE_ABORTED = 1005,
  GENERATE_ANSWER_RESULT = 2001,
}

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

/**
 * Server messages
 */

export type StreamMessageStartServerMsg = {
  // XXX Not really a response to a "command" ??????????
  cmdId: AiCmdId;
  type: ServerAiMsgCode.STREAM_MESSAGE_START;
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessagePartServerMsg = {
  // XXX Not really a response to a "command"
  cmdId: AiCmdId;
  type: ServerAiMsgCode.STREAM_MESSAGE_PART;
  content: {
    type: "text";
    id: string;
    delta: string;
  };
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessageFailedServerMsg = {
  // XXX Not really a response to a "command"
  cmdId: AiCmdId;
  type: ServerAiMsgCode.STREAM_MESSAGE_FAILED;
  error: string;
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessageAbortedServerMsg = {
  // XXX Not really a response to a "command"
  cmdId: AiCmdId;
  type: ServerAiMsgCode.STREAM_MESSAGE_ABORTED;
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessageCompleteServerMsg = {
  // XXX Not really a response to a "command"
  cmdId: AiCmdId;
  type: ServerAiMsgCode.STREAM_MESSAGE_COMPLETE;
  content: AiAssistantContent[];
  chatId?: ChatId;
  messageId?: MessageId;
};

// XXX Have a "command error" (an error in response to a client-sent "command")
// XXX Have a "generic error event" (a server-side error happened, but not in response to a command)
export type ErrorServerMsg = {
  type: ServerAiMsgCode.ERROR;
  error: string;
  cmdId?: AiCmdId; // TODO Check why optional here? Should we maybe have a separate error types for errors sent that aren't the response to a request?
};

export type ListChatServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.LIST_CHATS_OK;
  chats: AiChat[];
  nextCursor: Cursor | null;
};

export type ChatCreatedServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.CREATE_CHAT_OK;
  chat: AiChat;
};

export type MessageAttachedServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.ATTACH_MESSAGE_OK;
  chatId: ChatId;
  messageId: MessageId;
  createdAt: ISODateString;
};

export type GetMessagesServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.GET_MESSAGES_OK;
  chatId: ChatId;
  messages: AiChatMessage[];
  nextCursor: Cursor | null;
};

export type GenerateAnswerResultServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.GENERATE_ANSWER_RESULT;
  content: AiAssistantContent[];
  chatId?: ChatId;
  messageId?: MessageId;
};

export type DeleteChatServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.DELETE_CHAT_OK;
  chatId: ChatId;
};

export type DeleteMessageServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.DELETE_MESSAGE_OK;
  chatId: ChatId;
  messageId: MessageId;
};

export type ClearChatMessagesServerMsg = {
  cmdId: AiCmdId;
  type: ServerAiMsgCode.CLEAR_CHAT_MESSAGES_OK;
  chatId: ChatId;
  messagesCount: number;
};

/**
 * Client messages
 */

export type GetChatsCmd = {
  cmd: "get-chats";
  cmdId: AiCmdId;
  cursor?: Cursor;
  pageSize?: number;
};

export type CreateChatCmd = {
  cmd: "create-chat";
  cmdId: AiCmdId;
  id: ChatId;
  name: string;
  metadata: Record<string, string | string[]>;
};

export type GetMessagesCmd = {
  cmd: "get-messages"; // XXX consider naming it get-message-branch already?
  cmdId: AiCmdId;
  cursor?: Cursor;
  pageSize?: number;
  chatId: ChatId;
};

export type AttachUserMessageCmd = {
  cmd: "attach-user-message";
  cmdId: AiCmdId;
  chatId: ChatId;
  parentMessageId: MessageId | null;
  content: AiTextContent | string;
  status?: AiStatus;
};

export type AbortSomethingCmd = {
  cmd: "abort-something"; // XXX rename to the thing that will actually get aborted, need to first find the best name for that, will fix later
  cmdId: AiCmdId;
  chatId: ChatId;
};

export type DeleteChatCmd = {
  cmd: "delete-chat";
  cmdId: AiCmdId;
  chatId: ChatId;
};

export type DeleteMessageCmd = {
  cmd: "delete-message";
  cmdId: AiCmdId;
  chatId: ChatId;
  messageId: MessageId;
};

export type ClearChatCmd = {
  cmd: "clear-chat";
  cmdId: AiCmdId;
  chatId: ChatId;
};

export type StreamAnswerCmd = {
  cmd: "stream-answer"; // XXX Should this be "generate-answer" with a "stream?: boolean" option maybe?
  cmdId: AiCmdId;
  inputSource: AiInputSource;
  tools?: AiTool[];
  toolChoice?: ToolChoice;
};

export type GenerateAnswerCmd = {
  cmd: "generate-answer";
  cmdId: AiCmdId;
  inputSource: AiInputSource;
  tools?: AiTool[];
  toolChoice?: ToolChoice;
};

// Union type of all server messages
export type ServerAiMsg =
  | ListChatServerMsg
  | ChatCreatedServerMsg
  | MessageAttachedServerMsg
  | GetMessagesServerMsg
  | StreamMessageStartServerMsg
  | StreamMessagePartServerMsg
  | StreamMessageCompleteServerMsg
  | StreamMessageFailedServerMsg
  | StreamMessageAbortedServerMsg
  | GenerateAnswerResultServerMsg
  | DeleteChatServerMsg
  | DeleteMessageServerMsg
  | ClearChatMessagesServerMsg
  | ErrorServerMsg;

// A client message is always a command to the server
export type ClientAiMsg =
  | GetChatsCmd
  | CreateChatCmd
  | GetMessagesCmd
  | AttachUserMessageCmd
  | AbortSomethingCmd
  | DeleteChatCmd
  | DeleteMessageCmd
  | ClearChatCmd
  | GenerateAnswerCmd
  | StreamAnswerCmd;

export type AiState = {
  // TODO: this will probably get more complicated, supporting multiple requests, etc.
  runs: Map<string, AbortController>;
};

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

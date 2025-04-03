import type { Json } from "../lib/Json";
import type { Relax } from "../lib/Relax";
import type { Brand } from "../lib/utils";

export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

// --------------------------------------------------------------

export type ChatId = Brand<`ch_${string}`, "ChatId">;
export type MessageId = Brand<`msg_${string}`, "MessageId">;
export type AiRequestId = Brand<string, "AiRequestId">;

export enum ClientAiMsgCode {
  // chat management
  LIST_CHATS = 100,
  CREATE_CHAT = 200,
  DELETE_CHAT = 700,

  // message management
  GET_MESSAGES = 300,
  ADD_USER_MESSAGE = 400,
  DELETE_MESSAGE = 800,
  CLEAR_CHAT_MESSAGES = 900,

  // answers
  STREAM_ANSWER = 1000,
  GENERATE_ANSWER = 2000,
  ABORT_RESPONSE = 500,
}

export enum ServerAiMsgCode {
  // chat management
  LIST_CHATS_OK = 101,
  CREATE_CHAT_OK = 201,
  DELETE_CHAT_OK = 701,

  // message management
  GET_MESSAGES_OK = 301,
  ADD_MESSAGE_OK = 401,
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

// Base interface with requestId (shared by both client and server messages)
export interface AiMsgBase {
  readonly requestId: AiRequestId;
}
export interface BaseAnswerMsg extends AiMsgBase {
  tools?: AiTool[];
  toolChoice?: ToolChoice;
}
export interface StatefullMsg {
  chatId: ChatId;
}
export interface StatelessMsg {
  prompt: string;
}

export type AnswerClientMsg = BaseAnswerMsg &
  Relax<StatefullMsg | StatelessMsg>;

export type ToolChoice =
  | "auto"
  | "required"
  | "none"
  | { type: "tool"; toolName: string };

/**
 * Server messages
 */

export type StreamMessageStartServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_START;
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessagePartServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_PART;
  content: {
    type: "text";
    id: string;
    delta: string;
  };
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessageFailedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_FAILED;
  error: string;
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessageAbortedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_ABORTED;
  chatId?: ChatId;
  messageId?: MessageId;
};

export type StreamMessageCompleteServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_COMPLETE;
  content: AiAssistantContent[];
  chatId?: ChatId;
  messageId?: MessageId;
};

export type ErrorServerMsg = {
  type: ServerAiMsgCode.ERROR;
  error: string;
  requestId?: AiRequestId;
};

export type ListChatServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.LIST_CHATS_OK;
  chats: AiChat[];
  nextCursor: Cursor | null;
};

export type ChatCreatedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.CREATE_CHAT_OK;
  chat: AiChat;
};

export type MessageAddedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.ADD_MESSAGE_OK;
  chatId: ChatId;
  messageId: MessageId;
  createdAt: ISODateString;
};

export type GetMessagesServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.GET_MESSAGES_OK;
  chatId: ChatId;
  messages: AiChatMessage[];
  nextCursor: Cursor | null;
};

export type GenerateAnswerResultServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.GENERATE_ANSWER_RESULT;
  content: AiAssistantContent[];
  chatId?: ChatId;
  messageId?: MessageId;
};

export type DeleteChatServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.DELETE_CHAT_OK;
  chatId: ChatId;
};

export type DeleteMessageServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.DELETE_MESSAGE_OK;
  chatId: ChatId;
  messageId: MessageId;
};

export type ClearChatMessagesServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.CLEAR_CHAT_MESSAGES_OK;
  chatId: ChatId;
  messagesCount: number;
};

/**
 * Client messages
 */

export type ListChatClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.LIST_CHATS;
  cursor?: Cursor;
  pageSize?: number;
};

export type NewChatClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.CREATE_CHAT;
  id: ChatId;
  name: string;
  metadata: Record<string, string | string[]>;
};

export type GetMessagesClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.GET_MESSAGES;
  cursor?: Cursor;
  pageSize?: number;
  chatId: ChatId;
};

export type AddMessageClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.ADD_USER_MESSAGE;
  chatId: ChatId;
  content: AiTextContent | string;
  status?: AiStatus;
};

export type AbortResponseClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.ABORT_RESPONSE;
  chatId: ChatId;
};
export type DeleteChatClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.DELETE_CHAT;
  chatId: ChatId;
};

export type DeleteMessageClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.DELETE_MESSAGE;
  chatId: ChatId;
  messageId: MessageId;
};

export type ClearChatMessagesClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.CLEAR_CHAT_MESSAGES;
  chatId: ChatId;
};

export type StreamAnswerClientMsg = AnswerClientMsg & {
  readonly type: ClientAiMsgCode.STREAM_ANSWER;
};

export type GenerateAnswerClientMsg = AnswerClientMsg & {
  readonly type: ClientAiMsgCode.GENERATE_ANSWER;
};

// Union type of all server messages
export type ServerAiMsg =
  | ListChatServerMsg
  | ChatCreatedServerMsg
  | MessageAddedServerMsg
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

// Union type of all client messages
export type ClientAiMsg =
  | ListChatClientMsg
  | NewChatClientMsg
  | GetMessagesClientMsg
  | AddMessageClientMsg
  | AbortResponseClientMsg
  | GenerateAnswerClientMsg
  | DeleteChatClientMsg
  | DeleteMessageClientMsg
  | ClearChatMessagesClientMsg
  | StreamAnswerClientMsg;

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

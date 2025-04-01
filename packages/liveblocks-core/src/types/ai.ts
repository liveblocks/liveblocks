import type { Json } from "../lib/Json";
import type { Brand } from "../lib/utils";

export type AiRequestId = Brand<string, "AiRequestId">;
export type Cursor = Brand<string, "Cursor">;
export type ISODateString = Brand<string, "ISODateString">;

export enum ClientAiMsgCode {
  LIST_CHATS = 100,
  CREATE_CHAT = 200,
  GET_MESSAGES = 300,
  ADD_MESSAGE = 400,
  ABORT_RESPONSE = 500,
  STATELESS_RUN = 600,
  DELETE_CHAT = 700,
  DELETE_MESSAGE = 800,
  CLEAR_CHAT_MESSAGES = 900,
}

export enum ServerAiMsgCode {
  LIST_CHATS_OK = 101,
  CREATE_CHAT_OK = 201,
  GET_MESSAGES_OK = 301,
  ADD_MESSAGE_OK = 401,
  STREAM_MESSAGE_START = 501,
  STREAM_MESSAGE_PART = 502,
  STREAM_MESSAGE_COMPLETE = 503,
  STREAM_MESSAGE_FAILED = 504,
  STREAM_MESSAGE_ABORTED = 505,
  STATELESS_RUN_RESULT = 601,
  DELETE_CHAT_OK = 701,
  DELETE_MESSAGE_OK = 801,
  CLEAR_CHAT_MESSAGES_OK = 901,
  ERROR = 999,
}

// Base interface with requestId (shared by both client and server messages)
export interface AiMsgBase {
  readonly requestId: AiRequestId;
}

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
  chatId: string;
  messageId: string;
};

export type StreamMessagePartServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_PART;
  content: {
    id: string;
    delta: string;
    type: MessageContentType;
  };
  chatId: string;
  messageId: string;
};

export type StreamMessageFailedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_FAILED;
  error: string;
  chatId: string;
  messageId: string;
};

export type StreamMessageAbortedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_ABORTED;
  chatId: string;
  messageId?: string;
};

export type StreamMessageCompleteServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STREAM_MESSAGE_COMPLETE;
  content: AiMessageContent[];
  chatId: string;
  messageId: string;
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
  chatId: string;
  messageId: string;
  createdAt: ISODateString;
};

export type GetMessagesServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.GET_MESSAGES_OK;
  chatId: string;
  messages: AiChatMessage[];
  nextCursor: Cursor | null;
};

export type StatelessRunResultServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STATELESS_RUN_RESULT;
  result: AiMessageContent[];
};

export type DeleteChatServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.DELETE_CHAT_OK;
  chatId: string;
};

export type DeleteMessageServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.DELETE_MESSAGE_OK;
  chatId: string;
  messageId: string;
};

export type ClearChatMessagesServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.CLEAR_CHAT_MESSAGES_OK;
  chatId: string;
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
  chatId?: string;
  name?: string;
  metadata?: Record<string, string | string[]>;
};

export type GetMessagesClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.GET_MESSAGES;
  cursor?: Cursor;
  pageSize?: number;
  chatId: string;
};

export type AddMessageClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.ADD_MESSAGE;
  chatId: string;
  content: AiTextContent | string;
  role?: AiRole;
  status?: AiStatus;
  execute?: boolean;
};

export type AbortResponseClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.ABORT_RESPONSE;
  chatId: string;
};

export type StatelessRunClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.STATELESS_RUN;
  prompt: string;
  tools?: AiTool[];
  toolChoice?: ToolChoice;
};

export type DeleteChatClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.DELETE_CHAT;
  chatId: string;
};

export type DeleteMessageClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.DELETE_MESSAGE;
  chatId: string;
  messageId: string;
};

export type ClearChatMessagesClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.CLEAR_CHAT_MESSAGES;
  chatId: string;
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
  | StatelessRunResultServerMsg
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
  | StatelessRunClientMsg
  | DeleteChatClientMsg
  | DeleteMessageClientMsg
  | ClearChatMessagesClientMsg;

export type AiState = {
  // TODO: this will probably get more complicated, supporting multiple requests, etc.
  runs: Map<string, AbortController>;
};

export type AiChat = {
  id: string;
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
export enum AiStatus {
  THINKING = "thinking",
  RESPONDING = "responding",
  COMPLETE = "complete",
  FAILED = "failed",
  ABORTED = "aborted",
}

export enum AiRole {
  USER = "user",
  ASSISTANT = "assistant",
}

export enum MessageContentType {
  TEXT = "text",
  TOOL_CALL = "tool-call",
}

export interface AiTool {
  name: string;
  description: string;
  parameter_schema: Json;
}

export interface AiContentBase {
  id?: string;
}
export type AiToolContent = AiContentBase & {
  args?: unknown;
  name: string;
  type: MessageContentType.TOOL_CALL;
};

export type AiTextContent = AiContentBase & {
  data: string;
  type: MessageContentType.TEXT;
};

export type AiMessageContent = AiTextContent | AiToolContent;

export type AiUsage = {
  id: string;
  messageId?: string;
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

export type AiMessageBase = {
  id: string;
  status: AiStatus;
  content: AiMessageContent[];
  role: AiRole;
  createdAt: ISODateString;
  deletedAt?: ISODateString;
};

export type UserMessage = AiMessageBase & {
  content: AiTextContent[];
  role: AiRole.USER;
};

export type AssistantMessage = AiMessageBase & {
  role: AiRole.ASSISTANT;
};

export type AiChatMessage = UserMessage | AssistantMessage;

export type AiProviderStreamParams = {
  messageId: string;
  messages: AiChatMessage[];
  tools?: AiTool[];
  tool_choice?: ToolChoice;
  abortSignal?: AbortSignal;
  onStream: (
    type: MessageContentType, // for now only streaming text
    delta: string,
    index: number, // the index in the content array
    contentSnapshot: AiMessageContent[]
  ) => void;
  onComplete: (content: AiMessageContent[], usage?: UsageMetadata) => void;
  onError: (error: Error) => void;
};

export type AiProviderRunParams = {
  prompt: string;
  tools?: AiTool[];
  tool_choice?: ToolChoice;
  abortSignal?: AbortSignal;
};

export type AiProviderRunResult = {
  content: AiMessageContent[];
  usage?: UsageMetadata;
};

export interface AiProvider {
  stream: (params: AiProviderStreamParams) => Promise<string>;
  run: (params: AiProviderRunParams) => Promise<AiProviderRunResult>;
}

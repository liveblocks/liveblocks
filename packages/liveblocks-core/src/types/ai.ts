import type { Json } from "../lib/Json";
import type { Brand } from "../lib/utils";

export enum ClientAiMsgCode {
  LIST_CHATS = 100,
  NEW_CHAT = 200,
  GET_MESSAGES = 300,
  ADD_MESSAGE = 400,
  ABORT_RESPONSE = 500,
  STATELESS_RUN = 600,
}

export enum ServerAiMsgCode {
  LIST_CHATS = 101,
  CHAT_CREATED = 201,
  MESSAGE_ADDED = 301,
  GET_MESSAGES = 401,
  STREAM_MESSAGE_START = 501,
  STREAM_MESSAGE_PART = 502,
  STREAM_MESSAGE_COMPLETE = 503,
  STREAM_MESSAGE_FAILED = 504,
  STREAM_MESSAGE_ABORTED = 505,
  STATELESS_RUN_RESULT = 601,
  ERROR = 900,
}

export type AiRequestId = Brand<string, "aiRequestId">;

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
  type: ServerAiMsgCode.LIST_CHATS;
  chats: AiChat[];
  cursor: { chatId: string; lastMessageAt: string } | null;
};

export type ChatCreatedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.CHAT_CREATED;
  chat: AiChat;
};

export type MessageAddedServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.MESSAGE_ADDED;
  chatId: string;
  messageId: string;
  createdAt: string;
};

export type GetMessagesServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.GET_MESSAGES;
  chatId: string;
  messages: AiChatMessage[];
  cursor: { messageId: string; createdAt: string } | null;
};

export type StatelessRunResultServerMsg = AiMsgBase & {
  type: ServerAiMsgCode.STATELESS_RUN_RESULT;
  result: AiMessageContent[];
};

/**
 * Client messages
 */

export type ListChatClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.LIST_CHATS;
  cursor?: { chatId: string; lastMessageAt: string };
  pageSize?: number;
};

export type NewChatClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.NEW_CHAT;
  chatId?: string;
  name?: string;
  metadata?: Record<string, string | string[]>;
};

export type GetMessagesClientMsg = AiMsgBase & {
  readonly type: ClientAiMsgCode.GET_MESSAGES;
  cursor?: { messageId: string; createdAt: string };
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
  tool_choice?: ToolChoice;
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
  | ErrorServerMsg;

// Union type of all client messages
export type ClientAiMsg =
  | ListChatClientMsg
  | NewChatClientMsg
  | GetMessagesClientMsg
  | AddMessageClientMsg
  | AbortResponseClientMsg
  | StatelessRunClientMsg;

export type AiState = {
  // TODO: this will probably get more complicated, supporting multiple requests, etc.
  runs: Map<string, AbortController>;
};

export type AiChat = {
  id: string;
  name: string;
  metadata: Record<string, string | string[]>;
  createdAt: string; // Sqlite dates are strings
  lastMessageAt?: string; // Optional since some chats might have no messages
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

export type AiMessageBase = {
  id: string;
  status: AiStatus;
  content: AiMessageContent[];
  role: AiRole;
  createdAt: string; // Sqlite dates are strings
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
  onComplete: (content: AiMessageContent[]) => void;
  onError: (error: Error) => void;
};

export type AiProviderRunParams = {
  prompt: string;
  tools?: AiTool[];
  tool_choice?: ToolChoice;
  abortSignal?: AbortSignal;
};

export interface AiProvider {
  stream: (params: AiProviderStreamParams) => void;
  run: (params: AiProviderRunParams) => Promise<AiMessageContent[]>;
}

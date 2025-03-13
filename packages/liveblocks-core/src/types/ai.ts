// TODO: define these better
export enum ClientAiMsgCode {
  LIST_CHATS = 100,
  NEW_CHAT = 200,
  GET_MESSAGES = 300,
  ADD_MESSAGE = 400,
  ABORT_RESPONSE = 500,
}

export enum ServerAiMsgCode {
  LIST_CHATS = 101,
  CHAT_CREATED = 201,
  MESSAGE_ADDED = 301,
  GET_MESSAGES = 401,
  STREAM_MESSAGE_PART = 501,
  STREAM_MESSAGE_COMPLETE = 502,
  STREAM_MESSAGE_FAILED = 503,
  STREAM_MESSAGE_ABORTED = 504,
  ERROR = 600,
}

export type StreamMessagePartServerMsg = {
  type: ServerAiMsgCode.STREAM_MESSAGE_PART;
  text: string;
  chatId: string;
  messageId: string;
};

export type StreamMessageFailedServerMsg = {
  type: ServerAiMsgCode.STREAM_MESSAGE_FAILED;
  error: string;
  chatId: string;
  messageId: string;
};

export type StreamMessageAbortedServerMsg = {
  type: ServerAiMsgCode.STREAM_MESSAGE_ABORTED;
  chatId: string;
  messageId: string;
};

export type StreamMessageCompleteServerMsg = {
  type: ServerAiMsgCode.STREAM_MESSAGE_COMPLETE;
  text: string;
  chatId: string;
  messageId: string;
};

export type ErrorServerMsg = {
  type: ServerAiMsgCode.ERROR;
  error: string;
};

export type ListChatServerMsg = {
  type: ServerAiMsgCode.LIST_CHATS;
  chats: AiChat[];
};

export type ChatCreatedServerMsg = {
  type: ServerAiMsgCode.CHAT_CREATED;
  chatId: string;
  createdAt: string;
};

export type MessageAddedServerMsg = {
  type: ServerAiMsgCode.MESSAGE_ADDED;
  chatId: string;
  messageId: string;
  createdAt: string;
};

export type GetMessagesServerMsg = {
  type: ServerAiMsgCode.GET_MESSAGES;
  messages: AiChatMessage[];
  cursor: { messageId: string; createdAt: string } | null;
};

export type ListChatClientMsg = {
  readonly type: ClientAiMsgCode.LIST_CHATS;
};

export type NewChatClientMsg = {
  readonly type: ClientAiMsgCode.NEW_CHAT;
  chatId?: string;
};

export type GetMessagesClientMsg = {
  readonly type: ClientAiMsgCode.GET_MESSAGES;
  cursor?: { messageId: string; createdAt: string };
  pageSize?: number;
  chatId: string;
};

export type AddMessageClientMsg = {
  readonly type: ClientAiMsgCode.ADD_MESSAGE;
  chatId: string;
  message: string;
  role?: AiRole;
  status?: AiStatus;
};

export type AbortResponseClientMsg = {
  readonly type: ClientAiMsgCode.ABORT_RESPONSE;
  chatId: string;
};

export type ServerAiMsg =
  | ListChatServerMsg
  | ChatCreatedServerMsg
  | MessageAddedServerMsg
  | GetMessagesServerMsg
  | StreamMessagePartServerMsg
  | StreamMessageCompleteServerMsg
  | StreamMessageFailedServerMsg
  | StreamMessageAbortedServerMsg
  | ErrorServerMsg;

export type ClientAiMsg =
  | ListChatClientMsg
  | NewChatClientMsg
  | GetMessagesClientMsg
  | AddMessageClientMsg
  | AbortResponseClientMsg;

export type AiState = {
  // TODO: this will probably get more complicated, supporting multiple requests, etc.
  isThinking: Map<string, boolean>;
};

export type AiChat = {
  id: string;
  name: string;
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

export type AiChatMessage = {
  id: string;
  status: AiStatus;
  message: string;
  role: AiRole;
  createdAt: string; // Sqlite dates are strings
};

export type AiProviderStreamParams = {
  messages: AiChatMessage[];
  onStream: (text: string, textSnapshot: string) => void;
  onComplete: (finalText: string) => void;
  onError: (error: Error) => void;
  onAbort: () => void;
};

export interface AiProvider {
  abort: () => void;
  stream: (params: AiProviderStreamParams) => Promise<void>;
}

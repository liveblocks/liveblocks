import type { Relax } from "../lib/Relax";
import type { BaseMetadata, CommentBody } from "../protocol/Comments";
import type { Patchable } from "./Patchable";

// Shape when originating from a (websocket) connection error
type ConnectionErrorContext = {
  code: number;
  roomId: string;
};

// Shape when originating from a Comments or Notifications API error
type CommentsAPIErrorContext = {
  roomId?: string;
  threadId?: string;
  commentId?: string;
  inboxNotificationId?: string;
  body?: CommentBody;
  metadata?: Patchable<BaseMetadata>;
  emoji?: string;
};

export type LiveblocksErrorContext = Relax<
  | ConnectionErrorContext // from Presence, Storage, or Yjs
  | CommentsAPIErrorContext // from Comments or Notifications
>;

export class LiveblocksError extends Error {
  public readonly context: LiveblocksErrorContext;

  /** @internal */
  private constructor(
    message: string,
    context: LiveblocksErrorContext,
    cause?: Error
  ) {
    // @ts-expect-error This can be removed once we use lib: ["es2022"] in tsconfig
    super(message, { cause });
    this.context = context;
  }

  /** Convenience accessor for error.context.code (if available) */
  get code(): LiveblocksErrorContext["code"] { return this.context.code; } // prettier-ignore
  /** Convenience accessor for error.context.roomId (if available) */
  get roomId(): LiveblocksErrorContext["roomId"] { return this.context.roomId; } // prettier-ignore
  /** Convenience accessor for error.context.threadId (if available) */
  get threadId(): LiveblocksErrorContext["threadId"] { return this.context.threadId; } // prettier-ignore
  /** Convenience accessor for error.context.commentId (if available) */
  get commentId(): LiveblocksErrorContext["commentId"] { return this.context.commentId; } // prettier-ignore

  static fromRoomConnection(
    message: string,
    code: number,
    roomId: string
  ): LiveblocksError {
    return new LiveblocksError(message, { code, roomId });
  }

  /**
   * Creates a LiveblocksError from a generic error, by attaching Liveblocks
   * contextual information like room ID, thread ID, etc.
   */
  static from(
    message: string,
    context: LiveblocksErrorContext,
    cause?: Error
  ): LiveblocksError {
    return new LiveblocksError(message, context, cause);
  }
}

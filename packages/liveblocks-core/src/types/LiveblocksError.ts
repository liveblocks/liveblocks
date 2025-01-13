import type { Relax } from "../lib/Relax";

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
};

type LiveblocksErrorContext = Relax<
  | ConnectionErrorContext // from Presence, Storage, or Yjs
  | CommentsAPIErrorContext // from Comments or Notifications
>;

export class LiveblocksError extends Error {
  public readonly context: LiveblocksErrorContext;

  /** @internal */
  private constructor(
    message: Error | string,
    context: LiveblocksErrorContext,
    cause?: Error
  ) {
    const msg = typeof message === "string" ? message : String(message);
    // @ts-expect-error This can be removed once we use lib: ["es2022"] in tsconfig
    super(msg, { cause });
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
  static fromCommentsAPI(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    error: Error | unknown,
    context: CommentsAPIErrorContext
  ): LiveblocksError {
    const err = error instanceof Error ? error : new Error(String(error));
    return new LiveblocksError(
      err,
      context,
      error instanceof Error ? error : undefined
    );
  }
}

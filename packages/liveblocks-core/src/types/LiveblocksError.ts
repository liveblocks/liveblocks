import type { Relax } from "../lib/Relax";

type LiveblocksErrorContext = Relax<
  // When thrown from a socket connection error
  | {
      code: number;
      roomId: string;
    }
  // When thrown from trying to mutate Comments or Notifications
  | {
      roomId?: string;
      threadId?: string;
      commentId?: string;
      cause?: Error;
    }
>;

export class LiveblocksError extends Error {
  context: LiveblocksErrorContext;

  /** @internal */
  private constructor(message: string, context: LiveblocksErrorContext) {
    super(message);
    this.context = context;
    if (context.cause) {
      // @ts-expect-error - Error will have `cause` property eventually
      this.cause = context.cause;
    }
  }

  get code(): LiveblocksErrorContext["code"] { return this.context.code; } // prettier-ignore
  get roomId(): LiveblocksErrorContext["roomId"] { return this.context.roomId; } // prettier-ignore
  get threadId(): LiveblocksErrorContext["threadId"] { return this.context.threadId; } // prettier-ignore
  get commentId(): LiveblocksErrorContext["commentId"] { return this.context.commentId; } // prettier-ignore

  static fromConnError(
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
  static fromError(
    error: Error | unknown,
    context: {
      roomId: string | undefined;
      threadId: string | undefined;
      commentId: string | undefined;
    }
  ): LiveblocksError {
    const err = error instanceof Error ? error : new Error(String(error));
    return new LiveblocksError(err.message, {
      ...context,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // XXX Still need this or not?
  // static fromCommentsAPI(
  //   message: string,
  //   context: {
  //     roomId?: string;
  //     threadId?: string;
  //     commentId?: string;
  //     cause?: Error;
  //   }
  // ): LiveblocksError {
  //   return new LiveblocksError(message, context);
  // }
}

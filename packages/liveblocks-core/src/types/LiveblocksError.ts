type LiveblocksErrorContext = {
  code: number;
  roomId: string;
};

export class LiveblocksError extends Error {
  context: LiveblocksErrorContext;

  /** @internal */
  private constructor(message: string, context: LiveblocksErrorContext) {
    super(message);
    this.context = context;
  }

  get code(): number | undefined { return this.context.code; } // prettier-ignore
  get roomId(): string | undefined { return this.context.roomId; } // prettier-ignore

  static fromConnError(
    message: string,
    code: number,
    roomId: string
  ): LiveblocksError {
    return new LiveblocksError(message, { code, roomId });
  }
}

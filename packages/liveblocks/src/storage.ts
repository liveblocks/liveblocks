import { Doc as Doc } from "./doc";
import {
  InitialDocumentStateMessage,
  Op,
  ServerMessage,
  ServerMessageType,
} from "./live";

// Internal dependency mess between room and storage. Still need to figure out if room has a storage or if the Storage is going to use a room
export default class Storage {
  private _doc: Doc | null = null;

  private _getInitialStatePromise: Promise<void> | null = null;
  private _getInitialStateResolver: (() => void) | null = null;

  constructor(
    private options: {
      fetchStorage: () => void;
      getConnectionId: () => number;
      defaultRoot: { [key: string]: any };
      dispatch: (ops: Op[]) => void;
    }
  ) {}

  private createDocFromMessage(message: InitialDocumentStateMessage) {
    this._doc = Doc.load(
      message.items,
      this.options.getConnectionId(),
      this.options.dispatch
    );

    for (const key in this.options.defaultRoot) {
      if (this._doc.root.get(key) == null) {
        this._doc.root.set(key, this.options.defaultRoot[key]);
      }
    }
  }

  async getDocument<TRoot>(): Promise<Doc<TRoot>> {
    if (this._doc) {
      return this._doc as Doc<TRoot>;
    }

    if (this._getInitialStatePromise == null) {
      this.options.fetchStorage();
      this._getInitialStatePromise = new Promise(
        (resolve) => (this._getInitialStateResolver = resolve)
      );
    }

    await this._getInitialStatePromise;

    return this._doc! as Doc<TRoot>;
  }

  async onMessage(message: ServerMessage) {
    switch (message.type) {
      case ServerMessageType.InitialStorageState: {
        this.createDocFromMessage(message);
        this._getInitialStateResolver?.();
        break;
      }
      case ServerMessageType.UpdateStorage: {
        this._doc?.applyRemoteOperations(message.ops);
        break;
      }
    }
  }

  undo() {
    this._doc?.undo();
  }

  redo() {
    this._doc?.redo();
  }
}

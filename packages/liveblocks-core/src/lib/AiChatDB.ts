import type { AiChat, AiChatsQuery, ISODateString } from "../types/ai";
import { MutableSignal } from "./signals";
import { SortedList } from "./SortedList";

export class AiChatDB {
  #byId: Map<string, AiChat>; // A map of chat id to chat details
  #chats: SortedList<AiChat>; // Sorted list of chats, most recent first

  public readonly signal: MutableSignal<this>;

  constructor() {
    this.#byId = new Map();
    this.#chats = SortedList.from<AiChat>([], (c1, c2) => {
      // Sort by 'lastMessageAt' if available, otherwise 'createdAt' (most recent first)
      const d2 = c2.lastMessageAt ?? c2.createdAt;
      const d1 = c1.lastMessageAt ?? c1.createdAt;
      return d2 < d1 ? true : d2 === d1 ? c2.id < c1.id : false;
    });

    this.signal = new MutableSignal(this);
  }

  public get(chatId: string): AiChat | undefined {
    return this.#byId.get(chatId);
  }

  public markDeleted(chatId: string): void {
      const chat = this.#byId.get(chatId);
      if (chat === undefined || chat.deletedAt !== undefined) return;
      this.upsert({ ...chat, deletedAt: new Date().toISOString() as ISODateString });
  }

  public upsert(chat: AiChat): void {
    this.signal.mutate(() => {
      // If the chat already exists, remove it before deciding whether to add the incoming one
      const existingThread = this.#byId.get(chat.id);
      if (existingThread !== undefined) {
        if (existingThread.deletedAt !== undefined) return false;

        this.#chats.remove(existingThread);
        this.#byId.delete(existingThread.id);
      }

      // We only add non-deleted chats to the chat list
      if (chat.deletedAt === undefined) {
        this.#chats.add(chat);
      }
      this.#byId.set(chat.id, chat);
      return true;
    })
  }

  public findMany(query: AiChatsQuery): AiChat[] {
    return Array.from(
      this.#chats.filter((chat) => {
        // Exclude deleted chats
        if (chat.deletedAt) return false;

        // If metadata query is not provided, include all chats
        if (query.metadata === undefined) return true;

        for (const [key, value] of Object.entries(query.metadata)) {
          // If the metadata key is a string, check for an exact match against the chat's metadata
          if (typeof value === "string") {
            if (chat.metadata[key] !== value) return false;
          }
          // If the metadata key is an array, ensure all values are present in the chat's metadata array
          else {
            const chatValue = chat.metadata[key];
            if (
              !Array.isArray(chatValue) ||
              !value.every((v) => chatValue.includes(v))
            ) {
              return false;
            }
          }
        }

        return true;
      })
    );
  }
}

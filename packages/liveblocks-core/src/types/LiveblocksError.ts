import { assertNever } from "../lib/assert";
import type { Relax } from "../lib/Relax";
import type { BaseMetadata, CommentBody } from "../protocol/Comments";
import type { Patchable } from "./Patchable";

// All possible error originating from using Presence, Storage, or Yjs

type AiConnectionErrorContext = {
  type: "AI_CONNECTION_ERROR";
  code: -1 | 4001 | (number & {}); // eslint-disable-line @typescript-eslint/ban-types
};

type RoomConnectionErrorContext = {
  type: "ROOM_CONNECTION_ERROR";
  code: -1 | 4001 | 4005 | 4006 | (number & {}); // eslint-disable-line @typescript-eslint/ban-types
  roomId: string;
};

type LargeMessageErrorContext = {
  type: "LARGE_MESSAGE_ERROR";
};

// All possible errors originating from using Comments or Notifications
type CommentsOrNotificationsErrorContext =
  | {
      type: "CREATE_THREAD_ERROR";
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
      metadata: BaseMetadata;
    }
  | {
      type: "DELETE_THREAD_ERROR";
      roomId: string;
      threadId: string;
    }
  | {
      type: "EDIT_THREAD_METADATA_ERROR";
      roomId: string;
      threadId: string;
      metadata: Patchable<BaseMetadata>;
    }
  | {
      type:
        | "MARK_THREAD_AS_RESOLVED_ERROR"
        | "MARK_THREAD_AS_UNRESOLVED_ERROR"
        | "SUBSCRIBE_TO_THREAD_ERROR"
        | "UNSUBSCRIBE_FROM_THREAD_ERROR";
      roomId: string;
      threadId: string;
    }
  | {
      type: "CREATE_COMMENT_ERROR" | "EDIT_COMMENT_ERROR";
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
    }
  | {
      type: "DELETE_COMMENT_ERROR";
      roomId: string;
      threadId: string;
      commentId: string;
    }
  | {
      type: "ADD_REACTION_ERROR" | "REMOVE_REACTION_ERROR";
      roomId: string;
      threadId: string;
      commentId: string;
      emoji: string;
    }
  | {
      type: "MARK_INBOX_NOTIFICATION_AS_READ_ERROR";
      inboxNotificationId: string;
      roomId?: string;
    }
  | {
      type: "DELETE_INBOX_NOTIFICATION_ERROR";
      inboxNotificationId: string;
    }
  | {
      type:
        | "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR"
        | "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR";
    }
  | {
      type: "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR";
      roomId: string;
    }
  | {
      type: "UPDATE_NOTIFICATION_SETTINGS_ERROR";
    };

export type LiveblocksErrorContext = Relax<
  | RoomConnectionErrorContext // from Presence, Storage, or Yjs
  | CommentsOrNotificationsErrorContext // from Comments or Notifications or UserNotificationSettings
  | AiConnectionErrorContext // from AI
  | LargeMessageErrorContext // whena  message is too large
>;

export class LiveblocksError extends Error {
  public readonly context: LiveblocksErrorContext;

  constructor(message: string, context: LiveblocksErrorContext, cause?: Error) {
    super(message, { cause });
    this.context = context;
    this.name = "LiveblocksError";
  }

  /** Convenience accessor for error.context.roomId (if available) */
  get roomId(): LiveblocksErrorContext["roomId"] {
    return this.context.roomId;
  }

  /** @internal Use `context.code` instead, to enable type narrowing */
  get code(): LiveblocksErrorContext["code"] {
    return this.context.code;
  }

  /**
   * Creates a LiveblocksError from a generic error, by attaching Liveblocks
   * contextual information like room ID, thread ID, etc.
   */
  static from(context: LiveblocksErrorContext, cause?: Error): LiveblocksError {
    return new LiveblocksError(
      defaultMessageFromContext(context),
      context,
      cause
    );
  }
}

/**
 * Return a default, human-friendly error message for each possible error.
 */
function defaultMessageFromContext(context: LiveblocksErrorContext): string {
  // prettier-ignore
  switch (context.type) {
      case "ROOM_CONNECTION_ERROR": {
        switch (context.code) {
          case 4001: return "Not allowed to connect to the room";
          case 4005: return "Room is already full";
          case 4006: return "Kicked out of the room, because the room ID changed";
          default:   return "Could not connect to the room";
        }
      }

    case "AI_CONNECTION_ERROR": {
      switch (context.code) {
        case 4001: return "Not allowed to connect to ai";
        default:   return "Could not connect to the room";
      }
    }

    case "CREATE_THREAD_ERROR": return "Could not create new thread";
    case "DELETE_THREAD_ERROR": return "Could not delete thread";
    case "EDIT_THREAD_METADATA_ERROR": return "Could not edit thread metadata";
    case "MARK_THREAD_AS_RESOLVED_ERROR": return "Could not mark thread as resolved";
    case "MARK_THREAD_AS_UNRESOLVED_ERROR": return "Could not mark thread as unresolved";
    case "SUBSCRIBE_TO_THREAD_ERROR": return "Could not subscribe to thread";
    case "UNSUBSCRIBE_FROM_THREAD_ERROR": return "Could not unsubscribe from thread";
    case "CREATE_COMMENT_ERROR": return "Could not create new comment";
    case "EDIT_COMMENT_ERROR": return "Could not edit comment";
    case "DELETE_COMMENT_ERROR": return "Could not delete comment";
    case "ADD_REACTION_ERROR": return "Could not add reaction";
    case "REMOVE_REACTION_ERROR": return "Could not remove reaction";
    case "MARK_INBOX_NOTIFICATION_AS_READ_ERROR": return "Could not mark inbox notification as read";
    case "DELETE_INBOX_NOTIFICATION_ERROR": return "Could not delete inbox notification";
    case "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR": return "Could not mark all inbox notifications as read";
    case "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR": return "Could not delete all inbox notifications";
    case "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR": return "Could not update room subscription settings";
    case "UPDATE_NOTIFICATION_SETTINGS_ERROR": return "Could not update notification settings";
    case "LARGE_MESSAGE_ERROR": return "Could not send large message";

    default:
      return assertNever(context, "Unhandled case");
  }
}

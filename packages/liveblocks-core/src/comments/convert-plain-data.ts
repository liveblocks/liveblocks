import type { BaseMetadata } from "../types/BaseMetadata";
import type { CommentData, CommentDataPlain } from "../types/CommentData";
import type {
  CommentUserReaction,
  CommentUserReactionPlain,
} from "../types/CommentReaction";
import type {
  PartialInboxNotificationData,
  PartialInboxNotificationDataPlain,
} from "../types/InboxNotificationData";
import type { ThreadData, ThreadDataPlain } from "../types/ThreadData";

/**
 * Converts a plain comment data object (usually returned by the API) to a comment data object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain comment data object (usually returned by the API)
 * @returns The rich comment data object that can be used by the client.
 */
export function convertToCommentData(data: CommentDataPlain): CommentData {
  const editedAt = data.editedAt ? new Date(data.editedAt) : undefined;
  const createdAt = new Date(data.createdAt);
  const reactions = data.reactions.map((reaction) => ({
    ...reaction,
    createdAt: new Date(reaction.createdAt),
  }));

  if (data.body) {
    return {
      ...data,
      reactions,
      createdAt,
      editedAt,
    };
  } else {
    const deletedAt = new Date(data.deletedAt);
    return {
      ...data,
      reactions,
      createdAt,
      editedAt,
      deletedAt,
    };
  }
}

/**
 * Converts a plain thread data object (usually returned by the API) to a thread data object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain thread data object (usually returned by the API)
 * @returns The rich thread data object that can be used by the client.
 */
export function convertToThreadData<
  TThreadMetadata extends BaseMetadata = never,
>(data: ThreadDataPlain<TThreadMetadata>): ThreadData<TThreadMetadata> {
  const updatedAt = data.updatedAt ? new Date(data.updatedAt) : undefined;
  const createdAt = new Date(data.createdAt);

  const comments = data.comments.map((comment) =>
    convertToCommentData(comment)
  );

  return {
    ...data,
    createdAt,
    updatedAt,
    comments,
  };
}

/**
 * Converts a plain comment reaction object (usually returned by the API) to a comment reaction object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain comment reaction object (usually returned by the API)
 * @returns The rich comment reaction object that can be used by the client.
 */
export function convertToCommentUserReaction(
  data: CommentUserReactionPlain
): CommentUserReaction {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  };
}

/**
 * Converts a plain partial inbox notification data object (usually returned by the API) to a partial inbox notification data object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain partial inbox notification data object (usually returned by the API)
 * @returns The rich partial inbox notification data object that can be used by the client.
 */
export function convertToPartialInboxNotificationData(
  data: PartialInboxNotificationDataPlain
): PartialInboxNotificationData {
  const notifiedAt = new Date(data.notifiedAt);
  const readAt = data.readAt ? new Date(data.readAt) : null;

  return {
    ...data,
    notifiedAt,
    readAt,
  };
}

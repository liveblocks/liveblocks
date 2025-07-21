import type {
  BaseMetadata,
  CommentData,
  CommentDataPlain,
  CommentUserReaction,
  CommentUserReactionPlain,
  ThreadData,
  ThreadDataPlain,
  ThreadDeleteInfo,
  ThreadDeleteInfoPlain,
} from "./protocol/Comments";
import type { GroupData, GroupDataPlain } from "./protocol/Groups";
import type {
  InboxNotificationData,
  InboxNotificationDataPlain,
  InboxNotificationDeleteInfo,
  InboxNotificationDeleteInfoPlain,
} from "./protocol/InboxNotifications";
import type {
  SubscriptionData,
  SubscriptionDataPlain,
  SubscriptionDeleteInfo,
  SubscriptionDeleteInfoPlain,
  UserSubscriptionData,
  UserSubscriptionDataPlain,
} from "./protocol/Subscriptions";

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
export function convertToThreadData<M extends BaseMetadata>(
  data: ThreadDataPlain<M>
): ThreadData<M> {
  const createdAt = new Date(data.createdAt);
  const updatedAt = new Date(data.updatedAt);

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
 * Converts a plain inbox notification data object (usually returned by the API) to an inbox notification data object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain inbox notification data object (usually returned by the API)
 * @returns The rich inbox notification data object that can be used by the client.
 */
export function convertToInboxNotificationData(
  data: InboxNotificationDataPlain
): InboxNotificationData {
  const notifiedAt = new Date(data.notifiedAt);
  const readAt = data.readAt ? new Date(data.readAt) : null;

  if ("activities" in data) {
    const activities = data.activities.map((activity) => ({
      ...activity,
      createdAt: new Date(activity.createdAt),
    }));

    return {
      ...data,
      notifiedAt,
      readAt,
      activities,
    };
  }

  return {
    ...data,
    notifiedAt,
    readAt,
  };
}

/**
 * Converts a plain subscription data object (usually returned by the API) to a subscription data object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain subscription data object (usually returned by the API)
 * @returns The rich subscription data object that can be used by the client.
 */
export function convertToSubscriptionData(
  data: SubscriptionDataPlain
): SubscriptionData {
  const createdAt = new Date(data.createdAt);

  return {
    ...data,
    createdAt,
  };
}

/**
 * Converts a plain user subscription data object (usually returned by the API) to a user subscription data object that can be used by the client.
 * This is necessary because the plain data object stores dates as ISO strings, but the client expects them as Date objects.
 * @param data The plain user subscription data object (usually returned by the API)
 * @returns The rich user subscription data object that can be used by the client.
 */
export function convertToUserSubscriptionData(
  data: UserSubscriptionDataPlain
): UserSubscriptionData {
  const createdAt = new Date(data.createdAt);

  return {
    ...data,
    createdAt,
  };
}

export function convertToThreadDeleteInfo(
  data: ThreadDeleteInfoPlain
): ThreadDeleteInfo {
  const deletedAt = new Date(data.deletedAt);

  return {
    ...data,
    deletedAt,
  };
}

export function convertToInboxNotificationDeleteInfo(
  data: InboxNotificationDeleteInfoPlain
): InboxNotificationDeleteInfo {
  const deletedAt = new Date(data.deletedAt);

  return {
    ...data,
    deletedAt,
  };
}

export function convertToSubscriptionDeleteInfo(
  data: SubscriptionDeleteInfoPlain
): SubscriptionDeleteInfo {
  const deletedAt = new Date(data.deletedAt);

  return {
    ...data,
    deletedAt,
  };
}

export function convertToGroupData(data: GroupDataPlain): GroupData {
  const createdAt = new Date(data.createdAt);
  const updatedAt = new Date(data.updatedAt);
  const members = data.members.map((member) => ({
    ...member,
    addedAt: new Date(member.addedAt),
  }));

  return {
    ...data,
    createdAt,
    updatedAt,
    members,
  };
}

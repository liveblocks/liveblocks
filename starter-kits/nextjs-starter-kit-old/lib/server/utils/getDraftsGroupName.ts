export const DRAFTS_PREFIX = "__drafts-group__";

/**
 * Drafts are stored as a group that uses the user's id
 * @param userId
 */
export function getDraftsGroupName(userId: string) {
  return `${DRAFTS_PREFIX}${userId}`;
}

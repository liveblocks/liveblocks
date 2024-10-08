/**
 * Comparison function to be used in .sort() which will sort threads from
 * oldest to newest, based on their creation dates.
 * Orders by "createdAt ASC".
 */
export function byFirstCreated(
  a: { createdAt: Date },
  b: { createdAt: Date }
): number {
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Defines if a thread is newer (i.e. created more recently).
 * Doesn't factor in when the thread was last updated.
 */
export function isNewer(
  a: { createdAt: Date },
  b: { createdAt: Date }
): boolean {
  return byFirstCreated(a, b) > 0;
}

/**
 * Defines if a thread is more recently updated. Doesn't factor in the original
 * creation date for these threads.
 */
// XXX Anywhere we use this helper, we should likely call .upsertIfMoreRecent() instead
export function isMoreRecentlyUpdated(
  a: { createdAt: Date; updatedAt: Date },
  b: { createdAt: Date; updatedAt: Date }
): boolean {
  return byMostRecentlyUpdated(a, b) < 0;
}

/**
 * Comparison function to be used in .sort() which will sort threads from
 * newest to oldest, based on their last-updated dates.
 * Orders by "updatedAt DESC".
 *
 * IMPORTANT!
 * This is *NOT* simply the inverse of compareThreads!
 */
export function byMostRecentlyUpdated(
  a: { updatedAt: Date },
  b: { updatedAt: Date }
): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

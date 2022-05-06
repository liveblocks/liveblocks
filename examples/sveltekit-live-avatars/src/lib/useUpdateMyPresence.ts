import type { Presence } from "@liveblocks/client";
import { useMyPresence } from "./useMyPresence";

/**
 * Works similarly to `liveblocks-react` useUpdateMyPresence
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useUpdateMyPresence
 *
 * const updateMyPresence = useUpdateMyPresence()
 * updateMyPresence({ name: 'Chris' })
 *
 *
 * Can also import useMyPresence instead and use .update() instead:
 *
 * const myPresence = useMyPresence()
 * myPresence.update({ name: 'Chris' })
 */
export function useUpdateMyPresence<T extends Presence = Presence>() {
  const presence = useMyPresence<T>();

  return (updatedPresence: T) => presence.update(updatedPresence);
}

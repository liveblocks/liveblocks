import type { Presence } from '@liveblocks/client'
import { onDestroy } from 'svelte'
import { writable } from 'svelte/store'
import { useRoom } from './useRoom'

/**
 * Works similarly to `liveblocks-react` useMyPresence
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useMyPresence
 *
 * The main difference is that it returns a custom Svelte store:
 * const presence = useMyPresence()
 * presence.update({ name: 'Chris })
 * console.log($presence.name)
 * <div>{$presence.count}</div>
 *
 * USAGE NOTE:
 * This is a custom Svelte store, `set` does nothing, only `update`.
 * `update` does NOT take a function like regular Svelte stores,
 * it takes an object and works like `useUpdateMyPresence` in Liveblocks
 */

export function useMyPresence (): any {
  const room = useRoom()

  if (!room) {
    throw new Error('Use RoomProvider as parent with id prop')
  }

  const { subscribe, set } = writable<Presence>()

  function update (newPresence) {
    room.updatePresence(newPresence)
  }

  const unsubscribePresence = room.subscribe('my-presence', presence => {
    set(presence)
  })

  onDestroy(() => {
    unsubscribePresence()
  })

  return {
    subscribe,
    update
  }
}

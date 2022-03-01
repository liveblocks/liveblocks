import type { Others } from '@liveblocks/client'
import { onDestroy } from 'svelte'
import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'
import { useRoom } from './useRoom'

/**
 * Works similarly to `liveblocks-react` useOthers
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useOthers
 *
 * This uses a vue ref so make sure to use .value
 * const others = useOthers()
 * console.log(others.value)
 */
export function useOthers (): Writable<Others> {
  const room = useRoom()

  if (!room) {
    throw new Error('Use RoomProvider as parent with id prop')
  }

  const others = writable<Others>()

  const unsubscribe = room.subscribe('others', newOthers => {
    others.set(newOthers)
  })

  onDestroy(unsubscribe)

  return others
}

import { authorize } from '@liveblocks/node'

const API_KEY = import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY as string

export async function post ({ request }) {
  const { room } = await request.json()

  if (!API_KEY || !room) {
    return {
      status: 403
    }
  }

  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: room,
    secret: API_KEY,
    userInfo: {
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      picture: `/assets/avatars/${Math.floor(Math.random() * 10)}.png`
    }
  })

  return {
    status: response.status,
    body: response.body
  }
}

const NAMES = [
  'Charlie Layne',
  'Mislav Abha',
  'Tatum Paolo',
  'Anjali Wanda',
  'Jody Hekla',
  'Emil Joyce',
  'Jory Quispe',
  'Quinn Elton'
]

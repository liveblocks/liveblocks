import { authorize } from "@liveblocks/node";

const API_KEY = import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY as string;

export async function post({ request }) {
  const { room } = await request.json();

  if (!API_KEY || !room) {
    return {
      status: 403,
    };
  }

  const response = await authorize({
    room: room,
    secret: API_KEY,
  });

  return {
    status: response.status,
    body: response.body,
  };
}

import type { NextApiRequest, NextApiResponse } from "next";
import seedrandom from "seedrandom";

export const USERS = [
  {
    id: "user-a",
    name: "Charlie Layne",
  },
  {
    id: "user-azerty",
    name: "Mislav Abha",
  },
  {
    id: "user-hello-world",
    name: "Tatum Paolo",
  },
  {
    id: "user-abcd",
    name: "Anjali Wanda",
  },
  {
    id: "user-liveblocks",
    name: "Jody Hekla",
  },
  {
    id: "user-hello",
    name: "Emil Joyce",
  },
  {
    id: "user-qwerty",
    name: "Jory Quispe",
  },
  {
    id: "user-lorem",
    name: "Quinn Elton",
  },
];

export function randomInInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export default async function userId(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = req.query.userId;

  if (typeof userId !== "string") {
    return res.status(400).end();
  }

  const random = seedrandom(String(userId))();
  const userIndex = Math.floor(random * USERS.length);
  const avatarIndex = Math.floor(random * 30);

  // Simulate a user lookup
  await wait(randomInInterval(10, 100));

  return res.status(200).json({
    name: USERS[userIndex].name,
    avatar: `https://liveblocks.io/avatars/avatar-${avatarIndex}.png`,
  });
}

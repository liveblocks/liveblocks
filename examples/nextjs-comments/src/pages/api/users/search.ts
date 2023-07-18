import type { NextApiRequest, NextApiResponse } from "next";

import { randomInInterval, USERS, wait } from "./[userId]";

export default async function search(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const query = req.query.query;

  if (typeof query !== "string") {
    return USERS.map(({ id }) => id);
  }

  const filteredUsers = USERS.filter(({ name }) =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  // Simulate a user search
  await wait(randomInInterval(10, 100));

  return res.status(200).json(filteredUsers.map(({ id }) => id));
}

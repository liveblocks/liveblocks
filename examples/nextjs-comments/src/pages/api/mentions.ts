import type { NextApiRequest, NextApiResponse } from "next";
import { NAMES } from "../../database";

interface User {
  id: string;
  name: string;
}

type UserApiRequest = NextApiRequest & {
  query: {
    text?: string;
  };
};

export default async function user(req: UserApiRequest, res: NextApiResponse) {
  const {
    query: { text },
  } = req;

  const userIndices = [...NAMES.keys()];
  const users = userIndices.map(
    (userIndex) => ({ id: `user-${userIndex}`, name: NAMES[userIndex] }) as User
  );
  const filteredUserIds = users
    .filter((user) =>
      text ? user.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

  return res.json(filteredUserIds);
}

import type { NextApiRequest, NextApiResponse } from "next";
import { NAMES } from "../../database";

interface User {
  id: string;
  name: string;
}

type UserApiRequest = NextApiRequest & {
  query: {
    search?: string;
  };
};

export default async function user(req: UserApiRequest, res: NextApiResponse) {
  const {
    query: { search },
  } = req;

  const userIndices = [...NAMES.keys()];
  const users = userIndices.map(
    (userIndex) => ({ id: `user-${userIndex}`, name: NAMES[userIndex] }) as User
  );
  const filteredUserIds = users
    .filter((user) =>
      search ? user.name.toLowerCase().includes(search.toLowerCase()) : true
    )
    .map((user) => user.id);

  return res.json(filteredUserIds);
}

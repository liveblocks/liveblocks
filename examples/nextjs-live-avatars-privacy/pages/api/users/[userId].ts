import { NextApiRequest, NextApiResponse } from "next";
import users from "../../../users";

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.userId;

  if (typeof userId !== "string") {
    return res.status(400).end();
  }

  const user = users[userId];

  if (user == null) {
    return res.status(404).end();
  }

  return res.status(200).json(user);
}

import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "./auth/getServerSession";
import { User } from "../../src/types";


const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  const session = await getServerSession(req, res);
    // Anonymous user info
  const anonymousUser= {session: {
    user:{
    name: "Anonymous",
    email: "none",
    image: "N/A"
      }
    } 
  }

    console.log(anonymousUser)


  const {
    name,
    email,
    image
    } = session?.user?? anonymousUser;

  console.log("***The Session***",session)

  // We're generating random users and avatars here.
  // In a real-world scenario, this is where you'd assign the
  // user based on their real identity from your auth provider.
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: req.body.room,
    secret: API_KEY,
    userInfo: {
      name: session.user.name,
      imageUrl: `${session.user.image}.png`,
    },
  });
  return res.status(response.status).end(response.body);
}

const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];
import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from 'next-auth'
import  {Session}  from "next-auth";
import GoogleProvider from "next-auth/providers/google"

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export const authOptions = {
  // callbacks: {
  //   session({ session:, token, user }) {
  //     return session // The return type will match the one returned in `useSession()`
  //   },
  // },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  secret: process.env.JWT_SECRET
}

export default NextAuth(authOptions)

// export default async function auth(req: NextApiRequest, res: NextApiResponse) {
//   if (!API_KEY) {
//     return res.status(403).end();
//   }
//   // We're generating random users and avatars here.
//   // In a real-world scenario, this is where you'd assign the
//   // user based on their real identity from your auth provider.
//   // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
//   const response = await authorize({
//     room: req.body.room,
//     secret: API_KEY,
//     userInfo: {
//       name: NAMES[Math.floor(Math.random() * NAMES.length)],
//       imageUrl: `https://liveblocks.io/avatars/avatar-${Math.floor(
//         Math.random() * 30
//       )}.png`,
//     },
//   });
//   return res.status(response.status).end(response.body);
// }

// const NAMES = [
//   "Charlie Layne",
//   "Mislav Abha",
//   "Tatum Paolo",
//   "Anjali Wanda",
//   "Jody Hekla",
//   "Emil Joyce",
//   "Jory Quispe",
//   "Quinn Elton",
// ];

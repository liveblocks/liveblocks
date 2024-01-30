import { GetServerSidePropsContext } from "next";
import {
  FetchApiResult,
  GetLiveUsersProps,
  LiveUsersResponse,
} from "../../../types";
import { getServerSession } from "../auth";
import { getActiveUsersInRooms } from "../liveblocks";

/**
 * Retrieve the current live users in documents
 * Select documents by posting an array of documentIds in the body
 * Only allow if authorized with NextAuth
 *
 * @param req
 * @param res
 * @param documentIds - A list of document ids to select
 */
export async function getLiveUsers(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"],
  { documentIds }: GetLiveUsersProps
): Promise<FetchApiResult<LiveUsersResponse[]>> {
  // Get session and active users
  const [session, activeUsers] = await Promise.all([
    getServerSession(req, res),
    getActiveUsersInRooms({ roomIds: documentIds }),
  ]);

  // Check user is logged in
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to access active users",
      },
    };
  }

  // Check active users returned successfully
  const { data, error } = activeUsers;

  if (error) {
    return { error };
  }

  // If you'd like to filter which data about users is sent, do so here
  // Example - only name is sent as live user data:
  // data.forEach(room => room.users = room.users.map(
  //   (user: ActiveUser) => ({ name: user.info.name })
  // ))

  return { data };
}

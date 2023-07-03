import { Liveblocks } from "./src";

// -----------------------------------------------------------------------

let __getUserFromReq__: any;
let __getUserGroups__: any;
let __checkHasAccess__: any;
let __checkIsMemberOfTeam__: any;
let __checkIsMemberOfOrg__: any;

// -----------------------------------------------------------------------

const liveblocks = new Liveblocks({
  // TODO: Replace this key with your secret key provided at
  // https://liveblocks.io/dashboard/projects/{projectId}/apikeys
  secret: "sk_prod_xxxxxxxxxxxxxxxxxxxxxxxx",
});

// req.body.room    // string            // 1.1
//     XOR
// req.body.room    // string | null     // 1.2

/**
 * Typical usage pattern 1:
 * Full access to just one room.
 */
export async function authExample1(req, res) {
  const user = __getUserFromReq__(req);

  const session = liveblocks.session(
    user.id
    // { userInfo: user.metadata },
  );
  if (req.body.room && __checkHasAccess__(user, req.body.room)) {
    session.allow(req.body.room, session.FULL_ACCESS);
  }

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
}

/**
 * Typical usage pattern 2:
 * Full access based on team/org prefix (potentially looking at req.body.room to know _which_ prefix to grant).
 */
export async function authExample2(req, res) {
  const user = __getUserFromReq__(req);

  const session = liveblocks.session(user.id, { userInfo: user.metadata });
  if (req.body.room) {
    // Suppose this application organizes their Liveblocks rooms by keys
    // structured like `<team>:<room>`.
    // We can then use the passed-in requested room to infer which team to
    // check membership for.
    const [team, _] = req.body.room.split(":");
    if (__checkIsMemberOfTeam__(user, team)) {
      // If the user is a member of this team, don't just grant full access to
      // the request room, but to _all_ of the team's rooms, using a prefix
      // pattern.
      session.allow(`${team}:*`, session.FULL_ACCESS);
    }
  }

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
}

/**
 * Typical usage pattern 3:
 * Full access to one specific room, and read-only access to team rooms.
 */
export async function authExample3(req, res) {
  const user = __getUserFromReq__(req);

  const session = liveblocks.session(user.id, { userInfo: user.metadata });
  if (req.body.room) {
    // Suppose this application organizes their Liveblocks rooms by keys
    // structured like `<org>:<team>:<room>`.
    // We can then use the passed-in requested room to infer which team to
    // check membership for.
    const [org, team, _] = req.body.room.split(":");
    if (__checkIsMemberOfOrg__(user, org)) {
      session.allow(`${org}:*`, session.READ_ACCESS);
    }
    if (__checkIsMemberOfTeam__(user, team)) {
      session.allow(`${team}:*`, session.FULL_ACCESS);
    }
  }

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
}

/**
 * Typical usage pattern 4:
 * "As-configured", deferring to whatever fine-grained permissions have been
 * configured through the Liveblocks REST API.
 */
export async function authExample4(req, res) {
  const user = __getUserFromReq__(req);
  const groups = __getUserGroups__(user);

  const { status, body } = await liveblocks.identifyUser(
    { userId: user.id, groupIds: groups },
    { userInfo: user.metadata }
  );
  return res.status(status).end(body);
}

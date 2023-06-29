import { Liveblocks, FULL_ACCESS } from "./src";

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

// req.body.room             // string            // 1.1
//     XOR
// req.body.requestedRoomId  // string | null     // 1.2

/**
 * Typical usage pattern 1:
 * Full access to just one room.
 */
export async function authExample1(req, res) {
  const user = __getUserFromReq__(req);

  const permissions = new Permissions();
  if (req.body.room && __checkHasAccess__(user, req.body.room)) {
    permissions.allow(req.body.room, FULL_ACCESS);
  }

  const { status, body } = await liveblocks.authorizeUser(
    user.id,
    permissions
    //user.metadata,
  );
  return res.status(status).end(body);
}

/**
 * Typical usage pattern 2:
 * Full access based on team/org prefix (potentially looking at req.body.requestedRoomId to know _which_ prefix to grant).
 */
export async function authExample2(req, res) {
  const user = __getUserFromReq__(req);

  const permissions = new Permissions();
  if (req.body.requestedRoomId) {
    // Suppose this application organizes their Liveblocks rooms by keys
    // structured like `<team>:<room>`.
    // We can then use the passed-in requested room to infer which team to
    // check membership for.
    const [team, _] = req.body.requestedRoomId.split(":");
    if (__checkIsMemberOfTeam__(user, team)) {
      // If the user is a member of this team, don't just grant full access to
      // the request room, but to _all_ of the team's rooms, using a prefix
      // pattern.
      permissions.allow(`${team}:*`, FULL_ACCESS);
    }
  }

  const { status, body } = await liveblocks.authorizeUser(
    user.id,
    user.metadata,
    permissions
  );
  return res.status(status).end(body);
}

/**
 * Typical usage pattern 3:
 * Full access to one specific room, and read-only access to team rooms.
 */
export async function authExample3(req, res) {
  const user = __getUserFromReq__(req);

  const permissions = new Permissions();
  if (req.body.requestedRoomId) {
    // Suppose this application organizes their Liveblocks rooms by keys
    // structured like `<org>:<team>:<room>`.
    // We can then use the passed-in requested room to infer which team to
    // check membership for.
    const [org, team, _] = req.body.requestedRoomId.split(":");
    if (__checkIsMemberOfOrg__(user, org)) {
      permissions.allow(`${org}:*`, READ_ACCESS);
    }
    if (__checkIsMemberOfTeam__(user, team)) {
      permissions.allow(`${team}:*`, FULL_ACCESS);
    }
  }

  const { status, body } = await liveblocks.authorizeUser(
    user.id,
    user.metadata,
    permissions
  );
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
    user.id,
    user.metadata,
    groups
  );
  return res.status(status).end(body);
}

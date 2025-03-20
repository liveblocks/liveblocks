// Sets up a tenant

import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getRooms, getUsers } from "../../../../../database";
import { Permission } from "@liveblocks/core";

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  // Get the tenantId from the request params
  const tenantId = params.tenantId;

  // Get rooms from the database
  const rooms = await getRooms();

  // Create public rooms:
  const publicRooms = await Promise.all(
    rooms.map((room) =>
      client.createRoom(`${tenantId}:${room.id}`, {
        defaultAccesses: [],
        groupsAccesses: {
          [`${tenantId}:all`]: [Permission.Write],
        },
      })
    )
  );

  // Get users from the database
  const users = await getUsers();

  // Create private rooms for each user:
  const privateRooms = await Promise.all(
    users.map((user) =>
      client.createRoom(`${tenantId}:${user.id}`, {
        defaultAccesses: [],
        groupsAccesses: {
          [`${tenantId}:${user.id}`]: [Permission.Write],
        },
      })
    )
  );

  // Create a joint private room for all users:
  /**
   * groupsAccesses looks like this:
   * {
   *   "tenantId:user-0": ["room:write"],
   *   "tenantId:user-1": ["room:write"],
   *   ...
   * }
   */
  const jointPrivateRoom = await client.createRoom(`${tenantId}:joint`, {
    defaultAccesses: [],
    groupsAccesses: users.reduce(
      (acc, user) => {
        acc[`${tenantId}:${user.id}`] = [Permission.Write];
        return acc;
      },
      {} as Record<string, [Permission.Write]>
    ),
  });

  return NextResponse.json({
    publicRooms,
    privateRooms,
    jointPrivateRoom,
  });
}

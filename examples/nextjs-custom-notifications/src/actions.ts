"use server";

import { JsonObject, Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";

// TODO replace fetches with @liveblocks/node functions

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export type AlertData = {
  title: string;
  message: string;
};

export async function alertNotification(userId: string, data: AlertData) {
  const success = await doFetch({
    userId,
    kind: "$alert",
    subjectId: nanoid(),
    activityData: data,
  });
  return success;
}

export async function newUserNotification(userId: string) {
  const success = await doFetch({
    userId,
    kind: "$newUser",
    subjectId: nanoid(),
    activityData: {},
  });
  return success;
}

/**
 {
   userId: "user-1",
   roomId: "my-room",
   kind: "$coolThing",
   subjectId: "my-notification",
   activityData: {
     customThing: true,
   },
 }
 * @example data
 */
async function doFetch(data: JsonObject) {
  try {
    const response = await fetch(
      `https://api.liveblocks.io/v2/inbox-notifications`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.log("Problem");
      console.log(result);
      return false;
    }
    console.log(result);

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

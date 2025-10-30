"use server";

import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";
import {
  AlertData,
  ImageUploadData,
  InviteData,
  IssueUpdatedData,
} from "./liveblocks.config";

// Functions that trigger custom notifications
// https://liveblocks.io/docs/api-reference/liveblocks-node#post-inbox-notifications-trigger

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function imageUploadNotification(
  userId: string,
  data: ImageUploadData
) {
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$imageUpload",
    subjectId: nanoid(),
    activityData: data,
  });
}

export async function alertNotification(userId: string, data: AlertData) {
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$alert",
    subjectId: nanoid(),
    activityData: data,
  });
}

export async function inviteNotification(userId: string, data: InviteData) {
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$invite",
    subjectId: nanoid(),
    activityData: data,
  });
}

export async function issueUpdatedNotification(
  userId: string,
  data: { subjectId: string } & IssueUpdatedData
) {
  const { subjectId, ...activityData } = data;
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$issueUpdated",
    subjectId,
    activityData,
  });
}

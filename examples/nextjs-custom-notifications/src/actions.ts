"use server";

import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export type ImageUploadData = {
  src: string;
  alt: string;
  uploadedBy: string;
};

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

export type AlertData = {
  title: string;
  message: string;
};

export async function alertNotification(userId: string, data: AlertData) {
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$alert",
    subjectId: nanoid(),
    activityData: data,
  });
}

export type InviteData = {
  inviteFrom: string;
  documentTitle: string;
  documentDescription: string;
};

export async function inviteNotification(userId: string, data: InviteData) {
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$invite",
    subjectId: nanoid(),
    activityData: data,
  });
}

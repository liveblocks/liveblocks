import { threadEmailNotification } from "@/app/api/liveblocks-notifications/threadEmailNotification";

export async function GET() {
  return await threadEmailNotification({
    roomId: "nextjs-comments-emails",
    userId: "",
  });
}

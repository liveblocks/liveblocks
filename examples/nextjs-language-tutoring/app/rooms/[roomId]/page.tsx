import { RoomPage } from "@/components/room/room-page";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <RoomPage roomId={decodeURIComponent(roomId)} />;
}

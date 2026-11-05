import { JoinPage } from "@/components/room/join-page";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <JoinPage roomId={decodeURIComponent(roomId)} />;
}

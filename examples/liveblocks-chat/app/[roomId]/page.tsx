import { Room } from "./Room";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return <Room roomId={roomId} />;
}

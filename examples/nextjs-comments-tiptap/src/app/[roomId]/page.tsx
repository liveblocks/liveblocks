import { Room } from "@/app/Room";
import { TextEditor } from "@/components/TextEditor";

interface PageProps {
  params: {
    roomId: string;
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;

  return (
    <main>
      <Room roomId={roomId}>
        <TextEditor />
      </Room>
    </main>
  );
}

import { Room } from "@/app/Room";
import { TextEditor } from "@/components/TextEditor";

interface PageProps {
  params: {
    roomId: string;
  };
}

export default function RoomPage({ params }: PageProps) {
  return (
    <main>
      <Room roomId={params.roomId}>
        <TextEditor />
      </Room>
    </main>
  );
}

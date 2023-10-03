import { Room } from "@/app/Room";
import { TextEditor } from "@/components/TextEditor";
import { ThreadList } from "@/components/ThreadList";

export default function Home() {
  return (
    <main>
      <Room>
        <ThreadList />
        <TextEditor />
      </Room>
    </main>
  );
}

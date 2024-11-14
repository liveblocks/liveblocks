import { Room } from "@/app/Room";
import { EditorLayout } from "@/components/editor-layout";

export default function Home() {
  return (
    <main>
      <Room>
        <EditorLayout />
      </Room>
    </main>
  );
}

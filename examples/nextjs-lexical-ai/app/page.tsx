import { Editor } from "./components/Editor";
import { Room } from "./Room";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function Page() {
  return (
    <Room>
      <Editor />
    </Room>
  );
}

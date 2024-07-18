import { Editor } from "./components/Editor";
import { Room } from "./Room";
import { NotificationsPopover } from "./components/NotificationsPopover";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function Page() {
  return (
    <Room>
      <div className="relative flex flex-col h-full w-full">
        {/* Sticky header */}
        <div className="sticky top-0 left-0  h-[60px] flex items-center justify-end px-4 z-20">
          <NotificationsPopover />
        </div>
        <Editor />
      </div>
    </Room>
  );
}

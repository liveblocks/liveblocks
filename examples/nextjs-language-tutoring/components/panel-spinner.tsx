import { Loader2Icon } from "lucide-react";

// Loading state for one panel of the room, so a hook suspending inside it
// (threads, user info, the chat feed…) doesn't blank the whole page
export function PanelSpinner() {
  return (
    <div className="flex h-full min-h-24 flex-1 items-center justify-center">
      <Loader2Icon className="size-4 animate-spin text-neutral-400" />
    </div>
  );
}

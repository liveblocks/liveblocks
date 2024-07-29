import { Presence } from "@/components/Presence";
import { Comments } from "@/components/Comments";
import { Editor } from "@/components/Editor";
import { IssueProperties } from "@/components/IssueProperties";

export function Issue() {
  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between border-b h-10 px-4 items-center">
        <div className="text-sm font-medium text-neutral-700">
          Document name
        </div>
        <Presence />
      </header>
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex flex-row">
          <div className="flex-grow h-full overflow-y-scroll">
            <div className="max-w-screen-md mx-auto py-6">
              <Editor />
              <div className="border-t my-6" />
              <Comments />
            </div>
          </div>
          <div className="border-l flex-grow-0 flex-shrink-0 w-[280px] px-4">
            <div className="flex justify-between h-10 items-center mb-2">
              <div className="text-xs font-medium text-neutral-600">
                Properties
              </div>
            </div>
            <IssueProperties />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Presence } from "@/components/Presence";
import { Comments } from "@/components/Comments";
import { Editor } from "@/components/Editor";
import { IssueProperties } from "@/components/IssueProperties";
import { IssueLabels } from "@/components/IssueLabels";

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
          <div className="border-l flex-grow-0 flex-shrink-0 w-[280px] px-4 flex flex-col gap-4">
            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2 h-10 flex items-center">
                Properties
              </div>
              <IssueProperties />
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2 h-10 flex items-center">
                Labels
              </div>
              <IssueLabels />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { PresenceFallback } from "@/components/Presence";
import { IssuePropertiesFallback } from "@/components/IssueProperties";
import { IssueLabelsFallback } from "@/components/IssueLabels";
import { SyncCompleteIcon } from "@/icons/SyncCompleteIcon";
import { ImmutableStorage } from "@/liveblocks.config";
import { CommentsFallback } from "./Comments";

export const EMPTY_STORAGE: ImmutableStorage = {
  meta: { title: "" },
  properties: { progress: "none", priority: "none", assignedTo: "none" },
  labels: [],
  links: [],
};

export function IssueShell() {
  return (
    <div className="h-full flex flex-col flex-grow">
      <header className="flex justify-between border-b h-10 px-4 items-center">
        <div className="flex items-center text-gray-500 font-semibold gap-1.5 text-xs">
          <SyncCompleteIcon className="w-5 h-5 opacity-80" />
        </div>
        <PresenceFallback />
      </header>
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex flex-row">
          <div className="flex-grow h-full overflow-y-scroll">
            <div className="max-w-[840px] mx-auto py-6 relative">
              <div className="px-12">
                <div className="my-6">
                  <div className="w-full text-2xl font-bold my-6 h-[32px] flex items-center justify-start">
                    <div className="bg-gray-100/80 animate-pulse rounded-lg h-[28px] w-[200px]" />
                  </div>
                </div>
                <div className="my-6">
                  {Array.from({ length: 1 }).map((_, index) => (
                    <div
                      key={index}
                      className="w-full text-2xl font-bold my-[12.8px] h-[72px] flex items-center justify-start"
                    >
                      <div className="bg-gray-100/80 animate-pulse rounded-lg h-[68px] w-full" />
                    </div>
                  ))}
                </div>
                <div className="my-6">
                  <div className="flex justify-between items-center text-sm font-medium text-neutral-500">
                    Links
                  </div>
                </div>
                <div className="border-t my-6" />
                <div className="my-6 font-medium">Comments</div>
                <CommentsFallback />
              </div>
            </div>
          </div>
          <div className="border-l flex-grow-0 flex-shrink-0 w-[200px] lg:w-[260px] px-4 flex flex-col gap-4">
            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2 flex h-10 items-center justify-between gap-1">
                <span>Properties</span>
              </div>
              <IssuePropertiesFallback storageFallback={EMPTY_STORAGE} />
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-0 flex h-10 items-center justify-between gap-1">
                <span>Labels</span>
              </div>
              <IssueLabelsFallback storageFallback={EMPTY_STORAGE} />
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-0 h-10 flex items-center">
                Actions
              </div>
              <button className="text-red-600 text-sm">Delete issue</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

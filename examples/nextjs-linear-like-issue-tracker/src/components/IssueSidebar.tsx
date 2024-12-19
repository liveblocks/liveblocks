import { IssueProperties } from "@/components/IssueProperties";
import { IssueLabels } from "@/components/IssueLabels";
import { IssueActions } from "@/components/IssueActions";
import { liveblocks } from "@/liveblocks.server.config";
import { getRoomId } from "@/config";

export async function IssueSidebar({ issueId }: { issueId: string }) {
  const roomId = getRoomId(issueId);
  const storage = await liveblocks.getStorageDocument(roomId, "json");

  return (
    <div className="border-l flex-grow-0 flex-shrink-0 w-[200px] lg:w-[260px] px-4 flex flex-col gap-4">
      <div>
        <div className="text-xs font-medium text-neutral-600 mb-2 h-10 flex items-center">
          Properties
        </div>
        <IssueProperties storageFallback={storage} />
      </div>

      <div>
        <div className="text-xs font-medium text-neutral-600 mb-0 h-10 flex items-center">
          Labels
        </div>
        <IssueLabels storageFallback={storage} />
      </div>

      <div>
        <div className="text-xs font-medium text-neutral-600 mb-0 h-10 flex items-center">
          Actions
        </div>
        <IssueActions issueId={issueId} />
      </div>
    </div>
  );
}

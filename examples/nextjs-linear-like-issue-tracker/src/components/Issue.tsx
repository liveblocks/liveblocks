import { Presence } from "@/components/Presence";
import { Comments } from "@/components/Comments";
import { Editor } from "@/components/Editor";
import { IssueSidebar } from "@/components/IssueSidebar";
import { liveblocks } from "@/liveblocks.server.config";
import { getRoomId } from "@/config";
import { IssueLinks } from "@/components/IssueLinks";
import Link from "next/link";
import { Status } from "./Status";

export async function Issue({ issueId }: { issueId: string }) {
  const roomId = getRoomId(issueId);

  // // Get storage contents of room (e.g. issue properties) to render placeholder on load
  // const storagePromise = liveblocks.getStorageDocument(roomId, "json");
  //
  // let error;
  // let results;
  //
  // try {
  //   results = await Promise.all([storagePromise]);
  // } catch (err) {
  //   console.log(err);
  //   error = err;
  // }

  // if (
  //   error ||
  //   !Array.isArray(results) ||
  //   Object.keys(results[0]).length === 0
  // ) {
  //   console.log(error);
  //   return (
  //     <div className="max-w-[840px] mx-auto pt-20">
  //       <h1 className="outline-none block w-full text-2xl font-bold bg-transparent my-6">
  //         Issue not found
  //       </h1>
  //       <div>
  //         This issue has been deleted. Go back to the{" "}
  //         <Link className="font-bold underline" href="/">
  //           issue list
  //         </Link>
  //         .
  //       </div>
  //     </div>
  //   );
  // }
  //
  // const [storage] = results;

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between border-b h-10 px-4 items-center">
        <Status />
        <Presence />
      </header>
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex flex-row">
          <div className="flex-grow h-full overflow-y-scroll">
            <div className="max-w-[840px] mx-auto py-6 relative">
              <div className="px-12">
                <Editor /*storageFallback={storage}*/ />
                <div className="my-6">
                  {/*<IssueLinks storageFallback={storage} />*/}
                </div>
                <div className="border-t my-6" />
                <Comments />
              </div>
            </div>
          </div>
          <IssueSidebar issueId={issueId} />
        </div>
      </div>
    </div>
  );
}

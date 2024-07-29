import { Presence } from "@/components/Presence";
import { Comments } from "@/components/Comments";
import { Editor } from "@/components/Editor";

export function Issue() {
  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between border-b h-10 px-3 items-center">
        <div className="text-sm font-medium text-gray-700">Document name</div>
        <Presence />
      </header>
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex flex-row">
          <div className="flex-grow h-full overflow-auto">
            <div className="max-w-screen-md mx-auto py-6">
              <Editor />
              <div className="border-t my-6" />
              <Comments />
            </div>
          </div>
          <div className="border-l flex-grow-0 flex-shrink-0 w-[280px]">
            <div className="flex justify-between h-10 px-3 items-center">
              <div className="text-xs font-medium text-gray-600">
                Properties
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

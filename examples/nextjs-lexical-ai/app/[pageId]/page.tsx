import { Editor } from "../components/Editor";
import { Room } from "../Room";
import { Avatars } from "../components/Avatars";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const revalidate = 0;

export default async function Page({
  params: { pageId },
}: {
  params: { pageId: string };
}) {
  return (
    <Room pageId={pageId}>
      {/* Sticky header */}
      <div className="sticky top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20">
        <div />
        <Avatars />
      </div>
      <Editor />
    </Room>
  );
}

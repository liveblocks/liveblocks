import { Editor } from "../components/Editor";
import { Room } from "./Room";
import { Avatars } from "../components/Avatars";
import { Status } from "../components/Status";

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
        <div className="absolute top-3 left-3">
          <Status />
        </div>
        <div />
        <Avatars />
      </div>

      <Editor />

      <LiveblocksBadge />
    </Room>
  );
}

function LiveblocksBadge() {
  return (
    <a
      className="fixed bottom-4 right-4"
      href="https://liveblocks.io"
      rel="noreferrer"
      target="_blank"
    >
      <picture>
        <source
          srcSet="https://liveblocks.io/badge-dark.svg"
          media="(prefers-color-scheme: dark)"
        />
        <img
          src="https://liveblocks.io/badge-light.svg"
          alt="Made with Liveblocks"
          className=""
        />
      </picture>
    </a>
  );
}

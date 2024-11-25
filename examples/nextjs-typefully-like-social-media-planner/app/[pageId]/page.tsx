import { PostPanel } from "../components/PostPanel";
import { Room } from "./Room";
import { Avatars } from "../components/Avatars";
import { TogglePreview } from "../components/TogglePreview";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const revalidate = 0;

export default async function Page({ params }: any) {
  const { pageId } = await params;

  return (
    <Room pageId={pageId}>
      {/* Sticky header */}
      {/*<div className="sticky top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20">*/}
      {/*  <Avatars />*/}
      {/*  <div className="flex gap-3">*/}
      {/*    <TogglePreview />*/}
      {/*    <button>Publish</button>*/}
      {/*  </div>*/}
      {/*</div>*/}

      <div className="mx-auto pt-20 w-full max-w-[442px] px-4">
        <PostPanel />
      </div>

      {/*<LiveblocksBadge />*/}
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
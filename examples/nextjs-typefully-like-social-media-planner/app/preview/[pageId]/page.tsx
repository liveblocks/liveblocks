// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
import { getRoomId } from "../../config";
import { liveblocks } from "../../utils/liveblocks";
import { PostUI } from "../../components/PostUI";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const revalidate = 0;

export default async function Page({ params }: any) {
  const { pageId } = await params;

  let storage;

  try {
    storage = await liveblocks.getStorageDocument(getRoomId(pageId), "json");
  } catch (err) {
    console.log(err);
    return (
      <div className="flex w-full h-full justify-center items-center">
        Post not found
      </div>
    );
  }

  if (!storage.publicPreview) {
    return (
      <div className="flex w-full h-full justify-center items-center">
        Preview not enabled
      </div>
    );
  }

  // use ids to get the post(s) content
  console.log(storage.postIds);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 bg-gray-100">
        <div></div>
        <div>Draft</div>
        <div></div>
      </div>

      <div className="mx-auto w-full max-w-[600px] px-4 mt-10">
        <PostUI
          user={{
            avatar: "https://github.com/ctnicholas.png",
            name: "Chris Nicholas",
            username: "@ctnicholasdev",
          }}
        >
          <>Hey this is a post</>
        </PostUI>
        <PostUI
          user={{
            avatar: "https://github.com/ctnicholas.png",
            name: "Chris Nicholas",
            username: "@ctnicholasdev",
          }}
        >
          <>Hey this is a post</>
        </PostUI>
      </div>

      <LiveblocksBadge />
    </div>
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

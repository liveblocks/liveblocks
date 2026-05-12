import { Room } from "./Room";
import { CmsEditor } from "./CmsEditor";
import { ClientSideSuspense } from "@liveblocks/react";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <Room postId={postId}>
      <CmsEditor postId={postId} />
    </Room>
  );
}

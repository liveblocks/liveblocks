import { Room } from "./Room";
import { PostShell } from "./PostShell";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <Room postId={postId}>
      <PostShell postId={postId} />
    </Room>
  );
}

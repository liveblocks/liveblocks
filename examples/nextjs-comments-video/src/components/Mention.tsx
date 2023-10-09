import {
  CommentBodyMentionProps,
  Composer,
  ComposerEditorMentionProps,
} from "@liveblocks/react-comments/primitives";
import { useUser } from "@/liveblocks.config";

// TODO add styles
export function Mention({
  userId,
}: ComposerEditorMentionProps | CommentBodyMentionProps) {
  const { user } = useUser(userId);

  return <Composer.Mention>@{user.name}</Composer.Mention>;
}

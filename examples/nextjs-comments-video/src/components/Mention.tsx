import {
  CommentBodyMentionProps,
  Composer,
  ComposerEditorMentionProps,
} from "@liveblocks/react-comments/primitives";
import { useUser } from "@/liveblocks.config";
import styles from "./Mention.module.css";

// TODO add styles
export function Mention({
  userId,
}: ComposerEditorMentionProps | CommentBodyMentionProps) {
  const { user } = useUser(userId);

  return (
    <Composer.Mention className={styles.mention}>@{user.name}</Composer.Mention>
  );
}

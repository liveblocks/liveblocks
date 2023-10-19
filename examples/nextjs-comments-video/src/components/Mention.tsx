import {
  CommentBodyMentionProps,
  ComposerEditorMentionProps,
} from "@liveblocks/react-comments/primitives";
import { useUser } from "@/liveblocks.config";
import styles from "./Mention.module.css";

export function Mention({
  userId,
}: ComposerEditorMentionProps | CommentBodyMentionProps) {
  const { user } = useUser(userId);

  return <span className={styles.mention}>@{user.name}</span>;
}

import {
  CommentBodyLinkProps,
  ComposerEditorLinkProps,
} from "@liveblocks/react-comments/primitives";
import styles from "./Link.module.css";

export function Link({
  href,
  children,
}: ComposerEditorLinkProps | CommentBodyLinkProps) {
  return <span className={styles.link}>{children}</span>;
}

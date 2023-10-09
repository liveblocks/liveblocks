import {
  CommentBodyLinkProps,
  Composer,
  ComposerEditorLinkProps,
} from "@liveblocks/react-comments/primitives";
import styles from "./Link.module.css";

// TODO add styles
export function Link({
  href,
  children,
}: ComposerEditorLinkProps | CommentBodyLinkProps) {
  return <Composer.Link className={styles.link}>{children}</Composer.Link>;
}

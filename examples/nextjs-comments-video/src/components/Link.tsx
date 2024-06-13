import {
  CommentBodyLinkProps,
  ComposerEditorLinkProps,
} from "@liveblocks/react-ui/primitives";
import styles from "./Link.module.css";

export function Link({
  href,
  children,
}: ComposerEditorLinkProps | CommentBodyLinkProps) {
  return (
    <a href={href} className={styles.link}>
      {children}
    </a>
  );
}

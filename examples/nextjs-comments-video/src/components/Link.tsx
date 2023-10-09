import {
  CommentBodyLinkProps,
  Composer,
  ComposerEditorLinkProps,
} from "@liveblocks/react-comments/primitives";

// TODO add styles
export function Link({
  href,
  children,
}: ComposerEditorLinkProps | CommentBodyLinkProps) {
  return <Composer.Link>{children}</Composer.Link>;
}

import {
  CommentBodyLinkProps,
  ComposerEditorLinkProps,
} from "@liveblocks/react-ui/primitives";

export function Link({
  href,
  children,
}: ComposerEditorLinkProps | CommentBodyLinkProps) {
  return (
    <a href={href} className="font-medium">
      {children}
    </a>
  );
}

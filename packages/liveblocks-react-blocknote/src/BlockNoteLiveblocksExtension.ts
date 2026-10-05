import { useLiveblocksExtension as useTipTapLiveblocksExtension } from "@liveblocks/react-tiptap";
import type { Mark } from "@tiptap/core";

export type LiveblocksExtensionOptions = NonNullable<
  Parameters<typeof useTipTapLiveblocksExtension>[0]
>;

type InternalLiveblocksExtensionOptions = LiveblocksExtensionOptions & {
  mentionNodes: boolean;
  textEditorType: "blocknote";
};

export const useLiveblocksExtension = (
  options: LiveblocksExtensionOptions = {}
) => {
  const tiptapOptions: InternalLiveblocksExtensionOptions = {
    ...options,
    mentionNodes: false,
    textEditorType: "blocknote",
  };
  const extension = useTipTapLiveblocksExtension(tiptapOptions);

  extension.config.extendMarkSchema = (mark: Mark) => {
    if (mark.name === "liveblocksCommentMark") {
      return {
        blocknoteIgnore: true,
      };
    }
    return {};
  };

  return extension;
};

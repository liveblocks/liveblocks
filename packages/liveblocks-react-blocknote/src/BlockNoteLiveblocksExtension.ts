import { useLiveblocksExtension as useTipTapLiveblocksExtension } from "@liveblocks/react-tiptap";

export type LiveblocksExtensionOptions = Parameters<
  typeof useTipTapLiveblocksExtension
>[0];

export const useLiveblocksExtension = (
  options: LiveblocksExtensionOptions = {}
) => {
  const extension = useTipTapLiveblocksExtension({
    mentions: false,
    ...options,
  });

  return extension;
};

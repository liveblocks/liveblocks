import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

// const ROOM_CONTEXT_EXPORTS = [
//   "RoomProvider",
//   "useRoom",
//   "useMyPresence",
//   "useUpdateMyPresence",
//   "useSelf",
//   "useOthers",
//   "useOthersMapped",
//   "useOthersListener",
//   "useOthersConnectionIds",
//   "useOther",
//   "useBroadcastEvent",
//   "useEventListener",
//   "useErrorListener",
//   "useStorage",
//   "useObject",
//   "useMap",
//   "useList",
//   "useBatch",
//   "useHistory",
//   "useUndo",
//   "useRedo",
//   "useCanUndo",
//   "useCanRedo",
//   "useMutation",
//   "useStatus",
//   "useLostConnectionListener",
//   "useThreads",
//   "useCreateThread",
//   "useEditThreadMetadata",
//   "useCreateComment",
//   "useEditComment",
//   "useDeleteComment",
//   "useAddReaction",
//   "useRemoveReaction",
//   "useThreadSubscription",
//   "useMarkThreadAsRead",
//   "useRoomNotificationSettings",
//   "useUpdateRoomNotificationSettings",
// ];

// const LIVEBLOCKS_CONTEXT_EXPORTS = [
//   "LiveblocksProvider",
//   "useMarkInboxNotificationAsRead",
//   "useMarkAllInboxNotificationsAsRead",
//   "useInboxNotifications",
//   "useUnreadInboxNotificationsCount",
// ];

// const SHARED_CONTEXT_EXPORTS = ["useUser", "useRoomInfo"];

// const NON_SUSPENSE_EXPORTS = ["RoomProvider", "LiveblocksProvider"];

const CONFIG_IMPORT_REGEX = /.*liveblocks(.*)?\.config(\.(?:t|j)sx?)?/;

const KNOWN_EXPORTS = [
  "RoomProvider",
  "useRoom",
  "useMyPresence",
  "useUpdateMyPresence",
  "useSelf",
  "useOthers",
  "useOthersMapped",
  "useOthersListener",
  "useOthersConnectionIds",
  "useOther",
  "useBroadcastEvent",
  "useEventListener",
  "useErrorListener",
  "useStorage",
  "useObject",
  "useMap",
  "useList",
  "useBatch",
  "useHistory",
  "useUndo",
  "useRedo",
  "useCanUndo",
  "useCanRedo",
  "useMutation",
  "useStatus",
  "useLostConnectionListener",
  "useThreads",
  "useCreateThread",
  "useEditThreadMetadata",
  "useCreateComment",
  "useEditComment",
  "useDeleteComment",
  "useAddReaction",
  "useRemoveReaction",
  "useThreadSubscription",
  "useMarkThreadAsRead",
  "useRoomNotificationSettings",
  "useUpdateRoomNotificationSettings",
  "LiveblocksProvider",
  "useMarkInboxNotificationAsRead",
  "useMarkAllInboxNotificationsAsRead",
  "useInboxNotifications",
  "useUnreadInboxNotificationsCount",
];

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);

  /**
   * Before: import { RoomProvider } from "./liveblocks.config"
   *  After: import { RoomProvider } from "@liveblocks/react"
   */
  root
    .find(j.ImportDeclaration)
    .filter((path) => {
      return (
        path.value.source.type === "StringLiteral" &&
        CONFIG_IMPORT_REGEX.test(path.value.source.value)
      );
    })
    .forEach((path) => {
      const importSpecifiers = path.node.specifiers;
      const importToChange = importSpecifiers.filter((specifier) =>
        KNOWN_EXPORTS.includes(specifier.local.name)
      );
      const importsRemained = importSpecifiers.filter(
        (specifier) => !KNOWN_EXPORTS.includes(specifier.local.name)
      );

      if (importToChange.length > 0) {
        const liveblocksReactImport = j.importDeclaration(
          importToChange,
          j.stringLiteral("@liveblocks/react")
        );
        path.insertBefore(liveblocksReactImport);
      }

      if (importsRemained.length > 0) {
        const originalImport = j.importDeclaration(
          importsRemained,
          path.value.source
        );
        path.insertBefore(originalImport);
      }

      j(path).remove();
    });

  return root.toSource(options);
}

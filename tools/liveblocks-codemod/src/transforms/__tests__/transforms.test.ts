import { describe } from "vitest";
import { defineTestsForTransform } from "./_utils";

describe("@liveblocks/codemod", () => {
  defineTestsForTransform("live-list-constructor");
  defineTestsForTransform("liveblocks-ui-config");
  defineTestsForTransform("react-comments-to-react-ui");
  defineTestsForTransform(
    "remove-liveblocks-config-contexts",
    ({ fixture }) => ({
      suspense: fixture.includes("suspense"),
    })
  );
  defineTestsForTransform("remove-unneeded-type-params");
  defineTestsForTransform("remove-yjs-default-export");
  defineTestsForTransform("rename-notification-settings");
  defineTestsForTransform("room-info-to-room-data");
  defineTestsForTransform("simplify-client-side-suspense-children");
});

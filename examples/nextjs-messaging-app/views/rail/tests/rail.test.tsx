import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rail } from "@/views/rail";
import { getActivityFeedId } from "@/lib/feeds";
import { getDmFeedId } from "@/lib/feeds";
import {
  mockFeed,
  mockMessage,
  resetMockState,
} from "@/tests/helpers/liveblocks-mock";

vi.mock(
  "@liveblocks/react/suspense",
  () => import("@/tests/helpers/liveblocks-mock")
);
vi.mock("@liveblocks/react", () => import("@/tests/helpers/liveblocks-mock"));

const SELF = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";

function renderRail(
  view: "home" | "dms" | "activity" = "home",
  options: { onSignOut?: (() => void) | null } = {}
) {
  const onViewChange = vi.fn();
  const onWorkspaceChange = vi.fn();
  render(
    <Rail
      workspaceId="acme"
      userId={SELF}
      view={view}
      onViewChange={onViewChange}
      onWorkspaceChange={onWorkspaceChange}
      onSignOut={options.onSignOut}
    />
  );
  return { onViewChange, onWorkspaceChange };
}

describe("Rail", () => {
  beforeEach(() => {
    resetMockState({ selfId: SELF });
  });

  it("renders Home, DMs and Activity with the active view marked", () => {
    renderRail("dms");

    expect(screen.getByRole("button", { name: /home/i })).not.toHaveAttribute(
      "aria-current"
    );
    expect(screen.getByRole("button", { name: /dms/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("button", { name: /activity/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("switches views when an item is clicked", async () => {
    const user = userEvent.setup();
    const { onViewChange } = renderRail("home");

    await user.click(screen.getByRole("button", { name: /activity/i }));
    expect(onViewChange).toHaveBeenCalledWith("activity");

    await user.click(screen.getByRole("button", { name: /dms/i }));
    expect(onViewChange).toHaveBeenCalledWith("dms");
  });

  it("badges Home with channel mentions, DMs with DM activity, Activity with everything", () => {
    const activityFeedId = getActivityFeedId(SELF);
    const dmFeedId = getDmFeedId(SELF, MISLAV);
    resetMockState({
      selfId: SELF,
      feeds: {
        [activityFeedId]: mockFeed(activityFeedId, { type: "activity" }),
      },
      messages: {
        [activityFeedId]: [
          mockMessage({
            kind: "activity",
            type: "mention",
            fromUserId: MISLAV,
            feedId: "general",
            messageId: "m1",
          }),
          mockMessage({
            kind: "activity",
            type: "thread_reply",
            fromUserId: MISLAV,
            feedId: "thread_m1",
            messageId: "m2",
            parentFeedId: "general",
            parentMessageId: "m1",
          }),
          mockMessage({
            kind: "activity",
            type: "dm",
            fromUserId: MISLAV,
            feedId: dmFeedId,
            messageId: "m3",
          }),
          mockMessage({
            kind: "activity",
            type: "dm",
            fromUserId: MISLAV,
            feedId: dmFeedId,
            messageId: "m4",
            readAt: Date.now(),
          }),
        ],
      },
    });

    renderRail("home");

    expect(screen.getByRole("button", { name: /home/i })).toHaveTextContent(
      "1"
    );
    expect(screen.getByRole("button", { name: /dms/i })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /activity/i })).toHaveTextContent(
      "3"
    );
  });

  it("shows no badges when there is nothing unread", () => {
    renderRail("home");

    for (const name of [/home/i, /dms/i, /activity/i]) {
      expect(screen.getByRole("button", { name })).not.toHaveTextContent(/\d/);
    }
  });

  it("opens the account menu from the user control", async () => {
    const user = userEvent.setup();
    renderRail();

    await user.click(
      screen.getByRole("button", {
        name: /signed in as charlie layne.*open menu/i,
      })
    );
    expect(
      screen.getByRole("dialog", { name: "Account menu" })
    ).toBeInTheDocument();
  });

  it("shows Sign out in the account menu when onSignOut is passed", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    renderRail("home", { onSignOut });

    await user.click(
      screen.getByRole("button", {
        name: /signed in as charlie layne.*open menu/i,
      })
    );
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalled();
  });

  it("opens the workspace switcher and switches workspace", async () => {
    const user = userEvent.setup();
    const { onWorkspaceChange } = renderRail();

    await user.click(screen.getByRole("button", { name: /workspace: acme/i }));
    await user.click(screen.getByRole("option", { name: /initech/i }));

    expect(onWorkspaceChange).toHaveBeenCalledWith("initech");
  });
});

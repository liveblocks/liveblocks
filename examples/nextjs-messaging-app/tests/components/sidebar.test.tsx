import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/sidebar";
import { getActivityFeedId } from "@/lib/activity";
import {
  mockFeed,
  mockMessage,
  resetMockState,
} from "../helpers/liveblocks-mock";

vi.mock("@liveblocks/react/suspense", () => import("../helpers/liveblocks-mock"));
vi.mock("@liveblocks/react", () => import("../helpers/liveblocks-mock"));

const SELF = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";

function renderSidebar(view: "home" | "dms" | "activity") {
  const onSelect = vi.fn();
  const onActivityNavigate = vi.fn();
  render(
    <Sidebar
      workspaceName="Acme"
      view={view}
      selection={null}
      activeActivityItemId={null}
      onSelect={onSelect}
      onActivityNavigate={onActivityNavigate}
    />
  );
  return { onSelect, onActivityNavigate };
}

describe("Sidebar", () => {
  beforeEach(() => {
    resetMockState({
      selfId: SELF,
      channels: [{ id: "general", name: "general" }],
    });
  });

  it("renders and navigates the home sections", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSidebar("home");
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Channels")).toBeInTheDocument();
    expect(screen.getByText("Direct messages")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /^#\s*general$/i })
    );
    expect(onSelect).toHaveBeenCalledWith({
      type: "channel",
      channelId: "general",
    });
    await user.click(screen.getByRole("button", { name: /Mislav Abha/i }));
    expect(onSelect).toHaveBeenCalledWith({ type: "dm", userId: MISLAV });
  });

  it("renders only detailed direct messages in the DMs view", () => {
    renderSidebar("dms");
    expect(
      screen.getByRole("heading", { name: "Direct messages" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Channels")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mislav Abha/i })).toHaveTextContent(
      "No messages yet"
    );
  });

  it("renders activity and forwards activity navigation", async () => {
    const activityFeedId = getActivityFeedId(SELF);
    resetMockState({
      selfId: SELF,
      channels: [{ id: "general", name: "general" }],
      feeds: {
        [activityFeedId]: mockFeed(activityFeedId, { type: "activity" }),
        general: mockFeed("general", { type: "channel", name: "general" }),
      },
      messages: {
        [activityFeedId]: [
          mockMessage(
            {
              kind: "activity",
              type: "mention",
              fromUserId: MISLAV,
              feedId: "general",
              messageId: "m1",
            },
            { id: "a1" }
          ),
        ],
        general: [
          mockMessage({ userId: MISLAV, content: "hello" }, { id: "m1" }),
        ],
      },
    });
    const { onActivityNavigate } = renderSidebar("activity");
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /mentioned you/i }));
    expect(onActivityNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: "a1" })
    );
  });

  it("shows activity empty state", () => {
    renderSidebar("activity");
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
});

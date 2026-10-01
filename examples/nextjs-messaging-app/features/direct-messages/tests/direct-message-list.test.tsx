import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectMessageList } from "@/features/direct-messages";
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
const TATUM = "tatum.paolo@example.com";
const AI = "ai-assistant";
const ACTIVITY = getActivityFeedId(SELF);
const MISLAV_DM = getDmFeedId(SELF, MISLAV);

function renderList(variant: "compact" | "detailed" = "compact") {
  const onSelectUser = vi.fn();
  render(
    <DirectMessageList
      activeUserId={null}
      onSelectUser={onSelectUser}
      variant={variant}
    />
  );
  return onSelectUser;
}

function rowFor(name: string) {
  return screen
    .getByRole("button", { name: new RegExp(name, "i") })
    .closest("li")!;
}

describe("DirectMessageList", () => {
  beforeEach(() => {
    resetMockState({ selfId: SELF });
  });

  it("lists every teammate except self, with the AI agent last", async () => {
    const onSelect = renderList();
    const names = screen
      .getAllByRole("listitem")
      .map((row) => row.textContent?.replace(/\s+/g, " ").trim());
    expect(names).toEqual([
      "Mislav Abha",
      "Tatum Paolo",
      "Anjali Wanda",
      "Quinn Elton",
      "Liveblocks AIAgent",
    ]);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Mislav Abha/i }));
    expect(onSelect).toHaveBeenCalledWith(MISLAV);
  });

  it("labels presence and keeps the AI online", () => {
    resetMockState({
      selfId: SELF,
      others: [{ connectionId: 1, id: MISLAV, presence: { typingIn: null } }],
    });
    renderList();
    expect(
      within(rowFor("Mislav Abha")).getByLabelText("Online")
    ).toBeInTheDocument();
    expect(
      within(rowFor("Tatum Paolo")).getByLabelText("Offline")
    ).toBeInTheDocument();
    expect(
      within(rowFor("Liveblocks AI")).getByLabelText("Online")
    ).toBeInTheDocument();
  });

  it("counts unread activity rooted in each DM", () => {
    resetMockState({
      selfId: SELF,
      feeds: { [ACTIVITY]: mockFeed(ACTIVITY, { type: "activity" }) },
      messages: {
        [ACTIVITY]: [
          mockMessage({
            kind: "activity",
            type: "dm",
            fromUserId: MISLAV,
            feedId: MISLAV_DM,
            messageId: "d1",
          }),
          mockMessage({
            kind: "activity",
            type: "mention",
            fromUserId: MISLAV,
            feedId: "thread_d1",
            messageId: "r1",
            parentFeedId: MISLAV_DM,
            parentMessageId: "d1",
          }),
          mockMessage({
            kind: "activity",
            type: "dm",
            fromUserId: MISLAV,
            feedId: MISLAV_DM,
            messageId: "d2",
            readAt: 1,
          }),
        ],
      },
    });
    renderList();
    expect(
      within(rowFor("Mislav Abha")).getByLabelText("2 unread")
    ).toBeInTheDocument();
  });

  it("shows detailed newest previews, self prefixes, and times", () => {
    const tatumDm = getDmFeedId(SELF, TATUM);
    resetMockState({
      selfId: SELF,
      feeds: {
        [MISLAV_DM]: mockFeed(MISLAV_DM, {
          type: "dm",
          participantIds: [SELF, MISLAV].sort(),
        }),
        [tatumDm]: mockFeed(tatumDm, {
          type: "dm",
          participantIds: [SELF, TATUM].sort(),
        }),
      },
      messages: {
        [MISLAV_DM]: [
          mockMessage({ userId: MISLAV, content: "older" }, { createdAt: 100 }),
          mockMessage({ userId: SELF, content: "newest" }, { createdAt: 200 }),
        ],
        [tatumDm]: [
          mockMessage({ userId: TATUM, content: "", streaming: true }),
        ],
      },
    });
    renderList("detailed");
    const mislavRow = rowFor("Mislav Abha");
    expect(mislavRow).toHaveTextContent("You: newest");
    expect(within(mislavRow).getByRole("time")).toBeInTheDocument();
    expect(rowFor("Tatum Paolo")).toHaveTextContent("Thinking…");
    expect(rowFor("Anjali Wanda")).toHaveTextContent("No messages yet");
  });

  it("shows feed errors in detailed mode", () => {
    resetMockState({
      selfId: SELF,
      feeds: {
        [MISLAV_DM]: mockFeed(MISLAV_DM, {
          type: "dm",
          participantIds: [SELF, MISLAV].sort(),
        }),
      },
      errors: { [MISLAV_DM]: new Error("unavailable") },
    });
    renderList("detailed");
    expect(rowFor("Mislav Abha")).toHaveTextContent("Messages unavailable");
  });
});

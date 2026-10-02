import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/features/users";
import { getUser, getUsers } from "@/lib/database";
import { getStatusKey, parseStatus } from "@/lib/status";
import {
  liveblocksMocks,
  resetMockState,
} from "@/tests/helpers/liveblocks-mock";

vi.mock(
  "@liveblocks/react/suspense",
  () => import("@/tests/helpers/liveblocks-mock")
);
vi.mock("@liveblocks/react", () => import("@/tests/helpers/liveblocks-mock"));

vi.mock("frimousse", () => ({
  EmojiPicker: {
    Root: ({
      children,
      onEmojiSelect,
    }: {
      children: React.ReactNode;
      onEmojiSelect: (value: { emoji: string }) => void;
    }) => (
      <div>
        {children}
        <button type="button" onClick={() => onEmojiSelect({ emoji: "🎉" })}>
          Pick party emoji
        </button>
      </div>
    ),
    Search: () => null,
    Viewport: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Loading: () => null,
    Empty: () => null,
    List: () => null,
  },
}));

const CHARLIE = "charlie.layne@example.com";

function openMenu(user: ReturnType<typeof userEvent.setup>) {
  return user.click(
    screen.getByRole("button", {
      name: `Signed in as ${getUser(CHARLIE)!.info.name}. Open menu`,
    })
  );
}

function accountMenu() {
  return screen.getByRole("dialog", { name: "Account menu" });
}

describe("UserMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockState({
      selfId: CHARLIE,
      selfPresence: { typingIn: null },
    });
  });

  it("opens the account menu and shows Active for the signed-in user", async () => {
    const user = userEvent.setup();
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);

    const menu = accountMenu();
    expect(
      within(menu).getByText(getUser(CHARLIE)!.info.name)
    ).toBeInTheDocument();
    expect(within(menu).getByText("Active")).toBeInTheDocument();
  });

  it("does not offer switching to other users", async () => {
    const user = userEvent.setup();
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    for (const demoUser of getUsers()) {
      if (demoUser.id === CHARLIE) {
        continue;
      }
      expect(
        screen.queryByRole("option", {
          name: new RegExp(demoUser.info.name, "i"),
        })
      ).not.toBeInTheDocument();
    }
  });

  it("renders Sign out only when onSignOut is provided and calls it", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    const { rerender } = render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);
    expect(
      screen.queryByRole("button", { name: "Sign out" })
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    rerender(<UserMenu userId={CHARLIE} onSignOut={onSignOut} />);
    await openMenu(user);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Account menu" })
    ).not.toBeInTheDocument();
  });

  it("commits status text on Enter and persists to presence and localStorage", async () => {
    const user = userEvent.setup();
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);
    const input = within(accountMenu()).getByPlaceholderText(
      "What's your status?"
    );
    await user.type(input, "In a meeting{Enter}");

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: null, text: "In a meeting", away: false },
    });
    expect(parseStatus(localStorage.getItem(getStatusKey(CHARLIE)))).toEqual({
      emoji: null,
      text: "In a meeting",
      away: false,
    });
  });

  it("commits status text on blur", async () => {
    const user = userEvent.setup();
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);
    const menu = accountMenu();
    const input = within(menu).getByPlaceholderText("What's your status?");
    await user.type(input, "Focus time");
    await user.click(within(menu).getByText("Active"));

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: null, text: "Focus time", away: false },
    });
  });

  it("sets away and toggles the menu action label", async () => {
    const user = userEvent.setup();
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);
    const menu = accountMenu();
    await user.click(
      within(menu).getByRole("button", { name: "Set yourself as away" })
    );

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: null, text: "", away: true },
    });
    expect(within(menu).getByText("Away")).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "Set yourself as online" })
    ).toBeInTheDocument();
  });

  it("clear status removes emoji and text but keeps away", async () => {
    const user = userEvent.setup();
    resetMockState({
      selfId: CHARLIE,
      selfPresence: {
        typingIn: null,
        status: { emoji: "🎉", text: "party", away: true },
      },
    });
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);
    liveblocksMocks.updateMyPresence.mockClear();
    await user.click(
      within(accountMenu()).getByRole("button", { name: "Clear status" })
    );

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: null, text: "", away: true },
    });
  });

  it("sets status emoji from the picker", async () => {
    const user = userEvent.setup();
    render(<UserMenu userId={CHARLIE} />);

    await openMenu(user);
    const menu = accountMenu();
    await user.click(
      within(menu).getByRole("button", { name: "Add an emoji" })
    );
    await user.click(screen.getByRole("button", { name: "Pick party emoji" }));

    expect(liveblocksMocks.updateMyPresence).toHaveBeenCalledWith({
      status: { emoji: "🎉", text: "", away: false },
    });
  });
});

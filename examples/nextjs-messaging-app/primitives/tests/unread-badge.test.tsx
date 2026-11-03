import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnreadBadge } from "@/primitives/unread-badge";
import { resetMockState } from "@/tests/helpers/liveblocks-mock";

vi.mock(
  "@liveblocks/react/suspense",
  () => import("@/tests/helpers/liveblocks-mock")
);
vi.mock("@liveblocks/react", () => import("@/tests/helpers/liveblocks-mock"));

describe("UnreadBadge", () => {
  beforeEach(() => {
    resetMockState({});
  });

  it("renders nothing for zero", () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([1, 42, 99])("renders %i", (count) => {
    render(<UnreadBadge count={count} />);
    expect(screen.getByLabelText(`${count} unread`)).toHaveTextContent(
      String(count)
    );
  });

  it("caps the displayed count at 99+", () => {
    render(<UnreadBadge count={100} />);
    expect(screen.getByLabelText("100 unread")).toHaveTextContent("99+");
  });
});

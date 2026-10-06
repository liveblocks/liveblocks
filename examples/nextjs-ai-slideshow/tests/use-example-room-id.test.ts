// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useExampleRoomId } from "@/hooks/use-example-room-id";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

import { useSearchParams } from "next/navigation";

describe("useExampleRoomId", () => {
  it("returns the base room id when exampleId is absent", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("") as ReturnType<typeof useSearchParams>
    );

    const { result } = renderHook(() => useExampleRoomId());
    expect(result.current).toBe("liveblocks:examples:nextjs-ai-slideshow");
  });

  it("returns a suffixed room id when exampleId is present", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("exampleId=abc") as ReturnType<typeof useSearchParams>
    );

    const { result } = renderHook(() => useExampleRoomId());
    expect(result.current).toBe("liveblocks:examples:nextjs-ai-slideshow-abc");
  });
});

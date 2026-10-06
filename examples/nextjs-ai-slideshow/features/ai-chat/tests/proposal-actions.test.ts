import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProposal } from "../proposal-actions";

describe("resolveProposal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs JSON action roomId feedId messageId to apply-slide and returns newSlideIds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ newSlideIds: ["abc12345"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const proposal = {
      feedId: "feed-1",
      messageId: "msg-1",
      proposals: [{ slideId: "new", html: "<p>x</p>" }],
    };

    const result = await resolveProposal("room-1", proposal, "apply");

    expect(fetchMock).toHaveBeenCalledWith("/api/apply-slide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        roomId: "room-1",
        feedId: "feed-1",
        messageId: "msg-1",
      }),
    });
    expect(result).toEqual({ newSlideIds: ["abc12345"] });
  });

  it("returns empty newSlideIds when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    );

    const result = await resolveProposal(
      "room",
      { feedId: "f", messageId: "m", proposals: [] },
      "reject"
    );

    expect(result).toEqual({ newSlideIds: [] });
  });

  it("returns empty newSlideIds when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("not json")),
      })
    );

    const result = await resolveProposal(
      "room",
      { feedId: "f", messageId: "m", proposals: [] },
      "apply"
    );

    expect(result).toEqual({ newSlideIds: [] });
  });
});

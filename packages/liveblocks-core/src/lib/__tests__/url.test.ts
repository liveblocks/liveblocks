import { describe, expect, test } from "vitest";

import { generateUrl, sanitizeUrl } from "../url";

describe("sanitizeUrl", () => {
  test("should return valid URLs as-is", () => {
    expect(sanitizeUrl("https://liveblocks.io")).toBe("https://liveblocks.io");
    expect(sanitizeUrl("https://liveblocks.io/docs")).toBe(
      "https://liveblocks.io/docs"
    );
    expect(sanitizeUrl("http://blog.liveblocks.io/")).toBe(
      "http://blog.liveblocks.io/"
    );
    expect(sanitizeUrl("/examples")).toBe("/examples");
    expect(sanitizeUrl("#anchor")).toBe("#anchor");
  });

  test("should normalize relative URLs", () => {
    expect(sanitizeUrl("./docs")).toBe("/docs");
    expect(sanitizeUrl("../docs")).toBe("/docs");
  });

  test("should normalize www URLs to HTTPS", () => {
    expect(sanitizeUrl("www.liveblocks.io")).toBe("https://www.liveblocks.io");
    expect(sanitizeUrl("www.liveblocks.io/docs/get-started")).toBe(
      "https://www.liveblocks.io/docs/get-started"
    );
  });

  test("should support ports, query params, and a hash", () => {
    expect(sanitizeUrl("https://localhost:3000/docs?query=value#hash")).toBe(
      "https://localhost:3000/docs?query=value#hash"
    );
    expect(sanitizeUrl("/examples?query=2&query=10")).toBe(
      "/examples?query=2&query=10"
    );
  });

  test("should preserve the presence/absence of trailing slashes", () => {
    expect(sanitizeUrl("https://liveblocks.io/")).toBe(
      "https://liveblocks.io/"
    );
    expect(sanitizeUrl("https://liveblocks.io/docs/")).toBe(
      "https://liveblocks.io/docs/"
    );
    expect(sanitizeUrl("http://blog.liveblocks.io/?query=value")).toBe(
      "http://blog.liveblocks.io/?query=value"
    );
    expect(sanitizeUrl("http://blog.liveblocks.io/?query=value#hash")).toBe(
      "http://blog.liveblocks.io/?query=value#hash"
    );

    expect(sanitizeUrl("https://liveblocks.io")).toBe("https://liveblocks.io");
    expect(sanitizeUrl("https://liveblocks.io/docs")).toBe(
      "https://liveblocks.io/docs"
    );
    expect(sanitizeUrl("http://blog.liveblocks.io?query=value")).toBe(
      "http://blog.liveblocks.io?query=value"
    );
    expect(sanitizeUrl("http://blog.liveblocks.io?query=value#hash")).toBe(
      "http://blog.liveblocks.io?query=value#hash"
    );
  });

  test("should reject non-HTTP(S) protocols and other invalid URLs", () => {
    expect(sanitizeUrl("javascript:alert('xss')")).toBe(null);
    expect(sanitizeUrl("data:text/html,<script>alert('xss')</script>")).toBe(
      null
    );
    expect(sanitizeUrl("vbscript:alert('xss')")).toBe(null);
    expect(sanitizeUrl("file:///etc/passwd")).toBe(null);
    expect(sanitizeUrl("//liveblocks.io")).toBe(null);
    expect(sanitizeUrl("")).toBe(null);
    expect(sanitizeUrl("#")).toBe(null);
  });
});

describe("generateUrl", () => {
  test("should generate absolute URLs", () => {
    expect(generateUrl("https://liveblocks.io/examples")).toBe(
      "https://liveblocks.io/examples"
    );
    expect(
      generateUrl("https://liveblocks.io/examples", {
        query: "value",
      })
    ).toBe("https://liveblocks.io/examples?query=value");
    expect(
      generateUrl(
        "https://liveblocks.io/examples",
        {
          query: 2,
        },
        "hash"
      )
    ).toBe("https://liveblocks.io/examples?query=2#hash");
  });

  test("should preserve any existing query params and hash", () => {
    expect(
      generateUrl("https://liveblocks.io/examples?existing=1#existinghash", {
        query: "value",
      })
    ).toBe(
      "https://liveblocks.io/examples?existing=1&query=value#existinghash"
    );
  });
});

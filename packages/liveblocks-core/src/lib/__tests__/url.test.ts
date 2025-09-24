import { assertSame } from "tosti";
import { describe, test } from "vitest";

import { generateUrl, sanitizeUrl } from "../url";

describe("sanitizeUrl", () => {
  test("should return valid URLs as-is", () => {
    assertSame(sanitizeUrl("https://liveblocks.io"), "https://liveblocks.io");
    assertSame(
      sanitizeUrl("https://liveblocks.io/docs"),
      "https://liveblocks.io/docs"
    );
    assertSame(
      sanitizeUrl("http://blog.liveblocks.io/"),
      "http://blog.liveblocks.io/"
    );
    assertSame(sanitizeUrl("/examples"), "/examples");
    assertSame(sanitizeUrl("#anchor"), "#anchor");
  });

  test("should normalize relative URLs", () => {
    assertSame(sanitizeUrl("./docs"), "/docs");
    assertSame(sanitizeUrl("../docs"), "/docs");
  });

  test("should normalize www URLs to HTTPS", () => {
    assertSame(sanitizeUrl("www.liveblocks.io"), "https://www.liveblocks.io");
    assertSame(
      sanitizeUrl("www.liveblocks.io/docs/get-started"),
      "https://www.liveblocks.io/docs/get-started"
    );
  });

  test("should support hash-only URLs", () => {
    assertSame(sanitizeUrl("#"), "#");
    assertSame(sanitizeUrl("#hash"), "#hash");
  });

  test("should support ports, query params, and a hash", () => {
    assertSame(
      sanitizeUrl("https://localhost:3000/docs?query=value#hash"),
      "https://localhost:3000/docs?query=value#hash"
    );
    assertSame(
      sanitizeUrl("/examples?query=2&query=10"),
      "/examples?query=2&query=10"
    );
  });

  test("should preserve the presence/absence of trailing slashes", () => {
    assertSame(sanitizeUrl("https://liveblocks.io/"), "https://liveblocks.io/");
    assertSame(
      sanitizeUrl("https://liveblocks.io/docs/"),
      "https://liveblocks.io/docs/"
    );
    assertSame(
      sanitizeUrl("http://blog.liveblocks.io/?query=value"),
      "http://blog.liveblocks.io/?query=value"
    );
    assertSame(
      sanitizeUrl("http://blog.liveblocks.io/?query=value#hash"),
      "http://blog.liveblocks.io/?query=value#hash"
    );

    assertSame(sanitizeUrl("https://liveblocks.io"), "https://liveblocks.io");
    assertSame(
      sanitizeUrl("https://liveblocks.io/docs"),
      "https://liveblocks.io/docs"
    );
    assertSame(
      sanitizeUrl("http://blog.liveblocks.io?query=value"),
      "http://blog.liveblocks.io?query=value"
    );
    assertSame(
      sanitizeUrl("http://blog.liveblocks.io?query=value#hash"),
      "http://blog.liveblocks.io?query=value#hash"
    );
  });

  test("should reject non-HTTP(S) protocols and other invalid URLs", () => {
    assertSame(sanitizeUrl("javascript:alert('xss')"), null);
    assertSame(
      sanitizeUrl("data:text/html,<script>alert('xss')</script>"),
      null
    );
    assertSame(sanitizeUrl("vbscript:alert('xss')"), null);
    assertSame(sanitizeUrl("file:///etc/passwd"), null);
    assertSame(sanitizeUrl("//liveblocks.io"), null);
    assertSame(sanitizeUrl(""), null);
  });
});

describe("generateUrl", () => {
  test("should generate absolute URLs", () => {
    assertSame(
      generateUrl("https://liveblocks.io/examples"),
      "https://liveblocks.io/examples"
    );
    assertSame(
      generateUrl("https://liveblocks.io/examples", {
        query: "value",
      }),
      "https://liveblocks.io/examples?query=value"
    );
    assertSame(
      generateUrl(
        "https://liveblocks.io/examples",
        {
          query: 2,
        },
        "hash"
      ),
      "https://liveblocks.io/examples?query=2#hash"
    );
  });

  test("should preserve any existing query params and hash", () => {
    assertSame(
      generateUrl("https://liveblocks.io/examples?existing=1#existinghash", {
        query: "value",
      }),
      "https://liveblocks.io/examples?existing=1&query=value#existinghash"
    );
  });
});

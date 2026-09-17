import { createClient } from "@liveblocks/client";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ClientSideSuspense } from "../ClientSideSuspense";
import { createLiveblocksContext } from "../liveblocks";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("react");
  vi.doUnmock("react-dom");
  vi.unstubAllGlobals();
});

describe("useBrowser", () => {
  test.each(["server", "browser"])(
    "passes the opaque browser value to native React.use in the %s",
    async (environment) => {
      if (environment === "server") {
        vi.stubGlobal("window", undefined);
      }

      const browserValue = Object.freeze({});
      const nativeUse = vi.fn();
      const browser = vi.fn(() => browserValue);
      mockBrowserSupport(nativeUse, browser);
      const { useBrowser } = await import("../lib/use-browser");

      useBrowser();

      expect(browser).toHaveBeenCalledOnce();
      expect(nativeUse).toHaveBeenCalledExactlyOnceWith(browserValue);
    }
  );

  test("propagates React's suspension without starting a query", async () => {
    vi.stubGlobal("window", undefined);
    const suspension = new Error("React suspension");
    mockBrowserSupport(
      () => {
        throw suspension;
      },
      () => Object.freeze({})
    );
    const { createLiveblocksContext } = await import("../liveblocks");
    const authEndpoint = vi.fn(async () => ({ token: "unused" }));
    const fetch = vi.fn();
    const client = createClient({ authEndpoint, polyfills: { fetch } });
    const {
      suspense: { useInboxNotifications },
    } = createLiveblocksContext(client);

    expect(useInboxNotifications).toThrow(suspension);
    expect(authEndpoint).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([
    { name: "React 18", nativeUse: undefined, browser: undefined },
    {
      name: "React 19 before browser()",
      nativeUse: vi.fn(),
      browser: undefined,
    },
    { name: "React without use()", nativeUse: undefined, browser: vi.fn() },
  ])(
    "preserves the legacy guard with $name",
    async ({ nativeUse, browser }) => {
      mockBrowserSupport(nativeUse, browser);
      const { useBrowser } = await import("../lib/use-browser");

      expect(useBrowser).not.toThrow();

      vi.stubGlobal("window", undefined);
      expect(useBrowser).toThrow("ClientSideSuspense");
      if (nativeUse) {
        expect(nativeUse).not.toHaveBeenCalled();
      }
      if (browser) {
        expect(browser).not.toHaveBeenCalled();
      }
    }
  );
});

test("ClientSideSuspense still renders its fallback on the server", () => {
  vi.stubGlobal("window", undefined);
  const authEndpoint = vi.fn(async () => ({ token: "unused" }));
  const client = createClient({ authEndpoint });
  const {
    suspense: { useInboxNotifications },
  } = createLiveblocksContext(client);
  const renderContent = vi.fn();

  function Content() {
    renderContent();
    useInboxNotifications();
    return <div>Notifications</div>;
  }

  expect(() => renderToString(<Content />)).toThrow("ClientSideSuspense");
  renderContent.mockClear();

  const html = renderToString(
    <ClientSideSuspense fallback={<div>Loading</div>}>
      <Content />
    </ClientSideSuspense>
  );

  expect(html).toContain("<div>Loading</div>");
  expect(renderContent).not.toHaveBeenCalled();
  expect(authEndpoint).not.toHaveBeenCalled();
});

function mockBrowserSupport(
  nativeUse: ((value: unknown) => unknown) | undefined,
  browser: (() => unknown) | undefined
) {
  vi.doMock("react", () => ({ ...React, use: nativeUse }));
  vi.doMock("react-dom", () => ({ ...ReactDOM, browser }));
}

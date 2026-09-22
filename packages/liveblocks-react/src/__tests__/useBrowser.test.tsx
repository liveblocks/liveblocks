import { createClient } from "@liveblocks/client";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("react");
  vi.doUnmock("react-dom");
  vi.doUnmock("../lib/react-dom");
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

  test.each(["default", "suspense", "factory"])(
    "suspends hooks in the %s provider before authentication or fetching",
    async (provider) => {
      vi.stubGlobal("window", undefined);
      const suspension$ = new Promise<never>(() => {});
      const browserValue = Object.freeze({});
      const nativeUse = vi.fn(() => {
        throw suspension$;
      });
      mockBrowserSupport(nativeUse, () => browserValue);
      const { LiveblocksProvider, createLiveblocksContext } =
        await import("../index");
      const {
        LiveblocksProvider: SuspenseLiveblocksProvider,
        useInboxNotifications,
      } = await import("../suspense");
      const authEndpoint = vi.fn(async () => ({ token: "unused" }));
      const fetch = vi.fn();
      const options = { authEndpoint, polyfills: { fetch } };
      const Provider =
        provider === "factory"
          ? createLiveblocksContext(createClient(options)).LiveblocksProvider
          : provider === "suspense"
            ? SuspenseLiveblocksProvider
            : LiveblocksProvider;

      function Content() {
        useInboxNotifications();
        return <div>Notifications</div>;
      }

      const html = renderToString(
        <Provider {...options}>
          <React.Suspense fallback={<div>Loading</div>}>
            <Content />
          </React.Suspense>
        </Provider>
      );

      expect(html).toContain("<div>Loading</div>");
      expect(html).not.toContain("<div>Notifications</div>");
      expect(nativeUse).toHaveBeenCalledExactlyOnceWith(browserValue);
      expect(authEndpoint).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

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

test.each(["absent", "installed"])(
  "the native helper ignores React DOM when it is %s",
  async (reactDOM) => {
    const nativeUse = vi.fn();
    const browser = vi.fn();
    vi.doMock("react", () => ({ ...React, use: nativeUse }));
    const loadReactDOM = vi.fn(() => {
      if (reactDOM === "absent") {
        throw new Error("React DOM is not installed");
      }
      return { browser };
    });
    vi.doMock("react-dom", loadReactDOM);
    vi.doMock("../lib/react-dom", () => import("../lib/react-dom.native"));
    const { LiveblocksProvider } = await import("../index");
    const { useInboxNotifications } = await import("../suspense");
    const { useBrowser } = await import("../lib/use-browser");
    const authEndpoint = vi.fn(async () => ({ token: "unused" }));

    expect(useBrowser).not.toThrow();

    function Content() {
      useInboxNotifications();
      return <div>Notifications</div>;
    }

    vi.stubGlobal("window", undefined);
    expect(() =>
      renderToString(
        <LiveblocksProvider authEndpoint={authEndpoint}>
          <Content />
        </LiveblocksProvider>
      )
    ).toThrow("ClientSideSuspense");
    expect(loadReactDOM).not.toHaveBeenCalled();
    expect(browser).not.toHaveBeenCalled();
    expect(nativeUse).not.toHaveBeenCalled();
    expect(authEndpoint).not.toHaveBeenCalled();
  }
);

test("ClientSideSuspense still renders its fallback on the server", async () => {
  vi.stubGlobal("window", undefined);
  mockBrowserSupport(undefined, undefined);
  const { LiveblocksProvider, ClientSideSuspense, useInboxNotifications } =
    await import("../suspense");
  const authEndpoint = vi.fn(async () => ({ token: "unused" }));
  const renderContent = vi.fn();

  function Content() {
    renderContent();
    useInboxNotifications();
    return <div>Notifications</div>;
  }

  const html = renderToString(
    <LiveblocksProvider authEndpoint={authEndpoint}>
      <ClientSideSuspense fallback={<div>Loading</div>}>
        <Content />
      </ClientSideSuspense>
    </LiveblocksProvider>
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
  vi.doMock("react-dom", () => ({ browser }));
}

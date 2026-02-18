import { describe, expect, test } from "vitest";

import { abort, json, ZenRelay, ZenRouter } from "~/index.js";
import {
  captureConsole,
  disableConsole,
  expectResponse,
  ok,
} from "~test/utils.js";

const WITHOUT_AUTH = {
  authorize: () => Promise.resolve(true),
};

describe("Relay basic setup", () => {
  test("no configured relays", async () => {
    disableConsole();

    const relay = new ZenRelay();
    const req = new Request("http://example.org/");
    const resp = await relay.fetch(req);
    await expectResponse(resp, { error: "Not Found" }, 404);
  });

  test("unused prefixes", async () => {
    disableConsole();

    const foo = new ZenRouter(WITHOUT_AUTH);
    foo.route("GET /foo/bar", ok("From bar"));

    const relay = new ZenRelay();
    relay.relay("/foo/*", foo);

    {
      const req = new Request("http://example.org/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Router, not by Relay!
    }

    {
      const req = new Request("http://example.org/foo/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From bar" });
    }
  });

  test("no partial url segment matching", async () => {
    disableConsole();

    const foo = new ZenRouter(WITHOUT_AUTH);
    foo.route("GET /foo/bar", ok("From bar"));

    const relay = new ZenRelay();
    relay.relay("/foo/*", foo);
    relay.relay("/*", () => fail("Nope"));

    {
      const req = new Request("http://example.org/foooooo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Internal Server Error" }, 500); // thrown by the nope
    }

    {
      const req = new Request("http://example.org/fo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Internal Server Error" }, 500); // thrown by the nope
    }

    {
      const req = new Request("http://example.org/foo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Router, not by Relay!
    }

    {
      const req = new Request("http://example.org/foo/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From bar" });
    }
  });

  test("dynamic placeholders #1", async () => {
    disableConsole();

    const foo = new ZenRouter(WITHOUT_AUTH);
    foo.route("GET /foo/bar", ok("From bar"));
    foo.route("GET /foo/qux/hello", ok("From hello"));
    foo.route("GET /foo/baz/mutt", ok("From mutt"));

    const relay = new ZenRelay();
    relay.relay("/foo/<abc>/*", foo);

    {
      const req = new Request("http://example.org/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Router, not by Relay!
    }

    {
      const req = new Request("http://example.org/foo/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Router, not by Relay!
    }

    {
      const req = new Request("http://example.org/foo/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From bar" });
    }

    {
      const req = new Request("http://example.org/foo/bar/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From bar" });
    }
  });

  test("dynamic placeholders #2", async () => {
    disableConsole();

    const foo = new ZenRouter(WITHOUT_AUTH);
    foo.route("GET /foo/bar", ok("From bar"));
    foo.route("GET /foo/qux/hello", ok("From hello"));
    foo.route("GET /foo/baz/mutt", ok("From mutt"));

    const relay = new ZenRelay();
    relay.relay("/<abc>/baz/*", foo);

    {
      const req = new Request("http://example.org/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo/baz/mutt");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From mutt" });
    }
  });

  test("catchalls", async () => {
    disableConsole();

    const foo = new ZenRouter(WITHOUT_AUTH);
    foo.route("GET /foo/bar", ok("From router 1"));

    const bar = new ZenRouter(WITHOUT_AUTH);
    bar.route("GET /bar/baz", ok("From router 2"));

    const qux = new ZenRouter(WITHOUT_AUTH);
    qux.route("GET /qux/mutt", ok("From router 3"));

    const relay = new ZenRelay();
    relay.relay("/foo/*", foo);
    relay.relay("/bar/*", bar);
    relay.relay("/*", qux);

    {
      const req = new Request("http://example.org/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From router 1" });
    }

    {
      const req = new Request("http://example.org/bar/baz");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From router 2" });
    }

    {
      const req = new Request("http://example.org/qux/mutt");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From router 3" });
    }

    {
      const req = new Request("http://example.org/foo/i-do-not-exist");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // From router 1
    }

    {
      const req = new Request("http://example.org/bar/i-do-not-exist");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // From router 2
    }

    {
      const req = new Request("http://example.org/qux/i-do-not-exist");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // From router 3
    }
  });

  test("catchalls (order matters)", async () => {
    disableConsole();

    const foo = new ZenRouter(WITHOUT_AUTH);
    foo.route("GET /foo/bar", ok("From router 1"));

    const bar = new ZenRouter(WITHOUT_AUTH);
    bar.route("GET /bar/baz", ok("From router 2"));

    const qux = new ZenRouter(WITHOUT_AUTH);
    qux.route("GET /qux/mutt", ok("From router 3"));

    const relay = new ZenRelay();
    relay.relay("/*", qux); // 🔑 NOTE: Catchall defined before all other routes!
    relay.relay("/foo/*", foo);
    relay.relay("/bar/*", bar);

    {
      const req = new Request("http://example.org/");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // thrown by Relay
    }

    {
      const req = new Request("http://example.org/foo/bar");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // From router 3
    }

    {
      const req = new Request("http://example.org/bar/baz");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Not Found" }, 404); // From router 3
    }

    {
      const req = new Request("http://example.org/qux/mutt");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { message: "From router 3" });
    }
  });
});

describe("Misconfigured Relay instance", () => {
  test("invalid match prefix #1", () => {
    const relay = new ZenRelay();
    expect(() => relay.relay("GET /foo" as any, new ZenRouter())).toThrow(
      "Invalid path prefix: GET /foo"
    );
  });

  test("invalid match prefix #2", () => {
    const relay = new ZenRelay();
    expect(() => relay.relay("/foo /bar" as any, new ZenRouter())).toThrow(
      "Invalid path prefix: /foo /bar"
    );
  });

  test("invalid match prefix #3", () => {
    const relay = new ZenRelay();
    expect(() => relay.relay("/foo" as any, new ZenRouter())).toThrow(
      "Invalid path prefix: /foo"
    );
  });

  test("invalid match prefix #4", () => {
    const relay = new ZenRelay();
    expect(() => relay.relay("/foo*" as any, new ZenRouter())).toThrow(
      "Invalid path prefix: /foo*"
    );
  });
});

describe("Error handling behavior", () => {
  test("aborting vs throwing custom error (which remains uncaught)", async () => {
    const konsole = captureConsole();
    const router = new ZenRouter(WITHOUT_AUTH);
    router.route("GET /test/403", () => abort(403));
    router.route("GET /test/oops", () => {
      throw new Error("Oops");
    });

    const relay = new ZenRelay().relay("/test/*", router);

    {
      const req = new Request("http://example.org/test/403");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Forbidden" }, 403);
    }
    {
      const req = new Request("http://example.org/test/oops");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Internal Server Error" }, 500);
    }

    expect(konsole.log).not.toHaveBeenCalled();
    expect(konsole.warn).not.toHaveBeenCalled();
    expect(konsole.error).toHaveBeenCalledWith(
      expect.stringMatching("Uncaught error: Error: Oops")
    );
    expect(konsole.error).toHaveBeenCalledWith(
      "...but no uncaught error handler was set up for this router."
    );
  });

  test("same, but now uncaught handler is defined (at the Router level)", async () => {
    const konsole = captureConsole();
    const router = new ZenRouter(WITHOUT_AUTH);
    router.onUncaughtError(() => json({ custom: "error" }, 500));

    router.route("GET /test/403", () => abort(403));
    router.route("GET /test/oops", () => {
      throw new Error("Oops");
    });

    const relay = new ZenRelay().relay("/test/*", router);

    {
      const req = new Request("http://example.org/test/403");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { error: "Forbidden" }, 403);
    }
    {
      const req = new Request("http://example.org/test/oops");
      const resp = await relay.fetch(req);
      await expectResponse(resp, { custom: "error" }, 500);
    }

    expect(konsole.log).not.toHaveBeenCalled();
    expect(konsole.warn).not.toHaveBeenCalled();
    expect(konsole.error).not.toHaveBeenCalled();
    expect(konsole.error).not.toHaveBeenCalled();
  });

  test("same, but now there is no Router (we're using a custom handler function) #1", async () => {
    const app = new ZenRelay().relay(
      "/oops/*",
      // NOTE! *Not* using a Router instance here, instead using a custom
      // handler function directly! This is NOT recommended, but currently
      // supported only to allow using itty-router here!
      () => {
        throw new Error("Oops");
      }
    );

    const req = new Request("http://example.org/haha"); // NOTE: Not calling /oops here!
    const resp = await app.fetch(req);
    await expectResponse(resp, { error: "Not Found" }, 404);
  });

  test("same, but now there is no Router (we're using a custom handler function) #2", async () => {
    const app = new ZenRelay().relay(
      "/oops/*",
      // NOTE! *Not* using a Router instance here, instead using a custom
      // handler function directly! This is NOT recommended, but currently
      // supported only to allow using itty-router here!
      () => {
        throw new Error("Oops");
      }
    );

    const konsole = captureConsole();

    const req = new Request("http://example.org/oops");
    const resp = await app.fetch(req);
    await expectResponse(resp, { error: "Internal Server Error" }, 500);

    expect(konsole.log).not.toHaveBeenCalled();
    expect(konsole.warn).not.toHaveBeenCalled();
    expect(konsole.error).toHaveBeenCalledTimes(3);
    expect(konsole.error).toHaveBeenCalledWith(
      "Relayer caught error in subrouter! This should never happen, as routers should never throw an unexpected error! Error: Oops"
    );
    expect(konsole.error).toHaveBeenCalledWith(
      expect.stringMatching("Uncaught error: Error: Oops")
    );
    expect(konsole.error).toHaveBeenCalledWith(
      "...but no uncaught error handler was set up for this router."
    );
  });
});

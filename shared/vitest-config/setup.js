import "whatwg-fetch";

// Set up a base URL for tests since MSW tests use relative URLs
if (typeof global !== "undefined") {
  global.location = {
    origin: "http://dummy",
    href: "http://dummy/",
    hostname: "dummy",
    protocol: "http:",
    port: "",
    pathname: "/",
    search: "",
    hash: ""
  };
}

// Also set it up for window if in browser-like environment
if (typeof window !== "undefined") {
  Object.defineProperty(window, "location", {
    value: {
      origin: "http://dummy",
      href: "http://dummy/",
      hostname: "dummy", 
      protocol: "http:",
      port: "",
      pathname: "/",
      search: "",
      hash: ""
    },
    writable: true,
  });
}
//
// NOTE: Node, which runs our Jest tests, does not have a global window.fetch
// API. By including the following line before each test run, we polyfill it,
// since Liveblocks relies on it internally.
//
require("whatwg-fetch");

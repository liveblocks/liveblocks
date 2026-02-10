// HeadersInit is normally a global from lib.dom.d.ts (for DOM or Node
// environments), or from @cloudflare/workers-types. In this case, we want to
// be able to use it from _both_ environments, so we're defining it here inline
// as the intersection of the two.
export type HeadersInit = Record<string, string> | Headers;

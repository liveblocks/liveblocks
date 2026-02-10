import type { Resolve } from "@liveblocks/core";
import type { Decoder } from "decoders";
import type {
  ComposeLeft,
  Objects,
  Pipe,
  Strings,
  Tuples,
  Unions,
} from "hotscript";

import { raise } from "./utils.js";

const cleanSegmentRe = /^[\w-]+$/;
const identifierRe = /^[a-z]\w*$/;
const pathPrefixRegex = /^\/(([\w-]+|<[\w-]+>)\/)*\*$/;

export type Method = (typeof ALL_METHODS)[number];
export type HttpVerb = (typeof ALL_HTTP_VERBS)[number];

// All supported HTTP verbs, in their most natural ordering
export const ALL_HTTP_VERBS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

export function sortHttpVerbsInPlace(verbs: HttpVerb[]): HttpVerb[] {
  return verbs.sort(
    (a, b) => ALL_HTTP_VERBS.indexOf(a) - ALL_HTTP_VERBS.indexOf(b)
  );
}

//
// Subset of ALL_HTTP_VERBS, but OPTIONS is not included. This is because Zen
// Router will automatically allow OPTIONS for all registered routes, i.e. an
// explicit OPTIONS definition like this is (currently) not allowed:
//
//   router.route('OPTIONS /my/path', ...)
//
export const ALL_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export type PathPattern = `/${string}`;
export type Pattern = `${Method} ${PathPattern}`;
export type PathPrefix = `/${string}/*` | "/*";

/**
 * From a pattern like:
 *
 *   'GET /foo/<bar>/<qux>/baz'
 *
 * Extracts:
 *
 *   { foo: string, bar: string }
 */
type ExtractParamsBasic<P extends Pattern> = Pipe<
  P, // ....................................... 'GET /foo/<bar>/<qux>/baz'
  [
    Strings.TrimLeft<`${Method} `>, // ........ '/foo/<bar>/<qux>/baz'
    Strings.Split<"/">, // .................... ['', 'foo', '<bar>', '<qux>', 'baz']
    Tuples.Filter<Strings.StartsWith<"<">>, //  ['<bar>', '<qux>']
    Tuples.Map<
      ComposeLeft<
        [
          Strings.Trim<"<" | ">">, // ......... ['bar', 'qux']
          Unions.ToTuple, // .................. [['bar'], ['qux']]
          Tuples.Append<string>, // ........... [['bar', string], ['qux', string]]
        ]
      >
    >,
    Tuples.ToUnion, // ........................ ['bar', string] | ['qux', string]
    Objects.FromEntries, // ................... { bar: string; qux: string }
  ]
>;

/**
 * For:
 *
 *   {
 *     a: Decoder<number>,
 *     b: Decoder<'hi'>,
 *     c: Decoder<boolean>,
 *   }
 *
 * Will return:
 *
 *   {
 *     a: number,
 *     b: 'hi',
 *     c: boolean,
 *   }
 *
 */
export type MapDecoderTypes<T> = {
  [K in keyof T]: T[K] extends Decoder<infer V> ? V : never;
};

// export type WithDefaults<A, B> = Pipe<>;

/**
 * From a pattern like:
 *
 *   'GET /foo/<bar>/<n>/baz'
 *
 * Extracts:
 *
 *   { foo: string, n: number }
 */
export type ExtractParams<
  P extends Pattern,
  TParamTypes extends Record<string, unknown>,
  E = ExtractParamsBasic<P>,
> = Resolve<
  Pick<Omit<E, keyof TParamTypes> & TParamTypes, Extract<keyof E, string>>
>;

const ALL: Method[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

export interface RouteMatcher {
  method: Method;
  matchMethod(req: { method?: string }): boolean;
  matchURL(url: URL): Record<string, string> | null;
}

function segmentAsVariable(s: string): string | null {
  if (s.startsWith("<") && s.endsWith(">")) {
    const identifier = s.slice(1, -1);
    return identifierRe.test(identifier) ? identifier : null;
  }
  return null;
}

function splitMethodAndPattern(
  pattern: string
): [method: Method, pattern: string] {
  for (const method of ALL) {
    if (pattern.startsWith(method)) {
      return [method, pattern.slice(method.length).trimStart()];
    }
  }
  throw new Error(
    `Invalid route pattern: ${JSON.stringify(pattern)}${
      pattern.startsWith("/")
        ? `. Did you mean ${JSON.stringify(`GET ${pattern}`)}?`
        : ""
    }`
  );
}

function makePathMatcher(pattern: string, options: { exact: boolean }): RegExp {
  const exact = options.exact;
  if (pattern === "/") {
    return exact ? /^\/$/ : /^\//;
  }

  if (!pattern.startsWith("/")) {
    // istanbul ignore next -- @preserve
    throw new Error(
      `Route must start with '/', but got ${JSON.stringify(pattern)}`
    );
  }

  if (pattern.endsWith("/")) {
    // istanbul ignore next -- @preserve
    throw new Error(
      `Route may not end with '/', but got ${JSON.stringify(pattern)}`
    );
  }

  const segments = pattern.slice(1).split("/");

  let index = 1;
  const regexString: string[] = [];
  for (const segment of segments) {
    const placeholder = segmentAsVariable(segment);
    if (placeholder !== null) {
      regexString.push(`(?<${placeholder}>[^/]+)`);
    } else if (cleanSegmentRe.test(segment)) {
      regexString.push(segment);
    } else {
      return raise(`Invalid pattern: ${pattern} (error at position ${index + 1})`); // prettier-ignore
    }

    index += segment.length + 1;
  }

  return new RegExp("^/" + regexString.join("/") + (exact ? "/?$" : "(/|$)"));
}

export function makePrefixPathMatcher(prefix: string): RegExp {
  pathPrefixRegex.test(prefix) || raise(`Invalid path prefix: ${prefix}`);
  prefix = prefix.slice(0, -2); // Remove the "/*" suffix
  prefix ||= "/"; // If the remaining prefix is "" (empty string), use a "/" instead

  // Register the prefix matcher
  return makePathMatcher(prefix, { exact: false });
}

export function routeMatcher(input: string): RouteMatcher {
  const [method, pattern] = splitMethodAndPattern(input);
  const regex = makePathMatcher(pattern, { exact: true });
  return {
    method,
    matchMethod(req: Request): boolean {
      return method === req.method;
    },
    matchURL(url: URL) {
      const matches = url.pathname.match(regex);
      if (matches === null) {
        return null;
      }
      return matches.groups ?? {};
    },
  };
}

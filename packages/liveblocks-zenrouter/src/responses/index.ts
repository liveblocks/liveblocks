import type { JSONObject, JSONValue } from "decoders";

import type { HeadersInit } from "./compat.js";
import { HttpError, ValidationError } from "./HttpError.js";

const KB = 1024;

/**
 * A simple shim for ReadableStream.from(). Uses the native implementation if
 * available.
 *
 * This polyfill does not guarantee spec-compliance, and merely exists so we
 * can use ReadableStream.from() in environments that don't support this API
 * yet, like Bun, or old Node versions.
 *
 * This API is available in the following runtimes:
 * - Node.js (since v20.6+)
 * - Cloudflare Workers (since Apr 4, 2024)
 *
 * But not supported yet in:
 * - Bun - see https://github.com/oven-sh/bun/issues/3700
 */
function ReadableStream_from_shim<T>(iterable: Iterable<T>): ReadableStream<T> {
  const iterator = iterable[Symbol.iterator]();
  return new ReadableStream<T>({
    pull(controller) {
      const res = iterator.next();
      if (res.done) {
        controller.close();
      } else {
        controller.enqueue(res.value);
      }
    },
    cancel() {
      iterator.return?.();
    },
  });
}

/* eslint-disable */
const ReadableStream_from =
  typeof (ReadableStream as any).from === "function"
    ? ((ReadableStream as any).from.bind(ReadableStream) as <T>(
        iterable: Iterable<T>
      ) => ReadableStream<T>)
    : ReadableStream_from_shim;
/* eslint-enable */

function* imap<T, U>(iterable: Iterable<T>, fn: (x: T) => U): Iterable<U> {
  for (const x of iterable) {
    yield fn(x);
  }
}

/**
 * WeakSet tracking "generic" abort responses.
 * Generic responses can be replaced by the error handler with custom error formatting.
 * Non-generic responses (e.g., custom json() responses) are returned verbatim.
 */
const genericAborts = new WeakSet<Response>();

/**
 * Checks if a Response is a generic abort response (created by abort()).
 */
export function isGenericAbort(resp: Response): boolean {
  return genericAborts.has(resp);
}

/**
 * Returns an empty HTTP 204 response.
 */
export function empty(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Return a JSON response.
 */
export function json(
  value: JSONObject,
  status = 200,
  headers?: HeadersInit
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * Return an HTML response.
 */
export function html(
  content: string,
  status = 200,
  headers?: HeadersInit
): Response {
  return new Response(content, {
    status,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Throws a generic abort Response for the given status code. Use this to
 * terminate the handling of a route and return an HTTP error to the user.
 *
 * The response body will be determined by the configured error handler.
 * To return a custom error body that won't be replaced, throw a json() response instead.
 */
export function abort(status: number, headers?: HeadersInit): never {
  const resp = new Response(null, { status, headers });
  genericAborts.add(resp);
  throw resp;
}

const encoder = new TextEncoder();

/**
 * Batch small string chunks into larger blocks of at least `minSize`
 * characters before yielding. Reduces per-chunk overhead when the source
 * generator yields many tiny strings.
 */
function* buffered(iterable: Iterable<string>, size: number): Iterable<string> {
  let buf = "";
  for (const s of iterable) {
    buf += s;
    if (buf.length >= size) {
      yield buf;
      buf = "";
    }
  }
  if (buf) yield buf;
}

/**
 * Return a streaming text response from a generator that yields strings. The
 * stream will be encoded as UTF-8.
 *
 * Small string chunks will get buffered into emitted chunks of `bufSize` bytes (defaults to 64 kB)
 * at least 64kB that many characters before being encoded and enqueued,
 * reducing per-chunk transfer overhead. (By default buffers chunks of at least
 * 64kB size.)
 */
export function textStream(
  iterable: Iterable<string>,
  headers?: HeadersInit,
  options?: {
    bufSize: number;
  }
): Response {
  const source = buffered(iterable, options?.bufSize ?? 64 * KB);
  const chunks = imap(source, (s) => encoder.encode(s));
  return new Response(
    ReadableStream_from(chunks) as unknown as string,
    //                          ^^^^^^^^^^^^^^^^^^^^
    //        This ugly cast needed due to Node.js vs Cloudflare
    //             Workers ReadableStream type mismatch :(
    { headers }
  );
}

/**
 * Return a streaming NDJSON (Newline Delimited JSON) response from a generator
 * that yields JSON values. Each value will be serialized as a single line.
 */
export function ndjsonStream(
  iterable: Iterable<JSONValue>,
  headers?: HeadersInit
): Response {
  const lines = imap(iterable, (value) => `${JSON.stringify(value)}\n`);
  return textStream(lines, {
    ...headers,
    "Content-Type": "application/x-ndjson",
  });
}

/**
 * Return a streaming JSON array response from a generator that yields JSON
 * values. The output will be a valid JSON array: [value1,value2,...]\n
 */
export function jsonArrayStream(
  iterable: Iterable<JSONValue>,
  headers?: HeadersInit
): Response {
  function* chunks() {
    yield "[";
    let first = true;
    for (const value of iterable) {
      if (!first) yield ",";
      first = false;
      yield JSON.stringify(value);
    }
    yield "]\n";
  }
  return textStream(chunks(), {
    ...headers,
    "Content-Type": "application/json; charset=utf-8",
  });
}

export { HttpError, ValidationError };

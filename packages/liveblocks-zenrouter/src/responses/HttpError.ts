import { raise } from "~/lib/utils.js";

import type { HeadersInit } from "./compat.js";

export class HttpError extends Error {
  static readonly codes: { [code: number]: string | undefined } = {
    400: "Bad Request",
    401: "Unauthorized",
    // 402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    // 407: "Proxy Authentication Required",
    // 408: "Request Timeout",
    409: "Conflict",
    // 410: "Gone",
    411: "Length Required",
    // 412: "Precondition Failed",
    413: "Payload Too Large",
    // 414: "URI Too Long",
    415: "Unsupported Media Type",
    // 416: "Range Not Satisfiable",
    // 417: "Expectation Failed",
    // 418: "I'm a teapot",
    // 421: "Misdirected Request",
    422: "Unprocessable Entity",
    // 423: "Locked",
    // 424: "Failed Dependency",
    // 425: "Too Early",
    426: "Upgrade Required",
    // 428: "Precondition Required",
    // 429: "Too Many Requests",
    // 431: "Request Header Fields Too Large",
    // 451: "Unavailable For Legal Reasons",
    // 500: "Internal Server Error",
  };

  // TODO Add support for "public reason" details?
  public readonly status: number;
  public readonly headers?: HeadersInit;

  constructor(status: number, message?: string, headers?: HeadersInit) {
    if (typeof status !== "number" || status < 100 || status >= 600) {
      raise(`Invalid HTTP status code: ${status}`);
    }

    if (status >= 500) {
      raise("Don't use HttpError for 5xx errors");
    }

    if (status >= 200 && status < 300) {
      raise("Cannot create an HTTP error for a success code");
    }

    message ??=
      HttpError.codes[status] ??
      raise(`Unknown error code ${status}, provide a message`);
    super(message);

    if (status === 422 && !(this instanceof ValidationError)) {
      raise("Don't use HttpError for 422 errors, use ValidationError");
    }

    this.status = status;
    this.headers = headers;
  }
}

export class ValidationError extends HttpError {
  public readonly status = 422;
  public readonly reason: string;

  constructor(reason: string) {
    super(422);
    this.reason = reason;
  }
}

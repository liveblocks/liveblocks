import { describe, expect, test } from "vitest";

import { HttpError, ValidationError } from "~/responses/index.js";

describe("HttpError", () => {
  test("construct custom http errors", () => {
    const err = new HttpError(490, "Custom");
    expect(err.status).toEqual(490);
    expect(err.message).toEqual("Custom");
  });

  test("cannot construct http errors with invalid error codes", () => {
    expect(() => new HttpError(-1)).toThrow("Invalid HTTP status code: -1");
    expect(() => new HttpError(-1, "Custom")).toThrow(
      "Invalid HTTP status code: -1"
    );

    expect(() => new HttpError(200)).toThrow(
      "Cannot create an HTTP error for a success code"
    );
    expect(() => new HttpError(200, "Custom")).toThrow(
      "Cannot create an HTTP error for a success code"
    );

    expect(() => new HttpError(299)).toThrow(
      "Cannot create an HTTP error for a success code"
    );
    expect(() => new HttpError(299, "Custom")).toThrow(
      "Cannot create an HTTP error for a success code"
    );

    expect(() => new HttpError(500)).toThrow(
      "Don't use HttpError for 5xx errors"
    );
    expect(() => new HttpError(500, "Custom")).toThrow(
      "Don't use HttpError for 5xx errors"
    );

    expect(() => new HttpError(502)).toThrow(
      "Don't use HttpError for 5xx errors"
    );
    expect(() => new HttpError(502, "Custom")).toThrow(
      "Don't use HttpError for 5xx errors"
    );

    expect(() => new HttpError(600)).toThrow("Invalid HTTP status code: 600");
    expect(() => new HttpError(600, "Custom")).toThrow(
      "Invalid HTTP status code: 600"
    );

    expect(() => new HttpError(650)).toThrow("Invalid HTTP status code: 650");
    expect(() => new HttpError(650, "Custom")).toThrow(
      "Invalid HTTP status code: 650"
    );

    expect(() => new HttpError(1234)).toThrow("Invalid HTTP status code: 1234");
    expect(() => new HttpError(1234, "Custom")).toThrow(
      "Invalid HTTP status code: 1234"
    );
  });

  test("cannot construct non-standard http errors without a custom description", () => {
    expect(() => new HttpError(450)).toThrow(
      "Unknown error code 450, provide a message"
    );

    const err = new HttpError(450, "Custom");
    expect(err.status).toEqual(450);
    expect(err.message).toEqual("Custom");
  });
});

describe("ValidationError", () => {
  test("construct custom validation errors", () => {
    const err = new ValidationError("Invalid value 123 for field xyz");
    expect(err.status).toEqual(422);
    expect(err.message).toEqual("Unprocessable Entity");
    expect(err.reason).toEqual("Invalid value 123 for field xyz");
  });

  test("cannot use HttpError for 422 responses", () => {
    expect(() => new HttpError(422)).toThrow(
      "Don't use HttpError for 422 errors, use ValidationError"
    );
    expect(() => new HttpError(422, "Yo")).toThrow(
      "Don't use HttpError for 422 errors, use ValidationError"
    );
  });
});

import { getDiagnostics } from "..";

describe("diagnostic error reporting", () => {
  it("getDiagnostics returns empty list on valid schema", () => {
    expect(getDiagnostics("type Storage {}")).toEqual([]);
    expect(getDiagnostics("type Storage { foo?: string }")).toEqual([]);
  });

  it("getDiagnostics returns list of issues on schema with parse errors", () => {
    expect(getDiagnostics("type Storage {")).toEqual([
      {
        source: "parser",
        severity: "error",
        message: 'Expected "}" or <identifier> but end of input found.',
        range: [
          { column1: 15, line1: 1, offset: 14 },
          { column1: 15, line1: 1, offset: 14 },
        ],
      },
    ]);
  });

  it("getDiagnostics returns list of issues on schema with semantic errors", () => {
    expect(getDiagnostics("type Storage { x: NonExisting }")).toEqual([
      {
        source: "checker",
        severity: "error",
        message: "Unknown type 'NonExisting'",
        range: [
          { column1: 19, line1: 1, offset: 18 },
          { column1: 30, line1: 1, offset: 29 },
        ],
      },
    ]);
  });

  it("getDiagnostics returns list of issues on schema with semantic errors on entire document", () => {
    expect(getDiagnostics("type DefinitelyNotNamedStorage {\n}\n")).toEqual([
      {
        source: "checker",
        severity: "error",
        message: "Missing root object type definition named 'Storage'",
        range: [
          { column1: 1, line1: 1, offset: 0 },
          { column1: 2, line1: 2, offset: 34 },
        ],
        suggestions: [{ type: "add-object-type-def", name: "Storage" }],
      },
    ]);
  });

  it("getDiagnostics returns suggestions for typos", () => {
    expect(getDiagnostics("type Storage { foo?: String }")).toEqual([
      {
        source: "checker",
        severity: "error",
        range: [
          { offset: 21, line1: 1, column1: 22 },
          { offset: 27, line1: 1, column1: 28 },
        ],
        message: "Unknown type 'String'. Did you mean 'string'?",
        suggestions: [{ type: "replace", name: "string" }],
      },
    ]);
  });

  it("getDiagnostics returns suggestions to remove ranges #1", () => {
    expect(
      getDiagnostics(`
        type Storage {
          foo: string | string | null
        }
      `)
    ).toEqual([
      {
        source: "checker",
        severity: "error",
        range: [
          { offset: 48, line1: 3, column1: 25 },
          { offset: 54, line1: 3, column1: 31 },
        ],
        message: "Type 'string' cannot appear in a union with 'string'",
        suggestions: [{ type: "remove", range: [45, 54] }],
      },
    ]);
  });

  it("getDiagnostics returns suggestions to remove ranges #2", () => {
    expect(
      getDiagnostics(`
        type Storage {
          foo: string |    null |string
        }
      `)
    ).toEqual([
      {
        source: "checker",
        severity: "error",
        range: [
          { offset: 57, line1: 3, column1: 34 },
          { offset: 63, line1: 3, column1: 40 },
        ],
        message: "Type 'string' cannot appear in a union with 'string'",
        suggestions: [{ type: "remove", range: [55, 63] }],
      },
    ]);
  });

  it("getDiagnostics returns suggestions to remove ranges #3", () => {
    expect(
      getDiagnostics(`
        type Storage {
          foo: string |    (string   | null)
        }
      `)
    ).toEqual([
      {
        source: "checker",
        severity: "error",
        range: [
          { offset: 52, line1: 3, column1: 29 },
          { offset: 58, line1: 3, column1: 35 },
        ],
        message: "Type 'string' cannot appear in a union with 'string'",
        suggestions: [{ type: "remove", range: [52, 63] }],
      },
    ]);
  });

  it("getDiagnostics returns suggestions to remove ranges #4", () => {
    expect(
      getDiagnostics(`
        type Storage {
          foo: string |    (   string       )  | null# foo
        }
      `)
    ).toEqual([
      {
        source: "checker",
        severity: "error",
        range: [
          { offset: 55, line1: 3, column1: 32 },
          { offset: 61, line1: 3, column1: 38 },
        ],
        message: "Type 'string' cannot appear in a union with 'string'",

        // No way simple range to remove here that will not break the syntax, so
        // in this case, don't offer a range removal suggestion
        suggestions: undefined,
      },
    ]);
  });
});

describe("diagnostic error reporting (legacy schemas)", () => {
  it("getDiagnostics returns empty list on valid legacy schema", () => {
    expect(
      getDiagnostics(
        "type Storage { s?: String; i?: Int; f?: Float; b?: Boolean; }",
        { allowLegacyBuiltins: true }
      )
    ).toEqual([]);
    expect(
      getDiagnostics(
        "type Storage { s1?: String; i1?: Int; f1?: Float; b1?: Boolean; s2?: string; i2?: number; f2?: number; b2?: boolean; }",
        { allowLegacyBuiltins: true }
      )
    ).toEqual([]);
  });

  it("getDiagnostics reports errors accordingly for legacy schemas", () => {
    expect(
      getDiagnostics("type Storage { s?: String; n?: Number; b?: Boolean; }", {
        allowLegacyBuiltins: true,
      })
    ).toEqual([
      {
        message: "Unknown type 'Number'. Did you mean 'number'?",
        range: [
          { column1: 32, line1: 1, offset: 31 },
          { column1: 38, line1: 1, offset: 37 },
        ],
        severity: "error",
        source: "checker",
        suggestions: [{ name: "number", type: "replace" }],
      },
    ]);
  });
});

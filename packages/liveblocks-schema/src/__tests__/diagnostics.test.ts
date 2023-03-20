import { getDiagnostics } from "..";

describe("diagnostic error reporting", () => {
  it("getDiagnostics returns empty list on valid schema", () => {
    expect(getDiagnostics("type Storage {}")).toEqual([]);
    expect(getDiagnostics("type Storage { foo?: String }")).toEqual([]);
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
    expect(getDiagnostics("type Storage { foo?: string }")).toEqual([
      {
        source: "checker",
        severity: "error",
        range: [
          { offset: 21, line1: 1, column1: 22 },
          { offset: 27, line1: 1, column1: 28 },
        ],
        message: "Unknown type 'string'. Did you mean 'String'?",
        suggestions: [{ type: "replace", name: "String" }],
      },
    ]);
  });
});

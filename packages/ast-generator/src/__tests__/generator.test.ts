import { parseGrammarFromString } from "../generator";

describe("parsing grammars", () => {
  it("parses a grammar", () => {
    expect(
      parseGrammarFromString(`# This is a comment
Abc:
  x: string
  y: @Xyz

@Xyz:
  | Pqr
  | Stu

Pqr:
  p: number

# This is a comment
Stu:
  s: number
`)
    ).toEqual({
      nodes: [
        {
          fields: [
            { name: "x:", ref: { name: "string", ref: "Node" } },
            { name: "y:", ref: { name: "Xyz", ref: "NodeUnion" } },
          ],
          fieldsByName: {
            "x:": { name: "x:", ref: { name: "string", ref: "Node" } },
            "y:": { name: "y:", ref: { name: "Xyz", ref: "NodeUnion" } },
          },
          name: "Abc",
        },
        {
          fields: [{ name: "p:", ref: { name: "number", ref: "Node" } }],
          fieldsByName: {
            "p:": { name: "p:", ref: { name: "number", ref: "Node" } },
          },
          name: "Pqr",
        },
        {
          fields: [{ name: "s:", ref: { name: "number", ref: "Node" } }],
          fieldsByName: {
            "s:": { name: "s:", ref: { name: "number", ref: "Node" } },
          },
          name: "Stu",
        },
      ],
      nodesByName: {
        Abc: {
          fields: [
            { name: "x:", ref: { name: "string", ref: "Node" } },
            { name: "y:", ref: { name: "Xyz", ref: "NodeUnion" } },
          ],
          fieldsByName: {
            "x:": { name: "x:", ref: { name: "string", ref: "Node" } },
            "y:": { name: "y:", ref: { name: "Xyz", ref: "NodeUnion" } },
          },
          name: "Abc",
        },
        Pqr: {
          fields: [{ name: "p:", ref: { name: "number", ref: "Node" } }],
          fieldsByName: {
            "p:": { name: "p:", ref: { name: "number", ref: "Node" } },
          },
          name: "Pqr",
        },
        Stu: {
          fields: [{ name: "s:", ref: { name: "number", ref: "Node" } }],
          fieldsByName: {
            "s:": { name: "s:", ref: { name: "number", ref: "Node" } },
          },
          name: "Stu",
        },
      },
      unions: [
        {
          members: [
            { name: "Pqr", ref: "Node" },
            { name: "Stu", ref: "Node" },
          ],
          name: "Xyz",
        },
      ],
      unionsByName: {
        Xyz: {
          members: [
            { name: "Pqr", ref: "Node" },
            { name: "Stu", ref: "Node" },
          ],
          name: "Xyz",
        },
      },
    });
  });
});

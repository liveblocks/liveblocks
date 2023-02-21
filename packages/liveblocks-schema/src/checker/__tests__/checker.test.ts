import type * as AST from "../../ast";
import { ErrorReporter } from "../../lib/error-reporting";
import { parseDocument } from "../../parser";
import { check } from "..";

describe("checker", () => {
  it("type checking a full document", () => {
    const schemaText = `
      type IamStatic {}

      type Storage {
        x: IamStatic
        y: LiveObject<IamLive>
      }

      type IamLive {}
    `;

    const reporter = ErrorReporter.fromText(schemaText);
    const output = check(parseDocument(reporter), reporter);

    const range = expect.any(Array);

    expect(output).toEqual({
      root: {
        _kind: "ObjectTypeDefinition",
        name: {
          _kind: "TypeName",
          name: "Storage",
          range,
        },
        isStatic: false,
        fields: [
          {
            _kind: "FieldDef",
            name: {
              _kind: "Identifier",
              name: "x",
              range,
            },
            optional: false,
            type: {
              _kind: "TypeRef",
              asLiveObject: false,
              range,
              ref: {
                _kind: "TypeName",
                name: "IamStatic",
                range,
              },
            },
            range,
          },
          {
            _kind: "FieldDef",
            name: {
              _kind: "Identifier",
              name: "y",
              range,
            },
            optional: false,
            type: {
              _kind: "TypeRef",
              ref: {
                _kind: "TypeName",
                name: "IamLive",
                range,
              },
              asLiveObject: true,
              range,
            },
            range,
          },
        ],
        range,
      },
      definitions: expect.any(Array),
      getDefinition: expect.anything(),
    });

    const x = output.root.fields[0].type as AST.TypeRef;
    expect(output.getDefinition(x)).toEqual({
      _kind: "ObjectTypeDefinition",
      name: {
        _kind: "TypeName",
        name: "IamStatic",
        range,
      },
      isStatic: true,
      fields: [],
      range,
    });

    const y = output.root.fields[1].type as AST.TypeRef;
    expect(output.getDefinition(y)).toEqual({
      _kind: "ObjectTypeDefinition",
      name: {
        _kind: "TypeName",
        name: "IamLive",
        range,
      },
      isStatic: false,
      fields: [],
      range,
    });
  });

  it("large document (snapshot test)", () => {
    const schemaText = `
      // union Shape = Rect | Circle

      type RGB { r: Int, g: Int, b: Int }

      type Rect {
        type: String  # TODO: Use "rect" here
        x: Int
        y: Int
        width: Int
        height: Int
        fill?: RGB
        stroke?: RGB
      }

      type Circle {
        type: String // TODO: Use "circle" here
        cx: Int
        cy: Int
        radius: Int
        fill ? : RGB
        stroke?: RGB
      }

      type Storage {
        // shapes: LiveList<Shape>
        mycircle: LiveObject<Circle>
        myrect: LiveObject<Rect>
      }
    `;

    const reporter = ErrorReporter.fromText(schemaText);
    const output = check(parseDocument(reporter), reporter);
    expect(output).toMatchSnapshot();
  });
});

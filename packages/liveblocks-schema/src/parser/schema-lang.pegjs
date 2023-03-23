{
  const whitespace_char = /\s/

  /**
   * Like the built-in `range()` helper from PEG.js itself, but its start and
   * end values adjusted to strip off any and all leading and trailing
   * whitespace (by looking at the source input string).
   *
   * RATIONALE:
   * This may perhaps be a little bit of a hack, but at least it is contained
   * here.  The alternative is to adjust all rules until the very bottom ones
   * like the operator ones, and let them all compute the location and bubble
   * those values all the way up.  This is much more verbose, and smears that
   * complexity all over the grammar.
   */
  function rng(): [number, number] {
      let start = peg$savedPos
      let end = peg$currPos

      // Move start and end close together until they both don't point to
      // whitespace
      while (whitespace_char.test(input.charAt(start))) {
          start += 1
      }
      while (whitespace_char.test(input.charAt(end - 1))) {
          end -= 1
      }

      return [start, end]
  }


  function unescape(s: string): string {
      return s
          // Escaping replaces special characters
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')

          // But escaping any other non-special char just keeps it literally
          .replace(/\\(.)/g, '$1')
  }
}

Document
  = __ defs:DefinitionList __
    { return ast.document(defs, rng()) }


// Single-underscore means "whitespace but no newlines"
_ ""
  = $( Whitespace / Comment )*


// Double-underscore means "whitespace including newlines"
__ ""
  = $( WhitespaceWithNewlines / Comment )*


Whitespace = $( [ \t]+ )
WhitespaceWithNewlines = $( [ \t\r\n]+ )


Comment
  = LineComment


LineComment
  = $( ( '//' / '#' ) [^\n]* )


LOWER_CHAR = [a-z]
UPPER_CHAR = [A-Z]
IDENTIFIER_PREFIX = [a-zA-Z_]
WORD_CHAR = [a-zA-Z0-9_]


// e.g. "x" or "y" -- used in field positions
// Similar to TypeName, but there are different semantic validation rules that apply
Identifier "<identifier>"
  = name:$( IDENTIFIER_PREFIX WORD_CHAR* ) !WORD_CHAR _
    { return ast.identifier(name, rng()) }


// e.g. "Circle" or "Person" -- used in type positions
// Similar to Identifier, but there are different semantic validation rules that apply
TypeName "<type name>"
  = !( LiveObjectKeyword / LiveListKeyword / LiveMapKeyword ) name:$( WORD_CHAR+ ) !WORD_CHAR _
    { return ast.typeName(name, rng()) }


DefinitionList
  = first:Definition __ rest:( @Definition __ )*
    { return [first, ...rest] }


Definition
  = ObjectTypeDefinition


ObjectTypeDefinition
  = TYPE name:TypeName EQ? LCURLY fields:FieldDefList? RCURLY
    { return ast.objectTypeDefinition(
      name,
      fields ?? [],
      null, /* Only used to writing schemas with comments */
      false, /* will get its definitive value during the checking phase */
      rng(),
    ) }


ObjectLiteralType
  = LCURLY fields:FieldDefList? RCURLY
    { return ast.objectLiteralType(fields ?? [], rng()) }


FieldDefList
  = first:FieldDef
    rest:( ( COMMA / SEMICOLON / NEWLINE ) @FieldDef )*
    ( COMMA / SEMICOLON / NEWLINE )?
    { return [first, ...rest] }


FieldDef
  = name:Identifier question:QUESTION? COLON type:Type
    {
      const optional = question !== null;
      return ast.fieldDef(
        name,
        optional,
        type,
        null, /* Only used to writing schemas with comments */
        null, /* Only used to writing schemas with comments */
        rng()
      )
    }


StringType
  = _ 'string' EOK
    { return ast.stringType(rng()) }

  / &{ return !!options?.allowLegacyBuiltins } _ 'String' EOK
    { return ast.stringType(rng()) }


NumberType
  = _ 'number' EOK
    { return ast.numberType(rng()) }

  / &{ return !!options?.allowLegacyBuiltins } _ ( 'Int' / 'Float' ) EOK
    { return ast.numberType(rng()) }


BooleanType
  = _ 'boolean' EOK
    { return ast.booleanType(rng()) }

  / &{ return !!options?.allowLegacyBuiltins } _ 'Boolean' EOK
    { return ast.booleanType(rng()) }


NullType
  = _ 'null' EOK
    { return ast.nullType(rng()) }


LiveListKeyword
  = _ @$'LiveList' EOK


LiveMapKeyword
  = _ @$'LiveMap' EOK


LiveObjectKeyword
  = _ @$'LiveObject' EOK


Type
  = expr:TypeTypeBase brackets:( LSQUARE RSQUARE { return rng() })*
    {
      let node = expr;
      for (const bracket of brackets) {
        const [start, _] = node.range
        const [___, end] = bracket
        node = ast.arrayType(node, [start, end])
      }
      return node;
    }


TypeTypeBase
  = ObjectLiteralType
  / BuiltInScalar
  / LiveType
  / TypeRef
  // / Literal


BuiltInScalar
  = StringType
  / NumberType
  / NullType
  / BooleanType


// e.g. LiveMap<> or LiveList<>
// NOTE that LiveObject<> is _not_ a Live structure, but technically is more
// like a modifier on type references
LiveType
  = LiveListType
  / LiveMapType


LiveListType
  = LiveListKeyword LT expr:Type GT
    { return ast.liveListType(expr, rng()) }


LiveMapType
  = LiveMapKeyword LT keyType:Type COMMA valueType:Type GT
    { return ast.liveMapType(keyType, valueType, rng()) }


TypeRef
  = LiveObjectKeyword LT name:TypeName GT
    { return ast.typeRef(name, /* asLiveObject */ true, rng()) }
  / name:TypeName
    { return ast.typeRef(name, /* asLiveObject */ false, rng()) }


// Literal
//   = StringLiteral
// 
// 
// StringLiteral "string literal"
//   = DoubleQuotedString
// 
// 
// DoubleQuotedString
//   = rawValue:$( ["] ( ([\\].) / [^"\n{] )* ["] )
//     //                 ^^^^^    ^^^^^^^
//     //   A backslash escapes    Any character but the end of
//     //     any (.) character    string, or a newline, or the start of
//     //                          a template literal
//     {
//       const value = unescape(rawValue
//         .substring(1, rawValue.length - 1))  // strip off quotes
//       return ast.stringLiteral(value, rawValue, rng())
//     }


EOK "end of keyword"
  = ![a-zA-Z0-9_] _


TYPE "keyword \"type\""
  = _ @$'type' EOK __


LCURLY     = __ @$'{' __
RCURLY     = __ @$'}' _
LSQUARE    = __ @$'[' __
RSQUARE    = __ @$']' _
//                  ^ NOTE: We cannot generically eat newlines after RCURLY, because they're significant
GT         = __ @$'>' _
//                  ^ NOTE: We cannot generically eat newlines after GT, because they're significant
LT         = __ @$'<' __
COLON      = __ @$':' __
COMMA      = __ @$',' __
EQ         = __ @$'=' __
QUESTION   = __ @$'?' __
PIPE       = __ @$'|' __
SEMICOLON  = __ @$';' __
NEWLINE    = _  @$'\n' __

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
WORD_CHAR = [a-zA-Z0-9_]


Identifier "identifier"
  = name:$( WORD_CHAR+ ) !WORD_CHAR _
    { return ast.identifier(name, rng()) }


//////   //
//////   // Function / variable definitions at the top of the document
//////   //
//////   
DefinitionList
  = first:Definition __ rest:( @Definition __ )*
    { return [first, ...rest] }


Definition
  = ObjectTypeDef


ObjectTypeDef
  = TYPE name:Identifier EQ? obj:ObjectLiteralExpr
    { return ast.objectTypeDef(name, obj, rng()) }


ObjectLiteralExpr
  = LCURLY fields:FieldDefList? RCURLY
    { return ast.objectLiteralExpr(fields ?? [], rng()) }


FieldDefList
  = first:FieldDef
    rest:( ( COMMA / SEMICOLON / NEWLINE ) @FieldDef )*
    ( COMMA / SEMICOLON / NEWLINE )?
    { return [first, ...rest] }


FieldDef
  = name:Identifier question:QUESTION? COLON type:TypeExpr
    {
      const optional = question !== null;
      return ast.fieldDef(name, optional, type, rng())
    }


StringKeyword
  = _ 'String' EOK
    { return ast.stringKeyword() }


IntKeyword
  = _ 'Int' EOK
    { return ast.intKeyword() }


FloatKeyword
  = _ 'Float' EOK
    { return ast.floatKeyword() }


LiveObjectKeyword
  = _ 'LiveObject' EOK
    { return null }


TypeExpr
  = ObjectLiteralExpr
  / BuiltInScalarType
  / LiveTypeExpr
  / TypeRef
  // / Literal


BuiltInScalarType
  = StringKeyword
  / IntKeyword
  / FloatKeyword


LiveTypeExpr
  = LiveObjectTypeExpr


LiveObjectTypeExpr
  = LiveObjectKeyword LT of:TypeRef GT
    { return ast.liveObjectTypeExpr(of, rng()) }


TypeRef
  = name:Identifier
    { return ast.typeRef(name, rng()) }


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
  = _ @$'type' EOK


LCURLY     = __ @$'{' __
RCURLY     = __ @$'}' _
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

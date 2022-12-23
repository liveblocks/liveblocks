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


  const WHITESPACE_PREFIX = /^([ \t]*)[^\s]/m

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
  = __ defs:DefinitionList? __
    {
      return ast.Document(
        defs ?? [],

        // Comments have been consumed as a side-effect during parsing, and
        // have been stored on the `options` global.  This way, they stay out
        // of the way in the resulting parse tree, but still get consumed and
        // recorded, so tools like formatters can access them.
        options?.comments,
      )
    }


// Single-underscore means "whitespace but no newlines"
_ ""
  = $( Whitespace / Comment )*


// Double-underscore means "whitespace including newlines"
__ ""
  = $( WhitespaceWithNewlines / Comment )*


Whitespace = $( [ \t]+ )
WhitespaceWithNewlines = $( [ \t\r\n]+ )


Comment
  = comment:LineComment
    {
      /* if (!options) { return null; } */
      /* options.comments = options.comments ?? []; */
      /* options.comments.push(comment); */
      return null;
    }


LineComment
  = '//' text:$( [^\n] )* &[\n]
    { return ast.LineComment(text, rng()) }


LOWER_CHAR = [a-z]
UPPER_CHAR = [A-Z]
WORD_CHAR = [a-zA-Z0-9_]
//////   UPPER_WORD_CHAR = [A-Z0-9_]
//////   
//////   
//////   // Like Identifier, but will not allow keywords
//////   SafeIdentifier "identifier"
//////     = !Keyword identifier:Identifier
//////       { return identifier }
//////   
//////   
//////   Identifier "identifier"
//////     // An identifier _must_ start with a lowercase char
//////     = name:$( LOWER_CHAR WORD_CHAR* ) !WORD_CHAR _
//////       { return ast.Identifier(name, rng()) }
//////   
//////     // ...or not contain a lowercase word at all, e.g. ALL_CAPS (for idiomatic
//////     // constant definitions)
//////     / name:$( UPPER_CHAR UPPER_WORD_CHAR* ) !WORD_CHAR _
//////       { return ast.Identifier(name, rng()) }
//////   
//////   
TypeName "type name"
  = name:$( UPPER_CHAR WORD_CHAR* ) !WORD_CHAR _
    { return ast.TypeName(name, rng()) }


//////   //
//////   // Function / variable definitions at the top of the document
//////   //
//////   
DefinitionList
  = first:Definition
    rest:( ( SEMICOLON / NEWLINE ) def:Definition
           { return def } )*
    ( SEMICOLON / NEWLINE )?
    { return [first, ...rest] }


Definition
  = TYPE name:TypeName LCURLY RCURLY
    { return ast.ObjectTypeDef(name, ast.ObjectTypeExpr([])) }



// XXX TODO Implement me for real
TypeExpr
  = "todo"





//////   Definition
//////     = TYPE name:TypeName
//////       typeParams:( LT names:TypeNameList GT
//////                    { return names } )?
//////       ASSIGN
//////       type:Type
//////       { return ast.TypeDef(name, typeParams ?? [], type, rng()) }
//////   
//////     / ENUM name:TypeName
//////       typeParams:( LT names:TypeNameList GT
//////                    { return names } )?
//////       LCURLY variants:EnumVariantList RCURLY
//////       { return ast.EnumDef(name, typeParams ?? [], variants, rng()) }
//////   
//////     / ALIAS name:TypeName
//////       typeParams:( LT names:TypeNameList GT
//////                    { return names } )?
//////       ASSIGN
//////       type:Type
//////       { return ast.AliasTypeDef(name, typeParams ?? [], type, rng()) }
//////   
//////     / Statement
//////   
//////   
//////   TypeNameList
//////     = first:TypeName
//////       rest:( COMMA type:TypeName
//////              { return type } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   FieldList
//////     = first:Field
//////       rest:( ( COMMA / NEWLINE ) def:Field
//////              { return def } )*
//////       ( COMMA / NEWLINE )?
//////       { return [first, ...rest] }
//////   
//////   
//////   Field
//////     = name:Identifier COLON type:Type
//////       { return ast.Field(name, type, rng()) }
//////   
//////   
//////   EnumVariantList
//////     = first:EnumVariant
//////       rest:( ( COMMA / NEWLINE ) def:EnumVariant
//////              { return def } )*
//////       ( COMMA / NEWLINE )?
//////       { return [first, ...rest] }
//////   
//////   /**
//////    * Example:
//////    *     enum Things<T, E> {
//////    *         Ok with T              <--
//////    *         Err with { error: E }  <--
//////    *         Nothing                <--
//////    *     }
//////    */
//////   EnumVariant
//////     = /* e.g. `Ok with T`, `Err with { error: E }`, or `Nothing` */
//////       name:TypeName param:( WITH type:Type
//////                             { return type } )?
//////       { return ast.EnumVariant(name, param, rng()) }
//////   
//////   ParameterList
//////     = first:Parameter
//////       rest:( COMMA param:Parameter
//////              { return param } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   Parameter
//////     = name:Identifier type:( COLON type:Type
//////                              { return type } )?
//////       { return ast.Parameter(name, type, rng()) }
//////   
//////   
//////   TypeList
//////     = first:Type
//////       rest:( COMMA type:Type
//////              { return type } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   Type
//////     = FunctionType
//////     / TypeButNotFunctionType
//////   
//////   
//////   TypeButNotFunctionType
//////     = LPAREN type:Type RPAREN
//////       { return type }
//////   
//////     / literal:Literal
//////       { return ast.LiteralType(literal, rng()) }
//////   
//////     / RecordType
//////   
//////     / TupleType
//////   
//////     / TypeRef
//////   
//////   
//////   TypeRef
//////     = name:TypeName
//////       args:( LT types:TypeList GT
//////              { return types } )?
//////       { return ast.TypeRef(name, args ?? [], rng()) }
//////   
//////   
//////   FunctionType
//////     = LPAREN args:TypeList? RPAREN
//////       FAT_ARROW returnType:Type
//////       { return ast.FunctionType(args ?? [], returnType, rng()) }
//////   
//////     / onlyArg:TypeButNotFunctionType
//////       FAT_ARROW returnType:Type
//////       { return ast.FunctionType([onlyArg], returnType, rng()) }
//////   
//////   
//////   TupleType
//////     = LPAREN first:Type COMMA rest:TypeList RPAREN
//////       { return ast.TupleType([first, ...rest], rng()) }
//////   
//////   
//////   RecordType
//////     = LCURLY fields:FieldList? RCURLY
//////       { return ast.RecordType(fields ?? [], rng()) }
//////   
//////   
//////   ExprList
//////     = first:Expr
//////       rest:( COMMA expr:Expr
//////              { return expr } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   KeyValueExpr
//////     = key:Identifier ASSIGN value:Expr
//////       { return ast.KeyValueExpr(key, value, rng()) }
//////   
//////   
//////   KeyValueExprList
//////     = first:KeyValueExpr
//////       rest:( COMMA pair:KeyValueExpr
//////              { return pair } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   Argument
//////     = KeyValueExpr
//////   
//////     / Expr
//////   
//////   
//////   ArgumentList
//////     = first:Argument
//////       rest:( COMMA arg:Argument
//////              { return arg } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   CaseExpr
//////     = patterns:MatchPatList THIN_ARROW expr:Expr
//////       { return ast.Case(patterns, expr, rng()) }
//////   
//////   
//////   CaseExprList
//////     = first:CaseExpr
//////       rest:( COMMA expr:CaseExpr
//////              { return expr } )*
//////       COMMA?
//////       { return [first, ...rest] }
//////   
//////   
//////   Expr
//////     = MATCH matchee:ExprLevel1 __
//////       LCURLY cases:CaseExprList? RCURLY
//////       { return ast.MatchExpr(matchee, cases ?? [], rng()) }
//////   
//////     / ExprLevel1
//////   
//////   
//////   ExprLevel1
//////     / ExprLevel5
//////   
//////   
//////   ExprLevel5
//////     = /* ( first, second ) */
//////       TupleExpr
//////   
//////     / /* { key = 'value' } */
//////       RecordExpr
//////   
//////     / /* [ item, item, ... ] */
//////       ListExpr
//////   
//////     / /* #{ item, item, ... } */
//////       SetExpr
//////   
//////     / /* ( expr ) */
//////       LPAREN expr:Expr RPAREN
//////       { return expr }
//////   
//////     / /* 1 */
//////       Literal
//////   
//////     / /* variable */
//////       Identifier
//////   
//////     / /* Just(42), Person { name: 'John' }, or True */
//////       ConstructorExpr
//////   
//////   
//////   TupleExpr
//////     = /* ( first, second ) */
//////       LPAREN first:Expr COMMA rest:ExprList RPAREN
//////       { return ast.TupleExpr([first, ...rest], rng()) }
//////   
//////   
//////   ListExpr
//////     = /* [ item, item, ... ] */
//////       LBRACKET exprs:ExprList? RBRACKET
//////       { return ast.ListExpr(exprs ?? [], rng()) }
//////   
//////   
//////   SetExpr
//////     = /* #{ item, item, ... } */
//////       LSETOPEN exprs:ExprList? RCURLY
//////       { return ast.SetExpr(exprs ?? [], rng()) }
//////   
//////   
//////   ConstructorExpr
//////     // e.g. Person { name: Str }
//////     // e.g. Thing (42, 'hi')
//////     // NOTE: All constructors must have exactly one argument. However, we treat
//////     // records and tuples as an exception to allow us to write those without
//////     // extra parens, i.e. to avoid Person({ name: Str }) or Thing((42, 'hi'))
//////     = name:TypeName arg:(RecordExpr / TupleExpr)
//////       { return ast.ConstructorExpr(name, arg, rng()) }
//////   
//////     // Otherwise, any argument must always be wrapped in parens
//////     / name:TypeName arg:( LPAREN expr:Expr RPAREN
//////                           { return expr } )?
//////       { return ast.ConstructorExpr(name, arg, rng()) }
//////   
//////   
//////   RecordExpr
//////     = /* { x = 1, y = 2, ... } */
//////       LCURLY fields:KeyValueExprList? RCURLY
//////       { return ast.RecordExpr(fields ?? [], rng()) }
//////   
//////   
//////   /**
//////    * Patterns are used as the LHS for assignment expressions, or in match
//////    * expressions.  There is a difference, though.  In *match* expressions, for
//////    * example, literal expressions are allowed to appear on the LHS, like:
//////    *
//////    *     match expr {
//////    *       Some(42) -> 42
//////    *            ^^ A literal
//////    *     }
//////    *
//////    * However, this would not be a valid assignment:
//////    *
//////    *     42 = x          // Invalid
//////    *     Some(42) = x    // Invalid
//////    *     Some(y) = x     // Valid
//////    *
//////    */
//////   
//////   AssignPat
//////     = TupleAssignPat
//////   
//////     / RecordAssignPat
//////   
//////     / ListAssignPat
//////   
//////     / Wildcard
//////   
//////     // e.g. `x`, or `x: Int`
//////     / VariablePat
//////   
//////   
//////   VariablePat
//////     = name:SafeIdentifier
//////       type:( COLON type:Type
//////              { return type }
//////            )?
//////       { return ast.VariablePat(name, type, rng()) }
//////   
//////   
//////   EnumVariantPat
//////     = name:TypeName pattern:( WITH pattern:MatchPat
//////                               { return pattern } )?
//////       { return ast.EnumVariantPat(name, pattern, rng()) }
//////   
//////   
//////   MatchPatList
//////     = first:MatchPat
//////       rest:( PIPE pat:MatchPat
//////              { return pat } )*
//////       { return [first, ...rest] }
//////   
//////   
//////   MatchPat
//////     // e.g. (x, y: Int)
//////     = TupleMatchPat
//////   
//////     // e.g. { x as x2, ..y }
//////     / RecordMatchPat
//////   
//////     // e.g. 1, 'hello', True
//////     / Literal
//////   
//////     / Wildcard
//////   
//////     // e.g. `x`, or `x: Int`
//////     / VariablePat
//////   
//////     // e.g. `True`, `Red with x`, `Thing with (x, y)`, etc
//////     / EnumVariantPat
//////   
//////   
//////   Wildcard
//////     = UNDERSCORE
//////       { return ast.Wildcard(rng()) }
//////   
//////   
//////   Spread
//////     = DOTDOT name:Identifier
//////       { return ast.Spread(name, rng()) }
//////   
//////     / DOTDOT
//////       { return ast.Spread(ast.Wildcard(), rng()) }
//////   
//////   
//////   TupleAssignPat
//////     = LPAREN first:AssignPat
//////              rest:( COMMA pat:AssignPat
//////                     { return pat } )+
//////              COMMA?
//////       RPAREN
//////       { return ast.TupleAssignPat([first, ...rest], rng()) }
//////   
//////   
//////   TupleMatchPat
//////     = LPAREN first:MatchPat
//////              rest:( COMMA pat:MatchPat
//////                     { return pat } )+
//////              COMMA?
//////       RPAREN
//////       { return ast.TupleMatchPat([first, ...rest], rng()) }
//////   
//////   
//////   RecordMatchPat
//////     = LCURLY first:FieldMatchPat
//////              rest:( COMMA pat:FieldMatchPat
//////                     { return pat } )*
//////              spread:( COMMA spread:Spread?
//////                       { return spread } )?
//////              COMMA?
//////       RCURLY
//////       { return ast.RecordMatchPat([first, ...rest], spread, rng()) }
//////   
//////   
//////   FieldMatchPat
//////     = name:Identifier
//////       pattern:( AS pat:MatchPat
//////                 { return pat } )?
//////       {
//////         return ast.FieldMatchPat(
//////           name,
//////           pattern ? pattern : ast.VariablePat(name, null, name.range),
//////           rng()
//////         )
//////       }
//////   
//////   
//////   FieldAssignPat
//////     = name:Identifier
//////       pattern:( AS pat:AssignPat
//////                 { return pat } )?
//////       {
//////         return ast.FieldAssignPat(
//////           name,
//////           pattern ? pattern : ast.VariablePat(name, null, name.range),
//////           rng()
//////         )
//////       }
//////   
//////   
//////   RecordAssignPat
//////     = LCURLY first:FieldAssignPat
//////              rest:( COMMA pat:FieldAssignPat
//////                     { return pat } )*
//////              spread:( COMMA spread:Spread
//////                       { return spread } )?
//////              COMMA?
//////       RCURLY
//////       { return ast.RecordAssignPat([first, ...rest], spread, rng()) }
//////   
//////   
//////   ListAssignPat
//////     = LBRACKET first:( AssignPat / Spread )
//////                rest:( COMMA pat:( AssignPat / Spread ) { return pat } )+
//////       RBRACKET
//////       { return ast.ListAssignPat([first, ...rest], rng()) }
//////   
//////   
Literal
  = StringLiteral


//////   NumberLiteral "number"
//////     = FloatLiteral
//////     / IntLiteral
//////   
//////   
//////   FloatLiteral
//////     = /* 3.14159265359 */
//////       rawValue:$( MINUS? Digits? [.] Digits ) _
//////       {
//////         rawValue = rawValue.replace(/\s+/g, '')
//////         const value = parseFloat(rawValue.replace(/_/g, ''))
//////         return ast.FloatLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   IntLiteral
//////     = /* 123456 */
//////       rawValue:$( MINUS? Digits ) _
//////       {
//////         rawValue = rawValue.replace(/\s+/g, '')
//////         const value = parseInt(rawValue.replace(/_/g, ''), 10)
//////         return ast.IntLiteral(value, rawValue, rng())
//////       }
//////   
//////   
StringLiteral "string"
  = DoubleQuotedString


//////   SingleQuotedString
//////     = SingleQuotedString_Raw
//////     / SingleQuotedString_Template
//////     / SingleQuotedString_Simple
//////   
//////   
DoubleQuotedString
  = rawValue:$( ["] ( ([\\].) / [^"\n{] )* ["] )
    //                 ^^^^^    ^^^^^^^
    //   A backslash escapes    Any character but the end of
    //     any (.) character    string, or a newline, or the start of
    //                          a template literal
    {
      const value = unescape(rawValue
        .substring(1, rawValue.length - 1))  // strip off quotes
      return ast.StringLiteral(value, rawValue, rng())
    }


//////   VerbatimString
//////     = VerbatimString_Raw
//////     / VerbatimString_Template
//////     / VerbatimString_Simple
//////   
//////   
//////   MultiString
//////     = MultiString_Raw
//////     / MultiString_Template
//////     / MultiString_Simple
//////   
//////   
//////   SingleQuotedString_Raw
//////     = rawValue:$( [r]['] ( ([\\].) / [^'\n] )* ['] )
//////       //                    ^^^^^    ^^^^^^
//////       //      A backslash escapes    Any character but the end of
//////       //        any (.) character    string, or a newline
//////       {
//////         const value = unescape(rawValue
//////           .substring(2, rawValue.length - 1))  // strip off quotes
//////         return ast.StringLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   SingleQuotedString_Template
//////     = ['] first:$( ([\\].) / [^'{\n] )*
//////           rest:( '{' __ expr:Expr '}' lit:$( ([\\].) / [^'{\n] )*
//////             { return [expr, lit] }
//////           )+
//////       [']
//////       {
//////         const literals = [unescape(first)]
//////         const exprs = []
//////         for (const [expr, lit] of rest) {
//////           literals.push(unescape(lit))
//////           exprs.push(expr)
//////         }
//////         return ast.TemplateLiteral(literals, exprs, rng())
//////       }
//////   
//////   
//////   SingleQuotedString_Simple
//////     = rawValue:$( ['] ( ([\\].) / [^'\n{] )* ['] )
//////       //                 ^^^^^    ^^^^^^^
//////       //   A backslash escapes    Any character but the end of
//////       //     any (.) character    string, or a newline, or the start of
//////       //                          a template literal
//////       {
//////         const value = unescape(rawValue
//////           .substring(1, rawValue.length - 1))  // strip off quotes
//////         return ast.StringLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   DoubleQuotedString_Raw
//////     = rawValue:$( [r]["] ( ([\\].) / [^"\n] )* ["] )
//////       //                    ^^^^^    ^^^^^^
//////       //      A backslash escapes    Any character but the end of
//////       //        any (.) character    string, or a newline
//////       {
//////         const value = unescape(rawValue
//////           .substring(2, rawValue.length - 1))  // strip off quotes
//////         return ast.StringLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   DoubleQuotedString_Template
//////     = ["] first:$( ([\\].) / [^"{\n] )*
//////           rest:( '{' __ expr:Expr '}' lit:$( ([\\].) / [^"{\n] )*
//////             { return [expr, lit] }
//////           )+
//////       ["]
//////       {
//////         const literals = [unescape(first)]
//////         const exprs = []
//////         for (const [expr, lit] of rest) {
//////           literals.push(unescape(lit))
//////           exprs.push(expr)
//////         }
//////         return ast.TemplateLiteral(literals, exprs, rng())
//////       }
//////   
//////   
//////   DoubleQuotedString_Simple
//////     = rawValue:$( ["] ( ([\\].) / [^"\n{] )* ["] )
//////       //                 ^^^^^    ^^^^^^^
//////       //   A backslash escapes    Any character but the end of
//////       //     any (.) character    string, or a newline, or the start of
//////       //                          a template literal
//////       {
//////         const value = unescape(rawValue
//////           .substring(1, rawValue.length - 1))  // strip off quotes
//////         return ast.StringLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   VerbatimString_Raw
//////     = rawValue:$( 'r``' ( [\\]. / !'``' . )+ '``' )
//////       {
//////         const value = unescape(rawValue
//////           .substring(3, rawValue.length - 2))  // strip off quotes
//////         return ast.StringLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   VerbatimString_Template
//////     = '``' first:$( [\\]. / !'``' [^{] )*
//////            rest:( '{' __ expr:Expr '}' lit:$( [\\]. / !'``' [^{] )*
//////              { return [expr, lit] }
//////            )+
//////       '``'
//////       {
//////         const literals = [unescape(first)]
//////         const exprs = []
//////         for (const [expr, lit] of rest) {
//////           literals.push(unescape(lit))
//////           exprs.push(expr)
//////         }
//////         return ast.TemplateLiteral(literals, exprs, rng())
//////       }
//////   
//////   
//////   VerbatimString_Simple
//////     = rawValue:$( '``' ( [\\]. / !'``' [^{] )+ '``' )
//////       {
//////         const value = unescape(rawValue
//////           .substring(2, rawValue.length - 2))  // strip off quotes
//////         return ast.StringLiteral(value, rawValue, rng())
//////       }
//////   
//////   
//////   MultiString_Raw
//////     = rawValue:$( 'r`' ( ([\\].) / [^`] )+ '`' )
//////       //                  ^^^^^    ^^^^
//////       //    A backslash escapes    Any character but the end of
//////       //      any (.) character    string
//////       {
//////         const value = unescape(rawValue
//////           .substring(2, rawValue.length - 1))  // strip off quotes
//////         return ast.StringLiteral(unindent(value, location).trim(), rawValue, rng())
//////       }
//////   
//////   
//////   MultiString_Simple
//////     = rawValue:$( '`' ( ([\\].) / [^`{] )+ '`' )
//////       //                 ^^^^^    ^^^^
//////       //   A backslash escapes    Any character but the end of
//////       //     any (.) character    string
//////       {
//////         const value = unescape(rawValue
//////           .substring(1, rawValue.length - 1))  // strip off quotes
//////         return ast.StringLiteral(unindent(value, location).trim(), rawValue, rng())
//////       }
//////   
//////   
//////   Digits
//////     = $( [0-9]+ ([_][0-9]+)* )
//////   
//////   
EOK "end of keyword"
  = ![a-zA-Z0-9_] __


//////   Keyword "keyword"
//////     = ALIAS
//////     / AS
//////     / ELSE
//////     / ENUM
//////     / FUNC
//////     / IF
//////     / MATCH
//////     / RETURN
//////     / TYPE
//////     / XOR
//////   
//////   
//////   //
//////   // Keywords
//////   //
//////   // NOTE: Use `_` if this keyword is (or can be) the beginning of a new
//////   // statement.  Otherwise, use `__`.
//////   //
//////   ALIAS  = _ 'alias'  EOK
//////   AS     = _ 'as'     EOK
//////   ELSE   = __ 'else'  EOK
//////   ENUM   = _ 'enum'   EOK
//////   FUNC   = _ 'func'   EOK
//////   IF     = _ 'if'     EOK
//////   MATCH  = __ 'match' EOK
//////   RETURN = _ 'return' EOK
TYPE   = _ 'type'   EOK
//////   WITH   = __ 'with'  EOK
//////   XOR    = __ 'xor'   EOK  { return 'xor' }
//////   
//////   //
//////   // Braces, curlies, brackets
//////   //
//////   // NOTE: _not_ consuming newlines here before opening parens/braces/etc is
//////   // crucial.  Newlines are significant and used to make sense of
//////   // otherwise-ambiguous statement separation.  It's the price to pay for not
//////   // having an explicit line separator like a semi-colon.
//////   //
//////   LPAREN     = _ '(' __ { return null }
//////   //           ^ Can't consume newlines here, since this is a valid start of
//////   //           a new statement
//////   RPAREN     = __ ')' _ { return null }
LCURLY     = __ '{' __ { return null }
RCURLY     = __ '}' __ { return null }
//////   LBRACKET   = __ '[' __ { return null }
//////   RBRACKET   = __ ']' _ { return null }
//////   
//////   //
//////   // Logic operators
//////   //
//////   AND        = __ '&&' __ { return '&&' }
//////   OR         = __ '||' __ { return '||' }
//////   NOT        = __ '!' __  { return '!' }
//////   
//////   //
//////   // Comparison operators
//////   //
//////   EQ         = __ '==' __ { return '==' }
//////   NEQ        = __ '!=' __ { return '!=' }
//////   GTE        = __ '>=' __ { return '>=' }
//////   LTE        = __ '<=' __ { return '<=' }
//////   GT         = __ '>'  __ { return '>' }
//////   LT         = __ '<'  __ { return '<' }
//////   
//////   //
//////   // Double-char operators
//////   //
//////   LSETOPEN   = __ '#{' __ { return null }
//////   FAT_ARROW  = __ '=>' __ { return '=>' }
//////   THIN_ARROW = __ '->' __ { return '->' }
//////   DOTDOT     = __ '..' __ { return '..' }
//////   
//////   
//////   //
//////   // Operators
//////   //
//////   COLON      = __ ':' __ { return ':' }
//////   COMMA      = __ ',' __ { return ',' }
//////   DIV        = __ '/' __ { return '/' }
//////   DOT        = __ '.' !'.' __ { return '.' }
//////   ASSIGN     = __ '=' __ { return '=' }
//////   MINUS      = __ '-' __ { return '-' }
//////   MULT       = __ '*' __ { return '*' }
//////   PIPE       = __ '|' __ { return '|' }
//////   PLUS       = __ '+' __ { return '+' }
SEMICOLON  = __ ';' __ { return ';' }
//////   UNDERSCORE = _ '_' __  { return '_' }
//////   //           ^ Can't consume newlines here, since this is a valid start of
//////   //           a new statement
NEWLINE    = _ '\n' __ { return '\n' }

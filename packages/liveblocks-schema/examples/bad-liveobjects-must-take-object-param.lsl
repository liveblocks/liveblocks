type Thing { x: Int }

type Storage {
  a: LiveObject<Int>
  b: LiveObject<"literal">
  c: LiveObject<LiveObject<Thing>>
  d: LiveObject<{ x: Int }>
}

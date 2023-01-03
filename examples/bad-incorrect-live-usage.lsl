type Custom {
  x: Int
}

type Storage {
  a: LiveMap                    // Not enough params
  b: LiveMap<String>            // Not enough params
  c: LiveMap<String, Int, Int>  // Too many params
  d: LiveMap<Int, Int>          // First param not String

  e: LiveObject                 // Not enough params
  f: LiveObject<Int, Int>       // Too many params

  g: LiveList                   // Not enough params
  h: LiveList<Int, Int>         // Too many params

  // Incorrect use of types
  i: Int<String>
  j: String<Int>
  k: Custom<Int, Int>
}

type Foo {
  x: String
}

// Duplicate type def here
type Foo {
  x: Int
  y: Int
}

type Storage { x: Foo }

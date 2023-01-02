type RGB {
  r: Int
  g: Int
  b: Int
}

type Circle {
  type: "circle"
  cx: Int
  cy: Int
  radius: Number
  fill?: RGB
}

type Int { x: Int }

type Curcle { x: Int }

type Point { x: Int }

type SelfRef { x: SelfRef }

type Point { x: Int }

type Storage = {
  # This is a line comment
  mycircle: Circle     // Just a circle
  mycircles: LiveList <
  Foo, 
        Bar<Qux
        >>
  fill: {
    r: Int,
    g: Int,
    b: Int;            stroke: {
      r: Int ; g: Int,
      b: Int,
    },
  }
}

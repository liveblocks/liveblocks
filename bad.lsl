type RGB {
  r: Int
  g: Int
  b: Int
}

type Circle {
  type: "circle"
  cx: Int
  cy: Int
  radius: Int<String>
  fill?: RGB
}

type Int { x: Int }

type Curcle { x: Int }

type Point {
  x: Int,
  y: String,
  y?: Cuurle
  z?: LiveMap<Foo, Bar>
  z2?: LiveMap<LiveMap, Bar>
  p: LiveObject<LiveMap, Bar>
}

type SelfRef { x: SelfRef }

type IndirectSelfRefA { x: IndirectSelfRefB }

type IndirectSelfRefB { x: IndirectSelfRefC }

type IndirectSelfRefC { x: IndirectSelfRefA }

type Point { x: Int }

type Storage = {
  # This is a line comment
  mycircle: Circle     // Just a circle
  mybad: LiveMap<Int, Int> ;
  mycircles: LiveList < Foo, >
  fill: {
    r: Int,
    g: Int,
    b: Int;            stroke: {
      r: Int ; g: Int,
      b: Int,
    },
  }
}

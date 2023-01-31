// union Shape = Rect | Circle

type RGB { r: Int, g: Int, b: Int }

type Rect {
  type: "rect"
  x: Int
  y: Int
  width: Int
  height: Int
  fill: RGB
  stroke: RGB
}

type Circle {
  type: "circle"
  cx: Int
  cy: Int
  radius: Int
  fill: RGB
  stroke: RGB
}

type Storage {
  // shapes: LiveList<Shape>
  circles: LiveList<Circle>
  rects: LiveList<Rect>
}

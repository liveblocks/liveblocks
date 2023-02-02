// union Shape = Rect | Circle

type RGB { r: Int, g: Int, b: Int }

type Rect {
  type: String // TODO: Use "rect" here
  x: Int
  y: Int
  width: Int
  height: Int
  fill: RGB
  stroke: RGB
}

type Circle {
  type: String // TODO: Use "circle" here
  cx: Int
  cy: Int
  radius: Int
  fill: RGB
  stroke: RGB
}

type Storage {
  // shapes: LiveList<Shape>
  mycircle: LiveObject<Circle>
  myrect: LiveObject<Rect>
}

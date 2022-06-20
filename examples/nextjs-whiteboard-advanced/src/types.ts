export type Color = {
  r: number;
  g: number;
  b: number;
};

export enum LayerType {
  Rectangle,
  Ellipse,
  Path,
}

export type Camera = {
  x: number;
  y: number;
};

export type Layer = RectangleLayer | EllipseLayer | PathLayer;

export type RectangleLayer = {
  type: LayerType.Rectangle;
  x: number;
  y: number;
  height: number;
  width: number;
  fill: Color;
};

export type EllipseLayer = {
  type: LayerType.Ellipse;
  x: number;
  y: number;
  height: number;
  width: number;
  fill: Color;
};

export type PathLayer = {
  type: LayerType.Path;
  x: number;
  y: number;
  // Could be computed based on points
  height: number;
  // Could be computed based on points
  width: number;
  fill: Color;
  points: number[][];
};

export type Point = {
  x: number;
  y: number;
};

export type XYWH = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export enum Side {
  Top = 1,
  Bottom = 2,
  Left = 4,
  Right = 8,
}

export type CanvasState =
  | {
      mode: CanvasMode.None;
    }
  | {
      mode: CanvasMode.SelectionNet;
      origin: Point;
      current?: Point;
    }
  | {
      mode: CanvasMode.Translating;
      current: Point;
    }
  | {
      mode: CanvasMode.Inserting;
      layerType: LayerType.Ellipse | LayerType.Rectangle;
    }
  | {
      mode: CanvasMode.Pencil;
    }
  | {
      mode: CanvasMode.Pressing;
      origin: Point;
    }
  | {
      mode: CanvasMode.Resizing;
      initialBounds: XYWH;
      corner: Side;
    };

export enum CanvasMode {
  /**
   * Default canvas mode. Nothing is happening.
   */
  None,
  /**
   * When the user's pointer is pressed
   */
  Pressing,
  /**
   * When the user is selecting multiple layers at once
   */
  SelectionNet,
  /**
   * When the user is moving layers
   */
  Translating,
  /**
   * When the user is going to insert a Rectangle or an Ellipse
   */
  Inserting,
  /**
   * When the user is resizing a layer
   */
  Resizing,
  /**
   * When the pencil is activated
   */
  Pencil,
}

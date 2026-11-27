/**
 * The furniture library. Sizes are typical real-world footprints in
 * centimeters (width × depth); each piece can be resized once it's on the
 * plan. The drawings live in `components/canvas/symbols.tsx`.
 */

export type FurnitureType =
  | "sofa"
  | "loveseat"
  | "sectional"
  | "armchair"
  | "coffee-table"
  | "side-table"
  | "tv-unit"
  | "bookshelf"
  | "bed-double"
  | "bed-single"
  | "nightstand"
  | "wardrobe"
  | "dresser"
  | "counter"
  | "sink"
  | "stove"
  | "fridge"
  | "island"
  | "bar-stool"
  | "washer"
  | "dining-table"
  | "round-table"
  | "chair"
  | "desk"
  | "office-chair"
  | "toilet"
  | "bathtub"
  | "shower"
  | "vanity"
  | "double-vanity"
  | "rug"
  | "plant"
  | "floor-lamp"
  | "stairs";

export type CatalogItem = {
  type: FurnitureType;
  name: string;
  width: number;
  depth: number;
  // Rugs lie on the floor, below every other piece.
  onFloor?: boolean;
};

export type CatalogCategory = {
  id: string;
  name: string;
  items: CatalogItem[];
};

export const CATEGORIES: CatalogCategory[] = [
  {
    id: "living",
    name: "Living room",
    items: [
      { type: "sofa", name: "Sofa", width: 220, depth: 95 },
      { type: "loveseat", name: "Loveseat", width: 160, depth: 90 },
      { type: "sectional", name: "Sectional", width: 270, depth: 180 },
      { type: "armchair", name: "Armchair", width: 85, depth: 85 },
      { type: "coffee-table", name: "Coffee table", width: 110, depth: 60 },
      { type: "side-table", name: "Side table", width: 45, depth: 45 },
      { type: "tv-unit", name: "Media unit", width: 160, depth: 40 },
      { type: "bookshelf", name: "Bookshelf", width: 120, depth: 35 },
    ],
  },
  {
    id: "bedroom",
    name: "Bedroom",
    items: [
      { type: "bed-double", name: "Double bed", width: 160, depth: 200 },
      { type: "bed-single", name: "Single bed", width: 90, depth: 200 },
      { type: "nightstand", name: "Nightstand", width: 45, depth: 40 },
      { type: "wardrobe", name: "Wardrobe", width: 180, depth: 60 },
      { type: "dresser", name: "Dresser", width: 110, depth: 50 },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    items: [
      { type: "counter", name: "Counter", width: 120, depth: 60 },
      { type: "sink", name: "Sink", width: 80, depth: 60 },
      { type: "stove", name: "Cooktop", width: 60, depth: 60 },
      { type: "fridge", name: "Fridge", width: 70, depth: 70 },
      { type: "island", name: "Island", width: 150, depth: 80 },
      { type: "bar-stool", name: "Bar stool", width: 38, depth: 38 },
      { type: "washer", name: "Washer", width: 60, depth: 60 },
    ],
  },
  {
    id: "dining",
    name: "Dining & office",
    items: [
      { type: "dining-table", name: "Dining table", width: 180, depth: 146 },
      { type: "round-table", name: "Round table", width: 150, depth: 150 },
      { type: "chair", name: "Chair", width: 45, depth: 48 },
      { type: "desk", name: "Desk", width: 140, depth: 70 },
      { type: "office-chair", name: "Office chair", width: 58, depth: 58 },
    ],
  },
  {
    id: "bathroom",
    name: "Bathroom",
    items: [
      { type: "toilet", name: "Toilet", width: 40, depth: 70 },
      { type: "bathtub", name: "Bathtub", width: 170, depth: 75 },
      { type: "shower", name: "Shower", width: 90, depth: 90 },
      { type: "vanity", name: "Vanity", width: 80, depth: 50 },
      { type: "double-vanity", name: "Double vanity", width: 130, depth: 50 },
    ],
  },
  {
    id: "decor",
    name: "Decor & structure",
    items: [
      { type: "rug", name: "Rug", width: 200, depth: 140, onFloor: true },
      { type: "plant", name: "Plant", width: 50, depth: 50 },
      { type: "floor-lamp", name: "Floor lamp", width: 35, depth: 35 },
      { type: "stairs", name: "Stairs", width: 100, depth: 260 },
    ],
  },
];

const ITEMS = new Map<string, CatalogItem>(
  CATEGORIES.flatMap((category) =>
    category.items.map((item): [string, CatalogItem] => [item.type, item])
  )
);

/**
 * The catalog entry for a type of furniture. Storage can hold a type this
 * version doesn't know (written by a newer version of the app, say), so the
 * lookup takes any string and may come back empty.
 */
export function getCatalogItem(type: string): CatalogItem | undefined {
  return ITEMS.get(type);
}

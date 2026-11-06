import type { AgReportState } from "ag-studio";

/**
 * The dashboard every room starts with, seeded into Liveblocks Storage via
 * `initialStorage` by the first visitor. Built following the shape documented
 * at https://www.ag-grid.com/studio/react/state/ — the easiest way to author
 * a report like this is to build it in the AG Studio UI and copy the state
 * emitted by `onStateUpdated`.
 */
export const INITIAL_REPORT_STATE: AgReportState = {
  pages: [
    {
      id: "overview",
      widgets: {
        "1": {
          type: "column-chart-grouped",
          dataMapping: {
            categoryKey: [{ id: "products.category" }],
            valueKey: [{ id: "products.unitsSold", aggregation: "sum" }],
          },
        },
        "2": {
          type: "grid",
          dataMapping: {
            cols: [
              { id: "products.productName" },
              { id: "products.category" },
              { id: "products.brand" },
              { id: "products.listPrice", aggregation: "sum" },
              { id: "products.unitCost", aggregation: "sum" },
              { id: "products.unitsSold", aggregation: "sum" },
            ],
          },
        },
      },
      widgetLayout: {
        "1": { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 14 },
        "2": { xTrack: 0, yTrack: 14, xSpan: 24, ySpan: 18 },
      },
    },
    {
      id: "brands",
      widgets: {
        "1": {
          type: "column-chart-grouped",
          dataMapping: {
            categoryKey: [{ id: "products.brand" }],
            valueKey: [
              { id: "products.listPrice", aggregation: "avg" },
              { id: "products.unitCost", aggregation: "avg" },
            ],
          },
        },
        "2": {
          type: "grid",
          dataMapping: {
            cols: [
              { id: "products.brand" },
              { id: "products.unitsSold", aggregation: "sum" },
              { id: "products.listPrice", aggregation: "avg" },
            ],
          },
        },
      },
      widgetLayout: {
        "1": { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 16 },
        "2": { xTrack: 0, yTrack: 16, xSpan: 24, ySpan: 12 },
      },
    },
  ],
  selectedPageId: "overview",
};

import * as ReactDOM from "react-dom";

const reactDOMExports: Record<string, unknown> = ReactDOM;

// Keep bundlers from turning this into an import that older React DOM lacks.
export const browser = reactDOMExports[" browser ".trim().toString()];

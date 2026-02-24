export interface OtelSpan {
  setAttribute(key: string, value: string): void;
}

export interface OtelConfig {
  getActiveSpan: () => OtelSpan | undefined;
}

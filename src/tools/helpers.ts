import type { FractalItem, FractalList } from "../lib/types.js";

/** Unwrap a single fractal resource to its attributes */
export function attrs<T>(item: FractalItem<T>): T {
  return item.attributes;
}

/** Unwrap a fractal list to a flat array + pagination (handles missing meta) */
export function attrsList<T>(list: FractalList<T>) {
  return {
    data: list.data.map((d) => d.attributes),
    ...(list.meta?.pagination && { pagination: list.meta.pagination }),
  };
}

/** Format a successful tool response */
export function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Format an error tool response */
export function error(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

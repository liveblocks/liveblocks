/**
 * Converts an object to a query string
 * Example:
 * ```ts
 * const query = objectToQuery({
      resolved: true,
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
      },
});

console.log(query);
// resolved:true AND metadata["status"]:open AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:"

 * ```
 *
 *
 */
type SimpleFilterValue = string | number | boolean;
type OperatorFilterValue = { startsWith: string };

type FilterValue = SimpleFilterValue | OperatorFilterValue;

type Filter = NumberFilter | StringFilter | BooleanFilter;

type NumberFilter = {
  key: string;
  operator: ":";
  value: number;
};

type StringFilter = {
  key: string;
  operator: ":" | "^";
  value: string;
};

type BooleanFilter = {
  key: string;
  operator: ":";
  value: boolean;
};

/**
 * Converts an object to a query string
 * @example
 * ```ts
 * const query = objectToQuery({
 *  metadata: {
 *    status: "open",
 *    priority: 3,
 *    org: {
 *      startsWith: "liveblocks:",
 *    },
 *  },
 * });
 * console.log(query);
 * // metadata["status"]:"open" AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:"
 * ```
 * @example
 * ```ts
 * const query = objectToQuery({
 *  resolved: true,
 *  roomId: {
 *   startsWith: "engineering:",
 *  },
 * });
 * console.log(query);
 * // resolved:true AND roomId^"engineering:"
 * ```
 *
 */
export function objectToQuery(obj: {
  [key: string]:
    | FilterValue
    | { [key: string]: FilterValue | undefined }
    | undefined;
}): string {
  let filterList: Filter[] = [];
  const entries = Object.entries(obj);

  /**
   * Case 1: Simple key value pairs (equal operator)
   * @example
   * ```ts
   * { key: "foo" }
   * ```
   */
  const keyValuePairs = entries.filter(([_, value]) =>
    isSimpleValue(value)
  ) as [string, string | number | boolean][];

  filterList = getFiltersFromKeyValuePairs(keyValuePairs);

  /**
   * Case 2: Key value pairs with operator
   * @example
   * ```ts
   * { key: { startsWith: "fo" } }
   * ```
   */
  const keyValuePairsWithOperator = entries.filter(([_, value]) =>
    isValueWithOperator(value)
  ) as [string, Record<"startsWith", string>][];

  filterList = filterList.concat(
    getFiltersFromKeyValuePairsWithOperator(keyValuePairsWithOperator)
  );

  /**
   * Case 3: Indexed key value pairs
   * @example
   * ```ts
   * { key: { nestedKey: "foo" } }
   * ```
   * @example
   * ```ts
   * { key: { nestedKey: { startsWith: "fo" } } }
   * ```
   */
  const indexedKeys = entries.filter(([_, value]) => {
    return typeof value === "object" && !("startsWith" in value);
  });

  indexedKeys.forEach(([key, value]) => {
    if (!value) {
      return;
    }
    const nestedEntries = Object.entries(value);
    const nestedKeyValuePairs = nestedEntries
      .filter(([_, value]) => isSimpleValue(value))
      .map(([nestedKey, nestedValue]): [string, SimpleFilterValue] => [
        formatFilterKey(key, nestedKey),
        nestedValue,
      ]);

    filterList = filterList.concat(
      getFiltersFromKeyValuePairs(nestedKeyValuePairs)
    );

    const nestedKeyValuePairsWithOperator = nestedEntries
      .filter(([_, value]) => isValueWithOperator(value))
      .map(([nestedKey, nestedValue]): [string, OperatorFilterValue] => [
        formatFilterKey(key, nestedKey),
        nestedValue,
      ]);

    filterList = filterList.concat(
      getFiltersFromKeyValuePairsWithOperator(nestedKeyValuePairsWithOperator)
    );
  });

  return filterList
    .map(({ key, operator, value }) =>
      formatFilter(key, operator, formatFilterValue(value))
    )
    .join(" AND ");
}

const getFiltersFromKeyValuePairs = (
  keyValuePairs: [string, string | number | boolean][]
): Filter[] => {
  const filters: Filter[] = [];
  keyValuePairs.forEach(([key, value]) => {
    filters.push({
      key,
      operator: ":",
      value: value,
    });
  });

  return filters;
};

const getFiltersFromKeyValuePairsWithOperator = (
  keyValuePairsWithOperator: [string, { startsWith: string }][]
): Filter[] => {
  const filters: Filter[] = [];
  keyValuePairsWithOperator.forEach(([key, value]) => {
    if ("startsWith" in value && typeof value.startsWith === "string") {
      filters.push({
        key,
        operator: "^",
        value: value.startsWith,
      });
    }
  });

  return filters;
};

const isSimpleValue = (value: unknown): value is string | number | boolean => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  return false;
};

const isValueWithOperator = (
  value: unknown
): value is { startsWith: string } => {
  if (typeof value === "object" && value !== null && "startsWith" in value) {
    return true;
  }
  return false;
};

const formatFilter = (key: string, operator: ":" | "^", value: string) => {
  return `${key}${operator}${value}`;
};

const formatFilterKey = (key: string, nestedKey?: string) => {
  if (nestedKey) {
    return `${key}["${nestedKey}"]`;
  }
  return key;
};

const formatFilterValue = (value: string | number | boolean) => {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return value.toString();
};

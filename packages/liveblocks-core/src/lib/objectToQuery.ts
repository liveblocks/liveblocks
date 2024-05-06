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

const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function objectToQuery(obj: {
  [key: string]:
    | FilterValue
    | { [key: string]: FilterValue | undefined }
    | undefined;
}): string {
  let filterList: Filter[] = [];
  const entries = Object.entries(obj);

  const keyValuePairs: [string, string | number | boolean][] = [];
  const keyValuePairsWithOperator: [string, Record<"startsWith", string>][] =
    [];
  const indexedKeys: [string, Record<string, FilterValue | undefined>][] = [];

  entries.forEach(([key, value]) => {
    if (!identifierRegex.test(key)) {
      throw new Error("Key must only contain letters, numbers, _");
    }

    if (isSimpleValue(value)) {
      keyValuePairs.push([key, value]);
    } else if (isValueWithOperator(value)) {
      keyValuePairsWithOperator.push([key, value]);
    } else if (typeof value === "object" && !("startsWith" in value)) {
      indexedKeys.push([key, value]);
    }
  });

  filterList = [
    ...getFiltersFromKeyValuePairs(keyValuePairs),
    ...getFiltersFromKeyValuePairsWithOperator(keyValuePairsWithOperator),
  ];

  indexedKeys.forEach(([key, value]) => {
    const nestedEntries = Object.entries(value);
    const nKeyValuePairs: [string, SimpleFilterValue][] = [];
    const nKeyValuePairsWithOperator: [string, OperatorFilterValue][] = [];
    nestedEntries.forEach(([nestedKey, nestedValue]) => {
      if (isStringEmpty(nestedKey)) {
        throw new Error("Key cannot be empty");
      }

      if (isSimpleValue(nestedValue)) {
        nKeyValuePairs.push([formatFilterKey(key, nestedKey), nestedValue]);
      } else if (isValueWithOperator(nestedValue)) {
        nKeyValuePairsWithOperator.push([
          formatFilterKey(key, nestedKey),
          nestedValue,
        ]);
      }
    });
    filterList = [
      ...filterList,
      ...getFiltersFromKeyValuePairs(nKeyValuePairs),
      ...getFiltersFromKeyValuePairsWithOperator(nKeyValuePairsWithOperator),
    ];
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
      value,
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

const isSimpleValue = (value: unknown): value is SimpleFilterValue => {
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
    return `${key}[${JSON.stringify(nestedKey)}]`;
  }
  return key;
};

const formatFilterValue = (value: string | number | boolean) => {
  if (typeof value === "string") {
    if (isStringEmpty(value)) {
      throw new Error("Value cannot be empty");
    }
    return JSON.stringify(value);
  }
  return value.toString();
};

const isStringEmpty = (value: string) => {
  return !value || value.toString().trim() === "";
};

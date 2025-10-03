import {
  isNumberOperator,
  isPlainObject,
  isStartsWithOperator,
} from "./guards";

/**
 * Converts an object to a query string
 * Example:
 * ```ts
 * const query = objectToQuery({
 *   resolved: true,
 *   subscribed: true,
 *   metadata: {
 *     status: "open",
 *     priority: 3,
 *     org: {
 *       startsWith: "liveblocks:",
 *     },
 *     posX: {
 *       gt: 100,
 *       lt: 200,
 *     },
 *     posY: {
 *       gte: 50,
 *       lte: 300,
 *     },
 *   },
 * });
 *
 * console.log(query);
 * // resolved:true AND subscribed:true AND metadata["status"]:open AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:" AND metadata["posX"]>100 AND metadata["posX"]<200 AND metadata["posY"]>=50 AND metadata["posY"]<=300
 * ```
 */
type SimpleFilterValue = string | number | boolean | null;
type OperatorFilterValue =
  | { startsWith: string; gt?: never; lt?: never; gte?: never; lte?: never }
  | {
      lt?: number;
      gt?: number;
      lte?: number;
      gte?: number;
      startsWith?: never;
    };

type FilterValue = SimpleFilterValue | OperatorFilterValue;

type Filter = NumberFilter | StringFilter | BooleanFilter | NullFilter;

type NumberFilter = {
  key: string;
  operator: ":" | "<" | ">" | "<=" | ">=";
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

type NullFilter = {
  key: string;
  operator: ":";
  value: null;
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
 *  subscribed: true,
 *  roomId: {
 *   startsWith: "engineering:",
 *  },
 * });
 * console.log(query);
 * // resolved:true AND subscribed:true AND roomId^"engineering:"
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

  const keyValuePairs: [string, string | number | boolean | null][] = [];
  const keyValuePairsWithOperator: [string, OperatorFilterValue][] = [];
  const indexedKeys: [string, Record<string, FilterValue | undefined>][] = [];

  entries.forEach(([key, value]) => {
    if (!identifierRegex.test(key)) {
      throw new Error("Key must only contain letters, numbers, _");
    }

    if (isSimpleValue(value)) {
      keyValuePairs.push([key, value]);
    } else if (isPlainObject(value)) {
      if (isStartsWithOperator(value) || isNumberOperator(value)) {
        keyValuePairsWithOperator.push([key, value]);
      } else {
        indexedKeys.push([key, value]);
      }
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
      } else if (
        isStartsWithOperator(nestedValue) ||
        isNumberOperator(nestedValue)
      ) {
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
    .map(({ key, operator, value }) => `${key}${operator}${quote(value)}`)
    .join(" ");
}

const getFiltersFromKeyValuePairs = (
  keyValuePairs: [string, string | number | boolean | null][]
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
  keyValuePairsWithOperator: [string, OperatorFilterValue][]
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
    if ("lt" in value && typeof value.lt === "number") {
      filters.push({
        key,
        operator: "<",
        value: value.lt,
      });
    }
    if ("gt" in value && typeof value.gt === "number") {
      filters.push({
        key,
        operator: ">",
        value: value.gt,
      });
    }
    if ("gte" in value && typeof value.gte === "number") {
      filters.push({
        key,
        operator: ">=",
        value: value.gte,
      });
    }
    if ("lte" in value && typeof value.lte === "number") {
      filters.push({
        key,
        operator: "<=",
        value: value.lte,
      });
    }
  });

  return filters;
};

const isSimpleValue = (value: unknown) => {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
};

const formatFilterKey = (key: string, nestedKey?: string) => {
  if (nestedKey) {
    return `${key}[${quote(nestedKey)}]`;
  }
  return key;
};

const isStringEmpty = (value: string) => {
  return !value || value.toString().trim() === "";
};

/**
 * Quotes and escapes a string. Prefer to use single quotes when possible, but
 * falls back to JSON.stringify() (which uses double-quotes) when necessary.
 */
export function quote(input: unknown): string {
  const result = JSON.stringify(input);
  if (typeof input !== "string") {
    return result;
  }

  if (result.includes("'")) {
    return result;
  }

  // See if we can turn this string into a single-quoted string, because those
  // generally are more readable in URLs
  return `'${result.slice(1, -1).replace(/\\"/g, '"')}'`;
}

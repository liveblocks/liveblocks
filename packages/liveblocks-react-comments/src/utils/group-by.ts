export function groupBy<T>(array: T[], property: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const key = String(item[property]);

      if (!result[key]) {
        result[key] = [];
      }

      result[key].push(item);

      return result;
    },
    {} as Record<string, T[]>
  );
}

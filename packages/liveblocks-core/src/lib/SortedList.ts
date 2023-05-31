/**
 * Returns the insertion index for the given item.
 */
function bisectRight<T>(arr: readonly T[], x: T, lt: (a: T, b: T) => boolean) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1); // equiv of Math.floor((lo + hi) / 2)
    if (lt(x, arr[mid])) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

/**
 * A datastructure to keep elements in ascending order, defined by a key
 * function, i.e.
 *
 * const sorted = SortedList.from([{ id: 1 }, { id: 4 }, { id: 4 }, { id: 9 }], x => x.id)
 * sorted.add({ id: 5 })
 * sorted.remove({ id: 4 })
 *
 * Array.from(sorted)
 * [{ id: 1 }, { id: 4 }, { id: 4 }, { id: 5 }, { id: 9 }])
 */
export class SortedList<T> {
  private _data: T[];
  private _lt: (a: T, b: T) => boolean;

  private constructor(alreadySortedList: T[], lt: (a: T, b: T) => boolean) {
    this._lt = lt;
    this._data = alreadySortedList;
  }

  public static from<T>(arr: T[], lt: (a: T, b: T) => boolean): SortedList<T> {
    const sorted = new SortedList([], lt);
    for (const item of arr) {
      sorted.add(item);
    }
    return sorted;
  }

  public static fromAlreadySorted<T>(
    alreadySorted: T[],
    lt: (a: T, b: T) => boolean
  ): SortedList<T> {
    return new SortedList(alreadySorted, lt);
  }

  /**
   * Adds a new item to the sorted list, such that it remains sorted.
   */
  add(value: T): void {
    const idx = bisectRight(this._data, value, this._lt);
    this._data.splice(idx, 0, value);
  }

  /**
   * Removes the given value from the sorted list, if it exists. The given
   * value must be `===` to one of the list items. Only the first entry will be
   * removed if the element exists in the sorted list multiple times.
   */
  remove(value: T): boolean {
    const idx = this._data.indexOf(value);
    if (idx >= 0) {
      this._data.splice(idx, 1);
      return true;
    }
    return false;
  }

  get length(): number {
    return this._data.length;
  }

  *filter(predicate: (value: T) => boolean): IterableIterator<T> {
    for (const item of this._data) {
      if (predicate(item)) {
        yield item;
      }
    }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this._data[Symbol.iterator]();
  }
}

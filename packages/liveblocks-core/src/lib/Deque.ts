import { raise } from "./utils";

/**
 * A Deque is like a stack, but where elements can be efficiently pushed or
 * popped from either side.
 */
export class Deque<T> {
  readonly data: Record<number, T>;
  front: number;
  back: number;
  size: number;

  constructor() {
    this.data = {};
    this.front = 0; // Inclusive
    this.back = 1; // Exclusive
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    const size = this.size;
    const front = this.front;
    for (let i = 0; i < size; i++) {
      yield this.data[front + i];
    }
  }

  push(...values: T[]): void {
    if (this.back > Number.MAX_SAFE_INTEGER - values.length - 1)
      raise("Deque full");
    for (const value of values) {
      this.data[this.back++ - 1] = value;
    }
    this.size += values.length;
  }

  pop(): T | undefined {
    if (this.size < 1) return undefined;

    this.back--;
    const value = this.data[this.back - 1];
    delete this.data[this.back];
    this.size--;
    return value;
  }

  pushLeft(...values: T[]): void {
    if (this.front < Number.MIN_SAFE_INTEGER + values.length)
      raise("Deque full");
    for (let i = values.length - 1; i >= 0; i--) {
      this.data[--this.front] = values[i];
    }
    this.size += values.length;
  }

  popLeft(): T | undefined {
    if (this.size < 1) return undefined;

    const value = this.data[this.front];
    delete this.data[this.front];
    this.front++;
    this.size--;
    return value;
  }
}

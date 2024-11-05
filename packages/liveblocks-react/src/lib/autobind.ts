/**
 * Binds all methods on a class instance to "this". Call this from the
 * constructor if you want to be able to reference the methods like this:
 *
 * ------------------------------------------------------------------------
 *
 *   class MyClass {}
 *   const thing = new MyClass();
 *   const getter1 = thing.someMethod;     // ❌ Cannot refer to someMethod this way, because "this" will not be bound to "thing" here
 *   const getter2 = thing.anotherMethod;  // ❌
 *
 * ------------------------------------------------------------------------
 *
 *   class MyClass {
 *     constructor() {
 *       // ...
 *       autobind(this);                   // 👈
 *     }
 *   }
 *   const thing = new MyClass();
 *   const getter1 = thing.someMethod;     // ✅ Now "this" will be correctly bound to "thing" inside someMethod()
 *   const getter2 = thing.anotherMethod;  // ✅ Now
 *
 */
export function autobind(self: object): void {
  const seen = new Set<string | symbol>();
  seen.add("constructor"); // We'll never want to bind the constructor

  let obj = self.constructor.prototype as object;
  do {
    for (const key of Reflect.ownKeys(obj)) {
      if (seen.has(key)) continue;
      const descriptor = Reflect.getOwnPropertyDescriptor(obj, key);
      if (typeof descriptor?.value === "function") {
        seen.add(key);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        (self as any)[key] = (self as any)[key].bind(self);
      }
    }
  } while ((obj = Reflect.getPrototypeOf(obj)!) && obj !== Object.prototype);
}

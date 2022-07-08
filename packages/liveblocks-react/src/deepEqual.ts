// XXX Unit test the shit out of this
// XXX Use an external package for this? Bleh, dependency, though :(
// XXX Can we optimize this for JSON?
export function deepEqual(x: unknown, y: unknown): boolean {
  // Compares all scalars and identical instances, so we can forget about:
  // null, undefined, strings, booleans, numbers, etc.
  if (Object.is(x, y)) {
    return true;
  }

  // If the types don't match, they're not equal
  if (typeof x !== typeof y) {
    return false;
  }

  // If they aren't objects by now, we consider them not equal
  if (typeof x !== "object") {
    return false;
  }

  // Also not null :)
  if (x === null || y === null) {
    return false;
  }

  if (typeof y !== "object") {
    return false;
  }

  // So... we're only concerned with objects by now. They could be two plain
  // objects, two arrays, two class instances, etc.
  if (Array.isArray(x)) {
    if (!Array.isArray(y)) {
      return false;
    }

    if (x.length !== y.length) {
      return false;
    }

    for (let i = 0; i < x.length; i++) {
      if (!deepEqual(x[i], y[i])) {
        return false;
      }
    }

    return true;
  } else {
    const kx = Object.keys(x);
    const ky = Object.keys(y);
    if (kx.length !== ky.length) {
      return false;
    }

    const kxs = new Set(kx);
    for (let i = 0; i < ky.length; i++) {
      const k = ky[i];
      if (!kxs.has(k)) {
        return false;
      } else {
        kxs.delete(k);
      }
    }

    if (kxs.size !== 0) {
      return false;
    }

    for (let i = 0; i < ky.length; i++) {
      const vx = x[ky[i]];
      const vy = y[ky[i]];
      if (!deepEqual(vx, vy)) {
        return false;
      }
    }

    return true;
  }
}

export const min = 32;
export const max = 126;

export function makePosition(before?: string, after?: string): string {
  // No children
  if (before == null && after == null) {
    return pos([min + 1]);
  }

  // Insert at the end
  if (before != null && after == null) {
    return getNextPosition(before);
  }

  // Insert at the start
  if (before == null && after != null) {
    return getPreviousPosition(after);
  }

  return pos(makePositionFromCodes(posCodes(before!), posCodes(after!)));
}

function getPreviousPosition(after: string) {
  const result = [];
  const afterCodes = posCodes(after);
  for (let i = 0; i < afterCodes.length; i++) {
    const code = afterCodes[i];

    if (code <= min + 1) {
      result.push(min);
      if (afterCodes.length - 1 === i) {
        result.push(max);
        break;
      }
    } else {
      result.push(code - 1);
      break;
    }
  }

  return pos(result);
}

function getNextPosition(before: string) {
  const result = [];
  const beforeCodes = posCodes(before);
  for (let i = 0; i < beforeCodes.length; i++) {
    const code = beforeCodes[i];

    if (code === max) {
      result.push(code);
      if (beforeCodes.length - 1 === i) {
        result.push(min + 1);
        break;
      }
    } else {
      result.push(code + 1);
      break;
    }
  }

  return pos(result);
}

function makePositionFromCodes(before: number[], after: number[]): number[] {
  let index = 0;
  const result = [];

  while (true) {
    const beforeDigit: number = before[index] || min;
    const afterDigit: number = after[index] || max;

    if (beforeDigit > afterDigit) {
      throw new Error(
        `Impossible to generate position between ${before} and ${after}`
      );
    }

    if (beforeDigit === afterDigit) {
      result.push(beforeDigit);
      index++;
      continue;
    }

    if (afterDigit - beforeDigit === 1) {
      result.push(beforeDigit);
      result.push(...makePositionFromCodes(before.slice(index + 1), []));
      break;
    }

    const mid = (afterDigit + beforeDigit) >> 1;
    result.push(mid);
    break;
  }

  return result;
}

export function posCodes(str: string) {
  const codes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    codes.push(str.charCodeAt(i));
  }
  return codes;
}

export function pos(codes: number[]) {
  return String.fromCharCode(...codes);
}

export function comparePosition(posA: string, posB: string): number {
  const aCodes = posCodes(posA);
  const bCodes = posCodes(posB);

  const maxLength = Math.max(aCodes.length, bCodes.length);

  for (let i = 0; i < maxLength; i++) {
    const a = aCodes[i] == null ? min : aCodes[i];
    const b = bCodes[i] == null ? min : bCodes[i];

    if (a === b) {
      continue;
    } else {
      return a - b;
    }
  }

  throw new Error(
    `Impossible to compare similar position "${posA}" and "${posB}"`
  );
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function plural(noun: string): string {
  if (noun.endsWith("y")) {
    return noun.substr(0, noun.length - 1) + "ies";
  } else {
    return noun + "s";
  }
}

export function formatCount(count: number): string {
  if (count === 0) {
    return "no";
  } else if (count === 1) {
    return "one";
  } else if (count === 2) {
    return "two";
  } else {
    return `${count}`;
  }
}

export function pluralize(count: number, noun: string): string {
  if (count === 1) {
    return `${formatCount(count)} ${noun}`;
  } else {
    return `${formatCount(count)} ${plural(noun)}`;
  }
}

export function ordinal(count: number): string {
  if (count === 1) {
    return "1st";
  } else if (count === 2) {
    return "2nd";
  } else if (count === 3) {
    return "3rd";
  } else {
    return `${count}th`;
  }
}

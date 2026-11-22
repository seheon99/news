import { isText } from "./is-text";

export function isIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isText) &&
    new Set(value).size === value.length
  );
}

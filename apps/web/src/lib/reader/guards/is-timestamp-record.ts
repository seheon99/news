import { isRecord } from "./is-record";
import { isTimestamp } from "./is-timestamp";

export function isTimestampRecord(
  value: unknown,
): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(isTimestamp);
}

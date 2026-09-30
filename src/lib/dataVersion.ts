/**
 * A counter that goes up whenever a dialog saves a record (a new appointment, an edited plan …). Lists and record
 * pages include it in what they load, so the page behind the dialog shows the change at once without leaving it.
 */
import { useSyncExternalStore } from "react";

let version = 0;
const listeners = new Set<() => void>();

/** Tell every open list and record that data changed. */
export function bumpData(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current count: put it in an effect's dependencies to load again after a dialog saved something. */
export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

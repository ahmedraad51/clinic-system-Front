import { num } from "../runtime";

/** The bell in the top bar: today's appointments still to come (src/components/NotificationBell.tsx). */
export const notifications = {
  countLabel: (n: number) => `Today's appointments: ${num(n)}`,
  loadFailedLabel: "Today's appointments could not be loaded",
  mine: "Your patients still to come",
  all: "Appointments still to come",
  loadFailed: "Could not load today's appointments.",
  nothingLeft: "Nothing left for today.",
  viewAll: "View all of today",
};

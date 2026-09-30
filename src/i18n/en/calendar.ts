import { num, plural } from "../runtime";

/** The day and week time grid of the appointment book (src/components/AppointmentCalendar.tsx). */
export const calendar = {
  loadFailed: "Could not load the appointments.",
  closedDay: "The clinic is closed on this day.",
  noDoctors: "There are no active doctors to show.",
  /** Under a doctor's name in the day view. */
  freeAllDay: "Free all day",
  count: (n: number) => plural(n, { one: "# appointment", other: "# appointments" }),
  /** A doctor's working hours: "9:00 AM–5:00 PM" */
  hoursRange: (from: string, to: string) => `${from}–${to}`,
  closed: "Closed",
  previousDoctor: "Previous doctor",
  nextDoctor: "Next doctor",
  /** Phones show one doctor at a time: "Doctor 2 of 5" */
  doctorOf: (index: number, count: number) => `Doctor ${num(index)} of ${num(count)}`,
  /** An empty 15-minute slot: "Book at 10:30 AM with Dr. Zainab (outside working hours)" */
  bookAt: (time: string, doctor: string, outside: boolean) =>
    `Book at ${time}${doctor ? ` with ${doctor}` : ""}${outside ? " (outside working hours)" : ""}`,
  slotHint: (time: string) => `+ ${time}`,
  /** An appointment block, read aloud: "10:00 AM, Zahraa Ali, Dr. Zainab, Scheduled" */
  blockLabel: (time: string, who: string, doctor: string, status: string) =>
    `${time}, ${who}${doctor ? `, ${doctor}` : ""}, ${status}`,
  /** An appointment block's tooltip: "10:00 AM · Zahraa Ali · Filling · Scheduled" */
  blockTitle: (time: string, who: string, reason: string, status: string) =>
    `${time} · ${who}${reason ? ` · ${reason}` : ""} · ${status}`,
  moved: (who: string, time: string) => `${who} moved to ${time}.`,
  moveFailed: "Could not move the appointment.",
  now: "Now",
  notWorking: "Doctor not working",
  clickToBook: "Click an empty time to book it.",
  dragToMove: "Drag an appointment to move it.",
  moveTitle: "Move this appointment?",
  move: "Move",
  moveAnyway: "Move anyway",
  /**
   * "<Zahraa Ali> from 8 Sep 2026 at 10:00 AM with Dr. Zainab to <9 Sep 2026 at 11:00 AM> with Dr. Ali."
   * The patient and the new time are drawn in bold between these parts.
   */
  moveFrom: (date: string, time: string, doctor: string) => ` from ${date} at ${time}${doctor ? ` with ${doctor}` : ""} to `,
  moveTo: (date: string, time: string) => `${date} at ${time}`,
  moveWith: (doctor: string) => ` with ${doctor}`,
  moveEnd: ".",
  /** `who` is empty when the other appointment has no patient name. */
  overlaps: (who: string, time: string) => `This overlaps ${who || "another appointment"} at ${time}.`,
};

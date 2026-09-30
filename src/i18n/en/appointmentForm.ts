import { plural } from "../runtime";

/** The booking form (new and edit), with the chosen doctor's day and its free times. */
export const appointmentForm = {
  saveFailed: "Could not save the appointment. Please try again.",
  clinicHours: (from: string, to: string) => `Clinic hours: ${from} to ${to}`,
  searchPatient: "Search by name or phone...",
  selectDoctor: "Select Doctor",
  duration: "Duration",
  /** "30 minutes": the length of a visit. */
  minutes: (n: number) => plural(n, { one: "# minute", other: "# minutes" }),
  reasonForVisit: "Reason for Visit",
  bookAnyway: "Book anyway",
  closedTitle: "The clinic is closed on this day",
  closedText: (date: string) => `${date} is not one of the clinic's working days (Settings). Book it anyway?`,
  clashTitle: "This doctor is already booked",
  /** "The doctor already has an appointment with <Zahraa Ali> on 8 Sep 2026 at 10:00 AM that overlaps this time." */
  clashBefore: "The doctor already has an appointment with ",
  clashAfter: (date: string, time: string) => ` on ${date} at ${time} that overlaps this time.`,

  /* The doctor's day */
  /** "Dr. Zainab, 8 Sep 2026" (just the date when the doctor's name is not known). */
  dayHeading: (doctor: string, date: string) => (doctor ? `${doctor}, ${date}` : date),
  loadingDay: "Loading the doctor's day...",
  booked: "Booked",
  nothingBooked: "Nothing booked yet.",
  /** "10:00 AM–10:30 AM" */
  range: (from: string, to: string) => `${from}–${to}`,
  past: "This date is in the past.",
  closed: "The clinic is closed on this day.",
  freeFor: (minutes: number) => `Free for ${plural(minutes, { one: "# minute", other: "# minutes" })} — tap to choose`,
  noFree: (minutes: number) =>
    `No free time of ${plural(minutes, { one: "# minute", other: "# minutes" })} left in clinic hours on this day.`,
  nextFree: (time: string) => `Next free: ${time}`,
  outsideDoctor: (time: string, doctor: string, from: string, to: string) =>
    `${time} is outside ${doctor || "the doctor"}'s working hours (${from}–${to}).`,
  outsideClinic: (time: string, from: string, to: string) => `${time} is outside clinic hours (${from}–${to}).`,
  /** `who` is empty when the other appointment has no patient name. */
  overlaps: (time: string, who: string, at: string) => `${time} overlaps ${who || "another appointment"} at ${at}.`,
};

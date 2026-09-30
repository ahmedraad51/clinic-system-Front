import { num } from "../runtime";

/** The appointment pages: the book (list), a new booking, one appointment, its edit page and its printed card. */
export const appointments = {
  title: "Appointments",
  appointment: "Appointment",
  newAppointment: "New Appointment",
  backToList: "Back to Appointments",

  /* The book */
  listSubtitle: "The appointment book as a list. Click a row to open it.",
  view: "View",
  views: { day: "Day", week: "Week", list: "List" },
  previousDay: "Previous day",
  nextDay: "Next day",
  previousWeek: "Previous week",
  nextWeek: "Next week",
  goToDate: "Go to date",
  allDoctors: "All doctors",
  /** "20 Sep 2026 – 26 Sep 2026" */
  weekRange: (from: string, to: string) => `${from} – ${to}`,
  when: { all: "All dates", today: "Today", tomorrow: "Tomorrow", upcoming: "Upcoming", past: "Past" },
  searchPlaceholder: "Search by patient, doctor or reason...",
  allStatuses: "All statuses",
  reason: "Reason",
  noMatch: "No appointments match these filters.",
  noneYet: "No appointments yet.",

  /* One appointment */
  /** "8 Sep 2026 at 10:00 AM · APT-2026-00001" */
  subtitle: (date: string, time: string, id: string) => `${date} at ${time} · ${id}`,
  newTreatment: "New Treatment",
  deleteAppointment: "Delete appointment",
  printCard: "Print Card",
  duration: "Duration",
  updateStatus: "Update Status",
  markedAs: (status: string) => `Marked as ${status}.`,
  statusFailed: "Could not change the status.",
  deleted: "Appointment deleted.",
  deleteFailed: "Could not delete the appointment.",
  whatsappMessages: "WhatsApp Messages",
  sendMessage: "Send Message",
  noMessages: "No messages for this appointment yet.",
  prescriptions: "Prescriptions",
  writePrescription: "Write Prescription",
  noPrescription: "No prescription written at this visit.",
  deleteTitle: "Delete this appointment?",
  deleteText: (date: string, time: string) =>
    `The appointment on ${date} at ${time} will be removed for good. To keep a record, set its status to Cancelled instead.`,
  deleteConfirm: "Delete Appointment",

  /* New and edit */
  book: "Book Appointment",
  booked: "Appointment booked.",
  editTitle: "Edit Appointment",
  saved: "Appointment saved.",

  /* The printed card */
  card: {
    title: "Appointment Card",
    subtitle: "Print it and hand it to the patient.",
    yourNext: "Your next appointment",
    for: "For",
    at: (time: string) => `at ${time}`,
    with: (doctor: string) => `with ${doctor}`,
    visit: "Visit: ",
    arriveEarly: (minutes: number) => `Please arrive ${num(minutes)} minutes early.`,
    /** Followed by the clinic's phone number and a full stop. */
    toChange: "To change your appointment, call",
    end: ".",
  },
};

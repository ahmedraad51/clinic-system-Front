/** The waiting room screen (/waiting-room): a TV in the waiting room. Only first names and an initial. */
export const waitingRoom = {
  title: "Waiting Room",
  inChair: "In the chair",
  waiting: "Waiting",
  next: "Coming up",
  withDoctor: (doctor: string) => `with ${doctor}`,
  nobodyInChair: "Nobody yet",
  nobodyWaiting: "Nobody is waiting",
  nobodyNext: "No more appointments today",
  waitingMinutes: (n: number) => (n < 1 ? "just arrived" : `${n} min`),
  fullScreen: "Full Screen",
  back: "Back to Today",
  updated: (time: string) => `Updated ${time}`,
  welcome: "Welcome. Please tell the front desk when you arrive.",
  loadFailed: "Could not load today's patients. Trying again…",
};

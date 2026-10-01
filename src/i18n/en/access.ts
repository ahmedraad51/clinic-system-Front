/** When nothing can be changed (ReadOnlyBanner): a view-only cloud copy … */
export const access = {
  copyTitle: "View-only copy",
  /** "Last updated 26 Sep 2026, 8:18 AM." */
  copyUpdated: (when: string) => `Last updated ${when}.`,
  copyUnknown: "When it was last updated is not known yet.",
  copyText: "Changes are made at the clinic, and show here after the next update.",
  copyFailed: (why: string) => `The last update did not work: ${why}`,
  readOnlyRefused: "This is a view-only copy: nothing can be changed here.",
  viewOnly: "View only",
  passwordAtClinic: "Passwords are changed at the clinic, not on the view-only copy.",
  // The connection is lost: the last copy of what was loaded shows, view-only
  offlineTitle: "Offline: you are seeing the last copy",
  offlineNoNetwork: "This computer has no network.",
  offlineNoServer: "The server cannot be reached.",
  /** "What was loaded up to 8:42 AM is shown …" */
  offlineShown: (when: string) =>
    `What was loaded up to ${when} is shown, and nothing can be added or changed. Everything refreshes by itself when the connection is back.`,
  offlineNothing: "Nothing can be added or changed. Everything refreshes by itself when the connection is back.",
  tryAgain: "Try Again",
};

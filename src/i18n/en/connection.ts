/** The connection to the server and to the internet (ConnectivityContext): WhatsApp without internet, the status icon. */
export const connection = {
  // WhatsApp needs the internet (a clinic server may have none)
  needsInternet: "Needs internet",
  whatsappNeedsInternet: "WhatsApp needs the internet, and the clinic has none right now.",
  noInternetTitle: "No internet at the clinic right now",
  noInternetReminders: "WhatsApp cannot open. The reminders stay in this list until the internet is back.",
  noInternetList: "WhatsApp messages cannot be sent until the internet is back.",
  copyNoInternet: "The clinic server has no internet, so the cloud copy could not be updated.",
  /** The status icon in the top bar (ConnectionStatus). */
  status: {
    title: "Connection",
    online: "Online",
    clinicServer: "Connected to the clinic server",
    noInternet: "Clinic server connected, no internet",
    offline: "Offline: this computer has no network",
    offlineShort: "No network",
    unreachable: "Cannot reach the server",
    checking: "Checking the connection…",
    copyFresh: (ago: string) => `Cloud copy up to date (${ago})`,
    copyBehind: (ago: string) => `Cloud copy last updated ${ago}`,
    copyNever: "The cloud copy has not been made yet",
  },
};

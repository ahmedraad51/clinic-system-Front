/** How this copy of DentClinic is installed (src/lib/deployment.ts): the three modes, and previewing one. */
export const deployment = {
  modes: {
    cloud: "Cloud",
    "clinic-server": "Clinic Server",
    "cloud-copy": "Clinic Server + Cloud copy",
  },
  modeHints: {
    cloud: "Online. Each clinic has its own site and web address.",
    "clinic-server": "On a small computer inside the clinic. Works with no internet.",
    "cloud-copy": "The online copy of a clinic server, for viewing from home. Nothing can be changed here.",
  },
  // Previewing a mode (dummy data only, on /profile)
  previewTitle: "Preview a Way of Installing",
  previewText:
    "DentClinic can be installed three ways. The way is fixed when the app is built (DEPLOYMENT_MODE). With the dummy data you can preview another one on this computer; the page reloads, and the dummy data starts again.",
  previewLabel: "Installed as",
  builtIn: (mode: string) => `${mode} (built in)`,
  previewing: (mode: string) => `Previewing: ${mode}`,
  // Pretending something is wrong (dummy data only)
  pretendNoInternet: "Pretend the clinic has no internet",
  pretendNoInternetHint: "WhatsApp buttons then say they need the internet, and reminders stay in their list.",
};

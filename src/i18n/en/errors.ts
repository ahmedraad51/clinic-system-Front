/** Failed requests in plain words (errorMessage() in src/lib/frappe.ts), and the dummy back end's checks. */
export const errors = {
  generic: "Something went wrong. Please try again.",
  sessionEnded: "Your session has ended. Please log in again.",
  loginNotKept:
    "You were logged in, but the browser did not keep the login. Ask whoever set up the system to check that the app reaches the server through its own address (FRAPPE_URL).",
  twoFactor: "This account uses two-step login, which the app does not support yet. Ask an administrator.",
  passwordReset: "Your password has to be changed before you can log in. Ask an administrator to reset it.",
  noPermission: "You do not have permission to do this.",
  serverDownRead: "The clinic server is not answering. Please try again in a moment.",
  serverDownSave: "The clinic server did not answer. It may still have been saved, so check before trying again.",
  uploadTimeout: (minutes: number) =>
    `The upload took more than ${minutes} minutes and was stopped. Check the internet connection, or try a smaller file.`,
  timeoutRead: "The server took too long to answer. Please try again.",
  timeoutSave: "The server took too long to answer. It may still have been saved, so check before trying again.",
  noConnection: "Cannot reach the server. Check the internet connection and try again.",
  duplicate: (value: string) => (value ? `"${value}" is already used by another record.` : "This value is already used by another record."),
  tooLong: (field: string) => `Too much text for ${field}. Please shorten it.`,
  /** The dummy back end: the same checks the real one makes. */
  mock: {
    noRate: (code: string) => `Set the ${code} exchange rate in Settings first.`,
    currencyNotTaken: (code: string) => `The clinic does not take ${code}. Add it in Settings first.`,
    planCurrencyLocked: "This plan already has payments, so its currency cannot be changed.",
    ratesInvalid: "Each exchange rate needs a date and an amount above zero, one rate per date, and at least one rate for the second currency.",
    secondInUse: (code: string) => `Plans or payments are in ${code}, so it stays as the second currency.`,
    mainInUse: "The clinic currency cannot change once there are plans or payments.",
    amountAboveZero: "Amount must be more than zero.",
    paidAboveCost: (paid: string, cost: string, plan: string) =>
      `Paid amount (${paid}) cannot be more than the total cost (${cost}) of ${plan}.`,
    costBelowPaid: (paid: string, cost: string) => `Paid amount (${paid}) cannot be more than the total cost (${cost}).`,
    countDay: "Choose the day of the count.",
    countCash: "Enter the cash counted.",
    countTwice: (day: string, name: string) => `The cash for ${day} was already counted (${name}).`,
    countNote: "Write a note saying why the cash is short or over.",
    linked: (doctype: string, name: string, linkedDoctype: string, linkedName: string) =>
      `Cannot delete ${doctype} ${name} because it is linked with ${linkedDoctype} ${linkedName}.`,
    newPassword: "New password is required.",
    noMethod: (method: string) => `The method ${method} is not available with dummy data.`,
    readFile: "Could not read the file.",
  },
};

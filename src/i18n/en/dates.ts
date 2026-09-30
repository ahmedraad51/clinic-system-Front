/** Month and day names for formatDate() and friends in src/lib/format.ts. */
export const dates = {
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  monthsLong: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  /** Sunday first, as Date.getDay(). */
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  daysLong: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  am: "AM",
  pm: "PM",
  /** "8 Sep 2026" */
  date: (day: string, month: string, year: string) => `${day} ${month} ${year}`,
  /** "8 Sep" (this year) */
  dayMonth: (day: string, month: string) => `${day} ${month}`,
  /** "Sep 2026" */
  monthYear: (month: string, year: string) => `${month} ${year}`,
  /** "Saturday, 26 September 2026" */
  longDate: (weekday: string, day: string, month: string, year: string) => `${weekday}, ${day} ${month} ${year}`,
  /** "2:30 PM" */
  time: (hour: string, minute: string, half: string) => `${hour}:${minute} ${half}`,
  /** "8 Sep 2026, 10:00 AM" */
  dateTime: (date: string, time: string) => `${date}, ${time}`,
  /** Symbols written after an amount on Arabic screens; English screens use the browser's own format. */
  currencySymbols: {} as Record<string, string>,
};

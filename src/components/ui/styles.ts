/** Class lists shared by the UI kit (index.tsx) and its controls (Select, DateInput, TimeInput …). */

/**
 * An outlined field: a thin border in the text colour (stronger on hover), and on focus a 2 px border in the clinic
 * colour with a small coloured lift.
 */
export const inputClass =
  "w-full min-h-10 pointer-coarse:min-h-11 rounded-md border border-gray-300 bg-surface px-3.5 py-1.5 text-sm max-sm:text-base text-gray-900 " +
  "placeholder:text-gray-400 hover:border-gray-500 transition-[border-color,box-shadow] " +
  "focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 focus:shadow-primary " +
  "disabled:bg-gray-100 disabled:text-gray-500 disabled:hover:border-gray-300 " +
  // A field that failed its check (the form sets aria-invalid, and passes the message to Field's `error`).
  "aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-error aria-invalid:focus:shadow-none " +
  // Or one the browser's own check stopped (Field marks itself data-invalid and shows the message).
  "group-data-invalid/field:border-error group-data-invalid/field:ring-1 group-data-invalid/field:ring-error";

/** URLs for records. Always build links with these so IDs are encoded the same way everywhere. */

const docHref = (base: string, name: string) => `${base}/${encodeURIComponent(name)}`;

export const patientHref = (name: string) => docHref("/patients", name);
export const appointmentHref = (name: string) => docHref("/appointments", name);
export const treatmentHref = (name: string) => docHref("/treatments", name);
export const paymentHref = (name: string) => docHref("/payments", name);

/** User IDs are email addresses, so they go through base64 to stay URL-safe. */
export const userHref = (name: string) => `/users/${encodeURIComponent(btoa(name))}`;

/** Reads a record ID from a route param. */
export function routeId(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Reads a user ID from the /users/[id] route param. */
export function userIdFromRoute(value: string | string[] | undefined): string {
  try {
    return atob(routeId(value));
  } catch {
    return "";
  }
}

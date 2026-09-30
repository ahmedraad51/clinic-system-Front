/** URLs for records. Always build links with these so IDs are encoded the same way everywhere. */

const docHref = (base: string, name: string) => `${base}/${encodeURIComponent(name)}`;

export const patientHref = (name: string) => docHref("/patients", name);
export const appointmentHref = (name: string) => docHref("/appointments", name);
export const treatmentHref = (name: string) => docHref("/treatments", name);
export const paymentHref = (name: string) => docHref("/payments", name);
export const prescriptionHref = (name: string) => docHref("/prescriptions", name);

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

/**
 * The login page's address, remembering the page to come back to ("/login?next=%2Fpatients%3Fbalance%3Dowing")
 * and whether the login had ended ("&ended=1", which shows a notice).
 */
export function loginHref(next: string, ended = false): string {
  const back = next && next !== "/" && !next.startsWith("/login") ? `next=${encodeURIComponent(next)}` : "";
  const query = [back, ended ? "ended=1" : ""].filter(Boolean).join("&");
  return query ? `/login?${query}` : "/login";
}

/**
 * Where to go after logging in: the remembered page if it is a page of this app, otherwise the dashboard.
 * The path is read the way the browser will read it, so "//other.site", "/\other.site", "/<tab>/other.site"
 * (browsers drop tabs and line breaks) and "/.//other.site" cannot lead off the site.
 */
export function safeNextPath(next: string | null | undefined): string {
  const path = (next ?? "").trim();
  if (!path.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(path)) return "/dashboard";
  const base = "http://dentclinic.invalid";
  try {
    const url = new URL(path, base);
    // "/.//other.site" resolves to "//other.site", which a browser reads as another site.
    if (url.origin !== base || url.pathname.startsWith("//") || url.pathname.startsWith("/login")) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}

/** One doctor's page: their day, their upcoming appointments and open treatment plans. */
export function doctorHref(name: string): string {
  return `/doctors/${encodeURIComponent(name)}`;
}

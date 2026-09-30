"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getCount, getDoc, getList, errorMessage, isNotFound, type FilterRow } from "./frappe";
import { MEDICAL_FIELDS, type MedicalFields } from "./medical";
import { phoneSearchPattern, toLatinDigits } from "./phone";
import type { BaseDoc, Doctor, Patient } from "./types";

/**
 * True while a CSS media query matches, e.g. useMediaQuery("(max-width: 639px)") for phones.
 * False during the server render; the browser value follows straight after.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Returns the value once it has stopped changing for `delay` ms. Used for search boxes. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export interface PagedQuery {
  fields: string[];
  filters?: FilterRow[];
  orFilters?: FilterRow[];
  orderBy?: string;
  pageSize?: number;
}

interface PagedResult<T> {
  requestKey: string;
  rows: T[];
  total: number;
  error: string;
}

/**
 * One page of a list, loaded from the server with its total count.
 * Changing the query goes back to page 1. `reload()` fetches the same page again.
 */
export function usePagedList<T extends BaseDoc>(doctype: string, query: PagedQuery) {
  const pageSize = query.pageSize ?? 20;
  const key = JSON.stringify({ doctype, ...query, pageSize });

  // The page is stored with the query it belongs to, so a new query starts on page 1.
  const [pageState, setPageState] = useState({ key, page: 1 });
  const page = pageState.key === key ? pageState.page : 1;
  const setPage = useCallback((next: number) => setPageState({ key, page: next }), [key]);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const requestKey = `${key}|${page}|${version}`;
  const [result, setResult] = useState<PagedResult<T> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const q = JSON.parse(key) as PagedQuery & { doctype: string; pageSize: number };
    const thisRequest = `${key}|${page}|${version}`;
    const load = async () => {
      try {
        const [rows, total] = await Promise.all([
          getList<T>(q.doctype, q.fields, {
            filters: q.filters,
            orFilters: q.orFilters,
            orderBy: q.orderBy,
            limit: q.pageSize,
            start: (page - 1) * q.pageSize,
          }),
          getCount(q.doctype, q.filters, q.orFilters),
        ]);
        if (!cancelled) setResult({ requestKey: thisRequest, rows, total, error: "" });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setResult((prev) => ({
            requestKey: thisRequest,
            rows: prev?.rows ?? [],
            total: prev?.total ?? 0,
            error: errorMessage(err, "Could not load the list."),
          }));
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key, page, version]);

  return {
    rows: result?.rows ?? [],
    total: result?.total ?? 0,
    page,
    pageSize,
    setPage,
    reload,
    /** True on the very first load, and while loading again after an error: there is nothing to show yet. */
    initialLoading: result === null || (result.error !== "" && result.requestKey !== requestKey),
    /** True while any request is running, including page changes. */
    loading: result?.requestKey !== requestKey,
    /** Why the last load failed; empty while a new load is running (Try Again then shows the loading rows). */
    error: result && result.requestKey === requestKey ? result.error : "",
  };
}

/**
 * Builds [[field, "like", "%text%"], …] for a search box, or undefined when the box is empty. Arabic digits
 * are searched as 0-9. When the text looks like a phone number, fields with "phone" in their name also match
 * it however it was stored, so "0770 123 4567", "+964 770 123 4567" and "07701234567" find each other.
 */
export function searchFilters(text: string, fields: string[]): FilterRow[] | undefined {
  const needle = toLatinDigits(text).trim();
  if (!needle) return undefined;
  const phone = phoneSearchPattern(needle);
  return fields.flatMap((field) => [
    [field, "like", `%${needle}%`] as FilterRow,
    ...(phone && field.includes("phone") ? [[field, "like", phone] as FilterRow] : []),
  ]);
}

/**
 * Loads one doc. `reload()` fetches it again but keeps showing the old copy until the new one arrives,
 * so fields the server computes (like remaining_amount) stay correct after a change.
 */
export function useDocument<T extends BaseDoc>(doctype: string, name: string) {
  const id = `${doctype}|${name}`;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ id: string; doc: T | null; error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const doc = await getDoc<T>(doctype, name);
        if (!cancelled) setState({ id: `${doctype}|${name}`, doc, error: "" });
      } catch (err) {
        const missing = isNotFound(err);
        if (!missing) console.error(err);
        if (!cancelled) setState({ id: `${doctype}|${name}`, doc: null, error: missing ? "" : errorMessage(err) });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [doctype, name, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = state && state.id === id ? state : null;
  return {
    doc: current?.doc ?? null,
    loading: current === null,
    /** The load failed. `error` says why; it is empty when the doc simply does not exist. */
    notFound: current !== null && current.doc === null,
    error: current?.error ?? "",
    reload,
  };
}

/** Active doctors, for dropdowns. */
export function useDoctors() {
  return useDoctorList().doctors;
}

/** Active doctors, plus whether they are still loading (for screens that look empty without them). */
export function useDoctorList() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Doctor>("Doctor", ["name", "full_name", "specialization", "start_time", "end_time", "gender", "photo"], {
          filters: [["is_active", "=", 1]],
          orderBy: "full_name asc",
          limit: 0,
        });
        if (!cancelled) setDoctors(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) setDoctors([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  return { doctors: doctors ?? NO_DOCTORS, loading: doctors === null };
}

const NO_DOCTORS: Doctor[] = [];

/**
 * The medical fields (with the phone number and age) of one patient, for the MedicalAlerts band on pages about
 * something else (an appointment, a treatment plan) and the prescription warnings. Null until loaded, or when
 * there is no patient.
 */
export function usePatientMedical(patient: string | undefined) {
  const [result, setResult] = useState<{ patient: string; fields: (MedicalFields & Pick<Patient, "phone_number" | "age">) | null } | null>(null);
  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Patient>("Patient", ["name", "phone_number", "age", ...MEDICAL_FIELDS], {
          filters: [["name", "=", patient]],
          limit: 1,
        });
        if (!cancelled) setResult({ patient, fields: rows[0] ?? null });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patient]);
  return result && result.patient === patient ? result.fields : null;
}

/** A patient's dental chart and age, for showing the chart on another record's page (a treatment plan). */
export function usePatientChart(patient: string | undefined) {
  const [result, setResult] = useState<{ patient: string; doc: Pick<Patient, "name" | "dental_chart" | "age"> | null } | null>(null);
  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Patient>("Patient", ["name", "dental_chart", "age"], {
          filters: [["name", "=", patient]],
          limit: 1,
        });
        if (!cancelled) setResult({ patient, doc: rows[0] ?? null });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patient]);
  return result && result.patient === patient ? result.doc : null;
}

/** What a patient's drawn avatar needs: gender and age. */
export type PatientLook = Pick<Patient, "name" | "gender" | "age">;

/**
 * Gender and age of a few patients (by ID), for their avatars in a list whose rows only hold the patient's name
 * (appointments, the Today board). Missing patients are left out; nothing is shown while loading.
 */
export function usePatientLooks(ids: string[]): Record<string, PatientLook> {
  const key = [...new Set(ids.filter(Boolean))].sort().join("|");
  const [result, setResult] = useState<{ key: string; looks: Record<string, PatientLook> } | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Patient>("Patient", ["name", "gender", "age"], {
          filters: [["name", "in", key.split("|")]],
          limit: 0,
        });
        if (!cancelled) setResult({ key, looks: Object.fromEntries(rows.map((row) => [row.name, row])) });
      } catch (err) {
        // Only the drawings are missing: each avatar falls back to a neutral one.
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return result && result.key === key ? result.looks : NO_LOOKS;
}

const NO_LOOKS: Record<string, PatientLook> = {};

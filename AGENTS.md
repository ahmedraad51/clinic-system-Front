<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DentClinic front end — agent guide

Front end of **DentClinic**, a dental clinic management system: patients and their medical records, the
appointment book, treatment plans with sessions and per-tooth charting, payments and receipts, financial
reports, WhatsApp reminder templates, clinic settings, and per-user permissions. It is a Next.js 16 App
Router app. A separate **Frappe v16** back end
([`ahmedraad51/clinic-system-backend`](https://github.com/ahmedraad51/clinic-system-backend), app `dent_app`)
owns the data model, money calculations, roles, scheduled reports and WhatsApp sending.

`README.md` is the overview for people. This file is the working reference for agents: how the code fits
together, the rules to follow, and what is still open. `docs/backend-todo.md` lists what the back end must
provide for this front end. `CLAUDE.md` imports this file, so every Claude Code session loads it. Keep it
accurate.

---

## Read this first: current state

| | State | Where |
|---|---|---|
| Data source | **Dummy data.** Every read and write goes to an in-memory store. No back end needed. | `MOCK_DATA = true` in `src/lib/frappe.ts` |
| Login | **Off.** A stand-in `Administrator` session is used and logout buttons are hidden. `/profile` has a **Try Another User** card to see the app with another user's permissions. The login page sits in a private folder, so `/login` is not a route. | `AUTH_DISABLED = true` in `src/context/AuthContext.tsx`; page in `src/app/_login/page.tsx` |
| `npm run dev` | Works. Dev output goes to `.next/dev`, so `npm run build` can run while it is up. Changing `next.config.ts` restarts it, and the first page after that can take several minutes to compile. | |
| `npm run build` | **Passes** (checked 2026-09-26): compiles, type-checks and prerenders every route, with no warnings. | |
| `npm run lint` | **Passes** with 0 problems (checked 2026-09-26). `npx tsc --noEmit` passes too. | |
| Tests | **Playwright tests pass** (71 tests, checked 2026-09-26): one file per area in `e2e/tests/` (patients, booking, calendar, Today board, treatments, payments, printouts, permissions, WhatsApp, phone numbers and more). Pure helpers such as `src/lib/phone.ts` are tested in the same runner without a browser. No CI. | `e2e/`, `playwright.config.ts` |

Both flags are set this way on purpose. Leave them alone unless the task is about them.

---

## Commands

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies. Next 16 needs Node **20.9+**; the project was developed on Node 22. |
| `npm run dev` | Dev server at <http://localhost:3000>, using Turbopack (the Next 16 default). `/` redirects to `/dashboard`. |
| `npm run build` | Production build: compile, TypeScript check, prerender. In Next 16 it **does not** run ESLint. |
| `npm run start` | Serves a production build. |
| `npm run lint` | Plain `eslint` with the flat config in `eslint.config.mjs`. Next 16 removed `next lint`. |
| `npx tsc --noEmit` | Type-check only. It also checks the route types Next generates in `.next/` (created by `dev`/`build`). |
| `npm run test:e2e` | Playwright tests in `e2e/tests` (Chromium only). Builds, then serves the build on port **3100** (`E2E_PORT`), so it never clashes with `npm run dev` on 3000. `SKIP_BUILD=1` reuses the last build. Output goes to `test-results/` and `playwright-report/` (ignored by git). |
| `npm run screenshots` | Full-page screenshots of every page at desktop 1440×900, tablet 1024×768 and phone 390×844, saved to `screenshots/<size>/<page>.png` (ignored by git). `PAGES=dashboard,patients` limits it; `SKIP_BUILD=1` works here too. |
| `npm run screenshots:readme` | Retakes the pictures in `README.md` into `docs/screenshots/` (desktop, dummy data). Run it after a visible change and commit the images. `SKIP_BUILD=1` works here too |

The Frappe address comes from the `FRAPPE_URL` environment variable (for example in `.env.local`), default
`http://dent_clinic.localhost:8000`. See `next.config.ts`.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js **16.2.9**, App Router, Turbopack |
| UI | React **19.2.4**, TypeScript 5 with `strict: true`, path alias `@/*` → `src/*` |
| Styling | Tailwind CSS **v4** via `@tailwindcss/postcss`. It is CSS-first: no `tailwind.config.*`; the design tokens (the `primary-*` palette and the text scale) are an `@theme` block in `src/app/globals.css` |
| Font | Plus Jakarta Sans through `next/font/google` in `layout.tsx` |
| Icons | `lucide-react` everywhere; the tooth logo is our own SVG in `src/components/ToothLogo.tsx` |
| HTTP | `axios`, one instance in `src/lib/frappe.ts` |
| State | React Context (auth, settings, session, toasts) and per-page `useState`. No global store, no data-fetching library |
| Installed but unused | `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `clsx`. The modal and dropdowns are hand-written; `cx()` in `src/lib/format.ts` does what `clsx` would |

---

## Architecture

```
Browser: React client components (every page is "use client")
   │  getList / getCount / getDoc / createDoc / updateDoc / deleteDoc / callMethod / uploadFile
   ▼
src/lib/frappe.ts   the only module that touches data
   ├─ MOCK_DATA = true  → src/lib/mockData.ts   (in-memory store, lives in the browser)
   └─ MOCK_DATA = false → axios → /frappe/api/...
                                   │  rewrite in next.config.ts: /frappe/:path*
                                   ▼
                          FRAPPE_URL (default http://dent_clinic.localhost:8000)
                          Frappe v16 · dent_app  (cookie session + x-frappe-csrf-token)
```

- **Rendering model.** Only `src/app/layout.tsx`, `src/app/page.tsx` (a server-side `redirect("/dashboard")`)
  and `src/app/not-found.tsx` are Server Components. Every other page is a Client Component that loads its
  data in effects after mount. No Server Actions, no server-side data fetching, no `loading.tsx` or
  `error.tsx`, no `proxy.ts` (the Next 16 name for middleware).
- **Provider tree** (in `layout.tsx`): `AuthProvider` → `SettingsProvider` → `SessionProvider` →
  `ToastProvider` → `MainLayout` → page.
- **Shell.** `MainLayout` draws the `Sidebar` (fixed `w-64`, a slide-in drawer below the `lg` breakpoint) and
  the `Topbar` (`h-16`) around `<main>`. On `/login` it renders the page with no shell. Both bars carry
  `print:hidden`, so a printed page is just the content (used by the payment receipt).
- **One login guard.** `MainLayout` sends logged-out visitors to `/login`, and waits until `isLoading` is
  false first. Pages do not check the login themselves.
- **One permission guard per page.** Each page wraps its content in `<RequirePermission permission="…">`
  from `src/components/Guard.tsx`. It shows a spinner while the session loads and a "no access" card when the
  user lacks the permission.
- **Global search.** `GlobalSearch` in the top bar (and Ctrl+K / ⌘K anywhere) finds patients (`view_patients`)
  by name, phone, second phone or ID, and lists quick actions filtered by permission. Add new everyday
  actions to `ACTIONS` in `GlobalSearch.tsx`. The top bar must not get `backdrop-blur` or a `transform`:
  either makes `position: fixed` overlays inside it (search, bell, profile menu) cover only the bar.
- **One data seam.** No page calls `fetch` or axios itself. That is why switching to dummy data is a
  one-line change. Keep it that way.

---

## Directory map

```
src/
├── app/
│   ├── layout.tsx                 root layout: font, metadata, providers, MainLayout
│   ├── page.tsx                   redirect("/dashboard")
│   ├── not-found.tsx              404 page
│   ├── globals.css                Tailwind import, body colours, print background
│   ├── _login/page.tsx            login form; private folder, so it is NOT routed (see Auth)
│   ├── dashboard/page.tsx
│   ├── today/page.tsx             the front desk's day
│   ├── patients/      page · new · [id] · [id]/edit
│   ├── appointments/  page · new · [id] · [id]/edit
│   ├── treatments/    page · new · [id] · [id]/edit
│   ├── payments/      page · new · [id] · [id]/edit
│   ├── reports/page.tsx
│   ├── doctors/page.tsx           doctors list with add/edit dialog
│   ├── users/         page · [id]
│   ├── whatsapp/page.tsx
│   ├── settings/page.tsx
│   └── profile/page.tsx
├── components/
│   ├── MainLayout.tsx        shell + the login guard
│   ├── Sidebar.tsx           nav in three groups (CLINIC, FINANCE, SYSTEM), hidden items by permission, user card
│   ├── Topbar.tsx            mobile menu button, global search, bell, settings, profile dropdown, logout
│   ├── GlobalSearch.tsx      search button and Ctrl+K / ⌘K palette: patients by name, phone or ID, and quick actions
│   ├── NotificationBell.tsx  today's Scheduled/Confirmed appointments
│   ├── AppointmentCalendar.tsx  the day and week time grid on /appointments
│   ├── Guard.tsx             RequirePermission
│   ├── DentalChart.tsx       the odontogram (adult and child teeth, surfaces, conditions), saved to Patient.dental_chart
│   ├── UnsavedChangesGuard.tsx  asks before leaving a form with unsaved changes
│   ├── SessionEndedNotice.tsx  "Log in again" dialog (and banner) when the server ended the login; the page stays
│   ├── SendWhatsAppDialog.tsx a WhatsApp message by hand from a template (opens wa.me)
│   ├── FinishVisitDialog.tsx "What was done in this visit?" after an appointment is marked Completed
│   ├── PatientFiles.tsx      X-rays and photos attached to a patient
│   ├── LabWorkCard.tsx       lab work of a treatment plan; labState() and LAB_BADGES
│   ├── ClinicLetterhead.tsx  the clinic header on printouts (receipt, estimate)
│   ├── ToothLogo.tsx         the app logo (inline SVG)
│   ├── MedicalAlerts.tsx     the red/yellow medical alerts band (show it wherever treatment is decided)
│   ├── forms/                PatientForm, AppointmentForm, TreatmentForm, PaymentForm (shared by new and edit)
│   └── ui/
│       ├── index.tsx         the UI kit (cards, buttons, inputs, tables, badges, paging, tabs, alerts, …)
│       ├── Modal.tsx         Modal, ConfirmDialog
│       └── LinkSelect.tsx    searchable picker for Link fields (used for patients)
├── context/
│   ├── AuthContext.tsx       who is logged in, the AUTH_DISABLED switch, useAuth()
│   ├── SettingsContext.tsx   Clinic Settings (currency, clinic name, feature switches), useSettings()
│   ├── SessionContext.tsx    the user's profile, roles and permission flags, useSession()
│   └── ToastContext.tsx      small corner messages, useToast()
└── lib/
    ├── frappe.ts             data access (real or mock), login/logout, CSRF, errorMessage()
    ├── mockData.ts           the in-memory dummy back end
    ├── types.ts              doctype interfaces, allowed values, permission keys, role presets
    ├── hooks.ts              usePagedList, useDocument, useDoctors, useDebounced, searchFilters
    ├── format.ts             money, dates, times, week helpers, cx(), CSV download
    ├── dentalChart.ts        parseDentalChart (both shapes), cleanChart, tooth names, surface layout, labels
    ├── medical.ts            medicalFlags(): allergy, blood thinner, diabetes, heart, pregnancy from the medical text
    ├── whatsapp.ts           PLACEHOLDERS, fillTemplate(), whatsappNumber(), whatsappLink() (wa.me links)
    ├── phone.ts              toLatinDigits(), dialableNumber() (0770… → 964770…), samePhone(), phoneSearchPattern()
    ├── recall.ts             dueForRecall(), monthsBefore(), the recall periods
    ├── theme.ts              the clinic colour: presets, contrast fix, applyThemeColor, the boot script
    └── links.ts              URL builders for records (always use these)
docs/
├── backend-todo.md           what the back end must provide for this front end
└── screenshots/              images used by README.md (retake with npm run screenshots:readme)
public/                       placeholder SVGs from create-next-app (unused)
e2e/
├── helpers.ts                waitForData, navigate (client-side, keeps the dummy data), openFromMenu, pickLink
├── tests/                    the Playwright tests (npm run test:e2e)
└── screens/                  the screenshot script (npm run screenshots)
IMPROVEMENTS.md               the improvement backlog and log, written for the clinic owner
```

**Writing browser tests.** Import `test` and `expect` from `e2e/fixtures.ts`, not `@playwright/test`: it fixes the
browser clock at 26 Sep 2026 08:30 (`FIXED_NOW`, a Saturday; the dummy clinic is closed on Fridays), so the
results do not depend on the day the tests run. `today()` in `e2e/helpers.ts` returns that date. The dummy data lives in browser memory and a full page load resets it, so a
test calls `page.goto` once and then moves by clicking links, or with `navigate(page, path)` from
`e2e/helpers.ts`, which calls the app's own router. Select by role and label (`getByRole`, `getByLabel`);
add a `data-testid` only for values with no label, such as the plan's Paid and Remaining amounts. Next adds
an empty `role="alert"` route announcer, so filter alerts by text. After pressing Save, wait for the next page
(`toHaveURL` and its heading) before clicking anything else: text such as the patient's name is often already
on the form, and a click made while the save is still running is overridden by the form's own navigation.

---

## Routes

| Route | Permission | What it does |
|---|---|---|
| `/` | none | Server redirect to `/dashboard` |
| `/dashboard` | none (cards appear per permission) | Greeting; counts for today's appointments, patients, active plans; revenue this month and amount owed; today's list and the next 7 days; quick actions; a **Needs attention** card (hidden when empty) with past appointments still open, tomorrow's reminders not yet opened, patients due for recall (`dueForRecall` in `src/lib/recall.ts`, 6 months) and patients who owe money, each linking to where it is handled |
| `/today` | `view_appointments` | The front desk board: counts (still to come, late, completed, no show), today's appointments grouped by doctor with one-tap **Confirm**, **Completed**, **No show** and **Undo** (`edit_appointments`), late patients (still open `LATE_AFTER` = 10 minutes after the start) highlighted, a red chip for high medical alerts, what the patient owes (`view_payments`), **Add Payment** (`add_payments`), **Walk-in** (books now, rounded up to the quarter hour) and Refresh. **Tomorrow's reminders** (when `enable_whatsapp` is on) lists tomorrow's booked patients with **Send reminder**, which opens `wa.me` with the active "24 Hours Before" template (or the first active one) filled in; opened reminders are remembered on that computer (`localStorage.reminders_opened`). **Lab work due** lists plans sent to a lab and not back that are late or due within two days (`view_treatments`). Below, **Earlier, still open** lists up to 50 past appointments still Scheduled or Confirmed, with Completed / No show / Cancelled buttons; resolved ones drop off. The dashboard and the bell link here |
| `/patients` | `view_patients` | Server-side search (name, phone, second phone, ID), gender filter, paging. Each row: name with ID, age and gender, medical-alert chips (`medicalFlags`), phone, next booked visit (`view_appointments`, loaded for the rows on the page) and balance (`view_payments`). With `view_payments`, a **Balance** filter ("Owes money": `total_remaining > 0`, biggest first; `?balance=owing` opens on it) adds a WhatsApp **Remind** link with the balance written in |
| `/recall` | `view_patients` and `view_appointments` | Patients due for a check-up: no Completed visit within the chosen period (3, 6, 9 or 12 months; default 6) and nothing Scheduled or Confirmed from today on; never-seen patients last. Tap to call, a WhatsApp link with a ready reminder text (`wa.me/<digits>?text=`), and Book (`add_appointments`). Worked out in the browser from all appointments |
| `/patients/new` | `add_patients` | Shared `PatientForm`. While typing, patients with the same phone number (`samePhone()` from `src/lib/phone.ts`: the last 10 digits of either phone field, so `0770 123 4567` and `+964 770 123 4567` match) or exactly the same name show under **Already registered?** with a link; saving with the same phone number asks first (also on edit when the phone changes; `currentName` excludes the patient itself). The Medical Information card starts with a **Quick checklist** (`CHECKLIST` in `PatientForm.tsx`): tick boxes that add or remove a standard word in `allergies`, `current_medications` or `chronic_diseases` (no new fields); a box already true from other wording (e.g. "Warfarin 3mg") shows ticked and disabled. **Only know the age?** swaps the date of birth for an **Age** box (for patients who do not know their birth date); `age` is sent only when `date_of_birth` is empty. Opens the new record after saving |
| `/patients/[id]` | `view_patients` | `MedicalAlerts` band; a summary card with tap-to-call (`tel:`) and WhatsApp (`https://wa.me/<digits>`) buttons, last visit, next appointment, balance to pay (with Add payment) and paid so far; tabs: **Overview** (a timeline of appointments, treatment sessions and payments, grouped Upcoming / Today / by month, beside the contact and medical cards), Appointments, Treatment Plans, Payments, Dental Chart, **X-rays & Photos** (`PatientFiles`: private File records attached to the patient; Take Photo opens the camera on tablets, Add Files takes images and PDFs up to 10 MB; a viewer with Open in a new tab and Delete; adding and deleting need `edit_patients`). Buttons: New Appointment, New Treatment, Edit, Delete (icon; each by permission) |
| `/patients/[id]/edit` | `edit_patients` | Shared `PatientForm` |
| `/patients/[id]/estimate` | `view_patients` and `view_treatments` | Printable treatment estimate on the clinic letterhead: the patient's Planned and In Progress plans with cost, paid and to pay, totals, a 30-day validity note (`VALID_DAYS`) and signature lines. Linked as **Print estimate** above the Treatment Plans tab |
| `/patients/[id]/statement` | `view_patients` and `view_payments` | Printable statement: every plan that is not Cancelled (cost, paid, left), every payment, total for treatments, total paid and the balance (`total_remaining`). Linked as **Print statement** above the Payments tab |
| `/patients/[id]/chart` | `view_patients` | Printable dental chart: letterhead, patient, `MedicalAlerts`, the chart read-only (Adult/Child switch and hints hidden on paper) and its Findings. Linked as **Print** in the chart header |
| `/appointments` | `view_appointments` | Three views, chosen with `?view=day\|week\|list` (default `day`, or `list` when `?date=` is given). **Day**: one column per active doctor, rows from Clinic Settings opening to closing time (stretched to fit), blocks as long as the appointment and coloured by status, overlapping ones side by side, a red "now" line, and striped shading outside each doctor's `start_time`–`end_time`, which are also shown under the name (and in the week view when one doctor is chosen); `?day=YYYY-MM-DD` and `?doctor=` pick the day and one doctor. On phones (`useMediaQuery("(max-width: 639px)")`) the day view shows one doctor at a time with Previous / Next doctor buttons, starting with the first doctor who has patients. **Week**: one column per day (the week starts on `WEEK_STARTS_ON` in `format.ts`, Sunday). Clicking an empty 15-minute slot opens `/appointments/new` with date, time and doctor filled in (needs `add_appointments`). With `edit_appointments`, a Scheduled or Confirmed block can be dragged (mouse, pen or touch; pointer events, `touch-none` on the block) to another time, doctor column or day; a dashed preview snaps to 15 minutes, dropping asks "Move this appointment?" (with the same overlap check, then "Move anyway") and saves `appointment_date`, `appointment_time` and `doctor`. A click without moving still opens the appointment. **List**: search, date filter (All/Today/Tomorrow/Upcoming/Past, also `?date=today`), status filter, paging. The grid is `src/components/AppointmentCalendar.tsx` |
| `/appointments/new` | `add_appointments` | Shared `AppointmentForm`. Reads `?patient=`, `?date=`, `?time=HH:MM`, `?doctor=` and `?reason=`; Back returns to that day in the calendar. Once a doctor and date are chosen, the form shows that doctor's bookings for the day and up to 8 free times that fit the chosen length (within the doctor's own working hours when set, otherwise the clinic hours, and from now for today; tap one to fill in the time) and says when the typed time overlaps. With no `?doctor=`, it starts with the doctor of the last booking made on this computer (`localStorage.last_doctor`). Warns if the doctor already has an overlapping appointment (always checked for a new booking) |
| `/appointments/[id]` | `view_appointments` | `MedicalAlerts` for the patient, details (with **Print Card**), status buttons, Edit and an icon Delete (`edit_appointments`), and WhatsApp messages for this appointment with **Send Message** (`SendWhatsAppDialog`: pick an active template, placeholders filled, text editable, opens `wa.me` with it; shown when Clinic Settings `enable_whatsapp` is on and the patient has a phone). Completed opens `FinishVisitDialog` |
| `/appointments/[id]/edit` | `edit_appointments` | Shared `AppointmentForm` with status |
| `/appointments/[id]/card` | `view_appointments` | Printable appointment card for the patient (date, time, doctor, visit, the clinic phone and address). **Print Card** on the appointment page |
| `/treatments` | `view_treatments` | Search, type and status filters, paging |
| `/treatments/new` | `add_treatments` | Shared `TreatmentForm`. Reads `?patient=` and `?tooth=`. New plans are always `Planned`. Choosing a treatment type fills in its price-list price unless a different cost was typed |
| `/treatments/[id]` | `view_treatments` | `MedicalAlerts` for the patient, cost/paid/remaining with a progress bar, details, status buttons, payments of the plan, **Treatment Sessions** (add, edit, delete in a dialog; **Book Visit** opens the booking form with the patient, the plan's doctor and the reason filled in, for Planned and In Progress plans), and the patient's **dental chart** read-only, opened at the plan's tooth (`initialTooth`), loaded with `usePatientChart()`; a **Lab Work** card (`LabWorkCard`, for `LAB_TREATMENT_TYPES` or when something was sent): lab, sent, due back, received, with Send to lab / Edit and one-tap Received today (`edit_treatments`) |
| `/treatments/[id]/edit` | `edit_treatments` | Shared `TreatmentForm` with status |
| `/payments` | `view_payments` | Search, method filter, date range, paging, total of everything that matches |
| `/payments/new` | `add_payments` | Shared `PaymentForm`. Reads `?patient=&treatment=`. A new payment for a patient with exactly one plan with a balance picks that plan; **Pay full balance** fills the amount. Blocks amounts above what the plan has left |
| `/payments/day` | `view_payments` | End-of-day report for `?date=` (default today): totals per payment method and overall, every payment of the day, the cash that should be in the drawer, and Counted by / Checked by lines. Linked from Payments and the Today board |
| `/payments/[id]` | `view_payments` | Printable receipt with clinic details; Edit/Delete (`add_payments`); **WhatsApp** opens `wa.me` with a short receipt (amount, date, treatment, receipt number and method, and what the patient still has to pay) when `enable_whatsapp` is on |
| `/payments/[id]/edit` | `add_payments` | Shared `PaymentForm` |
| `/reports` | `view_reports`, and Clinic Settings `enable_financial_reports` | Period picker; revenue, count, average, outstanding; revenue by treatment, method and month; latest payments; outstanding balances; CSV export of both; revenue by **doctor** (through each payment's treatment plan; payments without a plan are "General payments") and **Appointments** outcomes up to today (completed, no show, cancelled, still open) with the no-show rate, no-shows out of completed plus no-shows, shown red at 15% or more |
| `/doctors` | `manage_users` | Doctor list (search, Active / Not active filter, paging); Add Doctor and Edit in a dialog: name, specialization (`DOCTOR_SPECIALIZATIONS`), phone, email, working hours (`start_time`, `end_time`; both or neither, end after start) and Active. No delete: switch Active off |
| `/users` | `manage_users` | Staff list (without Administrator and Guest), search, status filter, Add User dialog (can apply the role's usual permissions) |
| `/users/[id]` | `manage_users` | Clinic role, enable/disable, the 14 permission switches with presets. `[id]` is `encodeURIComponent(btoa(user.name))` |
| `/whatsapp` | `manage_users` | Templates (add, edit, delete, placeholders, live preview) and the message log |
| `/settings` | `manage_users` | Clinic Settings: name, logo upload, contact, tax number, currency, working hours, feature switches, theme colour, **Phone Country Code** (`phone_country_code`, digits only, empty means 964; added to local numbers in WhatsApp links, `useSettings().countryCode`), **Price List** (a usual price per treatment type, saved in `treatment_prices`), and **Open on** day toggles saved as `working_days` (`useSettings().isOpenOn(iso)`; nothing set means open every day). Closed days are shaded "Closed" in the calendar, the day view shows a notice, and booking on one shows a note and asks "Book anyway?" |
| `/profile` | none | My details, what I can do, change password, and (login off only) Try Another User |

Links use `<Link>` from `next/link`; buttons that navigate after an action use `router.push`. Table rows are
clickable through `ClickableRow`, and the first cell always holds a real link for keyboard users.

---

## Data layer: `src/lib/frappe.ts`

| Function | Real back end (through the rewrite) | Mock |
|---|---|---|
| `getList(doctype, fields, { filters, orFilters, orderBy, limit, start })` | `GET /frappe/api/resource/<Doctype>` with `fields`, `filters`, `or_filters`, `order_by`, `limit_start`, `limit_page_length` | `mockGetList` |
| `getCount(doctype, filters?, orFilters?)` | `frappe.client.get_count`, or `frappe.desk.reportview.get_count` when there are `orFilters` | `mockGetCount` |
| `getDoc(doctype, name)` | `GET /frappe/api/resource/<Doctype>/<name>` | `mockGetDoc` |
| `createDoc(doctype, data)` | `POST /frappe/api/resource/<Doctype>` | `mockCreateDoc` |
| `updateDoc(doctype, name, data)` | `PUT /frappe/api/resource/<Doctype>/<name>` | `mockUpdateDoc` |
| `deleteDoc(doctype, name)` | `DELETE /frappe/api/resource/<Doctype>/<name>` | `mockDeleteDoc` |
| `callMethod(method, args)` | `POST /frappe/api/method/<method>`, returns `message` | `mockCall` (knows `update_password` only) |
| `changePassword(old, new)` | `frappe.core.doctype.user.user.update_password` | via `mockCall` |
| `uploadFile(file)` | multipart `POST /frappe/api/method/upload_file`, returns `file_url` | a data URL |
| `attachFile(file, doctype, name)` | the same with `doctype`, `docname`, `is_private=1`: a private File attached to the doc; returns the File record | a `File` doc holding a data URL |
| `fileHref(url)` | turns a Frappe file path (`/files/…`, `/private/files/…`) into `/frappe/…` so it goes through the rewrite; use it for every `<img src>` or link to an uploaded file | data URLs unchanged |
| `login(usr, pwd)` / `logout()` / `initAuth()` | login posts to `/api/method/login` (saving an `x-frappe-csrf-token` response header to `localStorage.csrf_token` if there is one), then asks `getLoggedUser()` and **returns Frappe's user ID**. If Frappe still sees a guest (the check is refused or answers Guest: the browser did not keep the cookie) it throws `LOGIN_NOT_KEPT_MESSAGE`; any other failure of the check (timeout, server down) is thrown as it is; a two-factor answer (`verification` / `tmp_id`) throws `TWO_FACTOR_MESSAGE`, and an expired password (`message: "Password Reset"`) throws `PASSWORD_RESET_MESSAGE` | not mocked |
| `getLoggedUser()` | `frappe.auth.get_logged_user`; the user ID, or `null` for Guest | not mocked |
| `onSessionEnded(listener)` / `onSessionRestored(listener)` / `SessionEndedError` | Frappe answers an expired login with **403 (user Guest), not 401**. On any 401/403 (except the login calls) the axios interceptor asks `getLoggedUser()` once for the whole burst; if it is Guest, every failed call rejects with `SessionEndedError` ("Your session has ended. Please log in again.") and the listeners run once. The first request that works again after that runs the `onSessionRestored` listeners once (for example after logging in in another tab). A real "no permission" stays a 403 | not reached |
| `withReadRetry(read)` / `isRetriableReadError(err)` / `isServerDown(err)` | `getList`, `getCount` and `getDoc` are sent again up to twice (after 0.5 s and 1 s) when **no answer** came back, or the Frappe server was down (the rewrite then answers 502/503/504, or 500 with a plain page instead of Frappe's JSON). Refusals, timeouts and ended logins are never retried, and saves are never retried | not reached |
| `errorMessage(err, fallback)` | turns a failed call into a readable sentence: Frappe `_server_messages` or `exception` without HTML; `Duplicate entry '…'` and `Data too long for column '…'` as plain sentences; 403; a **timeout** (every request has `REQUEST_TIMEOUT_MS` = 15 s, uploads 120 s, `getList` with `limit: 0` 60 s: a read says "try again", a save says it may still have been saved); the server down; no connection | uses the mock's `Error` text |
| `isNotFound(err)` | true for HTTP 404 or the mock's "… not found" | |

Doctype and doc names are URL-encoded. The axios instance sets `withCredentials: true`.

Rules for data code:

- **Always use these helpers**, or the hooks below. Never add `fetch` or axios calls to pages or components.
- **Doctype names are exact strings with spaces:** `"Patient"`, `"Doctor"`, `"Appointment"`,
  `"Treatment Plan"`, `"Treatment Session"`, `"Payment"`, `"User"`, `"Clinic Permission"`,
  `"Clinic Settings"` (a single; its doc name is also `"Clinic Settings"`), `"WhatsApp Template"`,
  `"WhatsApp Log"`.
- **`getList` returns only the fields you ask for**, in both Frappe and the mock. If you render a field, put
  it in `fields`. `name` always comes back.
- **Show names, not IDs.** Link fields hold IDs (`PAT-2026-00001`). Read the fetched label fields instead:
  `patient_name`, `doctor_name`, and `treatment_type` on Payment. Fall back to the ID only if the label is
  empty.
- **Limits.** `limit` defaults to 100; `limit: 0` means every row. Lists use `usePagedList` (20 per page, with
  a real count). Dashboard and report totals load the matching rows with `limit: 0` and add them up in the
  browser; see Known issues.
- **Filters** use Frappe's formats: `[[field, operator, value], …]` or `{ field: value }`. Search boxes use
  `orFilters` built by `searchFilters(text, fields)` (the global search and `LinkSelect` too). It searches
  Arabic-keyboard digits as 0-9, and when the text looks like a phone number (7 or more digits, no letters)
  every field with `phone` in its name also gets `phoneSearchPattern()`: the last 9 digits with `%` between
  them, so `+964 770 123 4567` finds a number stored as `0770 123 4567` or `07701234567`.
- **Phone numbers** are stored as typed, except that the patient and doctor forms turn Arabic-keyboard digits
  into 0-9 (`toLatinDigits()`). Build WhatsApp links only with `whatsappLink(phone, text,
  countryCode)` / `whatsappNumber()` from `src/lib/whatsapp.ts`, passing `useSettings().countryCode`: a
  local number's leading 0 becomes the country code (`0770 123 4567` → `wa.me/9647701234567`), `+` and `00`
  numbers keep their own, and 11 digits or more count as already international. Compare two numbers with
  `samePhone()`, never by hand.
- **Send `null`, not `""`, for empty Date, Time and Link fields.** The form payload helpers already do this.

### Hooks: `src/lib/hooks.ts`

| Hook | Use |
|---|---|
| `usePagedList<T>(doctype, { fields, filters, orFilters, orderBy, pageSize })` | A page of rows plus the total. Changing the query goes back to page 1. Returns `rows, total, page, setPage, pageSize, initialLoading, loading, error, reload` |
| `useDocument<T>(doctype, name)` | One doc. `reload()` fetches again but keeps the old copy on screen meanwhile. `notFound` is true when the load failed; `error` is empty for a real 404 and holds the reason otherwise (for example no permission) |
| `useDoctors()` | Active doctors (`is_active = 1`) for dropdowns |
| `usePatientChart(patient)` | The patient's `dental_chart` and `age`, for the chart on a treatment plan |
| `usePatientMedical(patient)` | The patient's medical fields (`MEDICAL_FIELDS`) for `MedicalAlerts` on another record's page |
| `useDoctorList()` | The same, as `{ doctors, loading }`, for screens that would look empty while doctors load (the calendar) |
| `useDebounced(value, ms)` | Waits until typing stops |
| `useMediaQuery(query)` | True while a media query matches (false on the server); e.g. phone-only layouts |

### Getting requests to the real back end

`next.config.ts` rewrites `/frappe/:path*` to `FRAPPE_URL`. The old hand-written proxy
`src/app/api/frappe/[...path]/route.ts` is deleted. See `docs/backend-todo.md` for the CSRF question.
The rewrite's own time limit is `experimental.proxyTimeout` = 130 s (Next's default is 30 s), a little longer
than the app's longest wait (uploads, 120 s), so the app's timeout message is the one people see. Keep it above
the timeouts in `src/lib/frappe.ts`.

---

## Mock back end: `src/lib/mockData.ts`

An in-memory store that returns data in the same shape as Frappe's REST API, so pages behave the same with
either source.

- **Seed data:** 12 patients (two, Rania Fawzy and Sherif Adel, last seen more than six months ago for the recall list; Sherif Adel's phone is the Iraqi local `0770 123 4567` and Bassel Ramy's `07801112233`, the rest are `+20` numbers), 5 doctors, 24 appointments (December 2025 to September 2026, all five statuses; three of
  them are dated today and tomorrow when the app loads), 15 treatment plans (all four statuses), 10
  treatment sessions, 15 payments (two dated today), 9 users (including `Administrator`, `Guest` and one
  disabled doctor), 3 `Clinic Permission` records (the manager has every permission; the receptionist and
  one doctor have some), the `Clinic Settings` single (currency `USD`), 3 WhatsApp templates and 7 WhatsApp
  log entries.
- **IDs match the real naming series:** `PAT-2026-00001`, `DOC-00001`, `APT-2026-00001`,
  `TRT-2026-00001`, `SES-2026-00001`, `PAY-2026-00001`, `WAT-00001`, `WAL-2026-00001`. New docs get the next
  number with the current year. Users are named by `email`, Clinic Permissions by `user` (a duplicate gets
  `" 2"`, `" 3"` …).
- **Fields the server computes or fetches are rebuilt after every write** by `recalculate()`:
  - `patient_name` on Appointment, Treatment Plan, Treatment Session, Payment and WhatsApp Log;
    `doctor_name` on Appointment, Treatment Plan and Treatment Session; `treatment_type` on Payment.
  - Treatment Plan: `paid_amount` is the sum of its payments. `remaining_amount` is
    `max(0, total_cost − paid_amount)`, or `0` if the plan is `Cancelled`.
  - Patient: `total_treatments`, `total_appointments`, `total_paid`, `total_remaining`.
- **Validation like the back end:** a payment must be above zero and cannot take a plan's paid amount above
  its total cost; a plan's total cost cannot go below what was already paid. A doc that other docs link to
  cannot be deleted ("Cannot delete Patient … because it is linked with …").
- **On create and update:** number fields (`total_cost`, `amount`, `duration_minutes`, `age`, `enabled`,
  `is_active`) become numbers. A Patient gets `age` from `date_of_birth` (a typed `age` is kept when there is no date), and `dental_chart` is stored as
  sent (a JSON string is parsed), like a Frappe JSON field. The seed has both chart shapes on purpose:
  Nadia, Tarek, Hossam and Amir use version 2; Karim, Salma and Bassel the first shape. A User gets `full_name`, `enabled: 1`, and its `new_password` is not stored.
- **Queries:** operators `=`, `!=`, `in`, `not in`, `like`, `not like` (real SQL LIKE: `%` is any text, `_` one
  character, not case sensitive, and Arabic digits equal 0-9, as in MariaDB's `utf8mb4_unicode_ci`), `is` (`set`/`not set`), `between`,
  `>`, `<`, `>=`, `<=` (numbers compare as numbers, everything else as strings, which works for ISO dates).
  `orFilters`, multi-field `orderBy` (`"appointment_date desc, appointment_time desc"`), `limit`, `start`.
  An unknown operator matches every doc. Empty `fields` or `"*"` returns whole docs.
- **Errors:** `getDoc`, `updateDoc` and `deleteDoc` throw `"<Doctype> <name> not found"` for a missing doc.
  An unknown doctype is not an error: it quietly gets an empty collection.
- **Latency:** every call waits 150 ms so loading states show up.
- **Persistence:** module memory in the browser. Writes survive client-side navigation and are lost on a full
  reload.

**Keep the mock in step with the UI.** When a screen starts reading a new field or doctype, add it to the
seed data. If the back end computes or fetches that field, do it in `recalculate()` too.

How the mock still differs from the real back end:

| | Mock | Real Frappe |
|---|---|---|
| `Patient.dental_chart` and the `*_name` fetch fields | present | must be added (see `docs/backend-todo.md`) |
| Sessions and permissions | none; any call succeeds | cookie session and CSRF token; the server enforces permissions |
| Uploads | data URLs | files under `/files/…` |
| `update_password` | always succeeds | checks the old password |

---

## Domain model

Field names are Frappe fieldnames. Form state keys must match them exactly. Fields marked † come from
`README.md` only and must be confirmed in the back-end repo; see `docs/backend-todo.md`.

| Doctype | Fields the UI edits | Read-only (server) |
|---|---|---|
| **Patient** | `full_name`\*, `gender`, `date_of_birth`, `phone_number`\*, `secondary_phone`, `email`, `address`, `allergies`, `current_medications`, `chronic_diseases`, `medical_history`, `notes`, `dental_chart` (JSON, from the chart), `age` (only when there is no date of birth) | `age` when there is a date of birth, `total_appointments`, `total_treatments`, `total_paid`, `total_remaining` |
| **Doctor** | `full_name`*, `specialization`, `phone_number`, `email`, `start_time`, `end_time` †, `is_active` (on `/doctors`) | |
| **Appointment** | `patient`\*, `doctor`\*, `appointment_date`\*, `appointment_time`\*, `duration_minutes`, `status`, `reason_for_visit`, `notes` | `patient_name`, `doctor_name` |
| **Treatment Plan** | `lab_name`, `lab_sent_date`, `lab_due_date`, `lab_received_date` † (Lab Work card), `patient`\*, `doctor`, `treatment_type`\*, `tooth_number` (FDI number from a dropdown), `total_cost`\*, `diagnosis`, `treatment_notes`, `status` (edit only; new plans are `Planned`) | `paid_amount`, `remaining_amount`, `patient_name`, `doctor_name` |
| **Treatment Session** † | `patient`, `treatment_plan`, `doctor`, `session_date`\*, `session_time`, `status`, `notes` | `patient_name`, `doctor_name` |
| **Payment** | `patient`\*, `treatment_plan`, `payment_date`\*, `amount`\*, `payment_method`\*, `notes` | `patient_name`, `treatment_type` |
| **User** (Frappe core) | `email`, `first_name`, `enabled`, `new_password` (create only), `send_welcome_email: 0`, `roles: [{ role }]` | `full_name` |
| **Clinic Permission** | `user` plus 14 flags set to `0` or `1` | |
| **Clinic Settings** † (single) | `clinic_name`, `logo`, `phone`, `email`, `address`, `tax_number`, `currency`, `opening_time`, `closing_time`, `theme_color`, `enable_whatsapp`, `enable_patient_portal`, `enable_financial_reports`, `treatment_prices` † (child table rows `{ treatment_type, price }`; `useSettings().prices` is the lookup), `phone_country_code` † | |
| **WhatsApp Template** † | `template_name`, `trigger`, `message`, `is_active` | |
| **WhatsApp Log** † | none (read: `patient`, `appointment`, `phone_number`, `status`, `sent_at`, `message`, `error_message`) | `patient_name` |

\* = required in the form.

Allowed values live in `src/lib/types.ts`. Keep form options, badge colours (`STATUS_TONES` in
`components/ui/index.tsx`) and mock data in line with them:

- Appointment `status`: `Scheduled`, `Confirmed`, `Completed`, `Cancelled`, `No Show`
- Treatment Plan `status`: `Planned`, `In Progress`, `Completed`, `Cancelled`
- Treatment Plan `treatment_type`: `Filling`, `Root Canal`, `Crown`, `Bridge`, `Extraction`, `Implant`, `Cleaning`, `Whitening`
- Treatment Session `status` †: `Scheduled`, `Completed`, `Cancelled`
- Payment `payment_method`: `Cash`, `Card`, `Bank Transfer`
- WhatsApp Template `trigger`: `24 Hours Before`, `2 Hours Before`, `Manual`; WhatsApp Log `status`: `Sent`, `Failed`, `Pending`
- Roles: `Clinic Manager`, `Clinic Doctor`, `Clinic Receptionist`, plus Frappe's own roles such as `System Manager`
- Template placeholders †: `{{ patient_name }}`, `{{ appointment_date }}`, `{{ appointment_time }}`, `{{ doctor_name }}`, `{{ clinic_name }}`

Money rules: the back end's `Treatment Plan.validate()` recomputes `remaining_amount`, rejects a paid amount
above `total_cost`, and re-saves the patient. The payment form also blocks an amount above what the plan has
left (plus the payment's own amount when editing). The front end does its own arithmetic only for the
dashboard and report totals.

---

## Auth: `src/context/AuthContext.tsx`

`useAuth()` returns `{ user, isLoading, authDisabled, sessionEnded, login, relogin, logout, switchUser? }`.
`user` is the Frappe user ID or `null`.

- The saved user ID lives in `localStorage.dental_user` and is read through `useSyncExternalStore`, so the
  server render and the first client render agree, and every tab stays in step. `isLoading` stays true until
  the browser has been read.
- **"Keep me logged in on this computer" off** (the login page's switch, for shared front-desk computers)
  also saves `localStorage.dental_session_only = 1` and a cookie `dental_open=1` with no expiry date, which the
  browser deletes when it closes. When the app starts and that cookie is gone, the saved user counts as logged
  out, and `AuthProvider` calls Frappe's logout to end the old server session (it stays valid on the server
  until then, or until it expires). A browser that restores its last session keeps the cookie.
- **With `AUTH_DISABLED = true` (as now):** `user` starts as `"Administrator"`, `isLoading` is `false`,
  `logout()` does nothing, logout buttons are hidden, and `switchUser(name)` lets `/profile` act as another
  user (memory only).
- **With `AUTH_DISABLED = false`:** `user` comes from `localStorage`. `login(usr, pwd, remember)` calls
  Frappe, saves the user ID Frappe returns and tells every listener. `logout()` calls Frappe and clears it.
- **Session ended:** when `onSessionEnded` fires, `sessionEnded` becomes true but the user is kept, so the
  open page and a half-filled form stay. `MainLayout` shows `SessionEndedNotice`: a "Log in again" dialog
  (password only, focused; `Modal` with `priority`, so it sits above any page dialog) that calls
  `relogin(pwd)`; closing it leaves a yellow banner to open it again; its Log out button ends the login and
  goes to the login page. `sessionEnded` clears on a login here, on a login in another tab (the
  `dental_login_at` storage key) and when requests work again (`onSessionRestored`).
- **`loginCount`** goes up on every login, here or in another tab. `SessionProvider` and `SettingsProvider`
  list it in their effect dependencies, so logging in again loads the roles, permissions and settings again
  (they may have failed while the session was over).
- **Guard:** `MainLayout` redirects to `/login` only when `isLoading` is false and there is no user, so a page
  refresh with a saved session never bounces to `/login`. The address is `loginHref(page, sessionEnded)`
  (`src/lib/links.ts`): `/login?next=<the page>&ended=1`. The login page shows "Your session has ended" for
  `ended=1`, and afterwards goes to `safeNextPath(next)`. That reads the path the way the browser will (so
  `//other.site`, a backslash, or a tab or line break inside cannot lead off the site) and falls back to
  `/dashboard`.

`useSession()` (`src/context/SessionContext.tsx`) loads the user's `User` doc and `Clinic Permission` doc and
returns `{ profile, roles, displayName, roleLabel, isSuperUser, doctor, can(flag), loading, refresh }`.
`doctor` is the active Doctor whose `email` equals the user's email (or null). When it is set, the dashboard,
the Today board (titled "My Day") and the bell show only that doctor's patients, with a **My patients /
Everyone** switch on the first two, and `/appointments` opens on that doctor's column (`?doctor=all` shows
everyone).

### Switching to the real back end and turning login on

1. Run the Frappe site (`README.md` → *Getting started* → *Back end*) and work through
   `docs/backend-todo.md`, especially the new fields and read permissions.
2. Set `FRAPPE_URL` if the site is not at `http://dent_clinic.localhost:8000`.
3. Set `MOCK_DATA = false` in `src/lib/frappe.ts`.
4. Set `AUTH_DISABLED = false` in `src/context/AuthContext.tsx`.
5. Run `git mv src/app/_login src/app/login`. A folder whose name starts with `_` is a Next.js private
   folder and is left out of routing.

---

## Permissions: `Clinic Permission`

Rules in `SessionContext`: `Administrator` and anyone with the `System Manager` role can do everything.
Everyone else gets the flags from the `Clinic Permission` doc named after their user ID (`=== 1` is on). No
doc means no section is open (the dashboard and profile still work).

| Group | Flags | What the UI does with them |
|---|---|---|
| Patients | `view_patients`, `add_patients`, `edit_patients`, `delete_patients` | menu item and pages; Add, Edit, Delete buttons; editing the dental chart needs `edit_patients` |
| Appointments | `view_appointments`, `add_appointments`, `edit_appointments` | menu, pages, bell; status buttons, Edit and Delete need `edit_appointments` |
| Treatments | `view_treatments`, `add_treatments`, `edit_treatments` | menu, pages; status, Edit, Delete and sessions need `edit_treatments` |
| Finance | `view_payments`, `add_payments`, `view_reports` | Payments menu and pages, balances and money cards; Add, Edit and Delete payments need `add_payments`; Reports needs `view_reports` |
| System | `manage_users` | Doctors, Users, WhatsApp and Settings pages and menu items, the settings icon |

**The UI only hides things.** The back end must refuse the data too. `/users/[id]` saves with `updateDoc`
when the doc exists and `createDoc` when it does not, and refreshes the session when you edit yourself.
`ROLE_PRESETS` in `types.ts` are only starting points for the switches.

User IDs are email addresses, so links use `userHref(name)` from `src/lib/links.ts`
(`encodeURIComponent(btoa(name))`), and `/users/[id]` reads it back with `userIdFromRoute()`.

---

## UI conventions

### Page shape

The default export only sets the permission; the real page is an inner component. Load data inside the
effect, with a `cancelled` flag, and set state only after `await`:

```tsx
"use client";
export default function ThingsPage() {
  return (
    <RequirePermission permission="view_things">
      <Things />
    </RequirePermission>
  );
}

function Things() {
  const list = usePagedList<Thing>("Thing", { fields: ["name", "field_a"], orderBy: "name desc" });
  // or for one doc:  const { doc, loading, notFound, error, reload } = useDocument<Thing>("Thing", id);
  // or by hand:
  const [items, setItems] = useState<Thing[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Thing>("Thing", ["name", "field_a"]);
        if (!cancelled) setItems(rows);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  // … PageContainer, PageHeader, Card, Table …
}
```

- A page that calls `useSearchParams()` must render that component inside `<Suspense>`, or the build fails.
- Hooks go before any early `return`. Route params come from `useParams()` and go through `routeId()`.
- To refetch after a change, bump a `version` state that the effect lists in its deps (or call `reload()`).
- **Forms** live in `src/components/forms/`, one per doctype, shared by the new and edit pages. Each exports
  `EMPTY_…` (or `empty…()`), `…ToForm(doc)` and `…Payload(form)`. The page passes `onSubmit`, which saves,
  shows a toast and navigates; the form shows `errorMessage(err)` if it throws.
- **Unsaved changes:** every form renders `<UnsavedChangesGuard when={dirty} />` (`src/components/`), where
  `dirty` compares the form with its starting values and turns false once saved. It asks before closing the
  tab and before following any in-app link; navigation in code (`router.push` after a save) is not stopped.
- **Loading:** lists show `<TableLoading colSpan={…} />` (skeleton rows with a hidden "Loading..." that
  screen readers and `waitForData()` use); single records show `PageLoading`.
- **Contrast:** readable text is `text-gray-500` or darker (4.8:1 on white). `text-gray-300`/`400` only for
  decoration and disabled things. Links and other focusable things get a primary focus ring from
  `globals.css`; `MainLayout` has a "Skip to content" link to `#main`.
- **Finishing a visit:** marking an appointment Completed (appointment page or Today board) opens
  `FinishVisitDialog` for users with `edit_treatments`: pick one of the patient's open plans, write what was
  done (saved as a Completed Treatment Session dated like the appointment), and optionally mark the plan
  Completed; a Planned plan moves to In Progress. With no open plan it offers New Treatment Plan. Skip is
  always there.
- **Detail page headers** hold at most three actions: the main one (Edit), one or two secondary ones, and
  Delete as an icon button with an `aria-label`. Actions about one part of the page go in that card's header.
- **Messages:** `useToast().success/error/info`. They appear bottom-right, and under the top bar on phones. Never use `alert()`. Ask before deleting with
  `ConfirmDialog`.
- **Medical safety:** every screen where treatment is decided or done shows `<MedicalAlerts patient={…} />`
  near the top (patient, appointment and treatment plan pages, and under the Patient field of the booking
  and treatment forms once a patient is picked). Load the fields with
  `usePatientMedical()` or add `MEDICAL_FIELDS` to your query. Never hide it behind a tab.
- **Money** always goes through `useSettings().money(amount)`, which uses the clinic currency. Dates and
  times go through `formatDate`, `formatTime`, `formatDateTime`; today is `todayISO()` (local time).
- **Links** to records use `patientHref`, `appointmentHref`, `treatmentHref`, `paymentHref`, `userHref`.

### The UI kit (`src/components/ui`)

`PageContainer` (`narrow` for forms), `PageHeader` (title, subtitle, back link, actions, badge), `Card`
(`flush` for tables), `StatCard`, `Badge`, `StatusBadge` (kinds: appointment, treatment, session, method,
whatsapp, trigger, user) and `statusTone(kind, status)` for other views that must match the badge colours,
`Button` and `LinkButton` (primary, secondary, danger, ghost, success; sm, md; `icon`, `loading`),
`Segmented` (joined view switch, e.g. Day / Week / List), `FormActions` (sticky Save / Cancel bar), `Field` (label wrapping one input), `TextInput`,
`SelectInput`, `TextArea`, `Toggle`,
`SearchInput`, `Toolbar`, `Table`, `Th`, `Td` (with `label` for the phone cards), `ClickableRow`, `TableLoading`, `TableMessage`, `Pagination`, `DetailList` and
`DetailRow`, `Tabs`, `Alert`, `Spinner`, `PageLoading`, `EmptyState`, `NoAccess`, `NotFoundCard`; plus
`Modal` (moves focus in, traps Tab, restores focus on close, Escape closes, locks page scroll; with two open, only
the newest reacts to Escape and Tab; `priority` puts it above other dialogs) and `ConfirmDialog` (focus starts on Cancel) in `Modal.tsx`, and `LinkSelect` for searchable Link fields. Use these instead of
writing new class lists.

### Styling

- One visual style everywhere: white cards with `border-gray-100 shadow-sm rounded-2xl` on a `gray-50` page,
  `rounded-xl` inputs and buttons, the `primary-*` colour, lucide icons. No emoji titles.
- **Colour: use `primary-50` … `primary-900` for anything that is "the clinic colour"** (buttons, links, active
  menu items, focus rings, highlights). Never write `blue-*` for that. The palette is mixed from one CSS variable,
  `--brand`, which `SettingsContext` sets from Clinic Settings `theme_color` through `applyThemeColor()`
  (`src/lib/theme.ts`). A colour too light for white text is darkened to 4.5:1 contrast. The default is teal
  `#0e7c86`. A script in `layout.tsx` applies the last colour before the first paint. `blue` stays only as a
  status tone (see Badge colours). The `Tone` type also has `primary`; `StatCard` uses it by default.
- **Text sizes:** `--text-xs` is 13 px and `--text-sm` is 15 px (a little larger than Tailwind's default, for
  reading at a distance). Page titles `text-2xl font-bold`, card titles `text-base font-semibold`, body
  `text-sm`, hints and table headers `text-xs`. Do not add other sizes for ordinary text.
- **Touch targets are at least 44 px.** `Button` md, inputs, tabs and menu links have `min-h-11`; small
  buttons and icon buttons grow to 44 px on touch screens with the `pointer-coarse:` variant. Do the same for
  any new clickable thing.
- **Phones:** below the `sm` breakpoint every `Table` turns its rows into cards. Give each `Td` except the
  first (the row's name or date) and action cells `label="…"` with the same text as its `Th`; empty cells
  are hidden. End every form with `<FormActions>` (a Save / Cancel bar that sticks to the bottom of the
  screen). Inputs use 16 px text on phones so iPhones do not zoom in.
- Empty lists: `<TableMessage icon={SomeIcon}>` or `<EmptyState>` show a small drawing; keep the text short.
- Tailwind utility classes go inline; `globals.css` only holds the import, the tokens and body colours.
- **Use logical classes** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`,
  `border-e`) instead of left/right, so a right-to-left (Arabic) layout can be added later. Arrow icons that
  point sideways carry `rtl:rotate-180`.
- Add `print:hidden` to anything that should not appear on paper. Printouts (receipt, estimate, statement,
  day report) put `ClinicLetterhead` at the top of a `Card` with `print:shadow-none print:border-0`, and
  give tinted boxes `print:bg-white print:border` so they survive printers that drop backgrounds.
- Badge colours: Appointments Scheduled blue, Confirmed green, Completed gray, Cancelled red, No Show
  yellow. Treatments Planned blue, In Progress yellow, Completed green, Cancelled red. Sessions Scheduled
  blue, Completed green, Cancelled red. Methods Cash green, Card blue, Bank Transfer purple. WhatsApp Sent
  green, Failed red, Pending yellow. Users Active green, Disabled red.

### Lint rules that bite here

The project uses `eslint-config-next` with the React Compiler hook rules. Follow these:

- No `any`. No unused variables, imports or caught errors (`catch {` when you do not use it).
- Never call `setState` directly in an effect body, and never call a component-level function that sets
  state from an effect. Put the async loader inside the effect (the pattern above).
- Complete dependency arrays. Never define a component inside another component.
- No `'`, `"`, `>` or `}` as plain JSX text: rephrase, or wrap the text in `{"…"}`.
- `<img>` needs `// eslint-disable-next-line @next/next/no-img-element -- reason` (used for the uploaded logo).
- No empty blocks: put a comment inside.

### Dental chart (`src/components/DentalChart.tsx`)

An odontogram. FDI numbering, drawn from the dentist's view (patient's right on the left): adult upper
`18→11, 21→28`, lower `48→41, 31→38`; child (Adult / Child switch) upper `55→51, 61→65`, lower `85→81, 71→75`.
Children under 6, or charts with only child teeth marked, open on the child teeth.

- Each tooth is drawn by type (incisor, canine, premolar, molar; `toothKind()`), roots up for the upper jaw,
  with the five-surface square beside it. On the square the outer edge of each jaw is **B**uccal, the middle
  of the chart **L**ingual, and **M**esial faces the midline (`surfaceLayout()`).
- **Surface findings:** caries (red), filling (blue). **Whole-tooth conditions:** crown (gold), root canal
  (red line in the roots), implant (screw), bridge (violet bar that joins neighbours), missing (dashed
  outline), to extract (red cross). A tooth with nothing marked is healthy.
- Click a tooth to open its panel: tap surfaces with the Caries / Filling / Clear tool (the same finding again
  clears it), toggle conditions, **Healthy** clears everything but the note, a free-text note, the patient's
  treatment plans whose `tooth_number` names this tooth, and **New treatment for this tooth**
  (`/treatments/new?patient=…&tooth=…`). A small dot by a tooth number means an open plan.
- Props for other pages: `initialTooth` opens a tooth, `printHref` shows a Print link (to `/patients/<id>/chart`),
  `canEdit={false}` makes it read-only.
- Editing needs `edit_patients`; everyone else can still open a tooth to read it. **Save Chart** and
  **Undo** appear when something changed. The **Findings** list under the chart sums up every marked tooth.
- **Data:** `DentalChartData` in `types.ts`, `{ "version": 2, "teeth": { "36": { "conditions": [...],
  "surfaces": { "O": "caries" }, "note": "..." } } }`; only marked teeth are stored. Read it only with
  `parseDentalChart()` from `src/lib/dentalChart.ts`, which also reads the first shape
  (`{ "36": "treated" }`) as `legacy` marks, shown as "Has treatment (old chart)" until the dentist marks
  the tooth or presses Healthy. Never drop that compatibility.
- The surface buttons in the panel are `clip-path` shapes stacked on one square. In tests, click them with a
  `position` (their centres all fall on the occlusal surface).

---

## Known issues

Updated on 2026-09-26.

- **The back end does not have everything yet.** `Patient.dental_chart`, the `*_name` fetch fields,
  read permissions and several field names must be added or confirmed. See `docs/backend-todo.md`.
- **Totals are computed in the browser.** The dashboard's revenue and amount owed, the payments total and the
  reports load every matching row (`limit: 0`) and add them up. That is fine for one clinic for years, but a
  back-end report method would be faster later.
- **No right-to-left layout yet.** The classes are ready (see Styling), but there is no Arabic text or `dir`
  switch.
- `enable_patient_portal` is saved but not used by the front end.
- Deleting is blocked for records that others link to (Frappe's normal rule). Users are disabled, not deleted.

---

## Working in this repo

- **Next.js 16 changes that affect this code.** Check `node_modules/next/dist/docs/` before using any other
  API.
  - `params` and `searchParams` are async in pages, layouts and route handlers (these pages are client
    components and use `useParams()` / `useSearchParams()` instead).
  - Middleware is now `proxy.ts`.
  - `next lint` is gone, and `next build` no longer lints.
  - Turbopack is the default bundler.
  - A folder named `_something` is left out of routing.
  - `useSearchParams()` needs a `<Suspense>` boundary for prerendering.
- **The owner keeps `npm run dev` running on port 3000. Do not disturb it:**
  - Never start a second `next dev` in this folder. Browser tests and screenshots use `next build` and then
    `next start -p 3100` (`playwright.config.ts` does this; `SKIP_BUILD=1` needs an existing build in `.next`).
  - Changing `next.config.ts` or installing or removing a package makes the dev server restart or rebuild.
    Keep such changes rare, and each time add a line to IMPROVEMENTS.md asking the owner to restart the dev
    server. (Its `.next/dev` cache got corrupted once while config, packages and tests all changed together.)
  - Never run `npm audit fix --force`.
- **Check UI changes in the running app.** Run `npm run dev` and open <http://localhost:3000>. Mock mode
  needs no back end. A full reload brings back the seed data. Use `/profile` → Try Another User to check
  permissions.
- **Run `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm run test:e2e`** on your changes. Use
  `npm run screenshots` to look at changed screens at desktop, tablet and phone size.
- If `npx tsc --noEmit` or `npm run build` says `.next/dev/types/routes.d.ts is not a module`, a running
  `npm run dev` is rewriting its route types at that moment. Run the command again.
- **Line endings are CRLF.** Git Bash `sed -i` and some editors write LF; run `unix2dos` on touched files and
  check with `git ls-files --eol` (`w/crlf`).
- **Git:** `develop` is the working branch and `main` is the base for PRs. Commit messages follow
  Conventional Commits (`feat:`, `fix:`, `docs:`).
- **Keep this file current.** When you change routes, flags or the data layer, or fix a known issue, update
  this file, `docs/backend-todo.md` when the back-end contract changes, and `README.md` if people will notice.

# DentClinic — Dental Clinic Management System

A dental clinic management system in two parts: a **Next.js 16 front end** (this repository) and a
**Frappe v16 back end** ([`ahmedraad51/clinic-system-backend`](https://github.com/ahmedraad51/clinic-system-backend)).

The front end covers the day-to-day running of a clinic — patients and their medical records, the
appointment book, treatment plans with sessions and per-tooth charting, payments with printable
receipts, financial reports, WhatsApp reminder templates, clinic settings, and per-user permissions. The back end owns the data model, the money
calculations, role-based access, scheduled reports and WhatsApp appointment reminders.

![Dashboard](docs/screenshots/dashboard.png)

> **Current state:** the front end runs on **built-in dummy data** and **login is switched off**, so
> you can clone it and see every screen without standing up Frappe first. Both are single flags —
> see [Running against the real backend](#running-against-the-real-backend). To see the app as a
> receptionist or a doctor, open **Profile → Try Another User**.

---

## Table of contents

- [Architecture](#architecture)
- [Screens](#screens)
- [Front end](#front-end-this-repository)
  - [Stack](#stack)
  - [Routes](#routes)
  - [Project structure](#project-structure)
  - [The data layer](#the-data-layer)
- [Back end](#back-end)
  - [Doctypes](#doctypes)
  - [Roles and permissions](#roles-and-permissions)
  - [Reports, dashboards and WhatsApp](#reports-dashboards-and-whatsapp)
- [Getting started](#getting-started)
- [Three ways to install](#three-ways-to-install)
- [Running against the real backend](#running-against-the-real-backend)
- [Known gaps](#known-gaps)

---

## Architecture

```
┌─────────────────────────────┐
│  Browser                    │
│  React 19 client components │
└──────────────┬──────────────┘
               │  getList / getDoc / createDoc / updateDoc / deleteDoc
               ▼
┌─────────────────────────────┐
│  src/lib/frappe.ts          │   ← single access point for all data
│                             │
│   MOCK_DATA = true  ────────┼──►  src/lib/mockData.ts   (in-memory dummy data)
│   MOCK_DATA = false ────────┼──►  axios → /frappe/...
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Next.js rewrite            │   next.config.ts:
│  /frappe/:path*             │   → http://dent_clinic.localhost:8000/:path*
└──────────────┬──────────────┘
               │  cookie session + x-frappe-csrf-token
               ▼
┌─────────────────────────────┐
│  Frappe v16 · dent_app      │   REST: /api/resource/<Doctype>
│  Patient · Doctor ·         │         /api/method/login
│  Appointment · Treatment    │
│  Plan · Payment · …         │
└─────────────────────────────┘
```

Every page reaches the back end through `src/lib/frappe.ts` and nothing else — no page issues its
own `fetch`. That is what makes the dummy-data switch a one-line change.

---

## Screens

**Arabic and English.** The app opens in Arabic, right to left, with an Arabic / English switch in the menu (each
user's choice is remembered) and a default language in Settings. Pictures of the Arabic screens at desktop, tablet
and phone size are in [docs/arabic](docs/arabic/README.md).

**New look.** A clean, professional admin look like the pet store app's: white cards with soft shadows on a light
grey page, a white menu that collapses to icons, a floating top bar, violet buttons, outlined fields, plain tables,
and initials instead of drawn avatars. **Dark mode** (or the computer's own setting), a bordered skin, a semi-dark
menu and a wide page are chosen per computer in the **Appearance** panel (the palette icon in the top bar), in English
and in Arabic. Before and after, at desktop, tablet and phone size, and in dark mode:
[docs/design-changes](docs/design-changes/README.md).

**The app's own controls.** Dropdowns, the calendar, the time picker, checkboxes and the colour picker are drawn by
DentClinic, not the browser: one font (IBM Plex Sans, and IBM Plex Sans Arabic in Arabic), a check mark on the chosen
item, doctors' photos or initials, a search box in long lists, and full keyboard use. On a phone the lists, calendar and
time picker open from the bottom of the screen (the patient picker and address suggestions stay under the box while
typing). Before and after: [docs/design-changes/4-controls](docs/design-changes/4-controls/README.md).

**Fonts and type.** The fonts are part of the app (`public/fonts/`), so they load on every computer, online or not.
Headings and figures are semibold, there is one size scale, and every digit has the same width, so amounts and times
line up. IBM Plex was chosen from four fonts that suit both languages ([docs/fonts](docs/fonts/README.md)).

**Forms in dialogs, wide pages.** New and edit forms for appointments, treatment plans and payments open in a dialog
over the page you are on, already filled in with the patient, plan, tooth or time. Add Patient slides in from the side.
After saving you stay where you were, and a message offers to open the new record. The patient, doctor, appointment,
treatment plan, payment, user, profile and settings pages use the whole screen: a profile card on one side and the
details or tabs on the other. Permissions are a table of sections by View, Add, Edit and Delete.

The pictures are taken from the running app with the dummy data (`npm run screenshots:readme`).

<table>
<tr>
<td width="50%"><img src="docs/screenshots/today.png" alt="Today board"><br><b>Today</b> — the front desk's day by doctor: one tap to confirm, complete or mark a no-show, late patients highlighted, balances and quick payments.</td>
<td width="50%"><img src="docs/screenshots/appointments.png" alt="Appointment calendar"><br><b>Appointments</b> — a day calendar with a column per doctor and their working hours; click a free time to book, drag to move.</td>
</tr>
<tr>
<td><img src="docs/screenshots/patient.png" alt="Patient page"><br><b>Patient</b> — medical alerts on top, call and WhatsApp, last and next visit, balance, and a timeline.</td>
<td><img src="docs/screenshots/dental-chart.png" alt="Dental chart"><br><b>Dental chart</b> — adult and child teeth, the five surfaces, crowns, root canals, implants and more, with a note per tooth.</td>
</tr>
<tr>
<td><img src="docs/screenshots/patients.png" alt="Patients"><br><b>Patients</b> — search by name, phone or ID; alerts and the next visit at a glance.</td>
<td><img src="docs/screenshots/treatments.png" alt="Treatments"><br><b>Treatment plans</b> — type, tooth, cost and remaining balance.</td>
</tr>
<tr>
<td><img src="docs/screenshots/payments.png" alt="Payments"><br><b>Payments</b> — linked to a patient and a plan, with printable receipts and an end-of-day report.</td>
<td><img src="docs/screenshots/dashboard.png" alt="Dashboard"><br><b>Dashboard</b> — today, the next seven days, and the month's money.</td>
</tr>
</table>

### Financial reports

Profit in plain words, expenses by category and profit by doctor, then revenue by treatment type, recent payments,
and every plan still carrying a balance. The clinic's costs are kept on the Expenses page.

![Expenses](docs/screenshots/expenses.png)

![Reports](docs/screenshots/reports.png)

![Outstanding balances](docs/screenshots/reports-outstanding.png)

### Users and permissions

Staff accounts map onto Frappe users; each one gets a `Clinic Permission` record with sixteen
independent switches, shown as a table: a row per section, a column each for View, Add, Edit and Delete, with
select-all boxes for every row and column and the role presets above.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/users.png" alt="Users"></td>
<td width="50%"><img src="docs/screenshots/permissions.png" alt="Permissions — full access"></td>
</tr>
<tr>
<td colspan="2"><img src="docs/screenshots/permissions-partial.png" alt="Permissions — read-only user"><br>A read-only account: view rights kept, everything else revoked.</td>
</tr>
</table>

---

## Front end (this repository)

### Stack

| | |
|---|---|
| Framework | Next.js **16.2.9**, App Router, Turbopack |
| UI | React **19.2.4**, TypeScript 5 |
| Styling | Tailwind CSS **v4** (via `@tailwindcss/postcss`) |
| Icons | `lucide-react`, plus our own tooth logo |
| HTTP | `axios`, with cookies and the Frappe CSRF header |
| State | React Context (auth, clinic settings, session and permissions, toasts) — no external store |

### Routes

Press **Ctrl+K** (⌘K on a Mac), or use the search box in the top bar, to find a patient by name, phone
or ID from any page, or to jump to an everyday action such as New Appointment.

On a phone, every list turns into easy-to-read cards, and the Save button of a form stays at the bottom of the
screen.

New and edit forms for appointments, treatment plans and payments, and Add Patient, open in a dialog over the page
you are on (the `/new` and `/edit` pages below still work on their own).

Every screen checks the user's permission (see [Roles and permissions](#roles-and-permissions)) and hides
what they are not allowed to do.

| Route | What it does |
|---|---|
| `/` | Redirects to `/dashboard` |
| `/xrays/[id]` | One X-ray or photo, printable on the letterhead with its drawing |
| `/dashboard` | A welcome banner, large quick-action tiles (new appointment, patient, treatment, payment), then today's appointments, the next 7 days, patient and plan counts, revenue this month, and charts of revenue and visits per month and treatments by type |
| `/waiting-room` | A screen for a TV in the waiting room: who is in the chair, who is waiting and for how long, and who comes next, with first names and an initial only; it updates by itself |
| `/today` | The front desk's day: today's patients by doctor, one tap to confirm, mark Arrived and In Chair (the waiting room), complete or mark a no-show, late patients highlighted, medical alerts and balances at a glance, quick payments and walk-ins. Marking a visit Completed (here or on the appointment) asks what was done and saves it on the patient's treatment plan |
| `/patients` | List with server-side search (name, phone, ID; a phone number is found however it was typed: `0770…`, `+964 770…`, `00964…` or Arabic digits), gender filter and paging |
| `/recall` | Patients due for a check-up and not booked: the date the dentist chose has come (every 3, 6, 9 or 12 months, set on the patient page or when a visit is finished), or no visit for 6 months. With Call, WhatsApp reminder and Book |
| `/patients/new`, `/patients/[id]/edit` | Create or edit — basic details (an age instead of the birth date when the patient does not know it) plus medical history, allergies, medications. Every number and phone box in the app accepts digits typed on an Arabic keyboard and saves them as 0-9 |
| `/patients/[id]` | Medical alerts (allergies, blood thinners, diabetes, heart problems, pregnancy), tap-to-call and WhatsApp buttons, last visit, next appointment, the next check-up the dentist chose, and balance, a timeline of visits, treatment sessions and payments, and tabs for appointments, treatment plans, prescriptions, payments and the dental chart, plus X-rays and photos (take a photo with the tablet camera or add files, with a progress bar while they upload), and a History tab (who added and changed the record) |
| `/patients/[id]/estimate` | A printable treatment estimate of the patient's open plans, with totals and signature lines |
| `/patients/[id]/statement` | A printable statement of all treatments, payments and the balance |
| `/patients/[id]/file` | The whole patient file, ready to print: details, medical information, the dental chart, treatment plans and sessions, appointments, prescriptions, payments and, if chosen, the X-rays |
| `/patients/[id]/card` | A patient ID card the size of a bank card, with a QR code; the **Scan** button in the top bar (or a phone camera) opens the patient's file from it |
| `/patients/[id]/chart` | The dental chart and its findings, with the patient's QR code, ready to print for the patient file or a referral |
| `/appointments/[id]/card` | A printable appointment card to hand to the patient |
| `/payments/day` | The end-of-day report: payments by method, the total, and the cash drawer count (opening float, cash counted, matched / short / over with a note), saved each day with who counted it, plus the recent counts for the manager |
| `/appointments` | The appointment book as a **day calendar** (a column per doctor, from opening to closing time, with a "now" line), a **week calendar**, or a **list** with search and filters. Click an empty time in the calendar to book it with the date, time and doctor already filled in, or drag an appointment to move it to another time or doctor |
| `/appointments/new`, `/appointments/[id]/edit` | Book or edit — shows the doctor's day with one-tap free times, remembers the last doctor used, and warns when the doctor is already booked at that time |
| `/appointments/[id]` | Detail, one-click status changes, WhatsApp messages sent for it, the prescriptions written at the visit with a Write Prescription button, and its history (who changed what, and when) |
| `/treatments` | Plans with cost and remaining balance, type and status filters |
| `/treatments/new`, `/treatments/[id]/edit` | Create or edit — type, FDI tooth number, diagnosis, cost |
| `/treatments/[id]` | Money summary with progress, status changes, its payments, and its treatment sessions, and the patient's dental chart opened at the plan's tooth, and its history |
| `/prescriptions/new`, `/prescriptions/[id]/edit` | Write a prescription: pick a medicine from the clinic's list and its usual dose, how often, days and instructions are filled in; a "Check before signing" box warns about an allergy, an NSAID with a blood thinner, pregnancy, a child's dose, a dose above the daily maximum or a medicine listed twice (never blocking) |
| `/prescriptions/[id]` | The prescription, printed on its doctor's own paper (A5 or A4, their qualifications, footer, logo and signature, or leaving room on pre-printed pads; set on the doctor's page) with a signature line, with the warnings shown on screen |
| `/medicines` | The clinic's medicine list (managers): usual dose, how often, days, instructions, allergy words and the safety flags; a medicine is switched off, never deleted |
| `/payments` | Ledger with search, method and date filters, and the total (dinars and dollars each on their own) |
| `/payments/new`, `/payments/[id]/edit` | Record or edit a payment in dinars or dollars (pre-fills from a treatment plan; cannot go above what is left; a payment in the other currency uses that day's exchange rate, shown on the form and the receipt) |
| `/payments/[id]` | Printable receipt, a receipt slip for 58 or 80 mm thermal receipt printers (paper size set per computer), and the payment's history |
| `/expenses` | The clinic's costs (rent, salaries, supplies, lab bills), in dinars or dollars, each optionally against a doctor: search, filters, totals, CSV export, and add or change them in a dialog |
| `/reports` | Profit in plain words (what came in, what was spent, up or down on the period before, the biggest cost, the best doctor), expenses by category and profit by doctor; revenue by treatment, method and month for a chosen period (in dinars, dollar payments at their day's rate), outstanding balances, CSV export |
| `/doctors` | The clinic's doctors: add and edit name, specialization, phone, email, working hours, and switch a doctor off when they leave |
| `/doctors/[id]` | One doctor: their details and working hours, today's patients, the next 30 days and their open treatment plans |
| `/users`, `/users/[id]` | Staff accounts, roles, enable/disable, and the permissions table (sections by View, Add, Edit and Delete) with role presets |
| `/activity` | The activity log: who added, changed and deleted which record, and when; a record deleted by mistake is restored with one click |
| `/whatsapp` | Reminder templates with a live preview, and the message log, with phone numbers partly hidden |
| `/settings` | In tabs: clinic name and logo, contact details, currency (Iraqi dinars are shown without decimals), a second currency (US dollars) with its exchange rates by date, the phone country code (964 for Iraq, added to local numbers such as `0770…` in WhatsApp links), working hours, feature switches, and the clinic colour (the whole app follows it), and a price list that fills in treatment costs |
| `/profile` | Your details and permissions, change password, the screen size on this computer (bigger text for a reception monitor), and **Install DentClinic** as an app |

### Project structure

```
src/
├── app/                        one folder per route (see the table above)
│   ├── layout.tsx              root layout → providers → MainLayout
│   ├── page.tsx                redirects to /dashboard
│   ├── not-found.tsx           404 page
│   └── _login/page.tsx         login screen, parked out of routing (see below)
├── components/
│   ├── MainLayout.tsx          sidebar + topbar shell, and the login guard
│   ├── Sidebar.tsx · Topbar.tsx · NotificationBell.tsx
│   ├── Guard.tsx               hides a page from users without the permission
│   ├── DentalChart.tsx         odontogram: adult and child teeth, surfaces, conditions, notes
│   ├── forms/                  patient, appointment, treatment and payment forms (new + edit)
│   └── ui/                     shared cards, buttons, inputs, tables, badges, dialogs, pickers
├── context/                    auth, clinic settings, session/permissions, toast messages
└── lib/
    ├── frappe.ts               the only place that talks to the backend
    ├── mockData.ts             in-memory dummy dataset
    ├── types.ts                doctypes, allowed values, permission keys
    ├── hooks.ts                paged lists, single documents, doctors
    ├── format.ts · links.ts    money, dates, CSV; record URLs
docs/backend-todo.md            what the backend must provide for this front end
```

**The dental chart** (`DentalChart.tsx`) is an odontogram in FDI notation, with adult teeth (11–48) and
child teeth (51–85). Each tooth is drawn by type with its five surfaces (M, O, D, B, L). Click a tooth to
mark caries or fillings on its surfaces, whole-tooth conditions (crown, root canal, implant, bridge,
missing, to extract) and a note, see its treatment plans, or start a new treatment for it. **Save Chart**
stores it on the patient's `dental_chart` field; charts saved in the first, simpler format still load.

### The data layer

`src/lib/frappe.ts` exposes functions that mirror the Frappe REST API:

```ts
getList(doctype, fields, { filters, orFilters, orderBy, limit, start })  // GET  /api/resource/<Doctype>
getCount(doctype, filters?, orFilters?)                                   // frappe.client.get_count
getDoc(doctype, name)                                                     // GET  /api/resource/<Doctype>/<n>
createDoc(doctype, data)                                                  // POST /api/resource/<Doctype>
updateDoc(doctype, name, data)                                            // PUT  /api/resource/<Doctype>/<n>
deleteDoc(doctype, name)                                                  // DELETE
callMethod(method, args) · uploadFile(file, { onProgress }) · changePassword(old, new)
```

Each call sends the CSRF token as `x-frappe-csrf-token`, with `withCredentials: true` so the Frappe
session cookie rides along. `errorMessage(err)` turns a failed call into a sentence the user can read.

**Dummy-data mode.** `MOCK_DATA = true` at the top of the file routes everything through
`src/lib/mockData.ts` instead — an in-memory store shaped like Frappe's REST responses: IDs use the
real naming series (`PAT-2026-00001`), link fields hold the linked doc's `name`, list queries return
only the requested fields and support filters, search, sorting and paging, and a missing doc rejects
the way a 404 would. It ships with 12 patients, 5 doctors, 24 appointments, 16 treatment plans (one priced in US
dollars), 10 treatment sessions, 17 payments, 9 users, clinic settings, and WhatsApp templates and logs. A few
appointments and payments are dated today, so the dashboard is never empty.

The money is *computed*, not hard-coded: payments sum into each plan's paid and remaining amounts,
and plans sum into each patient's totals. Add a payment and the plan, the patient card and the
reports all move together. Like the real backend, it refuses a payment above what a plan has left,
and refuses to delete a record that others link to. Writes live for the browser session and reset on
reload.

---

## Back end

Repository: **[ahmedraad51/clinic-system-backend](https://github.com/ahmedraad51/clinic-system-backend)** ·
Frappe app `dent_app` · MIT

### Doctypes

| Doctype | Naming | Key fields |
|---|---|---|
| **Patient** | `PAT-{YYYY}-{#####}` | `full_name`, `gender`, `date_of_birth`, `age`, `phone_number`, `secondary_phone`, `email`, `address`, `medical_history`, `allergies`, `current_medications`, `chronic_diseases`, `notes` — plus read-only rollups `total_appointments`, `total_treatments`, `total_paid`, `total_remaining` |
| **Doctor** | `DOC-{#####}` | `full_name`, `specialization` (General Dentist / Orthodontist / Endodontist / Periodontist / Oral Surgeon / Pediatric Dentist / Prosthodontist), `phone_number`, `email`, `working_days`, `start_time`, `end_time`, `is_active` |
| **Appointment** | `APT-{YYYY}-{#####}` | `patient`, `doctor`, `appointment_date`, `appointment_time`, `duration_minutes`, `status` (Scheduled / Confirmed / Completed / Cancelled / No Show), `reason_for_visit`, `notes` |
| **Treatment Plan** | `TRT-{YYYY}-{#####}` | `patient`, `doctor`, `treatment_type` (Filling / Root Canal / Crown / Bridge / Extraction / Implant / Cleaning / Whitening), `tooth_number`, `status` (Planned / In Progress / Completed / Cancelled), `diagnosis`, `treatment_notes`, `currency` (the clinic's or the second one), `total_cost`, read-only `paid_amount` and `remaining_amount` |
| **Treatment Session** | `SES-{YYYY}-{#####}` | `patient`, `treatment_plan`, `doctor`, `session_date`, `session_time`, `status`, `notes` |
| **Payment** | `PAY-{YYYY}-{#####}` | `patient`, `treatment_plan`, `payment_date`, `amount`, `currency`, `exchange_rate` (the rate of its day), `payment_method` (Cash / Card / Bank Transfer), `notes`, read-only `plan_amount` and `base_amount` |
| **Clinic Permission** | one per `user` | 14 checkboxes: view/add/edit/delete patients, view/add/edit appointments, view/add/edit treatments, view/add payments, view reports, manage users |
| **Clinic Settings** | single | `clinic_name`, `logo`, contact details, `currency`, `second_currency`, `exchange_rates`, `tax_number`, `phone_country_code`, working hours, `theme_color`, and feature switches for WhatsApp, the patient portal and financial reports |
| **WhatsApp Template** | `WAT-{#####}` | `template_name`, `trigger` (24 Hours Before / 2 Hours Before / Manual), `message`, `is_active` |
| **Cash Count** | `CC-{YYYY}-{#####}` | `count_date` (one per day), `opening_float`, `cash_payments`, `expected_cash`, `cash_counted`, `difference`, `note`, `counted_by`, `counted_at` (new, see `docs/backend-todo.md`) |
| **Dental Medicine** | `MED-{#####}` | `medicine_name`, `strength`, `dosage_form`, `medicine_group`, the usual `default_dose` / `default_frequency` / `default_duration_days` / `default_instructions`, and the warning flags `allergy_words`, `is_nsaid`, `avoid_in_pregnancy`, `max_daily_mg`, `child_note`, `is_active` (new, see `docs/backend-todo.md`) |
| **Prescription** | `RX-{YYYY}-{#####}` | `patient`, `doctor`, `appointment`, `prescription_date`, `notes`, a `medicines` table (`medicine`, `medicine_name`, `dose`, `frequency`, `duration_days`, `instructions`) and a read-only `summary` (new, see `docs/backend-todo.md`) |
| **WhatsApp Log** | `WAL-{YYYY}-{#####}` | `patient`, `appointment`, `phone_number`, `status` (Sent / Failed / Pending), `sent_at`, `message`, `error_message` |

Balances are kept correct server-side: `Treatment Plan.validate()` recomputes `remaining_amount` and
refuses a paid amount greater than the total cost, then re-saves the linked patient so the rollups on
the patient record stay in step.

### Roles and permissions

Three roles ship as fixtures — **Clinic Manager**, **Clinic Doctor**, **Clinic Receptionist** — and
`Clinic Permission` layers the fine-grained switches on top, one record per user. That is exactly
what the `/users/[id]` screen edits. The front end hides menus, pages and buttons the user may not
use; System Managers can do everything. The backend must still enforce the same rules.

### Reports, dashboards and WhatsApp

- **Query reports:** Daily Revenue, Monthly Revenue, Treatment Revenue, Outstanding Balances
- **Dashboard:** a *Clinic Dashboard* with Appointments Today, Monthly Revenue and Outstanding Balance charts, plus a *Dental Clinic* workspace
- **WhatsApp reminders:** `dent_app.dent_app.whatsapp.schedule_reminders` runs hourly, picks the active template for each trigger window, fills it from the appointment and logs the result to WhatsApp Log

---

## Getting started

### Front end only (dummy data — no backend needed)

```bash
git clone https://github.com/its14march/clinic-system-Front.git
cd clinic-system-Front
npm install
npm run dev
```

Open <http://localhost:3000> — it redirects straight to the dashboard, already populated with an Iraqi
example clinic written in Arabic: Iraqi patients and doctors, addresses in Baghdad and other governorates, visit
reasons and notes (medicine names stay in Latin letters), `07xx` mobile numbers and prices in Iraqi dinars (IQD).
Node **20.9+** is required (developed on Node 22).

**Install as an app.** DentClinic can be installed on a computer, tablet or phone (Chrome or Edge: the install icon
in the address bar, or Profile → Install DentClinic; iPhone and iPad: Share → Add to Home Screen). It then opens in
its own window, and shows a friendly page when there is no connection. This needs the production build over HTTPS
(`npm run build` and `npm run start` behind HTTPS); `npm run dev` does not register the service worker.

### Checks and tests

```bash
npx tsc --noEmit          # type check
npm run lint              # ESLint
npm run build             # production build
npx playwright install chromium   # once, before the first test run
npm run test:e2e          # browser tests (builds, then serves on port 3100)
npm run screenshots       # every page at desktop, tablet and phone size, into screenshots/
npm run screenshots:readme   # the pictures in this README, into docs/screenshots/
npm run screenshots:arabic   # the main screens in Arabic at three sizes, into docs/arabic/
npm run screenshots:design   # the redesign's "after" pictures, into docs/design-changes/2-clean/after/
npm run screenshots:fonts    # the font comparison, into docs/fonts/
```

The browser tests walk through the daily work: adding a patient, booking an appointment (and the
"doctor is already booked" warning), creating a treatment plan and paying part of it, and checking that a
receptionist cannot open Reports.

### Back end

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/ahmedraad51/clinic-system-backend --branch version-16
bench install-app dent_app
bench start
```

The front end expects the site to answer at `http://dent_clinic.localhost:8000`. If yours differs,
set `FRAPPE_URL` before starting the front end, for example in `.env.local`:

```bash
FRAPPE_URL=http://<your-site>:8000
```

Before switching over, work through [`docs/backend-todo.md`](docs/backend-todo.md): a few fields
(like `Patient.dental_chart` and the `patient_name` fetch fields) and read permissions must exist on
the backend first. Its last section lists every doctype and field the front end uses, with the type and
whether it is required.

---

## Three ways to install

DentClinic is one app that can be sold and installed three ways. Choose with the `DEPLOYMENT_MODE` environment
variable **before** `npm run build` (it is built into the app; a wrong value stops the build):

| `DEPLOYMENT_MODE` | What it is |
|---|---|
| `cloud` (the default) | Online. Each clinic has its own Frappe site. |
| `clinic-server` | On a small computer inside the clinic. Works with no internet at all. |
| `cloud-copy` | The online copy of a clinic server, which the owner views from home. Everything is view-only. |

```bash
DEPLOYMENT_MODE=clinic-server npm run build
npm run start
```

**Cloud with many clinics.** Set `CLOUD_DOMAIN` to the main web address, and `CLINIC_SITE_URL` to where each
clinic's Frappe site is, with `{clinic}` for its name. `alnoor.dentclinic.example` is then the "alnoor" clinic, with its
requests sent to its own site, and the main address shows the public website (its requests go to
`PLATFORM_SITE_URL`). Without `CLOUD_DOMAIN`, the app serves the one clinic at `FRAPPE_URL`.

| Variable | Example | Used for |
|---|---|---|
| `DEPLOYMENT_MODE` | `cloud` | The way of installing (above) |
| `FRAPPE_URL` | `http://dent_clinic.localhost:8000` | The one clinic's Frappe site (clinic server, cloud copy, a single cloud clinic) |
| `CLOUD_DOMAIN` | `dentclinic.example` | The cloud's main address; clinics are `<name>.dentclinic.example` |
| `CLINIC_SITE_URL` | `https://{clinic}.sites.dentclinic.example` | Each cloud clinic's Frappe site |
| `PLATFORM_SITE_URL` | `https://platform.sites.dentclinic.example` | The platform's Frappe site, for the main address |

**Prices.** The three plans (Cloud, Clinic Server, Clinic Server + Cloud copy), their prices, limits and the free-trial
length are in one file, [`src/config/sales.ts`](src/config/sales.ts), with the sales WhatsApp number. The public
website on the main address shows them.

With the dummy data you do not need three builds: **My Profile → Preview a Way of Installing** shows the app as
another mode on that computer. [`docs/backend-todo.md`](docs/backend-todo.md) lists what the back end must provide
for each mode.

## Running against the real backend

Two independent switches, both currently set for offline development:

**1. Turn dummy data off** — [`src/lib/frappe.ts`](src/lib/frappe.ts):

```ts
export const MOCK_DATA: boolean = false;
```

**2. Turn login back on** — [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx):

```ts
const AUTH_DISABLED: boolean = false;
```

…then move the login page back into routing:

```bash
git mv src/app/_login src/app/login
```

The leading underscore makes `_login` a Next.js *private folder*, so the route is not published while
the code stays intact. With `AUTH_DISABLED = true` the app uses a stand-in `Administrator` session
(so the login guard in `MainLayout` never fires) and hides the logout buttons, since there would be
nowhere to log out to. The guard waits for the saved session to load, so refreshing a page keeps you
logged in.

Logging in posts to `/api/method/login` and relies on the Frappe session cookie for everything after that. It
then asks Frappe who is logged in, so a cookie the browser did not keep shows up at once. Switch off "Keep me
logged in on this computer" on shared computers: closing the browser then logs you out. When the session
expires, a "Log in again" dialog opens over the page, so nothing typed is lost; logging out from there goes
to the login page and afterwards back to the page you were on. Every request gives up after 15 seconds (file
uploads after 10 minutes, with a progress bar, full lists for totals after 1 minute) with a clear message, and a list that got no
answer, or found the server down, is asked for again. A list, the dashboard, the Today board, the recall
list or the bell that still could not load says so with a **Try Again** button, instead of showing zeros or
"No patients yet". See section 5 of
[`docs/backend-todo.md`](docs/backend-todo.md) about the CSRF token.

---

## Known gaps

Worth knowing before you pick this up:

- **The backend needs a few additions** before `MOCK_DATA` can be turned off — see
  [`docs/backend-todo.md`](docs/backend-todo.md), including the CSRF token after login.
- **Totals are added up in the browser** for the dashboard and reports. Fine for one clinic; backend
  report methods would be faster for very large data.
- **English only for now.** The layout uses start/end spacing, so an Arabic right-to-left version can be
  added without redoing the screens.
- The patient portal switch is saved in Settings but not used yet.

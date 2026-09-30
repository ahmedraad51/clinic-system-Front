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
provide for this front end (its section 9 lists every doctype and field the front end uses, with type and
whether it is required). `CLAUDE.md` imports this file, so every Claude Code session loads it. Keep it
accurate.

---

## Read this first: current state

| | State | Where |
|---|---|---|
| Data source | **Dummy data.** Every read and write goes to an in-memory store. No back end needed. | `MOCK_DATA = true` in `src/lib/frappe.ts` |
| Login | **Off.** A stand-in `Administrator` session is used and logout buttons are hidden. `/profile` has a **Try Another User** card to see the app with another user's permissions. The login page sits in a private folder, so `/login` is not a route. | `AUTH_DISABLED = true` in `src/context/AuthContext.tsx`; page in `src/app/_login/page.tsx` |
| `npm run dev` | Works. Dev output goes to `.next/dev`, so `npm run build` can run while it is up. Changing `next.config.ts` restarts it, and the first page after that can take several minutes to compile. | |
| `npm run build` | **Passes** (checked 2026-09-30): compiles, type-checks and prerenders every route, with no warnings. | |
| `npm run lint` | **Passes** with 0 problems (checked 2026-09-30). `npx tsc --noEmit` passes too. | |
| Languages | **Arabic (default, right to left) and English.** Every text is in `src/i18n/en/*.ts` and `src/i18n/ar/*.ts`; the switch is in the menu. See **Languages** below. **Every new text must be added in both languages.** | `src/i18n/`, `src/context/LanguageContext.tsx` |
| Tests | **Playwright tests pass** (137 tests, 9 of them in Arabic, checked 2026-09-30; run them with `--workers=2` on the owner's machine, never while a build runs): one file per area in `e2e/tests/` (patients, booking, calendar, Today board, treatments, payments, prescriptions, printouts, permissions, WhatsApp, X-rays, phone numbers and more). Pure helpers such as `src/lib/phone.ts` are tested in the same runner without a browser. No CI. | `e2e/`, `playwright.config.ts` |

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
| `npm run screenshots:arabic` | The main screens in Arabic at desktop, tablet and phone size into `docs/arabic/<size>/<screen>.png` (dummy data, 26 September 2026). `SKIP_BUILD=1` works here too |
| `npm run screenshots:design` | The redesign's "after" pictures (main screens in English at three sizes) into `docs/design-changes/after/`; the "before" ones come from the plain design (commit 147e676). `SKIP_BUILD=1` works here too |

The Frappe address comes from the `FRAPPE_URL` environment variable (for example in `.env.local`), default
`http://dent_clinic.localhost:8000`. See `next.config.ts`.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js **16.2.9**, App Router, Turbopack |
| UI | React **19.2.4**, TypeScript 5 with `strict: true`, path alias `@/*` → `src/*` |
| Styling | Tailwind CSS **v4** via `@tailwindcss/postcss`. It is CSS-first: no `tailwind.config.*`; the design tokens (the `primary-*` palette and the text scale) are an `@theme` block in `src/app/globals.css` |
| Font | Manrope through `next/font/google` in `layout.tsx` (the `--font-manrope` variable, used by `body` in `globals.css`) |
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
  `LanguageProvider` → `ToastProvider` → `MainLayout` → page. `LanguageProvider` keys its children by the language,
  so everything below is drawn again when it changes.
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
│   ├── layout.tsx                 root layout: fonts (Manrope, IBM Plex Sans Arabic), boot scripts, providers, MainLayout
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
│   ├── prescriptions/ new · [id] (printable) · [id]/edit
│   ├── medicines/page.tsx         the clinic's medicine list with add/edit dialog
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
│   ├── xrays/                the X-ray section: XraySection (the tab: drop zone, filters, tiles, compare), ImageViewer
│   │                         (zoom, move, turn, light, invert, full screen, previous/next, draw, details, delete), ImageStage,
│   │                         CompareView, AddImagesDialog, ImageDetailsDialog, Sketch (SketchCanvas: one pointer draws,
│   │                         the text box is a portal on the page; SketchToolbar)
│   ├── LabWorkCard.tsx       lab work of a treatment plan; labState() and LAB_BADGES
│   ├── ClinicLetterhead.tsx  the clinic header on printouts (receipt, estimate)
│   ├── ScreenSizeCard.tsx    the screen size switch on /profile
│   ├── Avatar.tsx            round avatars: an uploaded photo, or a drawing (man, woman, boy, girl; a white coat for doctors); MyAvatar
│   ├── Charts.tsx            BarChart and DonutChart, drawn in code in the colour of their section
│   ├── ToothMascot.tsx       the smiling tooth in the dashboard's welcome banner
│   ├── CashCountCard.tsx     the cash drawer count on the end-of-day report, and the recent counts
│   ├── ReceiptSlip.tsx       "Print Slip" and "Slip Settings" under a payment receipt (thermal receipt printers)
│   ├── ToothLogo.tsx         the app logo (inline SVG)
│   ├── MedicalAlerts.tsx     the red/yellow medical alerts band (show it wherever treatment is decided)
│   ├── RecallDialog.tsx      "Next check-up" on the patient page: every 3-12 months, no recall, or the usual rule
│   ├── RecordHistory.tsx     the History card: who added a record and who changed what (closed until asked)
│   ├── PrescriptionWarnings.tsx  the "Check before signing" band of a prescription (never blocking)
│   ├── forms/                PatientForm, AppointmentForm, TreatmentForm, PaymentForm, PrescriptionForm (shared by new and edit)
│   └── ui/
│       ├── index.tsx         the UI kit (cards, buttons, inputs, tables, badges, paging, tabs, alerts, …)
│       ├── Modal.tsx         Modal, ConfirmDialog
│       └── LinkSelect.tsx    searchable picker for Link fields (used for patients)
├── context/
│   ├── AuthContext.tsx       who is logged in, the AUTH_DISABLED switch, useAuth()
│   ├── SettingsContext.tsx   Clinic Settings (currency, clinic name, feature switches), useSettings()
│   ├── LanguageContext.tsx   the language (Arabic or English), useI18n() → { t, lang, dir, setLang }
│   ├── SessionContext.tsx    the user's profile, roles and permission flags, useSession()
│   └── ToastContext.tsx      small corner messages, useToast()
├── i18n/
│   ├── runtime.ts            the language state, num(), plural(), label(), localDigits(), LANG_BOOT_SCRIPT
│   ├── index.ts              messages(), messagesFor(); re-exports the runtime
│   ├── en/                   the English texts, one file per area, and index.ts (Messages is their type)
│   └── ar/                   the Arabic texts, the same files and keys
└── lib/
    ├── frappe.ts             data access (real or mock), login/logout, CSRF, errorMessage()
    ├── mockData.ts           the in-memory dummy back end
    ├── types.ts              doctype interfaces, allowed values, permission keys, role presets
    ├── hooks.ts              usePagedList, useDocument, useDoctors, useDebounced, searchFilters
    ├── format.ts             money (IQD without decimals, currencyDecimals()), cleanNumberText(), dates, times, week helpers, cx(), CSV download
    ├── dentalChart.ts        parseDentalChart (both shapes), cleanChart, tooth names, surface layout, labels
    ├── medical.ts            medicalFlags(): allergy, blood thinner, diabetes, heart, pregnancy from the medical text
    ├── whatsapp.ts           PLACEHOLDERS, fillTemplate(), whatsappNumber(), whatsappLink() (wa.me links)
    ├── phone.ts              toLatinDigits(), dialableNumber() (0770… → 964770…), samePhone(), phoneSearchPattern(), maskPhone()
    ├── display.ts            this computer's screen size (80-120 %): readZoom, saveZoom, the boot script
    ├── sketch.ts             drawings on pictures and on the chart: SketchData, parseSketch, sketchToSave, ChartSketch, parseChartSketch, chartSketchToSave, colours, tools
    ├── xrays.ts              Dental Image helpers: accepted files, guessImageType, parseTeeth, imageTitle, IMAGE_FIELDS
    ├── avatar.ts             avatarKind() (gender and age: man, woman, boy, girl, person), avatarLook() (details from the name)
    ├── iraq.ts               IRAQ_GOVERNORATES (English and Arabic names), suggested in the patient address box
    ├── recall.ts             dueForRecall() (the dentist's date first, then the period), RECALL_CHOICES, recallUpdate()
    ├── history.ts            parseDocHistory() (Frappe's Version records), field labels, hidden fields, historyValue()
    ├── prescriptions.ts      FREQUENCIES, medicineDefaults(), doseMg(), prescriptionWarnings() (allergy, blood thinner, pregnancy, child, daily maximum, duplicate)
    ├── cashCount.ts          compareCash(): matched, short or over
    ├── receiptSlip.ts        the thermal receipt slip: buildReceiptSlip(), printHtml(), this computer's paper settings
    ├── theme.ts              the clinic colour: presets, contrast fix, applyThemeColor, the boot script
    └── links.ts              URL builders for records (always use these)
docs/
├── backend-todo.md           what the back end must provide for this front end
├── screenshots/              images used by README.md (retake with npm run screenshots:readme)
├── arabic/                   the main screens in Arabic at three sizes (npm run screenshots:arabic)
└── design-changes/           the redesign before and after, at three sizes (npm run screenshots:design)
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
| `/dashboard` | none (cards appear per permission) | A **welcome banner** (date, greeting, "2 appointments today, 2 still to come.", the smiling `ToothMascot`); right under it the **quick actions** as large `ActionTile`s (New Appointment, Add Patient, New Treatment, Record Payment, each by permission, with a one-line hint from `sm` up); counts for today's appointments, patients, active plans; revenue this month and amount owed; today's list and the next 7 days; a **Needs attention** card (hidden when empty) with past appointments still open, tomorrow's reminders not yet opened, patients due for recall (`dueForRecall` in `src/lib/recall.ts`: the dentist's date, else 6 months) and patients who owe money, each linking to where it is handled; the appointment lists show each patient's `Avatar` (`usePatientLooks`). Below, three **charts** (`Charts.tsx`), each by permission: revenue per month for the last 6 months (`view_payments`, amounts written short, "450K"), visits per month (`view_appointments`, cancelled ones and no-shows left out) and treatment plans by type (`view_treatments`, a ring with the 5 biggest types and "Other") |
| `/today` | `view_appointments` | The front desk board: counts (still to come, late, completed, no show), today's appointments grouped by doctor with one-tap **Confirm**, **Completed**, **No show** and **Undo** (`edit_appointments`), late patients (still open `LATE_AFTER` = 10 minutes after the start) highlighted, a red chip for high medical alerts, what the patient owes (`view_payments`), **Add Payment** (`add_payments`), **Walk-in** (books now, rounded up to the quarter hour) and Refresh. **Tomorrow's reminders** (when `enable_whatsapp` is on) lists tomorrow's booked patients with **Send reminder**, which opens `wa.me` with the active "24 Hours Before" template (or the first active one) filled in; opened reminders are remembered on that computer (`localStorage.reminders_opened`). **Lab work due** lists plans sent to a lab and not back that are late or due within two days (`view_treatments`). Below, **Earlier, still open** lists up to 50 past appointments still Scheduled or Confirmed, with Completed / No show / Cancelled buttons; resolved ones drop off. The dashboard and the bell link here |
| `/patients` | `view_patients` | Server-side search (name, phone, second phone, ID), gender filter, paging. Each row: name with ID, age and gender, medical-alert chips (`medicalFlags`), phone, next booked visit (`view_appointments`, loaded for the rows on the page) and balance (`view_payments`). With `view_payments`, a **Balance** filter ("Owes money": `total_remaining > 0`, biggest first; `?balance=owing` opens on it) adds a WhatsApp **Remind** link with the balance written in |
| `/recall` | `view_patients` and `view_appointments` | Patients due for a check-up and with nothing Scheduled or Confirmed from today on: a patient with `next_recall_date` (the dentist's choice) is due from that date whatever the period, one with `no_recall` never is, and everyone else is due when no Completed visit falls within the chosen period (3, 6, 9 or 12 months; default 6). A **Check-up due** column says when and why ("Dentist: every 3 months" or "6 months after the last visit"); longest overdue first, never-seen patients last. Tap to call, a WhatsApp link with a ready reminder text (`wa.me/<digits>?text=`), and Book (`add_appointments`). Worked out in the browser from all appointments |
| `/patients/new` | `add_patients` | Shared `PatientForm`. While typing, patients with the same phone number (`samePhone()` from `src/lib/phone.ts`: the last 10 digits of either phone field, so `0770 123 4567` and `+964 770 123 4567` match) or exactly the same name show under **Already registered?** with a link; saving with the same phone number asks first (also on edit when the phone changes; `currentName` excludes the patient itself). The Medical Information card starts with a **Quick checklist** (`CHECKLIST` in `PatientForm.tsx`): tick boxes that add or remove a standard word in `allergies`, `current_medications` or `chronic_diseases` (no new fields); a box already true from other wording (e.g. "Warfarin 3mg") shows ticked and disabled. The Address box suggests the governorates of Iraq (`IRAQ_GOVERNORATES`, a `datalist`; free text still works). **Only know the age?** swaps the date of birth for an **Age** box (for patients who do not know their birth date); `age` is sent only when `date_of_birth` is empty. Opens the new record after saving |
| `/patients/[id]` | `view_patients` | `MedicalAlerts` band; a summary card with tap-to-call (`tel:`) and WhatsApp (`https://wa.me/<digits>`) buttons, last visit, next appointment, balance to pay (with Add payment), paid so far, and **Next check-up** (the dentist's date and interval, "No recall" or "Usual rule"; **Change** with `edit_patients` opens `RecallDialog`: every 3, 6, 9 or 12 months with the date counted from the last visit and editable, no recall, or the usual rule); tabs: **Overview** (a timeline of appointments, treatment sessions and payments, grouped Upcoming / Today / by month, beside the contact and medical cards), Appointments, Treatment Plans, Payments, Dental Chart, **Prescriptions** (`view_treatments`: date, medicines and doctor, with **New Prescription** for `add_treatments`), **X-rays & Photos** (`XraySection`, with a count: **Dental Image** records, newest first, grouped by the day taken, filtered by type and tooth, a tile per image with a marker when it has a drawing. Drag files onto the drop zone, **Add Files** or **Take Photo** (the tablet camera): JPG, PNG and PDF up to 10 MB each (`isAccepted`, `MAX_IMAGE_MB`; others are refused by name); the **Add N images** dialog gives each file a type (guessed from its name by `guessImageType`: "opg" → Panoramic, a camera photo → Intraoral photo, a PDF → Other) and shared **Taken on**, **Teeth** (FDI numbers, checked by `parseTeeth`) and **Description**; each file then makes its record, is attached to it privately (`attachFile`) and the record points at it, with an upload `ProgressBar` ("Uploading 2 of 3: …"); if one fails, the ones before it are kept. **Compare** picks two images (not PDFs) for `CompareView`, side by side (one above the other on a phone), each with its own zoom, a shared invert and swap. A tile opens `ImageViewer` on all the patient's images (whatever the filter): full screen, zoom (buttons, wheel, + and −, two-finger pinch on a tablet, also while drawing), drag to move, rotate, brightness and contrast sliders, invert, reset, show/hide the drawing, previous/next (arrow keys in the reading direction), full screen, Print (`/xrays/[id]`), and with `edit_patients` **Draw** (`SketchToolbar`: pen, arrow, circle, text, six colours, undo, clear; saved as `annotations`, the image itself never changes), **Details** (`ImageDetailsDialog`) and Delete. A PDF shows in a frame with Open in a new tab. The images are loaded once by the page (`usePatientImages`) and shared with the Dental Chart tab), **History** (`RecordHistory`, open at once). Buttons: New Appointment, New Treatment, Edit, Delete (icon; each by permission) |
| `/patients/[id]/edit` | `edit_patients` | Shared `PatientForm` |
| `/patients/[id]/estimate` | `view_patients` and `view_treatments` | Printable treatment estimate on the clinic letterhead: the patient's Planned and In Progress plans with cost, paid and to pay, totals, a 30-day validity note (`VALID_DAYS`) and signature lines. Linked as **Print estimate** above the Treatment Plans tab |
| `/patients/[id]/statement` | `view_patients` and `view_payments` | Printable statement: every plan that is not Cancelled (cost, paid, left), every payment, total for treatments, total paid and the balance (`total_remaining`). Linked as **Print statement** above the Payments tab |
| `/patients/[id]/chart` | `view_patients` | Printable dental chart: letterhead, patient, `MedicalAlerts`, the chart read-only (Adult/Child switch and hints hidden on paper) and its Findings. Linked as **Print** in the chart header |
| `/xrays/[id]` | `view_patients` | Printable X-ray or photo: letterhead ("Dental image"), patient, date taken, type, teeth, the image with its drawing on top (`SketchCanvas`), and the description. The title is the image's type. Print in the viewer opens it in the same tab |
| `/appointments` | `view_appointments` | Three views, chosen with `?view=day\|week\|list` (default `day`, or `list` when `?date=` is given). **Day**: one column per active doctor, rows from Clinic Settings opening to closing time (stretched to fit), blocks as long as the appointment and coloured by status, overlapping ones side by side, a red "now" line, and striped shading outside each doctor's `start_time`–`end_time`, which are also shown under the name (and in the week view when one doctor is chosen); `?day=YYYY-MM-DD` and `?doctor=` pick the day and one doctor. On phones (`useMediaQuery("(max-width: 639px)")`) the day view shows one doctor at a time with Previous / Next doctor buttons, starting with the first doctor who has patients. **Week**: one column per day (the week starts on `WEEK_STARTS_ON` in `format.ts`, Sunday). Clicking an empty 15-minute slot opens `/appointments/new` with date, time and doctor filled in (needs `add_appointments`). With `edit_appointments`, a Scheduled or Confirmed block can be dragged (mouse, pen or touch; pointer events, `touch-none` on the block) to another time, doctor column or day; a dashed preview snaps to 15 minutes, dropping asks "Move this appointment?" (with the same overlap check, then "Move anyway") and saves `appointment_date`, `appointment_time` and `doctor`. A click without moving still opens the appointment. **List**: search, date filter (All/Today/Tomorrow/Upcoming/Past, also `?date=today`), status filter, paging. The grid is `src/components/AppointmentCalendar.tsx` |
| `/appointments/new` | `add_appointments` | Shared `AppointmentForm`. Reads `?patient=`, `?date=`, `?time=HH:MM`, `?doctor=` and `?reason=`; Back returns to that day in the calendar. Once a doctor and date are chosen, the form shows that doctor's bookings for the day and up to 8 free times that fit the chosen length (within the doctor's own working hours when set, otherwise the clinic hours, and from now for today; tap one to fill in the time) and says when the typed time overlaps. With no `?doctor=`, it starts with the doctor of the last booking made on this computer (`localStorage.last_doctor`). Warns if the doctor already has an overlapping appointment (always checked for a new booking) |
| `/appointments/[id]` | `view_appointments` | `MedicalAlerts` for the patient, details (with **Print Card**), status buttons, Edit and an icon Delete (`edit_appointments`), a **Prescriptions** card (`view_treatments`: the prescriptions written at this visit, and **Write Prescription** with `add_treatments`, which opens `/prescriptions/new` with the patient, the visit and its doctor filled in), a **History** card at the bottom (`RecordHistory`), and WhatsApp messages for this appointment with **Send Message** (`SendWhatsAppDialog`: pick an active template, placeholders filled, text editable, opens `wa.me` with it; shown when Clinic Settings `enable_whatsapp` is on and the patient has a phone). Completed opens `FinishVisitDialog` |
| `/appointments/[id]/edit` | `edit_appointments` | Shared `AppointmentForm` with status |
| `/appointments/[id]/card` | `view_appointments` | Printable appointment card for the patient (date, time, doctor, visit, the clinic phone and address). **Print Card** on the appointment page |
| `/treatments` | `view_treatments` | Search, type and status filters, paging |
| `/treatments/new` | `add_treatments` | Shared `TreatmentForm`. Reads `?patient=` and `?tooth=`. New plans are always `Planned`. Choosing a treatment type fills in its price-list price unless a different cost was typed |
| `/treatments/[id]` | `view_treatments` | `MedicalAlerts` for the patient, a **History** card at the bottom (`RecordHistory`), cost/paid/remaining with a progress bar, details, status buttons, payments of the plan, **Treatment Sessions** (add, edit, delete in a dialog; **Book Visit** opens the booking form with the patient, the plan's doctor and the reason filled in, for Planned and In Progress plans), and the patient's **dental chart** read-only, opened at the plan's tooth (`initialTooth`), loaded with `usePatientChart()`; a **Lab Work** card (`LabWorkCard`, for `LAB_TREATMENT_TYPES` or when something was sent): lab, sent, due back, received, with Send to lab / Edit and one-tap Received today (`edit_treatments`) |
| `/treatments/[id]/edit` | `edit_treatments` | Shared `TreatmentForm` with status |
| `/prescriptions/new` | `add_treatments` | Shared `PrescriptionForm`. Reads `?patient=`, `?appointment=` and `?doctor=` (else the doctor using the app). Patient, `MedicalAlerts`, doctor, date, then one row per medicine (a `fieldset` "Medicine N": medicine from the active Dental Medicines by group, dose, how often (`FREQUENCIES`), days, instructions; choosing a medicine fills its usual values unless the row was already typed in), the **Check before signing** band (`PrescriptionWarnings`, from `prescriptionWarnings()` in `src/lib/prescriptions.ts`: an `allergy_words` word in the patient's allergies, an NSAID with a blood thinner, `avoid_in_pregnancy` with a pregnancy, a patient under 12 with the medicine's `child_note`, `doseMg() × timesPerDay()` above `max_daily_mg`, the same medicine twice; never blocking) and notes. Saves `medicine_name` on each row |
| `/prescriptions/[id]` | `view_treatments` | Printable prescription on the letterhead: patient (with age), doctor, the visit's date and time (a link, screen only), the numbered medicines with dose · frequency · days and instructions, the notes and a signature line; on screen the warnings band above it (`print:hidden`). Print, Edit and an icon Delete (`add_treatments`) |
| `/prescriptions/[id]/edit` | `add_treatments` | Shared `PrescriptionForm` |
| `/payments` | `view_payments` | Search, method filter, date range, paging, total of everything that matches |
| `/payments/new` | `add_payments` | Shared `PaymentForm`. Reads `?patient=&treatment=`. A new payment for a patient with exactly one plan with a balance picks that plan; **Pay full balance** fills the amount. Blocks amounts above what the plan has left |
| `/payments/day` | `view_payments` | End-of-day report for `?date=` (default today): totals per payment method and overall, every payment of the day, a **Cash in the drawer** box (`CashCountCard`): Opening float and Cash counted boxes, Should be in the drawer (float + the day's Cash payments), Matched / Short by / Over by (`compareCash()` in `src/lib/cashCount.ts`), a Note required when short or over, and **Save Count** / **Update Count** (`add_payments`), saved as one **Cash Count** per day with who counted it and when (a notice appears if the day's Cash payments changed after the count); on paper the typed values print, empty ones as lines; Counted by / Checked by lines; and below, **Recent cash counts** (`RecentCashCounts`: the last 14 days counted, each day opening its report) so a manager can look back. Linked from Payments and the Today board |
| `/payments/[id]` | `view_payments` | Printable receipt with clinic details; under it a **Receipt slip** row (`ReceiptSlipControls`): **Print Slip** prints the receipt for a 58 or 80 mm thermal receipt printer (clinic, receipt number, date, patient, what it was for, method, amount, **Left on this treatment** as it was right after this payment (the plan's cost minus its payments up to this one, so a reprint shows the same figure; none for a general payment or a cancelled plan), notes, and "Printed <time> by <user>"; the button waits until that balance has loaded) and **Slip Settings** sets this computer's paper width (58, 80 or 40-120 mm), side margin (0-10 mm) and text size, with **Print Test Slip**, kept in `localStorage.receipt_slip_paper`; a **History** card at the bottom (`RecordHistory`, not printed); Edit/Delete (`add_payments`); **WhatsApp** opens `wa.me` with a short receipt (amount, date, treatment, receipt number and method, and what the patient still has to pay) when `enable_whatsapp` is on |
| `/payments/[id]/edit` | `add_payments` | Shared `PaymentForm` |
| `/reports` | `view_reports`, and Clinic Settings `enable_financial_reports` | Period picker; revenue, count, average, outstanding; revenue by treatment, method and month; latest payments; outstanding balances; CSV export of both; revenue by **doctor** (through each payment's treatment plan; payments without a plan are "General payments") and **Appointments** outcomes up to today (completed, no show, cancelled, still open) with the no-show rate, no-shows out of completed plus no-shows, shown red at 15% or more Three charts (`Charts.tsx`): **Revenue over Time** and **Appointments per Day** (a day per bar up to 45 days, else a month per bar, at most 24 months; cancelled appointments left out; appointments up to today), and **Treatment Plans by Type** (a ring of the plans started in the period, from Frappe's `creation`, not counting cancelled ones). |
| `/doctors` | `manage_users` | Doctor list (search, Active / Not active filter, paging); Add Doctor and Edit in a dialog: name, specialization (`DOCTOR_SPECIALIZATIONS`), phone, email, working hours (`start_time`, `end_time`; both or neither, end after start), **gender** (for the drawn avatar), a **photo** (Upload Photo / Change Photo / Remove Photo, an image up to 5 MB through `uploadFile`, shown as the doctor's `Avatar` in lists, the calendar and the Today board) and Active. No delete: switch Active off |
| `/medicines` | `manage_users` | The medicine list (search, Active filter, paging); Add Medicine and Edit in a dialog: name, strength, form (`MEDICINE_FORMS`), group (`MEDICINE_GROUPS`), the usual dose / how often / days / instructions, and the warning flags (allergy words, daily maximum in mg, note for children, NSAID, avoid in pregnancy) and Active. No delete: switch Active off, so old prescriptions keep their rows |
| `/users` | `manage_users` | Staff list (without Administrator and Guest), search, status filter, Add User dialog (can apply the role's usual permissions) |
| `/users/[id]` | `manage_users` | Clinic role, enable/disable, the 14 permission switches with presets. `[id]` is `encodeURIComponent(btoa(user.name))` |
| `/whatsapp` | `manage_users` | Templates (add, edit, delete, placeholders, live preview) and the message log (phone numbers shown with the middle hidden, `maskPhone()`; the full number is on the patient's page) Each template has a **Language** (Arabic, English or any; `language`), shown on its card; reminders and the Send Message dialog prefer the screen's language (`pickTemplate`). |
| `/settings` | `manage_users` | Clinic Settings: name, logo upload, contact, tax number, currency, working hours, feature switches, theme colour, **Phone Country Code** (`phone_country_code`, digits only, empty means 964; added to local numbers in WhatsApp links, `useSettings().countryCode`), **Price List** (a usual price per treatment type, saved in `treatment_prices`), and **Open on** day toggles saved as `working_days` (`useSettings().isOpenOn(iso)`; nothing set means open every day). Closed days are shaded "Closed" in the calendar, the day view shows a notice, and booking on one shows a note and asks "Book anyway?" The **Language** card: **Default language** (`default_language`, Arabic or English: the language of users who did not choose one) and **Arabic digits** (`arabic_digits`: Arabic screens write ٠-٩). |
| `/profile` | none | My details (with `MyAvatar`), **Screen Size on This Computer** (80, 90, 100, 110 or 120 %: `saveZoom()` sets the root font size, and every size is in rem, so text and spacing scale together; kept in `localStorage.screen_zoom` and applied before the first paint by `ZOOM_BOOT_SCRIPT` in `layout.tsx`), what I can do, change password, and (login off only) Try Another User |

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
| `getDocHistory(doctype, name)` | `GET /frappe/api/method/frappe.desk.form.load.getdoc`: the doc's `owner` and `creation`, `docinfo.versions` (Frappe's Version records, the last 10; Frappe writes their values as formatted text, `150,000.00`, `20-08-2026`, `<br>` for a line break, which `historyValue()` reads) and `docinfo.user_info` (the names of the owner, the last editor and the users in the versions), read through `parseDocHistory()`; a user getdoc does not name shows as their ID | `mockGetDocInfo` (values kept as numbers and ISO dates) |
| `setSessionUser(user)` | nothing (the server knows the user) | `setMockUser`: who owns new docs and makes the changes; `AuthContext` calls it whenever the user changes |
| `uploadFile(file, { onProgress })` | multipart `POST /frappe/api/method/upload_file` with `uploadRequestConfig()` (10-minute limit, `onProgress(0…1)` from axios `onUploadProgress`), returns `file_url` | a data URL, after a pretend send at about 4 MB/s with progress |
| `attachFile(file, doctype, name, { onProgress })` | the same with `doctype`, `docname`, `is_private=1`: a private File attached to the doc; returns the File record | a `File` doc holding a data URL |
| `fileHref(url)` | turns a Frappe file path (`/files/…`, `/private/files/…`) into `/frappe/…` so it goes through the rewrite; use it for every `<img src>` or link to an uploaded file. Other paths (the app's own `/demo/xrays/…`) and full addresses are left alone | data URLs unchanged |
| `login(usr, pwd)` / `logout()` / `initAuth()` | login posts to `/api/method/login` (saving an `x-frappe-csrf-token` response header to `localStorage.csrf_token` if there is one), then asks `getLoggedUser()` and **returns Frappe's user ID**. If Frappe still sees a guest (the check is refused or answers Guest: the browser did not keep the cookie) it throws `LOGIN_NOT_KEPT_MESSAGE`; any other failure of the check (timeout, server down) is thrown as it is; a two-factor answer (`verification` / `tmp_id`) throws `TWO_FACTOR_MESSAGE`, and an expired password (`message: "Password Reset"`) throws `PASSWORD_RESET_MESSAGE` | not mocked |
| `getLoggedUser()` | `frappe.auth.get_logged_user`; the user ID, or `null` for Guest | not mocked |
| `onSessionEnded(listener)` / `onSessionRestored(listener)` / `SessionEndedError` | Frappe answers an expired login with **403 (user Guest), not 401**. On any 401/403 (except the login calls) the axios interceptor asks `getLoggedUser()` once for the whole burst; if it is Guest, every failed call rejects with `SessionEndedError` ("Your session has ended. Please log in again.") and the listeners run once. The first request that works again after that runs the `onSessionRestored` listeners once (for example after logging in in another tab). A real "no permission" stays a 403 | not reached |
| `withReadRetry(read)` / `isRetriableReadError(err)` / `isServerDown(err)` | `getList`, `getCount` and `getDoc` are sent again up to twice (after 0.5 s and 1 s) when **no answer** came back, or the Frappe server was down (the rewrite then answers 502/503/504, or 500 with a plain page instead of Frappe's JSON). Refusals, timeouts and ended logins are never retried, and saves are never retried | not reached |
| `errorMessage(err, fallback)` | turns a failed call into a readable sentence: Frappe `_server_messages` or `exception` without HTML; `Duplicate entry '…'` and `Data too long for column '…'` as plain sentences; 403; a **timeout** (every request has `REQUEST_TIMEOUT_MS` = 15 s, uploads `UPLOAD_TIMEOUT_MS` = 10 minutes, `getList` with `limit: 0` 60 s: a read says "try again", a save says it may still have been saved, an upload says it took more than 10 minutes); the server down; no connection | uses the mock's `Error` text |
| `isNotFound(err)` | true for HTTP 404 or the mock's "… not found" | |

Doctype and doc names are URL-encoded. The axios instance sets `withCredentials: true`.

Rules for data code:

- **Always use these helpers**, or the hooks below. Never add `fetch` or axios calls to pages or components.
- **Doctype names are exact strings with spaces:** `"Patient"`, `"Doctor"`, `"Appointment"`,
  `"Treatment Plan"`, `"Treatment Session"`, `"Payment"`, `"User"`, `"Clinic Permission"`,
  `"Clinic Settings"` (a single; its doc name is also `"Clinic Settings"`), `"WhatsApp Template"`,
  `"WhatsApp Log"`, `"Cash Count"`, `"Dental Medicine"`, `"Prescription"`, `"Dental Image"`.
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
- **Phone numbers** are stored as typed, except that Arabic-keyboard digits become 0-9: every phone box is a
  `PhoneInput` (converts while typing), and the patient and doctor forms convert again on save
  (`toLatinDigits()`). Build WhatsApp links only with `whatsappLink(phone, text,
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
| `usePatientChart(patient)` | The patient's `dental_chart`, `chart_sketch` and `age`, for the chart on a treatment plan |
| `usePatientImages(patient)` | The patient's Dental Images (`IMAGE_FIELDS`), newest first, with `error` and `reload()` |
| `usePatientMedical(patient)` | The patient's medical fields (`MEDICAL_FIELDS`) for `MedicalAlerts` on another record's page |
| `useDoctorList()` | The same, as `{ doctors, loading }`, for screens that would look empty while doctors load (the calendar) |
| `useDebounced(value, ms)` | Waits until typing stops |
| `useMediaQuery(query)` | True while a media query matches (false on the server); e.g. phone-only layouts |
| `usePatientLooks(ids)` | Gender and age of a few patients by ID, for avatars in lists whose rows only hold `patient_name` |

### Getting requests to the real back end

`next.config.ts` rewrites `/frappe/:path*` to `FRAPPE_URL`. The old hand-written proxy
`src/app/api/frappe/[...path]/route.ts` is deleted. See `docs/backend-todo.md` for the CSRF question.
The rewrite's own time limit is `experimental.proxyTimeout` = 610 s (Next's default is 30 s), a little longer
than the app's longest wait (uploads, 10 minutes), so the app's timeout message is the one people see. Keep it above
the timeouts in `src/lib/frappe.ts`.

---

## Mock back end: `src/lib/mockData.ts`

An in-memory store that returns data in the same shape as Frappe's REST API, so pages behave the same with
either source.

- **Seed data** is Iraqi: Iraqi names, addresses in Baghdad (Mahalla / Zuqaq / House) and other governorates (Basra,
  Erbil, Najaf, Babylon), mobile numbers typed the usual ways (`0770 123 4567`, `07801112233`, `+964 772 771 4520`),
  and prices in Iraqi dinars (`currency` IQD; filling 40,000, root canal 150,000, crown 200,000, bridge 600,000,
  extraction 30,000, implant 1,000,000, cleaning 35,000, whitening 250,000 in the price list). 12 patients (Fatima Salman is a 9-year-old child, drawn as a girl; two,
  Suha Majeed and Muhannad Taha, last seen more than six months ago for the recall list; Hiba Kadhim has a dentist's
  recall every 3 months, due 3 days before the app loads, and Shahad Qasim one in January 2027; Muhannad Taha's phone is
  `0770 123 4567` and Yousif Sattar's `07801112233`, which the phone tests rely on), 5 doctors, 24 appointments (December 2025 to September 2026, all five statuses; three of
  them are dated today and tomorrow when the app loads), 15 treatment plans (all four statuses), 10
  treatment sessions, 15 payments (two dated today), 9 users (including `Administrator`, `Guest` and one
  disabled doctor), 3 `Clinic Permission` records (the manager has every permission; the receptionist and
  one doctor have some), the `Clinic Settings` single (currency `IQD`, country code 964, no `theme_color`, so the default indigo shows; doctors and staff users have a `gender` for their avatars), 3 WhatsApp templates, 7 WhatsApp
  log entries, 3 Cash Counts (22 Jul matched, 30 Jul short by 10,000, 18 Aug over by 5,000, counted by Dalia Jawad),
  10 Dental Medicines (`MED-00001` Amoxicillin … `MED-00010` Nystatin, with usual dental doses a dentist must
  check) and 3 Prescriptions (`RX-2026-00001` Zahraa after her root canal, `RX-2026-00002` Saad after his
  extraction with a note about warfarin, `RX-2026-00003` Hassan), and 6 Dental Images (`IMG-2026-00001` …): Zahraa's
  periapicals of 36 before (with a drawing: a circle, an arrow and "Lesion") and after the root canal, a panoramic, a
  bitewing of the left side and an intraoral photo, and Abbas's implant in 46. Their pictures are drawn SVGs in
  `public/demo/xrays/`. Deleting a record also deletes the Files attached to it, like Frappe.
- **Recall:** completing an appointment (created or updated to Completed) moves the patient's `next_recall_date` to
  the visit plus `recall_interval_months`, never earlier (`rollRecall()`), as `Appointment.on_update` should.
- **Cash Count** (`CC-2026-00001`) is checked on save like its `validate()` should: one per day, `cash_payments` = the
  day's Cash payments, `expected_cash` = float + that, `difference` = counted - expected, a note required when it
  is not 0, `counted_by_name` from the User, `counted_at` = now.
- **IDs match the real naming series:** `PAT-2026-00001`, `DOC-00001`, `APT-2026-00001`,
  `TRT-2026-00001`, `SES-2026-00001`, `PAY-2026-00001`, `WAT-00001`, `WAL-2026-00001`, `MED-00001`, `RX-2026-00001`, `IMG-2026-00001`. New docs get the next
  number with the current year. Users are named by `email`, Clinic Permissions by `user` (a duplicate gets
  `" 2"`, `" 3"` …).
- **Fields the server computes or fetches are rebuilt after every write** by `recalculate()`:
  - `patient_name` on Appointment, Treatment Plan, Treatment Session, Payment, WhatsApp Log and Prescription;
    `doctor_name` on Appointment, Treatment Plan, Treatment Session and Prescription; `treatment_type` on Payment;
    `summary` on Prescription (the rows' `medicine_name` joined with ", ").
  - Treatment Plan: `paid_amount` is the sum of its payments. `remaining_amount` is
    `max(0, total_cost − paid_amount)`, or `0` if the plan is `Cancelled`.
  - Patient: `total_treatments`, `total_appointments`, `total_paid`, `total_remaining`.
- **Validation like the back end:** a payment must be above zero and cannot take a plan's paid amount above
  its total cost; a plan's total cost cannot go below what was already paid. A doc that other docs link to
  cannot be deleted ("Cannot delete Patient … because it is linked with …").
- **On create and update:** number fields (`total_cost`, `amount`, `duration_minutes`, `age`, `enabled`,
  `is_active`) become numbers. A Patient gets `age` from `date_of_birth` (a typed `age` is kept when there is no date), and `dental_chart` is stored as
  sent (a JSON string is parsed), like a Frappe JSON field. The seed has both chart shapes on purpose:
  Zahraa, Abbas, Hassan and Saad use version 2; Mustafa, Fatima and Yousif the first shape. A User gets `full_name`, `enabled: 1`, and its `new_password` is not stored.
- **Queries:** operators `=`, `!=`, `in`, `not in`, `like`, `not like` (real SQL LIKE: `%` is any text, `_` one
  character, not case sensitive, and Arabic digits equal 0-9, as in MariaDB's `utf8mb4_unicode_ci`), `is` (`set`/`not set`), `between`,
  `>`, `<`, `>=`, `<=` (numbers compare as numbers, everything else as strings, which works for ISO dates).
  `orFilters`, multi-field `orderBy` (`"appointment_date desc, appointment_time desc"`), `limit`, `start`.
  An unknown operator matches every doc. Empty `fields` or `"*"` returns whole docs.
- **Errors:** `getDoc`, `updateDoc` and `deleteDoc` throw `"<Doctype> <name> not found"` for a missing doc.
  An unknown doctype is not an error: it quietly gets an empty collection.
- **Latency:** every call waits 150 ms so loading states show up. `window.__mockLatency = 1500` (tests and
  screenshots) makes every call wait that long instead (`e2e/tests/loading.spec.ts`).
- **Failing on purpose (tests):** `window.__mockFail = ["Patient"]` makes every read of those doctypes
  (`getList`, `getCount`, `getDoc`) fail with "Cannot reach the server…", so error states can be tested
  (`e2e/tests/load-errors.spec.ts`). Nothing in the app sets it.
- **History:** every create sets `owner`, `creation`, `modified` and `modified_by` (the acting user from
  `setMockUser`), and every update `modified` and `modified_by`. A save of a doctype in `TRACKED_DOCTYPES`
  (Patient, Appointment, Treatment Plan, Payment) that changes fields adds a `Version` (`VER-00001`) with
  `data.changed` rows `[field, old, new]` for the fields that were sent and changed (plus `patient_name`,
  `doctor_name` and `treatment_type` when a Link change changed them), like Frappe's Track Changes. Times get a
  microsecond part that differs on every save (`stamp()`), so `modified` always changes, and deleting a record
  deletes its Versions. A completed visit that moves the patient's next check-up (`rollRecall()`) records a
  Patient Version too. `RecordHistory` shows Link changes by those names (`readableChanges()`).
  Seed records get a creation date and owner (`stampSeeds()`), three seed Versions show changes to
  `PAY-2026-00001` and `TRT-2026-00002`, and `DEFAULTS` gives patients 0 or null for fields they did not set.
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
| **Patient** | `full_name`\*, `gender`, `date_of_birth`, `phone_number`\*, `secondary_phone`, `email`, `address`, `allergies`, `current_medications`, `chronic_diseases`, `medical_history`, `notes`, `dental_chart` (JSON, from the chart), `chart_sketch` † (JSON, a drawing on the adult teeth and one on the child teeth), `age` (only when there is no date of birth), `next_recall_date`, `recall_interval_months`, `no_recall` † (the dentist's recall) | `age` when there is a date of birth, `total_appointments`, `total_treatments`, `total_paid`, `total_remaining` |
| **Doctor** | `full_name`*, `specialization`, `phone_number`, `email`, `start_time`, `end_time` †, `is_active`, `gender` †, `photo` † (on `/doctors`) | |
| **Appointment** | `patient`\*, `doctor`\*, `appointment_date`\*, `appointment_time`\*, `duration_minutes`, `status`, `reason_for_visit`, `notes` | `patient_name`, `doctor_name` |
| **Treatment Plan** | `lab_name`, `lab_sent_date`, `lab_due_date`, `lab_received_date` † (Lab Work card), `patient`\*, `doctor`, `treatment_type`\*, `tooth_number` (FDI number from a dropdown), `total_cost`\*, `diagnosis`, `treatment_notes`, `status` (edit only; new plans are `Planned`) | `paid_amount`, `remaining_amount`, `patient_name`, `doctor_name` |
| **Treatment Session** † | `patient`, `treatment_plan`, `doctor`, `session_date`\*, `session_time`, `status`, `notes` | `patient_name`, `doctor_name` |
| **Payment** | `patient`\*, `treatment_plan`, `payment_date`\*, `amount`\*, `payment_method`\*, `notes` | `patient_name`, `treatment_type` |
| **User** (Frappe core) | `email`, `first_name`, `enabled`, `new_password` (create only), `send_welcome_email: 0`, `roles: [{ role }]` | `full_name`, `gender` and `user_image` (for the avatar) |
| **Clinic Permission** | `user` plus 14 flags set to `0` or `1` | |
| **Clinic Settings** † (single) | `clinic_name`, `logo`, `phone`, `email`, `address`, `tax_number`, `currency`, `opening_time`, `closing_time`, `theme_color`, `enable_whatsapp`, `enable_patient_portal`, `enable_financial_reports`, `treatment_prices` † (child table rows `{ treatment_type, price }`; `useSettings().prices` is the lookup), `phone_country_code` † | |
| **WhatsApp Template** † | `template_name`, `trigger`, `message`, `is_active` | |
| **Cash Count** † | `count_date`\*, `opening_float`, `cash_counted`\*, `note` (required when short or over), `counted_by` | `cash_payments`, `expected_cash`, `difference`, `counted_by_name`, `counted_at` |
| **Dental Medicine** † | `medicine_name`\*, `strength`, `dosage_form`, `medicine_group`, `default_dose`, `default_frequency`, `default_duration_days`, `default_instructions`, `allergy_words`, `is_nsaid`, `avoid_in_pregnancy`, `max_daily_mg`, `child_note`, `is_active` (on `/medicines`) | |
| **Prescription** † | `patient`\*, `doctor`\*, `appointment`, `prescription_date`\*, `notes`, `medicines` (rows `{ medicine, medicine_name, dose, frequency, duration_days, instructions }`) | `patient_name`, `doctor_name`, `summary` |
| **Dental Image** † | `patient`*, `image_type`* (`IMAGE_TYPES`), `taken_on`*, `teeth` ("36,37"), `description`, `file_name`, `image` (the attached file's URL, set after the upload), `annotations` (JSON, the drawing) | `patient_name` |
| **WhatsApp Log** † | none (read: `patient`, `appointment`, `phone_number`, `status`, `sent_at`, `message`, `error_message`) | `patient_name` |

\* = required in the form.

Allowed values live in `src/lib/types.ts`. Keep form options, badge colours (`STATUS_TONES` in
`components/ui/index.tsx`) and mock data in line with them:

- Appointment `status`: `Scheduled`, `Confirmed`, `Completed`, `Cancelled`, `No Show`
- Treatment Plan `status`: `Planned`, `In Progress`, `Completed`, `Cancelled`
- Treatment Plan `treatment_type`: `Filling`, `Root Canal`, `Crown`, `Bridge`, `Extraction`, `Implant`, `Cleaning`, `Whitening`
- Treatment Session `status` †: `Scheduled`, `Completed`, `Cancelled`
- Payment `payment_method`: `Cash`, `Card`, `Bank Transfer`
- Dental Medicine `dosage_form`: `MEDICINE_FORMS`; `medicine_group`: `MEDICINE_GROUPS`; a prescription row's `frequency`: the values of `FREQUENCIES` in `src/lib/prescriptions.ts`
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
| Treatments | `view_treatments`, `add_treatments`, `edit_treatments` | menu, pages; status, Edit, Delete and sessions need `edit_treatments`; prescriptions are read with `view_treatments` and written, changed and deleted with `add_treatments` |
| Finance | `view_payments`, `add_payments`, `view_reports` | Payments menu and pages, balances and money cards; Add, Edit and Delete payments need `add_payments`; Reports needs `view_reports` |
| System | `manage_users` | Doctors, Medicines, Users, WhatsApp and Settings pages and menu items, the settings icon |

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
  shows a toast and navigates; the form shows `errorMessage(err)` if it throws. A check of one field (age,
  amount, cost) shows its message under that field instead: `<Field error={…}>`, `aria-invalid` on the input
  (it turns red through `inputClass`), `focusField(form, name)` to move to it, and the message cleared when
  the field changes.
- **Unsaved changes:** every form renders `<UnsavedChangesGuard when={dirty} />` (`src/components/`), where
  `dirty` compares the form with its starting values and turns false once saved. It asks before closing the
  tab and before following any in-app link; navigation in code (`router.push` after a save) is not stopped.
- **Loading:** lists show `<TableLoading colSpan={…} />` (skeleton rows with a hidden "Loading..." that
  screen readers and `waitForData()` use); record pages (patient, appointment, treatment plan, payment) show
  `RecordLoading`, a pulsing outline of the page, so it does not jump when the record arrives; other pages
  and cards show `PageLoading`.
- **A failed load never looks like "nothing there".** In a list, check `list.error` first and show
  `<TableError colSpan={…} message={list.error} onRetry={list.reload} />` instead of the rows or the empty
  message, and hide `Pagination` (`{!list.error && <Pagination … />}`). A page or card that loads its own
  numbers keeps an error state and shows `<LoadError message={…} onRetry={…} />` (Try Again bumps a
  `version` in the effect's dependencies, and clears the error so the loading state shows while it retries),
  and shows no zeros for numbers it never got (dashboard, Today board, recall list, the bell, the day report,
  Reports, and the related lists on the patient and treatment plan pages). `usePagedList` hides `error` and
  sets `initialLoading` while it loads again after an error, so Try Again shows the loading rows. An empty message caused by a search or filter has a `<ClearFiltersButton>`
  that resets them; "No patients yet." is only for a list that really is empty.
- **Contrast:** readable text is `text-gray-500` or darker (4.8:1 on white). `text-gray-300`/`400` only for
  decoration and disabled things. Links and other focusable things get a primary focus ring from
  `globals.css`; `MainLayout` has a "Skip to content" link to `#main`.
- **Finishing a visit:** marking an appointment Completed (appointment page or Today board) opens
  `FinishVisitDialog` for users with `edit_treatments`: pick one of the patient's open plans, write what was
  done (saved as a Completed Treatment Session dated like the appointment), and optionally mark the plan
  Completed; a Planned plan moves to In Progress. With no open plan it offers New Treatment Plan. With
  `edit_patients` it also asks for the **Next check-up** (`RECALL_CHOICES`, counted from the visit; saved only
  when changed). Skip is always there.
- **Detail page headers** hold at most three actions: the main one (Edit), one or two secondary ones, and
  Delete as an icon button with an `aria-label`. Actions about one part of the page go in that card's header.
- **Messages:** `useToast().success/error/info`. They appear bottom-right, and under the top bar on phones. Never use `alert()`. Ask before deleting with
  `ConfirmDialog`.
- **Medical safety:** every screen where treatment is decided or done shows `<MedicalAlerts patient={…} />`
  near the top (patient, appointment and treatment plan pages, and under the Patient field of the booking
  and treatment forms once a patient is picked). Load the fields with
  `usePatientMedical()` or add `MEDICAL_FIELDS` to your query. Never hide it behind a tab.
- **Money** always goes through `useSettings().money(amount)`, which uses the clinic currency (Latin digits;
  IQD, in `WHOLE_UNIT_CURRENCIES` in `format.ts`, never shows decimals: `IQD 1,250,000`). Dates and
  times go through `formatDate`, `formatTime`, `formatDateTime`; today is `todayISO()` (local time).
- **Links** to records use `patientHref`, `appointmentHref`, `treatmentHref`, `paymentHref`, `userHref`.

### The UI kit (`src/components/ui`)

`PageContainer` (`narrow` for forms; `section` colours every icon tile and chart inside), `PageHeader` (title, subtitle, back link, actions, badge, `avatar`, or `icon` + `section`: the screen's icon in a gradient tile; give every screen one), `Card`
(`flush` for tables; `icon` draws a lucide icon, or `ToothLogo`, in a small coloured tile before the title, via
`CardIcon`: give every titled card on a record page one; `section` gives the card the colour of a part of the clinic), `CARD_CLASS` (the card look, for boxes that are not a `Card`), `IconTile` (an icon in a coloured rounded tile; `hue`, sizes sm, md, lg), `hueClass(hue)`, `StatCard` (`section` for its colour, `order` for the rise-in delay), `ActionTile` (a large tile for an everyday job, with a hint; `section`, `order`), `Badge`, `StatusBadge` (kinds: appointment, treatment, session, method,
whatsapp, trigger, user) and `statusTone(kind, status)` for other views that must match the badge colours,
`Button` and `LinkButton` (primary, secondary, danger, ghost, success; sm, md; `icon`, `loading`),
`Segmented` (joined view switch, e.g. Day / Week / List), `FormActions` (sticky Save / Cancel bar), `Field` (label wrapping one input; `error` for a failed check; the label takes the clinic colour while focused) and `focusField()`, `TextInput`,
`NumberInput` (every amount, price or age box; `decimals={false}` for whole numbers), `PhoneInput` (every phone box),
`SelectInput`, `TextArea`, `Toggle`,
`SearchInput`, `Toolbar`, `Table`, `Th`, `Td` (with `label` for the phone cards), `ClickableRow`, `TableLoading`, `TableMessage`, `TableError` (a failed list load with Try Again), `ClearFiltersButton`, `LoadError` (a failed page load with Try Again), `Pagination`, `DetailList` and
`DetailRow` (label beside the value when the card is at least 20rem wide, above it in a narrower card: a container query on `DetailList`), `Tabs`, `Alert`, `Spinner`, `ProgressBar` (0-100 with a label and percentage, or `showLabel={false}`; uploads and the plan's paid bar), `PageLoading`, `RecordLoading`, `EmptyState`, `NoAccess`, `NotFoundCard`; plus
`Modal` (moves focus in, traps Tab, restores focus on close, Escape closes, locks page scroll; with two open, only
the newest reacts to Escape and Tab; `priority` puts it above other dialogs) and `ConfirmDialog` (focus starts on Cancel) in `Modal.tsx`, and `LinkSelect` for searchable Link fields. Use these instead of
writing new class lists.

### Styling

- **The design ("Midnight", chosen by the owner on 2026-09-30).** Indigo clinic colour, cool slate greys (the `gray`
  scale in `globals.css` is Tailwind's slate), a dark night-blue menu (`Sidebar`) with glowing gradient icon tiles,
  a gradient welcome banner on the dashboard, white cards with a thin border (`CARD_CLASS`; a card with a `section`
  gets a 3 px top edge in its colour), white stat cards with a coloured bottom edge, gradient action tiles with white
  text, gradient primary buttons, and pill tabs in a white bar. Font: Manrope.
- **Section colours.** Each part of the clinic has its own colour: `patients`, `appointments`,
  `treatments`, `money`, `reports`, `system` and `whatsapp` (`Section` in the UI kit). A `sec-patients` (etc.)
  class, written for you by `hueClass()`, sets `--sec` for everything inside, and `bg-sec`, `bg-sec-soft`,
  `bg-sec-light`, `text-sec-ink` (readable text), `from-sec`, `to-sec-deep` use it. Pass `section` to `Card`,
  `StatCard` and `ActionTile`, or `hue` to `IconTile` (a `Tone` works too: `sec-red`, `sec-green` …). Write the
  class names out in full (`hueClass` does): Tailwind only builds classes it can find in the code.
- **Every screen carries its section's colour**: `<PageContainer section="patients">` and `<PageHeader icon={Users} section="patients">`
  (printouts only the container). Lists show the patient with `<PatientLink id name look />` (`Avatar.tsx`, looks from
  `usePatientLooks`), cards on record pages have an `icon`. `BarChart` turns compact after 12 bars (thin bars,
  values in the tooltips, every few labels).
- **Avatars:** show a person with `<Avatar name gender age photo role="doctor" size />` (`src/components/Avatar.tsx`)
  or `<MyAvatar />` for the user. They are `aria-hidden`, so always write the name next to them. Patients under 13
  are drawn as children. Details (skin tone, hair, beard, headscarf, glasses) come from the name, so they never
  change between screens.
- One visual style everywhere: white cards (`Card`, or `CARD_CLASS`) on the page background (`app-bg`, `--page-bg`),
  `rounded-xl` inputs and buttons, the `primary-*` colour, lucide icons in coloured tiles. No emoji titles.
- **Colour: use `primary-50` … `primary-900` for anything that is "the clinic colour"** (buttons, links, active
  menu items, focus rings, highlights). Never write `blue-*` for that. The palette is mixed from one CSS variable,
  `--brand`, which `SettingsContext` sets from Clinic Settings `theme_color` through `applyThemeColor()`
  (`src/lib/theme.ts`). A colour too light for white text is darkened to 4.5:1 contrast. With no `theme_color` (the
  dummy data has none) the default indigo `#4f46e5` (`DEFAULT_THEME_COLOR`) is used; Settings offers it as the first
  swatch, "Default colour". A script in `layout.tsx` applies the
  last colour before the first paint. `blue` stays only as a
  status tone (see Badge colours). The `Tone` type also has `primary`; `StatCard` uses it by default.
- **Text sizes:** `--text-xs` is 13 px and `--text-sm` is 15 px (a little larger than Tailwind's default, for
  reading at a distance). Page titles `text-2xl font-bold`, card titles `text-base font-semibold`, body
  `text-sm`, hints and table headers `text-xs`. Do not add other sizes for ordinary text.
- **Motion is short and calm, and only `motion-safe:`.** A new page fades in while lifting 6 px
  (`animate-page-in`, 0.22 s, on a wrapper keyed by the path in `MainLayout`), buttons shrink to 98 % while
  pressed, and clickable cards (`StatCard` with `href`, `ActionTile`) lift 1 px on hover. Stat cards, action
  tiles and the Today counts rise 10 px into place one after another (`animate-rise`, 0.4 s, `order` sets the
  delay), chart bars grow from the axis (`animate-grow-up`), and the banner's tooth bobs 4 px (`animate-bob`). All
  use fill mode `backwards` (or loop on a small decoration), so nothing is left transformed. The page animation
  uses fill mode `backwards` so no transform stays on the page afterwards: a transform on an ancestor makes the
  page's `position: fixed` dialogs cover only that ancestor (`e2e/tests/motion.spec.ts` checks it). Do not add
  longer or bigger animations.
- **Touch targets are at least 44 px.** `Button` md, inputs, tabs and menu links have `min-h-11`; small
  buttons and icon buttons grow to 44 px on touch screens with the `pointer-coarse:` variant. Do the same for
  any new clickable thing.
- **Phones:** below the `sm` breakpoint every `Table` turns its rows into cards. Give each `Td` except the
  first (the row's name or date) and action cells `label="…"` with the same text as its `Th`; empty cells
  are hidden. End every form with `<FormActions>` (a Save / Cancel bar that sticks to the bottom of the
  screen). Inputs use 16 px text on phones so iPhones do not zoom in.
- **Number and phone boxes:** use `NumberInput` and `PhoneInput`, never `type="number"`. Iraqi keyboards type
  Arabic-Indic digits (٠-٩) even in an English screen; `type="number"` quietly empties itself on them.
  `NumberInput` is a text box (`inputMode` decimal or numeric, `dir="ltr"`) that keeps only the number while
  typing (`cleanNumberText()`: Arabic digits become 0-9, `٫` becomes `.`, separators are dropped), so
  `onChange` gets `"1250000"` for `١٬٢٥٠٬٠٠٠`; two or more dots count as thousands separators. Money boxes
  pass `decimals={currencyDecimals(currency) > 0}`, so IQD boxes take whole dinars only ("1.500" → "1500").
  `PhoneInput` only turns Arabic digits into 0-9. Both put the cursor back where it was after cleaning. They
  check no min or max: forms check limits when saving (age 0-120, cost a number, amount above 0).
- **CSV exports** go through `downloadCsv()` (`format.ts`), which adds a UTF-8 BOM (Arabic opens right in Excel) and
  puts a `'` before a text cell that starts with `=`, `+`, `-` or `@` (`csvSafe()`), so a name cannot run as a
  formula. Pass amounts as numbers, not formatted text.
- Empty lists: `<TableMessage icon={SomeIcon}>` or `<EmptyState>` show a small drawing; keep the text short.
- Tailwind utility classes go inline; `globals.css` only holds the import, the tokens and body colours.
- **Use logical classes** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`,
  `border-e`) instead of left/right, so a right-to-left (Arabic) layout can be added later. Arrow icons that
  point sideways carry `rtl:rotate-180`.
- Add `print:hidden` to anything that should not appear on paper. Printouts (receipt, estimate, statement,
  day report) put `ClinicLetterhead` at the top of a `Card` with `print:shadow-none print:border-0`, and
  give tinted boxes `print:bg-white print:border` so they survive printers that drop backgrounds.
- **Receipt slips** (thermal printers) are not a printout of the page: `buildReceiptSlip()` in
  `src/lib/receiptSlip.ts` builds a small HTML page of its own (every value escaped, every size from the paper
  settings, black on white, system fonts) and `printHtml(html, { pageWidthMm })` prints it through a hidden
  frame (`data-print-frame`). CSS has no "as long as the content" page size, so `printHtml` measures the slip
  and adds `@page { size: <width>mm <length>mm }` before printing. While a print is open, more calls are
  ignored (a double click prints once); the frame is removed after `afterprint` (or 60 s) and focus goes back
  where it was. The print dialog opens on the printer used last. Tests capture it by replacing `window.print`
  in child frames with `page.addInitScript`, sending `afterprint` like a browser (see
  `e2e/tests/receipt-slip.spec.ts`).
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
- **X-rays on the chart:** pass `images` (from `usePatientImages`): a tooth with images gets a small picture marker
  (`data-xray-marker`) by its number, and its panel lists them as thumbnails that open the viewer (`patientName`,
  `onImagesChanged`).
- **Sketch:** with `onSaveSketch` (and `edit_patients`) a **Sketch** button draws on the chart with the same tools as the
  X-ray viewer (`SketchCanvas` over the teeth area, which stays left to right); it is saved in `Patient.chart_sketch` with
  one drawing per set of teeth (`ChartSketch`: `{ version: 1, adult, child }`, read with `parseChartSketch`, saved with
  `chartSketchToSave`); each shows on its own teeth, also on the printed chart, and the chart itself never changes. The
  Adult / Child switch is hidden while drawing, and a drawing not saved yet counts as unsaved work. The History card
  says the sketch changed without its values (`WITHOUT_VALUES` in `history.ts`). Pass `sketch` to show it read-only.
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

Updated on 2026-09-30.

- **The back end does not have everything yet.** `Patient.dental_chart`, the `*_name` fetch fields,
  read permissions and several field names must be added or confirmed. See `docs/backend-todo.md` (section 9
  is the full field list).
- **Totals are computed in the browser.** The dashboard's revenue and amount owed, the payments total and the
  reports load every matching row (`limit: 0`) and add them up. That is fine for one clinic for years, but a
  back-end report method would be faster later.
- **Data stays in the language it was typed in.** Patient names, notes and medicine names in the dummy data are in
  English letters, so Arabic screens show them as they are. Fixed values (statuses, types, methods) are saved in
  English and only their labels are translated.
- `enable_patient_portal` is saved but not used by the front end.
- Deleting is blocked for records that others link to (Frappe's normal rule). Users are disabled, not deleted.

---

## Languages: `src/i18n`

Arabic is the default language and reads right to left; English is the other. Everything a person reads comes
from the translation files, never from text typed in a component.

- **Files.** One pair per area: `src/i18n/en/<area>.ts` (`export const <area> = { … }`) and
  `src/i18n/ar/<area>.ts` (`export const <area>: Messages["<area>"] = { … }`). `Messages` is the type of the
  English object, so an Arabic text that is missing, or a function with other arguments, fails the type check.
  Texts with values are functions: `` greeting: (hello: string, name: string) => `${hello}, ${name}` ``. Add a new
  area to both `index.ts` files. Shared areas: `common` (save, cancel, years …), `nav` (menu, search), `enums`
  (labels of saved values), `errors`, `dates` (month and day names), `ui` (the UI kit), `dashboard`.
- **Reading texts.** In a component: `const { t } = useI18n();` then `t.patients.title`. In plain functions,
  effects, callbacks and `lib/*.ts`: `messages()` from `@/i18n` (never put `t` in an effect's dependencies).
  Module-level constants must not hold text; hold keys and look them up when drawing.
- **Saved values stay English** (statuses, treatment types, payment methods, genders, specializations, medicine
  forms and groups, frequencies, triggers, week days, roles). Show them with `label(t.enums.treatmentType, value)`;
  `<StatusBadge>` and `statusLabel(kind, status)` do it for statuses. In a `<select>` the value stays English.
- **Numbers.** `num(n)` writes a number in the current digits, `plural(n, forms)` a count with its noun (`#` is the
  number). Arabic has six forms: `zero`, `one`, `two`, `few` (3-10), `many` (11-99), `other` (100+); English
  `one` and `other`. Clinic Settings → **Arabic digits** (`arabic_digits`) makes Arabic screens write ٠-٩; inputs
  still take and keep 0-9 (`cleanNumberText`), and phone numbers and record IDs stay 0-9.
- **Dates and money** follow the language by themselves: `formatDate` ("8 أيلول 2026", the Iraqi month names),
  `formatTime` ("10:00 ص"), `formatLongDate`, `formatMonth`, `weekdayShort`, `useSettings().money`
  ("1,250,000 د.ع"), `formatCompact` ("450 ألف").
- **Which language.** In order: the user's own choice (`User.language`, saved by the switch in the menu), the
  language chosen on this computer (`localStorage.language_choice`), the clinic's default (Clinic Settings →
  **Default language**, `default_language`), Arabic. `LANG_BOOT_SCRIPT` sets `lang` and `dir` on `<html>` from the
  language shown last (`localStorage.language`) before the first paint.
- **Right to left.** `<html dir="rtl">` in Arabic. Use logical classes only (`ms-`, `pe-`, `start-`, `text-end`,
  `border-s` …), give sideways arrows `rtl:rotate-180`, and slide things in from the start side
  (`-translate-x-full rtl:translate-x-full`). Phone numbers, record IDs, amounts and times in inputs, and the dental
  chart's teeth (anatomical: the patient's right is always on the left) keep `dir="ltr"`.
- **Fonts.** Manrope for English, IBM Plex Sans Arabic for Arabic (`next/font`, `--font-manrope` and
  `--font-arabic`; `globals.css` picks by `lang`).
- **WhatsApp templates** have a `language` (`ar`, `en` or empty): `pickTemplate(templates, trigger, lang)` in
  `src/lib/whatsapp.ts` prefers the screen's language. The dummy data has each template in both languages.
- **Tests.** The browser tests run in English: `e2e/fixtures.ts` sets the language chosen on the computer to `en`
  (and `setLocale("en")` for helpers called outside the browser). A test in Arabic says `test.use({ lang: "ar" })`
  (see `e2e/tests/arabic.spec.ts`). `waitForData()` understands both loading texts.
- **Adding a text:** put it in the English file and the Arabic file of its area (clear Modern Standard Arabic as
  Iraqi clinic staff use it; dental words: حشوة، علاج عصب، تاج، جسر، قلع، زرعة، تنظيف، تبييض; FDI tooth numbers stay
  numbers), then read it with `t` or `messages()`. Never change an English text that a test looks for without
  updating the test.

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

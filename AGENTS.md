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
| Data source | **Dummy data**, written in Arabic as the clinic would type it. Every read and write goes to an in-memory store. No back end needed. | `MOCK_DATA = true` in `src/lib/frappe.ts` |
| Login | **Off.** A stand-in `Administrator` session is used and logout buttons are hidden. `/profile` has a **Try Another User** card to see the app with another user's permissions. The login page sits in a private folder, so `/login` is not a route. | `AUTH_DISABLED = true` in `src/context/AuthContext.tsx`; page in `src/app/_login/page.tsx` |
| `npm run dev` | Works. Dev output goes to `.next/dev`, so `npm run build` can run while it is up. Changing `next.config.ts` restarts it, and the first page after that can take several minutes to compile. | |
| `npm run build` | **Passes** (checked 2026-10-01): compiles, type-checks and prerenders every route, with no warnings. | |
| `npm run lint` | **Passes** with 0 problems (checked 2026-10-01). `npx tsc --noEmit` passes too. | |
| Languages | **Arabic (default, right to left) and English.** Every text is in `src/i18n/en/*.ts` and `src/i18n/ar/*.ts`; the switch is in the menu. See **Languages** below. **Every new text must be added in both languages.** | `src/i18n/`, `src/context/LanguageContext.tsx` |
| Tests | **Playwright tests pass** (214 tests, 24 of them in Arabic, checked 2026-10-01; run them with `--workers=2` on the owner's machine, never while a build runs): one file per area in `e2e/tests/` (patients, booking, calendar, Today board, treatments, payments, prescriptions, printouts, permissions, WhatsApp, X-rays, two currencies, expenses and profit, the waiting room, QR codes, the printed patient file, prescription paper, the activity log, the installable app, Arabic typography, the app's own form controls and hints, phone numbers, the form dialogs and more). Pure helpers such as `src/lib/phone.ts` are tested in the same runner without a browser. No CI. | `e2e/`, `playwright.config.ts` |
| Screen review | **Done 2026-10-01, before the back end:** every page and dialog as a receptionist, a dentist and a manager, in Arabic and English, light and dark, at desktop, tablet and phone size, checked in the page (cut off, sticking out, untranslated, drawn by the browser, contrast, touch size) and by eye. The script is `e2e/screens/final.local.spec.ts` (git-ignored, local only; 36 combinations, about 2 hours with 2 workers, and it needs free memory: on the owner's machine it was stopped once for low memory). Arabic names on English screens are expected (the data is Arabic). | `screenshots/final/` (git-ignored) |

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
| `npm run screenshots:design` | The current redesign's "after" pictures (main screens in English at desktop, tablet and phone size, plus desktop in dark mode) into `docs/design-changes/2-clean/after/`; `SHOTS=before` retakes the "before" side, `DESIGN=` picks another folder. `SKIP_BUILD=1` works here too |
| `npm run screenshots:fonts` | The font comparison the owner chose from (IBM Plex, 2026-10-01): the dashboard and a patient page in IBM Plex Sans Arabic, Cairo, Tajawal and Readex Pro, in Arabic and English, into `docs/fonts/` (the candidates come from Google Fonts for these pictures only). `SKIP_BUILD=1` works here too |

The Frappe address comes from the `FRAPPE_URL` environment variable (for example in `.env.local`), default
`http://dent_clinic.localhost:8000`. See `next.config.ts`.

---

## Three ways to install: `DEPLOYMENT_MODE`

One app, sold three ways. The mode is an environment variable read by `next.config.ts` when the app is **built**
(`env` there puts it into the browser code; a wrong value stops the build). `src/lib/deployment.ts` has the modes and
helpers, and `useDeployment()` (`src/context/DeploymentContext.tsx`, the outermost provider) gives screens the mode.

| Mode | What it is | What changes in the app |
|---|---|---|
| `cloud` (default) | Online, one Frappe site per clinic | With `CLOUD_DOMAIN`, the clinic comes from the web address and the main address is the public website (below) |
| `clinic-server` | A small computer inside the clinic, no internet needed | Nothing is fetched from other websites; WhatsApp buttons say "Needs internet" while the server has none (below) |
| `cloud-copy` | The online copy of a clinic server, for the owner at home | Everything view-only: a banner says so and when the copy was last updated; no add, edit or delete anywhere (below) |

- **Cloud, many clinics:** `CLOUD_DOMAIN` (e.g. `dentclinic.example`) is the main address; each clinic is
  `<name>.CLOUD_DOMAIN`. `next.config.ts` matches the host (`has: [{ type: "host" }]`, the name captured as `:clinic`)
  and sends that clinic's `/frappe/…` to `CLINIC_SITE_URL` with `{clinic}` filled in (default
  `http://{clinic}.localhost:8000`, one bench site per clinic); the main address, `www.` and anything else go to
  `PLATFORM_SITE_URL` (the platform's own site; default `FRAPPE_URL`). A clinic name is 3-30 lowercase letters, digits
  and hyphens, starting with a letter (`isValidClinicAddress()`; `www`, `admin`, `api`, `app` and `mail` are kept
  back); `CLINIC_SLUG` in `next.config.ts` is the same rule, keep them equal. Without `CLOUD_DOMAIN` the cloud serves the
  one clinic at `FRAPPE_URL`, like before. `/` redirects the main address to `/site` (the public website, in
  `PUBLIC_PATHS` of `MainLayout`: no login, no menu), and `MainLayout` sends any other page there too; the login page
  shows the clinic's address. To try it locally: `CLOUD_DOMAIN=localhost`, then `localhost:3000` is the main address
  and `alnoor.localhost:3000` the alnoor clinic (`allowedDevOrigins` lets the dev server accept them).
- **Clinic server, no internet:** the app never loads anything from another website (fonts, scripts and images are
  its own; `e2e/tests/clinic-server.spec.ts` records every request and fails on one that leaves the app). The only link
  out is WhatsApp (`wa.me`): always use `<WhatsAppButton href onOpen size>` (`src/components/WhatsAppButton.tsx`). When
  `useConnectivity().internet` is false it is a disabled button that says "(Needs internet)" and runs nothing, so a
  reminder marked as sent by `onOpen` stays in its list until it can really be sent; the Today board's reminders card and
  the Send Message dialog also say so in an `Alert`. `internet` comes from the server (`SERVER_METHODS.status` →
  `internet`) in clinic-server mode, and is simply the browser's network everywhere else.
- **View-only (`useSession().readOnly`):** a reason (`"copy"` on the cloud copy; more come later) or null. While it is
  set, `can()` refuses every permission that changes data (`add_*`, `edit_*`, `delete_*`), so buttons gated by them
  disappear by themselves. Pages that need only `manage_users` stay readable and check `readOnly` themselves: Doctors,
  Medicines, Users and WhatsApp hide Add and Edit, the activity log hides Restore, Settings and a user's account and
  permissions sit in a `<fieldset disabled>` (the tabs above still switch) with no Save bar, and My Profile says
  passwords are changed at the clinic. The language choice is kept on the computer only. `ReadOnlyBanner` (in
  `MainLayout`, above every page) says why; for the copy: "View-only copy. Last updated …" from the server's
  `cloud_copy.last_sync`. As a safety net `createDoc`, `updateDoc`, `deleteDoc`, uploads, Restore and the password
  change throw `ReadOnlyError` before sending anything on a cloud copy. **A new button that changes data must be gated by
  an add/edit/delete permission, or check `readOnly`.**
- **Connectivity** (`src/context/ConnectivityContext.tsx`, `useConnectivity()`): `browserOnline`, `server` (`ok`,
  `unreachable`, `checking`: every request reports through `onConnectionChange()` in `src/lib/frappe.ts`), `internet`,
  and `status` (the server's answer about itself: its clock, the internet, the cloud copy), asked every 30 seconds (10
  while unreachable). A failed request that never reached the server is `isConnectionLost(err)`.
- **Pretend switches (dummy data only, `src/lib/demo.ts`):** `demo_no_internet` (the clinic server has no internet) and
  `demo_server_down` (every request fails as if the network were down), on My Profile, read only when `MOCK_DATA`.
  Every dummy-data call goes through `viaMock()` in `frappe.ts`, which reports the connection and fails while the
  server is "down". The parts that sell and run DentClinic (`dent_app.*` methods) are answered by
  `src/lib/mockPlatform.ts`, the clinic's own records by `mockData.ts`.
- **Previewing a mode (dummy data only):** `/profile` → **Preview a Way of Installing** saves the mode in
  `localStorage.demo_deployment_mode` and reloads; `currentMode(MOCK_DATA)` (and `useDeployment()`) read
  it. With a real back end only the built mode counts. Tests set the same key with `page.addInitScript`.
- Never read `process.env.DEPLOYMENT_MODE` in a component: use `useDeployment().mode` (the preview, and the first
  render matching the server's).

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js **16.2.9**, App Router, Turbopack |
| UI | React **19.2.4**, TypeScript 5 with `strict: true`, path alias `@/*` → `src/*` |
| Styling | Tailwind CSS **v4** via `@tailwindcss/postcss`. It is CSS-first: no `tailwind.config.*`; the design tokens (the `primary-*` palette and the text scale) are an `@theme` block in `src/app/globals.css` |
| Font | One family in both languages: IBM Plex Sans for English and IBM Plex Sans Arabic for everything in Arabic (headings too, and Latin letters inside Arabic screens). The font files are part of the app (`public/fonts/`, their `@font-face` rules and the `--font-plex` and `--font-arabic` variables in `src/app/fonts.css`, preloaded in `layout.tsx`); nothing is fetched from Google. The owner chose IBM Plex on 2026-10-01 from four fonts compared in `docs/fonts/` |
| Icons | `lucide-react` everywhere; the tooth logo is our own SVG in `src/components/ToothLogo.tsx` |
| HTTP | `axios`, one instance in `src/lib/frappe.ts` |
| QR codes | `qrcode-generator` makes the grid (`qrMatrix()` in `src/lib/qr.ts`, drawn as our own SVG by `QrCode.tsx`); `jsqr` reads camera frames where the browser has no `BarcodeDetector` (loaded only then) |
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
  `error.tsx`, no `proxy.ts` (the Next 16 name for middleware). `src/app/manifest.ts` is the web app manifest
  (`/manifest.webmanifest`).
- **Installable app (PWA).** `src/app/manifest.ts` (name, `start_url` `/dashboard`, standalone, the clinic violet,
  icons in `public/icons/`, shortcuts to Today, Appointments and Patients), the icons and title for iPhone in
  `layout.tsx` (`appleWebApp`, `viewport.themeColor`), and `public/sw.js`, registered by `ServiceWorkerRegister`
  (`src/components/InstallApp.tsx`) in the **production build only** (never under `npm run dev`). The service
  worker caches only `public/offline.html` (Arabic and English) and its icon: when opening a page fails with no
  connection it shows that page; everything else, and all data (`/frappe/…`), goes to the network untouched. Bump
  `CACHE` in `sw.js` when the offline page changes. `InstallAppCard` on `/profile` shows **Install the App** when the
  browser offers it (`beforeinstallprompt`, kept for the button), how to install otherwise (Share → Add to Home
  Screen on iPhone and iPad), or that it is installed. The PNG icons are rendered from `icon.svg` and
  `icon-maskable.svg`; redraw them from the SVGs (at 192, 512, maskable 512 and Apple 180) when the logo changes.
  Installing needs HTTPS (or localhost).
- **Provider tree** (in `layout.tsx`): `DeploymentProvider` → `AuthProvider` → `SettingsProvider` → `ConnectivityProvider` → `SessionProvider` →
  `ToastProvider` → `LanguageProvider` → `MainLayout` → page. `LanguageProvider` keys its children by the language,
  so everything below is drawn again when it changes.
- **Shell.** `MainLayout` draws the `Sidebar` (fixed, z-50, 16.25rem wide or 4.375rem collapsed to icons; a slide-in
  drawer below the `lg` breakpoint), the `Topbar` (sticky, z-30: a floating bar 3.375rem high, 1rem below the top)
  and a one-line footer around `<main>`. On `/login` and `/waiting-room` (a TV screen) it renders the page with no shell. Both bars carry
  `print:hidden`, so a printed page is just the content (used by the payment receipt).
- **One login guard.** `MainLayout` sends logged-out visitors to `/login`, and waits until `isLoading` is
  false first. Pages do not check the login themselves.
- **One permission guard per page.** Each page wraps its content in `<RequirePermission permission="…">`
  from `src/components/Guard.tsx`. It shows a spinner while the session loads and a "no access" card when the
  user lacks the permission.
- **Scan.** Beside the search, `ScanPatientButton` (`src/components/ScanPatient.tsx`, `view_patients`) opens a camera
  dialog (a portal on the page body) that reads a patient's QR code every 250 ms (`BarcodeDetector`, else `jsqr`) and
  opens their file (`patientIdFromScan()`: a DentClinic patient address or a `PAT-…` ID); without a camera the ID can
  be typed. The camera stops when the dialog closes.
- **Global search.** `GlobalSearch` in the top bar (and Ctrl+K / ⌘K anywhere) finds patients (`view_patients`)
  by name, phone, second phone or ID, and lists quick actions filtered by permission. Add new everyday
  actions to `ACTIONS` in `GlobalSearch.tsx`. The top bar itself must not get `backdrop-blur` or a `transform`
  (its blur is on a separate background layer): either would make `position: fixed` overlays inside it cover only the
  bar. Its stacking layer (z-30) also keeps overlays inside it under the menu, so full-screen ones (the search dialog,
  the Appearance panel) are portals on `document.body` at z-[52]; its dropdown menus stay under the bar. The
  calendar card is `isolate`, so its sticky headers stay under the bar's menus.
- **One data seam.** No page calls `fetch` or axios itself. That is why switching to dummy data is a
  one-line change. Keep it that way.

---

## Directory map

```
src/
├── app/
│   ├── layout.tsx                 root layout: fonts (IBM Plex Sans, IBM Plex Sans Arabic), boot scripts, providers, MainLayout
│   ├── page.tsx                   redirect("/dashboard")
│   ├── not-found.tsx              404 page
│   ├── globals.css                Tailwind import, body colours, print background
│   ├── fonts.css                  the @font-face rules of the fonts in public/fonts/, and --font-plex / --font-arabic
│   ├── _login/page.tsx            login form; private folder, so it is NOT routed (see Auth)
│   ├── dashboard/page.tsx
│   ├── today/page.tsx             the front desk's day
│   ├── waiting-room/page.tsx      the waiting room TV screen (no shell)
│   ├── patients/      page · new · [id] · [id]/edit
│   ├── appointments/  page · new · [id] · [id]/edit
│   ├── treatments/    page · new · [id] · [id]/edit
│   ├── payments/      page · new · [id] · [id]/edit
│   ├── expenses/page.tsx          the clinic's costs; add / edit in the dialog
│   ├── reports/page.tsx
│   ├── doctors/       page (list with add/edit dialog) · [id] (the doctor's page)
│   ├── users/         page · [id]
│   ├── prescriptions/ new · [id] (printable) · [id]/edit
│   ├── medicines/page.tsx         the clinic's medicine list with add/edit dialog
│   ├── whatsapp/page.tsx
│   ├── activity/page.tsx          the activity log: added, changed, deleted; Restore
│   ├── settings/page.tsx
│   └── profile/page.tsx
├── components/
│   ├── MainLayout.tsx        shell + the login guard
│   ├── Sidebar.tsx           the menu: three groups (CLINIC, FINANCE, SYSTEM), items hidden by permission, collapses to icons
│   ├── Topbar.tsx            the floating top bar: menu button, search, theme and language menus, bell, Appearance, profile menu
│   ├── AppearancePanel.tsx   the Appearance drawer: theme, skin, semi-dark menu, menu open or collapsed, width, language
│   ├── topbarStyles.ts       TOP_ICON_BUTTON, the round icon button of the top bar
│   ├── GlobalSearch.tsx      search button and Ctrl+K / ⌘K palette: patients by name, phone or ID, and quick actions
│   ├── NotificationBell.tsx  today's Scheduled/Confirmed appointments
│   ├── AppointmentCalendar.tsx  the day and week time grid on /appointments
│   ├── Guard.tsx             RequirePermission
│   ├── DentalChart.tsx       the odontogram (adult and child teeth, surfaces, conditions), saved to Patient.dental_chart
│   ├── UnsavedChangesGuard.tsx  asks before leaving a form with unsaved changes
│   ├── RecordDialogs.tsx     new / edit forms in a dialog (appointment, plan, payment) or side panel (patient); useRecordDialogs()
│   ├── DoctorDialog.tsx      the add / edit doctor dialog (Doctors list and the doctor's page)
│   ├── SessionEndedNotice.tsx  "Log in again" dialog (and banner) when the server ended the login; the page stays
│   ├── WhatsAppButton.tsx    every wa.me link: "Needs internet" (and nothing marked as sent) while there is none
│   ├── ReadOnlyBanner.tsx    "View-only copy, last updated …" above every page while useSession().readOnly is set
│   ├── SendWhatsAppDialog.tsx a WhatsApp message by hand from a template (opens wa.me)
│   ├── FinishVisitDialog.tsx "What was done in this visit?" after an appointment is marked Completed
│   ├── xrays/                the X-ray section: XraySection (the tab: drop zone, filters, tiles, compare), ImageViewer
│   │                         (zoom, move, turn, light, invert, full screen, previous/next, draw, details, delete), ImageStage,
│   │                         CompareView, AddImagesDialog, ImageDetailsDialog, Sketch (SketchCanvas: one pointer draws,
│   │                         the text box is a portal on the page; SketchToolbar)
│   ├── LabWorkCard.tsx       lab work of a treatment plan; labState() and LAB_BADGES
│   ├── ClinicLetterhead.tsx  the clinic header on printouts (receipt, estimate)
│   ├── ScreenSizeCard.tsx    the screen size switch on /profile
│   ├── Avatar.tsx            round avatars: an uploaded photo, or the person's initials (`initials()`); MyAvatar, PatientLink
│   ├── Charts.tsx            BarChart and DonutChart, drawn in code in the colour of their section (plain bars, no gradients)
│   ├── CashCountCard.tsx     the cash drawer count on the end-of-day report, and the recent counts
│   ├── ReceiptSlip.tsx       "Print Slip" and "Slip Settings" under a payment receipt (thermal receipt printers)
│   ├── CurrencySelect.tsx    the currency picker of plans and payments (only when the clinic takes two currencies)
│   ├── ToothLogo.tsx         the app logo (inline SVG)
│   ├── QrCode.tsx            a QR code as one SVG path, black on white (`value`, `label`, `size`)
│   ├── ScanPatient.tsx       the Scan button and camera dialog of the top bar
│   ├── MedicalAlerts.tsx     the red/yellow medical alerts band (show it wherever treatment is decided)
│   ├── RecallDialog.tsx      "Next check-up" on the patient page: every 3-12 months, no recall, or the usual rule
│   ├── RxPaper.tsx           RxHeader, RxFooter, RxSignature: a prescription on its doctor's paper (also the preview)
│   ├── RxPaperDialog.tsx     Edit Paper on the doctor's page, with a live preview
│   ├── RecordHistory.tsx     the History card: who added a record and who changed what (closed until asked)
│   ├── PrescriptionWarnings.tsx  the "Check before signing" band of a prescription (never blocking)
│   ├── forms/                PatientForm, AppointmentForm, TreatmentForm, PaymentForm, PrescriptionForm (shared by new and edit), ExpenseForm (dialog only)
│   └── ui/
│       ├── index.tsx         the UI kit (cards, buttons, inputs, tables, badges, paging, tabs, alerts, …)
│       ├── Modal.tsx         Modal, ConfirmDialog
│       ├── styles.ts         inputClass, the outlined field look shared by the controls below
│       ├── Popover.tsx       the floating panel of the controls (a portal; a sheet from the bottom on a phone)
│       ├── Select.tsx        SelectInput, the app's own dropdown over a hidden <select>
│       ├── DateInput.tsx     the app's own date field and calendar
│       ├── TimeInput.tsx     the app's own time field and picker
│       ├── SuggestInput.tsx  a text box with suggestions (the app's own <datalist>)
│       ├── ColorInput.tsx    the app's own colour field (palette and colour code)
│       ├── Tooltip.tsx       tooltip(text), the app's own hover and focus hint, and TooltipLayer (in layout.tsx)
│       └── LinkSelect.tsx    searchable picker for Link fields (used for patients)
├── context/
│   ├── AuthContext.tsx       who is logged in, the AUTH_DISABLED switch, useAuth()
│   ├── ConnectivityContext.tsx the connection to the server and the internet (status asked every 30 s), useConnectivity()
│   ├── DeploymentContext.tsx how this copy is installed (DEPLOYMENT_MODE, previewed with dummy data) and the clinic of the web address, useDeployment()
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
    ├── dataVersion.ts        bumpData() / useDataVersion(): lists and record pages load again after a dialog saves
    ├── format.ts             money (IQD without decimals, currencyDecimals()), cleanNumberText(), dates, times, week helpers, cx(), CSV download
    ├── demo.ts               the dummy data's pretend switches (no internet, server down), demoFlag(), setDemoFlag()
    ├── server.ts             what the server says about itself: SERVER_METHODS, ServerStatus, CloudCopyStatus
    ├── mockPlatform.ts       the dummy back end of the dent_app.* methods (server status, cloud copy, plans, platform …)
    ├── deployment.ts         the three ways to install: DEPLOYMENT_MODES, clinicFromHost(), isMainAddress(), the clinic address rule, the mode preview
    ├── currency.ts           two currencies: rateOn() (the rate of a day), convertMoney(), roundMoney(), sumByCurrency(), baseAmount()
    ├── dentalChart.ts        parseDentalChart (both shapes), cleanChart, tooth names, surface layout, labels
    ├── medical.ts            medicalFlags(): allergy, blood thinner, diabetes, heart, pregnancy from the medical text
    ├── whatsapp.ts           PLACEHOLDERS, fillTemplate(), whatsappNumber(), whatsappLink() (wa.me links)
    ├── phone.ts              toLatinDigits(), dialableNumber() (0770… → 964770…), samePhone(), phoneSearchPattern(), maskPhone()
    ├── display.ts            this computer's screen size (80-120 %): readZoom, saveZoom, the boot script
    ├── sketch.ts             drawings on pictures and on the chart: SketchData, parseSketch, sketchToSave, ChartSketch, parseChartSketch, chartSketchToSave, colours, tools
    ├── xrays.ts              Dental Image helpers: accepted files, guessImageType, parseTeeth, imageTitle, IMAGE_FIELDS
    ├── appearance.ts         this computer's appearance (light, dark, system; collapsed menu; skin; semi-dark menu; width): useAppearance, saveAppearance
    ├── appearanceBoot.ts     its boot script for <head> (no React hooks: the root layout is a Server Component)
    ├── iraq.ts               IRAQ_GOVERNORATES (English and Arabic names), suggested in the patient address box
    ├── waitingRoom.ts        visitStep() (waiting, in the chair), minutesSince(), shortName() ("Zahraa H.")
    ├── recall.ts             dueForRecall() (the dentist's date first, then the period), RECALL_CHOICES, recallUpdate()
    ├── activity.ts           the activity log: ACTIVITY_DOCTYPES, TITLE_FIELDS, recordTitle(), recordHref(), mergeActivity()
    ├── history.ts            parseDocHistory() (Frappe's Version records), field labels, hidden fields, historyValue()
    ├── prescriptions.ts      FREQUENCIES, medicineDefaults(), doseMg(), prescriptionWarnings() (allergy, blood thinner, pregnancy, child, daily maximum, duplicate)
    ├── cashCount.ts          compareCash(): matched, short or over
    ├── profit.ts             computeProfit() (clinic and per doctor), previousPeriod(), profitSummary() (the plain sentences)
    ├── rxPaper.ts            each doctor's prescription paper: rxPaperOf() (defaults, limits), rxPaperPayload(), rxPageCss()
    ├── receiptSlip.ts        the thermal receipt slip: buildReceiptSlip(), printHtml(), this computer's paper settings
    ├── theme.ts              the clinic colour: presets, contrast fix, applyThemeColor, the boot script
    ├── qr.ts                 qrMatrix(), patientQrValue() (the address of the patient's file), patientIdFromScan()
    └── links.ts              URL builders for records (always use these)
docs/
├── backend-todo.md           what the back end must provide for this front end
├── screenshots/              images used by README.md (retake with npm run screenshots:readme)
├── arabic/                   the main screens in Arabic at three sizes (npm run screenshots:arabic)
├── fonts/                    the font comparison for the owner (npm run screenshots:fonts), with a README
└── design-changes/           each redesign before and after: 1-midnight/, 2-clean/ (npm run screenshots:design),
                              3-dialogs-wide/ (e2e/design-changes/wide-pages.spec.ts), 4-controls/ (controls.spec.ts)
public/                       sw.js and offline.html (the installable app), icons/ (the app icons), demo/xrays/ (the demo X-rays),
                              fonts/ (the app's fonts, Google Fonts' own subsets: Arabic, Latin, Latin Extended)
e2e/
├── helpers.ts                waitForData, navigate (client-side, keeps the dummy data), openFromMenu, pickLink (optionally inside a dialog), formDialog, openSaved
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
A form opened in a dialog: `const dialog = formDialog(page, "New Payment")`, then look for the fields inside `dialog`
(`pickLink(page, "Patient", …, dialog)`); the page behind may have boxes with the same labels. After Save, wait for
the dialog to be hidden, and use `openSaved(page, "Payment recorded.")` to follow the message's Open link.

---

## Routes

| Route | Permission | What it does |
|---|---|---|
| `/` | none | Server redirect to `/dashboard`; on the cloud's main address (`CLOUD_DOMAIN`) to `/site` |
| `/site` | none (public) | The public website (no login, no menu): what DentClinic is, and **Go to Your Clinic** (a clinic's address, `<name>.CLOUD_DOMAIN`; a single-clinic install just opens the clinic) |
| `/dashboard` | none (cards appear per permission) | A **welcome card** (date, greeting, "2 appointments today, 2 still to come."); on a wide screen (xl) today's appointments and **Needs attention** sit side by side right under the numbers, so on a full HD screen (1920 × 1080 at 100 %) they show without scrolling, and the whole menu fits too (`e2e/tests/full-hd.spec.ts`); right under it the **quick actions** as large `ActionTile`s (New Appointment, Add Patient, New Treatment, Record Payment, each by permission, with a one-line hint from `sm` up); counts for today's appointments, patients, active plans; revenue this month and amount owed; today's list and the next 7 days; a **Needs attention** card (hidden when empty) with past appointments still open, tomorrow's reminders not yet opened, patients due for recall (`dueForRecall` in `src/lib/recall.ts`: the dentist's date, else 6 months) and patients who owe money, each linking to where it is handled; the appointment lists show each patient's initials (`Avatar`). Below, three **charts** (`Charts.tsx`), each by permission: revenue per month for the last 6 months (`view_payments`, amounts written short, "450K"), visits per month (`view_appointments`, cancelled ones and no-shows left out) and treatment plans by type (`view_treatments`, a ring with the 5 biggest types and "Other") |
| `/today` | `view_appointments` | The front desk board: counts (still to come (not arrived), waiting, in the chair, late, completed, no show), today's appointments grouped by doctor with one-tap **Confirm**, **Arrived** (sets `arrived_at` to now: the badge becomes "Waiting 12 min"), **In Chair** (sets `in_chair_at`: "In the chair since 10:05 AM"), **Undo step** (clears the last step), **Completed**, **No show** and **Undo** (`edit_appointments`; the steps are `visitStep()` in `src/lib/waitingRoom.ts`, only for Scheduled or Confirmed visits), late patients (still open and not arrived `LATE_AFTER` = 10 minutes after the start) highlighted, **Waiting Room Screen** (a link to `/waiting-room`), a red chip for high medical alerts, what the patient owes (`view_payments`), **Add Payment** (`add_payments`), **Walk-in** (books now, rounded up to the quarter hour) and Refresh. **Tomorrow's reminders** (when `enable_whatsapp` is on) lists tomorrow's booked patients with **Send reminder**, which opens `wa.me` with the active "24 Hours Before" template (or the first active one) filled in; opened reminders are remembered on that computer (`localStorage.reminders_opened`). **Lab work due** lists plans sent to a lab and not back that are late or due within two days (`view_treatments`). Below, **Earlier, still open** lists up to 50 past appointments still Scheduled or Confirmed, with Completed / No show / Cancelled buttons; resolved ones drop off. The dashboard and the bell link here |
| `/waiting-room` | `view_appointments` | The waiting room TV screen, with no menu or top bar: the clinic logo and name, a big clock and the date, and three columns: **In the chair**, **Waiting** (longest first, with the minutes) and **Coming up** (the next 6 not arrived, from a quarter of an hour ago on), each patient as first name and initial only (`shortName()`, in a `<bdi>`) with the doctor. Loads today's open appointments again every 20 seconds (`REFRESH_SECONDS`) and after a dialog saves; a failed load keeps the last list and says so. **Full Screen** and **Back to Today** hide in full screen. The only screen with larger text sizes (it is read from across the room). In dummy mode a new tab starts from the seed data, so tests open it from the Today board in the same tab |
| `/patients` | `view_patients` | Server-side search (name, phone, second phone, ID), gender filter, paging. Each row: name with ID, age and gender, medical-alert chips (`medicalFlags`), phone, next booked visit (`view_appointments`, loaded for the rows on the page) and balance (`view_payments`). With `view_payments`, a **Balance** filter ("Owes money": `total_remaining > 0`, biggest first; `?balance=owing` opens on it) adds a WhatsApp **Remind** link with the balance written in |
| `/recall` | `view_patients` and `view_appointments` | Patients due for a check-up and with nothing Scheduled or Confirmed from today on: a patient with `next_recall_date` (the dentist's choice) is due from that date whatever the period, one with `no_recall` never is, and everyone else is due when no Completed visit falls within the chosen period (3, 6, 9 or 12 months; default 6). A **Check-up due** column says when and why ("Dentist: every 3 months" or "6 months after the last visit"); longest overdue first, never-seen patients last. Tap to call, a WhatsApp link with a ready reminder text (`wa.me/<digits>?text=`), and Book (`add_appointments`). Worked out in the browser from all appointments |
| `/patients/new` | `add_patients` | Shared `PatientForm`. While typing, patients with the same phone number (`samePhone()` from `src/lib/phone.ts`: the last 10 digits of either phone field, so `0770 123 4567` and `+964 770 123 4567` match) or exactly the same name show under **Already registered?** with a link; saving with the same phone number asks first (also on edit when the phone changes; `currentName` excludes the patient itself). The Medical Information card starts with a **Quick checklist** (`CHECKLIST` in `PatientForm.tsx`): tick boxes that add or remove a standard word in `allergies`, `current_medications` or `chronic_diseases` (no new fields); a box already true from other wording (e.g. "Warfarin 3mg") shows ticked and disabled. The Address box suggests the governorates of Iraq (`IRAQ_GOVERNORATES`, a `SuggestInput`; free text still works). **Only know the age?** swaps the date of birth for an **Age** box (for patients who do not know their birth date); `age` is sent only when `date_of_birth` is empty. Opens the new record after saving |
| `/patients/[id]` | `view_patients` | Two columns from `xl` up (stacked below): on the start side a `ProfileCard` with the name, age, gender, ID, the actions and the summary; beside it the `MedicalAlerts` band and the tabs. The summary card has tap-to-call (`tel:`) and WhatsApp (`https://wa.me/<digits>`) buttons, last visit, next appointment, balance to pay (with Add payment), paid so far, and **Next check-up** (the dentist's date and interval, "No recall" or "Usual rule"; **Change** with `edit_patients` opens `RecallDialog`: every 3, 6, 9 or 12 months with the date counted from the last visit and editable, no recall, or the usual rule); tabs: **Overview** (a timeline of appointments, treatment sessions and payments, grouped Upcoming / Today / by month, beside the contact and medical cards), Appointments, Treatment Plans, Payments, Dental Chart, **Prescriptions** (`view_treatments`: date, medicines and doctor, with **New Prescription** for `add_treatments`), **X-rays & Photos** (`XraySection`, with a count: **Dental Image** records, newest first, grouped by the day taken, filtered by type and tooth, a tile per image with a marker when it has a drawing. Drag files onto the drop zone, **Add Files** or **Take Photo** (the tablet camera): JPG, PNG and PDF up to 10 MB each (`isAccepted`, `MAX_IMAGE_MB`; others are refused by name); the **Add N images** dialog gives each file a type (guessed from its name by `guessImageType`: "opg" → Panoramic, a camera photo → Intraoral photo, a PDF → Other) and shared **Taken on**, **Teeth** (FDI numbers, checked by `parseTeeth`) and **Description**; each file then makes its record, is attached to it privately (`attachFile`) and the record points at it, with an upload `ProgressBar` ("Uploading 2 of 3: …"); if one fails, the ones before it are kept. **Compare** picks two images (not PDFs) for `CompareView`, side by side (one above the other on a phone), each with its own zoom, a shared invert and swap. A tile opens `ImageViewer` on all the patient's images (whatever the filter): full screen, zoom (buttons, wheel, + and −, two-finger pinch on a tablet, also while drawing), drag to move, rotate, brightness and contrast sliders, invert, reset, show/hide the drawing, previous/next (arrow keys in the reading direction), full screen, Print (`/xrays/[id]`), and with `edit_patients` **Draw** (`SketchToolbar`: pen, arrow, circle, text, six colours, undo, clear; saved as `annotations`, the image itself never changes), **Details** (`ImageDetailsDialog`) and Delete. A PDF shows in a frame with Open in a new tab. The images are loaded once by the page (`usePatientImages`) and shared with the Dental Chart tab), **History** (`RecordHistory`, open at once). Buttons: New Appointment, New Treatment, Edit, Delete (icon; each by permission) |
| `/patients/[id]/edit` | `edit_patients` | Shared `PatientForm` |
| `/patients/[id]/estimate` | `view_patients` and `view_treatments` | Printable treatment estimate on the clinic letterhead: the patient's Planned and In Progress plans with cost, paid and to pay, totals, a 30-day validity note (`VALID_DAYS`) and signature lines. Linked as **Print estimate** above the Treatment Plans tab |
| `/patients/[id]/statement` | `view_patients` and `view_payments` | Printable statement: every plan that is not Cancelled (cost, paid, left), every payment, total for treatments, total paid and the balance (`total_remaining`). Linked as **Print statement** above the Payments tab |
| `/patients/[id]/file` | `view_patients` | The whole patient file on paper, on the letterhead: details, medical information with `MedicalAlerts`, the dental chart (read only, with its sketch), treatment plans and sessions (`view_treatments`), appointments (`view_appointments`), prescriptions (`view_treatments`), payments with the total paid and what is still to pay (`view_payments`), and X-rays and photos (off at first: ink). Tick boxes above (`print:hidden`) choose the parts; a part the user may not see is neither offered nor loaded. Linked as **Print File** on the patient page |
| `/patients/[id]/card` | `view_patients` | Printable patient ID card at bank-card size (85.6 × 54 mm, sizes in mm, a dashed line to cut along): clinic logo and name, the patient's name, ID and date of birth, the clinic phone, and a QR code of `patientQrValue()` (the address of the patient's file, so a phone camera opens it too). Linked as **ID Card** on the patient page |
| `/patients/[id]/chart` | `view_patients` | Printable dental chart: letterhead, patient (with a QR code of the file beside it, "Scan to open the patient file"), `MedicalAlerts`, the chart read-only (Adult/Child switch and hints hidden on paper) and its Findings. Linked as **Print** in the chart header |
| `/xrays/[id]` | `view_patients` | Printable X-ray or photo: letterhead ("Dental image"), patient, date taken, type, teeth, the image with its drawing on top (`SketchCanvas`), and the description. The title is the image's type. Print in the viewer opens it in the same tab |
| `/appointments` | `view_appointments` | Three views, chosen with `?view=day\|week\|list` (default `day`, or `list` when `?date=` is given). **Day**: one column per active doctor, rows from Clinic Settings opening to closing time (stretched to fit), blocks as long as the appointment and coloured by status, overlapping ones side by side, a red "now" line, and striped shading outside each doctor's `start_time`–`end_time`, which are also shown under the name (and in the week view when one doctor is chosen); `?day=YYYY-MM-DD` and `?doctor=` pick the day and one doctor. On phones (`useMediaQuery("(max-width: 639px)")`) the day view shows one doctor at a time with Previous / Next doctor buttons, starting with the first doctor who has patients. **Week**: one column per day (the week starts on `WEEK_STARTS_ON` in `format.ts`, Sunday). Clicking an empty 15-minute slot opens the booking dialog with date, time and doctor filled in (needs `add_appointments`). With `edit_appointments`, a Scheduled or Confirmed block can be dragged (mouse, pen or touch; pointer events, `touch-none` on the block) to another time, doctor column or day; a dashed preview snaps to 15 minutes, dropping asks "Move this appointment?" (with the same overlap check, then "Move anyway") and saves `appointment_date`, `appointment_time` and `doctor`. A click without moving still opens the appointment. **List**: search, date filter (All/Today/Tomorrow/Upcoming/Past, also `?date=today`), status filter, paging. The grid is `src/components/AppointmentCalendar.tsx` |
| `/appointments/new` | `add_appointments` | Shared `AppointmentForm`. Reads `?patient=`, `?date=`, `?time=HH:MM`, `?doctor=` and `?reason=`; Back returns to that day in the calendar. Once a doctor and date are chosen, the form shows that doctor's bookings for the day and up to 8 free times that fit the chosen length (within the doctor's own working hours when set, otherwise the clinic hours, and from now for today; tap one to fill in the time) and says when the typed time overlaps. With no `?doctor=`, it starts with the doctor of the last booking made on this computer (`localStorage.last_doctor`). Warns if the doctor already has an overlapping appointment (always checked for a new booking) |
| `/appointments/[id]` | `view_appointments` | `MedicalAlerts` for the patient, details (with **Print Card**), status buttons, Edit and an icon Delete (`edit_appointments`), a **Prescriptions** card (`view_treatments`: the prescriptions written at this visit, and **Write Prescription** with `add_treatments`, which opens `/prescriptions/new` with the patient, the visit and its doctor filled in), a **History** card at the bottom (`RecordHistory`), and WhatsApp messages for this appointment with **Send Message** (`SendWhatsAppDialog`: pick an active template, placeholders filled, text editable, opens `wa.me` with it; shown when Clinic Settings `enable_whatsapp` is on and the patient has a phone). Completed opens `FinishVisitDialog` |
| `/appointments/[id]/edit` | `edit_appointments` | Shared `AppointmentForm` with status |
| `/appointments/[id]/card` | `view_appointments` | Printable appointment card for the patient (date, time, doctor, visit, the clinic phone and address). **Print Card** on the appointment page |
| `/treatments` | `view_treatments` | Search, type and status filters, paging |
| `/treatments/new` | `add_treatments` | Shared `TreatmentForm`. Reads `?patient=` and `?tooth=`. New plans are always `Planned`. Choosing a treatment type fills in its price-list price unless a different cost was typed. With two currencies a **Currency** picker (`CurrencySelect`) sets the plan's `currency`; the price list is in the clinic's currency, so a plan in the other one gets no price filled in and the hint shows the usual price and about what it is at today's rate. On edit the picker is locked once the plan has payments |
| `/treatments/[id]` | `view_treatments` | `MedicalAlerts` for the patient, a **History** card at the bottom (`RecordHistory`), cost/paid/remaining with a progress bar, details, status buttons, payments of the plan, **Treatment Sessions** (add, edit, delete in a dialog; **Book Visit** opens the booking form with the patient, the plan's doctor and the reason filled in, for Planned and In Progress plans), and the patient's **dental chart** read-only, opened at the plan's tooth (`initialTooth`), loaded with `usePatientChart()`; a **Lab Work** card (`LabWorkCard`, for `LAB_TREATMENT_TYPES` or when something was sent): lab, sent, due back, received, with Send to lab / Edit and one-tap Received today (`edit_treatments`) |
| `/treatments/[id]/edit` | `edit_treatments` | Shared `TreatmentForm` with status |
| `/prescriptions/new` | `add_treatments` | Shared `PrescriptionForm`. Reads `?patient=`, `?appointment=` and `?doctor=` (else the doctor using the app). Patient, `MedicalAlerts`, doctor, date, then one row per medicine (a `fieldset` "Medicine N": medicine from the active Dental Medicines by group, dose, how often (`FREQUENCIES`), days, instructions; choosing a medicine fills its usual values unless the row was already typed in), the **Check before signing** band (`PrescriptionWarnings`, from `prescriptionWarnings()` in `src/lib/prescriptions.ts`: an `allergy_words` word in the patient's allergies, an NSAID with a blood thinner, `avoid_in_pregnancy` with a pregnancy, a patient under 12 with the medicine's `child_note`, `doseMg() × timesPerDay()` above `max_daily_mg`, the same medicine twice; never blocking) and notes. Saves `medicine_name` on each row |
| `/prescriptions/[id]` | `view_treatments` | Printable prescription on its doctor's paper (`rxPaperOf(doctor)`, `src/lib/rxPaper.ts`, loaded with `RX_PAPER_FIELDS`; Print waits for it): the page size (A5 or A4) and margins go in a `<style>` with `rxPageCss()`; `RxHeader` prints the doctor's name, specialization, qualifications and logo (else the clinic logo) with the clinic's name and contact, or, on pre-printed paper, nothing (a dashed "Printed header" box on screen only, the page margin leaves the room); `RxFooter` the doctor's footer (or the pre-printed footer's room); `RxSignature` the signature or stamp image above the line; "Prints on Dr. …'s paper (A5)." on screen. Then patient (with age), doctor, the visit's date and time (a link, screen only), the numbered medicines with dose · frequency · days and instructions, the notes and a signature line; on screen the warnings band above it (`print:hidden`). Print, Edit and an icon Delete (`add_treatments`) |
| `/prescriptions/[id]/edit` | `add_treatments` | Shared `PrescriptionForm` |
| `/payments` | `view_payments` | Search, method filter, date range, paging, total of everything that matches (each currency apart: "IQD 1,250,000 + $300"); each amount in its own currency |
| `/payments/new` | `add_payments` | Shared `PaymentForm`. Reads `?patient=&treatment=`. A new payment for a patient with exactly one plan with a balance picks that plan; **Pay full balance** fills the amount. Blocks amounts above what the plan has left. With two currencies a **Currency** picker: a new payment starts in its plan's currency; when two currencies meet the hint shows "Rate on 26 Sep 2026: $1 = IQD 1,460" (the rate of the payment's day, `rateOn()`; a saved payment keeps its own while its date stays) and "Counts as IQD 146,000 on this plan", and the limit and **Pay full balance** are converted (rounded down). The rate goes with the payment as `exchange_rate` |
| `/payments/day` | `view_payments` | End-of-day report for `?date=` (default today): totals per payment method and overall (each currency apart), a notice of the cash taken in the other currency (not in the drawer count), every payment of the day, a **Cash in the drawer** box (`CashCountCard`): Opening float and Cash counted boxes, Should be in the drawer (float + the day's Cash payments), Matched / Short by / Over by (`compareCash()` in `src/lib/cashCount.ts`), a Note required when short or over, and **Save Count** / **Update Count** (`add_payments`), saved as one **Cash Count** per day with who counted it and when (a notice appears if the day's Cash payments changed after the count); on paper the typed values print, empty ones as lines; Counted by / Checked by lines; and below, **Recent cash counts** (`RecentCashCounts`: the last 14 days counted, each day opening its report) so a manager can look back. Linked from Payments and the Today board |
| `/payments/[id]` | `view_payments` | Printable receipt with clinic details, the amount in the payment's currency and, when two currencies met, **Exchange rate** ($1 = IQD 1,460) and **On the plan** (`plan_amount` in the plan's currency), also on the slip (`extra` lines); under it a **Receipt slip** row (`ReceiptSlipControls`): **Print Slip** prints the receipt for a 58 or 80 mm thermal receipt printer (clinic, receipt number, date, patient, what it was for, method, amount, **Left on this treatment** as it was right after this payment (the plan's cost minus its payments up to this one, so a reprint shows the same figure; none for a general payment or a cancelled plan), notes, and "Printed <time> by <user>"; the button waits until that balance has loaded) and **Slip Settings** sets this computer's paper width (58, 80 or 40-120 mm), side margin (0-10 mm) and text size, with **Print Test Slip**, kept in `localStorage.receipt_slip_paper`; a **History** card at the bottom (`RecordHistory`, not printed); Edit/Delete (`add_payments`); **WhatsApp** opens `wa.me` with a short receipt (amount, date, treatment, receipt number and method, and what the patient still has to pay) when `enable_whatsapp` is on |
| `/payments/[id]/edit` | `add_payments` | Shared `PaymentForm` |
| `/expenses` | `view_expenses` | What the clinic spends: search (what for, paid to, doctor, ID), category filter (`EXPENSE_CATEGORIES`), date range, paging, the total of everything that matches (each currency apart), **Export CSV** (with the rate and the amount in the clinic's currency). With `add_expenses`: **Add Expense** and, per row, the date or the pencil to edit and the bin to delete (`ConfirmDialog`); the form (`ExpenseForm` in the `newExpense` / `editExpense` dialog) has date, category, currency (with two), amount (above zero; the day's rate shown for the second currency), what for, paid to, paid by, and an optional **doctor** (the cost then counts against that doctor). Also in the Ctrl+K actions (Add Expense) |
| `/reports` | `view_reports`, and Clinic Settings `enable_financial_reports` | Period picker; with `view_expenses` a **Profit** card (under the four numbers): **In plain words** (`profitSummary()` in `src/lib/profit.ts`: took in, spent and the profit or loss with its share of what came in; no expenses recorded; up or down against the same number of days just before (`previousPeriod()`, only for a period with a start and an end); the biggest cost; the doctor who brought in the most and what is left after the costs recorded for them; what patients still owe), the expenses, the profit and the margin, then **Expenses by Category** and **Profit by Doctor** (took in: payments of the doctor's plans; costs: expenses with that doctor; the whole clinic's row takes the shared costs and payments without a plan or doctor; a total row); revenue, count, average, outstanding (all in the clinic's currency: payments by `base_amount`, what is left on plans in the other currency at today's rate; with two currencies the revenue card adds "Received: IQD … + $…", and the CSVs have currency, rate and clinic-currency columns); revenue by treatment, method and month; latest payments; outstanding balances; CSV export of both; revenue by **doctor** (through each payment's treatment plan; payments without a plan are "General payments") and **Appointments** outcomes up to today (completed, no show, cancelled, still open) with the no-show rate, no-shows out of completed plus no-shows, shown red at 15% or more Three charts (`Charts.tsx`): **Revenue over Time** and **Appointments per Day** (a day per bar up to 45 days, else a month per bar, at most 24 months; cancelled appointments left out; appointments up to today), and **Treatment Plans by Type** (a ring of the plans started in the period, from Frappe's `creation`, not counting cancelled ones). |
| `/doctors` | `manage_users` | Doctor list (search, Active / Not active filter, paging; the name opens the doctor's page); Add Doctor and Edit (`DoctorDialog`) in a dialog: name, specialization (`DOCTOR_SPECIALIZATIONS`), phone, email, working hours (`start_time`, `end_time`; both or neither, end after start), **gender**, a **photo** (Upload Photo / Change Photo / Remove Photo, an image up to 5 MB through `uploadFile`, shown as the doctor's `Avatar` in lists, the calendar and the Today board) and Active. No delete: switch Active off |
| `/medicines` | `manage_users` | The medicine list (search, Active filter, paging); Add Medicine and Edit in a dialog: name, strength, form (`MEDICINE_FORMS`), group (`MEDICINE_GROUPS`), the usual dose / how often / days / instructions, and the warning flags (allergy words, daily maximum in mg, note for children, NSAID, avoid in pregnancy) and Active. No delete: switch Active off, so old prescriptions keep their rows |
| `/users` | `manage_users` | Staff list (without Administrator and Guest), search, status filter, Add User dialog (can apply the role's usual permissions) |
| `/doctors/[id]` | `manage_users` | The doctor's page: a profile card (photo or initials, specialization, working hours, contact, Active, Edit in `DoctorDialog`, New Appointment in the booking dialog; numbers for today, the next 30 days and open plans) beside **Today** (with a link to the doctor's day in the calendar), **Next 30 days** and **Open treatment plans**, and **Prescription Paper** (a sentence about the paper, and **Edit Paper**: `RxPaperDialog`, with paper size, pre-printed or not, the mm left for a printed header and footer (0-120), qualifications, footer, logo and signature uploads (images up to 2 MB), and a live preview; saved on the Doctor with `rxPaperPayload()`); the visits need `view_appointments` and the plans `view_treatments`, else they are left out. `doctorHref(name)` |
| `/users/[id]` | `manage_users` | A profile card (initials, name, email, role, status, permissions on, sections open, details) beside **Account** (clinic role, enable/disable) and **Permissions**: the role presets (Manager, Doctor, Receptionist, Select all, Clear all) above a table built from `PERMISSION_MATRIX` in `types.ts`: a row per section (Patients, Appointments, Treatments, Payments, Reports, Clinic setup), a column each for View, Add, Edit and Delete (`PERMISSION_ACTIONS`), a checkbox in each cell and an empty cell ("Not available") where the section has no such action, and a select-all box for every row and column (partly on shows as a dash). Clinic setup has one box, `manage_users`, under Edit. `[id]` is `encodeURIComponent(btoa(user.name))` |
| `/activity` | `manage_users` | The activity log (menu: System → Activity): who **added** (each record's `owner` and `creation`), **changed** (`Version` records, shown with `readableChanges()`, `fieldLabel()` and `historyValue()`, up to 3 changes a line; a version with nothing readable is left out) and **deleted** (`Deleted Document`) which record, newest first, merged by `mergeActivity()` over `ACTIVITY_DOCTYPES`; filters **What happened** and **Record**; 40 at a time with Show More. A deleted record has **Restore** (`restoreDeleted()`): it comes back under its own name, and the line then says Restored and links to it. Titles and IDs sit in `<bdi>` for Arabic screens |
| `/whatsapp` | `manage_users` | Templates (add, edit, delete, placeholders, live preview) and the message log (phone numbers shown with the middle hidden, `maskPhone()`; the full number is on the patient's page) Each template has a **Language** (Arabic, English or any; `language`), shown on its card; reminders and the Send Message dialog prefer the screen's language (`pickTemplate`). |
| `/settings` | `manage_users` | A clinic card (logo, name, phone, currencies, open days, prices set, contact details) beside the settings in tabs: **Clinic**, **Currencies**, **Language**, **Working Hours**, **Price List**, **Features**; one Save Settings for all of them, and a failed check opens the tab that has the problem. Clinic Settings: name, logo upload, contact, tax number, currency, working hours, feature switches, theme colour, **Phone Country Code** (`phone_country_code`, digits only, empty means 964; added to local numbers in WhatsApp links, `useSettings().countryCode`), **Currencies** (a **Second currency** such as USD, `second_currency`, and its **Exchange rates**, `exchange_rates`: rows of a date and "1 USD in IQD", each counting from its date; Add Rate, a remove button per row; every row needs a date and an amount above zero, one per date), **Price List** (a usual price per treatment type, saved in `treatment_prices`), and **Open on** day toggles saved as `working_days` (`useSettings().isOpenOn(iso)`; nothing set means open every day; saving with no day ticked is refused). Closed days are shaded "Closed" in the calendar, the day view shows a notice, and booking on one shows a note and asks "Book anyway?" The **Language** card: **Default language** (`default_language`, Arabic or English: the language of users who did not choose one) and **Arabic digits** (`arabic_digits`: Arabic screens write ٠-٩). |
| `/profile` | none | A profile card beside the rest; what I can do is the permissions table, read only. My details (with `MyAvatar`), **Screen Size on This Computer** (80, 90, 100, 110 or 120 %: `saveZoom()` sets the root font size, and every size is in rem, so text and spacing scale together; kept in `localStorage.screen_zoom` and applied before the first paint by `ZOOM_BOOT_SCRIPT` in `layout.tsx`), what I can do, change password, **Install DentClinic** (`InstallAppCard`), and (login off only) Try Another User |

**Forms in dialogs.** New and edit forms for appointments, treatment plans and payments open in a dialog over the
page (`useRecordDialogs()` from `src/components/RecordDialogs.tsx`: `open({ kind: "newTreatment", prefill: { patient },
patientName })`; kinds `newAppointment`, `editAppointment`, `newTreatment`, `editTreatment`, `newPayment`,
`editPayment`, `newPatient`, `newExpense`, `editExpense`). The appointment dialog is wide (`size="xl"`); Add Patient is a side panel from the end
side. Pass what the page knows as `prefill` (the calendar passes the day, time and doctor; the chart the tooth; a plan
its patient, doctor and reason). After saving, the page stays: a toast with **Open** (the new record), `bumpData()`
so lists and record pages load again, and the dialog closes. `DialogFor` also checks the permission of each kind
(`NEEDS`), and a save that ends late closes only its own opening. Closing with unsaved changes asks first; Escape
closes; on a phone the dialog fills the screen; leaving the page (a link inside the form, the toast's Open) closes
it. The `/…/new` and `/…/edit` pages still work and are what a ctrl-click or a bookmark opens. Patient Edit and
prescriptions still use their pages.

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
| `restoreDeleted(name)` | `frappe.core.doctype.deleted_document.deleted_document.restore` with a Deleted Document's `name` | `restoreDeleted()` in the mock, via `mockCall` |
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
  `"Treatment Plan"`, `"Treatment Session"`, `"Payment"`, `"Expense"`, `"User"`, `"Clinic Permission"`,
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
| `useSiteOrigin()` | This site's address (`window.location.origin`), empty on the server; for QR codes |
| `useMediaQuery(query)` | True while a media query matches (false on the server); e.g. phone-only layouts |
| `useOpenBalances(ids, enabled)` | The plans with something left of a few patients (currency and remaining), for `useSettings().owedText()` |

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

- **Seed data** is Iraqi and written in Arabic, as the clinic would type it: names (زهراء حسين, د. زينب الهاشمي …), addresses in
  Baghdad (محلة / زقاق / دار) and other governorates (البصرة، أربيل، النجف، بابل), visit reasons, notes, diagnoses,
  medical text (البنسلين, سكري النوع الثاني …), expenses and image descriptions; medicine names, strengths and doses stay
  in Latin letters, and there are WhatsApp templates in both languages. Below, people are named in English letters
  for short (Fatima Salman = فاطمة سلمان). It has mobile numbers typed the usual ways (`0770 123 4567`, `07801112233`, `+964 772 771 4520`),
  and prices in Iraqi dinars (`currency` IQD; filling 40,000, root canal 150,000, crown 200,000, bridge 600,000,
  extraction 30,000, implant 1,000,000, cleaning 35,000, whitening 250,000 in the price list). 12 patients (Fatima Salman is a 9-year-old child; two,
  Suha Majeed and Muhannad Taha, last seen more than six months ago for the recall list; Hiba Kadhim has a dentist's
  recall every 3 months, due 3 days before the app loads, and Shahad Qasim one in January 2027; Muhannad Taha's phone is
  `0770 123 4567` and Yousif Sattar's `07801112233`, which the phone tests rely on), 5 doctors (Dr. Noor Al-Saadi has her own prescription heading and footer; Dr. Haider Al-Obaidi pre-printed A5 pads, 45 mm at the top and 25 at the bottom), 24 appointments (December 2025 to September 2026, all five statuses; three of
  them are dated today and tomorrow when the app loads), 16 treatment plans (all four statuses; one priced in US
  dollars), 10 treatment sessions, 17 payments (two dated today; two on the dollar plan), 9 users (including `Administrator`, `Guest` and one
  disabled doctor), 3 `Clinic Permission` records (the manager has every permission; the receptionist and
  one doctor have some), the `Clinic Settings` single (currency `IQD`, country code 964, no `theme_color`, so the default violet shows; doctors and staff users have a `gender`), 3 WhatsApp templates, 7 WhatsApp
  log entries, 12 Expenses (`EXP-2026-00001` … from July to September: supplies, electricity, maintenance, the
  assistant's salary at each month's end, lab bills for Dr. Zainab (Aug) and Dr. Haider (Sep), and a $150 curing light;
  this month IQD 145,000 against IQD 250,000 in, so the Profit card shows IQD 105,000), 3 Cash Counts (22 Jul matched, 30 Jul short by 10,000, 18 Aug over by 5,000, counted by Dalia Jawad),
  10 Dental Medicines (`MED-00001` Amoxicillin … `MED-00010` Nystatin, with usual dental doses a dentist must
  check) and 3 Prescriptions (`RX-2026-00001` Zahraa after her root canal, `RX-2026-00002` Saad after his
  extraction with a note about warfarin, `RX-2026-00003` Hassan), Clinic Settings take US dollars too (`second_currency` USD; 1 USD = 1,480 IQD from 1 January 2026 and 1,460 from 1
  September), and Ruqaya Adnan has a dental implant priced in dollars (`TRT-2026-00016`, $700) with $300 paid in dollars
  (`PAY-2026-00016`, 10 Aug, cash) and IQD 148,000 in dinars (`PAY-2026-00017`, 20 Aug, card), both at 1,480, so $300 is
  left; and 6 Dental Images (`IMG-2026-00001` …): Zahraa's
  periapicals of 36 before (with a drawing: a circle, an arrow and «آفة», a lesion) and after the root canal, a panoramic, a
  bitewing of the left side and an intraoral photo, and Abbas's implant in 46. Their pictures are drawn SVGs in
  `public/demo/xrays/`. Deleting a record also deletes the Files attached to it, like Frappe, and keeps a copy in `Deleted Document`
  (`DEL-00001` …; not for File, Version or Deleted Document itself); two seed ones, an appointment booked twice
  (`APT-2026-00025`, Dalia Jawad) and a payment entered twice (`PAY-2026-00018`, Laith Hamid), can be restored.
  **Restore** (`mockCall` with the restore method) puts the record back under its own name with the same checks as a
  new one, and refuses one restored already, one whose name is taken, and one whose patient, doctor, plan or
  appointment is gone. Like Frappe's naming series, `nextName()` never gives out a deleted record's number again.
- **Recall:** completing an appointment (created or updated to Completed) moves the patient's `next_recall_date` to
  the visit plus `recall_interval_months`, never earlier (`rollRecall()`), as `Appointment.on_update` should.
- **Cash Count** (`CC-2026-00001`) is checked on save like its `validate()` should: one per day, `cash_payments` = the
  day's Cash payments, `expected_cash` = float + that, `difference` = counted - expected, a note required when it
  is not 0, `counted_by_name` from the User, `counted_at` = now.
- **IDs match the real naming series:** `PAT-2026-00001`, `DOC-00001`, `APT-2026-00001`,
  `TRT-2026-00001`, `SES-2026-00001`, `PAY-2026-00001`, `EXP-2026-00001`, `WAT-00001`, `WAL-2026-00001`, `MED-00001`, `RX-2026-00001`, `IMG-2026-00001`. New docs get the next
  number with the current year. Users are named by `email`, Clinic Permissions by `user` (a duplicate gets
  `" 2"`, `" 3"` …).
- **Fields the server computes or fetches are rebuilt after every write** by `recalculate()`:
  - `patient_name` on Appointment, Treatment Plan, Treatment Session, Payment, WhatsApp Log and Prescription;
    `doctor_name` on Appointment, Treatment Plan, Treatment Session and Prescription; `treatment_type` on Payment;
    `summary` on Prescription (the rows' `medicine_name` joined with ", ").
  - Payment: `plan_amount` (the amount in its plan's currency) and `base_amount` (in the clinic's currency), at the
    payment's own `exchange_rate` (else the rate of its day).
  - Expense: `doctor_name`, and `base_amount` at its own `exchange_rate` (set by `checkExpense()` like a payment's:
    the rate of its day for the second currency, kept while the day and currency stay). A date, a category and an
    amount above zero are required.
  - Treatment Plan: `paid_amount` is the sum of its payments' `plan_amount`. `remaining_amount` is
    `max(0, total_cost − paid_amount)`, or `0` if the plan is `Cancelled`.
  - Patient: `total_treatments`, `total_appointments`, `total_paid` (sum of `base_amount`), `total_remaining`
    (what is left on each plan, in the clinic's currency at today's rate).
- **Validation like the back end:** a payment must be above zero, in a currency the clinic takes, and cannot take a
  plan's paid amount above its total cost (in the plan's currency); when two currencies meet the mock sets
  `exchange_rate` itself (the rate of the payment's day; an edit that keeps the day, currency and plan keeps the old
  rate; no rate at all is refused) and ignores a sent `plan_amount` or `base_amount`. A payment in another currency
  than its plan may go over what is left by less than one cent (`settleTolerance()`), and then takes off only what was
  left, so paying the full balance in dollars closes a dinar plan. A plan's total cost cannot go below what was already
  paid, and its currency cannot change once it has payments. Clinic Settings refuse bad rate rows, a second currency
  with no rate, a change of the clinic currency once plans or payments exist, and clearing a second currency in use.
  A Cash Count counts only cash in the clinic's own currency. A doc that other docs link to
  cannot be deleted ("Cannot delete Patient … because it is linked with …").
- **On create and update:** number fields (`total_cost`, `amount`, `exchange_rate`, `duration_minutes`, `age`, `enabled`,
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
  screenshots) makes every call wait that long instead (`e2e/tests/loading.spec.ts`), and `window.__mockUploadMs = 3000`
  makes every pretend upload take that long (`e2e/tests/uploads.spec.ts`).
- **Failing on purpose (tests):** `window.__mockFail = ["Patient"]` makes every read of those doctypes
  (`getList`, `getCount`, `getDoc`) fail with "Cannot reach the server…", so error states can be tested
  (`e2e/tests/load-errors.spec.ts`). Nothing in the app sets it.
- **History:** every create sets `owner`, `creation`, `modified` and `modified_by` (the acting user from
  `setMockUser`), and every update `modified` and `modified_by`. A save of a doctype in `TRACKED_DOCTYPES`
  (Patient, Appointment, Treatment Plan, Payment) that changes fields adds a `Version` (`VER-00001`) with
  `data.changed` rows `[field, old, new]` for the fields that were sent and changed (plus `patient_name`,
  `doctor_name` and `treatment_type` when a Link change changed them), like Frappe's Track Changes. Times get a
  microsecond part that differs on every save (`stamp()`), so `modified` always changes; a deleted record's Versions
  stay (the activity log shows them, and a restored record keeps its history). A completed visit that moves the patient's next check-up (`rollRecall()`) records a
  Patient Version too. `RecordHistory` shows Link changes by those names (`readableChanges()`).
  Seed records get a creation date and owner (`stampSeeds()`), three seed Versions show changes to
  `PAY-2026-00001` and `TRT-2026-00002`, and `DEFAULTS` gives patients 0 or null for fields they did not set, and appointments `arrived_at` and `in_chair_at` null.
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
| **Doctor** | `full_name`*, `specialization`, `phone_number`, `email`, `start_time`, `end_time` †, `is_active`, `gender` †, `photo` † (on `/doctors`), `rx_paper_size`, `rx_preprinted`, `rx_top_mm`, `rx_bottom_mm`, `rx_qualifications`, `rx_footer`, `rx_logo`, `rx_signature` † (the prescription paper, on `/doctors/[id]`) | |
| **Appointment** | `patient`\*, `doctor`\*, `appointment_date`\*, `appointment_time`\*, `duration_minutes`, `status`, `reason_for_visit`, `notes`, `arrived_at` †, `in_chair_at` † (Datetime, the Today board's waiting room steps) | `patient_name`, `doctor_name` |
| **Treatment Plan** | `lab_name`, `lab_sent_date`, `lab_due_date`, `lab_received_date` † (Lab Work card), `patient`\*, `doctor`, `treatment_type`\*, `tooth_number` (FDI number from a dropdown), `currency` † (empty: the clinic's own), `total_cost`\*, `diagnosis`, `treatment_notes`, `status` (edit only; new plans are `Planned`) | `paid_amount`, `remaining_amount`, `patient_name`, `doctor_name` |
| **Treatment Session** † | `patient`, `treatment_plan`, `doctor`, `session_date`\*, `session_time`, `status`, `notes` | `patient_name`, `doctor_name` |
| **Expense** † | `expense_date`\*, `category`\* (`EXPENSE_CATEGORIES`), `amount`\*, `currency`, `doctor`, `description`, `paid_to`, `payment_method` (on `/expenses`) | `exchange_rate`, `base_amount`, `doctor_name` |
| **Payment** | `patient`\*, `treatment_plan`, `payment_date`\*, `amount`\*, `currency` †, `exchange_rate` † (the rate of its day), `payment_method`\*, `notes` | `patient_name`, `treatment_type`, `plan_amount` †, `base_amount` † |
| **User** (Frappe core) | `email`, `first_name`, `enabled`, `new_password` (create only), `send_welcome_email: 0`, `roles: [{ role }]` | `full_name`, `gender` and `user_image` (for the avatar) |
| **Clinic Permission** | `user` plus 16 flags set to `0` or `1` | |
| **Clinic Settings** † (single) | `clinic_name`, `logo`, `phone`, `email`, `address`, `tax_number`, `currency`, `opening_time`, `closing_time`, `theme_color`, `enable_whatsapp`, `enable_patient_portal`, `enable_financial_reports`, `treatment_prices` † (child table rows `{ treatment_type, price }`; `useSettings().prices` is the lookup), `phone_country_code` †, `second_currency` †, `exchange_rates` † (rows `{ rate_date, rate }`) | |
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
- Payment `payment_method`: `Cash`, `Card`, `Bank Transfer` (an Expense's too, or empty)
- Expense `category`: `Rent`, `Salaries`, `Dental Supplies`, `Lab Fees`, `Equipment`, `Utilities`, `Maintenance`, `Marketing`, `Other`
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
| Finance | `view_payments`, `add_payments`, `view_expenses`, `add_expenses`, `view_reports` | Payments menu and pages, balances and money cards; Add, Edit and Delete payments need `add_payments`; the Expenses menu and page, and the Profit card on Reports, need `view_expenses`; adding, changing and deleting expenses `add_expenses`; Reports needs `view_reports` |
| System | `manage_users` | Doctors, Medicines, Users, WhatsApp and Settings pages and menu items, Settings in the profile menu |

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
- To refetch after a change, bump a `version` state that the effect lists in its deps (or call `reload()`). A page
  that loads by hand and can sit behind a form dialog also lists `useDataVersion()` in its deps (`usePagedList` and
  `useDocument` already do).
- **Record pages** (patient, doctor, appointment, treatment plan, payment, user, profile, settings) use the full
  width: `<DetailLayout aside={<ProfileCard … />}>` with the details or tabs as children. Not `narrow`. `MedicalAlerts`
  goes between the `PageHeader` and the `DetailLayout`, above both columns, so it is first on a tablet or phone too.
- **Forms** live in `src/components/forms/`, one per doctype, shared by the new and edit pages and the dialogs
  (in a dialog they also get `onCancel` and `onDirtyChange`, and `FormActions` becomes the dialog's footer). Each exports
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
- **Money** always goes through `useSettings().money(amount, currency)`: pass the record's own `currency` for a plan
  or payment amount (empty means the clinic's), and fetch `currency` with the rows (Latin digits; IQD, in
  `WHOLE_UNIT_CURRENCIES` in `format.ts`, never shows decimals: `IQD 1,250,000`). **Never add amounts of different
  currencies together**: show totals per currency with `moneyTotals(sumByCurrency(rows, amountOf, currencyOf))`
  ("IQD 250,000 + $300"), or add up `baseAmount(payment)` (the payment in the clinic's currency) and
  `toMain(amount, currency)` (a plan's balance at today's rate). A patient's balance is `owedText(total_remaining,
  plans)` with the open plans from `useOpenBalances(ids, enabled)` (per currency when some is in the other one);
  a rate is `rateText(rate)` ("$1 = IQD 1,460"). `useSettings()` also gives `currencies`, `secondCurrency`,
  `rates` and `rateOn(day)`. The form never sends `exchange_rate`: the server sets it. Keep `toMain` out of effect dependencies (it changes when the
  settings arrive): convert at render time. Dates and
  times go through `formatDate`, `formatTime`, `formatDateTime`; today is `todayISO()` (local time).
- **Links** to records use `patientHref`, `appointmentHref`, `treatmentHref`, `paymentHref`, `userHref`.

### The UI kit (`src/components/ui`)

`PageContainer` (`narrow` for forms; up to 1440 px, the whole width with the Wide setting; `section` colours the small tinted icons inside), `PageHeader` (title, subtitle, back link, actions, badge, `avatar`; `icon` and `section` are accepted and not drawn: titles are plain text), `Card`
(`flush` for tables; `icon` draws a quiet grey icon before the title, via `CardIcon`: give every titled card on a record page one), `CARD_CLASS` (the card look, for boxes that are not a `Card`: surface colour, 6 px corners, soft shadow, a border in the bordered skin), `IconTile` (an icon on a soft tint of its colour in a small rounded square; `hue`, sizes sm, md, lg), `hueClass(hue)`, `StatCard` (the figure and its name, a tinted icon on the end side, hidden on phones; `section` or `tone` for the icon's colour), `ActionTile` (a card for an everyday job, with a tinted icon and a hint; `section`), `Badge` (a label chip: 4 px corners, a 16 % tint of its colour with readable text), `StatusBadge` (kinds: appointment, treatment, session, method,
whatsapp, trigger, user) and `statusTone(kind, status)` for other views that must match the badge colours,
`Button` and `LinkButton` (primary, secondary, danger, ghost, success; sm, md; `icon`, `loading`),
`Segmented` (joined view switch, e.g. Day / Week / List; the chosen one solid), `FormActions` (sticky Save / Cancel bar), `Field` (a small label above one input, wrapping it; `error` for a failed check; the label takes the clinic colour while focused; it also catches the browser's own checks, such as `required` or an email address, and shows them as our message under the field instead of the browser's bubble) and `focusField()`, `TextInput`,
`NumberInput` (every amount, price or age box; `decimals={false}` for whole numbers), `PhoneInput` (every phone box),
`SelectInput`, `DateInput`, `TimeInput`, `SuggestInput`, `ColorInput` (the app's own controls, below), `TextArea`, `Toggle`,
`SearchInput`, `Toolbar`, `Table`, `Th`, `Td` (with `label` for the phone cards), `ClickableRow`, `TableLoading`, `TableMessage`, `TableError` (a failed list load with Try Again), `ClearFiltersButton`, `LoadError` (a failed page load with Try Again), `Pagination`, `DetailList` and
`DetailRow` (label beside the value when the card is at least 20rem wide, above it in a narrower card: a container query on `DetailList`), `Tabs` (pills that wrap onto a second line when they do not fit; never a scrolling row, which cut the first tabs off), `Alert`, `Spinner`, `ProgressBar` (0-100 with a label and percentage, or `showLabel={false}`; uploads and the plan's paid bar), `PageLoading`, `RecordLoading`, `EmptyState`, `NoAccess`, `NotFoundCard`; plus
`DetailLayout` (two columns from `xl`: the `aside` on the start side, 4 of 12, hidden on paper; stacked below),
`ProfileCard` (avatar, title, subtitle, badges, actions, children, `stats` as `ProfileStat` tiles, `details`; `titleLevel`
1 when it holds the page's name), `Fraction` ("9 / 14", kept left to right in Arabic),
`Modal` (moves focus in, traps Tab, restores focus on close, Escape closes, locks page scroll; with two open, only
the newest reacts to Escape and Tab; `priority` puts it above other dialogs; `size` md, lg or xl; `side` for a panel
from the end side; `fullScreenOnPhone`; the page's scroll lock is counted, so dialogs closing together in any order
unlock it; an Escape that a control inside already used (`preventDefault`, as the patient picker's list does) does not
close it; `isDialogOpen()`, and the Ctrl+K search does not open over a dialog) and `ConfirmDialog` (focus starts on Cancel) in `Modal.tsx`, and `LinkSelect` for searchable Link fields (its list is a `Popover`, with initials before patients and doctors and a check mark on the chosen one), and `tooltip(text)` (`Tooltip.tsx`) for a hint. Use these instead of
writing new class lists.

### Styling

- **The design ("Clean", chosen by the owner on 2026-09-30, after the pet store app's admin look).** A light grey page
  (`--page-bg` #f8f7fa) with white (`bg-surface`) cards: 6 px corners and a soft shadow (`shadow-md`, 0 3px 12px in the
  text colour at 14 %). A white menu with a soft shadow; the active item is solid clinic colour with a small coloured
  lift (`shadow-primary`). A floating top bar 16 px below the top: see-through white with a blur (on a separate layer:
  a blur on the bar itself would trap the fixed overlays inside it), round icon buttons in the clinic colour. Buttons:
  solid with `shadow-primary`, 40 px (44 px on touch screens), 6 px corners, medium weight; the secondary one outlined.
  Fields outlined (the text colour at 26 %), 2 px clinic colour and a lift on focus, the label small and above.
  Tables plain: small-capital headers in the text colour, thin rows. Pill tabs. Violet clinic colour (#6a5fdd, the
  design's #7367f0 a touch deeper for readable white text). IBM Plex Sans; IBM Plex Sans Arabic in Arabic. No gradients, glows,
  mascots, drawings or cartoon avatars: people are shown by their initials, or a photo.
- **Dark mode and the other appearance choices** are per computer (`src/lib/appearance.ts`, `localStorage.appearance`):
  light, dark or the computer's own setting (the theme menu in the top bar, or the Appearance panel), a menu collapsed
  to 70 px of icons (the pin in the menu's header; pointing at it or tabbing into it opens it over the page), the
  bordered skin (borders instead of shadows), a semi-dark menu on a light page, and a compact (1440 px) or wide page.
  `APPEARANCE_BOOT_SCRIPT` puts the classes (`dark`, `nav-collapsed`, `skin-bordered`, `nav-semi-dark`,
  `content-wide`) on `<html>` before the first paint, and the Tailwind variants `dark:`, `nav-collapsed:`,
  `skin-bordered:` and `content-wide:` (globals.css) react to them.
- **Colours come from a few variables**, so screens need no `dark:` classes: `--ink` (the text colour), `--surface`,
  `--page-bg` and `--shade` change with the mode, and every `gray-*` (the text colour at a strength over the surface:
  900 headings, 800 body, 500 the quietest readable text, 200 borders, 50-100 hover and quiet backgrounds),
  `primary-*` and `surface` class is mixed from them where it is used (`@theme inline`). In dark mode the clinic
  colour's text shades (`text-primary-600` …, rings, borders) are mixed with white to stay readable, so **solid clinic
  colour under white text is `bg-brand`** (`hover:bg-brand-dark`), never `bg-primary-600`. Status hues (red, green,
  yellow, amber, blue, sky, purple, violet, rose) get soft tints (50-200) and light text shades (600-950) in dark
  mode, so **never put white text on `bg-red-600`, `bg-green-600` …**: use `bg-solid-green`, `bg-solid-red`,
  `bg-solid-ink` (the same in both modes) or a fixed hex. A white sheet shown as it will print (the patient ID card) gets
  the `light-paper` class, which puts the light `--ink` and `--surface` back inside it. Use `bg-surface`, never `bg-white`, for anything that is a
  card, menu or field (`bg-white` stays white: a switch knob, the X-ray viewer). Drawings that must look the same in
  both modes (the teeth of the dental chart) use fixed hex paints. The design's colours are `--success`, `--info`, `--warning`,
  `--error` and `--secondary` (`bg-success` …). The semi-dark menu sets its own `--ink` and `--surface`
  (`:root.nav-semi-dark:not(.dark) [data-nav]` in globals.css, so it is right before the first paint), and printing
  always uses the light colours.
- **Tinted icons.** `IconTile`, `StatCard`, `ActionTile` and the timeline take a colour from a `Section`
  (`patients` violet, `appointments` cyan, `treatments` orange, `money` green, `reports` violet, `system` grey,
  `whatsapp` green) or a `Tone`: `hueClass()` writes a `sec-primary`, `sec-blue` … class that sets `--sec`, and
  `bg-sec`, `bg-sec-soft` (a 16 % tint), `bg-sec-light`, `text-sec` and `text-sec-ink` (readable text) use it.
  The class names are written out in full in `SEC_CLASSES` (the UI kit): Tailwind only builds classes it finds in
  the code.
  Charts use it too (`BarChart` bars: the strongest solid, the others `bg-sec-light`; turns compact after 12 bars).
- **Avatars:** `<Avatar name photo size />` (`src/components/Avatar.tsx`): the photo when there is one, else the
  initials on a tint of the clinic colour; `<MyAvatar />` for the user, `<PatientLink id name />` in lists. They are
  `aria-hidden`, so always write the name next to them.
- One visual style everywhere: cards (`Card`, or `CARD_CLASS`) on the page background (`app-bg`, `--page-bg`), 6 px
  corners (`rounded-md`; `rounded-xl` and `rounded-2xl` are 6 px too), the `primary-*` colour, lucide icons. No
  emoji titles, no gradients.
- **Colour: use `primary-50` … `primary-900` for anything that is "the clinic colour"** (buttons, links, active
  menu items, focus rings, highlights). Never write `blue-*` for that. The palette is mixed from one CSS variable,
  `--brand`, which `SettingsContext` sets from Clinic Settings `theme_color` through `applyThemeColor()`
  (`src/lib/theme.ts`). A colour too light for white text is darkened to 4.5:1 contrast. With no `theme_color` (the
  dummy data has none) the default violet `#6a5fdd` (`DEFAULT_THEME_COLOR`) is used; Settings offers it as the first
  swatch, "Default colour". A script in `layout.tsx` applies the
  last colour before the first paint. `blue` stays only as a
  status tone (see Badge colours). The `Tone` type also has `primary`; `StatCard` uses it by default.
- **Text sizes:** `--text-xs` is 13 px and `--text-sm` is 15 px (a little larger than Tailwind's default, for
  reading at a distance); on Arabic screens 14 and 16 px with taller lines (see Languages → Arabic typography). Page titles `text-2xl font-semibold`, card titles `text-lg font-semibold`,
  record names `text-xl font-semibold`, figures (`StatCard`, `ProfileStat`) semibold, body `text-sm`, labels and buttons
  `font-medium`, hints and table headers `text-xs`. Do not add other sizes for ordinary text (the menu is `text-sm` too).
  Every digit has the same width (`font-variant-numeric: tabular-nums` on `body`), so amounts, times and counts line up.
  The fonts have the weights 400, 500 and 600 only: no `font-light` or `font-bold`.
- **Motion is short and calm, and only `motion-safe:`.** A new page fades in while lifting 6 px
  (`animate-page-in`, 0.2 s, on a wrapper keyed by the path in `MainLayout`), buttons shrink to 98 % while
  pressed, clickable cards (`StatCard` with `href`, `ActionTile`) get a deeper shadow on hover, and the menu
  collapses and opens in 0.2 s. The page animation uses fill mode `backwards` so no transform stays on the page
  afterwards: a transform on an ancestor makes the page's `position: fixed` dialogs cover only that ancestor
  (`e2e/tests/motion.spec.ts` checks it). Do not add longer or bigger animations.
- **Touch targets are at least 44 px on touch screens.** Buttons, inputs and tabs are 40 px with a mouse (menu items
  38 px, top-bar icon buttons 38 px) and grow to 44 px on touch screens with the `pointer-coarse:` variant
  (`pointer-coarse:min-h-11`). Do the same for
  any new clickable thing.
- **Phones:** below the `sm` breakpoint every `Table` turns its rows into cards. Give each `Td` except the
  first (the row's name or date) and action cells `label="…"` with the same text as its `Th`; empty cells
  are hidden. End every form with `<FormActions>` (a Save / Cancel bar that sticks to the bottom of the
  screen). Inputs use 16 px text on phones so iPhones do not zoom in.
- **Hints are ours too, never `title`.** Spread `{...tooltip(text)}` on the element (`<button aria-label={x.zoomIn}
  {...tooltip(x.zoomIn)}>`; `Button` and `Link` pass it on). It sets `data-tooltip`, and the one `TooltipLayer` in
  `layout.tsx` shows it: after 350 ms of the mouse resting on it (at once when a hint is already showing), and at once
  on a keyboard focus (`:focus-visible`, not a click). A bubble in the text colour with the page colour as its text
  (dark on a light page, light in dark mode), in the page's font and direction, above the element or below it when
  there is no room, kept on screen and following it on scroll (a portal on the body at z-[70], over dialogs and lists).
  It stays while the mouse moves onto it; Escape closes only the hint (`preventDefault`: a dialog, menu or the X-ray
  viewer checks `defaultPrevented` and stays open); a press anywhere closes it; touch screens get none. While it
  shows, the element gets `aria-describedby="app-tooltip"` unless the hint only repeats its name. A hint is for the
  mouse: give the element an `aria-label`, and put extra facts a screen reader needs in an `sr-only` span (the medical
  alert chips). A disabled button gets no mouse or focus events, so one that explains why it is off uses
  `aria-disabled` and ignores the click (the patient form's checklist). ESLint refuses `title` on DOM elements
  (`react/forbid-dom-props`); an `<iframe>` keeps its `title` with a disable comment (it is its name).
  `e2e/tests/tooltips.spec.ts` checks that no page has a `title` hint.
- **No control the browser draws itself.** Every dropdown, date, time, colour and suggestion box is one of ours, used
  like the native element (`value`, `onChange` with a real event, `name`, `required`):
  - `SelectInput` (`Select.tsx`) takes `<option>` and `<optgroup>` children as before. A real `<select>` stays
    underneath, invisible, as a `peer`: it keeps the label, the form, `required`, the keyboard focus and the tests
    (`selectOption`, `toHaveValue` still work). On top a button (`data-picker` = the field's `name`) shows the choice;
    a click, or Down, Enter, Space or F4 on the field, opens our list: hover and active rows, a check mark on the chosen
    item, a search box above 8 items (`SEARCH_FROM`), Up / Down / Page / Home / End / Enter / Escape / Tab, and typing a
    letter jumps to the next item starting with it. `media={(value) => …}` puts a picture before each item: doctor
    lists pass `doctorMedia(doctors)` from `Avatar.tsx` (photo or initials).
  - `DateInput` and `TimeInput` sit on a hidden `type="date"` / `type="time"`. The calendar has days, months and years
    views, the week starting on `WEEK_STARTS_ON`, the month and day names of the screen's language (`t.dates`), today
    marked, Today and Clear (`clearable`, by default when not required), `min` / `max` (the keys never leave them), and arrow keys (left and right follow the reading
    direction; Page Up / Down a month, with Shift a year). The time picker has hour, minute (5-minute steps; a saved
    minute in between is kept) and AM / PM columns.
  - `SuggestInput` (a text box with suggestions under it; free text still works) and `ColorInput` (a palette and a
    colour code box; Settings → theme colour).
  - They choose with `setNativeValue()`, which sets the hidden element's value and sends a real `change` / `input`
    event, so every form's `handleChange` works unchanged.
  - Their panels are a `Popover` (`Popover.tsx`): a portal on `document.body` (z-[57], so a dialog never cuts it off),
    below the field or above it when there is more room, kept on screen, following the field while the page or a dialog
    scrolls, closed by a click elsewhere; on a phone (below 640 px) a sheet from the bottom with the field's label as its
    title (`sheet={false}` keeps suggestions under a box being typed in; `tall` for a panel that must show whole).
    Escape inside one closes the panel only (`preventDefault` + `stopPropagation`), never the dialog around it. It
    starts transparent, not hidden, so its content can take the focus at once; Tab goes round inside it, and `Modal`
    leaves Tab alone while the focus is in a `[data-popover]`. A fixed `width` is in rem (it follows the Screen Size
    setting); it places itself again when its content grows (a `ResizeObserver`) and measures against the visual
    viewport (the phone keyboard). A tap on the sheet's backdrop closes it on click, so the tap never reaches the page.
    On a touch screen a choice made by tap does not focus the hidden native control again (`coarsePointer()`): on an
    iPhone that would open the browser's own picker. The sheet's title is the Field's label (`data-field-label`), so a
    control outside a `Field` needs an `aria-label`.
  - `Field` shows the browser's own checks as our message; it clears once every control inside passes again, also when
    the page fills the value in itself (a picked patient, a suggested time, Pay full balance).
  - Checkboxes and radio buttons are drawn by `globals.css` (`appearance: none`: a rounded box in the field border
    colour, the clinic colour with a white check, dot or dash when chosen, a focus ring), and so are sliders (the X-ray
    viewer). File inputs are always hidden behind a `Button`. There is no `type="number"` anywhere.
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
  (`onNewTreatment(tooth)` opens the plan dialog; without it, `newTreatmentHref` links to `/treatments/new?patient=…&tooth=…`). A small dot by a tooth number means an open plan.
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

Updated on 2026-10-01.

- **The back end does not have everything yet.** `Patient.dental_chart`, the `*_name` fetch fields,
  read permissions and several field names must be added or confirmed. See `docs/backend-todo.md` (section 9
  is the full field list).
- **Totals are computed in the browser.** The dashboard's revenue and amount owed, the payments total and the
  reports load every matching row (`limit: 0`) and add them up. That is fine for one clinic for years, but a
  back-end report method would be faster later.
- **Data stays in the language it was typed in.** The dummy data is in Arabic (medicine names in Latin letters), so
  English screens show Arabic names and notes as they are, in IBM Plex Sans Arabic. Fixed values (statuses, types,
  methods) are saved in English and only their labels are translated.
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
  (labels of saved values), `errors`, `dates` (month and day names), `ui` (the UI kit), `dashboard`, `money` (the two currencies: names, rates, "Counts as …").
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
- **Which language.** In order: the user's own choice (`User.language`, saved by the language menu in the top bar or the Appearance panel), the
  language chosen on this computer (`localStorage.language_choice`), the clinic's default (Clinic Settings →
  **Default language**, `default_language`), Arabic. `LANG_BOOT_SCRIPT` sets `lang` and `dir` on `<html>` from the
  language shown last (`localStorage.language`) before the first paint.
- **Right to left.** `<html dir="rtl">` in Arabic. Use logical classes only (`ms-`, `pe-`, `start-`, `text-end`,
  `border-s` …), give sideways arrows `rtl:rotate-180`, and slide things in from the start side
  (`-translate-x-full rtl:translate-x-full`). Phone numbers, record IDs, amounts and times in inputs, and the dental
  chart's teeth (anatomical: the patient's right is always on the left) keep `dir="ltr"`.
- **Fonts.** One family in both languages (the owner's choice, 2026-10-01): IBM Plex Sans for English, and IBM Plex Sans
  Arabic for everything in Arabic, headings included, in both scripts (its Latin letters were drawn to sit beside its
  Arabic ones, so a name typed in English matches the Arabic around it). The files are in `public/fonts/` and their rules in
  `src/app/fonts.css` (`--font-plex`: IBM Plex Sans, then IBM Plex Sans Arabic for Arabic letters on English screens;
  `--font-arabic`). They used to come through `next/font/google`, which downloads them while the dev server runs: when
  that download failed (2026-10-01, on the owner's computer) the app fell back to Arial without a word. Never go back
  to it. `e2e/tests/arabic-type.spec.ts` blocks Google Fonts and checks the fonts still load.
- **Arabic typography** (`:root[lang="ar"]` in `globals.css`, overriding Tailwind's variables, so no component changes):
  small text 14 px on 24 px lines and body text 16 px on 27 px lines (Arabic letters look smaller than Latin ones and
  carry dots and marks above and below), line heights of 1.5-1.75 for larger sizes and the `leading-*` classes,
  **no letter spacing at all** (`--tracking-*` 0 and `letter-spacing: 0` on everything: spacing pulls joined letters
  apart), and no italics. Arabic punctuation in the texts: ، ؛ ؟ and the single ellipsis character (…), never `...`.
  Money keeps its amount and currency together with a no-break space. Wide grids that hold Arabic labels and amounts
  go side by side only when there is room (`2xl:` on Reports' figures, container queries `@sm:` in `ProfileCard`'s
  figures and the patient's facts). `e2e/tests/arabic-type.spec.ts` checks the font, sizes and spacing.
- **Mixed Arabic and Latin on one line.** A Latin ID, name or dose next to an Arabic word with a number trades places
  with it under the bidi rules ("PAT-2026-00004 · 53 سنة" showed as "53 · سنة PAT-2026-00004"). For text, join the
  parts with `joinParts(parts, t.common.dot)` (`src/i18n/runtime.ts`: each part in U+2068 … U+2069 on Arabic screens,
  and on English screens when a part holds Arabic letters; English-only text unchanged); in JSX use `<Parts parts={[…]} />` (UI kit: each part in a `<bdi>`, kept whole, so a narrow
  column moves a part to the next line instead of splitting a name around it), or wrap typed text in `<bdi>`.
- **Wrap typed text, do not cut it.** `truncate` on Arabic text inside an English line cuts its start, not its end ("…مة س." for "فاطمة س."). Names, reasons and list options use `break-words` (dropdown and patient-picker options wrap onto a second line); cut only where the box has a fixed size (calendar blocks).
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

# What DentClinic can reuse from the pet store app

Written 2026-09-26. This is a study of `alkhokh_pet_store_front` (the owner's other front end) to find code
and ideas worth bringing into DentClinic.

**Status:** the owner chose items **1, 2, 3, 4, 6, 11 and 22** on 2026-09-26. Each of them is marked
**Brought in** below once it is in DentClinic; the other items are only ideas.

**How to answer:** reply **"go"** to bring in everything on the list in section 5, or **"go with 1, 3, 5"**
to bring in only those numbers. Items are numbered from most useful to least useful for a dental clinic.

Rules for bringing things in (from the owner): only the logic and ideas are taken, never the look. DentClinic
keeps its own colours, logo, fonts, layout and UI kit. Nothing about pets, the store or its brand is kept.
No secrets, addresses or `.env` values are copied.

---

## 1. Where the app is, and how it was read

- The app was found inside the DentClinic folder (`dentclinic-project/alkhokh_pet_store_front`, not tracked
  by git). It was **moved out to `D:\Projects\alkhokh_pet_store_front`** so the two apps no longer share
  a folder. The move was done with renames only; nothing inside the app was changed.
- It was treated as read-only: nothing in it was built, installed, run or changed.
- About 1,970 source files were surveyed: the connection to Frappe, login and upload code was read line
  by line, and four read-only helpers surveyed the clinical screens, money and printing, WhatsApp / phone
  numbers / Arabic, and the shared building blocks. The most important claims below were checked in the
  source again.

## 2. What the app is

- **What it does:** the back office of a veterinary clinic and pet store in Iraq: vet visits, treatment
  plans, vaccinations and deworming, lab and imaging files, boarding, a point-of-sale till, stock and
  warehouses, accounting, drivers and delivery, WhatsApp messaging, reports, users and permissions.
  English and Arabic, with a right-to-left layout for Arabic.
- **Framework (different from DentClinic):** Vue **3.5.14**, Vuetify **3.8.5** (built on a bought admin
  template, the `src/@core` and `src/@layouts` folders), Vite **6.3.5**, Pinia **3.0.2** for state,
  vue-router **4.5.1** with file-based routes, vue-i18n **9.13.1**, axios **1.12**, TypeScript **5.8.3**,
  pnpm 8. App version 9.4.0. It also has a PWA mode and an Electron desktop build.
  Because it is Vue, **no component can be copied as it is**. Everything must be rewritten in React with
  DentClinic's UI kit. Plain TypeScript helpers (phone numbers, digits, dates) can be ported almost as
  they are.
- **Folder structure (inside `src/`):** `pages/` (181 route files, one folder per module), `components/`
  (576 files, one folder per area), `api/` (121 files, one per back-end area), `services/` (the HTTP
  client, login, Frappe helpers, printing), `composables/` (shared logic, like React hooks), `stores/`
  (Pinia state: login, toasts, notifications), `utils/` (small helpers such as `phone.ts` and
  `intlLocale.ts`), `plugins/` (router, i18n with `locales/en.json` and `ar.json` of about 12,900 lines
  each), `config/`, `modules/` (queue, reports, healthcare), `mock/` and `plugins/fake-api/` (demo data).
  Outside `src/`: `docs/` (about 130 notes and back-end contracts), `scripts/` (tests and deploy scripts),
  `electron/`, `public/`, `.github/workflows/`.
- **How it talks to its back end:** a Frappe / ERPNext app with its own custom app on top. One axios
  instance (`src/plugins/axios.ts`) with the server address from `VITE_API_URL`, `withCredentials: true`
  and a 15-second timeout. A small `HttpClient` class (`src/services/httpClient.ts`) builds
  `/api/resource/<Doctype>` and `/api/method/<method>` addresses, like DentClinic's `src/lib/frappe.ts`.
  Its own server methods answer in a wrapper `{ ok, data, meta, errors }` that the client unwraps. Screens
  can run on mock data per module with `VITE_*_USE_MOCKS` switches.
- **How it is deployed:** `vite build` makes static files. A GitHub Actions workflow builds on every push
  to `develop`, checks the files, uploads them to the server over SSH, restarts the app with PM2, checks
  that the live site serves the new files, and rolls back automatically if it does not. An example Nginx
  file sends `/api/` to the Frappe server. The Dockerfiles are template leftovers.

## 3. The real Frappe connection: what the pet store does, compared with DentClinic

| Question | Pet store | DentClinic today |
|---|---|---|
| Server address | `VITE_API_URL` at build time, else the same address as the page. The browser calls Frappe directly, so Frappe must allow cross-site requests with cookies. | `FRAPPE_URL`, reached through the `/frappe` rewrite in `next.config.ts`, so the browser only talks to its own address. **Better for cookies; keep it.** |
| Login | Two ways, chosen by `VITE_AUTH_STRATEGY`. **Session:** `POST /api/method/login` with `usr` and `pwd`, then `GET frappe.auth.get_logged_user` to prove the cookie really stuck. **Token:** OAuth2 "password" login at `frappe.integrations.oauth2.get_token`, then `Authorization: Bearer …` on every request, with a refresh token. | Session login only; no check that the cookie stuck. |
| Logout | Only clears the browser's storage. **It never calls Frappe's logout**, so the session stays valid on the server. | Calls `/api/method/logout`, then clears storage. **Better; keep it.** |
| CSRF token (section 5 of `docs/backend-todo.md`) | **Never reads or sends one.** In token mode none is needed. In session mode it works because Frappe only checks the `X-Frappe-CSRF-Token` header when the session already holds a CSRF token, and a session made by `/api/method/login` normally gets one only when the Frappe desk page is opened in it. (This is how Frappe v14/v15 behave; check it on the v16 server.) | Reads an `x-frappe-csrf-token` response header after login, which Frappe does not send, so that code does nothing. The robust fix in `docs/backend-todo.md` section 5 (a small method that returns the token after login) still stands. |
| Session ended | Frappe answers a dead session with **403 and user Guest, not 401**. On a 403 the app asks `frappe.auth.get_logged_user` once (one shared request even when ten calls fail together). If the answer is Guest it shows one "Your session has ended. Please sign in again." message, logs out once and goes to the login page, which then returns to the page you were on. A real "no permission" still shows as a permission error. | A dead session shows "You do not have permission to do this." on every screen, and the saved user stays. |
| Errors | Sorts every failure into: the server said no (its own words are shown, never the traceback); timeout ("The server took too long to answer. Nothing was saved, please try again."); cannot reach the server; cancelled (silent). Turns Frappe's `MandatoryError` into the field's name, and "Duplicate entry" and "Data too long" into plain sentences. Only failures with no answer are retried, with a pause, and never a refusal. A header lets one call skip the automatic error message. | `errorMessage()` already reads `_server_messages` and `exception`. No timeout, so a hung server spins forever. No retries. |
| File uploads | `POST /api/method/upload_file` (multipart) with `doctype` and `docname`. Photos are shrunk and converted first (see item 7). Because token mode cannot send cookies with `<img>`, private files are downloaded as data through the logged-in client and shown with `URL.createObjectURL`. Its lab and imaging uploads are stored as **public** files, which DentClinic must not copy. | `attachFile()` uploads private files (`is_private=1`); `<img src="/frappe/private/…">` works because the cookie goes with it. |

## 4. Things already solved for Iraq

- **IQD money:** screens use `maximumFractionDigits: 0` for IQD, so `1,250,000.5` never appears. ISO says
  IQD has 3 decimal places and browsers disagree, so pinning it matters. Receipts show `1,250,000 IQD`.
  There is no amount-in-words anywhere.
- **Iraqi phone numbers** (`src/utils/phone.ts`, `toDialablePhone`, default country code 964): remove
  everything but digits; if the text started with `+` keep the digits; if they start with `00` drop the
  `00`; if they start with `0` replace it with `964`; otherwise add `964` unless it is already there. So
  `0770 123 4567` becomes `9647701234567` for `wa.me`. To find the same patient under two spellings it
  compares the last digits (`normalizePhone`, `samePhone`), and `maskPhone` hides the middle digits.
  Gaps: it does not convert Arabic-Indic digits first, and there is no check of Iraqi mobile prefixes.
- **Arabic and right-to-left:** the language is kept in a cookie and sets `<html lang>` and
  `<html dir>`. Numbers and dates use `ar-IQ-u-nu-latn`: Arabic words and month names, but ordinary
  digits 0-9 (a plain `ar-IQ` prints `٧٥٬٠٠٠`). `toLatinDigits()` turns `٠-٩` and `۰-۹` typed on Arabic
  keyboards into `0-9` before a field is cleaned; otherwise a typed amount silently becomes empty.
  Mixed Arabic and English text is kept apart with `dir="auto"` and `unicode-bidi: isolate` (like
  `<bdi>`), phone numbers are always `dir="ltr"`, and an Arabic font is bundled with the app.
- **Translations:** two JSON files (`en.json`, `ar.json`) with one namespace and `{param}` placeholders.
  Every visible string must exist in both. The check script only tests that the files parse; a real
  "same keys in both languages" check exists for one section only.

## 5. Things worth bringing into DentClinic

Sizes are for DentClinic: **small** is under a day, **medium** is a few days, **large** is a week or more.
Paths are inside `D:\Projects\alkhokh_pet_store_front`.

### 1. WhatsApp links and search that work with Iraqi phone numbers
- **Brought in** (2026-09-26): `src/lib/phone.ts`, the Clinic Settings field `phone_country_code`, and
  `e2e/tests/phone.spec.ts`. See IMPROVEMENTS.md for the commit.
- **What:** port `toDialablePhone` and `toLatinDigits`. WhatsApp buttons (reminders, recall, receipts,
  balance reminders) then open `wa.me/9647701234567` for a number typed as `0770 123 4567` or
  `٠٧٧٠١٢٣٤٥٦٧`. The duplicate-patient warning and the patient search also match `0770…`, `+964 770…`
  and `00964…` as the same number (compare the last 10 digits).
- **Where:** `src/utils/phone.ts`, `src/utils/intlLocale.ts` (`toLatinDigits`).
- **Why:** today `src/lib/whatsapp.ts` only removes spaces, so every locally typed Iraqi number gives a
  broken WhatsApp link.
- **Size:** small.
- **Risk:** a foreign number typed without `+` or `00` gets `964` in front; the button can show the number
  it will use. The country code could be a Clinic Settings field instead of a fixed 964.
- **Back end:** none needed. Optional: a `phone_country_code` field on Clinic Settings.

### 2. A safer connection to the real Frappe server
- **Brought in** (2026-09-26): `src/lib/frappe.ts` (`getLoggedUser`, `onSessionEnded`, `onSessionRestored`,
  `SessionEndedError`, `withReadRetry`, `isServerDown`, timeouts, plainer errors), `AuthContext` ("Keep me
  logged in on this computer", `sessionEnded`, `loginCount`), `SessionEndedNotice`, `MainLayout` and
  `src/app/_login/page.tsx` (`?next=` and `&ended=1`), `e2e/tests/connection.spec.ts`. Built differently on
  purpose: an ended login keeps the page and asks for the password in a dialog (the pet store logs out and
  leaves the page), and `MandatoryError` is not rewritten because Frappe's own message is already readable.
  The text below is the original plan.
- **What:** all inside `src/lib/frappe.ts`, `AuthContext` and the login page:
  - Detect an ended session (403, then `frappe.auth.get_logged_user` says Guest). Show one message, log out
    once, go to the login page, and return to the page afterwards.
  - After login, confirm with `get_logged_user` that the cookie stuck. A wrong cookie setup then shows up at
    login, not on the first save.
  - Add a 15-second timeout (longer for uploads). Timeouts, "cannot reach the server" and refusals get
    separate, clear messages. Cancelled calls stay silent.
  - Turn `MandatoryError`, "Duplicate entry" and "Data too long" into plain sentences.
  - Retry a read that got no answer at all, but never a save.
  - Optional: a "Remember me" box. When it is off, the login is forgotten when the browser closes, which
    suits shared front-desk computers.
- **Where:** `src/services/httpClient.ts` (about lines 65–147, 590–626, 764–866, 870–921),
  `src/services/authService.ts`, `src/api/authApi.ts` (`Login`, `GetLoggedUser`),
  `src/plugins/1.router/index.ts` (the `redirect` back to the page).
- **Why:** staff see "session ended, sign in again" instead of a false "no permission" on every screen, and
  no button spins forever.
- **Size:** small to medium.
- **Risk:** with `MOCK_DATA = true` these paths are not used, so they can only be fully tried on a real
  server. The helpers can be tested on their own.
- **Back end:** none. (The CSRF question in `docs/backend-todo.md` section 5 stays as it is.)

### 3. IQD amounts with no decimals, and Arabic digits in number fields
- **Brought in** (2026-09-26): `formatMoney` and `cleanNumberText` in `src/lib/format.ts`, `NumberInput` and
  `PhoneInput` in the UI kit (used for amounts, prices, the cost of a plan, the age and every phone box), and
  `e2e/tests/numbers.spec.ts`. Money boxes take whole dinars when the currency is IQD. Thousands separators
  while typing were left out: the box shows the plain number.
- **What:** `formatMoney` always shows IQD without decimals. Amount, phone and age fields accept digits typed
  on an Arabic keyboard. Optional: amount fields show thousands separators while typing
  (`1,250,000`).
- **Where:** `src/utils/intlLocale.ts`, `src/composables/useDriverMoney.ts`,
  `src/components/healthcare/VisitBillingCard.vue` (lines 22–44), `src/components/shared/PriceInputField.vue`.
- **Why:** Iraqi amounts are whole dinars. Many staff computers and phones type Arabic-Indic digits even
  in an English screen.
- **Size:** small.
- **Risk:** none worth noting. Only the display changes; stored numbers stay as they are.
- **Back end:** none. (Frappe's currency precision for IQD can be set to 0 as well.)

### 4. 80 mm (and 58 mm) thermal receipt slips
- **Brought in** (2026-09-26): `src/lib/receiptSlip.ts` (`buildReceiptSlip`, `printHtml`, paper settings),
  `src/components/ReceiptSlip.tsx` (the row under the payment receipt and its settings dialog) and
  `e2e/tests/receipt-slip.spec.ts`. The slip shows what was left on the treatment right after that payment
  (so a reprint is the same) and who printed it and when; the page is sized to the slip's measured length.
- **What:** a "Print slip" button on the payment page next to the A4 receipt. It builds a narrow receipt and
  prints it through a hidden frame, so the page itself does not change. Each computer keeps its own paper
  width (58 / 80 mm or custom), margin and text size, with a test print that uses a worst-case example.
  The slip shows the clinic, patient, treatment, amount, method, what is still owed and the receipt number.
- **Where:** `src/services/posReceiptPrinter.ts`, `src/composables/usePosReceiptSettings.ts`,
  `src/components/pos/PosSettingsPanel.vue`.
- **Why:** many Iraqi clinics hand out thermal slips, and A4 is slow and costly at the front desk.
- **Size:** small to medium.
- **Risk:**
  - The real page length is decided by the printer driver, so test it on the clinic's printer.
  - The hidden frame does not get the app's font, so use a system font.
  - The browser still shows its print dialog; printing without the dialog needs a kiosk setting in Chrome.
- **Back end:** none.

### 5. A recall date chosen by the dentist
- **What:** the pet store gives each vaccine a "next due date" picked by the vet. When a dose is given, the
  next one is created automatically, and reminders go out from 30 days before to 90 days after. For
  DentClinic:
  - When a visit is finished (the existing "What was done in this visit?" dialog) or on the patient page,
    the dentist picks "next check-up in 3 / 6 / 12 months" or "no recall".
  - The Recall list and the dashboard use that date first.
  - The current rule ("no visit in N months") stays for patients without a date.
- **Where:** `docs/PREVENTIVE_CARE_RECORD_CONTRACT.md` (sections 2, 4.4, 5.4),
  `src/components/pet-profile/preventive/PreventiveCareAdministerDialog.vue`,
  `src/type/pet-profile/preventive/index.ts` (`isValidNextDue`), `src/api/preventiveCareApi.ts`.
- **Why:** a gum patient is due every 3 months and a child every 6. The dentist knows this, a fixed rule
  does not.
- **Size:** medium.
- **Risk:** two sources can disagree; the dentist's date wins.
- **Back end:** new Patient fields `next_recall_date` (Date) and `recall_interval_months` (Int). A full
  `Recall` doctype can come later.

### 6. A failed load must never look like "nothing there"
- **Brought in** (2026-09-26): `TableError`, `LoadError` and `ClearFiltersButton` in the UI kit, used by the
  seven lists (patients, appointments, payments, treatments, doctors, users, WhatsApp log), the dashboard,
  the Today board, the recall list and the bell; a test switch in the dummy data (`window.__mockFail`) and
  `e2e/tests/load-errors.spec.ts`.
- **What:**
  - DentClinic lists already show a red message when loading fails. Add a **Retry** button, and do not also
    show "No patients found" under it.
  - Show "No match for this search" with a **Clear search** button, separately from "No patients yet".
  - The dashboard counts, the Today board, the bell and the recall list quietly show 0 or empty when a load
    fails. They should say "Could not load" with Retry.
- **Where:** `src/components/shared/AppErrorState.vue`, `src/components/shared/EntityListEmptyState.vue`,
  `src/modules/reports/composables/useReportEngine.ts`.
- **Why:** "0 appointments today" on a network error is dangerous at a front desk.
- **Size:** small.
- **Risk:** none worth noting.
- **Back end:** none.

### 7. Photos from phones: iPhone pictures and smaller files
- **What:** in "X-rays & Photos":
  - Recognise iPhone HEIC photos by their first bytes and convert them to JPEG. The phone's own decoder is
    tried first; the converter library is loaded only when needed.
  - Shrink clinical photos to at most 1600 px and re-encode them, trusting the type the browser really
    produced (old iPhones quietly give PNG).
  - Show progress for several files. Refuse a file that cannot be shown instead of storing it.
  - **X-rays and PDFs are always kept as the original file.**
- **Where:** `src/utils/heicImage.ts`, `src/utils/pickedImages.ts`, `src/api/attachmentAPi.ts`
  (`optimizeImageFile`, `encodeCanvas`, `preserveOriginal`).
- **Why:** intra-oral and smile photos are taken on phones. A 6 MB HEIC photo cannot even be shown in
  Chrome.
- **Size:** medium.
- **Risk:** shrinking an X-ray would lose detail, so the upload must ask "photo or X-ray".
- **Back end:** none.
- **Package:** `heic-to` (free, loaded only when a HEIC photo is picked, about 2.9 MB). Without it,
  HEIC photos would only work on iPhones and Macs.

### 8. Record history: who changed what, and when
- **What:** a "History" section on the payment, treatment plan, appointment and patient pages: created by,
  and each change with the fields changed, the user and the time. It uses Frappe's own version records
  through `frappe.desk.form.load.getdoc`.
- **Where:** `src/api/openHubApi.ts`, `docs/README.record-meta-hub-plan.md`.
- **Why:** "who changed this payment?" is a common manager question, and DentClinic has no answer today.
- **Size:** medium.
- **Risk:** only as good as Frappe's "Track Changes" setting.
- **Back end:** turn on **Track Changes** for Patient, Appointment, Treatment Plan and Payment. Users need
  read access to `getdoc`.

### 9. Prescriptions with safety warnings
- **What:** write a prescription from a short medicine list that fills in the usual dose, how often, for how
  many days, and the instructions. Warnings come from DentClinic's own medical alerts and never block
  saving:
  - penicillin allergy with amoxicillin
  - painkillers (NSAIDs) with a blood thinner
  - pregnancy
  - a child's dose outside the usual range
  - the maximum local anaesthetic dose
  The prescription prints on the clinic letterhead.
- **Where:** `src/components/visit-v11/V11MedicationSection.vue` (lines 304–392),
  `src/constants/medicationDoseLadder.ts` (`doseOutOfRange`), `docs/medication.md`.
- **Why:** prescribing is part of most dental visits, and the checks match the medical-safety goal.
- **Size:** medium (large with dose rules per weight).
- **Risk:** the medicine list and the rules must be checked by the dentist before use.
- **Back end:** new doctypes, for example `Dental Medicine` (usual dose and instructions) and
  `Prescription` with medicine rows, linked to the patient and the visit or plan.

### 10. Follow-up visits that are not forgotten
- **What:** planned follow-ups (post-op check, suture removal, crown try-in) with a due date:
  - The Today board lists the ones that are overdue or due today and have no appointment yet.
  - Each can be marked **attended** or **missed**; missed needs a reason.
  - DentClinic's own Treatment Sessions (status Scheduled, with a date) can carry this, rather than a new
    system.
- **Where:** `src/components/visit-v11/treatment-plan/treatmentPlan.ts` (`groupOf`, `canMarkMissed`),
  `src/components/visit-workbench/FollowUpSchedulingQueue.vue`, `src/api/caseFollowUpApi.ts`.
- **Why:** a missed post-op check is a clinical risk and a lost visit.
- **Size:** medium.
- **Risk:** it overlaps with appointments; one session should link to one appointment.
- **Back end:** an `appointment` link and a `Missed` status (with `missed_reason`) on Treatment Session.

### 11. Cash count at the end of the day
- **Brought in** (2026-09-28), saved as the owner asked: the Cash Count doctype (dummy data for now; see
  `docs/backend-todo.md`), `src/components/CashCountCard.tsx` (the drawer box and the recent counts on
  `/payments/day`), `src/lib/cashCount.ts` and `e2e/tests/cash-count.spec.ts`.
- **What:** on the end-of-day report, type the cash actually counted. The page shows **Matched**,
  **Short by X** or **Over by X**, and "Unknown" instead of 0 when data is missing.
- **Where:** `src/components/accounting/CashierSettlementDrawer.vue`,
  `src/services/accounting/cashierSettlementLabel.ts`.
- **Why:** it finishes the existing day report, which already shows the cash that should be in the drawer.
- **Size:** small if it is only printed, medium if it is saved.
- **Risk:** none worth noting.
- **Back end:** none for the printed version. To save it, a `Day Close` doctype (date, expected, counted,
  difference, user).

### 12. A better X-ray viewer
- **What:** in the photo viewer, add zoom, drag, rotate, brightness, contrast, negative (invert) and grey.
  Optional: a ruler that shows millimetres only after a known length is entered.
- **Where:** `src/components/healthcare/DicomImageViewerDialog.vue` (it only opens normal images and PDFs,
  despite its name), `src/utils/clinicalAttachments.ts`.
- **Why:** reading periapical and panoramic X-rays on a tablet.
- **Size:** medium.
- **Risk:** measurements are only approximate.
- **Back end:** none.
- **Package:** none (plain browser canvas and CSS filters).

### 13. Lists that remember their filters
- **What:** search, filters, page and sort of the appointment, patient, treatment and payment lists live in
  the page address. The Back button returns to the same filtered list, and a filtered list can be shared
  as a link.
  - Unknown values are dropped and page sizes are limited.
  - Defaults are left out of the address.
  - "Last 30 days" is kept as words, not dates, so it is still right tomorrow.
- **Where:** `src/composables/useListStatePersistence.ts`, `docs/README.filter.md`.
- **Why:** the receptionist opens a patient from a filtered list and comes back to the same place.
- **Size:** medium.
- **Risk:** keep only the screen's choices, never the rows themselves.
- **Back end:** none.

### 14. Payments that cannot be saved twice
- **What:** each payment attempt gets one key. If the network times out and the receptionist presses Save
  again, the server sees the same key and does not add a second payment.
- **Where:** `src/composables/useIdempotentAction.ts`, `src/services/posSaleEnvelope.ts`
  (`newIdempotencyKey`, which also works on plain `http://` where `crypto.randomUUID` is missing).
- **Why:** a double payment is the most painful mistake at a front desk.
- **Size:** small on the front end.
- **Risk:** it only helps once the server checks the key.
- **Back end:** a unique `client_request_id` on Payment; a repeated key returns the first payment instead of
  making a new one.

### 15. Discounts on treatment plans, with limits
- **What:** a discount on a treatment plan, either a percentage or a fixed amount:
  - A percentage is capped at 100; a fixed amount cannot be more than the cost.
  - Switching type checks the value again; 0 removes the discount.
  - The estimate, statement and receipt show it.
- **Where:** `src/utils/posDiscount.ts`, `src/components/accounting/SalesInvoiceDiscountEditor.vue`.
- **Why:** family and loyalty discounts are common, and today staff lower the cost by hand with no trace.
- **Size:** medium.
- **Risk:** money rules must match on the server.
- **Back end:** `discount_type`, `discount_value` and a computed `discount_amount` on Treatment Plan, with
  `remaining_amount` worked out after the discount.

### 16. Consent form and procedure checklist
- **What:**
  - A printable consent form for extraction, implant or root canal, on the letterhead, with the patient,
    tooth, treatment, a short risk text and signature lines.
  - A short checklist before a plan is marked Completed: consent signed, pre-op X-ray, anaesthetic
    recorded, instructions given.
- **Where:** `src/components/healthcare/ClinicalRecordDetailPage.vue` (lines 92–111 and 1154–1216).
- **Why:** consent is a legal and safety step.
- **Size:** small for the printout, medium with the checklist.
- **Risk:** keep the list short, or it becomes box-ticking.
- **Back end:** none for the printout. For the checklist: `consent_signed` (Check) and `consent_date`
  (Date) on Treatment Plan, or a checklist table.

### 17. Alerts for new bookings, and an "offline" notice
- **What:**
  - The bell checks every 15 seconds (every 45 when the tab is hidden, and at once when it is shown again).
  - It plays a short sound, made by the browser with no audio file, only for new walk-ins or bookings made
    by someone else. It is never played on first load.
  - A small notice says when the internet is down.
- **Where:** `src/stores/notification.store.ts`, `src/services/notificationSound.ts`,
  `src/plugins/network-status.ts`.
- **Why:** the dentist's screen shows a walk-in added at the front desk without a refresh.
- **Size:** small to medium.
- **Risk:** browsers block sound until the first click.
- **Back end:** none (it reads Appointments created since the last check).

### 18. Waiting-room screen that calls the next patient
- **What:**
  - A "Call" button on the Today board.
  - A TV page shows the queue number and a chime, and says the call aloud in Arabic with the browser's own
    voice. It never shows full names.
- **Where:** `src/modules/queue/composables/useVoiceAnnouncement.ts`,
  `src/modules/queue/composables/useQueuePolling.ts`, `src/modules/queue/pages/QueueDisplayPage.vue`.
- **Why:** a calmer waiting room.
- **Size:** medium.
- **Risk:**
  - The TV page must show numbers only.
  - Not every TV browser has an Arabic voice.
- **Back end:** `queue_number` and `called_at` on Appointment, and a read-only way for the TV to get the
  current call.

### 19. PDF receipts, estimates and statements to send on WhatsApp
- **What:**
  - Make a PDF of the receipt, estimate or statement in the browser.
  - Save it, open WhatsApp with a short text, and tell the user to attach the file (`wa.me` cannot carry
    files).
  - The same page layout is used for screen, print and PDF.
- **Where:** `src/services/salesInvoiceDocument.ts`, `src/composables/useSalesInvoiceDocument.ts`,
  `src/utils/downloadBlob.ts`, `src/components/whatsapp/send/SendToWhatsAppDialog.vue` (`openInWhatsApp`).
- **Why:** patients ask for their bill on WhatsApp.
- **Size:** medium.
- **Risk:**
  - The PDF is a picture of the page (text cannot be searched).
  - Mixed Arabic and English lines need care.
  - A simpler option needs no package: the print dialog's "Save as PDF".
- **Back end:** none.
- **Package:** `html2pdf.js` (free; brings jsPDF and html2canvas, loaded only when used).

### 20. Automatic checks on GitHub, and deployment notes
- **What:**
  - A GitHub Actions workflow that runs `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build` and the
    Playwright tests on every push.
  - A short `docs/deployment.md` for DentClinic: `next start` behind Nginx, `FRAPPE_URL`, keeping the
    `/frappe` rewrite.
  - Later, the pet store's safe deploy (upload, check the live files, roll back on failure) can be copied as
    an idea.
- **Where:** `.github/workflows/deploy-develop.yml`, `docs/deployment.md`, `scripts/deploy/`.
- **Why:** mistakes are caught before they reach the clinic.
- **Size:** small (checks only).
- **Risk:** the repository must be on GitHub.
- **Back end:** none.

### 21. Arabic interface with right-to-left layout
- **What:**
  - An English/Arabic switch. The server sets `<html lang>` and `<html dir>` from a cookie, so there is no
    flash of the wrong direction.
  - Dates and numbers use `ar-IQ-u-nu-latn`.
  - Two dictionaries with a script that checks both have the same keys and placeholders.
  - `<bdi>` / `dir="ltr"` for names and phone numbers.
  - An Arabic font through `next/font`.
  - Arabic plural and "and" rules.
  - DentClinic's start/end classes and `rtl:rotate-180` arrows are already ready for this.
- **Where:** `src/@core/initCore.ts`, `src/utils/intlLocale.ts`, `src/utils/localizedName.ts`,
  `src/plugins/i18n/index.ts`, `scripts/test-boarding-discount.ts` (the key check idea).
- **Why:** most staff and patients in Iraq read Arabic.
- **Size:** large (every screen's text must be translated).
- **Risk:**
  - Printouts need an Arabic font.
  - The owner's earlier setting was "Arabic interface: NO". Choose this number only if that has changed.
- **Back end:** optional `language` on User, and `preferred_language` on Patient for messages.

### 22. Small helpers (each small)
- **Brought in** (2026-09-28): `csvSafe()` in every CSV export, the screen size on `/profile`
  (`src/lib/display.ts`), `maskPhone()` in the WhatsApp message log, the governorates as suggestions in the
  patient address box (`src/lib/iraq.ts`, with Halabja), and `e2e/tests/small-helpers.spec.ts`. The clinic
  time zone for "today" was left out: DentClinic already uses the computer's own date.
- **Safe CSV exports:** a cell that starts with `=`, `+`, `-` or `@` gets a leading `'`, so a patient name
  cannot run as a formula in Excel. The pet store lacks this too; DentClinic's report export needs it.
- **Screen zoom for reception computers:** 70–120 %, remembered per computer (`src/composables/usePageZoom.ts`).
- **Masked phone numbers** on shared or public screens (`maskPhone` in `src/utils/phone.ts`).
- **Iraqi governorates** list for the address (`src/composables/useIraqiGovernorates.ts`; 18 governorates,
  Halabja must be added).
- **Clinic time zone for "today"** (`src/services/frappe/serverDay.ts`): only needed if a computer's clock
  is set to another time zone. DentClinic already uses the computer's local date, not UTC.

## 6. Things NOT to take, and why

- **The look:** the Vuetify admin template (`src/@core`, `src/@layouts`, `themeConfig.ts`), SCSS, colours,
  icons, images, fonts, logos, the cat and dog loading animations and sounds. DentClinic keeps its own
  design.
- **The libraries themselves:** Vue, Vuetify, Pinia, vue-i18n, CASL, FullCalendar. The ideas are rewritten
  in React; DentClinic already has a calendar.
- **The WhatsApp Cloud API system** (message queue, Meta templates, rule designer, live inbox, webhooks). It
  needs a verified Meta business account, approved templates, tokens and a back-end queue. DentClinic's
  `wa.me` links are enough for now.
- **OneSignal push notifications, the PWA service worker and the Electron desktop app:** extra accounts
  and moving parts for little gain. The web app in a browser is enough.
- **Its OAuth "token" login as it is:** the client secret sits in a `VITE_` variable, and every `VITE_`
  value is readable by anyone who opens the app. It would also force private X-rays to be downloaded
  through the client. DentClinic's cookie session through its own address is simpler and safer.
- **Its logout:** it does not end the session on the server. DentClinic's logout does; keep it.
- **Not a clinic job:** point of sale, cashier tills, stock, warehouses, ERPNext accounting and ledgers,
  drivers, delivery partners, coupons, online shop, CRM, HR, boarding, graveyard, and species-specific
  pieces.
- **Too heavy for what it gives:**
  - lab report OCR (OpenCV and Tesseract)
  - pharmacy dispensing (dental prescriptions are filled outside)
  - the report engine that runs server scripts in the browser (not a security boundary)
  - workspace tabs
  - the module registry and the access designer (DentClinic's 14 permission flags are enough)
- **Parts that are broken or unsafe there:**
  - the `xlsx` package (the npm version is outdated and has security advisories)
  - printing through `window.open` (popup blockers)
  - Frappe `/printview` print formats
  - the loose validators in `src/helper/validations.ts`
  - four duplicated WhatsApp phone helpers that break on 10-digit numbers
  - the pinch-zoom blocker (it hurts accessibility)
  - `new Date().toISOString().slice(0, 10)` for "today" (gives yesterday's date after midnight in Baghdad)
  - public storage of lab and imaging files
  - money strings pre-formatted by the server
- **Template leftovers:** Dockerfiles, docker-compose files, `nginx.conf` (with a fixed server address),
  MSW and `fake-api` demo data.

## 7. Security notes for the owner

- In the pet store repository, `.env.develop` is **committed to git** and holds real secrets: a WhatsApp
  access token, a Meta app secret and an OAuth client secret. They were not copied here. Consider
  replacing those secrets and removing the file from the repository.
- A fixed server address appears in `package.json` (deploy scripts), `nginx.conf`, `docs/deployment.md`,
  `src/constants/barcode.ts` and a comment in `src/services/frappe/dedupe.ts`. None of it was copied.
- Anything in a `VITE_` variable ends up in the browser, so `VITE_AUTH_TOKEN_CLIENT_SECRET` is visible to
  anyone who opens the pet store app.

## 8. New packages the items would need

Only two items need a package; everything else is plain TypeScript and React.

| Item | Package | Why |
|---|---|---|
| 7 | `heic-to` | Converts iPhone HEIC photos in browsers other than Safari. Loaded only when needed. |
| 19 | `html2pdf.js` | Makes PDF files in the browser. Loaded only when needed. Can be skipped by using "Save as PDF". |

# Back-end to-do for the DentClinic front end

The front end is finished against dummy data (`src/lib/mockData.ts`). This list is everything the Frappe
app `dent_app` must provide so the same screens work with `MOCK_DATA = false`. The field names here are
exactly what the front end sends and reads. If the back end uses a different name, change one side so they
match, and update `src/lib/types.ts`, the mock and `AGENTS.md`.

**Section 9 lists every doctype and field the front end uses, with its type and whether it is required.**
Sections 1 and 2 explain what is new or still to confirm.

## 1. New fields

| Doctype | Field | Type | Notes |
|---|---|---|---|
| Patient | `dental_chart` | JSON | The dental chart. The front end sends a JSON string in the shape below and reads either a string or an object. It also reads the first shape, `{"36": "treated", "37": "pending"}`, so records saved before do not need a migration. |
| Appointment | `patient_name` | Data, read only, `fetch_from: patient.full_name` | Shown in lists instead of the ID. |
| Appointment | `doctor_name` | Data, read only, `fetch_from: doctor.full_name` | |
| Treatment Plan | `patient_name`, `doctor_name` | same as above | |
| Treatment Session | `patient_name`, `doctor_name` | same as above | |
| Payment | `patient_name` | Data, read only, `fetch_from: patient.full_name` | |
| Payment | `treatment_type` | Data, read only, `fetch_from: treatment_plan.treatment_type` | Used by the payment list and the "revenue by treatment" report. |
| Clinic Settings | `treatment_prices` | Table (child doctype, e.g. **Clinic Treatment Price**, `istable`) | The price list. Child fields: `treatment_type` (Select, the Treatment Plan types) and `price` (Currency). The front end sends and reads `[{ "treatment_type": "Crown", "price": 6000 }]` and only uses it to pre-fill `Treatment Plan.total_cost`. |
| Clinic Settings | `phone_country_code` | Data | The country calling code as digits, e.g. `964`. The front end adds it to local numbers (`0770 123 4567` → `9647701234567`) when it opens WhatsApp; empty means 964. The reminder job should build numbers the same way (see section 2, **Phone numbers**). |
| Treatment Plan | `lab_name` | Data | The dental lab doing the work (crowns, bridges, implant crowns). |
| Treatment Plan | `lab_sent_date`, `lab_due_date`, `lab_received_date` | Date | When the work went to the lab, is due back, and came back. The Today board lists plans with `lab_sent_date` set and `lab_received_date` not set. |
| WhatsApp Log | `patient_name` | Data, read only, `fetch_from: patient.full_name` | |
| Patient | `next_recall_date` | Date | The next check-up the dentist chose. Empty means the usual rule (no visit for 6 months). |
| Patient | `recall_interval_months` | Int | How often the dentist wants the patient back: 3, 6, 9 or 12; 0 when not chosen. |
| Patient | `no_recall` | Check | 1 when the dentist said the patient needs no recall (moved away, treated elsewhere). The front end then sends `recall_interval_months = 0` and `next_recall_date = null`. |
| Doctor | `gender` | Select: Female, Male (empty allowed) | Picks the drawn avatar (a man or a woman in a white coat) when there is no photo. |
| Clinic Settings | `default_language` | Select: ar, en (empty allowed) | The clinic's language for users who did not choose one. Empty means Arabic. |
| Clinic Settings | `arabic_digits` | Check, default 0 | 1: Arabic screens write numbers ٠-٩ instead of 0-9. |
| Clinic Settings | `second_currency` | Link Currency (or Data), empty allowed | A second currency the clinic takes (`USD`). Empty: one currency only. Never the same as `currency`. See **Two currencies** below. |
| Clinic Settings | `exchange_rates` | Table (child doctype, e.g. **Clinic Exchange Rate**, `istable`) | The second currency's rates. Child fields: `rate_date` (Date) and `rate` (Float, how many of the clinic's currency one unit of the second is worth: `1460` for 1 USD = 1,460 IQD). One row per date; each counts from its date on. The front end always sends the whole table. |
| Treatment Plan | `currency` | Link Currency (or Data), empty allowed | The plan's currency. Empty means the clinic's own. `total_cost`, `paid_amount` and `remaining_amount` are in it. |
| Payment | `currency` | Link Currency (or Data), empty allowed | The currency the patient paid in. Empty means the clinic's own (the front end sends `""` for it). `amount` is in it. |
| Payment | `exchange_rate` | Float | Set by the server (never sent by the front end): the rate of the payment's day when two currencies meet (a payment in the second currency, or on a plan in it), else empty. Kept while the payment's day, currency and plan stay the same (section 6, **Two currencies**). |
| Payment | `plan_amount` | Currency, read only | Worked out by the server: `amount` in the plan's currency. What the payment takes off the plan. |
| Payment | `base_amount` | Currency, read only | Worked out by the server: `amount` in the clinic's currency, for totals and reports. |
| WhatsApp Template | `language` | Select: ar, en (empty allowed) | The language the message is written in; empty means any. The front end picks the template in the language of the screen, then one with no language. The reminder job should do the same with the clinic's default language (or the patient's, if a patient language is added later). |
| Patient | `chart_sketch` | JSON | Drawings on top of the dental chart, one for the adult teeth and one for the child teeth: `{ "version": 1, "adult": { "version": 1, "aspect": 0.42, "shapes": [...] }, "child": {...} }` (each a SketchData, points from 0 to 1; either may be missing). Store and return it as is. The History card says it changed without showing the values. |
| Doctor | `photo` | Attach Image | The doctor's photo, uploaded on `/doctors` with `upload_file` (a public file) and shown in round avatars: lists, the calendar, the Today board. Every clinic role must be able to read it with the Doctor list. |

**Recall rule for `Appointment.on_update`.** When an appointment becomes Completed and its patient has
`recall_interval_months > 0` and `no_recall = 0`, set `Patient.next_recall_date` to the appointment date plus that
many months (the last day of the month when the day does not exist: 31 Aug + 6 months is 28 Feb), unless the date
already set is later. The front end only reads the result; it sends the fields itself only when the dentist
changes them (patient page, or the "What was done in this visit?" dialog, which counts from the visit). The
dummy data does the same (`rollRecall()` in `src/lib/mockData.ts`). Users who can edit patients (the Clinic
Doctor preset included) need write access to these three fields. A daily WhatsApp reminder for due recalls can
use the same fields later.

**`Patient.dental_chart`, version 2.** Only teeth with something marked are stored:

```json
{
  "version": 2,
  "teeth": {
    "36": { "conditions": ["root_canal", "crown"], "note": "Zirconia crown being made." },
    "37": { "surfaces": { "O": "caries", "D": "caries" } },
    "24": { "legacy": "treated" }
  }
}
```

- Keys of `teeth` are FDI numbers as strings: adult `11`–`48`, child `51`–`85`.
- `conditions`: any of `crown`, `root_canal`, `implant`, `bridge`, `missing`, `extract`.
- `surfaces`: keys `M`, `O`, `D`, `B`, `L` (mesial, occlusal/incisal, distal, buccal, lingual); values
  `caries` or `filling`.
- `note`: free text. `legacy`: `treated` or `pending`, carried over from the first shape.
- The back end does not need to understand the contents; store and return it as is. A report of teeth by
  condition would read these keys.

After adding fetch fields, run a patch that fills them for existing records (fetch fields only fill on save).

### New doctype: Cash Count

The end-of-day report (`/payments/day`) saves one cash count per day. Name series `CC-.YYYY.-.#####`.

| Field | Type | Notes |
|---|---|---|
| `count_date` | Date, required, **unique** | The day that was counted. |
| `opening_float` | Currency | Money put in the drawer in the morning, for change. |
| `cash_payments` | Currency, read only | The day's Payments with `payment_method = "Cash"`, worked out in `validate()` when saved (the front end sends its own figure, which should be replaced). |
| `expected_cash` | Currency, read only | `opening_float + cash_payments`. |
| `cash_counted` | Currency, required | All the cash counted in the drawer. |
| `difference` | Currency, read only | `cash_counted - expected_cash`: below 0 short, above 0 over. |
| `note` | Small Text | Required in `validate()` when `difference` is not 0 ("Write a note saying why the cash is short or over."). |
| `counted_by` | Link to User | The user who saved it (set it from `frappe.session.user`). |
| `counted_by_name` | Data, read only, `fetch_from: counted_by.full_name` | |
| `counted_at` | Datetime, read only | Set to now on every save. |

Permissions: users with `add_payments` create and update; users with `view_payments` read. Do not allow delete
for the front desk (a manager can correct a count by updating it). The front end reads it with
`GET /api/resource/Cash Count` filtered on `count_date` and sorted `count_date desc`.

### New doctype: Dental Image (the X-ray section)

Naming `IMG-.YYYY.-.#####`. One record per X-ray, photo or scan of a patient. The front end creates the record,
then uploads the file with `upload_file` (`doctype: "Dental Image"`, `docname`, `is_private: 1`), then sets `image`
to the file's URL. Deleting the record must delete its attached file (Frappe does this for attachments).

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Yes | |
| `patient_name` | Data, read only, `fetch_from: patient.full_name` | | |
| `image_type` | Select: Periapical, Bitewing, Panoramic (OPG), Cephalometric, CBCT screenshot, Intraoral photo, Other | Yes | |
| `taken_on` | Date | Yes | |
| `teeth` | Data | No | FDI numbers, comma-separated ("36,37"). Empty: the whole mouth. |
| `description` | Small Text | No | |
| `file_name` | Data | No | The name of the uploaded file. |
| `image` | Attach Image (or Attach, for PDFs) | No | The private file's URL (`/private/files/…`). Empty for a moment during an upload. |
| `annotations` | JSON | No | The drawing on top, one SketchData: `{ "version": 1, "aspect": 0.75, "shapes": [...] }` (points from 0 to 1 of the image). The file itself is never changed. |

Permissions: read with `view_patients`; create, write and delete with `edit_patients` (the same rule the front end uses).
Add Dental Image to the Patient's links, so a patient with images cannot be deleted. Accepted files: JPG, PNG, PDF up
to 10 MB (DICOM later).

### New doctypes: Dental Medicine and Prescription

The prescription form (`/prescriptions/new`) and the Medicines page (`/medicines`, `manage_users`).

**Dental Medicine**, name series `MED-.#####`: the clinic's medicine list.

| Field | Type | Notes |
|---|---|---|
| `medicine_name` | Data, required | The generic name, "Amoxicillin". |
| `strength` | Data | "500 mg", "0.12%". |
| `dosage_form` | Select | Tablet, Capsule, Suspension, Syrup, Mouthwash, Gel, Drops, Injection, Other. |
| `medicine_group` | Select | Antibiotic, Painkiller, Mouthwash, Antifungal, Other. |
| `default_dose`, `default_frequency`, `default_instructions` | Data | The usual prescription, filled into a new row. `default_frequency` is one of the values in `FREQUENCIES` (`src/lib/prescriptions.ts`): Once a day, Twice a day, Three times a day, Four times a day, Every 4 hours, Every 6 hours, Every 8 hours, Every 12 hours, When needed, Once only. |
| `default_duration_days` | Int | |
| `allergy_words` | Data | Comma-separated words; when one appears in `Patient.allergies` the form warns. |
| `is_nsaid`, `avoid_in_pregnancy` | Check | Warn with a blood thinner / a pregnancy in the patient's medical text. |
| `max_daily_mg` | Int | The usual daily maximum; 0 means no check. |
| `child_note` | Small Text | Shown when the patient is under 12. |
| `is_active` | Check, default 1 | Only active medicines are offered; nothing is deleted. |

**Prescription**, name series `RX-.YYYY.-.#####`, with a child table **Prescription Medicine**.

| Field | Type | Notes |
|---|---|---|
| `patient` | Link Patient, required | |
| `patient_name` | Data, read only, `fetch_from: patient.full_name` | |
| `doctor` | Link Doctor, required | |
| `doctor_name` | Data, read only, `fetch_from: doctor.full_name` | |
| `appointment` | Link Appointment | The visit it was written at (empty when written from the patient page). |
| `prescription_date` | Date, required | |
| `notes` | Small Text | Printed under the medicines. |
| `medicines` | Table (Prescription Medicine) | Rows: `medicine` (Link Dental Medicine), `medicine_name` (Data: the name and strength as they were when written, sent by the front end), `dose` (Data), `frequency` (Data), `duration_days` (Int), `instructions` (Data). |
| `summary` | Data, read only | Set in `validate()`: the rows' `medicine_name` joined with ", ", because the list API does not return child tables and the patient page and the appointment page list prescriptions by it. |

Permissions: `view_treatments` reads both; `add_treatments` creates, updates and deletes Prescription; `manage_users`
writes Dental Medicine. Track Changes on Prescription is welcome but not read yet. The safety warnings are worked
out in the browser from the patient's medical text and the medicine flags; nothing to compute on the server.

## 2. Field names to confirm

These come from the README, not from the doctype JSON files. Check each one in the back-end repo.

- **Phone numbers** (`Patient.phone_number`, `secondary_phone`, `Doctor.phone_number`, `Clinic Settings.phone`)
  are stored as typed (`0770 123 4567`, `07701234567`, `+964 770 123 4567`); the phone boxes only turn Arabic
  digits into 0-9. Do not reformat them on save. Records saved before may still hold Arabic digits; Frappe's usual
  `utf8mb4_unicode_ci` collation treats them as equal to 0-9 in searches, and a one-off patch can convert them.
  For WhatsApp the front end turns a number into international digits like this: invisible direction marks
  are removed and Arabic digits become 0-9; a number starting with `+` keeps its digits; `00` is dropped; a
  leading `0` is replaced by `Clinic Settings.phone_country_code` (default `964`); a number that already starts
  with that code, or has 11 digits or more, is kept; anything else gets the code in front. A `0` left right
  after the clinic's code (`+964 0770…`) is removed. The reminder job (`schedule_reminders`) must do the same,
  or messages to `07…` numbers fail.
  Phone searches send `like` patterns with `%` between the digits (e.g. `%7%0%1%2%3%4%5%6%7%`), which
  MariaDB handles as normal; a stored digits-only copy of each phone would make them exact and faster later.
- **Patient:** `age` (Int). The form sends `age` **only when `date_of_birth` is empty** (some patients do not
  know their birth date). Keep the typed value in that case, and work `age` out from `date_of_birth` only
  when a date is set. `age` must therefore not be read only.
- **Doctor:** `full_name`, `specialization` (Select: General Dentist, Orthodontist, Endodontist, Periodontist,
  Oral Surgeon, Pediatric Dentist, Prosthodontist), `phone_number`, `email`, `start_time` and `end_time`
  (Time, the doctor's working hours; both may be empty), `is_active` (Check). Dropdowns and the calendar only
  show doctors with `is_active = 1`. `working_days` (in the README) is not used by the front end yet; tell us its
  format if the calendar should shade days off. The `/doctors` page creates and edits these; it never deletes.
  The front end links a user to their Doctor record by **the same email address**, to open "My Day" for
  doctors. Keep them equal, or add a `user` Link field to Doctor and tell us to switch to it. Every clinic
  role must be able to read `Doctor.email`.
- **Clinic Settings** (single doctype): `clinic_name`, `logo` (Attach Image), `phone`, `email`, `address`,
  `currency` (default `IQD`; the front end also shows IQD when it is empty), `tax_number`, `opening_time` (Time), `closing_time` (Time), `theme_color` (Color or Data, a hex
  colour such as `#4f46e5`, or empty for the default; the whole front end is coloured from it), `enable_whatsapp`,
  `enable_patient_portal`, `enable_financial_reports` (Checks), and `working_days` (Data: the English day names the
  clinic is open, comma-separated, e.g. `Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday`; empty = every day).
- **Treatment Session:** `patient`, `treatment_plan`, `doctor`, `session_date`, `session_time`, `status`,
  `notes`. The front end offers the statuses `Scheduled`, `Completed`, `Cancelled`.
- **WhatsApp Template:** `template_name`, `trigger` (`24 Hours Before`, `2 Hours Before`, `Manual`),
  `message`, `is_active`.
- **WhatsApp Log:** `patient`, `appointment`, `phone_number`, `status` (`Sent`, `Failed`, `Pending`),
  `sent_at`, `message`, `error_message`.
- **Template placeholders:** the template editor offers `{{ patient_name }}`, `{{ appointment_date }}`,
  `{{ appointment_time }}`, `{{ doctor_name }}` and `{{ clinic_name }}`. The reminder job
  (`dent_app.dent_app.whatsapp.schedule_reminders`) must fill in exactly these names.

## 3. Who can read what

The UI hides screens with the Clinic Permission flags, but Frappe decides what data really comes back.

- **Every clinic role** (Manager, Doctor, Receptionist) must be able to read:
  - their own `User` doc (for the name and roles in the sidebar),
  - their own `Clinic Permission` doc (named after their user ID),
  - the `Clinic Settings` single (for the currency and clinic name),
  - the `Doctor` list (for dropdowns).
- **Users with `manage_users`** (normally Clinic Manager) must be able to read and write `Doctor`, `User`,
  `Clinic Permission`, `Clinic Settings`, `WhatsApp Template`, and read `WhatsApp Log`.
- **Enforce the 14 flags on the server**, for example with `has_permission` / `permission_query_conditions`
  hooks, or by giving each role DocType permissions that match the presets in `ROLE_PRESETS`
  (`src/lib/types.ts`). Otherwise a user could still call the API directly.

A simpler option for the first two reads is one whitelisted method, for example
`dent_app.api.get_my_session`, that returns the user's name, roles and permission flags. If you add it,
change `src/context/SessionContext.tsx` to call it with `callMethod`.

## 4. API calls the front end makes

- `GET /api/resource/<Doctype>` with `fields`, `filters`, `or_filters`, `order_by`, `limit_start`,
  `limit_page_length` (`0` means all rows).
- `GET /api/resource/<Doctype>/<name>`, `POST /api/resource/<Doctype>`, `PUT …/<name>`, `DELETE …/<name>`.
- `GET /api/method/frappe.client.get_count` with `doctype`, `filters`.
- `GET /api/method/frappe.desk.reportview.get_count` with `doctype`, `fields`, `filters`, `or_filters`,
  `distinct` — used for the count when a search box is filled. **Check that this works for every role**; if
  not, add a small whitelisted count method.
- `POST /api/method/upload_file` (multipart, `is_private=0`) for the clinic logo and doctor photos, and with
  `doctype=Dental Image`, `docname=<image>`, `is_private=1` for X-rays and photos: the front end first creates the
  Dental Image record, then uploads the file attached to it, then saves the file's URL in `image` (if the upload
  fails it deletes the record again). It lists a patient's images with `GET /api/resource/Dental Image` filtered on
  `patient`, deletes one with `DELETE /api/resource/Dental Image/<name>` (Frappe deletes the attached file with it),
  and shows the file at `/frappe<file_url>` through the rewrite (the session cookie opens private files). Every
  role with `view_patients` must be able to read these private files.
- `GET /api/method/frappe.desk.form.load.getdoc` with `doctype`, `name` for the **History** card (patient,
  appointment, treatment plan and payment pages). The front end reads `docs[0].owner` and `creation`,
  `docinfo.versions` (`owner`, `creation`, `data` with `changed: [[field, old, new]]`; Frappe writes the values
  as formatted text, such as `150,000.00` or `20-08-2026`, and the front end reads them that way) and
  `docinfo.user_info` (`fullname` for the owner, the last editor and the users in the versions, which Frappe
  fills in itself). Track Changes (`track_changes: 1`) is already on for Patient, Appointment, Treatment Plan and
  Payment; keep it on, or there is nothing to show but who added the record. getdoc checks read permission on
  the doc, so every role that can open these pages can use it. Frappe returns the last 10 versions; the card
  says so. One thing to change:
  - **Save worked-out totals without a Version.** `Appointment.on_update` and `TreatmentPlan.on_update` call
    `patient_doc.save()`, and Payment calls `plan.save()`, only to update totals (`total_*`, `paid_amount`,
    `remaining_amount`). Each of those saves is a Version that the card hides, and getdoc's 10 fill up with them,
    pushing the real edits out. Use `frappe.db.set_value(..., update_modified=False)` (or `doc.db_set`) for the
    totals, or set `doc.flags.ignore_version = True` before those saves. The recall rule (section 1) is
    different: when it moves `Patient.next_recall_date`, save that as a normal change with a Version, so the
    patient's History shows "Next check-up: … → …" (the dummy data does).
- `POST /api/method/frappe.core.doctype.user.user.update_password` with `old_password`, `new_password`.
- `POST /api/method/login`, `GET /api/method/logout`.
- `GET /api/method/frappe.auth.get_logged_user`: right after login (to check the session cookie was kept),
  and whenever a call is refused with 401 or 403, to tell an **expired session** (answer `Guest`, or 403) from
  a real "no permission". Keep this standard method available to every logged-in user. Frappe answers an
  expired session with 403 PermissionError; if you ever change that to 401, the front end handles it the same.
- Every request gives up after 15 seconds (uploads after 10 minutes, full-table reads with `limit_page_length=0` after
  60). A read with no answer at all, or a 502/503/504 or plain-text 500 from the proxy when Frappe is down, is
  sent again up to twice; saves are never sent twice by the front end.
- Two-factor login is not supported yet: a login answer with `verification` / `tmp_id` shows a message
  instead. Keep it off for clinic users, or tell us to add the OTP step.
- A user whose password must be changed first (`message: "Password Reset"`) is told to ask an administrator;
  the app has no "set a new password" page.
- The Next.js rewrite waits up to 610 seconds for Frappe (`experimental.proxyTimeout` in `next.config.ts`). If
  another proxy (Nginx) sits in front of Frappe, give it at least the same time for `/api/method/upload_file`
  (`proxy_read_timeout`, `proxy_send_timeout`, `client_body_timeout`), and let it take files of at least 10 MB
  (`client_max_body_size 12m`). Frappe's own `max_file_size` must allow 10 MB too.

## 5. Login and CSRF

`src/lib/frappe.ts` reads a CSRF token from an `x-frappe-csrf-token` header on the login response and sends
it on every later request. **Frappe does not send that header by default.**

It may not be needed: the owner's other front end (a Vue app on Frappe) never sends a CSRF token and its saves
work. Frappe only checks `X-Frappe-CSRF-Token` when the session already holds a CSRF token, and a session made
by `/api/method/login` normally gets one only when the Frappe desk (`/app`) is opened in that same session.
(That is how Frappe v14/v15 behave; confirm it on v16.) So first try without. If POST, PUT or DELETE fail with
"Invalid Request" (`CSRFTokenError`), pick one:

- For local development only: `bench --site dent_clinic.localhost set-config ignore_csrf 1`.
- For real use: add a whitelisted method that returns `frappe.sessions.get_csrf_token()`, call it right after
  login, and store the result where `initAuth()` reads it (`localStorage.csrf_token`).

## 6. Money and numbers

Amounts arrive as plain numbers (the front end turns Arabic-keyboard digits into 0-9 before sending). For a
clinic in Iraq, set the IQD currency to show no decimals in Frappe too, through the IQD `Currency` record (its
fraction units and number format), so server-side totals and any Frappe print format match the app, which never
shows decimals for IQD. **Do not** set System Settings → Currency Precision to 0: it rounds every Currency field,
and amounts in US dollars need cents. `total_cost`, `paid_amount` and `remaining_amount` (Treatment Plan) and
`amount` and `plan_amount` (Payment) are Currency fields whose `options` point at the record's `currency` field,
so each keeps the decimals of its own currency; `base_amount` is in the clinic's currency.

### Two currencies

The clinic's own currency (`Clinic Settings.currency`, IQD) and, when set, a second one (`second_currency`, USD).
The front end does its own conversions only for display; the server must do the following and refuse the rest:

- **Rate of a day** = the `exchange_rates` row with the latest `rate_date` on or before that day; a day before the
  first row uses the first row. No row at all: refuse a payment where two currencies meet ("Set the USD exchange
  rate in Settings first.").
- **Payment.validate()**: `currency` must be empty, the clinic's own or `second_currency` (store the clinic's own
  as empty). When the payment's currency or its plan's currency is not the clinic's own, the **server** sets
  `exchange_rate` to the rate of `payment_date` (the front end never sends one, and one sent must be ignored, so
  nobody can choose their own rate). An edit that keeps `payment_date`, `currency` and `treatment_plan` keeps the
  rate the payment already had, even if the rates in Settings changed since; an edit that changes any of them
  takes the rate of the (new) day. When the currencies match, `exchange_rate` is empty.
- **plan_amount and base_amount are set on every payment**, ignoring anything sent: `plan_amount` = `amount`
  converted to the plan's currency (empty for a general payment) and `base_amount` = `amount` converted to the
  clinic's currency: second → own is `amount × rate`, own → second is `amount ÷ rate`, the same currency is
  `amount`. Round to the currency: whole dinars for IQD, cents for USD.
- **Settling a plan in the other currency**: a cent cannot be split, so a payment in another currency than its
  plan may go over what the plan has left by **less than one smallest unit of the payment's currency** (one cent
  is IQD 14.6 at 1,460; one dinar is $0.0007). Accept it, and cap its `plan_amount` at what was left (payments
  in date order, then by name), so "Pay full balance" in dollars closes a dinar plan. Anything more is refused.
- **Treatment Plan.validate()**: `currency` must be empty, the clinic's own or `second_currency` (store the
  clinic's own as empty). `paid_amount` = the sum of its payments' `plan_amount` (rounded to the plan's
  currency), `remaining_amount` = `total_cost − paid_amount` (0 when Cancelled), and refuse a payment that
  takes `paid_amount` above `total_cost` (apart from the settling rule above). Refuse a change of `currency`
  once the plan has payments ("This plan already has payments, so its currency cannot be changed.").
- **Clinic Settings.validate()**: `second_currency` is not `currency`; every `exchange_rates` row has a date and
  a rate above zero, one row per date, and at least one row while `second_currency` is set. Refuse to change
  `currency` once any plan or payment exists ("The clinic currency cannot change once there are plans or
  payments."), and refuse to clear or change `second_currency` while plans or payments are in it ("Plans or
  payments are in USD, so it stays as the second currency."). Clearing an unused second currency keeps the rate
  rows. After a change of rates, recompute `Patient.total_remaining` (below).
- **Patient totals** stay in the clinic's currency: `total_paid` = the sum of `base_amount`;
  `total_remaining` = each plan's `remaining_amount` converted at **today's** rate. Recompute them when the
  rates change, or at least nightly, so the "owes money" filter stays right.
- **Cash Count**: `cash_payments` counts only Cash payments in the clinic's own currency; cash in the second
  currency is shown apart on the day report and is not in the drawer count.
- **Existing records**: a payment saved before this change has no `currency`, `plan_amount` or `base_amount`;
  fill `plan_amount` and `base_amount` with `amount` in a patch (the front end falls back to `amount` too).

## 7. Error messages

The front end shows the back end's message to the user as it is (from `_server_messages` or `exception`),
only turning raw database errors (`Duplicate entry '…'`, `Data too long for column '…'`) into plain sentences.
Write `frappe.throw` messages as short, plain sentences, for example: "Paid amount cannot be more than the
total cost." The dummy data already uses messages like these.

## 8. Later, for speed

The recall list (`/recall`) also loads every patient and appointment to find who is due. A whitelisted
method that returns patients with no completed visit since a date and nothing booked would be faster.


The dashboard and reports add up payments and balances in the browser. When the data grows, add
whitelisted methods that return the sums for a date range (revenue by treatment, by method, by month, and
the outstanding total), and switch `src/app/reports/page.tsx` and `src/app/dashboard/page.tsx` to them. The
existing query reports (Daily Revenue, Monthly Revenue, Treatment Revenue, Outstanding Balances) are a good
base.

## 9. Field reference: every doctype and field the front end uses

This is the whole contract in one place, checked against the code on 2026-09-30. Sections 1 and 2 explain the
new and unconfirmed fields in more detail. If a field is not listed here, the front end neither reads nor sends it.

How to read the tables:

- **Type** is the Frappe field type we expect.
- **Required**: **Yes** means the form will not save without it, so the doctype should mark it `reqd` too.
  **Server** means the front end never sends it (or its value is replaced): the back end works it out or fetches
  it. **No** means optional.
- **Stored** (in Notes) means the field is used in a filter, a search or a sort, so it must be a real column,
  not a virtual field. Fetch fields (`fetch_from`) are stored by default; keep them that way.

Rules for every doctype:

- Dates are sent as `YYYY-MM-DD`. Times are sent as `HH:MM` (no seconds); Frappe's `HH:MM:SS` is read fine.
- Check fields are sent as `0` or `1`.
- An empty Link, Date or Time field is sent as `null`, never `""`. Empty text is sent as `""`.
- A child table is always sent whole (every row, without `name` or `idx`), so each save replaces the table.
- Link fields hold the record ID; the screens show the fetched `*_name` field instead.

### Patient

Naming `PAT-.YYYY.-.#####`. Searched with `like` on `full_name`, `phone_number`, `secondary_phone` and `name`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | Data | Yes | |
| `gender` | Select: Male, Female, Other | No | |
| `date_of_birth` | Date | No | |
| `age` | Int | No | Sent only when `date_of_birth` is empty (0-120). Worked out from the date when there is one. Must not be read only (section 2). |
| `phone_number` | Data | Yes | Stored as typed; searched with digit patterns (section 2, **Phone numbers**). |
| `secondary_phone` | Data | No | Same as `phone_number`. |
| `email` | Data (Email) | No | |
| `address` | Small Text | No | |
| `allergies`, `current_medications`, `chronic_diseases`, `medical_history`, `notes` | Small Text | No | The medical alerts and prescription warnings are read from these texts. |
| `dental_chart` | JSON | No | New (section 1). |
| `chart_sketch` | JSON | No | New (section 1): the drawings on the chart. |
| `next_recall_date` | Date | No | New (section 1). |
| `recall_interval_months` | Int | No | New: 0, 3, 6, 9 or 12. |
| `no_recall` | Check | No | New. |
| `total_paid` | Currency | Server | |
| `total_remaining` | Currency | Server | Stored: filtered (`> 0`) and sorted. |
| `total_appointments`, `total_treatments` | Int | Server | Not read by the front end. |

### Doctor

Naming `DOC-.#####`. Written only on `/doctors`; never deleted.

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | Data | Yes | |
| `specialization` | Select: General Dentist, Orthodontist, Endodontist, Periodontist, Oral Surgeon, Pediatric Dentist, Prosthodontist | No | Defaults to General Dentist in the form. |
| `phone_number` | Data | No | |
| `email` | Data (Email) | No | Links a user to their Doctor record (section 2). Every clinic role must be able to read it. |
| `start_time`, `end_time` | Time | No | Both or neither; the end must be after the start. |
| `is_active` | Check, default 1 | No | Only active doctors are offered. |
| `gender` | Select: Female, Male | No | New (section 1). For the drawn avatar. |
| `photo` | Attach Image | No | New (section 1). A file URL; the front end sends `null` to remove it. |

### Appointment

Naming `APT-.YYYY.-.#####`. Searched on `patient_name`, `doctor_name`, `reason_for_visit` and `name`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Yes | |
| `patient_name` | Data, `fetch_from: patient.full_name` | Server | Stored (search). |
| `doctor` | Link Doctor | Yes | |
| `doctor_name` | Data, `fetch_from: doctor.full_name` | Server | Stored (search). |
| `appointment_date` | Date | Yes | Filtered with `=`, `<`, `>`, `>=`, `<=`, `between`. |
| `appointment_time` | Time | Yes | |
| `duration_minutes` | Int, default 30 | No | 15, 30, 45, 60, 90 or 120. |
| `status` | Select: Scheduled, Confirmed, Completed, Cancelled, No Show | Yes | Always sent; new bookings are Scheduled. |
| `reason_for_visit` | Data | No | |
| `notes` | Small Text | No | |

### Treatment Plan

Naming `TRT-.YYYY.-.#####`. Searched on `patient_name`, `treatment_type`, `tooth_number` and `name`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Yes | |
| `patient_name` | Data, fetched | Server | Stored (search). |
| `doctor` | Link Doctor | No | |
| `doctor_name` | Data, fetched | Server | |
| `treatment_type` | Select: Filling, Root Canal, Crown, Bridge, Extraction, Implant, Cleaning, Whitening | Yes | |
| `tooth_number` | Data | No | An FDI number as text (`"36"`, `"51"`); older free text like `"36, 37"` is still read. |
| `currency` | Link Currency (or Data) | No | New (section 1). Empty: the clinic's own. Cannot change once the plan has payments. |
| `total_cost` | Currency | Yes | In the plan's `currency`. 0 or more; cannot go below what was already paid. |
| `status` | Select: Planned, In Progress, Completed, Cancelled | Yes | New plans are always sent as Planned. |
| `diagnosis`, `treatment_notes` | Small Text | No | |
| `paid_amount` | Currency | Server | Sum of the plan's payments' `plan_amount` (section 6, **Two currencies**). |
| `remaining_amount` | Currency | Server | Stored: filtered (`> 0`) and sorted. 0 for a Cancelled plan. |
| `lab_name` | Data | No | New (section 1). |
| `lab_sent_date` | Date | No | New. Required by the Lab Work dialog when it saves. Filtered with `is set`. |
| `lab_due_date` | Date | No | New. Not before `lab_sent_date`. |
| `lab_received_date` | Date | No | New. Filtered with `is not set`. |

### Treatment Session

Naming `SES-.YYYY.-.#####`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `treatment_plan` | Link Treatment Plan | Yes | Always sent. |
| `patient` | Link Patient | Yes | Sent from the plan; filtered on the patient page. |
| `patient_name` | Data, fetched | Server | |
| `doctor` | Link Doctor | No | |
| `doctor_name` | Data, fetched | Server | |
| `session_date` | Date | Yes | |
| `session_time` | Time | No | |
| `status` | Select: Scheduled, Completed, Cancelled | Yes | |
| `notes` | Small Text | No | "What was done in this visit?" is saved here. |

### Payment

Naming `PAY-.YYYY.-.#####`. Searched on `patient_name`, `treatment_type`, `notes` and `name`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Yes | |
| `patient_name` | Data, fetched | Server | Stored (search). |
| `treatment_plan` | Link Treatment Plan | No | Empty for a general payment. |
| `treatment_type` | Data, `fetch_from: treatment_plan.treatment_type` | Server | Stored (search, reports). |
| `payment_date` | Date | Yes | |
| `amount` | Currency | Yes | In the payment's `currency`. Above 0, and (converted) not more than the plan has left. |
| `currency` | Link Currency (or Data) | No | New (section 1). Empty: the clinic's own. |
| `exchange_rate` | Float | Server | New. The rate of the payment's day when two currencies meet (section 6). |
| `plan_amount` | Currency | Server | New. `amount` in the plan's currency. Read on the receipt and the plan page. |
| `base_amount` | Currency | Server | New. `amount` in the clinic's currency. Read by the dashboard and reports (revenue). |
| `payment_method` | Select: Cash, Card, Bank Transfer | Yes | |
| `notes` | Small Text | No | |

### User (Frappe core)

The name is the email address. Created on `/users`; only `enabled` and `roles` are changed afterwards; never deleted.

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | Data | Yes | On create. |
| `first_name` | Data | Yes | On create; the form calls it "Full Name". |
| `full_name` | Data | Server | |
| `enabled` | Check | No | A user cannot disable their own account. |
| `roles` | Table (Has Role): `role` | Yes | Clinic Manager, Clinic Doctor or Clinic Receptionist. Other roles on the user (such as System Manager) are kept. |
| `new_password` | Password | Yes | On create only, at least 8 characters. |
| `send_welcome_email` | Check | No | Always sent as 0. |
| `gender`, `user_image` | Frappe's own User fields | No | Read only, for the avatar in the menu, the top bar and the users list. Every user must be able to read their own. |
| `language` | Frappe's own User field (Link Language) | No | The language the user chose with the Arabic / English switch in the menu: the front end sends `PUT /api/resource/User/<own id>` with `{ "language": "ar" }` or `"en"`. **Every user must be able to change their own `language`** (and nothing else on their User record through this call). Make sure the Language records `ar` and `en` exist. Frappe then also answers error messages in that language where it has translations. |

### Clinic Permission

One per user; the record **name must equal the user ID** (`autoname: field:user`), because the front end loads it
with `GET /api/resource/Clinic Permission/<user>`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `user` | Link User | Yes | Unique. |
| `view_patients`, `add_patients`, `edit_patients`, `delete_patients`, `view_appointments`, `add_appointments`, `edit_appointments`, `view_treatments`, `add_treatments`, `edit_treatments`, `view_payments`, `add_payments`, `view_reports`, `manage_users` | Check | No | 14 switches, sent as 0 or 1. |

### Clinic Settings (single)

| Field | Type | Required | Notes |
|---|---|---|---|
| `clinic_name` | Data | Yes | |
| `logo` | Attach Image | No | A public file URL. |
| `phone`, `email`, `tax_number` | Data | No | Printed on the letterhead. |
| `address` | Small Text | No | |
| `currency` | Link Currency (or Data) | No | ISO code; empty is treated as IQD. The clinic's own currency: totals are kept in it. |
| `second_currency` | Link Currency (or Data) | No | New (section 1). Empty: one currency only. |
| `exchange_rates` | Table (**Clinic Exchange Rate**) | No | New (section 1). Rows: `rate_date` (Date), `rate` (Float). |
| `phone_country_code` | Data | No | New (section 1). Digits only; empty means 964. |
| `default_language` | Select: ar, en | No | New (section 1). Empty means Arabic. |
| `arabic_digits` | Check | No | New (section 1). |
| `opening_time`, `closing_time` | Time | No | |
| `working_days` | Data | No | Day names, comma-separated (section 2). Empty means open every day. |
| `theme_color` | Color | No | A hex colour. Empty means the front end's default indigo; the front end sends `""` for that. |
| `enable_whatsapp`, `enable_financial_reports` | Check, **default 1** | No | The front end treats only an explicit 0 as off. |
| `enable_patient_portal` | Check | No | Saved only; not used yet. |
| `treatment_prices` | Table (**Clinic Treatment Price**) | No | New (section 1). Rows: `treatment_type` (Select, the plan types), `price` (Currency). Only rows with a price are sent. |

### WhatsApp Template

Naming `WAT-.#####`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `template_name` | Data | Yes | |
| `trigger` | Select: 24 Hours Before, 2 Hours Before, Manual | Yes | |
| `message` | Text | Yes | With the placeholders in section 2. |
| `is_active` | Check | No | |
| `language` | Select: ar, en | No | New (section 1). Empty means any language. |

### WhatsApp Log (read only for the front end)

Naming `WAL-.YYYY.-.#####`. Searched on `patient_name`, `phone_number` and `message`; filtered on `status` and
`appointment`; sorted by `sent_at`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Server | |
| `patient_name` | Data, fetched | Server | Stored (search). |
| `appointment` | Link Appointment | Server | |
| `phone_number` | Data | Server | |
| `status` | Select: Sent, Failed, Pending | Server | |
| `sent_at` | Datetime | Server | |
| `message` | Text | Server | |
| `error_message` | Small Text | Server | |

### Cash Count

Details and rules in section 1. The front end sends `count_date`, `opening_float`, `cash_counted`, `note` and
`counted_by`, and also its own `cash_payments`, `expected_cash` and `difference`, which `validate()` must replace.

| Field | Type | Required | Notes |
|---|---|---|---|
| `count_date` | Date | Yes | Unique. |
| `opening_float` | Currency | No | |
| `cash_counted` | Currency | Yes | |
| `note` | Small Text | Yes when short or over | |
| `counted_by` | Link User | No | |
| `cash_payments`, `expected_cash`, `difference` | Currency | Server | |
| `counted_by_name` | Data, fetched | Server | |
| `counted_at` | Datetime | Server | |

### Dental Medicine

Details in section 1. Searched on `medicine_name`, `medicine_group` and `strength`; never deleted.

| Field | Type | Required | Notes |
|---|---|---|---|
| `medicine_name` | Data | Yes | |
| `strength` | Data | No | |
| `dosage_form` | Select (section 1) | No | |
| `medicine_group` | Select (section 1) | No | |
| `default_dose`, `default_frequency`, `default_instructions` | Data | No | |
| `default_duration_days` | Int | No | |
| `allergy_words` | Data | No | |
| `is_nsaid`, `avoid_in_pregnancy` | Check | No | |
| `max_daily_mg` | Int | No | 0 means no check. |
| `child_note` | Small Text | No | |
| `is_active` | Check, default 1 | No | |

### Prescription and Prescription Medicine

Details in section 1.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Yes | |
| `patient_name` | Data, fetched | Server | |
| `doctor` | Link Doctor | Yes | |
| `doctor_name` | Data, fetched | Server | |
| `appointment` | Link Appointment | No | |
| `prescription_date` | Date | Yes | |
| `notes` | Small Text | No | |
| `medicines` | Table (Prescription Medicine) | Yes, at least one row | Rows below. |
| `summary` | Data | Server | Stored: read in the lists. |

| Prescription Medicine field | Type | Required | Notes |
|---|---|---|---|
| `medicine` | Link Dental Medicine | Yes | |
| `medicine_name` | Data | Yes | Sent by the front end (name and strength when written). |
| `dose`, `frequency`, `instructions` | Data | No | |
| `duration_days` | Int | No | |

### Dental Image

New (section 1, **New doctype: Dental Image**). Naming `IMG-.YYYY.-.#####`. Read with `patient`, `patient_name`,
`image_type`, `taken_on`, `teeth`, `description`, `file_name`, `image`, `annotations`; filtered on
`patient` (Stored) and sorted `taken_on desc, name asc`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient` | Link Patient | Yes | Stored. |
| `patient_name` | Data | Server | `fetch_from: patient.full_name`. |
| `image_type` | Select | Yes | The seven values in section 1. |
| `taken_on` | Date | Yes | |
| `teeth` | Data | No | FDI numbers joined with `,`, no spaces. |
| `description` | Small Text | No | |
| `file_name` | Data | No | |
| `image` | Attach Image | No | Set after the upload. |
| `annotations` | JSON | No | |

### File (Frappe core)

Uploaded with `upload_file` (section 4): the clinic logo and doctor photos (public), and the file of each Dental
Image (private, attached to it). The front end reads `name`, `file_name` and `file_url` from the upload's answer,
and never lists or deletes File records itself.

### Version (Frappe core)

Never queried directly; read through `frappe.desk.form.load.getdoc` for the History card (section 4).

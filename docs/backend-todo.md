# Back-end to-do for the DentClinic front end

The front end is finished against dummy data (`src/lib/mockData.ts`). This list is everything the Frappe
app `dent_app` must provide so the same screens work with `MOCK_DATA = false`. The field names here are
exactly what the front end sends and reads. If the back end uses a different name, change one side so they
match, and update `src/lib/types.ts`, the mock and `AGENTS.md`.

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
  `currency`, `tax_number`, `opening_time` (Time), `closing_time` (Time), `theme_color` (Color or Data, a hex
  colour such as `#0e7c86`; the whole front end is coloured from it), `enable_whatsapp`,
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
- `POST /api/method/upload_file` (multipart, `is_private=0`) for the clinic logo, and with `doctype=Patient`,
  `docname=<patient>`, `is_private=1` for X-rays and photos. The front end lists them with
  `GET /api/resource/File` filtered on `attached_to_doctype` and `attached_to_name`, deletes them with
  `DELETE /api/resource/File/<name>`, and shows them at `/frappe<file_url>` through the rewrite (the session
  cookie opens private files). Every role that can see patients must be able to read these File records.
- `POST /api/method/frappe.core.doctype.user.user.update_password` with `old_password`, `new_password`.
- `POST /api/method/login`, `GET /api/method/logout`.
- `GET /api/method/frappe.auth.get_logged_user`: right after login (to check the session cookie was kept),
  and whenever a call is refused with 401 or 403, to tell an **expired session** (answer `Guest`, or 403) from
  a real "no permission". Keep this standard method available to every logged-in user. Frappe answers an
  expired session with 403 PermissionError; if you ever change that to 401, the front end handles it the same.
- Every request gives up after 15 seconds (uploads after 120, full-table reads with `limit_page_length=0` after
  60). A read with no answer at all, or a 502/503/504 or plain-text 500 from the proxy when Frappe is down, is
  sent again up to twice; saves are never sent twice by the front end.
- Two-factor login is not supported yet: a login answer with `verification` / `tmp_id` shows a message
  instead. Keep it off for clinic users, or tell us to add the OTP step.
- A user whose password must be changed first (`message: "Password Reset"`) is told to ask an administrator;
  the app has no "set a new password" page.
- The Next.js rewrite waits up to 130 seconds for Frappe (`experimental.proxyTimeout` in `next.config.ts`). If
  another proxy (Nginx) sits in front of Frappe, give it at least the same time for `/api/method/upload_file`.

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
clinic in Iraq, set the IQD currency to show no decimals in Frappe too (the `Currency` record's fraction and
number format, or System Settings → Currency Precision 0), so server-side totals and any Frappe print format
match the app, which never shows decimals for IQD.

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

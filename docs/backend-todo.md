# Back-end to-do for the DentClinic front end

The front end is finished against dummy data (`src/lib/mockData.ts`). This list is everything the Frappe
app `dent_app` must provide so the same screens work with `MOCK_DATA = false`. The field names here are
exactly what the front end sends and reads. If the back end uses a different name, change one side so they
match, and update `src/lib/types.ts`, the mock and `AGENTS.md`.

**Section 9 lists every doctype the front end uses, grouped by doctype: who may read and write it, every call
the front end makes, and every field with its type, its allowed values and whether it is required.** Sections 1
and 2 explain what is new or still to confirm.

## 1. New fields

| Doctype           | Field                                                                                                                      | Type                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patient           | `dental_chart`                                                                                                             | JSON                                                                              | The dental chart. The front end sends a JSON string in the shape below and reads either a string or an object. It also reads the first shape, `{"36": "treated", "37": "pending"}`, so records saved before do not need a migration.                                                                                                                                                                                                          |
| Appointment       | `patient_name`                                                                                                             | Data, read only, `fetch_from: patient.full_name`                                  | Shown in lists instead of the ID.                                                                                                                                                                                                                                                                                                                                                                                                             |
| Appointment       | `doctor_name`                                                                                                              | Data, read only, `fetch_from: doctor.full_name`                                   |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Appointment       | `arrived_at`, `in_chair_at`                                                                                                | Datetime                                                                          | The waiting room steps, set by the Today board ("2026-09-26 10:05:00", the front desk computer's local time; `null` clears a step). Both stay after the visit is closed. Users with `edit_appointments` write them; everyone with `view_appointments` reads them (the waiting room screen, `/waiting-room`, polls today's open appointments every 20 seconds with these two fields). Track changes on them like the other Appointment fields. |
| Treatment Plan    | `patient_name`, `doctor_name`                                                                                              | same as above                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Treatment Session | `patient_name`, `doctor_name`                                                                                              | same as above                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Payment           | `patient_name`                                                                                                             | Data, read only, `fetch_from: patient.full_name`                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Payment           | `treatment_type`                                                                                                           | Data, read only, `fetch_from: treatment_plan.treatment_type`                      | Used by the payment list and the "revenue by treatment" report.                                                                                                                                                                                                                                                                                                                                                                               |
| Clinic Settings   | `treatment_prices`                                                                                                         | Table (child doctype, e.g. **Clinic Treatment Price**, `istable`)                 | The price list. Child fields: `treatment_type` (Select, the Treatment Plan types) and `price` (Currency). The front end sends and reads `[{ "treatment_type": "Crown", "price": 6000 }]` and only uses it to pre-fill `Treatment Plan.total_cost`.                                                                                                                                                                                            |
| Clinic Settings   | `phone_country_code`                                                                                                       | Data                                                                              | The country calling code as digits, e.g. `964`. The front end adds it to local numbers (`0770 123 4567` → `9647701234567`) when it opens WhatsApp; empty means 964. The reminder job should build numbers the same way (see section 2, **Phone numbers**).                                                                                                                                                                                    |
| Treatment Plan    | `lab_name`                                                                                                                 | Data                                                                              | The dental lab doing the work. The Lab Work card shows on Crown, Bridge, Implant and Whitening plans, and on any plan already sent to a lab.                                                                                                                                                                                                                                                                                                  |
| Treatment Plan    | `lab_sent_date`, `lab_due_date`, `lab_received_date`                                                                       | Date                                                                              | When the work went to the lab, is due back, and came back. The Today board lists plans with `lab_sent_date` set and `lab_received_date` not set.                                                                                                                                                                                                                                                                                              |
| WhatsApp Log      | `patient_name`                                                                                                             | Data, read only, `fetch_from: patient.full_name`                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Patient           | `next_recall_date`                                                                                                         | Date                                                                              | The next check-up the dentist chose. Empty means the usual rule (no visit for 6 months).                                                                                                                                                                                                                                                                                                                                                      |
| Patient           | `recall_interval_months`                                                                                                   | Int                                                                               | How often the dentist wants the patient back: 3, 6, 9 or 12; 0 when not chosen.                                                                                                                                                                                                                                                                                                                                                               |
| Patient           | `no_recall`                                                                                                                | Check                                                                             | 1 when the dentist said the patient needs no recall (moved away, treated elsewhere). The front end then sends `recall_interval_months = 0` and `next_recall_date = null`.                                                                                                                                                                                                                                                                     |
| Doctor            | `gender`                                                                                                                   | Select: Female, Male (empty allowed)                                              | Picks the drawn avatar (a man or a woman in a white coat) when there is no photo.                                                                                                                                                                                                                                                                                                                                                             |
| Clinic Settings   | `default_language`                                                                                                         | Select: ar, en (empty allowed)                                                    | The clinic's language for users who did not choose one. Empty (never saved) means Arabic; the Settings page always sends `ar` or `en`.                                                                                                                                                                                                                                                                                                        |
| Clinic Settings   | `arabic_digits`                                                                                                            | Check, default 0                                                                  | 1: Arabic screens write numbers ٠-٩ instead of 0-9.                                                                                                                                                                                                                                                                                                                                                                                           |
| Clinic Settings   | `second_currency`                                                                                                          | Link Currency (or Data), empty allowed                                            | A second currency the clinic takes (`USD`). Empty: one currency only. Never the same as `currency`. See **Two currencies** below.                                                                                                                                                                                                                                                                                                             |
| Clinic Settings   | `exchange_rates`                                                                                                           | Table (child doctype, e.g. **Clinic Exchange Rate**, `istable`)                   | The second currency's rates. Child fields: `rate_date` (Date) and `rate` (Float, how many of the clinic's currency one unit of the second is worth: `1460` for 1 USD = 1,460 IQD). One row per date; each counts from its date on. The front end always sends the whole table.                                                                                                                                                                |
| Treatment Plan    | `currency`                                                                                                                 | Link Currency (or Data), empty allowed                                            | The plan's currency. Empty means the clinic's own. `total_cost`, `paid_amount` and `remaining_amount` are in it.                                                                                                                                                                                                                                                                                                                              |
| Payment           | `currency`                                                                                                                 | Link Currency (or Data), empty allowed                                            | The currency the patient paid in. Empty means the clinic's own (the front end sends `""` for it). `amount` is in it.                                                                                                                                                                                                                                                                                                                          |
| Payment           | `exchange_rate`                                                                                                            | Float                                                                             | Set by the server (never sent by the front end): the rate of the payment's day when two currencies meet (a payment in the second currency, or on a plan in it), else empty. Kept while the payment's day, currency and plan stay the same (section 6, **Two currencies**).                                                                                                                                                                    |
| Payment           | `plan_amount`                                                                                                              | Currency, read only                                                               | Worked out by the server: `amount` in the plan's currency. What the payment takes off the plan.                                                                                                                                                                                                                                                                                                                                               |
| Payment           | `base_amount`                                                                                                              | Currency, read only                                                               | Worked out by the server: `amount` in the clinic's currency, for totals and reports.                                                                                                                                                                                                                                                                                                                                                          |
| WhatsApp Template | `language`                                                                                                                 | Select: ar, en (empty allowed)                                                    | The language the message is written in; empty means any. The front end picks the template in the language of the screen, then one with no language. The reminder job should do the same with the clinic's default language (or the patient's, if a patient language is added later).                                                                                                                                                          |
| Patient           | `chart_sketch`                                                                                                             | JSON                                                                              | Drawings on top of the dental chart, one for the adult teeth and one for the child teeth: `{ "version": 1, "adult": { "version": 1, "aspect": 0.42, "shapes": [...] }, "child": {...} }` (each a SketchData, points from 0 to 1; either may be missing). Store and return it as is. The History card says it changed without showing the values.                                                                                              |
| Doctor            | `photo`                                                                                                                    | Attach Image                                                                      | The doctor's photo, uploaded on `/doctors` with `upload_file` (a public file) and shown in round avatars: lists, the calendar, the Today board. Every clinic role must be able to read it with the Doctor list.                                                                                                                                                                                                                               |
| Doctor            | `rx_paper_size`, `rx_preprinted`, `rx_top_mm`, `rx_bottom_mm`, `rx_qualifications`, `rx_footer`, `rx_logo`, `rx_signature` | Select A5/A4, Check, Int, Int, Small Text, Small Text, Attach Image, Attach Image | The doctor's prescription paper (Edit Paper on the doctor's page). Details in section 9, **Doctor**.                                                                                                                                                                                                                                                                                                                                          |

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
    "36": {
      "conditions": ["root_canal", "crown"],
      "note": "Zirconia crown being made."
    },
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

| Field             | Type                                                | Notes                                                                                                                                                    |
| ----------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `count_date`      | Date, required, **unique**                          | The day that was counted.                                                                                                                                |
| `opening_float`   | Currency                                            | Money put in the drawer in the morning, for change.                                                                                                      |
| `cash_payments`   | Currency, read only                                 | The day's Payments with `payment_method = "Cash"`, worked out in `validate()` when saved (the front end sends its own figure, which should be replaced). |
| `expected_cash`   | Currency, read only                                 | `opening_float + cash_payments`.                                                                                                                         |
| `cash_counted`    | Currency, required                                  | All the cash counted in the drawer.                                                                                                                      |
| `difference`      | Currency, read only                                 | `cash_counted - expected_cash`: below 0 short, above 0 over.                                                                                             |
| `note`            | Small Text                                          | Required in `validate()` when `difference` is not 0 ("Write a note saying why the cash is short or over.").                                              |
| `counted_by`      | Link to User                                        | The user who saved it (set it from `frappe.session.user`).                                                                                               |
| `counted_by_name` | Data, read only, `fetch_from: counted_by.full_name` |                                                                                                                                                          |
| `counted_at`      | Datetime, read only                                 | Set to now on every save.                                                                                                                                |

Permissions: users with `add_payments` create and update; users with `view_payments` read. Do not allow delete
for the front desk (a manager can correct a count by updating it). The front end reads the day's count with
`GET /api/resource/Cash Count` filtered on `count_date`, and the last 14 counts sorted `count_date desc`.

### New doctype: Expense (and two permission switches)

The Expenses page (`/expenses`) and the Profit part of Reports. Name series `EXP-.YYYY.-.#####`. An expense with a
`doctor` counts against that doctor in "Profit by Doctor"; one without is the whole clinic's (rent, salaries).

| Field            | Type                                            | Notes                                                                                                                                                                         |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expense_date`   | Date, required                                  |                                                                                                                                                                               |
| `category`       | Select, required                                | `Rent`, `Salaries`, `Dental Supplies`, `Lab Fees`, `Equipment`, `Utilities`, `Maintenance`, `Marketing`, `Other` (`EXPENSE_CATEGORIES` in `src/lib/types.ts`).                |
| `amount`         | Currency, required                              | Above zero, in the expense's currency.                                                                                                                                        |
| `currency`       | Link Currency (or Data)                         | Empty is the clinic's own; else `Clinic Settings.second_currency`.                                                                                                            |
| `exchange_rate`  | Float, read only                                | Set in `validate()` from `Clinic Settings.exchange_rates` (the rate of `expense_date`) when `currency` is the second one; kept while the day and currency stay, like Payment. |
| `base_amount`    | Currency, read only                             | The amount in the clinic's own currency (`amount × exchange_rate` for the second currency), for totals.                                                                       |
| `doctor`         | Link Doctor                                     | Optional.                                                                                                                                                                     |
| `doctor_name`    | Data, read only, `fetch_from: doctor.full_name` | Stored: searched.                                                                                                                                                             |
| `description`    | Data                                            | What it was for.                                                                                                                                                              |
| `paid_to`        | Data                                            | The landlord, the lab, the supplier.                                                                                                                                          |
| `payment_method` | Select                                          | `Cash`, `Card`, `Bank Transfer`, or empty.                                                                                                                                    |

`validate()`: a date and a category, `amount > 0`, a currency the clinic takes, and a rate for the day when it is
the second currency ("There is no exchange rate for USD on that day."). **Clinic Settings.validate()** must also
count expenses when it refuses to change `currency` or to clear a `second_currency` in use.

Two new **Clinic Permission** switches: `view_expenses` (read the list and the profit on Reports) and
`add_expenses` (create, change and delete expenses). The Clinic Manager has both; the doctor and receptionist
presets have neither. The front end reads with `GET /api/resource/Expense` filtered on `expense_date` and
`category`, searched on `description`, `paid_to`, `doctor_name` and `name`, sorted `expense_date desc, name desc`.

### New doctype: Dental Image (the X-ray section)

Naming `IMG-.YYYY.-.#####`. One record per X-ray, photo or scan of a patient. The front end creates the record,
then uploads the file with `upload_file` (`doctype: "Dental Image"`, `docname`, `is_private: 1`), then sets `image`
to the file's URL. Deleting the record must delete its attached file (Frappe does this for attachments).

| Field          | Type                                                                                                  | Required | Notes                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `patient`      | Link Patient                                                                                          | Yes      |                                                                                                                                                              |
| `patient_name` | Data, read only, `fetch_from: patient.full_name`                                                      |          |                                                                                                                                                              |
| `image_type`   | Select: Periapical, Bitewing, Panoramic (OPG), Cephalometric, CBCT screenshot, Intraoral photo, Other | Yes      |                                                                                                                                                              |
| `taken_on`     | Date                                                                                                  | Yes      |                                                                                                                                                              |
| `teeth`        | Data                                                                                                  | No       | FDI numbers, comma-separated ("36,37"). Empty: the whole mouth.                                                                                              |
| `description`  | Small Text                                                                                            | No       |                                                                                                                                                              |
| `file_name`    | Data                                                                                                  | No       | The name of the uploaded file.                                                                                                                               |
| `image`        | Attach Image (or Attach, for PDFs)                                                                    | No       | The private file's URL (`/private/files/…`). Empty for a moment during an upload.                                                                            |
| `annotations`  | JSON                                                                                                  | No       | The drawing on top, one SketchData: `{ "version": 1, "aspect": 0.75, "shapes": [...] }` (points from 0 to 1 of the image). The file itself is never changed. |

Permissions: read with `view_patients`, and with `view_treatments` (the treatment plan page shows the patient's
images on the chart); create, write and delete with `edit_patients` (the same rule the front end uses).
Add Dental Image to the Patient's links, so a patient with images cannot be deleted. Accepted files: JPG, PNG, PDF up
to 10 MB (DICOM later).

### New doctypes: Dental Medicine and Prescription

The prescription form (`/prescriptions/new`) and the Medicines page (`/medicines`, `manage_users`).

**Dental Medicine**, name series `MED-.#####`: the clinic's medicine list.

| Field                                                       | Type             | Notes                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medicine_name`                                             | Data, required   | The generic name, "Amoxicillin".                                                                                                                                                                                                                                                          |
| `strength`                                                  | Data             | "500 mg", "0.12%".                                                                                                                                                                                                                                                                        |
| `dosage_form`                                               | Select           | Tablet, Capsule, Suspension, Syrup, Mouthwash, Gel, Drops, Injection, Other.                                                                                                                                                                                                              |
| `medicine_group`                                            | Select           | Antibiotic, Painkiller, Mouthwash, Antifungal, Other.                                                                                                                                                                                                                                     |
| `default_dose`, `default_frequency`, `default_instructions` | Data             | The usual prescription, filled into a new row. `default_frequency` is one of the values in `FREQUENCIES` (`src/lib/prescriptions.ts`): Once a day, Twice a day, Three times a day, Four times a day, Every 4 hours, Every 6 hours, Every 8 hours, Every 12 hours, When needed, Once only. |
| `default_duration_days`                                     | Int              |                                                                                                                                                                                                                                                                                           |
| `allergy_words`                                             | Data             | Comma-separated words; when one appears in `Patient.allergies` the form warns.                                                                                                                                                                                                            |
| `is_nsaid`, `avoid_in_pregnancy`                            | Check            | Warn with a blood thinner / a pregnancy in the patient's medical text.                                                                                                                                                                                                                    |
| `max_daily_mg`                                              | Int              | The usual daily maximum; 0 means no check.                                                                                                                                                                                                                                                |
| `child_note`                                                | Small Text       | Shown when the patient is under 12.                                                                                                                                                                                                                                                       |
| `is_active`                                                 | Check, default 1 | Only active medicines are offered; nothing is deleted.                                                                                                                                                                                                                                    |

**Prescription**, name series `RX-.YYYY.-.#####`, with a child table **Prescription Medicine**.

| Field               | Type                                             | Notes                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patient`           | Link Patient, required                           |                                                                                                                                                                                                                                                                     |
| `patient_name`      | Data, read only, `fetch_from: patient.full_name` |                                                                                                                                                                                                                                                                     |
| `doctor`            | Link Doctor, required                            |                                                                                                                                                                                                                                                                     |
| `doctor_name`       | Data, read only, `fetch_from: doctor.full_name`  |                                                                                                                                                                                                                                                                     |
| `appointment`       | Link Appointment                                 | The visit it was written at (empty when written from the patient page).                                                                                                                                                                                             |
| `prescription_date` | Date, required                                   |                                                                                                                                                                                                                                                                     |
| `notes`             | Small Text                                       | Printed under the medicines.                                                                                                                                                                                                                                        |
| `medicines`         | Table (Prescription Medicine)                    | Rows: `medicine` (Link Dental Medicine), `medicine_name` (Data: the name and strength as they were when written, sent by the front end), `dose` (Data), `frequency` (Data: one of the `FREQUENCIES` above, or empty), `duration_days` (Int), `instructions` (Data). |
| `summary`           | Data, read only                                  | Set in `validate()`: the rows' `medicine_name` joined with ", ", because the list API does not return child tables and the patient page and the appointment page list prescriptions by it.                                                                          |

Permissions: `view_treatments` reads both; `add_treatments` creates, updates and deletes Prescription; `manage_users`
writes Dental Medicine; the prescription form reads the medicine list with `add_treatments`. Turn on Track Changes
for Prescription: the Activity page reads its changes. The safety warnings are worked out in the browser from the
patient's medical text and the medicine flags; nothing to compute on the server.

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
  colour such as `#0d9394`, or empty for the default violet `#6a5fdd`; the whole front end is coloured from it),
  `enable_whatsapp`, `enable_patient_portal`, `enable_financial_reports` (Checks), and `working_days` (Data: the
  English day names the clinic is open, comma-separated, e.g. `Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday`;
  the Settings page saves at least one day; empty, never saved, means every day).
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
  `Clinic Permission`, `Clinic Settings`, `WhatsApp Template` and `Dental Medicine`, and read `WhatsApp Log`,
  `Version`, `Deleted Document` and the Activity page's eight doctypes.
- **Screens read more than their own doctype.** A form's patient picker reads Patient for anyone who may add an
  appointment, a plan or a payment; the Today board reads Patient, Treatment Plan (lab work) and the active WhatsApp
  Templates for `view_appointments`; the receipt reads Patient and Treatment Plan for `view_payments`; Reports reads
  Payment, Treatment Plan and Appointment for `view_reports`; the treatment plan page reads Patient and Dental Image
  for `view_treatments`. Section 9 lists these under **Permissions** for each doctype ("Also read by"); the server
  must allow them, or those cards fail.
- **Who sees everything:** the user `Administrator` and anyone with the role `System Manager` get every switch in
  the front end. Anyone else gets the switches of their Clinic Permission record; with no record, every switch is
  off.
- **Enforce the 16 flags on the server**, for example with `has_permission` / `permission_query_conditions`
  hooks, or by giving each role DocType permissions that match the presets in `ROLE_PRESETS`
  (`src/lib/types.ts`). Otherwise a user could still call the API directly. Section 9 gives, for each doctype, the
  switches the screens use to read, create, update and delete it (for example, an appointment is deleted with
  `edit_appointments`, a payment with `add_payments`, and treatment sessions are added and changed with
  `edit_treatments`).

A simpler option for the first two reads is one whitelisted method, for example
`dent_app.api.get_my_session`, that returns the user's name, roles and permission flags. If you add it,
change `src/context/SessionContext.tsx` to call it with `callMethod`.

### The activity log and restoring deleted records

The Activity page (`/activity`, `manage_users`) reads three things Frappe already keeps:

- each record's `owner` and `creation` (Patient, Appointment, Treatment Plan, Payment, Expense, Prescription, Dental
  Image, Doctor), newest first, for "added";
- `Version` (`ref_doctype`, `docname`, `data`, `owner`, `creation`), listed directly with
  `GET /api/resource/Version` filtered on `ref_doctype in (…)`, for "changed": turn on **Track Changes** for all eight
  doctypes (it is already on for the first four);
- `Deleted Document` (`deleted_doctype`, `deleted_name`, `data`, `restored`, `new_name`, `owner`, `creation`), for
  "deleted", and **Restore** calls `frappe.core.doctype.deleted_document.deleted_document.restore` with `name`.

Users with `manage_users` need read access to `Version`, `Deleted Document` and `User` (for the names), and the
right to call the restore method. Frappe's naming series never gives a deleted record's number out again, which the
restore relies on (the record goes back under its own name). Restore should refuse a record whose patient, doctor,
plan or appointment is gone, with a readable message, and run the same `validate()` as a new record (a payment must
still fit its plan). Deleted X-rays and photos come back without their file (Frappe deletes the File).

### Serving the installable app

The front end is an installable app (web app manifest at `/manifest.webmanifest`, service worker at `/sw.js`). Both
are served by Next.js itself; the site needs **HTTPS** for installing and for the service worker. The service worker
never caches `/frappe/…`, so API answers always come from the server.

## 4. API calls the front end makes

- `GET /api/resource/<Doctype>` with `fields`, `filters`, `or_filters`, `order_by`, `limit_start`,
  `limit_page_length` (`0` means all rows).
- `GET /api/resource/<Doctype>/<name>`, `POST /api/resource/<Doctype>`, `PUT …/<name>`, `DELETE …/<name>`.
- `GET /api/method/frappe.client.get_count` with `doctype`, `filters`.
- `POST /api/method/frappe.core.doctype.deleted_document.deleted_document.restore` with `name` (the Activity page).
- `GET /api/method/frappe.desk.reportview.get_count` with `doctype`, `fields`, `filters`, `or_filters`,
  `distinct` — used for the count when a search box is filled. **Check that this works for every role**; if
  not, add a small whitelisted count method.
- `POST /api/method/upload_file` (multipart, `is_private=0`, `folder=Home`) for the clinic logo, doctor photos and
  the prescription paper's logo and signature, and with `doctype=Dental Image`, `docname=<image>`, `is_private=1`,
  `folder=Home/Attachments` for X-rays and photos: the front end first creates the Dental Image record, then uploads
  the file attached to it, then saves the file's URL in `image` (if the upload fails it deletes the record again).
  Only `file_url` is read from the answer. It lists a patient's images with `GET /api/resource/Dental Image`
  filtered on `patient`, opens one with `GET …/<name>` (the printable page), changes the details or the drawing with
  `PUT`, deletes one with `DELETE /api/resource/Dental Image/<name>` (Frappe deletes the attached file with it), and
  shows the file at `/frappe<file_url>` through the rewrite (the session cookie opens private files). Every role
  with `view_patients` or `view_treatments` must be able to read these private files.
- `PUT /api/resource/User/<own id>` with `{ "language": "ar" }` or `"en"` (the language switch, for every user).
- `GET /api/resource/Version` and `GET /api/resource/Deleted Document` (the Activity page, section 9).
- `GET /api/method/frappe.desk.form.load.getdoc` with `doctype`, `name` for the **History** card (patient,
  appointment, treatment plan and payment pages). The front end reads `docs[0].owner` and `creation`,
  `docinfo.versions` (`name`, `owner`, `creation`, `data` with `changed: [[field, old, new]]`; Frappe writes the values
  as formatted text, such as `150,000.00` or `20-08-2026`, and the front end reads them that way) and
  `docinfo.user_info` (`fullname` for the owner, the last editor and the users in the versions, which Frappe
  fills in itself). Track Changes (`track_changes: 1`) is already on for Patient, Appointment, Treatment Plan and
  Payment; keep it on, or there is nothing to show but who added the record (and turn it on for Expense,
  Prescription, Dental Image and Doctor too, for the Activity page). The card loads again when the record's
  `modified` changes. getdoc checks read permission on
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

The recall list (`/recall`) and the dashboard's "Needs attention" card load every patient and appointment to find
who is due. A whitelisted method that returns patients with no completed visit since a date and nothing booked
would be faster.

The dashboard and reports add up payments and balances in the browser. When the data grows, add
whitelisted methods that return the sums for a date range (revenue by treatment, by method, by month, and
the outstanding total), and switch `src/app/reports/page.tsx` and `src/app/dashboard/page.tsx` to them. The
existing query reports (Daily Revenue, Monthly Revenue, Treatment Revenue, Outstanding Balances) are a good
base.

## 9. Reference: every doctype the front end uses

This is the whole contract in one place, checked against the code on 2026-10-01. For each doctype it lists who may
do what, every call the front end makes, and every field it reads or sends, with its type and whether it is
required. Sections 1 to 6 explain the new fields and the rules in more detail. If a doctype, field or call is not
listed here, the front end does not use it.

How to read the tables:

- **Type** is the Frappe field type we expect. For a Select, the allowed values follow it; the front end saves
  them in English and translates only the labels.
- **Required**: **Yes** means the form will not save without it, so the doctype should mark it `reqd` too.
  **Server** means the front end never sends it (or its value is replaced): the back end works it out or fetches
  it. **No** means optional.
- **Stored** (in Notes) means the field is used in a filter, a search or a sort, so it must be a real column,
  not a virtual field. Fetch fields (`fetch_from`) are stored by default; keep them that way.
- **Permissions** name the Clinic Permission switches the screens check. "Also read by" lists the other
  switches whose screens read this doctype too (a picker in a form, a card on another page). The server must allow
  those reads, or the screen shows an error or leaves the card out.
- **Calls** use the shapes in section 4: "list" is `GET /api/resource/<Doctype>`, "count" is `get_count`
  (`reportview.get_count` when a search box is filled), "get" is `GET …/<name>`, "create" is `POST`, "update" is
  `PUT …/<name>` and "delete" is `DELETE …/<name>`.

Rules for every doctype:

- Dates are sent as `YYYY-MM-DD`, Datetimes as `YYYY-MM-DD HH:MM:SS` (local time), Times as `HH:MM` (no seconds);
  Frappe's `HH:MM:SS` is read fine.
- Check fields are sent as `0` or `1`.
- An empty Date, Time or Link to a record (patient, doctor, plan, appointment, medicine) is sent as `null`. Empty
  text is sent as `""`. Some other empty values are sent as `""`, so the server must accept both `""` and `null`
  for them:
  - the currency fields (`currency` on Treatment Plan, Payment and Expense, `Clinic Settings.second_currency`):
    `""` means the clinic's own currency, or no second currency;
  - `Clinic Settings.logo` and `theme_color`: `""` means none / the default colour;
  - the empty Selects `Patient.gender`, `Dental Medicine.default_frequency` and `Prescription Medicine.frequency`
    (while `Doctor.gender`, `Expense.payment_method` and `WhatsApp Template.language` are sent as `null`).
- A child table is always sent whole (every row, without `name` or `idx`), so each save replaces the table.
- **Updates are often partial**: a `PUT` may carry only one or two fields (a status, a waiting room step, the dental
  chart, a drawing, a role list). Frappe merges them into the saved record; `validate()` must work with that.
- Link fields hold the record ID; the screens show the fetched `*_name` field instead.
- Frappe's standard fields are read too: `owner` and `creation` (the History card and the Activity page) and
  `modified` (the History card of a patient, appointment, treatment plan or payment loads again when it changes).
  Lists read `name` always.
- **Who sees everything:** the user `Administrator` and anyone with the role `System Manager` get every switch in
  the front end. Anyone else gets the switches of the Clinic Permission record named after their user ID; with no
  such record, every switch is off (the dashboard and the profile still open).

### Patient

Naming `PAT-.YYYY.-.#####`. Track Changes on.

**Permissions.** Read: `view_patients`. Also read by: anyone with `add_appointments`, `add_treatments` or
`add_payments` (the patient picker in their forms, and the medical alerts under it: `name`, `full_name`,
`phone_number`, `age` and the five medical fields), `view_appointments` (the Today board and the appointment page:
phone, balance, gender, age and the medical fields), `view_payments` (the receipt: phone and balance; the dashboard's
"owes money" count), `view_treatments` (the treatment plan and prescription pages: name, age and the medical fields,
and the dental chart), `manage_users` (the Activity page). Create: `add_patients`. Update: `edit_patients` (the form,
the dental chart, the chart drawing, the next check-up; also the "What was done in this visit?" dialog). Delete:
`delete_patients`.

**Calls.**

- list + count (Patients page): search `like` on `full_name`, `phone_number`, `secondary_phone`, `name` (phone
  numbers also as digit patterns, section 2); filters `gender =`, `total_remaining > 0`; sorted `full_name asc` or
  `total_remaining desc`; 20 a page.
- list: the global search (the same search, 8 rows), the patient picker (`full_name`, `name`, `phone_number`, 20
  rows), the duplicate check on the form (`phone_number like`, `secondary_phone like`, `full_name like`), single
  patients by `name =` or `name in […]` (Today board, receipt, prescription, medical alerts, chart), and every
  patient (`limit_page_length=0`) for the recall list and the dashboard's "Needs attention" card.
- count: every patient, and patients with `total_remaining > 0` (the dashboard).
- get (every patient page and printout), create, update (whole form; or only `dental_chart`; only `chart_sketch`;
  only `next_recall_date`, `recall_interval_months` and `no_recall`), delete, getdoc (History).

| Field                                                                              | Type                        | Required | Notes                                                                                                                                        |
| ---------------------------------------------------------------------------------- | --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `full_name`                                                                        | Data                        | Yes      | Stored (search, sort).                                                                                                                       |
| `gender`                                                                           | Select: Male, Female, Other | No       | Stored (filter). Sent as `""` when empty.                                                                                                    |
| `date_of_birth`                                                                    | Date                        | No       |                                                                                                                                              |
| `age`                                                                              | Int                         | No       | 0-120. Sent only when `date_of_birth` is empty (`null` when no age was typed either); left out of the payload when there is a date, and worked out from it. Must not be read only (section 2). |
| `phone_number`                                                                     | Data                        | Yes      | Stored as typed; searched with digit patterns (section 2, **Phone numbers**).                                                                |
| `secondary_phone`                                                                  | Data                        | No       | Same as `phone_number`.                                                                                                                      |
| `email`                                                                            | Data (Email)                | No       |                                                                                                                                              |
| `address`                                                                          | Small Text                  | No       |                                                                                                                                              |
| `allergies`, `current_medications`, `chronic_diseases`, `medical_history`, `notes` | Small Text                  | No       | The medical alerts and prescription warnings are read from these texts.                                                                      |
| `dental_chart`                                                                     | JSON                        | No       | Section 1. Sent as a JSON string.                                                                                                            |
| `chart_sketch`                                                                     | JSON                        | No       | Section 1: the drawings on the chart; `null` removes them.                                                                                   |
| `next_recall_date`                                                                 | Date                        | No       | Section 1.                                                                                                                                   |
| `recall_interval_months`                                                           | Int: 0, 3, 6, 9, 12         | No       | Section 1.                                                                                                                                   |
| `no_recall`                                                                        | Check                       | No       | Section 1.                                                                                                                                   |
| `total_paid`                                                                       | Currency                    | Server   |                                                                                                                                              |
| `total_remaining`                                                                  | Currency                    | Server   | Stored: filtered (`> 0`) and sorted.                                                                                                         |
| `total_appointments`, `total_treatments`                                           | Int                         | Server   | Not read by the front end.                                                                                                                   |

### Doctor

Naming `DOC-.#####`. Written only on `/doctors` and the doctor's page; never deleted. Track Changes on (Activity).

**Permissions.** Read: every clinic role (the active doctors for every dropdown, the calendar and the Today board,
and `email` to find "my" doctor record). Also read by `view_treatments` (the prescription paper fields, on the
prescription page). The whole list with search, and create and update: `manage_users`. Delete: never (switch
`is_active` off).

**Calls.**

- list (every dropdown): `is_active = 1`, sorted `full_name asc`, all rows, with `name`, `full_name`,
  `specialization`, `start_time`, `end_time`, `gender`, `photo`.
- list (the user's own doctor record): `email = <the user's email>`, `is_active = 1`, one row.
- list + count (Doctors page): search `like` on `full_name`, `specialization`, `phone_number`, `email`; filter
  `is_active =`; sorted `full_name asc`; 20 a page.
- list (prescription page): `name =`, with the `rx_*` fields below.
- get (doctor's page), create, update (the dialog; or only the `rx_*` fields from Edit Paper), `upload_file` for
  `photo`, `rx_logo` and `rx_signature` (public files).

| Field                       | Type                                                                                                              | Required | Notes                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `full_name`                 | Data                                                                                                              | Yes      | Stored (search, sort).                                                                                               |
| `specialization`            | Select: General Dentist, Orthodontist, Endodontist, Periodontist, Oral Surgeon, Pediatric Dentist, Prosthodontist | No       | Stored (search). The form starts at General Dentist.                                                                 |
| `phone_number`              | Data                                                                                                              | No       | Stored (search).                                                                                                     |
| `email`                     | Data (Email)                                                                                                      | No       | Stored (filter, search). Links a user to their Doctor record (section 2). Every clinic role must be able to read it. |
| `start_time`, `end_time`    | Time                                                                                                              | No       | Both or neither; the end must be after the start.                                                                    |
| `is_active`                 | Check, default 1                                                                                                  | No       | Stored (filter). Only active doctors are offered.                                                                    |
| `gender`                    | Select: Female, Male                                                                                              | No       | Section 1. `null` when empty.                                                                                        |
| `photo`                     | Attach Image                                                                                                      | No       | Section 1. A public file URL; `null` removes it. Image up to 5 MB (checked in the browser).                          |
| `rx_paper_size`             | Select: A5, A4 (default A5)                                                                                       | No       | The doctor's prescription paper (`src/lib/rxPaper.ts`).                                                              |
| `rx_preprinted`             | Check                                                                                                             | No       | The paper already has the doctor's header and footer printed on it.                                                  |
| `rx_top_mm`, `rx_bottom_mm` | Int, 0-120                                                                                                        | No       | The room left for that printed header and footer, in mm (defaults 40 and 20).                                        |
| `rx_qualifications`         | Small Text                                                                                                        | No       | Lines printed under the doctor's name.                                                                               |
| `rx_footer`                 | Small Text                                                                                                        | No       | Printed at the bottom of the prescription.                                                                           |
| `rx_logo`, `rx_signature`   | Attach Image                                                                                                      | No       | An own logo, and a signature or stamp image (up to 2 MB); `null` removes them.                                       |

### Appointment

Naming `APT-.YYYY.-.#####`. Track Changes on.

**Permissions.** Read: `view_appointments`. Also read by `view_reports` (the appointment outcomes on Reports),
`view_treatments` (the visit's date and time on a prescription) and `manage_users` (Activity); the dashboard shows its appointment cards only with `view_appointments`. Create:
`add_appointments`. Update (the form, the status buttons, the waiting room steps, dragging in the calendar) and
delete: `edit_appointments`.

**Calls.**

- list + count (the list view): search `like` on `patient_name`, `doctor_name`, `reason_for_visit`, `name`;
  filters `appointment_date =`, `>=`, `<`, `status =`; sorted `appointment_date asc|desc, appointment_time asc|desc`.
- list (all rows): the calendar (`appointment_date between`, `doctor =`), the booking form's clash check and the
  doctor's day (`doctor =`, `appointment_date =`, `status not in (Cancelled, No Show)`, `name !=`), the Today board
  (today; earlier days still open: `appointment_date <`, `status in (Scheduled, Confirmed)`, 50 rows; tomorrow), the
  waiting room screen (today, `status in`, every 20 seconds), the bell (today, `status in`, `doctor =` for a doctor),
  the dashboard (today, the next 7 days, the last 6 months for the chart, open ones in the past), the recall list
  and the dashboard's "Needs attention" (every appointment: `patient`, `appointment_date`, `status`), Reports
  (`appointment_date >=` and `<=`), a patient's appointments (`patient =`), the next visit of the patients on a list
  page (`patient in`, `appointment_date >=`, `status in`), a doctor's page (`doctor =`, dates, `status !=`), and one
  appointment's date and time on a prescription (`name =`).
- count: open appointments in the past (`appointment_date <`, `status in`, `doctor =`).
- get, create, update (the whole form; or only `status`; only `arrived_at`; only `in_chair_at`; only
  `appointment_date`, `appointment_time` and `doctor` after a drag), delete, getdoc (History).

| Field              | Type                                                        | Required | Notes                                                                                     |
| ------------------ | ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `patient`          | Link Patient                                                | Yes      | Stored (filter `=`, `in`).                                                                |
| `patient_name`     | Data, `fetch_from: patient.full_name`                       | Server   | Stored (search).                                                                          |
| `doctor`           | Link Doctor                                                 | Yes      | Stored (filter).                                                                          |
| `doctor_name`      | Data, `fetch_from: doctor.full_name`                        | Server   | Stored (search).                                                                          |
| `appointment_date` | Date                                                        | Yes      | Stored: filtered with `=`, `<`, `>`, `>=`, `<=`, `between`; sorted.                       |
| `appointment_time` | Time                                                        | Yes      | Stored (sort).                                                                            |
| `duration_minutes` | Int: 15, 30, 45, 60, 90, 120 (default 30)                   | No       |                                                                                           |
| `status`           | Select: Scheduled, Confirmed, Completed, Cancelled, No Show | Yes      | Stored: filtered with `=`, `!=`, `in`, `not in`. Always sent; new bookings are Scheduled. |
| `reason_for_visit` | Data                                                        | No       | Stored (search).                                                                          |
| `notes`            | Small Text                                                  | No       |                                                                                           |
| `arrived_at`       | Datetime                                                    | No       | Section 1: arrived at the front desk (waiting room). `null` clears it.                    |
| `in_chair_at`      | Datetime                                                    | No       | Section 1: called into the chair. `null` clears it.                                       |

### Treatment Plan

Naming `TRT-.YYYY.-.#####`. Track Changes on.

**Permissions.** Read: `view_treatments`. Also read by `view_payments` (the payment form's plan list, balances,
the receipt, the statement, the dashboard's amount owed), `add_payments` (the payment form), `view_reports`
(Reports), `view_appointments` (the Today board's "Lab work due") and `manage_users` (the counts before a currency
change in Settings, Activity). Create: `add_treatments`. Update (the form, the status buttons, the lab work) and
delete: `edit_treatments`.

**Calls.**

- list + count (Treatment Plans page): search `like` on `patient_name`, `treatment_type`, `tooth_number`, `name`
  (and `treatment_type in […]` for the types whose translated label matches); filters `status =`,
  `treatment_type =`; sorted `name desc`.
- list (all rows): a patient's plans (`patient =`; for the estimate also `status in (Planned, In Progress)`, for
  the statement `status != Cancelled`), the open plans of the "What was done?" dialog, plans with a balance
  (`remaining_amount > 0`, `patient in`), the dashboard (counts by `status in`, balances, types), Reports (with a
  balance, sorted `remaining_amount desc`; every plan's doctor; plans started in the period: `creation >=` and
  `<`, `status != Cancelled`), a doctor's open plans (`doctor =`, `status in`), the lab list (`lab_sent_date is
set`, `lab_received_date is not set`, sorted `lab_due_date asc`).
- count: plans in a currency (`currency =`) and all plans, before Settings changes a currency; open plans
  (`status in (Planned, In Progress)`) on the dashboard.
- get, create, update (the form; or only `status`; or only the four `lab_*` fields; or only
  `lab_received_date`), delete, getdoc (History).

| Field                          | Type                                                                                 | Required                   | Notes                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `patient`                      | Link Patient                                                                         | Yes                        | Stored (filter).                                                                                        |
| `patient_name`                 | Data, fetched                                                                        | Server                     | Stored (search).                                                                                        |
| `doctor`                       | Link Doctor                                                                          | No                         | Stored (filter).                                                                                        |
| `doctor_name`                  | Data, fetched                                                                        | Server                     |                                                                                                         |
| `treatment_type`               | Select: Filling, Root Canal, Crown, Bridge, Extraction, Implant, Cleaning, Whitening | Yes                        | Stored (filter, search).                                                                                |
| `tooth_number`                 | Data                                                                                 | No                         | Stored (search). An FDI number as text (`"36"`, `"51"`); older free text like `"36, 37"` is still read. |
| `currency`                     | Link Currency (or Data)                                                              | No                         | Section 1. `""`: the clinic's own. Stored (count filter). Cannot change once the plan has payments.     |
| `total_cost`                   | Currency                                                                             | Yes                        | In the plan's `currency`. 0 or more; cannot go below what was already paid.                             |
| `status`                       | Select: Planned, In Progress, Completed, Cancelled                                   | Yes                        | Stored (filter `=`, `!=`, `in`). New plans are always sent as Planned.                                  |
| `diagnosis`, `treatment_notes` | Small Text                                                                           | No                         |                                                                                                         |
| `paid_amount`                  | Currency                                                                             | Server                     | Sum of the plan's payments' `plan_amount` (section 6, **Two currencies**).                              |
| `remaining_amount`             | Currency                                                                             | Server                     | Stored: filtered (`> 0`) and sorted. 0 for a Cancelled plan.                                            |
| `lab_name`                     | Data                                                                                 | No                         | Section 1. The Lab Work card shows for Crown, Bridge, Implant and Whitening, or any plan already sent.  |
| `lab_sent_date`                | Date                                                                                 | Yes in the Lab Work dialog | Stored (filtered with `is set`).                                                                        |
| `lab_due_date`                 | Date                                                                                 | No                         | Stored (sort). Not before `lab_sent_date`.                                                              |
| `lab_received_date`            | Date                                                                                 | No                         | Stored (filtered with `is not set`).                                                                    |
| `creation`                     | Frappe's own                                                                         | Server                     | Filtered with `>=` and `<` by Reports (plans started in the period).                                    |

### Treatment Session

Naming `SES-.YYYY.-.#####`.

**Permissions.** Read: `view_treatments`. Create, update and delete: `edit_treatments` (the Sessions card of a plan,
and "What was done in this visit?" after an appointment is completed).

**Calls.** list of a plan's sessions (`treatment_plan =`, sorted `session_date asc, session_time asc`), of a
patient's sessions (`patient =`, sorted by `session_date`), create, update, delete.

| Field            | Type                                    | Required | Notes                                                              |
| ---------------- | --------------------------------------- | -------- | ------------------------------------------------------------------ |
| `treatment_plan` | Link Treatment Plan                     | Yes      | Stored (filter). Always sent.                                      |
| `patient`        | Link Patient                            | Yes      | Stored (filter). Sent from the plan.                               |
| `patient_name`   | Data, fetched                           | Server   |                                                                    |
| `doctor`         | Link Doctor                             | No       |                                                                    |
| `doctor_name`    | Data, fetched                           | Server   |                                                                    |
| `session_date`   | Date                                    | Yes      | Stored (sort).                                                     |
| `session_time`   | Time                                    | No       |                                                                    |
| `status`         | Select: Scheduled, Completed, Cancelled | Yes      | New sessions start as Scheduled; the visit dialog sends Completed. |
| `notes`          | Small Text                              | No       | "What was done in this visit?" is saved here.                      |

### Payment

Naming `PAY-.YYYY.-.#####`. Track Changes on.

**Permissions.** Read: `view_payments`. Also read by `view_reports` (Reports) and `manage_users` (the counts before
a currency change in Settings, Activity). Create, update and delete: `add_payments`.

**Calls.**

- list + count (Payments page): search `like` on `patient_name`, `treatment_type`, `notes`, `name`; filters
  `payment_method =`, `payment_date >=` and `<=`; sorted `payment_date desc, name desc`. The total under the list
  reads every matching row (`amount`, `currency`) with the same filters and search.
- list (all rows): the day report (`payment_date =`), the dashboard (`payment_date >=`), Reports (the period and
  the period before), a patient's payments (`patient =`), a plan's payments (`treatment_plan =`; the receipt also
  reads them to print what was left after this payment).
- count: payments in a currency (`currency =`) and all payments, before Settings changes a currency.
- get, create, update, delete, getdoc (History).

| Field            | Type                                              | Required | Notes                                                                                  |
| ---------------- | ------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `patient`        | Link Patient                                      | Yes      | Stored (filter).                                                                       |
| `patient_name`   | Data, fetched                                     | Server   | Stored (search).                                                                       |
| `treatment_plan` | Link Treatment Plan                               | No       | Stored (filter). `null` for a general payment.                                         |
| `treatment_type` | Data, `fetch_from: treatment_plan.treatment_type` | Server   | Stored (search, reports).                                                              |
| `payment_date`   | Date                                              | Yes      | Stored (filter, sort).                                                                 |
| `amount`         | Currency                                          | Yes      | In the payment's `currency`. Above 0, and (converted) not more than the plan has left. |
| `currency`       | Link Currency (or Data)                           | No       | Section 1. `""`: the clinic's own. Stored (count filter).                              |
| `exchange_rate`  | Float                                             | Server   | Section 1. Never sent by the front end; read on the form, the receipt and Reports.     |
| `plan_amount`    | Currency                                          | Server   | `amount` in the plan's currency. Read on the receipt, the statement and the plan page. |
| `base_amount`    | Currency                                          | Server   | `amount` in the clinic's currency. Read by the dashboard and Reports.                  |
| `payment_method` | Select: Cash, Card, Bank Transfer                 | Yes      | Stored (filter). New payments start as Cash.                                           |
| `notes`          | Small Text                                        | No       | Stored (search).                                                                       |

### Expense

Naming `EXP-.YYYY.-.#####`. Track Changes on (Activity). Details and rules in section 1.

**Permissions.** Read: `view_expenses` (Reports reads it with `view_reports` and `view_expenses`; Activity with
`manage_users`). Create, update and delete: `add_expenses`.

**Calls.** list + count (Expenses page): search `like` on `description`, `paid_to`, `doctor_name`, `name`; filters
`category =`, `expense_date >=` and `<=`; sorted `expense_date desc, name desc`; the total and the CSV export read
every matching row. list (Reports: the period and the period before). get, create, update, delete.

| Field                    | Type                                                                                                   | Required | Notes                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------- |
| `expense_date`           | Date                                                                                                   | Yes      | Stored (filter, sort).                                          |
| `category`               | Select: Rent, Salaries, Dental Supplies, Lab Fees, Equipment, Utilities, Maintenance, Marketing, Other | Yes      | Stored (filter).                                                |
| `amount`                 | Currency                                                                                               | Yes      | Above zero, in the expense's currency.                          |
| `currency`               | Link Currency (or Data)                                                                                | No       | `""`: the clinic's own; else `Clinic Settings.second_currency`. |
| `exchange_rate`          | Float                                                                                                  | Server   |                                                                 |
| `base_amount`            | Currency                                                                                               | Server   |                                                                 |
| `doctor`                 | Link Doctor                                                                                            | No       | `null` when empty.                                              |
| `doctor_name`            | Data, `fetch_from: doctor.full_name`                                                                   | Server   | Stored (search).                                                |
| `description`, `paid_to` | Data                                                                                                   | No       | Stored (search).                                                |
| `payment_method`         | Select: Cash, Card, Bank Transfer                                                                      | No       | `null` when empty. New expenses start as Cash.                  |

### Cash Count

Naming `CC-.YYYY.-.#####`. Details and rules in section 1.

**Permissions.** Read: `view_payments`. Create and update: `add_payments`. Delete: never.

**Calls.** list of the day's count (`count_date =`, one row), list of the recent counts (sorted `count_date desc`,
14 rows), create, update. The front end sends `count_date`, `opening_float`, `cash_counted`, `note` and
`counted_by`, and also its own `cash_payments`, `expected_cash` and `difference`, which `validate()` must replace.

| Field                                          | Type          | Required               | Notes                          |
| ---------------------------------------------- | ------------- | ---------------------- | ------------------------------ |
| `count_date`                                   | Date          | Yes                    | Unique. Stored (filter, sort). |
| `opening_float`                                | Currency      | No                     |                                |
| `cash_counted`                                 | Currency      | Yes                    |                                |
| `note`                                         | Small Text    | Yes when short or over |                                |
| `counted_by`                                   | Link User     | No                     | The user who saved it.         |
| `cash_payments`, `expected_cash`, `difference` | Currency      | Server                 |                                |
| `counted_by_name`                              | Data, fetched | Server                 |                                |
| `counted_at`                                   | Datetime      | Server                 |                                |

### User (Frappe core)

The name is the email address. Created on `/users`; afterwards only `roles`, `enabled` and the user's own
`language` change; never deleted.

**Permissions.** Read their own record: every user (`full_name`, `first_name`, `email`, `roles`, `language`,
`gender`, `user_image`). Read other users, create, update `roles` and `enabled`: `manage_users`. Update their own
`language`: every user (and nothing else on their record through this call).

**Calls.** get (own record; a user's page), list + count (Users page: `name not in (Administrator, Guest)`, filter
`enabled =`, search `like` on `full_name`, `email`, sorted `full_name asc`), list of every user's `full_name`
(Activity), list of the enabled users (`name != Guest`, `enabled = 1`, sorted `full_name asc`) for **Try Another User**
on the profile page (only while login is off, so not needed once it is on), create, update (only `roles`; only
`enabled`; only own `language`).

| Field                  | Type                     | Required      | Notes                                                                                                                                                                          |
| ---------------------- | ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `email`                | Data                     | Yes on create |                                                                                                                                                                                |
| `first_name`           | Data                     | Yes on create | The form calls it "Full Name".                                                                                                                                                 |
| `full_name`            | Data                     | Server        | Stored (search, sort).                                                                                                                                                         |
| `enabled`              | Check                    | No            | Stored (filter). A user cannot disable their own account.                                                                                                                      |
| `roles`                | Table (Has Role): `role` | Yes on create | One of Clinic Manager, Clinic Doctor, Clinic Receptionist on create. Later the manager can choose "No clinic role"; other roles on the user (such as System Manager) are kept. |
| `new_password`         | Password                 | Yes on create | At least 8 characters. Only on create.                                                                                                                                         |
| `send_welcome_email`   | Check                    | No            | Always sent as 0.                                                                                                                                                              |
| `gender`, `user_image` | Frappe's own fields      | No            | Read only, for the avatar in the menu, the top bar and the users list.                                                                                                         |
| `language`             | Link Language: ar, en    | No            | The Arabic / English switch sends `PUT /api/resource/User/<own id>` with `{ "language": "ar" }` or `"en"`. Make sure the Language records `ar` and `en` exist.                 |

### Clinic Permission

One per user; the record **name must equal the user ID** (`autoname: field:user`), because the front end loads it
with `GET /api/resource/Clinic Permission/<user>`. No record means every switch is off.

**Permissions.** Read their own record: every user. Read other users' records, create and update: `manage_users`.
Delete: never.

**Calls.** get (own; a user's page), create (when a user is added with "apply the role's usual permissions", or
saved for the first time on the user's page), update (all 16 switches and `user`).

| Field                                                                                                                                                                                                                                                                                       | Type      | Required | Notes                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`                                                                                                                                                                                                                                                                                      | Link User | Yes      | Unique.                                                                                                                                                                                                                                                                                              |
| `view_patients`, `add_patients`, `edit_patients`, `delete_patients`, `view_appointments`, `add_appointments`, `edit_appointments`, `view_treatments`, `add_treatments`, `edit_treatments`, `view_payments`, `add_payments`, `view_expenses`, `add_expenses`, `view_reports`, `manage_users` | Check     | No       | 16 switches, sent as 0 or 1. The usual sets (`ROLE_PRESETS` in `src/lib/types.ts`): Manager all 16; Doctor view and edit patients, view, add and edit appointments and treatments, view payments; Receptionist view, add and edit patients and appointments, view treatments, view and add payments. |

### Clinic Settings (single)

**Permissions.** Read: every user (the currency, the clinic name, the switches and the colour are used on every
screen). Update: `manage_users`; the save first counts Treatment Plans and Payments (all, and per currency), so that
user also needs `get_count` on both.

**Calls.** get `Clinic Settings/Clinic Settings`, update (every field below in one call), `upload_file` for the logo
(public file, up to 2 MB checked in the browser).

| Field                                         | Type                               | Required | Notes                                                                                                                                                                      |
| --------------------------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clinic_name`                                 | Data                               | Yes      |                                                                                                                                                                            |
| `logo`                                        | Attach Image                       | No       | A public file URL; `""` when removed.                                                                                                                                      |
| `phone`, `email`, `tax_number`                | Data                               | No       | Printed on the letterhead.                                                                                                                                                 |
| `address`                                     | Small Text                         | No       |                                                                                                                                                                            |
| `currency`                                    | Link Currency (or Data)            | No       | ISO code; empty is treated as IQD. The clinic's own currency: totals are kept in it.                                                                                       |
| `second_currency`                             | Link Currency (or Data)            | No       | Section 1. `""`: one currency only.                                                                                                                                        |
| `exchange_rates`                              | Table (**Clinic Exchange Rate**)   | No       | Section 1. Rows: `rate_date` (Date), `rate` (Float above 0), one per date, sent sorted by date.                                                                            |
| `phone_country_code`                          | Data                               | No       | Section 1. Digits only; `""` means 964.                                                                                                                                    |
| `default_language`                            | Select: ar, en                     | No       | Section 1. The Settings page always sends `ar` or `en`; empty (never saved) means Arabic.                                                                                  |
| `arabic_digits`                               | Check                              | No       | Section 1.                                                                                                                                                                 |
| `opening_time`, `closing_time`                | Time                               | No       | `null` when empty.                                                                                                                                                         |
| `working_days`                                | Data                               | No       | The English day names the clinic is open, comma-separated (section 2). The page refuses to save with no day ticked. Empty (never saved) means open every day.              |
| `theme_color`                                 | Color (or Data)                    | No       | A hex colour such as `#0d9394`. `""` means the front end's default violet (`#6a5fdd`).                                                                                     |
| `enable_whatsapp`, `enable_financial_reports` | Check, **default 1**               | No       | The front end treats only an explicit 0 as off, but the Settings form ticks them only for an explicit 1, so keep the default.                                              |
| `enable_patient_portal`                       | Check                              | No       | Saved only; not used yet.                                                                                                                                                  |
| `treatment_prices`                            | Table (**Clinic Treatment Price**) | No       | Section 1. Rows: `treatment_type` (the plan types; an older price list may hold another type, which is kept), `price` (Currency). Only rows with a price above 0 are sent. |

The currencies offered are IQD, USD, EUR, EGP, SAR, AED, JOD, KWD, TRY and GBP (`CURRENCIES` in `src/lib/types.ts`);
if `currency` is a Link, these Currency records must exist and be enabled.

### WhatsApp Template

Naming `WAT-.#####`.

**Permissions.** Read the active templates: `view_appointments` (Tomorrow's reminders on the Today board and Send
Message on an appointment). Read all, create, update and delete: `manage_users`.

**Calls.** list of every template (sorted `template_name asc`), list of the active ones (`is_active = 1`), create,
update, delete.

| Field           | Type                                            | Required | Notes                                                                          |
| --------------- | ----------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `template_name` | Data                                            | Yes      | Stored (sort).                                                                 |
| `trigger`       | Select: 24 Hours Before, 2 Hours Before, Manual | Yes      | New templates start as 24 Hours Before.                                        |
| `message`       | Text                                            | Yes      | With the placeholders in section 2.                                            |
| `is_active`     | Check                                           | No       | Stored (filter).                                                               |
| `language`      | Select: ar, en                                  | No       | Section 1. `null`: any language. New templates start in the screen's language. |

### WhatsApp Log (read only for the front end)

Naming `WAL-.YYYY.-.#####`.

**Permissions.** Read: `manage_users` (the Message Log). An appointment's page also lists that appointment's
messages for everyone with `view_appointments`, and hides the card when the server refuses; allow that read if the
front desk should see them. The front end never writes it.

**Calls.** list + count (search `like` on `patient_name`, `phone_number`, `message`; filter `status =`; sorted
`sent_at desc`), list of one appointment's messages (`appointment =`, sorted `sent_at desc`, 20 rows).

| Field           | Type                          | Required | Notes                                          |
| --------------- | ----------------------------- | -------- | ---------------------------------------------- |
| `patient`       | Link Patient                  | Server   |                                                |
| `patient_name`  | Data, fetched                 | Server   | Stored (search).                               |
| `appointment`   | Link Appointment              | Server   | Stored (filter).                               |
| `phone_number`  | Data                          | Server   | Stored (search). Shown with the middle hidden. |
| `status`        | Select: Sent, Failed, Pending | Server   | Stored (filter).                               |
| `sent_at`       | Datetime                      | Server   | Stored (sort).                                 |
| `message`       | Text                          | Server   | Stored (search).                               |
| `error_message` | Small Text                    | Server   |                                                |

### Dental Medicine

Naming `MED-.#####`. Details in section 1. Never deleted.

**Permissions.** Read: `add_treatments` (the prescription form), `view_treatments` (the printed prescription) and
`manage_users` (the Medicines page). Create and update: `manage_users`. Delete: never (switch `is_active` off).

**Calls.** list of every medicine (sorted `medicine_group asc, medicine_name asc`; inactive ones too, so an old
prescription still shows its medicine), list by `name in […]` (the printed prescription), list + count (Medicines
page: search `like` on `medicine_name`, `medicine_group`, `strength`; filter `is_active =`), create, update.

| Field                                  | Type                                                                                                                                                                | Required | Notes                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `medicine_name`                        | Data                                                                                                                                                                | Yes      | Stored (search, sort).                                                        |
| `strength`                             | Data                                                                                                                                                                | No       | Stored (search).                                                              |
| `dosage_form`                          | Select: Tablet, Capsule, Suspension, Syrup, Mouthwash, Gel, Drops, Injection, Other                                                                                 | No       | Always sent; new medicines start as Tablet.                                   |
| `medicine_group`                       | Select: Antibiotic, Painkiller, Mouthwash, Antifungal, Other                                                                                                        | No       | Stored (search, sort). Always sent; new medicines start as Antibiotic.        |
| `default_dose`, `default_instructions` | Data                                                                                                                                                                | No       | The usual prescription, filled into a new row.                                |
| `default_frequency`                    | Select (or Data): Once a day, Twice a day, Three times a day, Four times a day, Every 4 hours, Every 6 hours, Every 8 hours, Every 12 hours, When needed, Once only | No       | `""` when not set. The values of `FREQUENCIES` in `src/lib/prescriptions.ts`. |
| `default_duration_days`                | Int                                                                                                                                                                 | No       |                                                                               |
| `allergy_words`                        | Data                                                                                                                                                                | No       | Comma-separated words.                                                        |
| `is_nsaid`, `avoid_in_pregnancy`       | Check                                                                                                                                                               | No       |                                                                               |
| `max_daily_mg`                         | Int                                                                                                                                                                 | No       | 0 means no check.                                                             |
| `child_note`                           | Small Text                                                                                                                                                          | No       |                                                                               |
| `is_active`                            | Check, default 1                                                                                                                                                    | No       | Stored (filter).                                                              |

### Prescription and Prescription Medicine

Naming `RX-.YYYY.-.#####`. Details in section 1. Track Changes on (Activity).

**Permissions.** Read: `view_treatments`. Also read by `manage_users` (Activity). Create, update and delete:
`add_treatments`.

**Calls.** list of a patient's prescriptions (`patient =`, sorted `prescription_date desc, name desc`), of an
appointment's (`appointment =`, same sort, 20 rows), get (with the `medicines` rows), create, update, delete.

| Field               | Type                          | Required              | Notes                                                                               |
| ------------------- | ----------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `patient`           | Link Patient                  | Yes                   | Stored (filter).                                                                    |
| `patient_name`      | Data, fetched                 | Server                |                                                                                     |
| `doctor`            | Link Doctor                   | Yes                   |                                                                                     |
| `doctor_name`       | Data, fetched                 | Server                |                                                                                     |
| `appointment`       | Link Appointment              | No                    | Stored (filter). `null` when written from the patient page.                         |
| `prescription_date` | Date                          | Yes                   | Stored (sort).                                                                      |
| `notes`             | Small Text                    | No                    | Printed under the medicines.                                                        |
| `medicines`         | Table (Prescription Medicine) | Yes, at least one row | Rows below.                                                                         |
| `summary`           | Data                          | Server                | Set in `validate()`; read in the lists (the list API does not return child tables). |

| Prescription Medicine field | Type                                                                     | Required | Notes                                                   |
| --------------------------- | ------------------------------------------------------------------------ | -------- | ------------------------------------------------------- |
| `medicine`                  | Link Dental Medicine                                                     | Yes      |                                                         |
| `medicine_name`             | Data                                                                     | Yes      | Sent by the front end (name and strength when written). |
| `dose`, `instructions`      | Data                                                                     | No       |                                                         |
| `frequency`                 | Select (or Data): the same values as `Dental Medicine.default_frequency` | No       | `""` when not chosen.                                   |
| `duration_days`             | Int                                                                      | No       | 0 when empty.                                           |

### Dental Image

Naming `IMG-.YYYY.-.#####`. Details in section 1 (**New doctype: Dental Image**). Track Changes on (Activity).

**Permissions.** Read: `view_patients`, and `view_treatments` (the treatment plan page shows the patient's images on
the chart), and `manage_users` (Activity). Every reader must also be able to open the private files. Create, update and delete: `edit_patients`.

**Calls.** list of a patient's images (`patient =`, sorted `taken_on desc, name asc`, all rows), get (the printable
image page), create (`patient`, `file_name`, `image_type`, `taken_on`, `teeth`, `description`), `upload_file`
attached to it (private), update (only `image` after the upload; only the details `image_type`, `taken_on`,
`teeth`, `description`; only `annotations`), delete (also when the upload failed).

| Field          | Type                                                                                                  | Required | Notes                                              |
| -------------- | ----------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------- |
| `patient`      | Link Patient                                                                                          | Yes      | Stored (filter).                                   |
| `patient_name` | Data                                                                                                  | Server   | `fetch_from: patient.full_name`.                   |
| `image_type`   | Select: Periapical, Bitewing, Panoramic (OPG), Cephalometric, CBCT screenshot, Intraoral photo, Other | Yes      |                                                    |
| `taken_on`     | Date                                                                                                  | Yes      | Stored (sort).                                     |
| `teeth`        | Data                                                                                                  | No       | FDI numbers joined with `,`, no spaces.            |
| `description`  | Small Text                                                                                            | No       |                                                    |
| `file_name`    | Data                                                                                                  | No       |                                                    |
| `image`        | Attach Image (or Attach, for PDFs)                                                                    | No       | Set after the upload. JPG, PNG or PDF up to 10 MB. |
| `annotations`  | JSON                                                                                                  | No       | The drawing; `null` removes it.                    |

### File (Frappe core)

Uploaded with `POST /api/method/upload_file` (multipart): `file`, `is_private=0` and `folder=Home` for the clinic
logo, doctor photos and the prescription paper's logo and signature; `file`, `is_private=1`, `doctype`, `docname`
and `folder=Home/Attachments` for the file of a Dental Image. The front end reads only `file_url` from the answer
and shows every file at `/frappe<file_url>`. It never lists or deletes File records itself (deleting a Dental Image
deletes its file).

### Version (Frappe core)

**Permissions.** Read: `manage_users` (the Activity page); and, through `getdoc`, whoever may read the record.

**Calls.**

- list (Activity page): `name`, `ref_doctype`, `docname`, `data`, `owner`, `creation`; filter `ref_doctype in
(Patient, Appointment, Treatment Plan, Payment, Expense, Prescription, Dental Image, Doctor)` (or one of them);
  sorted `creation desc`; 40 rows, then 40 more with Show More.
- `getdoc` (the History card of a patient, appointment, treatment plan or payment): `docinfo.versions` with `name`,
  `owner`, `creation` and `data`.

The Activity page's "added" list also reads the eight doctypes themselves: for each, `name`, `owner`, `creation` and
the fields that name the record (Patient and Doctor `full_name`; Appointment `patient_name`, `appointment_date`;
Treatment Plan `patient_name`, `treatment_type`, `tooth_number`; Payment `patient_name`, `payment_date`; Expense
`description`, `category`, `expense_date`; Prescription `patient_name`, `prescription_date`; Dental Image
`patient_name`, `image_type`), sorted `creation desc`, 40 rows, then 40 more. So `manage_users` must be able to read
all eight.

`data` is Frappe's JSON with `changed: [[field, old, new], …]`. **Turn on Track Changes for all eight doctypes
above**, or their changes never show on the Activity page.

### Deleted Document (Frappe core)

**Permissions.** Read and restore: `manage_users`. Restoring creates the record again, so check that a manager can
restore every doctype in the list (for example a Payment, without `add_payments`).

**Calls.** list (Activity page): `name`, `deleted_doctype`, `deleted_name`, `data`, `restored`, `new_name`, `owner`,
`creation`; filter `deleted_doctype in (…)` (the same eight doctypes); sorted `creation desc`. Restore:
`POST /api/method/frappe.core.doctype.deleted_document.deleted_document.restore` with `name` (section 3).

### Records that must exist

- **Role:** Clinic Manager, Clinic Doctor, Clinic Receptionist (the user forms offer these; `System Manager` is
  read as "can do everything").
- **Language:** `ar` and `en` (`User.language`).
- **Currency:** the ten codes above, if the currency fields are Links.
- **Clinic Treatment Price** and **Clinic Exchange Rate**: the child doctypes of Clinic Settings (section 1).

## 10. Three ways to install

The front end is built in one of three modes (`DEPLOYMENT_MODE`, see `AGENTS.md` and `src/lib/deployment.ts`):
**cloud** (online, one Frappe site per clinic), **clinic-server** (a small computer inside the clinic, no internet
needed) and **cloud-copy** (the online copy of a clinic server, view-only, for the owner at home). The same `dent_app`
serves all three; what each mode needs from the back end is listed below, item by item.

### Cloud: one site per clinic, found from the web address

- **One Frappe site per clinic** on the same bench, all with `dent_app`. The front end sends the requests of
  `<name>.CLOUD_DOMAIN` to `CLINIC_SITE_URL` with `{clinic}` replaced by the name (for example
  `https://alnoor.sites.dentclinic.example`). The proxy in front of the bench (nginx) must send each of those host names
  to its site; Frappe picks the site from the `Host` header, so the simplest setup names each site after its host.
- **The clinic's name** follows `isValidClinicAddress()` in `src/lib/deployment.ts`: 3-30 lowercase letters, digits and
  hyphens, starting with a letter; `www`, `admin`, `api`, `app` and `mail` are never clinics. Creating a clinic (Part 3,
  the platform owner) must check the same rule and that the name is free.
- **A name with no site** should get a clear 404 from the proxy, not a 502, so the app can say "no clinic here".
- **Cookies:** each clinic's session cookie belongs to its own host name (Frappe sets it for the host of the request);
  do not set a cookie domain shared by all clinics, or a login would leak from one clinic to another.
- **The main address** (`CLOUD_DOMAIN` and `www.`) shows the public website; its requests go to `PLATFORM_SITE_URL`,
  the platform's own Frappe site (a `dent_platform` app or a separate site with `dent_app`), which keeps the trial
  requests, the clinics and their subscriptions (Parts 2 and 3).
- **HTTPS** with a wildcard certificate for `*.CLOUD_DOMAIN` (Let's Encrypt DNS challenge), so every new clinic works at
  once.

### Clinic server: no internet needed

- **Nothing from other websites.** The front end loads no outside fonts, scripts or images (checked by
  `e2e/tests/clinic-server.spec.ts`). The back end must not need any either for normal work: Frappe's desk assets and
  any print format must use local files, and nothing may wait on an outside service when the clinic is offline.
- **`dent_app.api.server.status`** (GET or POST, any logged-in user; also the cloud's sites): returns
  `{ server_time: "2026-09-26 08:30:00", version: "1.0.0", internet: true, cloud_copy: null | { status, last_sync,
  error, address } }` (`ServerStatus` in `src/lib/server.ts`). The front end asks every 30 seconds (10 while the server
  cannot be reached), so keep it cheap: check the internet in a scheduled job (for example every minute, a HEAD request
  to a well-known address with a 3-second timeout) and return the stored answer. `cloud_copy` is the copy's state
  (see "Cloud copy" below); `null` when there is none.
- **WhatsApp needs the internet.** While `internet` is false, the front end disables every WhatsApp link and says why,
  and the reminders on the Today board stay unsent. When the server sends reminders itself (the scheduled job), it
  must keep unsent ones in the queue (WhatsApp Log `status = "Pending"`) and send them when the internet is back.
- **Date and time** come from the server's clock (`server_time`); a clinic server must keep its clock right without
  the internet (a real-time clock, or NTP when online).

### Cloud copy: the clinic server's data online, view-only

- **What it is:** a second site in the cloud (`DEPLOYMENT_MODE=cloud-copy` on its front end) that holds a copy of one
  clinic server's data, so the owner can look at it from home. The clinic server is the only place where data changes.
- **Bringing it up to date:** a scheduled job on the clinic server (for example every 15 minutes, and after a backup)
  sends the changes to the copy: simplest is a database backup (`bench backup`, with files) uploaded and restored on the
  copy site, or, for less traffic, the changed records since the last run. While the clinic has no internet it waits
  and tries again; the copy simply stays older.
- **Status:** both sites answer `dent_app.api.server.status` with `cloud_copy: { status: "ok" | "syncing" | "failed" |
  "never", last_sync: "2026-09-26 08:18:00", error: "…", address: "alnoor-copy.dentclinic.example" }`. On the copy,
  `last_sync` is when its data was last brought up to date; the front end shows it in the "View-only copy" banner and
  the top bar.
- **Everything is refused on the copy:** the front end hides every add, edit and delete and refuses to send one, but
  the copy's server must refuse them too (a `before_insert`, `on_update` and `on_trash` hook on every doctype, or the
  site's read-only mode, `maintenance_mode`/`allow_writes` off), except the session itself (login, logout).
- **Users** on the copy are the clinic's own (copied with the data); a password change is made at the clinic and
  arrives with the next update.

### The public website and free trials (the platform's site)

- **`dent_app.platform.request_trial`** on the platform's site, **allowed for Guest** (`allow_guest=True`), with a rate
  limit (Frappe's `@rate_limit`, for example 5 an hour per IP address) and a check that the phone has at least 10
  digits. Arguments (`TrialRequest` in `src/lib/platform.ts`): `clinic_name`*, `contact_name`*, `phone`*, `city`,
  `email`, `plan` (`cloud`, `server`, `server-cloud`), `address` (the web address wanted: `isValidClinicAddress()`;
  say in the answer if it is taken), `message`, `language` (`ar` or `en`). Saves a **Trial Request** (`TRQ-.#####`:
  those fields, `status` Select New / Contacted / Started / Declined) and tells the platform owner (email or WhatsApp).
  Returns the record's name.
- The website's prices are the published ones in `src/config/sales.ts`; a clinic's own plan, price and limits are
  kept by the platform (see Plans).

### The first-run setup wizard (every mode)

- **Clinic Settings** gets two fields: `setup_status` (Select: empty, `skipped`, `done`) and `setup_step` (Int, 0-6: how
  many of the wizard's steps are saved). A **new** clinic site starts with both empty, so its manager is sent to
  `/setup` on the first visit. **Existing sites must be patched to `setup_status = "done"`**, or their managers would be
  sent to the wizard after the update.
- The wizard saves with the usual `PUT` on Clinic Settings (only the fields of the step, plus `setup_step`, and
  `setup_status` at the end), creates Doctors and Users (with a Clinic Permission) as their own pages do. The manager
  needs the same rights as on Settings, Doctors and Users.

### Importing patients (every mode)

- The front end imports a spreadsheet one patient at a time with the usual `POST /api/resource/Patient` (the same
  fields as the patient form; empty dates `null`, `age` only without a date of birth), after checking every row and the
  clinic's mobile numbers itself (it reads every Patient's `name`, `full_name`, `phone_number`, `secondary_phone`).
  Up to 5,000 rows per file. That needs `add_patients`, and the server must keep its own checks (required fields, a
  phone already registered when the clinic wants that refused).
- **Later, for speed:** a whitelisted `dent_app.api.patients.import_rows(rows)` that takes up to 500 rows, inserts them
  in one transaction and answers which rows were skipped and why, so 5,000 patients take seconds, not minutes.

### Exporting all data (every mode)

- `/export` reads every Patient, Appointment, Treatment Plan and Payment with `GET /api/resource/<Doctype>`,
  `limit_page_length=0` and the fields in `src/lib/exportData.ts`, and builds the ZIP in the browser. Only the manager
  (`manage_users`) is offered it, but the server must allow those reads for that user (they need the read
  permissions in section 3 anyway).
- **Later, for big clinics:** a whitelisted `dent_app.api.export.all_data(format)` that builds the same ZIP on the server
  (in a background job, with a link when ready), so tens of thousands of rows do not travel as JSON first. Log every
  export (who, when) in the Activity, since the file holds medical data.

### Plans: the clinic's subscription (every mode)

- **`dent_app.api.subscription.status`** on every clinic site (any logged-in user; the screens need it for the limits
  and the notices): `Subscription` in `src/lib/subscription.ts`: `plan` (`cloud`, `server`, `server-cloud`), `status`
  (`trial`, `active`, `ended`, `suspended`), `trial_ends_on`, `paid_until` (the last paid day), `grace_days` (7),
  `limits` (`doctors`, `users`: null for no limit, `storageGb`), `usage` (`doctors`: active Doctors; `users`: enabled
  Users except Administrator and Guest; `storage_mb`: the size of the site's File records), `price`, `currency`,
  `period` (`month` or `year`) and `pending_request` (`{ plan, requested_on }` or null). Keep a **Clinic Subscription**
  single on each site that the platform writes (in the cloud) or that the licence fills in (a clinic server, see
  License), and work out `usage` when asked (cache it for a minute).
- **`dent_app.api.subscription.request_change`** (`plan`, `note`; `manage_users`): records the request on the platform
  (a Plan Change Request: clinic, from plan, plan, note, date) and tells the platform owner.
- The published plans and prices are in `src/config/sales.ts`; a clinic's own `limits` and `price` may differ (a
  discount, a bigger limit) and are the ones that count.

### Plan limits and an ended plan (every mode)

- **The server must refuse what goes over the limits**, whatever the screens do: a new active Doctor (or one switched
  back on) beyond `limits.doctors`, a new enabled User beyond `limits.users`, and a File upload that takes
  `usage.storage_mb` beyond `limits.storageGb × 1024` ("Your plan has room for … "). The front end checks first and
  explains, with a Request an Upgrade button.
- **An ended plan:** from `paid_until` (or `trial_ends_on`) + 1 day the status is `ended`; for `grace_days` (7) after
  that everything still works and every user sees when it becomes view-only; after them the site refuses every
  insert, update and delete (the same hook as the cloud copy, see above), but still allows reading, logging in,
  `request_change`, and the Plan page. `suspended` (set by the platform owner) is view-only at once. Nothing is ever
  deleted because a plan ended.

### The platform owner's area (the platform's site)

Every method below is on the platform's own site (`PLATFORM_SITE_URL`), whitelisted for the **Platform Owner** role
only (a new Role; a clinic's System Manager must not have it), and refuses everyone else. The shapes are in
`src/lib/platform.ts`.

- **`dent_app.platform.clinics`**: every **Clinic Account** (`CLN-.#####`): `clinic_name`, `address` (the web address
  name, unique, `isValidClinicAddress()`), `plan`, `status` (`trial`, `active`, `ended`, `suspended`, worked out for
  today: a trial or paid time that is over is `ended`), `manager_email`, `created_on`, `trial_ends_on`, `paid_until`,
  `limits` (`doctors`, `users`, `storageGb`; the plan's unless changed for this clinic), `usage` (asked from each clinic
  site, or kept by a nightly job) and `last_payment_on`.
- **`dent_app.platform.create_clinic`** (`clinic_name`, `address`, `plan`, `manager_email`, optional `trial_request`):
  checks the address (rule and not taken), makes the bench site `<address>.CLOUD_DOMAIN` with `dent_app` installed
  (a background job: `bench new-site`, then `install-app`), its Clinic Subscription (trial of `TRIAL_DAYS` = 14 days)
  and the manager's User with the Clinic Manager role and full Clinic Permission, and emails them a link to set a
  password. Marks the Trial Request `Started`. Returns the Clinic Account.
- **`dent_app.platform.record_payment`** (`clinic`, `amount` > 0, `currency`, `method`: Zain Cash, FastPay, Qi Card,
  Bank Transfer or Cash, `paid_on`, `periods` 1-36, `reference`): saves a **Platform Payment** (`PPY-.#####`) and moves
  `paid_until` on by `periods` months (years on a yearly plan) from the last paid day, or from the day before
  `paid_on` when that has passed (`paidUntilAfter()` in `src/lib/platform.ts`, the same rule); a clinic on trial
  becomes `active`; a suspended one stays suspended. Writes the clinic site's Clinic Subscription. Returns the payment
  with its new `paid_until`.
- **`dent_app.platform.set_suspended`** (`clinic`, `suspended` 0 or 1): suspended is view-only at once (see Plan limits);
  reactivating gives back `active`, `trial` or `ended` by the dates.
- **`dent_app.platform.payments`** (optional `clinic`), newest first; **`trial_requests`** and **`change_requests`**,
  newest first.
- Log every one of these changes (who, when) and keep payments forever: they are the platform's accounts.

### Server and backups (every mode, mostly the clinic server)

- **Backups every night** at a set time (`schedule_time`, e.g. 02:00) with Frappe's own backup (`bench backup
  --with-files`), kept for `keep_days` (14) days on the clinic server's backup disk; a clinic server with a cloud copy
  also sends each one to the copy. Record each as a **Server Backup** (`BKP-…`): `created_at`, `kind` (`automatic` or
  `manual`), `status` (`running`, `done`, `failed`), `size_mb`, `in_cloud`, `file_name`, `by` (a manual one: the user's
  full name), `error` (in words, in the clinic's language).
- **`dent_app.api.backup.overview`** (`manage_users`): `BackupOverview` in `src/lib/server.ts`: `backups` (newest first),
  `schedule_time`, `keep_days`, and `disk` (`free_gb`, `total_gb` of the backup disk; null in the cloud).
- **`dent_app.api.backup.backup_now`** (`manage_users`; refused on the cloud copy and while one is running): starts a
  backup in a background job and answers its record with `status: "running"`. The page asks `overview` every 1.5 s
  until it is done.
- **`dent_app.api.backup.download`** (GET, `backup=<name>`, `manage_users`, also on the cloud copy): sends the backup as
  one file (a ZIP of the database dump and the files archives), with `Content-Disposition: attachment` and its size, and
  **streams** it (it can be gigabytes). "Save to USB" writes it where the manager chooses (Chrome and Edge open a Save
  window, so the USB drive can be picked), or into Downloads. Log every download in the Activity: the file holds every
  patient's data.
- **`dent_app.api.server.status`** (see above) also gives the Server card its clock and version, and the Cloud Copy card
  its status, last update, error and address.

### The licence of a clinic server (clinic server and its cloud copy)

- A clinic server runs on a **licence key** (`DCL-XXXX-XXXX-XXXX-XXXX`, `LICENSE_KEY_PATTERN` in `src/lib/license.ts`)
  that the platform makes for one computer: a signed token (for example Ed25519; the clinic server holds only the
  public key) of the clinic name, plan, limits, issue date, last valid day and the **server ID** (a fingerprint of that
  computer, e.g. from its machine ID and disk serial, shown as `SRV-XXXX-XXXX`). It is checked **on the server, with no
  internet**: the signature, the server ID, and the day (keep the latest date ever seen, so turning the clock back does
  not help). The 20-character key is a reference the platform can turn into the full token when the server is online;
  if keys must work fully offline, make them longer or offer a licence file as well.
- **`dent_app.api.license.status`** (any logged-in user on a clinic server or its copy): `LicenseStatus`: `key` with its
  middle hidden, `clinic_name`, `plan`, `issued_on`, `expires_on`, `status` (`valid`, `expired`, `invalid`: not this
  server's, or tampered with), `grace_days` (7), `server_id`.
- **`dent_app.api.license.activate`** (`key`; `manage_users`; **allowed while the app is view-only** because the licence
  ended, refused on the cloud copy): checks the key as above, saves it, and answers the new `LicenseStatus`; a wrong
  key or one for another computer is refused in words ("This license key is not right for this server…").
- The clinic server's **subscription** (`dent_app.api.subscription.status`) comes from its licence: `plan`, `limits`,
  `status` `active` or `ended`, `paid_until` = `expires_on`, `grace_days`. So the notices 14 days before, the grace
  days and view-only after work as in the cloud (see Plan limits and an ended plan), and the cloud copy shows the
  same. The screens send the manager to Settings → License to renew there.

### Offline viewing (every mode; no new methods)

- When the server cannot be reached, the front end shows the last copy of what it read (kept in the browser tab's
  memory and `sessionStorage`, cleared on logout) and changes nothing: it never queues writes to send later. The
  service worker keeps only the app's own files and page HTML, never `/frappe/…`.
- So the back end needs nothing new, but: keep `/api/…` answers out of shared caches (`Cache-Control: private,
  no-store`, Frappe's default for logged-in requests), and keep `frappe.auth.get_logged_user` and
  `dent_app.api.server.status` light, since they are asked again as soon as the connection is back.

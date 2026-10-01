# The app's own form controls, before and after

**Before:** commit 73737c7 (better Arabic typography). **After** (2026-10-01):

- **Dropdowns.** Every list (doctor, treatment type, payment method, gender, filters …) opens the app's own list
  instead of the browser's: the same font, rounded corners and shadow as the rest of the app, a soft hover, a check mark
  on the chosen item, the doctor's photo or initials before each doctor (and the patient's initials in the patient
  picker), and a search box when the list has more than 8 items. It works with the keyboard (arrows, Enter, Escape,
  typing a letter jumps to it), right to left in Arabic, in dark mode, and inside dialogs (it is never cut off at the
  dialog's edge; Escape closes only the list). On a phone it opens as a list from the bottom of the screen.
- **Date and time.** Our own calendar, with the Iraqi month names and Arabic day names in Arabic, today marked, Today
  and Clear buttons, and month and year views; and our own time picker (hour, minute, AM / PM). Both open from the
  bottom on a phone.
- **Checkboxes, radio buttons and sliders** are drawn in the clinic colour with a white check mark; the address box
  suggests the governorates in our own list; the theme colour is chosen from our own palette with a colour code box.
  File buttons were already the app's own buttons, and there are no number arrows anywhere.
- **"Please fill in this field"** is now our own red message under the field, in the screen's language, not the
  browser's bubble.
- **Font.** IBM Plex Sans in English and IBM Plex Sans Arabic for everything in Arabic (headings too, instead of El
  Messiri), so both languages look like one family.
- **Medical values** that say "nothing" ("None", "no", "-" …) show as "لا يوجد" in Arabic and "None" in English; empty
  ones show a dash.

The browser's own lists and calendars cannot be photographed, so the "before" pictures show the closed fields, and the
"after" pictures show our lists open. The address suggestions and the colour palette are new screens with "after"
pictures only. The pictures use the dummy data on 26 September 2026. To retake the "after" pictures, run
`npm run build`, then `SKIP_BUILD=1 npx playwright test --project=design-changes controls`. To retake the "before"
pictures: check out 73737c7 in a separate folder with its own `npm ci` (never a node_modules link: deleting the copy
would delete the real packages), copy `e2e/design-changes/controls.spec.ts` into it, run `npm run build` there, then
`SHOTS=before SKIP_BUILD=1 npx playwright test --project=design-changes controls`, and copy `before/` back here.

## Desktop (1440 × 900)

| Screen | Before | After |
|---|---|---|
| New treatment plan: doctor list | ![](before/desktop/new-treatment.png) | ![](after/desktop/new-treatment.png) |
| New appointment: calendar | ![](before/desktop/new-appointment.png) | ![](after/desktop/new-appointment.png) |
| New appointment: time | ![](before/desktop/new-appointment-time.png) | ![](after/desktop/new-appointment-time.png) |
| New payment: method | ![](before/desktop/new-payment.png) | ![](after/desktop/new-payment.png) |
| Add patient: gender | ![](before/desktop/add-patient.png) | ![](after/desktop/add-patient.png) |
| Add patient: address suggestions | | ![](after/desktop/address-suggestions.png) |
| Expense: category | ![](before/desktop/expense.png) | ![](after/desktop/expense.png) |
| Patients: balance filter | ![](before/desktop/patients-filters.png) | ![](after/desktop/patients-filters.png) |
| Settings: working hours | ![](before/desktop/settings-hours.png) | ![](after/desktop/settings-hours.png) |
| Settings: theme colour | | ![](after/desktop/settings-colour.png) |
| Permissions (checkboxes) | ![](before/desktop/permissions.png) | ![](after/desktop/permissions.png) |
| Print patient file (checkboxes) | ![](before/desktop/patient-file.png) | ![](after/desktop/patient-file.png) |
| Patient page (medical values, font) | ![](before/desktop/patient.png) | ![](after/desktop/patient.png) |

## Desktop in Arabic

| Screen | Before | After |
|---|---|---|
| New treatment plan: doctor list | ![](before/desktop-ar/new-treatment.png) | ![](after/desktop-ar/new-treatment.png) |
| New appointment: calendar | ![](before/desktop-ar/new-appointment.png) | ![](after/desktop-ar/new-appointment.png) |
| New appointment: time | ![](before/desktop-ar/new-appointment-time.png) | ![](after/desktop-ar/new-appointment-time.png) |
| New payment: method | ![](before/desktop-ar/new-payment.png) | ![](after/desktop-ar/new-payment.png) |
| Add patient: address suggestions | | ![](after/desktop-ar/address-suggestions.png) |
| Settings: theme colour | | ![](after/desktop-ar/settings-colour.png) |
| Permissions (checkboxes) | ![](before/desktop-ar/permissions.png) | ![](after/desktop-ar/permissions.png) |
| Patient page (لا يوجد, font) | ![](before/desktop-ar/patient.png) | ![](after/desktop-ar/patient.png) |

## Desktop in dark mode

| Screen | Before | After |
|---|---|---|
| New treatment plan: doctor list | ![](before/desktop-dark/new-treatment.png) | ![](after/desktop-dark/new-treatment.png) |
| New appointment: calendar | ![](before/desktop-dark/new-appointment.png) | ![](after/desktop-dark/new-appointment.png) |
| New appointment: time | ![](before/desktop-dark/new-appointment-time.png) | ![](after/desktop-dark/new-appointment-time.png) |
| Settings: theme colour | | ![](after/desktop-dark/settings-colour.png) |
| Permissions (checkboxes) | ![](before/desktop-dark/permissions.png) | ![](after/desktop-dark/permissions.png) |

## Phone (390 × 844)

| Screen | Before | After |
|---|---|---|
| New treatment plan: doctor list | ![](before/phone/new-treatment.png) | ![](after/phone/new-treatment.png) |
| New appointment: calendar | ![](before/phone/new-appointment.png) | ![](after/phone/new-appointment.png) |
| New appointment: time | ![](before/phone/new-appointment-time.png) | ![](after/phone/new-appointment-time.png) |
| New payment: method | ![](before/phone/new-payment.png) | ![](after/phone/new-payment.png) |
| New payment: method (Arabic) | ![](before/phone-ar/new-payment.png) | ![](after/phone-ar/new-payment.png) |
| New appointment: calendar (Arabic) | ![](before/phone-ar/new-appointment.png) | ![](after/phone-ar/new-appointment.png) |

All pictures for every screen are in the `before/` and `after/` folders (desktop, desktop-ar, desktop-dark, phone,
phone-ar).

# Dialogs and wide pages, before and after

**Before:** the clean look (commit c7a27bc). **After** (2026-09-30):

- **Forms in dialogs.** New and edit forms for appointments, treatment plans and payments open in a dialog over the page
  they are opened from. The appointment dialog is wide, so the doctor's day and the free times fit. **Add Patient**
  slides in from the end side: from the right in English, from the left in Arabic. A dialog opens with what the page
  already knows filled in: the patient, the plan, the tooth, or the time clicked in the calendar. After saving, the page
  stays and loads again, and a message offers **Open** for the new record. Closing with unsaved changes asks first,
  Escape closes, and on a phone the dialog fills the screen. The old pages (`/treatments/new` and the others) still work.
- **Wide record pages.** Manage User, My Profile, Settings, the patient, doctor, appointment, treatment plan and
  payment pages use the whole width: a profile card on the start side (initials or logo, name, contact, role or
  status, main actions, key numbers, details) and the details or tabs beside it. They stack on tablets and phones.
  Settings is in tabs, and each doctor has a page of their own.
- **The permissions table.** One row per section and one column each for View, Add, Edit and Delete. Each cell has
  a checkbox, or is empty when a section has no such action. There is a select-all box for every row and column, and
  the role presets sit above the table.

The pictures use the dummy data on 26 September 2026. They are screen size only, not the full page. To retake the
"after" pictures, run `npm run build`, then `SKIP_BUILD=1 npx playwright test --project=design-changes wide-pages`.
Set `SHOTS=before` on the older commit to retake the "before" pictures.

## Desktop (1440 × 900)

| Screen | Before | After |
|---|---|---|
| Manage User | ![](before/desktop/user.png) | ![](after/desktop/user.png) |
| My Profile | ![](before/desktop/profile.png) | ![](after/desktop/profile.png) |
| Settings | ![](before/desktop/settings.png) | ![](after/desktop/settings.png) |
| Patient | ![](before/desktop/patient.png) | ![](after/desktop/patient.png) |
| Appointment | ![](before/desktop/appointment.png) | ![](after/desktop/appointment.png) |
| Treatment plan | ![](before/desktop/treatment.png) | ![](after/desktop/treatment.png) |
| Payment | ![](before/desktop/payment.png) | ![](after/desktop/payment.png) |
| Doctors | ![](before/desktop/doctor.png) | ![](after/desktop/doctor.png) |
| Doctor page (new) | | ![](after/desktop/doctor-page.png) |
| New treatment plan | ![](before/desktop/new-treatment.png) | ![](after/desktop/new-treatment.png) |
| New payment | ![](before/desktop/new-payment.png) | ![](after/desktop/new-payment.png) |
| New appointment | ![](before/desktop/new-appointment.png) | ![](after/desktop/new-appointment.png) |
| Add Patient | ![](before/desktop/add-patient.png) | ![](after/desktop/add-patient.png) |

## Desktop in Arabic

| Screen | Before | After |
|---|---|---|
| Manage User | ![](before/desktop-ar/user.png) | ![](after/desktop-ar/user.png) |
| Settings | ![](before/desktop-ar/settings.png) | ![](after/desktop-ar/settings.png) |
| Patient | ![](before/desktop-ar/patient.png) | ![](after/desktop-ar/patient.png) |
| Treatment plan | ![](before/desktop-ar/treatment.png) | ![](after/desktop-ar/treatment.png) |
| Doctor page (new) | | ![](after/desktop-ar/doctor-page.png) |
| New appointment | ![](before/desktop-ar/new-appointment.png) | ![](after/desktop-ar/new-appointment.png) |
| Add Patient | ![](before/desktop-ar/add-patient.png) | ![](after/desktop-ar/add-patient.png) |

## Desktop in dark mode (after only)

| Screen | After |
|---|---|
| Manage User | ![](after/desktop-dark/user.png) |
| Patient | ![](after/desktop-dark/patient.png) |
| New appointment | ![](after/desktop-dark/new-appointment.png) |
| Add Patient | ![](after/desktop-dark/add-patient.png) |

## Tablet (1024 × 768)

| Screen | Before | After |
|---|---|---|
| Manage User | ![](before/tablet/user.png) | ![](after/tablet/user.png) |
| Patient | ![](before/tablet/patient.png) | ![](after/tablet/patient.png) |
| New payment | ![](before/tablet/new-payment.png) | ![](after/tablet/new-payment.png) |

## Phone (390 × 844)

| Screen | Before | After |
|---|---|---|
| Manage User | ![](before/phone/user.png) | ![](after/phone/user.png) |
| Patient | ![](before/phone/patient.png) | ![](after/phone/patient.png) |
| New treatment plan | ![](before/phone/new-treatment.png) | ![](after/phone/new-treatment.png) |
| Add Patient | ![](before/phone/add-patient.png) | ![](after/phone/add-patient.png) |

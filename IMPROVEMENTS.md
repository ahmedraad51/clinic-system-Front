# Improvements

This file is the to-do list and diary for improving DentClinic. It is written for the clinic owner.
Each finished item says what changed, when, and which commit holds it.

## Now

- Global search in the top bar (also Ctrl+K): find a patient by name, phone or ID from any page, plus
  quick actions (New Appointment, Add Patient).

## Backlog

1. Faster booking: "next free time" for the chosen doctor, show that doctor's day while booking, remember
   the last doctor used.
2. Doctors page: list, add and edit doctors (name, specialization, phone, email, active). Permission:
   manage_users.
3. Price list: a default price per treatment type (in Settings) that fills in the cost automatically, and
   a printable treatment estimate for the patient.
4. Printouts: patient statement (plans, payments, balance), appointment card, end-of-day cash report by
   payment method.
5. Phone and tablet polish: tables turn into cards on small screens, sticky Save buttons, larger inputs.
6. Quality: keyboard use, visible focus, colour contrast, loading skeletons, a warning before leaving a
   form with unsaved changes, clear error messages.
7. Arabic interface: only when the owner turns the "Arabic interface" setting to YES (currently NO).
8. Calendar: grey out the hours when a doctor does not work (Doctor start_time, end_time, working_days)
   and warn when booking outside them.
9. Calendar: move an appointment to another time or doctor by dragging it, with the same double-booking
   check.
10. Dental chart: print the chart and findings for the patient file, and show the chart (read only) on the
    treatment plan page for its tooth.
11. Show the medical alerts in the booking and treatment forms as soon as a patient is picked.

## Done

- 2026-09-26 - **Code checks pass.** Type check, lint and production build all pass with no warnings; the
  results are written in AGENTS.md. Also fixed a build warning about the project folder. Commit f7c0476.
- 2026-09-26 - **Automatic browser tests.** `npm run test:e2e` now clicks through the app like a person:
  adds a patient, books an appointment (and sees the "doctor is already booked" warning), creates a
  treatment plan and pays part of it (the balance goes down), checks a too-large payment is refused, and
  checks a receptionist cannot open Reports. `npm run screenshots` photographs every page at desktop,
  tablet and phone size. Commit 3151757.
- 2026-09-26 - **Dev button moved.** The small black "N" button that only shows while developing now sits
  in the bottom-right corner, so it no longer covers the user card in the menu. Commit 3425d52.
- 2026-09-26 - **Calm dental look.** The app now uses a calm teal instead of plain blue, set once and used
  everywhere. The clinic can pick its own colour in Settings (six ready-made choices or any colour, with a
  sample button); colours that are too light are darkened a little so text stays readable. A new, clean
  tooth logo. Text is a little larger and easier to read. Buttons, fields, tabs and menu items are at
  least 44 pixels tall, so they are easy to tap on a tablet. Empty lists show a small friendly drawing,
  and search boxes have a clear button. Commit c7896de.
- 2026-09-26 - **Appointment calendar.** The Appointments page now opens on a day calendar: one column per
  doctor, from opening to closing time, each appointment a coloured block as long as the visit,
  overlapping bookings side by side, and a red line for "now". A week view shows seven days. Click any
  empty time to book it with the date, time and doctor already filled in (the "doctor is already booked"
  warning still works). The old list is kept as the third view. The dashboard and the bell now open today
  in the calendar. Commit 9676ff0.
- 2026-09-26 - **Real dental chart.** The chart now draws every tooth by its shape (incisor, canine,
  premolar, molar), for adults (11-48) and children (51-85). Tap a tooth to mark caries or fillings on
  each of its five surfaces (M, O, D, B, L) and whole-tooth conditions: crown, root canal, implant,
  bridge, missing, to extract. Each tooth can have a note, shows its treatment plans, and has a "New
  treatment for this tooth" button that fills in the tooth number. A Findings list sums up the mouth.
  Charts saved the old way still open, with the old marks kept and labelled. Commit 9c2b91a.
- 2026-09-26 - **Patient page for the dentist.** A red "Medical alerts" band now spots allergies, blood
  thinners (like warfarin or aspirin), diabetes, heart and blood pressure problems, and pregnancy from
  what was typed in the medical fields. It also shows on the appointment and treatment plan pages, where
  treatment is decided. The patient page has one-tap Call and WhatsApp buttons, last visit, next
  appointment, balance to pay (with an Add payment link) and a timeline of visits, treatment sessions and
  payments. Commit 36e4840.
- 2026-09-26 - **Today board for the front desk.** A new "Today" page in the menu shows today's patients
  grouped by doctor, with big one-tap buttons for Confirm, Completed and No show (and Undo for mistakes).
  Patients more than 10 minutes late are highlighted, a red chip warns about serious medical alerts, and
  the amount each patient owes is shown with an Add Payment button. A Walk-in button books a patient for
  right now. The dashboard and the bell now open this board. Commit PENDING.

## Questions for the owner

- Your `npm run dev` on port 3000 restarted itself when I changed `next.config.ts` (item 1), and afterwards
  it stopped answering for more than 10 minutes while using a lot of processor time. I did not stop it
  (you asked me not to). If the app at http://localhost:3000 does not open, stop it with Ctrl+C and run
  `npm run dev` again. My tests use their own copy of the app on port 3100, so they are not affected.

- Which day does your clinic week start on? The week calendar starts on **Sunday** (the working week in
  most of the region). If you prefer Saturday or Monday, it is one setting (`WEEK_STARTS_ON` in
  `src/lib/format.ts`).

## Reverted

## New packages

- **@playwright/test** (free, by Microsoft, very widely used; only used for testing, not shipped to the
  clinic): runs the browser tests and takes the screenshots. Chromium only.

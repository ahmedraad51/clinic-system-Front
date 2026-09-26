# Improvements

This file is the to-do list and diary for improving DentClinic. It is written for the clinic owner.
Each finished item says what changed, when, and which commit holds it.

## Now

- Finish a visit: when an appointment is marked Completed, offer to write down what was done as a
  treatment session on the patient's open plan (or start a new plan), so the dentist's notes are not lost.

## Backlog

1. Recall list: patients not seen for six months with nothing booked, with one tap to call, send a
   WhatsApp or book, so check-ups are not forgotten.
2. Phone: the day calendar shows one doctor at a time with buttons for the next and previous doctor (five
   columns are too narrow on a phone).
3. Dental chart on a phone or narrow screen: scroll the chart so the chosen tooth is in view (on the plan
   page tooth 37 was off-screen).
4. Patient list: show a small medical-alert marker and the next appointment in each row.
5. Arabic interface: only when the owner turns the "Arabic interface" setting to YES (currently NO).

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
  right now. The dashboard and the bell now open this board. Commit feabde6.
- 2026-09-26 - **Search from anywhere.** A search box at the top of every page (or press Ctrl+K) finds a
  patient by name, phone number or patient ID as you type, and offers quick actions like New Appointment,
  Add Patient, Today and Record Payment. Works with the keyboard: arrows to move, Enter to open. Also
  fixed a small bug where the bell and profile menus did not close when you clicked elsewhere on the page.
  Commit 25cc51d.
- 2026-09-26 - **Faster booking.** When you choose a doctor and a date, the booking form now shows that
  doctor's appointments for the day and the free times that fit the visit length, starting with "Next
  free". Tap a time to fill it in. If a typed time overlaps another patient, it says so right away. The
  form also remembers the doctor you booked with last time. Commit 5a8c4e9.
- 2026-09-26 - **Doctors page.** Managers can now add and edit doctors (name, specialization, phone,
  email, working hours) from a new Doctors page in the menu. A doctor who leaves is switched off instead
  of deleted, so their old appointments keep their name. New doctors appear straight away in the booking
  form and the calendar. Commit bc25597.
- 2026-09-26 - **Phone and tablet polish.** On a phone, every list (patients, appointments, treatments,
  payments, reports and more) now shows each record as a small card with every value labelled, so nothing
  is cut off, such as the payment Amount before. The Save button of every form stays at the bottom of the
  screen while you scroll. Text in fields is larger on phones, and the payment date filters now fit the
  screen. Commit 0a244b4.
- 2026-09-26 - **Price list and treatment estimate.** Settings now has a Price List with the usual price
  of each treatment. When a new treatment plan is created, choosing the treatment type fills in its price
  (you can still change it; a price you typed is never overwritten). From a patient's Treatment Plans tab,
  "Print estimate" makes a clean printable estimate of all open plans on the clinic letterhead, with
  totals, a 30-day validity note and signature lines. Also: money columns in tables now line up under
  their headings. Commit fb8f064.
- 2026-09-26 - **Printouts.** Three new printable pages on the clinic letterhead: a patient statement with
  every treatment, every payment and the balance ("Print statement" on the patient's Payments tab); an
  appointment card to hand to the patient ("Print Card" on an appointment); and an end-of-day report with
  the payments of the day by method, the total and the cash that should be in the drawer, with lines to
  sign ("End-of-Day Report" on Payments and "Day Report" on Today). Commit d3f6651.
- 2026-09-26 - **Quality and comfort.** Leaving a form (or the dental chart) with unsaved changes now asks
  "Leave without saving?" first, and so does closing the browser tab. Small grey text and field hints are
  darker and easier to read. Keyboard users see a clear ring on the focused link, and the first Tab press
  offers "Skip to content". Lists show grey placeholder rows while they load instead of a bare
  "Loading..." line. Error messages were already short, plain sentences, so they were left as they are.
  Commit 2444278.
- 2026-09-26 - **Medical alerts while booking and planning.** As soon as a patient is picked in the
  booking form or the new treatment plan form, their medical alerts (allergies, blood thinners, diabetes,
  heart problems, pregnancy) appear right under the patient's name. Commit ca146ed.
- 2026-09-26 - **Doctors' working hours in the calendar.** Each doctor's hours (set on the Doctors page)
  show under their name in the day calendar, and the time they do not work is shaded with stripes. The
  booking form now offers free times only within that doctor's hours and warns when a chosen time is
  outside them. Commit a2f7d4e.
- 2026-09-26 - **Move appointments by dragging.** In the calendar, an appointment can now be dragged with
  the mouse or a finger to another time, another doctor or (in the week view) another day. A dashed box
  shows where it will land, and the app asks "Move this appointment?" before saving, with a warning if the
  new time overlaps another patient. A simple tap still opens the appointment. Commit 8648871.
- 2026-09-26 - **Dental chart on paper and on the treatment plan.** The chart has a Print button that
  makes a clean page for the patient file or a referral, with the clinic letterhead, the medical alerts,
  the chart and its findings. Each treatment plan page now shows the patient's chart (read only), opened
  at the plan's tooth, so the dentist sees the whole mouth while planning. Commit d4cbd25.
- 2026-09-26 - **Treatment plan payments fit on a tablet.** The Payments box on a treatment plan page is
  now a simple list, so the amount is no longer cut off on a tablet. Commit 6b62fb7.
- 2026-09-26 - **"My Day" for dentists.** When a dentist uses the app (their user email is the same as on
  the Doctors page), the dashboard, the Today board (now called "My Day") and the bell show their own
  patients, and the appointment calendar opens on their own column. A "My patients / Everyone" switch
  shows the whole clinic when needed. Commit PENDING.

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

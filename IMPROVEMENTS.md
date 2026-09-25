# Improvements

This file is the to-do list and diary for improving DentClinic. It is written for the clinic owner.
Each finished item says what changed, when, and which commit holds it.

## Now

3. Quick fix: move the Next.js dev button (the black "N") to the bottom-right so it does not cover the user
   card in the sidebar.

## Backlog

4. Dental look and feel: a calm clinical colour theme defined once and used everywhere, using the Clinic
   Settings theme colour; a clean tooth logo; one set of text sizes; friendly empty states with small
   drawings; buttons and inputs at least 44 px tall for touch.
5. Appointment calendar: a day view with one column per doctor from opening to closing time, blocks as long
   as the appointment, coloured by status, a "now" line; a week view; click an empty slot to book with the
   date, time and doctor filled in. Keep the list as a second view.
6. Real dental chart (odontogram): tooth drawings; healthy, caries, filling, crown, root canal, implant,
   missing, to extract, bridge; the five surfaces (M, O, D, B, L); adult and child teeth; a note per tooth;
   "New treatment for this tooth". Old charts must still load.
7. Patient page built for the dentist: a header with age, phone (tap to call, WhatsApp), medical alerts,
   last visit, next appointment and balance; a timeline of visits, treatments and payments.
8. Today board for the front desk: today's patients grouped by doctor, one-tap Confirmed / Completed /
   No Show, late patients highlighted, quick Add Payment.
9. Global search in the top bar (also Ctrl+K): find a patient by name, phone or ID from any page, plus quick
   actions (New Appointment, Add Patient).
10. Faster booking: "next free time" for the chosen doctor, show that doctor's day while booking, remember
    the last doctor used.
11. Doctors page: list, add and edit doctors (name, specialization, phone, email, active). Permission:
    manage_users.
12. Price list: a default price per treatment type (in Settings) that fills in the cost automatically, and a
    printable treatment estimate for the patient.
13. Printouts: patient statement (plans, payments, balance), appointment card, end-of-day cash report by
    payment method.
14. Phone and tablet polish: tables turn into cards on small screens, sticky Save buttons, larger inputs.
15. Quality: keyboard use, visible focus, colour contrast, loading skeletons, a warning before leaving a
    form with unsaved changes, clear error messages.
16. Arabic interface: only when the owner turns the "Arabic interface" setting to YES (currently NO).

## Done

- 2026-09-26 - **Code checks pass.** Type check, lint and production build all pass with no warnings; the
  results are written in AGENTS.md. Also fixed a build warning about the project folder. Commit f7c0476.
- 2026-09-26 - **Automatic browser tests.** `npm run test:e2e` now clicks through the app like a person:
  adds a patient, books an appointment (and sees the "doctor is already booked" warning), creates a
  treatment plan and pays part of it (the balance goes down), checks a too-large payment is refused, and
  checks a receptionist cannot open Reports. `npm run screenshots` photographs every page at desktop,
  tablet and phone size. Commit PENDING.

## Questions for the owner

- Your `npm run dev` on port 3000 restarted itself when I changed `next.config.ts` (item 1), and afterwards
  it stopped answering for more than 10 minutes while using a lot of processor time. I did not stop it
  (you asked me not to). If the app at http://localhost:3000 does not open, stop it with Ctrl+C and run
  `npm run dev` again. My tests use their own copy of the app on port 3100, so they are not affected.

## Reverted

## New packages

- **@playwright/test** (free, by Microsoft, very widely used; only used for testing, not shipped to the
  clinic): runs the browser tests and takes the screenshots. Chromium only.

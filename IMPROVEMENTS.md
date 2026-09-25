# Improvements

This file is the to-do list and diary for improving DentClinic. It is written for the clinic owner.
Each finished item says what changed, when, and which commit holds it.

## Now

1. Make the code checks pass (`npx tsc --noEmit`, `npm run lint`, `npm run build`) and write the real
   results into the "current state" table in AGENTS.md.

## Backlog

2. Safety net: automatic browser tests with Playwright (`npm run test:e2e`): add a patient; book an
   appointment (with the "doctor is already booked" warning); create a treatment plan and pay part of it
   (the balance must update); a receptionist cannot open Reports. Plus a script that takes screenshots of
   every page at desktop, tablet and phone size. Test output stays out of git.
3. Quick fix: move the Next.js dev button (the black "N") to the bottom-right so it does not cover the user
   card in the sidebar.
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

## Questions for the owner

## Reverted

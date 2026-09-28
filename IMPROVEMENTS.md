# Improvements

This file is the to-do list and diary for improving DentClinic. It is written for the clinic owner.
Each finished item says what changed, when, and which commit holds it.

## Now


## Backlog

1. Arabic interface: only when the owner turns the "Arabic interface" setting to YES (currently NO).

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
  shows the whole clinic when needed. Commit 8426828.
- 2026-09-26 - **Finish a visit.** When a visit is marked Completed (on the Today board or the appointment
  page), the app asks "What was done in this visit?". The dentist picks the patient's treatment plan,
  types a note, and can tick "This treatment is now finished"; it is saved as a session on the plan. If
  the patient has no open plan, it offers to start one. Also: on phones, messages now appear at the top so
  they never cover a Save button. Commit 2f780f8.
- 2026-09-26 - **Recall list.** A new "Recall" page shows patients who are due for a check-up: not seen
  for six months (or 3, 9, 12) and nothing booked. Each has one-tap Call, a WhatsApp button with a
  friendly reminder already written, and Book. Two example patients were added to the dummy data so the
  list is not empty. Commit a379754.
- 2026-09-26 - **Calendar on a phone.** On a phone the day calendar now shows one doctor at a time, full
  width, with arrows to go to the next or previous doctor. It opens on the first doctor who has patients
  that day. Commit 3400546.
- 2026-09-26 - **Dental chart follows the chosen tooth.** On a phone or narrow screen, the chart now
  slides sideways to show the tooth that is open (for example the tooth of a treatment plan). Commit
  5319cbc.
- 2026-09-26 - **Patient list with alerts and next visit.** Each patient in the list now shows small red
  or yellow markers for medical alerts (allergy, blood thinner, heart, diabetes, pregnancy) and the date
  and time of their next booked visit. Age and gender moved next to the patient ID, so the list fits a
  tablet without cutting off the balance. Commit 3ba0c5e.
- 2026-09-26 - **New README pictures.** The pictures in the README now show the new design, including the
  Today board, the calendar, the patient page and the dental chart. They can be retaken any time with one
  command (npm run screenshots:readme). Commit c3d8842.
- 2026-09-26 - **Close old appointments.** The Today board now lists past appointments that were never
  marked (still "Scheduled" or "Confirmed") under "Earlier, still open", with one-tap Completed, No show
  and Cancelled, so the records and reports stay right. Commit c745f73.
- 2026-09-26 - **WhatsApp by hand, and tidier buttons.** On an appointment, "Send Message" opens a short
  form: pick a WhatsApp template, the patient's name, date, time, doctor and clinic are filled in, the
  text can be changed, and WhatsApp opens with the message ready to send. The buttons at the top of the
  appointment, treatment plan and payment pages were tidied: Delete is now a small red bin icon, and
  "Print Card" and "Send Message" sit with the part of the page they belong to, so the top fits on one
  line. Commit ba95aab.
- 2026-09-26 - **Faster payments.** When a new payment is for a patient with only one treatment plan still
  to pay, that plan is chosen automatically. A "Pay full balance" button fills in the amount left in one
  tap. Commit 67626cd.
- 2026-09-26 - **No more double patients.** When adding a patient, the form checks as you type: if the
  phone number (written any way, with or without spaces or the country code) or the exact name is already
  registered, it shows that patient with a link to open them. Saving with the same phone number asks
  first. Commit ce54fcd.
- 2026-09-26 - **Quick medical checklist.** The patient form now starts the medical part with tick boxes
  for the usual questions: blood thinners, diabetes, heart disease, high blood pressure, pregnancy, and
  allergies to penicillin, latex or local anaesthetic. Ticking one writes it into the right field, so the
  medical alerts never miss it. Things already written (like "Warfarin 3mg") show as ticked. Commit
  0a6dc24.
- 2026-09-26 - **Tomorrow's reminders.** The Today board now lists tomorrow's patients with a "Send
  reminder" button. It opens WhatsApp with the day-before reminder already written (from your WhatsApp
  templates), and the row is then marked as done so nobody gets two. Commit caadb3c.
- 2026-09-26 - **Clinic working days.** Settings now has "Open on" day buttons (in the dummy data the
  clinic is closed on Fridays). Closed days are shaded and marked "Closed" in the calendar, and booking on
  a closed day shows a note and asks "Book anyway?". Also: the automatic tests now always run as if it
  were Saturday 26 September 2026, so they give the same result on any day. Commit 378b3bb.
- 2026-09-26 - **Reports for the manager.** Reports now also show the money each doctor brought in during
  the chosen period, and how appointments ended: completed, no-show, cancelled and not yet marked, with
  the no-show rate (shown in red when it is 15% or more). Commit 4d5b290.
- 2026-09-26 - **Dialogs work well with the keyboard.** When a question box opens (for example "Delete
  this patient?"), the keyboard focus now goes into it, starting on the safe choice (Cancel); Tab stays
  inside the box, Escape closes it, and the focus goes back to the button that opened it. The page behind
  no longer scrolls while it is open. Commit 90c7f2a.
- 2026-09-26 - **X-rays and photos.** Each patient now has an "X-rays & Photos" tab. Staff can take a
  photo straight from the tablet camera or add image and PDF files; they show as thumbnails and open full
  size. Files are kept private to the clinic. Commit eb780f1.
- 2026-09-26 - **Who owes money.** The patient list has a new "Owes money" filter that shows only patients
  with a balance, biggest first. Each has a "Remind" button that opens WhatsApp with a polite message
  about the amount left to pay. Commit aa8c50f.
- 2026-09-26 - **Receipt on WhatsApp.** A payment receipt now has a WhatsApp button that sends the patient
  a short thank-you with the amount, date, what it was for, the receipt number and how much is still left
  to pay. Commit 5a1e090.
- 2026-09-26 - **"Needs attention" on the dashboard.** The dashboard now starts with a short to-do list:
  past appointments still to close, tomorrow's reminders to send, patients due for a check-up, and
  patients who owe money. Each line opens the right page. Lines with nothing to do are hidden. Commit
  d7eda4e.
- 2026-09-26 - **Book the next visit from a treatment plan.** A treatment plan now has a "Book Visit"
  button. It opens the booking form with the patient, the plan's doctor and the reason (for example "Crown
  · tooth 36") already filled in. Commit 5829642.
- 2026-09-26 - **Lab work.** Crown, bridge, implant and whitening plans have a "Lab Work" card: which lab,
  when the work was sent, when it is due back, and one tap for "Received today". The Today board lists lab
  work that is late or due in the next two days, so a patient is not seated before their crown is back.
  Commit fb514c0.
- 2026-09-26 - **Age instead of a birth date.** Many patients do not know their exact date of birth. The
  patient form now has an "Only know the age?" link that swaps the date box for an Age box, so the
  receptionist can type "42" and move on. Commit 39844fc.
- 2026-09-26 - **WhatsApp works with Iraqi phone numbers** (from the pet store study, item 1). A number
  typed the local way, like 0770 123 4567, now opens WhatsApp as +964 770 123 4567 instead of a broken
  link. Searching a patient by phone finds them however the number was typed (0770…, +964…, 00964… or
  Arabic digits), and the "Already registered?" check does the same. Settings has a new Phone Country Code
  (964 for Iraq). Commit 1e11fab.
- 2026-09-26 - **Safer connection to the real server** (from the pet store study, item 2). This only
  matters once the app talks to the real Frappe server. When a login expires, the app now asks for the
  password again in a small window over the page, so nothing typed is lost, instead of saying "You do not
  have permission" on every screen. Login checks that the browser really kept the session. The login page
  has "Keep me logged in on this computer": switch it off on shared computers, and closing the browser logs
  you out. No request waits forever (15 seconds), errors are explained in plain words, and a list that got
  no answer is asked for again. **Please restart your `npm run dev`**: `next.config.ts` changed (the link to
  the server now waits up to 2 minutes instead of 30 seconds). Commit a5e69e1.
- 2026-09-26 - **Iraqi dinars and Arabic-keyboard digits** (from the pet store study, item 3). Amounts in
  IQD are now always shown without decimals, like "IQD 1,250,000". Every amount, price, age and phone box
  accepts digits typed on an Arabic keyboard (١٢٣) and turns them into 1 2 3 while you type, instead of
  silently losing them. Commit b75ed3d.
- 2026-09-26 - **Receipt slips for thermal printers** (from the pet store study, item 4). Under every
  payment receipt there is now a "Print Slip" button that prints a narrow receipt for a 58 or 80 mm
  receipt printer: the clinic, the receipt number, the patient, what was paid, how, what was left on that
  treatment right after the payment, and who printed it. "Slip Settings" sets this computer's paper width, margin and text size, with a test
  print. The A4 receipt is unchanged. Commit fffc53a.
- 2026-09-26 - **A failed load never looks like "nothing there"** (from the pet store study, item 6). When
  a list, the dashboard, the Today board, the recall list or the bell cannot load (for example when the
  internet is down), it now says so with a "Try Again" button, instead of showing "No patients yet",
  "Nobody is due" or zeros. A search that finds nothing has a "Clear Filters" button. Commit 2d2ec51.
- 2026-09-28 - **Cash count at the end of the day** (from the pet store study, item 11). The end-of-day
  report now has a "Cash in the drawer" box: type the opening float and the cash counted, and it shows
  Matched, Short by or Over by. When the cash is short or over a note is required. "Save Count" keeps the
  count for that day with who counted it and when, and "Recent cash counts" lets the manager look back at
  earlier days. Saved in a new Cash Count record (dummy data for now; the back end must add it, see
  docs/backend-todo.md). Commit 001915f.
- 2026-09-28 - **Small helpers** (from the pet store study, item 22). Report exports to Excel are now
  safe: a name starting with "=" can no longer run as a formula. The Profile page has "Screen Size on This
  Computer" (80 to 120 %), for a reception screen read from a distance. The WhatsApp message log hides the
  middle of phone numbers. The patient's Address box suggests the governorates of Iraq. Commit 043d899.
- 2026-09-28 - **Big uploads are not cut off.** X-rays, photos and the clinic logo now have 10 minutes to
  upload instead of 2, so a big scan on a slow connection gets through. A progress bar shows how far the
  upload is ("Uploading 2 of 3: panoramic.png, 45%"). If one of several files fails, the ones before it
  are kept and the message says which file was not added. **Please restart your `npm run dev`**:
  `next.config.ts` changed (the link to the server now waits up to 10 minutes). Commit f3ab182.
- 2026-09-28 - **Iraqi example data.** The dummy clinic is now Iraqi: patients and doctors with Iraqi
  names, addresses in Baghdad (Al-Mansour, Karrada, Zayouna, Al-Adhamiya...) and in Basra, Erbil, Najaf
  and Hilla, mobile numbers such as 0770 123 4567, and prices in Iraqi dinars (a filling 40,000, a root
  canal 150,000, a crown 200,000, an implant 1,000,000). The clinic currency is IQD, and the app shows IQD
  when no currency is set. The tests and the README pictures were updated to match. Commit 5a16064.
- 2026-09-28 - **Design: quick actions at the top of the dashboard** (design idea D1 from the pet store).
  New Appointment, Add Patient, New Treatment and Record Payment are now large tiles right under the
  greeting, each with a short hint, instead of small tiles at the bottom of the page. On phones, a long amount
  in a number card (such as "IQD 250,000") now moves to a second line instead of being cut off. Pictures before
  and after: docs/design-changes/d1-dashboard-*.png. Commit e07387e.
- 2026-09-28 - **Design: an icon in each card title on record pages** (design idea D3). On the patient,
  appointment and treatment plan pages, every card (Timeline, Contact, Medical Information, Details, Payments,
  Lab Work, Dental Chart, Sessions, X-rays and Photos and so on) now has a small icon before its title, so the
  right card is easy to find on a long page. The Dental Chart uses the DentClinic tooth. Pictures:
  docs/design-changes/d3-*.png. Commit 3f5e2d1.
- 2026-09-28 - **Design: record pages keep their shape while they load** (design idea D4). While a patient,
  appointment, treatment plan or payment opens, a grey outline of the page (title, summary, two cards) gently
  pulses, instead of a spinner on an empty page. The page no longer jumps when the record arrives. The pulse
  stops for people who switch off animations on their computer. Pictures: docs/design-changes/d4-*.png.
  Commit 43087ca.
- 2026-09-28 - **Design: calm motion** (design idea D5). A new page fades in with a tiny lift, buttons give a
  little while pressed, and the dashboard's clickable cards lift slightly under the mouse. It is short (about a
  fifth of a second) so it never slows anyone down, and it is switched off for people who ask their computer
  for less motion. Pictures: docs/design-changes/d5-hover-*.png (the hovered Patients card). Commit PENDING.

## Questions for the owner

- (Answered 2026-09-26) Your `npm run dev` broke after I changed `next.config.ts`, installed packages and ran
  tests at the same time. You deleted `.next` and restarted it. From now on I never start a second `next dev`,
  my tests use their own copy on port 3100, I never run `npm audit fix --force`, and whenever I change
  `next.config.ts` or the packages I will write "Please restart your dev server" in the Done entry.
- Which day does your clinic week start on? The week calendar starts on **Sunday** (the working week in
  most of the region). If you prefer Saturday or Monday, it is one setting (`WEEK_STARTS_ON` in
  `src/lib/format.ts`).

## Reverted

## New packages

- **@playwright/test** (free, by Microsoft, very widely used; only used for testing, not shipped to the
  clinic): runs the browser tests and takes the screenshots. Chromium only.

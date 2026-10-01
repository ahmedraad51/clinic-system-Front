# Improvements

This file is the to-do list and diary for improving DentClinic. It is written for the clinic owner.
Each finished item says what changed, when, and which commit holds it.

## Now

- **Waiting for the owner: choose a font.** The dashboard and a patient page in four fonts (IBM Plex Sans Arabic, which
  the app uses now, Cairo, Tajawal and Readex Pro), in Arabic and English, are in
  [docs/fonts](docs/fonts/README.md). Say which one, and it will be built into the app like the current one.
- No restart of the dev server is needed this time (no package or `next.config.ts` change); just reload the page
  once (Ctrl+F5) so it picks up the fonts.
- **Open choice:** the small hint labels that appear when the mouse rests on an icon button or a tooth are still the
  browser's own. Replacing them means a new tooltip component, which this round did not add (no new features).

## Backlog

1. Ideas for later: SMS or WhatsApp sending from the server, online booking by patients, and a report method on the
   back end for faster totals (see Known issues in AGENTS.md).

## Done

- 2026-10-01 - **Final check before the back end.** Every page and every dialog was opened as a receptionist, a
  dentist and a manager, in Arabic and English, in light and dark mode, on a computer, a tablet and a phone, and
  checked for anything broken, cut off, untranslated or drawn by the browser. Nothing was broken or untranslated. Fixed:
  on a tablet the dashboard's number cards were too narrow ("IQD 250,000" broke in the middle) and today's list cut
  patient names, so they now stack until the screen is wide; with one doctor, "My Day" uses the whole width; on an
  English screen an Arabic name or reason that did not fit lost its first words, so names in the waiting room screen,
  the dashboard, the patient picker and every dropdown now wrap onto a second line instead (a long medicine name too);
  the profit figures on Reports wrap on a phone; record numbers in the activity log stay on one line; green and red
  amounts, the bell's red number and the count in the chosen tab are darker, so they are easier to read; the profile
  picture and the menu's collapse button are big enough to tap on a tablet. Also part of this round (started earlier
  the same day): the fonts are now inside the app, so they load on every computer even without internet; the example
  data is written in Arabic, as the clinic would type it; Settings refuses to save with no open day ticked; and tabs
  that do not fit wrap onto a second line. `docs/backend-todo.md` was checked against the code: it lists every
  doctype, field, allowed value, permission and call the front end uses. The README pictures were taken again. All
  208 browser tests pass.
- 2026-10-01 - **The app's own form controls, and one font family.** No list, calendar or check box is drawn by the
  browser any more. Every dropdown opens the app's own list: the same font, rounded corners and shadow as the rest of
  DentClinic, a check mark on the chosen item, each doctor's photo or initials (and the patient's initials in the
  patient picker), and a search box when a list has more than 8 items. It works with the keyboard (arrows, Enter,
  Escape, typing a letter), in Arabic from right to left, in dark mode and inside dialogs (never cut off; Escape closes
  only the list). On a phone the lists, the calendar and the time picker open from the bottom of the screen; the patient
  picker and the address suggestions stay under the box, so the keyboard stays open. Dates are picked on our own calendar (Iraqi
  month names and Arabic day names in Arabic, today marked, Today and Clear), times on our own time picker; checkboxes,
  radio buttons and the X-ray sliders are drawn in the clinic colour; the address box suggests the governorates in our
  own list; the theme colour has our own palette with a colour code box. A required field left empty now shows our red
  message under it ("Fill in this field." / "املأ هذا الحقل.") instead of the browser's bubble. The font is now
  IBM Plex Sans in English and IBM Plex Sans Arabic for everything in Arabic (El Messiri is gone), so both languages
  look like one family. Medical values that only say "nothing" show as "لا يوجد" in Arabic and "None" in English, and
  empty ones as a dash. **The "1 Issue" badge:** on a freshly started dev server, the patient page (every tab and
  dialog, in both languages) shows no error. The badge most likely came from the dev server having been started
  before the QR code packages were installed (the top bar's scan button loads one of them), so restarting `npm run
  dev` should clear it; if it comes back, click the badge and send the message. Before-and-after pictures:
  [docs/design-changes/4-controls](docs/design-changes/4-controls/README.md). **What to check:** open a few forms (new
  appointment, new treatment plan, new payment, add patient) in both languages and on a phone.

- 2026-10-01 - **Better Arabic typography.** Arabic screens now read more comfortably: text is a step larger (16 px,
  small text 14 px) with taller lines, so the dots and marks above and below the letters have room; letter spacing is
  gone everywhere (it pulled joined Arabic letters apart); English names, IDs and doses inside Arabic text use the
  matching Latin letters of IBM Plex Sans Arabic instead of Poppins, so they no longer look bigger than the Arabic
  around them; mixed lines keep their order ("PAT-2026-00004 · 53 سنة" no longer shows the age split from its
  number, and a dose reads "500 mg", not "mg 500"); amounts never split from "د.ع" at the end of a line; and "…" is
  the proper ellipsis. On a 1280 px screen the patient's facts and the report figures no longer squeeze into narrow
  columns. English is unchanged, apart from the Reports figures going side by side from 1536 px. **What to check:**
  look through the patient page, the Today board and Reports in Arabic.

- 2026-10-01 - **DentClinic as an installable app (Phase 4, item 8).** DentClinic can now be installed like a program
  on a computer, tablet or phone: in Chrome or Edge with the install icon in the address bar or **Profile → Install
  DentClinic**, and on an iPhone or iPad with Share → Add to Home Screen. It opens in its own window with the tooth
  icon, starts on the dashboard, and its icon has shortcuts to Today, Appointments and Patients. Without a
  connection it shows a clear "You are offline" page (Arabic and English) with Try Again, instead of the browser's
  error; patient data is never stored on the device. It works with the production build over HTTPS. English and
  Arabic. **What to check:** install it on the reception computer and on a tablet.

- 2026-10-01 - **Activity log and restoring deleted records (Phase 4, item 7).** A new **Activity** page (menu:
  System, for managers) lists who added, changed and deleted which record (patients, appointments, treatment plans,
  payments, expenses, prescriptions, X-rays, doctors), newest first, with the changes spelled out ("Amount: IQD
  150,000 → IQD 100,000"). Each deleted record has **Restore**, which puts it back as it was, under its old number;
  it refuses politely when something it belongs to is gone (restore the patient first, then their appointment).
  Filters for what happened and the kind of record. English and Arabic. **What to check:** delete a test payment,
  then restore it from Activity.

- 2026-10-01 - **Each doctor's own prescription paper (Phase 4, item 6).** A doctor's page has a new **Prescription
  Paper** card. **Edit Paper** sets the paper size (A5 or A4); the qualifications printed under the doctor's name;
  a footer (hours, phone); an own logo; and a signature or stamp picture. If the doctor uses pads that already have
  a printed header, tick "already printed" and enter how many mm to leave at the top and bottom: then only the
  patient, the medicines and the signature are printed, in the space between. A preview shows the result while you
  type. Prescriptions then print on that doctor's paper. English and Arabic. **What to check:** measure a
  pre-printed pad with a ruler, enter it, and print a test prescription.

- 2026-10-01 - **Print the whole patient file (Phase 4, item 5).** **Print File** on the patient page prints
  everything about the patient on the clinic letterhead: details, medical information and alerts, the dental chart,
  treatment plans and sessions, appointments, prescriptions, payments with what is still to pay, and, if ticked, the
  X-rays and photos. Tick boxes above the page choose what goes on paper; staff only see the parts their
  permissions allow. English and Arabic. **What to check:** print a patient's file for a referral.

- 2026-10-01 - **QR codes (Phase 4, item 4).** Each patient has a printable **ID card** the size of a bank card
  (the **ID Card** button on the patient page) with the clinic's name, the patient's name and ID, and a QR code. The
  printed dental chart has the same code. The new **Scan** button in the top bar (beside the search) opens the
  camera; holding a card or printed chart in front of it opens that patient's file. Without a camera the patient ID
  can be typed. A phone's own camera app also opens the file from the code. English and Arabic.
  **Please restart the dev server** (`npm run dev`): two small packages were added (`qrcode-generator` to draw
  the codes and `jsqr` to read them). **What to check:** print a card, then scan it with the Scan button on a
  tablet or a laptop with a camera.

- 2026-10-01 - **The waiting room (Phase 4, item 3).** The Today board has two new steps for each patient:
  **Arrived** when they report at the desk (the card then says how long they have been waiting) and **In Chair** when
  the doctor calls them in, with **Undo step** for a wrong tap. The counts at the top now show who is still to come,
  waiting and in the chair; someone already waiting is no longer marked late. **Waiting Room Screen** opens a page
  for a TV in the waiting room: the clinic logo, a big clock, and who is in the chair, who is waiting and who comes
  next, each with only the first name and an initial ("Zahraa H.") and the doctor. It updates itself every 20
  seconds, and Full Screen hides the browser. English and Arabic. **What to check:** mark a patient Arrived and then
  In Chair on the Today board, and open the Waiting Room Screen on a second screen (with the real back end; in the
  demo a new tab starts from the demo data).

- 2026-10-01 - **Expenses and profit (Phase 4, item 2).** A new **Expenses** page under Finance keeps what the
  clinic spends: rent, salaries, dental supplies, lab bills, equipment, electricity and water, maintenance,
  marketing. Each expense has a date, an amount in dinars or dollars (a dollar one counts at its day's rate), what it
  was for, who was paid, how, and, if it belongs to one doctor (their lab work), that doctor. Search, filters, the
  total and a CSV export; add and change them in a dialog. **Reports** now opens with a **Profit** card that says it
  in plain words, for example: "From 1 Sep 2026 to 26 Sep 2026 the clinic took in IQD 250,000 and spent IQD 145,000,
  so it made a profit of IQD 105,000 (42% of what came in). That is 74% less than in the 26 days before …", plus the
  biggest cost, the doctor who brought in the most, and what patients still owe. Below it: expenses by category and
  profit per doctor (the shared costs count for the whole clinic). Two new permission switches, **View Expenses** and
  **Add Expenses** (a new row in the permissions table); only the manager has them at first. English and Arabic.
  **What to check:** add this month's rent on the Expenses page, then look at the Profit card on Reports.

- 2026-09-30 - **Forms in dialogs, wide pages and a permissions table.** New and edit forms for appointments,
  treatment plans and payments now open in a dialog over the page you are on, with what the page knows already
  filled in (the patient, the plan, the tooth, or the time clicked in the calendar); the appointment dialog is wide,
  so the doctor's day and the free times fit. **Add Patient** slides in from the side (from the right in English, the
  left in Arabic). After saving you stay on the page, it shows the change at once, and the message has an **Open**
  link to the new record. Closing with unsaved changes asks first, Escape closes, and on a phone the dialog fills the
  screen. The old form pages still work. The patient, doctor (new page), appointment, treatment plan, payment,
  Manage User, My Profile and Settings pages use the whole screen: a profile card on one side (photo or initials,
  name, contact, role, status, the main buttons and key numbers) and the details or tabs on the other; they stack on
  tablets and phones. Settings is in tabs. Permissions are a table: a row per section, View / Add / Edit / Delete
  columns, an empty cell where an action does not exist, and a select-all box for each row and column, with the role
  presets above. Pictures before and after, in English, Arabic and dark mode:
  [docs/design-changes/3-dialogs-wide](docs/design-changes/3-dialogs-wide/README.md). **What to check:** book from the
  calendar, add a patient, pay from a treatment plan, and change a user's permissions, in both languages.

- 2026-09-30 - **Arabic checked again in the new look; a full HD screen shows the day at once.** Arabic text,
  tables and forms now use IBM Plex Sans Arabic, and El Messiri is kept for headings. On a 1920 × 1080 screen at
  100 % the whole menu fits without scrolling, and the dashboard shows "Needs attention" and today's appointments
  side by side without scrolling, in English and in Arabic (a browser test checks both). Arabic chart notes say
  "د.ع" instead of "IQD".

- 2026-09-30 - **A clean, professional look, like the pet store app.** The owner found the "Midnight" design
  AI-made, so it is replaced everywhere by a calm admin look rebuilt in DentClinic's own code (no template files, no
  Vuetify): white cards with small rounded corners and soft shadows on a light grey page, a white menu with the
  chosen page in solid violet, a floating top bar with round icon buttons, violet buttons, outlined boxes with small
  labels above, plain tables, soft status chips, and the Poppins font (El Messiri in Arabic). The gradients, glows,
  the smiling tooth, the decorative drawings and the drawn people are gone: people are shown by their initials, or
  their photo. New, per computer, in the **Appearance** panel (the palette icon in the top bar): **dark mode** (or the
  computer's own setting), a **menu that collapses to icons** (also the small circle at the top of the menu), a
  bordered skin, a dark menu beside a light page, and a wide page. The theme and language each have a menu in the top
  bar. It all works in English and in Arabic, right to left. Before and after pictures, with dark mode:
  [docs/design-changes/2-clean](docs/design-changes/2-clean/README.md); the Arabic pictures and the README pictures are
  retaken. **What to check:** switch to dark mode and back, collapse the menu, and look at a few screens in Arabic.
  (No new packages; the fonts come through Next.js, so no restart of the dev server is needed.)

- 2026-09-30 - **Dinars and dollars (Phase 4, item 1).** Settings has a new **Currencies** card: a second currency
  (US dollars) and its exchange rates, each from a date on ("1 USD in IQD: 1,460 from 1 September"). A treatment
  plan can be priced in dollars, and a payment can be taken in either currency. A dollar payment on a dinar plan (or
  dinars on a dollar plan) uses the rate of the payment's day: the form shows "Rate on 26 Sep 2026: $1 = IQD 1,460"
  and "Counts as IQD 146,000 on this plan", the payment keeps that rate for good, and the receipt and the receipt
  slip print it. A payment can never go above what the plan has left, in either currency. Totals keep each currency
  on its own ("IQD 250,000 + $300") on the payments list, the day report, statements and estimates; the dashboard and
  Reports add everything up in dinars (dollar payments at their day's rate, and dollar balances at today's rate), and
  Reports also says what came in per currency. The drawer count stays in dinars: dollars taken in cash that day are
  shown apart. To try it: Ruqaya Adnan's implant is priced at $700, with $300 paid in dollars and IQD 148,000 in
  dinars. **What to check:** add today's dollar rate in Settings, take a dollar payment, and look at the receipt.

- 2026-09-30 - **A real X-ray section (Phase 3).** Each X-ray or photo now has a type (periapical, bitewing,
  panoramic, cephalometric, CBCT screenshot, intraoral photo, or other), the date it was taken, the teeth it shows and
  a description. Add many at once by dragging them in, choosing them, or taking a photo with the tablet camera (JPG,
  PNG or PDF). A full-screen viewer zooms, moves, turns, changes brightness and contrast, inverts, goes full screen
  and steps to the next image. Draw on an image with coloured pens, arrows, circles and text: the drawing is saved on
  its own and the original is never changed. Compare two images side by side (before and after), and print one on
  the letterhead with the patient's name and date. On the dental chart, teeth with X-rays show a small picture mark,
  tapping a tooth shows its X-rays, and the same drawing tools can sketch on the chart. The dummy patient Zahraa has
  five drawn X-rays and photos to try it on. DICOM files come later.
- 2026-09-30 - **The new look on every screen (Phase 2).** Every screen now carries the colour of its part of the
  clinic: an icon in a coloured tile next to its title, and the same colour on its cards, icons and charts. The
  appointment, treatment and payment lists show each patient's drawing. Reports has three real charts: revenue
  over time and appointments per day (per month for long periods), and the treatment plans started, by type. The
  pictures in the README are retaken, and [docs/design-changes](docs/design-changes/README.md) shows every main
  screen before and after, at desktop, tablet and phone size.
- 2026-09-30 - **Arabic version.** The app now opens in Arabic, right to left, in a clear Arabic font (IBM Plex
  Sans Arabic). An Arabic / English switch sits in the menu; each person's choice is kept on their account, and the
  computer remembers it too. Settings has a new **Language** card: the clinic's **default language**, and **Arabic
  digits** (٠-٩ instead of 0-9 on Arabic screens). Every screen, message, error, empty list, printout, receipt and
  receipt slip is translated, in the dental words Iraqi dentists use (حشوة، علاج عصب، تاج، جسر، قلع، زرعة، تنظيف،
  تبييض); FDI tooth numbers stay numbers, and the dental chart keeps the patient's right on the left. Dates use the
  Iraqi month names (كانون الثاني، شباط … أيلول), times ص/م, and amounts "250,000 د.ع". WhatsApp templates now have
  a language, and the dummy clinic has each one in Arabic and English; reminders use the one in the screen's
  language. Medical alerts also understand notes typed in Arabic (حساسية، وارفارين، سكري، حامل …). Names and notes
  stay in the language they were typed in. Pictures: [docs/arabic](docs/arabic/README.md). Every text now lives in
  translation files, so each new text is added in both languages. No new package; your dev server does not need a
  restart.
- 2026-09-30 - **Design "Midnight" (option B) chosen and applied.** The other two options and the switch on My
  Profile are removed. The app is now indigo with a dark menu, glowing icon tiles, white cards with coloured
  edges, gradient buttons and pill-shaped tabs, in the Manrope font. Settings → Theme colour starts with
  "Default colour" (indigo). On phones the dashboard lists leave out the small pictures, so patient names are not
  cut short. The rest of Phase 2 (every screen, real charts on Reports) comes after the Arabic version.
- 2026-09-30 - **Three design options to choose from** (commit 6dd4a1f). All three had:
  - a colour for each part of the clinic (patients, appointments, treatments, money, reports), used in the menu,
    the number cards, the icons and the charts;
  - icons in coloured rounded tiles;
  - friendly drawn avatars: a man, a woman (some with a headscarf), a boy or a girl, from the patient's gender
    and age; doctors wear a white coat, and a doctor's photo can be uploaded on the Doctors page instead;
  - a welcome banner with a smiling tooth, and three charts on the dashboard: revenue and visits per month for
    the last six months, and treatment plans by type;
  - short, calm animations (cards rise into place, chart bars grow). People who turned animations off on their
    computer see none.

  Also in this step: each option has its own font (A Plus Jakarta Sans, B Manrope, C Nunito, loaded by Next.js
  from Google Fonts, no new package), and Settings → Theme colour has a first choice, "Colour of the design";
  the dummy clinic uses it, so each option shows its own colour. In the dummy data Fatima Salman is now 9 years
  old, to show a child's avatar. No new package and no change to next.config.ts, so your dev server does not need
  a restart.
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
  for less motion. Pictures: docs/design-changes/d5-hover-*.png (the hovered Patients card). Commit 721505e.
- 2026-09-28 - **Design: form mistakes shown at the field** (design idea D6). When a form refuses a value (an
  age above 120, a payment of zero or more than the plan has left, a cost that is not a number), the box turns
  red, the reason appears right under it, and the page moves to it with the cursor inside. Before, the message
  was at the bottom of the form and was easy to miss on a phone. A field's label also takes the clinic colour
  while you type in it. Pictures: docs/design-changes/d6-*.png. Commit 38a18b8.
- 2026-09-28 - **The dentist chooses the next check-up** (pet store item 5). On the patient page, "Next
  check-up" shows the date and how often (for example every 3 months for gum care), with a Change button: every
  3, 6, 9 or 12 months, no recall, or the usual rule. The "What was done in this visit?" window asks the same
  question, counted from that visit, even when there is no treatment plan. The Recall list and the dashboard
  use the dentist's date first, and a new "Check-up due" column says when and why. Each completed visit moves
  the date on by the same interval. Works with the dummy data now; the back end needs three new Patient fields
  and one rule (docs/backend-todo.md). Commit f324604.
- 2026-09-28 - **Who changed what, and when** (pet store item 8). Payments, treatment plans and appointments
  have a History card at the bottom (press Show History), and patients have a History tab. It says who added
  the record and when, and each change after that: who, when, and what changed, for example "Amount: IQD
  150,000 → IQD 100,000". It reads Frappe's own change log, which the back end already keeps for these four
  record types; the back end only has to stop logging its own total updates as changes (docs/backend-todo.md).
  With the dummy data it records the changes you make in the app, as the user you are viewing it as. Commit
  ac17b47.
- 2026-09-28 - **Prescriptions with safety warnings** (pet store item 9). A "Write Prescription" button on the
  appointment page (and a Prescriptions tab on the patient page) opens a short form: pick a medicine from the
  clinic's list and its usual dose, how often, for how many days and the instructions are filled in, ready to
  change. Before saving, a "Check before signing" box warns when the patient's record says they are allergic to
  that medicine, when a painkiller of the NSAID kind is given to a patient on a blood thinner, when a medicine
  should be avoided in pregnancy, when the patient is a child (with the medicine's own note on children's
  doses), when the dose is above the usual daily maximum, and when a medicine is listed twice. The warnings never
  stop the prescription; the dentist decides. The saved prescription prints on the clinic letterhead with a
  signature line. A new Medicines page (managers) keeps the list: 10 usual dental medicines are included as a
  start, and **a dentist must check every line before real use**. Two new record types for the back end
  (docs/backend-todo.md). Commit 4206b50.
- 2026-09-30 - **Final check before the back end.** I opened every page as a receptionist, a dentist and a
  manager, on a computer, a tablet and a phone (333 screens). Every person saw only the buttons they are allowed
  to use, and no page had errors. Fixed what looked wrong: on a phone, the treatment plan's cost, paid and
  remaining amounts ran into each other (now one per line); on the Today board, tomorrow's reminders, lab work
  and the "Earlier, still open" list squeezed the patient's name into a narrow column; printouts squeezed the
  clinic address on a phone; the Screen Size buttons on My Profile were a little too wide for a phone. On a
  tablet, the patient's contact card let "Secondary Phone" run into the number, the Medicines list cut off its
  Edit buttons (the group now shows under the medicine's name), and the four big dashboard buttons were too
  narrow (now two by two until the screen is wide). A prescription now shows its visit as a date and time, not
  a code. Back links, "View all", "Only know the age?", "Pay full balance", the colour picker and the call link
  on the recall list are now easy to tap on a tablet. The list of what the back end must have
  (docs/backend-todo.md) now ends with every record type and field the app uses, with its type and whether it
  is required. README pictures retaken. In the commit "fix: final check before the back end".

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

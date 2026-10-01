/** The English texts, one file per area. The Arabic files (../ar) must have the same keys: Messages is their type. */
import { common } from "./common";
import { nav } from "./nav";
import { enums } from "./enums";
import { errors } from "./errors";
import { dates } from "./dates";
import { ui } from "./ui";
import { dashboard } from "./dashboard";
import { patients } from "./patients";
import { patientForm } from "./patientForm";
import { medical } from "./medical";
import { recall } from "./recall";
import { files } from "./files";
import { appointments } from "./appointments";
import { calendar } from "./calendar";
import { appointmentForm } from "./appointmentForm";
import { finishVisit } from "./finishVisit";
import { notifications } from "./notifications";
import { today } from "./today";
import { waitingRoom } from "./waitingRoom";
import { qr } from "./qr";
import { patientFile } from "./patientFile";
import { rxPaper } from "./rxPaper";
import { activity } from "./activity";
import { install } from "./install";
import { whatsapp } from "./whatsapp";
import { sendWhatsapp } from "./sendWhatsapp";
import { treatments } from "./treatments";
import { treatmentForm } from "./treatmentForm";
import { lab } from "./lab";
import { chart } from "./chart";
import { estimate } from "./estimate";
import { payments } from "./payments";
import { expenses } from "./expenses";
import { paymentForm } from "./paymentForm";
import { cash } from "./cash";
import { receipt } from "./receipt";
import { statement } from "./statement";
import { reports } from "./reports";
import { prescriptions } from "./prescriptions";
import { medicines } from "./medicines";
import { doctors } from "./doctors";
import { users } from "./users";
import { settings } from "./settings";
import { profile } from "./profile";
import { login } from "./login";
import { session } from "./session";
import { history } from "./history";
import { xrays } from "./xrays";
import { money } from "./money";

export const en = {
  common,
  nav,
  enums,
  errors,
  dates,
  ui,
  dashboard,
  patients,
  patientForm,
  medical,
  recall,
  files,
  appointments,
  calendar,
  appointmentForm,
  finishVisit,
  notifications,
  today,
  waitingRoom,
  qr,
  patientFile,
  rxPaper,
  activity,
  install,
  whatsapp,
  sendWhatsapp,
  treatments,
  treatmentForm,
  lab,
  chart,
  estimate,
  payments,
  expenses,
  paymentForm,
  cash,
  receipt,
  statement,
  reports,
  prescriptions,
  medicines,
  doctors,
  users,
  settings,
  profile,
  login,
  session,
  history,
  xrays,
  money,
};

export type Messages = typeof en;

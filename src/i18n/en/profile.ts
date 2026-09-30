import { num } from "../runtime";

/** My Profile (/profile): my details, screen size, what I can do, change password, Try Another User. */
export const profile = {
  title: "My Profile",
  username: "Username",
  email: "Email",
  roles: "Roles",
  whatICanDo: "What I Can Do",
  superUser: "You are a System Manager, so every permission is on.",
  // Screen size (ScreenSizeCard)
  screenSizeTitle: "Screen Size on This Computer",
  screenSizeText:
    "Make text and buttons bigger on a screen read from a distance, or smaller on a small screen. Only this computer changes.",
  screenSize: "Screen size",
  /** "110%" */
  zoomLevel: (percent: number) => `${num(percent, { useGrouping: false })}%`,
  // Change password
  changePassword: "Change Password",
  currentPassword: "Current Password",
  newPassword: "New Password",
  newPasswordHint: (min: number) => `At least ${num(min)} characters.`,
  repeatPassword: "Repeat New Password",
  tooShort: (min: number) => `The new password must have at least ${num(min)} characters.`,
  notSame: "The two new passwords are not the same.",
  changed: "Password changed.",
  changedDemo: "Password changed (dummy data, nothing was really changed).",
  changeFailed: "Could not change the password.",
  // Try Another User (only while login is off)
  tryAnotherUser: "Try Another User",
  tryAnotherUserText:
    "Login is switched off while the app is being built. Pick a user to see the app with their permissions. This goes away when login is turned on.",
  viewAs: "View the app as",
  nowViewingAs: (name: string) => `Now viewing the app as ${name}`,
};

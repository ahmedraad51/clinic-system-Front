/**
 * Changing the language draws everything below LanguageProvider again, the top bar and its Appearance panel included.
 * The panel sets this before it changes the language, and the new top bar opens the panel again.
 */
let reopen = false;

export function reopenPanelAfterLanguageChange(): void {
  reopen = true;
}

/** True once after a language change made from the panel. */
export function takePanelReopen(): boolean {
  const value = reopen;
  reopen = false;
  return value;
}

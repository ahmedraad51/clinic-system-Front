/** A round icon button in the clinic colour, as on the rest of the top bar (search, theme, language, bell). */
export const TOP_ICON_BUTTON =
  "relative w-[2.375rem] h-[2.375rem] pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 rounded-full flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors";

/**
 * A menu under a top-bar button. On phones it spans the screen under the bar (a button near the start would push a
 * menu anchored to it off the screen).
 */
export const TOP_DROPDOWN =
  "absolute end-0 top-full mt-3 z-50 py-2 rounded-md bg-surface shadow-lg skin-bordered:border skin-bordered:border-gray-200 " +
  "max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.75rem] max-sm:mt-0 max-sm:w-auto";

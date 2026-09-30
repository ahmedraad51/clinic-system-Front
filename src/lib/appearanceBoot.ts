/**
 * The appearance boot script (src/lib/appearance.ts has the rest). Kept apart because the root layout, a Server
 * Component, puts it in <head>: it must not import React hooks.
 */
export const APPEARANCE_KEY = "appearance";

/** Sets the classes on <html> before React loads. */
export const APPEARANCE_BOOT_SCRIPT = `try{var a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"{}"),c=document.documentElement.classList,d=a.mode==="dark"||(a.mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)c.add("dark");if(a.collapsed===true)c.add("nav-collapsed");if(a.skin==="bordered")c.add("skin-bordered");if(a.semiDark===true)c.add("nav-semi-dark");if(a.width==="wide")c.add("content-wide")}catch(e){}`;

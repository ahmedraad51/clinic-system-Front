import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import "./fonts.css";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SessionProvider } from "@/context/SessionContext";
import { ToastProvider } from "@/context/ToastContext";
import MainLayout from "@/components/MainLayout";
import { TooltipLayer } from "@/components/ui/Tooltip";
import { ServiceWorkerRegister } from "@/components/InstallApp";
import { DEFAULT_LANG, dirOf, LANG_BOOT_SCRIPT } from "@/i18n/runtime";
import { ZOOM_BOOT_SCRIPT } from "@/lib/display";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearanceBoot";

// One family in both languages: IBM Plex Sans for English, IBM Plex Sans Arabic for all text on Arabic screens,
// headings included (its Latin letters are IBM Plex Sans, so English names inside Arabic text match). The files are
// in public/fonts/ and their rules in fonts.css (the --font-plex and --font-arabic variables globals.css uses), so
// the app never depends on reaching Google Fonts. The regular weight of each is fetched before the page is drawn.
const FONT_PRELOADS = [
  "/fonts/ibm-plex-sans-arabic/arabic-400.woff2",
  "/fonts/ibm-plex-sans-arabic/latin-400.woff2",
  "/fonts/ibm-plex-sans/latin.woff2",
];

export const metadata: Metadata = {
  title: "DentClinic",
  description: "Dental Clinic Management System",
  applicationName: "DentClinic",
  // The manifest (app/manifest.ts) is linked by Next.js itself. For iPhone and iPad: the home screen icon and title.
  appleWebApp: { capable: true, title: "DentClinic", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

/** The installed app's title bar in the clinic's default colour. */
export const viewport: Viewport = {
  themeColor: "#6a5fdd",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  for (const href of FONT_PRELOADS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    // The boot scripts may set the language, the clinic colour, this computer's screen size and its appearance
    // (dark mode, collapsed menu …) on <html> before React loads.
    <html lang={DEFAULT_LANG} dir={dirOf(DEFAULT_LANG)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT + THEME_BOOT_SCRIPT + ZOOM_BOOT_SCRIPT + APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SettingsProvider>
            <SessionProvider>
              <ToastProvider>
                <LanguageProvider>
                  <MainLayout>{children}</MainLayout>
                  {/* The hover and focus hints of every page (tooltip() in the UI kit), the waiting room and login too. */}
                  <TooltipLayer />
                  <ServiceWorkerRegister />
                </LanguageProvider>
              </ToastProvider>
            </SessionProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

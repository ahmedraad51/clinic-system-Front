import type { Metadata } from "next";
import { El_Messiri, IBM_Plex_Sans_Arabic, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SessionProvider } from "@/context/SessionContext";
import { ToastProvider } from "@/context/ToastContext";
import MainLayout from "@/components/MainLayout";
import { DEFAULT_LANG, dirOf, LANG_BOOT_SCRIPT } from "@/i18n/runtime";
import { ZOOM_BOOT_SCRIPT } from "@/lib/display";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearanceBoot";

// globals.css uses them through their variables: Poppins for English; IBM Plex Sans Arabic for Arabic text, tables and
// forms, and El Messiri for Arabic headings. Poppins has no fallback font of its own: on Arabic screens it comes first,
// and the letters it lacks must reach the Arabic font.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
  adjustFontFallback: false,
});
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
  adjustFontFallback: false,
});
const arabicHeadings = El_Messiri({
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-arabic-headings",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "DentClinic",
  description: "Dental Clinic Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The boot scripts may set the language, the clinic colour, this computer's screen size and its appearance
    // (dark mode, collapsed menu …) on <html> before React loads.
    <html lang={DEFAULT_LANG} dir={dirOf(DEFAULT_LANG)} className={`${poppins.variable} ${arabic.variable} ${arabicHeadings.variable}`} suppressHydrationWarning>
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
                </LanguageProvider>
              </ToastProvider>
            </SessionProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { El_Messiri, Poppins } from "next/font/google";
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

// globals.css uses them through their variables: Poppins for English, El Messiri for Arabic.
// No fallback font of its own: on Arabic screens Poppins comes first, and letters it lacks must reach El Messiri.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
  adjustFontFallback: false,
});
const arabic = El_Messiri({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-arabic" });

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
    <html lang={DEFAULT_LANG} dir={dirOf(DEFAULT_LANG)} className={`${poppins.variable} ${arabic.variable}`} suppressHydrationWarning>
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

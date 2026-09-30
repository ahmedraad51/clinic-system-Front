import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
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

// globals.css uses them through their variables: Manrope for English, IBM Plex Sans Arabic for Arabic.
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
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
    // The boot scripts may set the language, the clinic colour and this computer's screen size on <html> before
    // React loads.
    <html lang={DEFAULT_LANG} dir={dirOf(DEFAULT_LANG)} className={`${manrope.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT + THEME_BOOT_SCRIPT + ZOOM_BOOT_SCRIPT }} />
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

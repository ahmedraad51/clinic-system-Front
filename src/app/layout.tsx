import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SessionProvider } from "@/context/SessionContext";
import { ToastProvider } from "@/context/ToastContext";
import MainLayout from "@/components/MainLayout";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Dental Clinic",
  description: "Dental Clinic Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The boot script may set the clinic colour on <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${font.className} antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            <SessionProvider>
              <ToastProvider>
                <MainLayout>{children}</MainLayout>
              </ToastProvider>
            </SessionProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

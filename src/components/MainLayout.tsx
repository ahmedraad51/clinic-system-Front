"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { messages } from "@/i18n";
import { PageLoading } from "@/components/ui";
import { loginHref } from "@/lib/links";
import SessionEndedNotice from "./SessionEndedNotice";
import { RecordDialogsProvider } from "./RecordDialogs";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * The shell around every page, and the one place that sends logged-out visitors to /login.
 * It waits until the saved session has been read, so a page refresh does not bounce to /login.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, sessionEnded } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName } = useSettings();

  const isLoginPage = pathname === "/login";
  const mustLogin = !isLoading && !user && !isLoginPage;

  useEffect(() => {
    // Remember the page, so logging in comes back to it.
    if (mustLogin) router.replace(loginHref(window.location.pathname + window.location.search, sessionEnded));
  }, [mustLogin, sessionEnded, router]);

  if (isLoginPage) return <>{children}</>;
  if (isLoading || !user) return <PageLoading />;

  return (
    <RecordDialogsProvider>
    <div className="min-h-screen app-bg print:bg-white">
      {/* First thing a keyboard user reaches: jump past the menu. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-700 focus:shadow-lg"
      >
        {messages().nav.skipToContent}
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* Beside the menu: 260 px, or 70 px while it is collapsed to icons. */}
      <div className="lg:ps-[16.25rem] lg:nav-collapsed:ps-[4.375rem] transition-[padding] duration-200 flex flex-col min-h-screen print:ps-0">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 print:pt-0 focus:outline-none">
          {/* The login ended while this page was open: ask for the password again without leaving it. */}
          {sessionEnded && <SessionEndedNotice />}
          {/* Keyed by the path, so each new page fades in (only for people who have not asked for less motion). */}
          <div key={pathname} className="motion-safe:animate-page-in print:animate-none">
            {children}
          </div>
        </main>
        <footer className="px-4 sm:px-6 py-4 print:hidden">
          <p className="mx-auto max-w-[87rem] content-wide:max-w-none text-sm text-gray-500">
            {messages().nav.footer(new Date().getFullYear(), clinicName)}
          </p>
        </footer>
      </div>
    </div>
    </RecordDialogsProvider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { messages } from "@/i18n";
import { PageLoading } from "@/components/ui";
import { loginHref } from "@/lib/links";
import SessionEndedNotice from "./SessionEndedNotice";
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

  const isLoginPage = pathname === "/login";
  const mustLogin = !isLoading && !user && !isLoginPage;

  useEffect(() => {
    // Remember the page, so logging in comes back to it.
    if (mustLogin) router.replace(loginHref(window.location.pathname + window.location.search, sessionEnded));
  }, [mustLogin, sessionEnded, router]);

  if (isLoginPage) return <>{children}</>;
  if (isLoading || !user) return <PageLoading />;

  return (
    <div className="min-h-screen app-bg print:bg-white">
      {/* First thing a keyboard user reaches: jump past the menu. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-700 focus:shadow-lg"
      >
        {messages().nav.skipToContent}
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:ps-64 flex flex-col min-h-screen print:ps-0">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 pt-16 print:pt-0 focus:outline-none">
          {/* The login ended while this page was open: ask for the password again without leaving it. */}
          {sessionEnded && <SessionEndedNotice />}
          {/* Keyed by the path, so each new page fades in (only for people who have not asked for less motion). */}
          <div key={pathname} className="motion-safe:animate-page-in print:animate-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

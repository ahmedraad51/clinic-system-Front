"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageLoading } from "@/components/ui";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * The shell around every page, and the one place that sends logged-out visitors to /login.
 * It waits until the saved session has been read, so a page refresh does not bounce to /login.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoginPage = pathname === "/login";
  const mustLogin = !isLoading && !user && !isLoginPage;

  useEffect(() => {
    if (mustLogin) router.replace("/login");
  }, [mustLogin, router]);

  if (isLoginPage) return <>{children}</>;
  if (isLoading || !user) return <PageLoading />;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* First thing a keyboard user reaches: jump past the menu. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-700 focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:ps-64 flex flex-col min-h-screen print:ps-0">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 pt-16 print:pt-0 focus:outline-none">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Languages, LogOut, Menu, Monitor, Moon, Palette, Settings, Sun, User, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useI18n } from "@/context/LanguageContext";
import { LANG_NAMES, LANGS, label } from "@/i18n";
import { saveAppearance, useAppearance, type ThemeMode } from "@/lib/appearance";
import { cx } from "@/lib/format";
import { MyAvatar } from "./Avatar";
import AppearancePanel from "./AppearancePanel";
import GlobalSearch from "./GlobalSearch";
import ScanPatientButton from "./ScanPatient";
import NotificationBell from "./NotificationBell";
import { TOP_ICON_BUTTON, TOP_DROPDOWN } from "./topbarStyles";
import { takePanelReopen } from "./appearancePanelState";
import { tooltip } from "@/components/ui";


/** A dropdown under a top-bar button: the surface colour, 6 px corners and a deeper shadow. */
function Dropdown({
  label: name,
  icon: Icon,
  children,
  width = "w-44",
}: {
  label: string;
  icon: LucideIcon;
  children: (close: () => void) => ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // An Escape a hint already used leaves the menu open.
      if (event.key === "Escape" && !event.defaultPrevented) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    // Not closed when the focus leaves it: the unsaved-changes question takes the focus, and its "Leave" clicks the
    // language button in this menu again.
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={name}
        {...tooltip(name)}
        className={TOP_ICON_BUTTON}
      >
        <Icon size={22} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={cx(TOP_DROPDOWN, width)}>{children(() => setOpen(false))}</div>
        </>
      )}
    </div>
  );
}

const MENU_ITEM =
  "w-[calc(100%-1rem)] mx-2 flex items-center gap-2.5 min-h-[2.375rem] pointer-coarse:min-h-11 px-4 rounded-md text-sm text-gray-800 hover:bg-gray-100 text-start";

const MODE_ICONS: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

/**
 * The floating top bar: a white (surface) strip with 6 px corners and a soft shadow, a little below the top of the
 * page. Its blurred see-through background is a separate layer, so the search, bell and profile overlays inside it
 * still cover the whole screen (a blur on the bar itself would trap position: fixed inside it).
 */
export default function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { logout, authDisabled } = useAuth();
  const { can, displayName, roleLabel } = useSession();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  // Open again when the panel itself changed the language (which drew the top bar again).
  const [panelOpen, setPanelOpen] = useState(takePanelReopen);
  const { t, lang, setLang } = useI18n();
  const appearance = useAppearance();
  const ModeIcon = MODE_ICONS[appearance.mode];

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 pt-4 print:hidden">
      <div className="relative mx-auto max-w-[87rem] content-wide:max-w-none h-[3.375rem]">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-md bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-md shadow-sm skin-bordered:shadow-none skin-bordered:border skin-bordered:border-gray-200"
        />
        <div className="relative h-full flex items-center justify-between gap-2 px-2 sm:px-4">
          <div className="flex items-center gap-1 min-w-0">
            <button type="button" onClick={onOpenMenu} className={cx(TOP_ICON_BUTTON, "lg:hidden")} aria-label={t.nav.openMenu}>
              <Menu size={24} />
            </button>
            <GlobalSearch />
            {can("view_patients") && <ScanPatientButton />}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Dropdown label={t.nav.theme} icon={ModeIcon}>
              {(close) =>
                (["light", "dark", "system"] as const).map((mode) => {
                  const Icon = MODE_ICONS[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={appearance.mode === mode}
                      onClick={() => {
                        saveAppearance({ mode });
                        close();
                      }}
                      className={cx(MENU_ITEM, appearance.mode === mode && "bg-primary-50 text-primary-600")}
                    >
                      <Icon size={20} aria-hidden="true" />
                      {t.nav.themeModes[mode]}
                    </button>
                  );
                })
              }
            </Dropdown>

            {/* Language: each user's choice is kept on their account. */}
            <Dropdown label={t.nav.switchLanguage} icon={Languages}>
              {(close) => (
                <div role="group" aria-label={t.nav.language}>
                  {LANGS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      lang={option}
                      aria-pressed={lang === option}
                      // The page is drawn again in the other language: a form with unsaved changes asks first.
                      data-confirm-unsaved
                      onClick={() => {
                        close();
                        setLang(option);
                      }}
                      className={cx(MENU_ITEM, lang === option && "bg-primary-50 text-primary-600")}
                    >
                      <span className="flex-1">{LANG_NAMES[option]}</span>
                      {lang === option && <Check size={16} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>

            {can("view_appointments") && <NotificationBell />}

            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-label={t.nav.appearance.open}
              {...tooltip(t.nav.appearance.open)}
              className={TOP_ICON_BUTTON}
            >
              <Palette size={22} />
            </button>

            {/* Profile */}
            <div className="relative ms-1">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                className="relative flex items-center justify-center rounded-full pointer-coarse:w-11 pointer-coarse:h-11"
              >
                <MyAvatar size={38} />
                {/* Online: a small green dot on the picture. */}
                <span aria-hidden="true" className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-surface" />
                <span className="sr-only">{displayName}</span>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden="true" />
                  <div className={cx(TOP_DROPDOWN, "w-60")}>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <MyAvatar size={38} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{displayName}</span>
                        <span className="block text-xs text-gray-500 truncate">{label(t.enums.role, roleLabel)}</span>
                      </span>
                    </div>
                    <hr className="my-2 border-gray-200" />
                    <Link href="/profile" onClick={() => setProfileOpen(false)} className={MENU_ITEM}>
                      <User size={20} aria-hidden="true" />
                      {t.nav.profile}
                    </Link>
                    {can("manage_users") && (
                      <Link href="/settings" onClick={() => setProfileOpen(false)} className={MENU_ITEM}>
                        <Settings size={20} aria-hidden="true" />
                        {t.nav.settings}
                      </Link>
                    )}
                    {!authDisabled && (
                      <>
                        <hr className="my-2 border-gray-200" />
                        <button type="button" onClick={handleLogout} className={cx(MENU_ITEM, "text-red-600")}>
                          <LogOut size={20} aria-hidden="true" />
                          {t.nav.logout}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {panelOpen && <AppearancePanel onClose={() => setPanelOpen(false)} />}
    </header>
  );
}

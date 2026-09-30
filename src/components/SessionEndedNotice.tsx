"use client";

import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import { errorMessage, sessionEndedMessage } from "@/lib/frappe";

/**
 * Shown by MainLayout when the server ended the login while a page was open. The page stays mounted underneath,
 * so a half-filled form is not lost: log in again here, then press Save again. Closing the dialog leaves a banner
 * to open it later; "Log out" goes to the login page.
 */
export default function SessionEndedNotice() {
  const { user, relogin, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await relogin(password);
    } catch (err) {
      setError(errorMessage(err, t.session.failed));
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 print:hidden">
          <Alert tone="yellow">
            <div className="flex flex-wrap items-center gap-3">
              <span>{sessionEndedMessage()}</span>
              <Button size="sm" icon={LogIn} onClick={() => setOpen(true)}>
                {t.session.logInAgain}
              </Button>
            </div>
          </Alert>
        </div>
      )}
      <Modal open={open} title={t.session.logInAgain} onClose={() => setOpen(false)} priority>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {sessionEndedMessage()} {t.session.kept}
          </p>
          <p className="text-sm text-gray-800">
            {t.session.loggedInAs}{" "}
            <span className="font-medium" dir="ltr">
              {user}
            </span>
          </p>
          {/* For password managers, which fill in the password for this user. */}
          <input type="text" name="username" autoComplete="username" value={user ?? ""} readOnly hidden />
          <Field label={t.session.password}>
            <TextInput
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <Alert tone="red">{error}</Alert>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => logout()}>
              {t.session.logOut}
            </Button>
            <Button type="submit" icon={LogIn} loading={busy}>
              {t.session.logIn}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

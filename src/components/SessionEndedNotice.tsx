"use client";

import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, SESSION_ENDED_MESSAGE } from "@/lib/frappe";

/**
 * Shown by MainLayout when the server ended the login while a page was open. The page stays mounted underneath,
 * so a half-filled form is not lost: log in again here, then press Save again. Closing the dialog leaves a banner
 * to open it later; "Log out" goes to the login page.
 */
export default function SessionEndedNotice() {
  const { user, relogin, logout } = useAuth();
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
      setError(errorMessage(err, "Could not log in. Check the password and try again."));
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 print:hidden">
          <Alert tone="yellow">
            <div className="flex flex-wrap items-center gap-3">
              <span>{SESSION_ENDED_MESSAGE}</span>
              <Button size="sm" icon={LogIn} onClick={() => setOpen(true)}>
                Log in again
              </Button>
            </div>
          </Alert>
        </div>
      )}
      <Modal open={open} title="Log in again" onClose={() => setOpen(false)} priority>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {SESSION_ENDED_MESSAGE} What you typed on this page is kept; press Save again after logging in.
          </p>
          <p className="text-sm text-gray-800">
            Logged in as <span className="font-medium">{user}</span>
          </p>
          {/* For password managers, which fill in the password for this user. */}
          <input type="text" name="username" autoComplete="username" value={user ?? ""} readOnly hidden />
          <Field label="Password">
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
              Log out
            </Button>
            <Button type="submit" icon={LogIn} loading={busy}>
              Log In
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

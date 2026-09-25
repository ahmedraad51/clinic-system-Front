"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ToothLogo from "@/components/ToothLogo";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/frappe";

/**
 * Parked in a private folder (_login) while login is switched off, so /login is not a route.
 * To turn it on, see "Switching to the real back end" in AGENTS.md.
 */
export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Someone who is already logged in goes straight to the app.
  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(usr.trim(), pwd);
      router.push("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Invalid username or password."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="mx-auto w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white">
            <ToothLogo size={26} />
          </span>
          <h1 className="text-2xl font-bold text-gray-800 mt-4">DentClinic</h1>
          <p className="text-gray-500 text-sm mt-1">Log in to the clinic management system</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email or Username">
            <TextInput
              type="text"
              autoComplete="username"
              value={usr}
              onChange={(e) => setUsr(e.target.value)}
              placeholder="name@clinic.com"
              required
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
            />
          </Field>

          {error && <Alert tone="red">{error}</Alert>}

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

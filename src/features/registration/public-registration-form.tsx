"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api/api-error";
import { submitRegistration } from "./registration-service";

const fields = [
  ["school_name", "School name", true, 255],
  ["admin.first_name", "Administrator first name", true, 100],
  ["admin.last_name", "Administrator last name", true, 100],
  ["admin.email", "Administrator email", true, 255],
  ["email", "School email (optional)", false, 255],
  ["phone", "School phone (optional)", false, 30],
  ["physical_address", "Physical address (optional)", false, 255],
  ["postal_address", "Postal address (optional)", false, 255],
] as const;
export function PublicRegistrationForm() {
  const [busy, setBusy] = useState(false), [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Record<string, string[]>>({});
  if (submitted) return <div role="status" className="space-y-4"><h1 className="text-2xl font-bold">Request received</h1>
    <p>Registration requests are reviewed before accounts are created. An administrator invitation is sent only after approval.</p>
    <p className="text-sm text-muted-foreground">If your email already belongs to an account or a pending request, another request is not created.</p>
    <Link className="text-primary underline" href="/login">Return to sign in</Link></div>;
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null); setInvalid({});
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    try {
      await submitRegistration({ school_name: value("school_name"), operating_mode: value("operating_mode"),
        admin: { first_name: value("admin.first_name"), last_name: value("admin.last_name"), email: value("admin.email") },
        email: value("email"), phone: value("phone"), physical_address: value("physical_address"), postal_address: value("postal_address") });
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request could not be sent.");
      if (error instanceof ApiError) setInvalid(error.validationErrors);
    } finally { setBusy(false); }
  }}>
    <div><h1 className="text-2xl font-bold">Register your school</h1><p className="mt-2 text-sm text-muted-foreground">Submit your school details for platform-owner review. This does not create an account or start a subscription.</p></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {fields.map(([name, label, required, max]) => <div key={name} className="space-y-2"><label htmlFor={name} className="text-sm font-medium">{label}</label>
      <Input id={name} name={name} required={required} maxLength={max} disabled={busy} type={name.includes("email") ? "email" : "text"}
        aria-invalid={Boolean(invalid[name])} aria-describedby={invalid[name] ? `${name}-error` : undefined} />
      {invalid[name] ? <p id={`${name}-error`} className="text-sm text-destructive">Please review {label.toLowerCase()}.</p> : null}</div>)}
    <div className="space-y-2"><label htmlFor="operating_mode" className="text-sm font-medium">Operating mode</label>
      <select id="operating_mode" name="operating_mode" required disabled={busy} className="w-full rounded-lg border bg-background p-2">
        <option value="">Select operating mode</option><option value="day">Day</option><option value="boarding">Boarding</option><option value="day_and_boarding">Day and boarding</option>
      </select></div>
    <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting..." : "Submit registration request"}</Button>
    <p className="text-xs text-muted-foreground">Do not submit passwords, learner records or payment details.</p>
    <Link className="block text-center text-sm text-primary underline" href="/login">Already have an account? Sign in</Link>
  </form>;
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api/api-error";
import { registrationAddonPrices, registrationPackages, submitRegistration } from "./registration-service";

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
const priceFormat = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

export function PublicRegistrationForm() {
  const [busy, setBusy] = useState(false), [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Record<string, string[]>>({});
  const [mode, setMode] = useState("");
  const [packageId, setPackageId] = useState("");
  const packages = useQuery({
    queryKey: ["public-registration-packages"],
    queryFn: ({ signal }) => registrationPackages(signal),
    retry: false,
  });
  const addons = useQuery({
    queryKey: ["public-registration-addon-prices"],
    queryFn: ({ signal }) => registrationAddonPrices(signal),
    retry: false,
  });
  const addonPrice = (code: string) => {
    const item = addons.data?.find(addon => addon.code === code);
    if (item?.amount == null || item.duration_months == null) return "";
    return ` · ${priceFormat.format(Number(item.amount))} / ${item.duration_months} months`;
  };
  const selected = packages.data?.find(item => item.id === packageId);
  if (submitted) return <div role="status" className="space-y-4"><h1 className="text-2xl font-bold">Request received</h1>
    <p>Registration requests are reviewed before accounts are created. An administrator invitation is sent only after approval.</p>
    <p className="text-sm text-muted-foreground">If your email already belongs to an account or a pending request, another request is not created.</p>
    <Link className="text-primary underline" href="/login">Return to sign in</Link></div>;
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault();
    if (busy || packages.isError || !selected) return;
    setBusy(true); setError(null); setInvalid({});
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    try {
      await submitRegistration({ school_name: value("school_name"), operating_mode: mode, package_id: selected.id,
        trial_boarding: form.has("trial_boarding"), trial_transport: form.has("trial_transport"),
        trial_elections: !selected.elections_included && form.has("trial_elections"),
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
      <select id="operating_mode" name="operating_mode" value={mode} onChange={event => setMode(event.target.value)} required disabled={busy} className="w-full rounded-lg border bg-background p-2">
        <option value="">Select operating mode</option><option value="day">Day</option><option value="boarding">Boarding</option><option value="day_and_boarding">Day and boarding</option>
      </select></div>
    <div className="space-y-2">
      <label htmlFor="package_id" className="text-sm font-medium">Subscription package</label>
      {packages.isError ? <div role="alert" className="text-sm">
        Packages are temporarily unavailable. <button type="button" className="underline" onClick={() => { void packages.refetch(); }}>Retry</button>
      </div> : null}
      <select id="package_id" name="package_id" required disabled={busy || !packages.data?.length}
        value={packageId} onChange={event => setPackageId(event.target.value)} className="w-full rounded-lg border bg-background p-2"
        aria-invalid={Boolean(invalid.package_id)}>
        <option value="">{packages.isPending ? "Loading packages…" : "Select a package"}</option>
        {packages.data?.map(item => <option key={item.id} value={item.id}>
          {item.package_name} · {priceFormat.format(Number(item.amount))} / {item.duration_months} months
        </option>)}
      </select>
      {packages.data?.length === 0 ? <p className="text-sm">Registration packages are currently unavailable.</p> : null}
      {selected?.description ? <p className="text-sm">{selected.description}</p> : null}
      {selected?.features.length ? <ul className="list-disc pl-5 text-sm">
        {selected.features.map((feature, index) => <li key={index}>{feature}</li>)}
      </ul> : null}
      {packages.data && packages.data.length > 1 && <details className="text-sm">
        <summary className="cursor-pointer">Compare packages</summary>
        <ul className="mt-2 divide-y rounded-lg border">
          {packages.data.map(item => <li key={item.id} className="space-y-1 p-3">
            <p className="font-medium">{item.package_name} · {priceFormat.format(Number(item.amount))} / {item.duration_months} months</p>
            {item.description && <p>{item.description}</p>}
            {item.features.length > 0 && <ul className="list-disc pl-5">
              {item.features.map((feature, index) => <li key={index}>{feature}</li>)}
            </ul>}
          </li>)}
        </ul>
      </details>}
      <p className="text-sm text-muted-foreground">The 14-day package trial starts when your School Admin activates their account.</p>
    </div>
    {mode ? <fieldset disabled={busy} className="space-y-2">
      <legend className="mb-2 text-sm font-medium">Optional add-on requests</legend>
      {addons.isError && <p className="text-sm text-muted-foreground">Add-on prices are temporarily unavailable.</p>}
      {mode !== "day" ? <label className="block text-sm"><input type="checkbox" name="trial_boarding" /> Boarding{addonPrice("boarding")}</label> : null}
      {mode !== "boarding" ? <label className="block text-sm"><input type="checkbox" name="trial_transport" /> Transport{addonPrice("transport")}</label> : null}
      {selected?.elections_included ? <p className="text-sm">Student Council Elections is included in this package.</p>
        : <label className="block text-sm"><input type="checkbox" name="trial_elections" /> Student Council Elections{addonPrice("elections")}</label>}
    </fieldset> : null}
    <Button type="submit" disabled={busy || packages.isError || !selected} className="w-full">{busy ? "Submitting..." : "Submit registration request"}</Button>
    <p className="text-xs text-muted-foreground">Do not submit passwords, learner records or payment details.</p>
    <Link className="block text-center text-sm text-primary underline" href="/login">Already have an account? Sign in</Link>
  </form>;
}

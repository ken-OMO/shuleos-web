"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScopedQueryKey } from "@/features/dashboard/use-scoped-query-key";
import { apiClient } from "@/services/api/api-client";
import { normalizeApiError } from "@/services/api/api-error";
import { useAuthStore } from "@/store/auth-store";
import type { RegistrationAddon, RegistrationPackage } from "./registration-service";

const endpoint = "/admin/platform/subscription-catalog";
type Package = RegistrationPackage & { active: boolean };
const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

function billingLabel(amount: number | string, months: number) {
  return `${currency.format(Number(amount))} / ${months} ${months === 1 ? "month" : "months"}`;
}

type Catalog = { packages: Package[]; addons: RegistrationAddon[] };

export function SubscriptionCatalog() {
  const scope = useAuthStore(state => state.user?.scope);
  const key = useScopedQueryKey(["platform", "subscription-catalog"]);
  const query = useQuery({
    queryKey: key,
    enabled: scope === "platform",
    queryFn: async ({ signal }): Promise<Catalog> => {
      const { data } = await apiClient.get(endpoint, { signal });
      return data.data;
    },
  });
  const [packageId, setPackageId] = useState("");
  const [draft, setDraft] = useState<Package | "new" | null>(null);
  const [addonDraft, setAddonDraft] = useState<RegistrationAddon["code"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>, path: string, create = false, packageFields = false) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const price = { amount: form.get("amount"), duration_months: form.get("duration_months") };
    const body = packageFields ? {
      ...price,
      package_name: String(form.get("package_name")).trim(),
      description: String(form.get("description")).trim(),
      active: form.has("active"),
      features: String(form.get("features")).split(/\r?\n/).map(name => name.trim()).filter(Boolean),
    } : price;
    setBusy(true);
    setNotice(null);
    try {
      const { data } = await apiClient.request({ method: create ? "post" : "put", url: endpoint + path, data: body });
      if (packageFields) {
        setPackageId(data.data.id);
        setDraft(null);
      } else {
        setAddonDraft(null);
      }
      const refreshed = await query.refetch();
      const subject = packageFields ? "Package" : "Add-on price";
      setNotice({
        error: false,
        text: refreshed.isSuccess ? `${subject} saved.` : `${subject} saved. Retry to refresh the catalog.`,
      });
    } catch (error) {
      const failure = normalizeApiError(error);
      setNotice({ error: true, text: Object.values(failure.validationErrors).flat().join(" ") || failure.message });
    } finally {
      setBusy(false);
    }
  }

  if (scope !== "platform") return null;
  const viewedPackage = query.data?.packages.find(item => item.id === packageId);
  const selected = draft === "new" ? null : draft;
  return <DashboardPage>
    <DashboardHeader title="Subscription catalog" description="Manage package contents and the prices schools see during registration." role="Platform Owner" />
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-destructive" : undefined}>{notice.text}</p>}
    {query.isPending && <p>Loading catalog…</p>}
    {query.isError && <p role="alert">Catalog unavailable. <button className="underline" onClick={() => void query.refetch()}>Retry</button></p>}
    {query.data && <>
      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Saved packages</h2>
          <Button disabled={busy} onClick={() => setDraft("new")}>New package</Button>
        </div>
        {query.data.packages.length === 0 && <p>No packages configured.</p>}
        {query.data.packages.length > 0 && <div className="space-y-2">
          <label htmlFor="saved-package" className="block text-sm font-medium">Package name</label>
          <select id="saved-package" className="w-full rounded-lg border bg-background p-2 sm:max-w-sm"
            value={viewedPackage?.id ?? ""} disabled={busy}
            onChange={event => {
              setPackageId(event.target.value);
              setDraft(null);
            }}>
            <option value="">Select a package</option>
            {query.data.packages.map(item => <option key={item.id} value={item.id}>{item.package_name}</option>)}
          </select>
        </div>}
        {viewedPackage && <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">{viewedPackage.package_name} · {viewedPackage.active ? "Published" : "Hidden"}</p>
              <p className="text-sm">{billingLabel(viewedPackage.amount, viewedPackage.duration_months)}</p>
              {viewedPackage.description && <p className="mt-2 break-words text-sm">{viewedPackage.description}</p>}
              <h3 className="mt-3 text-sm font-medium">Included features</h3>
              {viewedPackage.features.length > 0 ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {viewedPackage.features.map((feature, index) => <li key={index}>{feature}</li>)}
              </ul> : <p className="text-sm text-muted-foreground">No features listed.</p>}
            </div>
            <Button variant="outline" disabled={busy} onClick={() => setDraft(viewedPackage)}>Edit {viewedPackage.package_name}</Button>
        </div>}
        {draft && <form key={selected?.id ?? "new"} className="space-y-3 rounded-lg border p-4" onSubmit={event => void save(event, selected ? `/packages/${selected.id}` : "/packages", !selected, true)}>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="font-medium">{selected ? `Edit ${selected.package_name}` : "New package"}</legend>
            <label className="block">Name<Input name="package_name" maxLength={100} required defaultValue={selected?.package_name} /></label>
            <label className="block">Description<Input name="description" maxLength={2000} defaultValue={selected?.description ?? ""} /></label>
            <PriceFields amount={selected?.amount} duration={selected?.duration_months} />
            <label className="block">Included features, one per line
              <textarea className="block w-full rounded-lg border bg-background p-2" rows={5} name="features" defaultValue={selected?.features.join("\n")} />
            </label>
            <label className="block"><input type="checkbox" name="active" defaultChecked={selected?.active ?? false} /> Show in school registration</label>
            <div className="flex gap-2">
              <Button type="submit">Save package</Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </fieldset>
        </form>}
      </section>
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Add-ons</h2>
        <ul className="divide-y">
          {query.data.addons.map(addon => {
            const { amount, duration_months: months } = addon;
            const configured = amount !== null && months !== null;
            return <li key={addon.code} className="space-y-3 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{addon.name}</p>
                  <p className="text-sm">{configured
                    ? billingLabel(amount, months)
                    : "Price not set"}</p>
                </div>
                <Button variant="outline" disabled={busy} onClick={() => setAddonDraft(addon.code)}>
                  {configured ? "Edit" : "Set"} {addon.name} price
                </Button>
              </div>
              {addonDraft === addon.code && <form className="rounded-lg border p-4" onSubmit={event => void save(event, `/addons/${addon.code}`)}>
                <fieldset disabled={busy} className="space-y-3">
                  <legend className="font-medium">{addon.name} price</legend>
                  <PriceFields amount={addon.amount} duration={addon.duration_months} />
                  <div className="flex gap-2">
                    <Button type="submit">Save {addon.name} price</Button>
                    <Button type="button" variant="outline" onClick={() => setAddonDraft(null)}>Cancel</Button>
                  </div>
                </fieldset>
              </form>}
            </li>;
          })}
        </ul>
      </section>
    </>}
  </DashboardPage>;
}

function PriceFields({ amount, duration }: { amount?: number | string | null; duration?: number | null }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label>Price (KSh)<Input name="amount" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={amount ?? ""} /></label>
    <label>Billing period (months)<Input name="duration_months" type="number" min="1" max="120" step="1" required defaultValue={duration ?? ""} /></label>
  </div>;
}

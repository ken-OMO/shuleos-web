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
  const [draft, setDraft] = useState<Package | "new" | null>(null);
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
      await apiClient.request({ method: create ? "post" : "put", url: endpoint + path, data: body });
      setDraft(null);
      await query.refetch();
      setNotice({ error: false, text: "Catalog saved." });
    } catch (error) {
      const failure = normalizeApiError(error);
      setNotice({ error: true, text: Object.values(failure.validationErrors).flat().join(" ") || failure.message });
    } finally {
      setBusy(false);
    }
  }

  if (scope !== "platform") return null;
  const selected = draft === "new" ? null : draft;
  return <DashboardPage>
    <DashboardHeader title="Subscription catalog" description="Manage package contents and the prices schools see during registration." role="Platform Owner" />
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-destructive" : undefined}>{notice.text}</p>}
    {query.isPending && <p>Loading catalog…</p>}
    {query.isError && <p role="alert">Catalog unavailable. <button className="underline" onClick={() => void query.refetch()}>Retry</button></p>}
    {query.data && <>
      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Packages</h2>
          <Button disabled={busy} onClick={() => setDraft("new")}>New package</Button>
        </div>
        {query.data.packages.length === 0 && <p>No packages configured.</p>}
        <ul className="divide-y">
          {query.data.packages.map(item => <li key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{item.package_name} · {item.active ? "Published" : "Hidden"}</p>
              <p className="text-sm">KSh {item.amount} / {item.duration_months} months</p>
              {item.features.length > 0 && <p className="text-sm text-muted-foreground">{item.features.join(", ")}</p>}
            </div>
            <Button variant="outline" disabled={busy} onClick={() => setDraft(item)}>Edit {item.package_name}</Button>
          </li>)}
        </ul>
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
        {query.data.addons.map(addon => <form key={addon.code} className="rounded-lg border p-4" onSubmit={event => void save(event, `/addons/${addon.code}`)}>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="font-medium">{addon.name}</legend>
            <PriceFields amount={addon.amount} duration={addon.duration_months} />
            <Button type="submit" variant="outline">Save {addon.name} price</Button>
          </fieldset>
        </form>)}
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

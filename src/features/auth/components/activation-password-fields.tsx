"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
}

export function ActivationPasswordFields({ password, confirmation, onPasswordChange, onConfirmationChange }: Props) {
  const [visible, setVisible] = useState(false);
  const rules = [
    { label: "Length: 12–128 characters", met: password.length >= 12 && password.length <= 128 },
    { label: "Passwords match", met: password.length > 0 && confirmation === password },
  ];

  return <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="new-password">New password</Label>
      <Input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} aria-describedby="activation-password-help activation-password-checks" value={password} onChange={(event) => onPasswordChange(event.target.value)} required />
      <p id="activation-password-help" className="text-sm text-muted-foreground">Use at least 12 characters. A memorable phrase is welcome.</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="confirmation">Confirm password</Label>
      <Input id="confirmation" type={visible ? "text" : "password"} autoComplete="new-password" maxLength={128} aria-describedby="activation-password-checks" value={confirmation} onChange={(event) => onConfirmationChange(event.target.value)} required />
    </div>
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} aria-controls="new-password confirmation" className="size-4 accent-primary" />
      Show password
    </label>
    <ul id="activation-password-checks" aria-live="polite" aria-atomic="true" className="space-y-2 text-sm">
      {rules.map((rule) => <li key={rule.label} className="flex items-center gap-2">
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${rule.met ? "bg-green-500" : "bg-red-500"}`} />
        <span>{rule.label}: <span className={rule.met ? "text-green-500" : "text-red-500"}>{rule.met ? "Met" : "Not met"}</span></span>
      </li>)}
    </ul>
  </div>;
}

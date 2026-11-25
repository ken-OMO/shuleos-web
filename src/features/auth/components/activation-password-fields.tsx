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
    { label: "Length: 16–128 characters", met: password.length >= 16 && password.length <= 128 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Symbol", met: /[^A-Za-z0-9\s]/.test(password) },
    { label: "Passwords match", met: password.length > 0 && confirmation === password },
  ];

  return <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="new-password">New password</Label>
      <Input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={16} maxLength={128} aria-describedby="activation-password-help activation-password-checks" value={password} onChange={(event) => onPasswordChange(event.target.value)} required />
      <p id="activation-password-help" className="text-sm text-muted-foreground">Use at least 16 characters with uppercase and lowercase letters, a number and a symbol.</p>
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
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${rule.met ? "bg-success" : "bg-destructive"}`} />
        <span>{rule.label}: <span className={rule.met ? "text-success" : "text-destructive"}>{rule.met ? "Met" : "Not met"}</span></span>
      </li>)}
    </ul>
  </div>;
}

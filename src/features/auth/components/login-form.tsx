"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services/api/api-error";
import { authLandingFor, safeInternalRedirect } from "@/services/auth/auth-routing";
import { useAuthStore } from "@/store/auth-store";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [scope, setScope] = useState<"school" | "platform">("school");
  const challenge = useAuthStore((state) => state.challenge);
  const continueChallenge = useAuthStore((state) => state.continueChallenge);
  const cancelChallenge = useAuthStore((state) => state.cancelChallenge);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const search = useSearchParams();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    try {
      const result = await login(values, scope);
      form.reset();
      if (result.kind === "challenge") return;
      const user = result.session.user;
      toast.success("Signed in securely.");
      router.replace(safeInternalRedirect(search.get("redirect"), authLandingFor(user)));
    } catch (error) {
      if (error instanceof ApiError) {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          if (field === "username" || field === "password") form.setError(field, { message: messages[0] });
        });
        setGeneralError(error.kind === "validation" ? "Please check the highlighted fields." : error.message);
      } else setGeneralError("Sign in could not be completed. Please try again.");
    }
  });

  if (challenge) return <form key={challenge.kind} className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setGeneralError(null); setBusy(true);
    try {
      const result = await continueChallenge({ otp, password: newPassword, password_confirmation: confirmation });
      setOtp(""); setNewPassword(""); setConfirmation("");
      if (result.kind === "authenticated") router.replace(safeInternalRedirect(search.get("redirect"), authLandingFor(result.session.user)));
    } catch (error) { setGeneralError(error instanceof Error ? error.message : "Verification failed."); }
    finally { setBusy(false); }
  }}>
    <h2 className="text-xl font-semibold">{challenge.kind === "otp" ? "Verify your account" : "Activate your password"}</h2>
    {generalError ? <p role="alert">{generalError}</p> : null}
    {challenge.kind === "otp" ? <div><Label htmlFor="otp">Verification code</Label><Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></div> : <>
      <div><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
      <div><Label htmlFor="confirmation">Confirm password</Label><Input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></div>
    </>}
    <Button type="submit" disabled={busy || (challenge.kind === "activation" && newPassword !== confirmation)}>{busy ? "Verifying…" : challenge.kind === "otp" ? "Verify code" : "Activate account"}</Button>
    <Button type="button" variant="outline" disabled={busy} onClick={() => { cancelChallenge(); setGeneralError(null); setOtp(""); setNewPassword(""); setConfirmation(""); }}>Start again</Button>
  </form>;

  return <form key="login" onSubmit={submit} className="space-y-5" noValidate><div><Label htmlFor="sign-in-scope">Account type</Label><select id="sign-in-scope" className="ml-3 rounded border p-2" value={scope} onChange={(e) => setScope(e.target.value as "school" | "platform")}><option value="school">School</option><option value="platform">Platform</option></select></div><div aria-live="polite">{generalError ? <Alert className="border-destructive/30 bg-destructive/5"><AlertTitle>Unable to sign in</AlertTitle><AlertDescription>{generalError}</AlertDescription></Alert> : null}</div><div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(form.formState.errors.username)} aria-describedby={form.formState.errors.username ? "username-error" : undefined} {...form.register("username")} />{form.formState.errors.username ? <p id="username-error" className="text-sm text-destructive">{form.formState.errors.username.message}</p> : null}</div><div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-12" aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? "password-error" : undefined} {...form.register("password")} /><Button type="button" variant="ghost" size="icon-lg" className="absolute right-0.5 top-0.5" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>{form.formState.errors.password ? <p id="password-error" className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}</div><Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><LoaderCircle className="animate-spin" />Signing in…</> : <><LogIn />Sign in</>}</Button><p className="text-center text-xs leading-5 text-muted-foreground">Access is governed by your school and assigned permissions. ShuleOS will never ask you to disclose your password elsewhere.</p></form>;
}

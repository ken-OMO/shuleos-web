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
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const search = useSearchParams();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    try {
      const user = await login(values);
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

  return <form onSubmit={submit} className="space-y-5" noValidate><div aria-live="polite">{generalError ? <Alert className="border-destructive/30 bg-destructive/5"><AlertTitle>Unable to sign in</AlertTitle><AlertDescription>{generalError}</AlertDescription></Alert> : null}</div><div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(form.formState.errors.username)} aria-describedby={form.formState.errors.username ? "username-error" : undefined} {...form.register("username")} />{form.formState.errors.username ? <p id="username-error" className="text-sm text-destructive">{form.formState.errors.username.message}</p> : null}</div><div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-12" aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? "password-error" : undefined} {...form.register("password")} /><Button type="button" variant="ghost" size="icon-lg" className="absolute right-0.5 top-0.5" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>{form.formState.errors.password ? <p id="password-error" className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}</div><Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><LoaderCircle className="animate-spin" />Signing in…</> : <><LogIn />Sign in</>}</Button><p className="text-center text-xs leading-5 text-muted-foreground">Access is governed by your school and assigned permissions. ShuleOS will never ask you to disclose your password elsewhere.</p></form>;
}

import { Suspense } from "react";
import { GuestGuard } from "@/components/auth/guest-guard";
import { LoadingState } from "@/components/feedback/loading-state";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return <Suspense fallback={<LoadingState label="Preparing sign in" />}><GuestGuard><div><p className="text-sm font-semibold text-primary">Welcome back</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Sign in to ShuleOS</h2><p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">Use the username and password issued by your school.</p><LoginForm /></div></GuestGuard></Suspense>;
}

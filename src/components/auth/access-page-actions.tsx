"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function AccessPageActions() {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const signOut = async () => { await logout(); toast.success("Signed out securely."); router.replace("/login"); };
  return <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="outline" render={<Link href={isAuthenticated ? "/workspace" : "/login"} />}>{isAuthenticated ? "Return to workspace" : "Go to sign in"}</Button>{isAuthenticated ? <Button onClick={signOut}><LogOut />Sign out</Button> : null}</div>;
}

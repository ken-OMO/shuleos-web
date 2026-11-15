"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const name = user?.displayName ?? "Preview user";
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const signOut = async () => {
    try { await logout(); toast.success("Signed out securely."); }
    catch { toast.success("Local session cleared."); }
    router.replace("/login");
  };
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" className="h-11 gap-2 px-2" aria-label="Open user menu" />}><Avatar><AvatarFallback>{initials || "SU"}</AvatarFallback></Avatar><span className="hidden text-left sm:block"><span className="block text-sm font-medium">{name}</span><span className="block text-xs text-muted-foreground">{user?.school?.name ?? (isAuthenticated ? "School workspace" : "Foundation preview")}</span></span></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>{isAuthenticated ? "Authenticated account" : "Preview account"}</DropdownMenuLabel><DropdownMenuItem><UserRound />Profile foundation</DropdownMenuItem><DropdownMenuItem><Settings />Preferences</DropdownMenuItem>{isAuthenticated ? <DropdownMenuItem onClick={signOut}><LogOut />Sign out</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu>;
}

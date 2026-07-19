"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
export function UserMenu() { const user = useAuthStore((state) => state.user); const clear = useAuthStore((state) => state.clearSession); const name = user?.name ?? "Preview user"; const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join(""); return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" className="h-11 gap-2 px-2" aria-label="Open user menu" />}><Avatar><AvatarFallback>{initials || "SU"}</AvatarFallback></Avatar><span className="hidden text-left sm:block"><span className="block text-sm font-medium">{name}</span><span className="block text-xs text-muted-foreground">{user?.school?.name ?? "Foundation preview"}</span></span></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Account foundation</DropdownMenuLabel><DropdownMenuItem><UserRound />Profile</DropdownMenuItem><DropdownMenuItem><Settings />Preferences</DropdownMenuItem><DropdownMenuItem onClick={clear}><LogOut />Clear local session</DropdownMenuItem></DropdownMenuContent></DropdownMenu>; }

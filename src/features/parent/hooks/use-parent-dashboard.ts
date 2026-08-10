"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { dashboardRetry } from "../../dashboard/dashboard-contract";
import { dashboardQueryKeys } from "../../dashboard/dashboard-query-keys";
import { parentDashboardService } from "../services/parent-dashboard-service";
export function useParentDashboard(learnerId?:string){const enabled=useAuthStore((s)=>s.status==="authenticated"&&s.hasPermission("access_parent_portal_phase_two"));return useQuery({queryKey:dashboardQueryKeys.parent(learnerId),queryFn:({signal})=>parentDashboardService.dashboard(learnerId,signal),enabled,staleTime:60_000,retry:dashboardRetry});}

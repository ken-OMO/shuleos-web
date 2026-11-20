import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  absolute?: boolean;
  roles?: string[];
  permissions?: string[];
  children?: NavigationItem[];
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

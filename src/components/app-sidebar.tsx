import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Users, UserCog, Star, MessageSquare, Bot, Calendar, Settings, BarChart3, FileText } from "lucide-react";

import { env } from "@/config/env";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-bot", label: "AI PropertyBot", icon: Bot },
  { to: "/property", label: "Property", icon: Building2 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/leads", label: "Leads", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/agents", label: "Agents", icon: UserCog },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;


export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 h-20">
        <div className="size-9 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center shadow-[var(--shadow-glow)]">
          <Building2 className="size-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight">{env.VITE_APP_NAME}</span>
      </div>
      <nav className="px-3 py-2 space-y-1 flex-1">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

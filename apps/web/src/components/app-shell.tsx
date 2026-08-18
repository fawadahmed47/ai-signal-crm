"use client";

import {
  Bell,
  Buildings,
  CalendarBlank,
  CaretDown,
  ChartBar,
  CheckSquare,
  Gear,
  SidebarSimple,
  Sparkle,
  Target,
  Tray,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { logoutAction } from "@/app/actions/auth";

const navigation = [
  { label: "Today", icon: CheckSquare, href: "/sales-workspace", managerOnly: false },
  { label: "GTM Hub", icon: Sparkle, href: "/gtm-workspace", managerOnly: false },
  { label: "Inbox", icon: Tray, href: "/", managerOnly: false },
  { label: "Accounts", icon: Buildings, href: "/accounts", managerOnly: false },
  { label: "Opportunities", icon: Target, href: "/opportunities", managerOnly: false },
  { label: "Tasks", icon: CheckSquare, managerOnly: false },
  { label: "Reports", icon: ChartBar, href: "/reports", managerOnly: true },
  { label: "Settings", icon: Gear, managerOnly: false },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  contentClassName?: string;
  activeItem?: string;
  navigationCounts?: {
    allSignals: number;
    highOpportunity: number;
    accounts: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  session?: { name: string; email: string; role: "manager" | "marketer" };
};

export function AppShell({ title, subtitle, children, contentClassName, activeItem = "Inbox", navigationCounts, session }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`} aria-label="Primary navigation">
        <div className="brand-row">
          <a className="brand" href="#main-content" aria-label="AI Signal CRM home">
            <strong>AI Signal</strong><span>CRM</span>
          </a>
          <button className="icon-button mobile-only" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="primary-nav">
          {navigation.filter((item) => !item.managerOnly || session?.role === "manager").map(({ label, icon: Icon, href }) => href ? (
            <Link
              className={activeItem === label ? "nav-item active" : "nav-item"}
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={23} weight={activeItem === label ? "fill" : "regular"} />
              <span>{label}</span>
            </Link>
          ) : (
            <button className="nav-item" key={label} type="button" onClick={() => setMenuOpen(false)}>
              <Icon size={23} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="smart-filters">
          <p>Smart filters</p>
          <button type="button"><span>All signals</span><strong>{navigationCounts?.allSignals ?? "—"}</strong></button>
          <button type="button"><span>High opportunity</span><strong>{navigationCounts?.highOpportunity ?? "—"}</strong></button>
          <button type="button"><span>My accounts</span><strong>{navigationCounts?.accounts ?? "—"}</strong></button>
          <button type="button"><span>Unreviewed</span><strong>{navigationCounts?.pending ?? "—"}</strong></button>
          <button type="button"><span>Approved</span><strong>{navigationCounts?.approved ?? "—"}</strong></button>
          <button type="button"><span>Dismissed</span><strong>{navigationCounts?.rejected ?? "—"}</strong></button>
        </div>

        <div className="help-card">
          <strong>Need help?</strong>
          <span>Visit our help center</span>
        </div>
      </aside>

      {menuOpen ? <button className="scrim" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
            <SidebarSimple size={24} />
          </button>
          <div className="title-group">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <span className="date"><CalendarBlank size={18} /> 15 August 2026</span>
            {session?.role === "manager" ? <a className="export-link" href="/api/exports/signals.csv">Export cleaned CSV</a> : null}
            <button className="icon-button" type="button" aria-label="Notifications"><Bell size={21} /></button>
            <button className="profile-button" type="button" aria-label="Open profile menu">
              <span className="avatar">{session?.name.split(" ").map((name) => name[0]).join("") ?? "JS"}</span>
              <span className="profile-copy"><strong>{session?.name ?? "Jamie Smith"}</strong><small>{session?.role === "manager" ? "Commercial Manager" : "Signal Reviewer"}</small></span>
              <CaretDown size={16} />
            </button>
            {session ? <form action={logoutAction}><button className="sign-out" type="submit">Sign out</button></form> : null}
          </div>
        </header>
        <main className={`workspace-content ${contentClassName ?? ""}`} id="main-content">{children}</main>
      </div>
    </div>
  );
}

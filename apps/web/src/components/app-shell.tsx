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
  Target,
  Tray,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { label: "Inbox", icon: Tray, href: "/" },
  { label: "Accounts", icon: Buildings },
  { label: "Opportunities", icon: Target, href: "/opportunities" },
  { label: "Tasks", icon: CheckSquare },
  { label: "Reports", icon: ChartBar },
  { label: "Settings", icon: Gear },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  contentClassName?: string;
  activeItem?: string;
};

export function AppShell({ title, subtitle, children, contentClassName, activeItem = "Inbox" }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`} aria-label="Primary navigation">
        <div className="brand-row">
          <a className="brand" href="#main-content" aria-label="Signal Workspace home">
            <strong>Signal</strong><span>Workspace</span>
          </a>
          <button className="icon-button mobile-only" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="primary-nav">
          {navigation.map(({ label, icon: Icon, href }) => href ? (
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
          <button type="button"><span>All signals</span><strong>12</strong></button>
          <button type="button"><span>High opportunity</span><strong>5</strong></button>
          <button type="button"><span>My accounts</span><strong>7</strong></button>
          <button type="button"><span>Unreviewed</span><strong>12</strong></button>
          <button type="button"><span>Approved</span><strong>18</strong></button>
          <button type="button"><span>Dismissed</span><strong>9</strong></button>
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
            <button className="icon-button" type="button" aria-label="Notifications"><Bell size={21} /></button>
            <button className="profile-button" type="button" aria-label="Open profile menu">
              <span className="avatar">JS</span>
              <span className="profile-copy"><strong>Jamie Smith</strong><small>Sales Operator</small></span>
              <CaretDown size={16} />
            </button>
          </div>
        </header>
        <main className={`workspace-content ${contentClassName ?? ""}`} id="main-content">{children}</main>
      </div>
    </div>
  );
}

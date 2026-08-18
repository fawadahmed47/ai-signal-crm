import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DailySalesWorkspace } from "@/components/daily-sales-workspace";
import { getUserSession } from "@/data/auth-session";
import { getNavigationCounts } from "@/data/dashboard";
import { getDailySalesWorkspace } from "@/data/sales-workspace";

export default async function SalesWorkspacePage() { await connection(); const session=await getUserSession(); if(!session) redirect("/login"); const [workspace,navigationCounts]=await Promise.all([getDailySalesWorkspace(),getNavigationCounts()]); return <AppShell activeItem="Today" title="Sales Workspace" subtitle="Focus the commercial team on the next best account action" navigationCounts={navigationCounts} session={session}><DailySalesWorkspace workspace={workspace}/></AppShell>; }

"use server";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { revalidatePath } from "next/cache";

import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";

const execFileAsync = promisify(execFile);

type RunIngestionResult = { ok: true; message: string } | { ok: false; message: string };

export async function runLocalIngestionAction(): Promise<RunIngestionResult> {
  const session = await getUserSession();
  if (!session || session.role !== "marketer") return { ok: false, message: "Marketer access is required to run ingestion." };
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const python = process.platform === "win32"
    ? path.join(repositoryRoot, ".venv", "Scripts", "python.exe")
    : path.join(repositoryRoot, ".venv", "bin", "python");
  const pipeline = path.join(repositoryRoot, "services", "ingestion", "main.py");

  if (!existsSync(python) || !existsSync(pipeline)) {
    return { ok: false, message: "Local ingestion is not configured. Create the project Python environment before running an import." };
  }
  if (!process.env.DATABASE_URL) {
    return { ok: false, message: "DATABASE_URL is missing. Start the CRM with the local database configuration." };
  }

  const pool = getDatabasePool();
  const before = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM signals");
  const source = await pool.query<{ id: string }>("SELECT id::text FROM signal_sources WHERE name=$1 ORDER BY created_at LIMIT 1", [process.env.SIGNAL_SOURCE_NAME ?? "Data Center Dynamics"]);
  const run = await pool.query<{ id: string }>(
    `INSERT INTO ingestion_runs (source_id,triggered_by_user_id,status)
     VALUES ($1,$2,'running') RETURNING id::text`, [source.rows[0]?.id ?? null, session.userId],
  );
  try {
    await execFileAsync(python, [pipeline], {
      cwd: path.dirname(pipeline),
      env: { ...process.env, INGESTION_OUTPUTS: "postgres" },
      timeout: 300_000,
      maxBuffer: 1_000_000,
      windowsHide: true,
    });
    const after = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM signals");
    const importedCount = Math.max(0, after.rows[0].count - before.rows[0].count);
    await pool.query("UPDATE ingestion_runs SET status='succeeded',imported_count=$2,finished_at=now() WHERE id=$1", [run.rows[0].id, importedCount]);
    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/opportunities");
    revalidatePath("/reports");
    return { ok: true, message: `Import finished. ${importedCount} new signals were added; existing articles were safely deduplicated.` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown ingestion error";
    await pool.query("UPDATE ingestion_runs SET status='failed',error_message=$2,finished_at=now() WHERE id=$1", [run.rows[0].id, detail.slice(0, 1_000)]);
    return { ok: false, message: `Import did not finish. ${detail.slice(0, 180)}` };
  }
}
